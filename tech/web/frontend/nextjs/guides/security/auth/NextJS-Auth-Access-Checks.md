---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["데이터 접근과 화면별 권한 검사"]
---

# 데이터 접근과 화면별 권한 검사

## 낙관적 검사와 실제 데이터 검사

낙관적 검사는 검증된 cookie claim으로 빠르게 화면을 선택하거나 redirect한다. 민감한 작업은 DB의 세션/권한/소유권 등 현재 상태까지 검사한다. 두 방법 모두 미검증 cookie 문자열이나 query의 isAdmin을 신뢰하는 방식은 아니다.

Proxy는 정적 유료 콘텐츠처럼 사용자에게 공통으로 만들어진 페이지의 접근을 걸러내는 데도 쓰인다. protected/public 경로를 정의하고 세션 없으면 login으로, 이미 로그인한 사용자의 login/signup 방문은 dashboard로 보낼 수 있다. path 정확 일치는 하위 경로를 자동 포함하지 않는다. 경로 prefix를 쓸 때 segment 경계를 확인한다.

Proxy는 prefetch에도 실행되므로 무거운 DB 확인 비용을 고려한다. matcher로 API, _next/static, _next/image, 이미지 등을 제외할 때 보호 경로가 빠지지 않는지 검증한다. req.cookies 또는 next/headers의 cookie API를 사용할 수 있으며 Node runtime과 인증 라이브러리의 호환성을 확인한다. Proxy만으로 Action/Route Handler를 보호했다고 판단하지 않는다.

## DAL의 반환 계약

```ts
// lib/dal.ts: loadActiveSession은 cookie 검증과 DB의 현재 세션 검사를 수행한다.
import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { loadActiveSession, findPublicUser } from '@/data/auth-storage'
export const getSessionOrNull = cache(loadActiveSession)
export const verifySession = cache(async () => {
  const session = await getSessionOrNull()
  if (!session) redirect('/login')
  return session
})
export const getUser = cache(async () => {
  const session = await verifySession()
  return findPublicUser(session.userId)
})
```

DB와 비밀 환경 변수 접근 위치를 DAL로 좁히면 감사할 경계가 명확해진다. query의 select/columns로 필요한 필드만 얻고 없는 사용자와 조회 실패 정책을 명시한다. null 반환과 예외/redirect를 섞으면 호출부의 오류 분기가 실행되지 않을 수 있다. React cache는 렌더 요청 안에서 중복 호출을 줄이며 모든 실행 환경의 요청 간 cache가 아니다.

정적으로 생성된 데이터는 빌드 때 DAL을 지나므로 매 방문자의 세션을 검사하는 수단이 되지 못한다. 공통 정적 페이지의 진입 제어와 실제 사용자별 데이터 조회를 나눈다. 여러 조회 메서드가 같은 인가를 요구하면 공통 helper 또는 앱의 기존 class 구조로 모을 수 있다.

## DTO의 필드별 공개 정책

전체 User 객체를 Client props에 전달하지 않는다. 사용자명은 공개해도 연락처는 관리자 또는 같은 팀에게만 보여줄 수 있다. viewer의 신뢰된 역할/팀과 대상 레코드의 팀을 비교하고 허용되지 않은 필드는 null 또는 생략으로 반환한다. 대상 레코드가 없으면 먼저 notFound/null 정책을 처리한다.

DTO는 함수 반환, 명시적 class, toJSON 같은 JavaScript 패턴으로 구성할 수 있다. class를 사용하면 모든 인스턴스가 자동으로 React 직렬화되는 것은 아니다. Server Function처럼 허용되는 특수 참조와 일반 함수/class 직렬화 제한도 구분한다.

## UI와 서버 진입점

| 위치 | 확인할 내용 |
| --- | --- |
| Server page | 세션과 현재 역할을 확인하고 admin/user UI 선택 |
| layout | 탐색 시 재사용될 수 있어 유일한 인증 경계로 두지 않음 |
| leaf component | 버튼/메뉴 숨김과 보여주기. Action 인가를 대신하지 않음 |
| Server Action | 호출할 때마다 세션, 입력, 역할 및 리소스 소유권 확인 |
| Route Handler | 요청별 세션과 권한 확인, API에 맞는 401/403 응답 |

```ts
// app/api/admin/route.ts
import { getSessionOrNull } from '@/lib/dal'
export async function GET() {
  const session = await getSessionOrNull()
  if (!session) return new Response(null, { status: 401 })
  if (session.role !== 'admin') return new Response(null, { status: 403 })
  return Response.json({ allowed: true })
}
```

session.role은 앱의 loadActiveSession이 반환하는 계약이다. `{isAuth,userId}`만 반환하는 helper에서 갑자기 session.user.role을 읽는 식으로 예제를 연결하면 안 된다. redirect를 던지는 verifySession 대신 null 반환 helper를 써야 이 API의 401 분기가 실행된다.

layout에서 null을 반환하거나 slot을 가려도 자식 segment와 parallel slot의 실행/RSC 노출을 막는 보안 장벽은 아니다. 세션을 기다리는 header/nav만 Suspense 안에 내리고 children까지 한꺼번에 기다리게 하지 않는다. Client Component는 DAL을 import하지 않고 서버가 최소 DTO나 그 Promise를 전달한다.

## 출처

- [Next.js, authentication](https://nextjs.org/docs/app/guides/authentication)
- [Next.js, data-security](https://nextjs.org/docs/app/guides/data-security)

## 관련 문서

- [[NextJS-Authentication]]
- [[NextJS-Data-Security]]
- [[NextJS-Auth-Cache-Patterns]]
