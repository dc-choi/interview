---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages의 계측 초기화와 오류 보고 계약"]
---

# Pages의 계측 초기화와 오류 보고 계약

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## register와 runtime별 side effect

instrumentation.ts/js는 프로젝트 root 또는 src에서 pages/app와 같은 수준에 둔다. pageExtensions가 .page.ts 같은 suffix를 쓰면 instrumentation.page.ts로 맞춘다. register는 server instance마다 한 번, 요청 처리 준비 전에 완료하고 async를 지원한다. 다음 형태는 서로 대체 가능한 초기화 예다.

```ts
// instrumentation.ts
import { registerOTel } from '@vercel/otel'
export function register() { registerOTel('next-app') }
```

```ts
export async function register() {
  await import('package-with-side-effect')
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./instrumentation-node')
  if (process.env.NEXT_RUNTIME === 'edge') await import('./instrumentation-edge')
}
```

각 모듈은 프로젝트가 설치하거나 구현한다. side effect import를 register 안에 모아 top-level import만으로 원치 않는 환경에서 초기화되는 것을 피한다. Node-only SDK를 Edge에서도 import하지 않는다. 초기화가 오래 걸리거나 실패하면 요청 준비에 영향을 준다.

## onRequestError 전체 타입과 실행

```ts
import type { Instrumentation } from 'next'
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const message = error instanceof Error ? error.message : String(error)
  const digest = typeof error === 'object' && error !== null && 'digest' in error
    ? String(error.digest) : undefined
  const response = await fetch('https://monitor.example.com/report-error', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, digest,
      request: { path: request.path, method: request.method }, context }),
  })
  if (!response.ok) console.error('오류 전송 실패', response.status)
}
```

error는 unknown이므로 좁힌 뒤 message/digest를 읽는다. Next가 server error를 포착하면 호출한다. React Server Component 처리 중 변환된 error일 수 있어 원래 instance와 같다고 가정하지 않고 digest로 식별할 수 있다. 비동기 작업은 await한다. 수집기 장애가 반복 오류를 만들지 않도록 timeout/전송 정책은 provider 계약에 맞게 정한다. 원문의 request.headers 전체 전송은 민감 cookie/token을 포함할 수 있어 예제에서는 path/method만 선별했다.

| request field | 타입/의미 |
| --- | --- |
| path | string, `/blog?name=foo` 같은 요청 경로 |
| method | string, GET/POST 등 |
| headers | `{ [key: string]: string \| string[] }`, 읽기 전용 요청 정보 |

| context field | 타입/값 |
| --- | --- |
| routerKind | Pages Router/App Router |
| routePath | string, `/app/blog/[dynamic]` 등 route file path |
| routeType | render/route/action/proxy |
| renderSource | react-server-components/react-server-components-payload/server-rendering |
| revalidateReason | on-demand/stale/undefined(일반 요청) |
| renderType | dynamic/dynamic-resume(PPR) |

반환은 void 또는 Promise<void>다. 이 union 전체가 모든 Pages 요청에 동시에 적용되는 것은 아니며 실제 context를 기록해서 분류한다. runtime별 onRequestError 모듈을 사용하려면 해당 모듈 handler를 호출하고 await한다. 원문 `return require('./on-request-error.node')`는 모듈을 import할 뿐 handler 실행이나 인자 전달을 하지 않으므로 실제 전송 함수와 연결한다.

```ts
import type { Instrumentation } from 'next'
export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (process.env.NEXT_RUNTIME === 'edge') {
    const { report } = await import('./on-request-error.edge')
    await report(...args)
  } else {
    const { report } = await import('./on-request-error.node')
    await report(...args)
  }
}
```

각 모듈 report는 Instrumentation.onRequestError와 같은 인자를 받는다. 13.2 instrumentation 실험 도입,14.0.4 Turbopack 지원,15.0 stable 및 onRequestError 도입이다.

## client 시작 전 초기화

```ts
// instrumentation-client.ts
console.log('Analytics initialized')
window.addEventListener('error', event => {
  const body = JSON.stringify({ message: String(event.error ?? event.message) })
  navigator.sendBeacon('/analytics/errors', body)
})
```

frontend 실행 전에 analytics/error/performance SDK를 초기화한다. browser window를 server register와 섞지 않는다. 실제 error provider와 payload 익명화/전송 실패 정책은 별도로 구성한다.

## 출처

- [Next.js, Instrumentation guide](https://nextjs.org/docs/pages/guides/instrumentation)
- [Next.js, Instrumentation API](https://nextjs.org/docs/pages/api-reference/file-conventions/instrumentation)
- [Next.js, Analytics](https://nextjs.org/docs/pages/guides/analytics)

## 관련 문서

- [[NextJS-Pages-Observability]]
- [[NextJS-Observability]]
