---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 연결 단절과 재시도"]
---

# Next.js 연결 단절과 재시도

## 실험적 프레임워크 재시도

`experimental.useOffline: true`는 실험적 기능이며 문서는 생산 사용을 권장하지 않는다. 연결이 끊긴 framework navigation, RSC fetch, prefetch와 Server Action을 pending으로 유지하고 연결 복구 뒤 재시도한다. Client Component가 직접 실행한 fetch와 SWR/TanStack Query는 각 라이브러리의 정책을 따른다.

이는 이미 받은 shell로 soft navigation을 시작하는 기능이다. offline 상태의 full reload나 처음 방문하는 URL의 HTML을 제공하는 일반 offline 앱과는 다르다. 그런 요구에는 service worker와 별도 저장 정책이 필요하다.

## UI 표현

`useOffline`은 `next/offline`의 Client Hook이다. 서버 렌더와 최초 hydration에서는 false이고, mount 뒤 browser event와 framework fetch 실패/연결 확인을 반영한다. navigator.onLine 하나만으로 인터넷 접근을 확정하지 않는다.

Suspense fallback은 느린 서버와 연결 단절을 구분해 안내할 수 있다. Action pending 버튼에는 재연결 후 자동 재시도될 상태를 표시해 반복 제출을 줄인다. role=status banner로 전체 연결 상태를 알릴 수도 있다.

Cache Components와 Partial Prefetching을 함께 쓰면 미리 받은 App Shell를 사용할 수 있다. 이를 끈 모델에서도 loading.tsx 경계가 해당 segment의 shell 역할을 할 수 있다. 아직 내려받지 않은 데이터까지 offline에서 만들어지는 것은 아니다.

## 변경 작업의 한계

연결이 끊어졌다고 서버가 변경을 실행하지 않았다는 뜻은 아니다. 응답만 유실된 상황을 고려해 중요한 변경에는 멱등 키, 중복 검증과 확정 상태 조회가 필요하다. 브라우저 종료 뒤 durable queue 복구와 모든 네트워크 실패의 무한 재시도 안전성을 이 옵션으로 가정하지 않는다.

생산 build/start에서 prefetch 완료 전후, Action 전송 전후 단절, 복구, 연속 탐색과 새로고침을 구분해 확인한다. 개발 prefetch 동작은 재현 기준으로 부족하다.

## shell과 연결 안내 예제

```ts
// next.config.ts
export default {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: { useOffline: true },
}
```

홈에서 `<Link href="/dashboard">`가 viewport에 들어와 shell을 미리 받은 뒤 offline으로 전환한다고 가정한다. dashboard는 정적 h1/section을 두고 네트워크를 읽는 MetricsTable만 Suspense로 감싼다. 일반 Loading fallback은 연결이 돌아올 때까지 계속 보여 느린 서버와 구별되지 않는다.

```tsx
'use client'
import { useOffline } from 'next/offline'
export function ConnectivityFallback() {
  const offline = useOffline()
  return <p>{offline ? '연결되면 이 내용을 다시 불러옵니다.' : '불러오는 중...'}</p>
}
export function OfflineBanner() {
  const offline = useOffline()
  return offline ? <div role="status">연결이 끊겼습니다. 대기 중인 요청은 연결 후 재시도됩니다.</div> : null
}
```

`<Suspense fallback={<ConnectivityFallback />}><MetricsTable /></Suspense>`는 대기 중인 해당 영역만 안내한다. root body의 children 앞에 OfflineBanner를 두면 모든 route에서 상태를 알리고 연결이 복구되면 사라진다. offline event 또는 framework fetch 실패 후 true로 바뀌고 background 연결 확인이 성공하면 false로 돌아온다. Wi-Fi 연결 자체와 실제 upstream 인터넷 연결은 다르다.

`/chats/42`도 미리 받은 공유 shell을 보여주고 동적 메시지는 복구 후 stream할 수 있다. 해당 URL의 per-link 데이터까지 미리 받은 경우에는 그 데이터를 즉시 보여줄 수도 있다. 이미 준비한 데이터 범위 안의 동작이며 full reload의 HTML 캐시는 제공하지 않는다.

## Action 대기 안내

```ts
// actions.ts
'use server'
export async function ping() { return new Date().toISOString() }
```

```tsx
'use client'
import { useState, useTransition } from 'react'
import { useOffline } from 'next/offline'
import { ping } from './actions'
export function PingForm() {
  const [values, setValues] = useState<string[]>([])
  const [pending, startTransition] = useTransition()
  const offline = useOffline()
  const submit = () => startTransition(async () => {
    const value = await ping()
    setValues((previous) => [value, ...previous])
  })
  let label = 'Ping'
  if (pending) label = offline ? '연결 대기 중, 자동 재시도 예정' : '응답 대기 중'
  return <form action={submit}>
    <button disabled={pending}>{label}</button>
    <ol>{values.map((value, index) => <li key={`${index}-${value}`}>{value}</li>)}</ol>
  </form>
}
```

timestamp는 단순 ping 결과라 같은 밀리초가 나올 수 있어 값만을 유일 key로 쓰지 않았다. flag가 없으면 네트워크 오류가 reject되어 앱이 처리해야 하지만 활성화 시 연결 단절은 pending으로 유지돼 연결 후 같은 await가 완료된다. 이는 업무 오류까지 사라진다는 뜻은 아니다. offline Action 대기 중 다른 링크도 같은 연결 복구를 기다려 반응이 없는 것처럼 보일 수 있다.

## 재현 절차

next build 후 next start에서 Chrome Network Offline, Firefox throttling 메뉴, 실제 Wi-Fi/비행기 모드/케이블 단절로 재현한다. 미리 shell을 받은 링크 클릭→offline-aware fallback→online 복귀→자동 stream, Action 클릭→버튼 pending→복귀 후 결과 추가를 각각 확인한다. Cache Components 없이도 segment loading.tsx를 미리 받으면 같은 Hook/banner/Action 재시도 패턴을 적용할 수 있다. 전체 offline load는 [[NextJS-PWA]]의 service worker 범위다. 공식 use-offline demo의 with-feedback/without-feedback 화면은 안내 유무의 차이를 비교한다.

## 출처

- [Next.js, offline-support](https://nextjs.org/docs/app/guides/offline-support)

## 관련 문서

- [[NextJS-Actions-and-Forms]]
- [[NextJS-Prefetching]]
