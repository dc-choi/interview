---
tags: [runtime, nodejs, framework, hono, typescript]
status: done
category: "OS & Runtime"
aliases: ["Hono", "Hono 프레임워크"]
---

# Hono

Web 표준(Fetch API) 위에 올라간 작고 빠른 멀티 런타임 웹 프레임워크. 이름은 일본어로 "불꽃(炎, ほのお)"에서 따왔고, Cloudflare Workers 같은 엣지 런타임을 1순위로 설계됐다.

## 한 줄 정의

Node.js 고유의 `req`/`res` 객체가 아니라 표준 `Request`/`Response`(Fetch API)를 입출력으로 쓰기 때문에, 코드를 거의 바꾸지 않고 Cloudflare Workers, Deno, Bun, Node.js, Vercel, AWS Lambda 등 어디서나 돌릴 수 있다. 이 "Web 표준 위에 짓는다"는 선택이 멀티 런타임, 초경량, 빠른 속도라는 나머지 특징을 전부 파생시킨다.

## 왜 등장했나 (설계 동기)

Express는 Node.js의 `http` 모듈(`req`, `res`)에 강하게 묶여 있어 엣지/서버리스 런타임에서 그대로 돌지 않는다. Cloudflare Workers, Deno, Bun 같은 런타임은 Node API 대신 Web 표준 API를 노출한다. Hono는 처음부터 표준 `Request`/`Response`만 다루도록 설계해 이 단절을 없앴다. 핸들러 입장에서는 "들어온 표준 Request를 받아 표준 Response를 돌려준다"가 전부이고, 각 런타임 차이는 얇은 어댑터가 흡수한다.

## 핵심 특징 5가지

- **Ultrafast**: 자체 `RegExpRouter`가 JS 진영에서 가장 빠른 라우터로 알려져 있다.
- **Lightweight**: `hono/tiny` 프리셋 기준 14kB 미만, 의존성 0개. 미들웨어/어댑터는 실제 쓸 때만 번들에 포함된다.
- **Multi-runtime**: 동일 코드가 Cloudflare Workers/Deno/Bun/Node.js/Lambda/Vercel에서 동작.
- **Batteries-included**: 내장 미들웨어, 서드파티 미들웨어, 헬퍼가 풍부해 추가 의존성 없이 대부분 처리.
- **DX(개발자 경험)**: 1급 TypeScript 지원. 특히 RPC로 서버~클라이언트 타입을 연결.

## 라우터 (성능의 핵심)

Hono는 라우터를 교체 가능한 부품으로 두고, 상황에 맞는 것을 고를 수 있게 했다.

| 라우터 | 특징 | 용도 |
|---|---|---|
| RegExpRouter | 모든 라우트를 하나의 큰 정규식으로 합쳐 1회 매칭. 트리(radix-tree) 기반보다 대개 빠름 | 기본, 최고 속도 |
| TrieRouter | 트라이 기반. 모든 라우팅 패턴 지원 | RegExpRouter 미지원 패턴 보완 |
| SmartRouter | 등록된 라우트를 보고 위 둘 중 적합한 것을 런타임에 선택 | 기본 프리셋(`hono`) |
| LinearRouter | 빌드 없이 선형 등록. 등록이 매우 빠름 | Workers처럼 매 요청 초기화되는 환경 |
| PatternRouter | 가장 작은 라우터 | 번들 크기 극한 최적화 |

RegExpRouter가 빠른 이유: path-to-regexp처럼 라우트마다 정규식을 선형 루프로 돌리는 게 아니라, 전체 라우트 패턴을 단일 정규식으로 컴파일해 한 번에 매칭한다. 단, 모든 패턴을 지원하진 못해서 보통 다른 라우터와 조합(SmartRouter)해 쓴다.

## Context 객체 (`c`)

요청과 응답을 한 핸들러 안에서 다루는 단일 진입점. 요청 파싱과 응답 생성이 모두 `c`에 모여 있다.

```typescript
import { Hono } from 'hono'
const app = new Hono()

app.get('/users/:id', (c) => {
  const id = c.req.param('id')        // 경로 파라미터
  const q = c.req.query('q')          // 쿼리스트링
  const auth = c.req.header('Authorization') // 요청 헤더
  c.header('x-powered-by', 'Hono')    // 응답 헤더
  return c.json({ id, q }, 200)       // JSON 응답 (status 지정 가능)
})

export default app
```

- `c.req`: 표준 Request 래퍼. `param`, `query`, `header`, `json()`(body 파싱), `valid()`(검증 결과) 등.
- 응답 헬퍼: `c.json()`, `c.text()`, `c.html()`, `c.redirect()`, `c.body()`.

## 미들웨어: 양파 모델 (onion model)

`app.use()`로 등록하고 `await next()`를 기준으로 앞은 요청 처리 전, 뒤는 응답 처리 후로 갈린다. 가장 먼저 등록된 미들웨어가 바깥 껍질이 되어, 들어갈 때 먼저 실행되고 나올 때 가장 나중에 실행된다.

```typescript
// next() 앞: 요청이 핸들러로 들어가기 전
app.use(async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  await next()
  // next() 뒤: 핸들러 응답이 나온 후 (응답 가공 가능)
  c.header('x-response-time', '...')
})
```

Express의 `(req, res, next)` 콜백형과 달리 `next`를 호출하면 `Promise`를 반환하므로 `await`로 흐름을 직선적으로 제어한다. 응답 후처리(헤더 주입, 타이밍 측정)가 자연스럽다.

## 멀티 런타임 어댑터

핸들러 코드는 그대로 두고, 런타임별 진입점만 다르다.

```typescript
// Node.js — 어댑터 필요 (node:http <-> Web 표준 변환)
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
const app = new Hono()
app.get('/', (c) => c.text('Hello Node.js!'))
serve(app)
```

Cloudflare Workers/Deno/Bun은 런타임 자체가 Web 표준 `fetch` 핸들러를 받으므로 `export default app`만으로 동작한다. Node.js만 표준 인터페이스가 아니라 `@hono/node-server`가 `node:http`의 `req`/`res`를 표준 `Request`/`Response`로 변환해준다.

## Validation (검증)

미들웨어 형태로 라우트에 끼워 넣고, 통과한 값은 `c.req.valid()`로 타입 안전하게 꺼낸다.

```typescript
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'

app.post('/posts', zValidator('form', z.object({ body: z.string() })), (c) => {
  const { body } = c.req.valid('form') // 타입 추론됨
  return c.json({ ok: true, body })
})
```

`@hono/standard-validator`(`sValidator`)는 Standard Schema를 따르는 Zod, Valibot 등 여러 검증 라이브러리를 동일 인터페이스로 받는다. 검증 대상 위치는 `'json'`, `'form'`, `'query'`, `'param'`, `'header'` 등으로 지정한다.

## RPC: 풀스택 타입 안전

서버 라우트 정의를 체이닝해 타입을 추출하고, 클라이언트가 그 타입을 그대로 import해 호출한다. 별도 코드 생성 없이 서버~클라이언트 경계에서 타입이 끊기지 않는다.

```typescript
// server.ts — 라우트를 체이닝해야 타입이 누적된다
const app = new Hono()
  .get('/', (c) => c.json('list'))
  .post('/', (c) => c.json('create', 201))
  .get('/:id', (c) => c.json(`get ${c.req.param('id')}`))
export type AppType = typeof app

// client.ts — 서버 타입을 import
import { hc } from 'hono/client'
import type { AppType } from './server'
const client = hc<AppType>('http://localhost') // 엔드포인트/응답 타입 자동완성
```

주의: 타입 추론은 라우트를 **메서드 체이닝**으로 이어 붙일 때만 누적된다. `app.get(...)`을 따로따로 호출하면 `AppType`에 타입이 모이지 않는다.

## 프리셋 (entry point)

같은 코어를 어떤 라우터 조합으로 묶을지에 따라 import 경로가 갈린다.

| import | 라우터 | 적합 환경 |
|---|---|---|
| `hono` (기본) | SmartRouter + RegExpRouter + TrieRouter | 대부분의 장기 실행 서버 |
| `hono/quick` | SmartRouter + LinearRouter | 매 요청마다 앱이 초기화되는 환경(일부 서버리스/FaaS) |
| `hono/tiny` | PatternRouter | 번들 크기 극한 최소화 (14kB 미만) |

## Express / Fastify / NestJS 비교

| 항목 | Hono | Express | Fastify | NestJS |
|---|---|---|---|---|
| 기반 | Web 표준(Request/Response) | Node `http`(req/res) | Node `http` | Express/Fastify 어댑터 |
| 런타임 | 멀티(Workers/Deno/Bun/Node…) | Node 중심 | Node 중심 | Node 중심 |
| 크기 | 14kB~, 의존성 0 | 작지만 미들웨어 의존 | 중간 | 무거움(프레임워크) |
| 타입 | 1급, RPC로 풀스택 | 약함(`@types` 별도) | 스키마 기반 | 데코레이터/DI 강함 |
| 성향 | 라우팅/미들웨어 최소 코어 | 미니멀, 생태계 방대 | 성능+스키마 직렬화 | 엔터프라이즈 풀프레임워크 |

트레이드오프 요약: 엣지/서버리스 또는 런타임 이식성이 중요하고 가볍게 시작하려면 Hono. 거대한 기존 미들웨어 생태계가 필요하면 Express. 처리량과 스키마 직렬화 성능이 핵심이면 Fastify. DI/모듈/데코레이터로 큰 팀의 구조를 강제하고 싶으면 NestJS.

## 면접 체크포인트

- "Hono가 멀티 런타임인 이유는?" → Node 고유 객체가 아니라 표준 `Request`/`Response`만 다루도록 설계했기 때문. 런타임 차이는 얇은 어댑터가 흡수한다.
- "RegExpRouter가 왜 빠른가?" → 라우트마다 정규식을 선형으로 도는 대신 전체 라우트를 단일 정규식으로 컴파일해 1회 매칭한다.
- "Express와 미들웨어 모델 차이는?" → Express의 `(req,res,next)` 콜백형 대신 `await next()` 기반 양파 모델이라 응답 후처리를 직선적으로 제어한다.
- "RPC는 무엇을 해결하나?" → 서버 라우트 타입을 클라이언트가 import해 코드 생성 없이 엔드포인트/응답 타입을 공유, API 경계의 타입 단절을 없앤다.
- "왜 Node.js에서만 어댑터(`@hono/node-server`)가 필요한가?" → Node가 Web 표준 fetch 인터페이스가 아니라 `node:http`를 쓰기 때문에 변환 계층이 필요하다.

## 관련 문서

- [[Node.js]] — 런타임 코어 (http 모듈, 이벤트 루프)
- [[HTTP-Networking|HTTP 네트워킹]]
- [[TypeScript-Node|TypeScript]]

## 출처

- [Hono 공식 문서 — hono.dev](https://hono.dev/docs)
