---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["쿠키와 데이터베이스 세션의 생명주기"]
---

# 쿠키와 데이터베이스 세션의 생명주기

## 저장 모델과 비밀 키

stateless 세션은 검증할 토큰을 cookie에 두고 요청마다 서버가 검증한다. database 세션은 서버 레코드에 사용자/만료/폐기 상태를 두고 cookie에는 검증 가능한 세션 식별자를 담는다. 둘을 혼합해 cookie에서 낙관적 검사를 하고 민감한 작업은 DB에서 현재 상태를 확인할 수 있다.

`openssl rand -base64 32`는 32바이트 난수의 Base64 표현을 만든다. 환경 파일의 SESSION_SECRET은 서버에서만 사용하고 키가 비어 있으면 앱 초기화 때 실패하게 한다. 인증 라이브러리가 세션을 제공하면 중복 구현하지 않는다.

## 서명, 검증과 쿠키 설정

```ts
// lib/session.ts, jose를 사용하는 학습 예시
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = process.env.SESSION_SECRET
if (!secret) throw new Error('SESSION_SECRET is required')
const key = new TextEncoder().encode(secret)
const ttl = 7 * 24 * 60 * 60

export async function readSession() {
  const token = (await cookies()).get('session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    return typeof payload.userId === 'string' ? { userId: payload.userId } : null
  } catch { return null }
}
export async function createSession(userId: string) {
  const expires = Math.floor(Date.now() / 1000) + ttl
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt()
    .setExpirationTime(expires).sign(key)
  ;(await cookies()).set('session', token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    expires: new Date(expires * 1000),
  })
}
```

이는 HTTPS 환경에서 Action/Route Handler가 cookie를 쓰는 예다. issuer/audience, 키 교체, 강제 폐기와 replay 정책까지 갖춘 인증 서비스 구현은 아니다. 서명된 JWS는 위변조를 탐지하지만 payload를 암호화하지 않는다. 사용자 식별자 등 최소 claim만 담고 email, 연락처, 결제 정보와 비밀번호를 넣지 않는다. 함수 이름이 encrypt여도 SignJWT 구현만으로 암호화라고 부르지 않는다.

| 쿠키 속성 | 책임 |
| --- | --- |
| HttpOnly | 브라우저 JavaScript의 직접 cookie 읽기 제한 |
| Secure | HTTPS 전송 조건 |
| SameSite | cross-site cookie 전송 정책 |
| Expires 또는 Max-Age | 브라우저 보관 수명 |
| Path | 전송할 URL path 범위 |

쿠키는 서버에서 설정하지만 사용자가 보낸 요청은 여전히 신뢰할 수 없다. 매 요청 토큰 검증과 작업별 인가를 수행한다.

## 갱신과 로그아웃

갱신 시 서명 검증 후 새 exp를 가진 토큰을 발급하고 cookie의 expires도 같은 시각으로 맞춘다. 이전 토큰을 그대로 넣으며 cookie expires만 늘리면 토큰 내부 exp는 연장되지 않는다. refresh token은 라이브러리 지원과 rotation/reuse 탐지 정책을 별도로 확인한다.

```ts
export async function refreshSession() {
  const session = await readSession()
  if (!session) return null
  await createSession(session.userId)
  return session
}
export async function deleteSession() {
  ;(await cookies()).delete('session')
}
```

로그아웃 Action은 삭제를 await한 뒤 `/login`으로 redirect한다. DB 세션이라면 서버 레코드도 폐기한다. stateless cookie만 삭제하면 이미 복사된 유효 토큰의 사용까지 막는 것은 아니므로 강제 로그아웃 요구와 만료 정책을 함께 정한다. 삭제에는 기존 cookie의 domain/path/protocol 조건이 맞아야 한다.

## 데이터베이스 세션

서버 세션 테이블에는 sessionId, userId, expiresAt과 필요한 폐기/기기 정보를 둔다. 계정 확인 후 세션 insert 결과의 ID를 얻고, 서명 또는 암호화된 표현을 cookie에 넣는다. 이 ID가 사용자 ID와 같은 개념은 아니다.

요청에서는 cookie를 검증해 sessionId를 얻은 뒤 세션 존재/만료/폐기와 현재 사용자 권한을 조회한다. 갱신은 DB와 cookie/토큰 만료를 함께 맞춘다. 여러 기기 조회, 마지막 로그인, 전체 기기 로그아웃을 구현하기 쉽지만 DB 요청과 장애 정책이 추가된다.

세션 수명 동안 서버 cache를 쓰는 경우 강제 폐기와 역할 변경이 cache에도 반영돼야 한다. 같은 React 서버 렌더 안의 중복 조회는 React cache로 줄이고 관련 데이터 조회를 묶을 수 있다. 요청 간 stale 세션 공유와 요청 내 dedup을 혼동하지 않는다.

## 출처

- [Next.js, authentication](https://nextjs.org/docs/app/guides/authentication)

## 관련 문서

- [[NextJS-Authentication]]
- [[NextJS-Auth-Forms]]
- [[NextJS-Auth-Access-Checks]]
