---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 인증과 세션"]
---

# Next.js 인증과 세션

## 인증과 인가의 경계

인증은 요청 주체를 확인하고, 세션은 그 결과를 여러 요청에 이어 주며, 인가는 특정 데이터와 작업에 대한 권한을 확인한다. 로그인 화면을 숨기거나 layout에서 redirect하는 것만으로 데이터와 Server Action을 보호할 수 없다.

App Router의 layout은 탐색 때 재사용될 수 있고, layout이 표시하지 않는 자식 segment나 parallel slot도 실행되어 RSC Payload에 들어갈 수 있다. 실제 조회와 변경을 수행하는 DAL(Data Access Layer), Server Action, Route Handler에서 권한을 확인한다. 조직별 권한, 리소스 소유권과 세션 폐기 여부가 필요한 작업은 현재 저장 상태까지 확인한다.

## 가입과 로그인 흐름

1. `<form action={...}>`으로 입력을 서버에 보낸다. `useActionState`를 쓰면 서버 함수 인자는 `(previousState, formData)`가 된다.
2. 서버에서 타입, 길이와 업무 규칙을 검증한다. 브라우저의 `required`와 입력 타입은 UX를 돕지만 신뢰 경계가 아니다.
3. 인증 제공자를 호출하거나 안전하게 저장된 비밀번호 해시와 비교한다. 비밀번호 자체를 로그나 응답에 넣지 않는다.
4. 세션을 생성하고 서버 응답에서 쿠키를 설정한 다음 redirect한다. 검증 실패는 폼 오류 상태로 반환한다.

인증 라이브러리는 세션 갱신, 다중 인증, 외부 로그인 같은 계약을 제공한다. 직접 구현 예제의 임의 만료 기간이나 해시 비용을 서비스 보안 정책으로 그대로 채택하지 않는다.

## 쿠키 세션과 데이터베이스 세션

| 방식 | 요청 처리 | 운영상 판단 |
|---|---|---|
| 서명되거나 암호화된 쿠키 세션 | 쿠키의 무결성, 만료와 필요한 claim 검증 | 저장소 조회가 적지만 즉시 폐기, 권한 변경 반영 정책 필요 |
| 데이터베이스 세션 | 쿠키의 식별자를 검증하고 저장소에서 세션 조회 | 기기별 로그아웃과 강제 폐기 쉬움, 저장소 가용성과 조회 비용 필요 |

서명은 위변조 검증이며 암호화와 다르다. `SignJWT(...).sign()`으로 만든 JWS payload는 비밀 저장소가 아니다. 쿠키에는 최소 식별 정보만 넣고, `HttpOnly`, HTTPS의 `Secure`, 적절한 `SameSite`, 만료와 `Path`를 설정한다. `HttpOnly`도 모든 XSS와 CSRF를 해결하지 않는다.

세션 갱신은 쿠키의 expires뿐 아니라 토큰 내부 exp와 서버 세션 만료를 함께 갱신해야 한다. 쿠키 수명만 늘리면 내부 토큰은 계속 만료될 수 있다. 로그아웃은 쿠키 삭제와 필요한 서버 세션 폐기를 함께 처리한다. `openssl rand -base64 32`는 32바이트 난수를 Base64로 표현하는 명령이며 32문자 문자열을 뜻하지 않는다.

## DAL과 Proxy의 역할

DAL은 `import 'server-only'`로 경계를 표시하고 세션 검증, 권한 검사, 조회와 최소 DTO 반환을 모은다. React `cache()`는 React 서버 렌더의 같은 요청 내 중복 조회를 줄인다. 요청 간 공유 캐시나 범용 Route Handler 메모이제이션으로 이해하지 않는다.

Proxy의 쿠키 검사는 빠른 리다이렉트와 정적 보호 경로의 진입 제어에 유용하다. prefetch에도 실행될 수 있으므로 매번 무거운 DB 조회를 넣기 전에 비용을 확인한다. Proxy를 통과했다는 사실이 Action과 DAL의 인가를 대신하지 않는다. 현재 `proxy.ts`는 Node.js runtime이며 실제 인증 라이브러리의 호환성을 확인한다.

API에서 401/403 응답이 필요하다면 redirect를 던지는 UI용 세션 helper를 그대로 쓰지 말고, 세션 확인 결과를 반환하는 helper와 화면 이동 정책을 분리한다.

## Cache Components를 사용하는 인증

이 절은 `cacheComponents: true`를 전제로 한다. 쿠키와 세션은 요청 시점 정보이므로 정적 shell에 포함하지 않고 필요한 사용자 UI를 Suspense 아래로 내린다. layout 최상위에서 세션을 await하면 children까지 기다리게 할 수 있다.

- 일반 `use cache`와 `use cache: remote` 내부에서는 cookies/headers를 직접 읽을 수 없다.
- `use cache: private`는 cookies, headers, searchParams를 사용할 수 있고 결과는 브라우저 캐시에 둔다. 서버 공유 캐시가 아니며 `connection()`은 허용하지 않는다.
- 세션을 먼저 검증한 뒤 안정적인 userId를 비공개 캐시 함수의 인자로 넘기면 사용자별 서버 캐시를 만들 수 있다. 외부 입력 userId만 믿고 그 함수를 공개하지 않는다.
- 캐시 키의 인자와 캡처 값, cacheTag 문자열에는 토큰, 비밀번호, 원문 이메일을 넣지 않는다. 암호화된 비밀 저장소가 아니다.
- 일반 `use cache`의 서버 메모리는 best effort다. 인스턴스 간 내구성이 필요하면 remote handler의 저장, 격리와 폐기 계약을 확인한다.

변경 Action에서는 세션과 권한을 다시 검사한 뒤 같은 사용자 태그를 `updateTag`로 만료시킨다. private cache에서 받은 사용자 UI가 최신 인가 증거를 대신하지 않는다.

Partial Prefetching을 사용하는 목적지의 세션 정보는 per-session App Shell로 미리 가져올 수 있다. URL 의존 데이터는 `<Link prefetch={true}>`가 추가 비용을 낼 수 있다. cacheLife의 stale을 30초 미만으로 낮추면 해당 scope가 prefetch 대상에서 빠지는 조건도 함께 고려한다.

## 확인 질문

- layout이 children을 숨겨도 민감한 DAL 호출과 Action이 독립적으로 거부되는가?
- 로그아웃과 권한 변경 뒤 서버 세션, 브라우저 UI와 사용자별 캐시가 어떻게 갱신되는가?
- 인증된 사용자 식별자와 클라이언트가 제출한 대상 리소스의 소유권을 각각 확인하는가?

## 출처

- [Next.js, authentication](https://nextjs.org/docs/app/guides/authentication)
- [Next.js, authentication-with-cache-components](https://nextjs.org/docs/app/guides/authentication-with-cache-components)

## 관련 문서

- [[NextJS-Data-Security]]
- [[NextJS-Actions-and-Forms]]
