---
tags: [nextjs, app-router, rendering]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["offline 상태와 navigation 재시도"]
---

# offline 상태와 navigation 재시도

## useOffline이 알려주는 상태

`experimental.useOffline: true`를 설정하면 `next/offline`의 useOffline hook을 사용할 수 있다. 인자는 없고 boolean을 반환한다. 옵션을 켜지 않으면 항상 false다. 초기 SSR에서는 false이고 client의 network 요청 실패나 offline event에 따라 true로 바뀐다.

```tsx
'use client'
import { useOffline } from 'next/offline'
export function NetworkStatus() {
  const offline = useOffline()
  return offline ? <p role="status">연결을 기다리고 있어요.</p> : null
}
```

이 hook은 network status를 표시하는 실험적 기능이다. true가 사업 API의 영구 장애, 모든 endpoint의 실패 또는 사용자의 물리적 연결 단절을 정확히 구별하지는 않는다. 연결이 회복되면 실패해 대기하던 navigation, prefetch, Server Action을 Next가 재시도할 수 있다.

## prefetched shell의 경험

이미 가져온 shell이 있으면 offline 중에도 route의 정적 부분으로 이동할 수 있다. request-time data 부분은 계속 fallback이나 pending 상태로 남을 수 있다. 연결 상태 UI와 Suspense를 함께 두면 사용자는 빈 화면 대신 무엇이 기다리는지 알 수 있다. shell에 있는 정보가 업무적으로 최신인지 별도로 표시한다.

이 기능을 durable offline queue, Service Worker cache 또는 완전한 PWA 계약으로 해석하지 않는다. 모든 dynamic data가 로컬에 저장되거나 사용자의 작성 중 값이 영구 보존되는 것은 아니다. Action의 재시도를 고려하면 결제/생성처럼 중복에 민감한 변경에는 서버 idempotency가 필요하다.

## 검증

network를 끊기 전에 한 route를 prefetch한 경우와 처음 방문하는 route를 나누어 확인한다. shell 표시, dynamic fallback, pending Action, reconnect 뒤 재시도와 최종 결과를 확인한다. navigator.onLine 값만 수동으로 바꿔 전체 동작을 검증했다고 말하지 않는다.

## 전역 배너와 offline 로딩 예

boolean false는 online뿐 아니라 server 렌더 및 hydration 전 초기값도 의미한다. OfflineBanner를 root layout의 body에서 children 앞에 렌더하면 모든 route에 유지되는 `role="status"` 안내를 만들 수 있다. false일 때 null을 반환한다. destination/loading.tsx를 use client로 두고 useOffline()이 true면 연결을 기다리는 메시지, false면 일반 로딩을 표시한다. prefetched static shell은 즉시 보이지만 dynamic boundary의 네트워크 요청은 대기한다. 연결 복구 시 Next가 막힌 요청을 자동 재시도하고 dynamic content를 stream한다. hook 도입 버전은 원문상16.x.0이며 실험/production 비권장이다.

## 이해 확인

1. offline=true이면 이전에 방문하지 않은 모든 page를 볼 수 있는가?
2. SSR에서 false인 상태와 hydration 뒤 true인 상태는 어떤 UI 차이를 만드는가?
3. 재시도 가능한 Action에 idempotency가 필요한 이유는?

## 출처

- [Next.js, use-offline](https://nextjs.org/docs/app/api-reference/functions/use-offline)

## 관련 문서

- [[NextJS-App-Prefetch-Config]]
- [[NextJS-App-Streaming]]
- [[NextJS-App-Actions]]
