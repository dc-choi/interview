---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js custom server"]
---

# Next.js custom server

## 선택 조건과 반환 객체

기본 next start 서버와 외부 backend를 함께 쓰는 것 자체는 custom server가 아니다.
custom server는 next(options)로 앱을 준비하고 직접 HTTP 서버를 연결하는 방식이다. 내장 라우터가 요구를 처리하지 못하는 경우에만 선택한다.
standalone output은 custom server 파일을 trace하지 않고 자체 최소 server.js를 만든다. 두 실행 방식을 합쳐 쓸 수 없다.
next(options)는 요청 처리에 사용할 app 객체를 반환한다. app.prepare()의 Promise가 완료된 뒤 서버를 열고 getRequestHandler()의 handle(req,res)에 전달한다.

## 옵션의 타입과 기본값

| 옵션 | 타입 | 기본값/의미 |
| --- | --- | --- |
| conf | Object | {}이며 next.config.js와 같은 설정 객체 |
| dev | Boolean | false, 개발 모드 여부 |
| dir | String | '.', Next 프로젝트 위치 |
| quiet | Boolean | false, 서버 정보가 포함된 오류 숨김 |
| hostname | String | 앞단에서 사용하는 hostname, 선택 |
| port | Number | 앞단에서 사용하는 port, 선택 |
| httpServer | node:http Server | 앞단 HTTP Server 객체, 선택 |
| turbopack | Boolean | 기본 활성 Turbopack 여부 |
| webpack | Boolean | Webpack 활성 여부 |

dev를 환경 NODE_ENV !== 'production'로 계산하고 PORT 문자열을 10진 정수로 변환한다. 예제의 기본 port는 3000이다.
Node http createServer의 콜백에서 handle을 호출하고 listen(port)를 실행하는 순서다.
기존 서버를 전달해야 하는 통합은 httpServer 옵션과 해당 서버의 수명 관리도 맞춘다.

## 응답 헤더와 코드 실행

직접 소유하는 Set-Cookie 등 헤더는 handle 호출 전에 설정한다.
handle이 응답을 보내기 시작한 뒤 Promise가 resolve되면 headersSent가 이미 true일 수 있다. 이후 setHeader는 유효한 헤더 추가 시점이 아니다.
Node는 상황에 따라 ERR_HTTP_HEADERS_SENT를 던질 수 있으므로 원문의 항상 silently discarded라는 표현은 보장으로 삼지 않는다.
Express res나 Fastify reply.raw로 감싸도 같은 응답 시작 순서가 적용된다.

custom server 파일은 Next compiler나 bundler를 통과하지 않는다. 사용 Node의 문법과 의존성, TypeScript 실행/변환 방식은 별도로 마련한다.
TS/JS 원문은 동일한 서버 흐름이며 server.ts를 그대로 node server.js로 실행하는 구성이라고 읽으면 안 된다.
개발 script는 node server.js, build는 next build, production start는 NODE_ENV=production node server.js라는 역할이다.
POSIX 환경 변수 문법은 Windows 실행 환경에 맞춰 바꾼다. nodemon은 custom server 수정 시 재시작에 사용할 수 있다.

## 이해 확인

- 외부 API backend를 붙인 앱과 custom Next server는 무엇이 다른가?
- Set-Cookie를 await handle 이후 설정하면 왜 응답 계약을 지킬 수 없는가?

## 직접 실행하는 서버 예제

~~~js
// server.mjs: Next compiler 밖에서 실행하는 Node ESM 파일
import { createServer } from 'node:http'
import next from 'next'
const port = Number.parseInt(process.env.PORT || '3000', 10)
const app = next({ dev: process.env.NODE_ENV !== 'production' })
const handle = app.getRequestHandler()
await app.prepare()
createServer((req, res) => {
  // 필요하면 검증한 cookie를 이 시점에 설정한다.
  void handle(req, res)
}).listen(port)
~~~

package.json의 dev/start는 node server.mjs를 실행하고 production 환경에는 NODE_ENV=production을 설정한다. build는 next build다.

## 출처

- [Next.js, custom-server](https://nextjs.org/docs/app/guides/custom-server)

## 관련 문서

- [[NextJS-Platform-Deployment]]
- [[NextJS-Self-Hosting]]
- [[NextJS-Config-Build-Deployment]]
