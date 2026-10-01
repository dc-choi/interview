---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["세션 기반 UI와 캐시를 연결하는 패턴"]
---

# 세션 기반 UI와 캐시를 연결하는 패턴

## 활성화와 이전 앱의 전환

`cacheComponents: true`와 이미 로그인 시 생성되는 세션을 전제한다. 요청 시 읽는 cookie/headers는 build의 공개 shell에 들어갈 수 없다. 기존 route가 validation에서 실패하면 `instant = false`로 blocking을 명시하고 route별로 cache/Suspense 구조를 도입할 수 있다. 이 opt-out이 모든 sync I/O 검증을 없애는 것은 아니다.

iron-session의 seal/unseal처럼 cookie를 helper 깊숙이 읽고 현재 시각과 토큰 만료를 비교하는 로직은 단순 공용 cache에 넣으면 안 된다. `getSession()`은 cookie가 없으면 빈 세션을 반환하고, `getCurrentUser()`는 식별자와 실제 사용자 존재를 확인한다. 실패 redirect는 throw로 흐름을 끊으며 성공한 사용자 반환값처럼 cache하지 않는다.

## private 현재 사용자와 Suspense

```ts
import 'server-only'
import { redirect } from 'next/navigation'
import { getSession } from './session'
import { findUserById } from './users'
export async function getCurrentUser() {
  'use cache: private'
  const session = await getSession()
  if (!session.userId) redirect('/login')
  const user = await findUserById(session.userId)
  if (!user) redirect('/login')
  return { id: user.id, name: user.name }
}
```

private scope는 cookies/headers/searchParams를 읽을 수 있지만 connection은 허용하지 않는다. production의 같은 요청 내 중복 호출은 재사용할 수 있으나 요청 간 서버 저장소에 개인 결과를 보관하지 않는다. 브라우저가 lifetime에 맞춰 결과를 재사용한다.

공지사항은 일반 use cache로 shell에 넣고 개인 dashboard만 Suspense 아래에서 getCurrentUser를 await하면 공지와 레이아웃을 먼저 표시할 수 있다. layout 최상위에서 세션을 await하는 구조는 children까지 막는다.

## 하나의 Promise를 Client Context로 공유

서버의 Suspense 경계 안에서 `const userPromise = getCurrentUser()`를 한 번 만들고 await하지 않은 채 Client Provider에 넘긴다. Context는 `Promise<{id,name}> | null`, Provider는 userPromise와 children을 받는다. consumer는 먼저 Context를 읽고 Provider가 없으면 명시적 오류를 낸 뒤 React `use(userPromise)`로 값을 읽는다.

consumer가 suspend하므로 각 사용자 배지/메뉴 주위에도 적절한 Suspense를 둔다. Promise를 layout 최상위에서 생성해 요청 읽기를 시작하면 바깥 경계를 우회할 수 있다. 사용자 객체 전체나 raw session 대신 최소 DTO만 전달한다. 구체적 Provider 예제는 [[NextJS-Client-Data]]와 연결한다.

## 사용자 파생 데이터의 서버 캐시

```ts
import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { getCurrentUser } from './auth'
import { findNotes } from './storage'
export async function getNotes() {
  const user = await getCurrentUser()
  return getNotesByUserId(user.id)
}
async function getNotesByUserId(userId: string) {
  'use cache'
  cacheTag(`notes:${userId}`)
  cacheLife('minutes')
  return findNotes(userId)
}
```

내부 cached 함수를 export하지 않고 외부 getter가 인증된 ID를 결정하게 한다. userId는 cache key의 일부이며 임의 client ID를 이 함수에 전달하는 API를 열면 안 된다. 일반 use cache는 best effort 메모리이고 durable/shared가 필요하면 remote handler를 검토한다. 서버에 개인 결과를 보관할 수 없다면 private scope를 선택한다.

인자/캡처 값과 cacheTag는 비밀 저장소가 아니다. 토큰, 비밀번호, raw email 대신 안정적인 식별자를 사용한다. cache 결과를 최소 DTO로 제한하는 책임은 유지된다.

## 변경과 인증된 탐색

변경 Action은 세션을 다시 읽고 입력을 검증한 후 저장한다. 저장 성공 뒤 `updateTag('notes:'+userId)`를 호출해 해당 사용자 결과를 갱신한다. 폼의 문자열을 trim하는 경우에도 최대 길이, 소유권과 허용된 입력 타입은 별도로 확인한다.

private 기본 profile의 client stale은 5분이다. stale을 조정하면 30초 미만인 scope는 prefetch에서 빠진다. 세션별 App Shell을 이용하려면 목적지에 Partial Prefetching을 활성화한다. 전역 `partialPrefetching: true` 또는 segment의 `prefetch = 'partial'`이 해당 조건이다.

params/searchParams에 의존하는 목적지는 `<Link prefetch={true}>`로 링크별 URL 데이터를 해소할 수 있다. 링크마다 서버 invocation이 생길 수 있으므로 대량 채팅방/sidebar 링크는 클릭 대기 시간과 비용을 비교한다. UI cache와 prefetch된 세션 표시가 최신 권한 검사 자체를 대신하지 않는다.

## 출처

- [Next.js, authentication-with-cache-components](https://nextjs.org/docs/app/guides/authentication-with-cache-components)

## 관련 문서

- [[NextJS-Authentication]]
- [[NextJS-App-Cache-Variants]]
- [[NextJS-Prefetching]]
- [[NextJS-Client-Data]]
