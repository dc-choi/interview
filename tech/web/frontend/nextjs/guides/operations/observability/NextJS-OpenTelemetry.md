---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js OpenTelemetry 추적"]
---

# Next.js OpenTelemetry 추적

## Trace, span과 exporter

로그와 지표는 발생 사실/집계값을, trace는 한 요청 안 작업의 인과관계와 시간을 보여 준다.
span은 작업 단위이며 여러 span을 parent 관계로 묶은 것이 trace다. exporter는 telemetry를 backend 또는 collector로 보낸다.
OpenTelemetry API는 업체별 추적 SDK에 덜 묶이는 instrumentation 계약이다. Next.js 자체의 기본 span도 이미 계측되어 있다.
기본 span 이름과 attribute는 사용 버전의 실제 출력으로 확인한다. HTTP semantic convention 이름의 세대가 다른 collector와 호환을 맞춘다.

## 간단한 등록

@vercel/otel과 @opentelemetry/sdk-logs, @opentelemetry/api-logs, @opentelemetry/instrumentation을 설치한다.
project root 또는 src의 instrumentation.ts에서 등록한다. app/pages 안에 두지 않으며 pageExtensions suffix도 맞춘다.

~~~ts
import { registerOTel } from '@vercel/otel'
export function register() {
  registerOTel({ serviceName: 'next-app' })
}
~~~

새 환경에서 코드가 실행되기 전에 register가 호출되어 이후 custom span을 trace에 포함할 수 있다.
공식 with-opentelemetry 예제와 @vercel/otel의 추가 설정을 참고한다. 같은 module의 TS/JS 예제는 타입 외 동작이 같다.

## NodeSDK 직접 구성

wrapper가 노출하지 않는 설정이 필요하면 sdk-node, resources, semantic-conventions, sdk-trace-node, exporter-trace-otlp-http 패키지를 설치한다.
NodeSDK는 Edge용 SDK가 아니다. NEXT_RUNTIME === 'nodejs'일 때만 Node 모듈을 import한다.

~~~ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node')
  }
}
~~~

~~~ts
// instrumentation.node.ts, 설치한 OTel SDK의 타입과 맞춘다.
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
const sdk = new NodeSDK({
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'next-app' }),
  spanProcessors: [new SimpleSpanProcessor(new OTLPTraceExporter())],
})
sdk.start()
~~~

원문은 단수 spanProcessor 설정을 쓴다. 지원 SDK의 복수 spanProcessors API로 옮길 때 타입과 종료/flush 동작을 검증한다.
SimpleSpanProcessor와 OTLP HTTP exporter는 최소 구성 예다. production batching, sampling, endpoint, credentials와 shutdown은 실제 SDK/서비스에 맞춘다.
Node 구성과 @vercel/otel은 같은 목적의 시작점이며 모든 옵션/런타임 지원이 같은 것은 아니다. Edge 지원이 필요하면 호환 wrapper/SDK를 선택한다.

## 수집과 배포 검증

collector와 호환 backend를 준비하면 local trace에서 GET /requested/pathname root 아래 자식 span을 확인할 수 있다.
NEXT_OTEL_VERBOSE=1은 기본보다 더 많은 Next span을 출력한다.
collector를 쓰는 @vercel/otel 구성은 Vercel과 self-host 둘 다 가능하다. Vercel은 프로젝트 provider 연결 설정이 필요하다.
다른 플랫폼에서는 collector가 Next 앱의 telemetry를 받고 처리하도록 구성한 다음 앱을 배포한다.
custom exporter를 직접 연결하면 collector가 필수는 아니다. 전송 성공, 손실, 수집 지연과 개인정보를 실제 backend에서 확인한다.

## Custom span의 수명

@opentelemetry/api의 trace.getTracer(name).startActiveSpan(name, callback)으로 현재 작업의 자식 span을 만든다.
GitHub stars 조회의 원문 getValue는 구현 placeholder다. 반환 Promise를 await하고 성공/실패 모두 finally에서 span.end한다.

~~~ts
import { trace } from '@opentelemetry/api'
export async function fetchGithubStars() {
  return trace.getTracer('app').startActiveSpan('fetchGithubStars', async span => {
    try {
      const response = await fetch('https://api.github.com/repos/vercel/next.js')
      if (!response.ok) throw new Error('GitHub request failed')
      const repository = await response.json()
      return repository.stargazers_count
    } finally {
      span.end()
    }
  })
}
~~~

실패 status/exception 기록은 별도 선택이다. end만 했다고 성공/실패 의미가 자동으로 완성된다고 보지 않는다.

## 공통 attribute

next.span_name은 span 이름, next.span_type은 종류 식별자, next.route는 /[param]/user 같은 route pattern이다.
next.rsc는 RSC/prefetch 요청 여부의 boolean이다.
next.page는 App Router의 page/layout/loading 같은 내부 파일 식별 값이다. group의 /layout이 중복될 수 있어 next.route와 묶어 해석한다.
next.segment는 module resolve span의 segment를 가리킨다.

## 기본 span 목록

다음 표의 route 공통 속성은 next.span_name, next.span_type, next.route를 뜻한다.
| span 이름 | next.span_type | 의미와 속성 |
| --- | --- | --- |
| `<method> <route>` | BaseServer.handleRequest | 요청 root, http.method/status_code/route/target 및 route 공통 |
| `render route (app) <route>` | AppRender.getBodyResult | App route render, route 공통 |
| `fetch <method> <url>` | AppRender.fetch | 코드 fetch, http.method/url, net.peer.name, 명시 port의 net.peer.port, name/type |
| `executing api route (app) <route>` | AppRouteRouteHandlers.runHandler | App Route Handler, route 공통 |
| `getServerSideProps <route>` | Render.getServerSideProps | Pages SSR 데이터 실행, route 공통 |
| `getStaticProps <route>` | Render.getStaticProps | Pages 정적 데이터 실행, route 공통 |
| `render route (pages) <route>` | Render.renderDocument | Pages document render, route 공통 |
| `generateMetadata <page>` | ResolveMetadata.generateMetadata | metadata 생성, name/type/page, 한 route에 여러 개 가능 |
| resolve page components | NextNodeServer.findPageComponents | page 해석, route 공통 |
| resolve segment modules | NextNodeServer.getLayoutOrPageModule | layout/page 코드 load, name/type/segment |
| start response | NextNodeServer.startResponse | 첫 byte 전송 시점의 zero-length span |

NEXT_OTEL_FETCH_DISABLED=1은 내장 fetch span을 꺼 custom fetch instrumentation과 중복을 줄이는 선택이다.
Server/route/data span을 브라우저 Core Web Vitals와 같은 지표로 취급하지 않는다. span timing과 응답 첫 byte/field 지표를 연결해 병목을 찾는다.

## 이해 확인

- startActiveSpan에서 finally의 end가 빠지면 어떤 추적 정보가 불완전해지는가?
- next.page만 사용하면 route group의 layout을 유일하게 구분할 수 없는 이유는 무엇인가?

## 출처

- [Next.js, open-telemetry](https://nextjs.org/docs/app/guides/open-telemetry)

## 관련 문서

- [[NextJS-Instrumentation]]
- [[NextJS-Analytics]]
- [[NextJS-Self-Hosting]]
