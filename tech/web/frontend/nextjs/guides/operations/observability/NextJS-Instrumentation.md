---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 서버 instance 계측 초기화"]
---

# Next.js 서버 instance 계측 초기화

## register의 생명주기

instrumentation은 monitoring/logging 코드를 앱에 연결해 production 동작과 성능을 관측하는 과정이다. root 또는 src의 instrumentation.ts/js가 register를 export한다. app/pages 안에 넣지 않고 둘과 같은 수준에 둔다. pageExtensions에 suffix를 추가했다면 instrumentation.page.ts처럼 filename도 맞춘다.

register는 새 Next server instance 시작 때 한 번 호출되고 완료된 뒤에 요청을 받는다. 서비스 전체에서 영구적으로 한 번이라는 뜻이 아니므로 serverless cold start, 재시작, 여러 instance 각각을 고려한다.

~~~ts
import { registerOTel } from '@vercel/otel'
export function register() {
  registerOTel('next-app')
}
~~~

@vercel/otel은 OpenTelemetry 시작 경로다. 이름은 trace service 식별에 맞춘다. register 구현이 있다는 것과 exporter가 실제 trace를 받는 것은 별개다.

## side effect module

~~~ts
export async function register() {
  await import('package-with-side-effect')
}
~~~

global 값/SDK를 선언하는 module은 export를 사용하지 않아도 import로 side effect가 실행된다. top-level import 대신 register 안으로 모으면 startup side effects의 순서와 runtime 조건을 한곳에서 관리하고 의도하지 않은 module load 실행을 줄인다. package-with-side-effect는 실제 설치한 module로 바꾸는 예시다.

## runtime별 import

~~~ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./instrumentation-edge')
  }
}
~~~

register는 여러 runtime에서 호출될 수 있다. Node SDK가 fs/native APIs에 의존하면 branch 안에서만 import해 Edge bundle에 포함하지 않는다. Edge는 현재 deprecated 경로이므로 신규 Node 개발과 기존 Edge compatibility를 구분한다. js variant도 같은 import 순서/조건이며 TS 타입만 다르다.

## 확인

instance 시작 로그와 준비 시점, first request 전 등록, 실제 trace 전달 및 종료 flush를 확인한다. browser 초기화는 instrumentation-client이며 server register를 대신하지 않는다. 요청 오류 callback 등 전체 file API는 관련 계측 API 문서와 함께 읽는다.

## 출처

- [Next.js, instrumentation](https://nextjs.org/docs/app/guides/instrumentation)

## 관련 문서

- [[NextJS-Observability]]
- [[NextJS-Analytics]]
- [[NextJS-Edge-Runtime]]
