---
tags: [nodejs, express, routing, middleware, error-handling]
status: done
verified_at: 2026-10-01
category: "OS - Node.js"
aliases: ["Express Routing and Middleware", "Express 라우팅"]
---

# Express 라우팅과 미들웨어

Express 요청 처리는 등록 순서대로 route와 middleware를 통과하는 흐름이다. 각 함수는 응답을 완료하거나 `next`로 다음 처리에 넘긴다. 반환값 자체가 응답 본문으로 변환되거나 Promise 성공만으로 다음 middleware가 자동 실행되는 구조는 아니다.

## method, path와 등록 순서

`app.METHOD(path, ...handlers)`와 `router.METHOD`의 METHOD는 `get`, `post`, `put`, `delete` 등 소문자 HTTP method다. 함수 하나, 배열, 여러 함수와 배열 조합을 handler로 받을 수 있다.

- `app.all`/`router.all`은 해당 path의 모든 method를 처리한다.
- `app.use`/`router.use`는 mount prefix를 기준으로 처리한다. `/apple`은 `/apple`, `/apple/images`를 포함하지만 단순 문자열 prefix인 `/applepie`까지 뜻하지 않는다.
- path를 생략한 `use`는 `/`에 장착되어 모든 요청의 후보가 된다.
- route 매칭에는 query string이 포함되지 않는다. `/users?q=a`의 route path는 `/users`다.
- 같은 path의 여러 route는 등록 순서대로 평가된다. 앞 route가 응답을 보내고 흐름을 끝내면 뒤 route는 실행되지 않는다.
- 별도 HEAD route를 GET보다 먼저 등록하지 않았다면 GET handler가 HEAD에도 사용된다. 본문 전송 의미는 HTTP HEAD 계약을 따른다.
- `app.route('/books').get(...).post(...)`는 같은 path를 재사용한다. Router의 `route` 순서는 method를 나중에 추가한 시점이 아니라 route를 만든 시점에 결정된다.

HTTP QUERY route인 `app.query`/`router.query`는 현재 공식 API에서 Node.js `>=20.19.3 <21 || >=22.2.0` 조건을 둔다. Express의 최소 Node 18 조건만으로 이 method까지 사용할 수 있다고 보지 않는다. body parser, client와 intermediary 지원도 확인한다.

## Express 5 문자열 경로

Express 5의 문자열 route는 path-to-regexp v8 문법을 사용한다. Express 4의 문자열 pattern과 매개변수 뒤 regexp를 그대로 옮기지 않는다.

| 경로 | 의미 |
|---|---|
| `/users/:id` | `id`는 한 path segment의 문자열 |
| `/flights/:from-:to` | `-`는 literal, 두 값 포착 |
| `/:file{.:ext}` | 확장자 구간 선택적, 없으면 `ext` key 생략 |
| `/files/*filepath` | 한 개 이상 segment, `filepath`는 문자열 배열 |
| `/{*splat}` | root도 매칭, `/`에서는 `splat` key 생략 |
| `/order{/:id}` | `/order` 또는 `/order/42` |
| `/user/{:id}` | `/user/` 또는 `/user/42`, 필수 slash 유지 |
| `['/discussion/:slug', '/page/:slug']` | 문자열 안의 regexp 대체를 경로 배열로 표현 |

`?`, `+`, `!`, `(`, `)`, `[`, `]` 등 예약 문자를 literal로 쓸 때는 escape가 필요하다. `*`는 이름 있는 wildcard이고 `{}`는 선택 구간이다. parameter 이름은 유효한 JavaScript 식별자를 쓰거나 `:"user-name"`처럼 인용한다. 문자열 안의 `:id(\d+)` 제한은 지원하지 않는다. 별도 입력 검증이나 전체 `RegExp` route를 선택한다.

`RegExp` 객체 route의 capture group은 `req.params[0]` 등 숫자 key로, named capture는 이름 key로 조회한다. 문자열 경로의 `req.params`는 null prototype이고 regexp 경로는 일반 객체다. `hasOwnProperty`가 있다고 가정하지 않는다. params는 자동 decode되므로 encoding 실패와 타입/범위 검증도 처리한다.

`strict`는 route 문자열의 brace 위치를 바꾸지 않는다. 기본값에서 `/order/`가 `/order{/:id}`에 매칭할 수 있지만 strict를 켜면 끝 slash가 구별된다. `/user/{:id}`의 slash 자체는 path가 요구한다.

## Router의 범위

`express.Router({ caseSensitive, strict, mergeParams })`는 mount 가능한 middleware다. 세 옵션의 기본값은 false다. `app.use('/teams/:teamId', router)` 아래 Router가 부모 params를 사용하려면 `mergeParams: true`가 필요하며 동명 값은 자식의 값이 우선한다.

Router는 module 단위로 분리할 수 있지만 보안 경계가 자동으로 생기지는 않는다. 같은 `/users`에 auth Router와 공개 Router를 순서대로 장착하면 앞 Router의 인증 middleware가 공개 Router로 흘러갈 요청에도 실행될 수 있다. path, route별 middleware와 흐름을 함께 설계한다.

mount 시 `req.url`의 prefix가 제거되므로 Router를 다른 prefix에 재사용할 수 있다. 외부 원래 URL은 `originalUrl`, 이번 mount prefix는 `baseUrl`로 읽는다.

## param callback

`app.param(name, callback)`/`router.param(name, callback)`의 callback은 `(req, res, next, value, name)`이다. parameter 로딩과 검증을 route handler보다 먼저 수행한다.

- param callback은 등록한 Router에 local이며 sub-app/child Router로 상속되지 않는다. `mergeParams`로 들어온 부모 parameter 자체가 자식 param callback을 실행시키지는 않는다.
- 같은 parameter가 같은 요청의 여러 매칭 route에 등장해도 callback은 해당 처리 흐름에서 한 번만 실행되도록 처리된다. app 전체 모든 parameter 이름의 글로벌 cache로 해석하지 않는다.
- `app.param`은 이름 배열을 받지만 Express 5의 `router.param`은 단일 문자열만 받는다. 여러 이름은 각각 등록한다.
- `req.params`를 일반 middleware에서 바꾸면 이후 route 처리에서 reset될 수 있다. 입력을 정규화한 결과나 로딩한 객체는 명시적인 요청 속성에 둔다.

## next의 세 가지 흐름

| 호출 | 동작 |
|---|---|
| `next()` | 다음 일반 middleware/handler |
| `next(error)` | 일반 처리 건너뛰고 뒤의 오류 middleware |
| `next('route')` | 현재 METHOD route의 남은 callback을 건너뛰고 다음 route 후보 |
| `next('router')` | 현재 Router의 남은 처리를 벗어나 상위 흐름으로 복귀 |

`next('route')`는 `app.METHOD`/`router.METHOD`에 등록한 handler에서 사용한다. `next`는 함수를 종료하지 않으므로 `return next(...)` 등으로 이후 코드의 실행도 정리한다. 응답 완료 뒤 `next()`를 호출하면 후속 함수가 다시 응답하려 할 수 있다.

비동기 middleware의 정상 경로는 `await work(); next()`처럼 완료 뒤 넘긴다. 처리해야 할 Promise를 시작만 하고 넘기면 뒤 handler가 미완료 상태를 읽을 수 있다.

## 오류 전달과 404

Express 5는 handler가 반환한 Promise의 rejection과 async 함수의 throw를 오류 흐름으로 전달한다. Promise를 반환하지 않고 시작만 하면 자동 포착 범위 밖이다. callback API는 callback의 오류를 `next(err)`에, timer의 throw는 callback 안에서 잡아 `next`에 넘긴다. route 내부의 동기 throw는 Express가 포착한다.

```js
app.get('/users/:id', async (req, res) => {
  const user = await getUserById(req.params.id);
  res.json(user);
});

app.use((req, res) => res.status(404).json({ error: 'not_found' }));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'internal_error' });
});
```

`getUserById`는 애플리케이션 함수 자리다. 오류 middleware는 네 인자 `(err, req, res, next)`를 유지하고 일반 route보다 뒤에 둔다. 사용하지 않는 next를 생략해 세 인자가 되면 일반 middleware로 취급된다.

404는 매칭한 route/middleware가 아무 응답도 만들지 않은 결과이며 자동으로 오류 handler에 가지 않는다. 끝의 일반 middleware가 처리한다. 오류 handler도 응답을 완료하거나 `next(err)`로 넘겨야 요청이 끝난다.

기본 오류 handler는 `err.status`/`statusCode`가 4xx/5xx가 아니면 500을 사용하고 `err.headers`를 반영한다. production에서는 stack을 응답에 포함하지 않지만 development에서는 표시할 수 있다. 이미 header를 보낸 후 오류가 나면 새 JSON을 보내지 않고 기본 오류 처리에 위임하며 connection이 닫힐 수 있다. 같은 오류를 두 번 next에 넘기지 않는다.

## 출처

- [Express, Basic routing](https://expressjs.com/ko/5x/starter/basic-routing/)
- [Express, Routing](https://expressjs.com/en/5x/guide/routing/)
- [Express, Writing middleware](https://expressjs.com/ko/5x/guide/writing-middleware/)
- [Express, Using middleware](https://expressjs.com/ko/5x/guide/using-middleware/)
- [Express, Error handling](https://expressjs.com/en/5x/guide/error-handling/)
- [Express, Router](https://expressjs.com/en/5x/api/router/)
- [Express, Application Object](https://expressjs.com/en/5x/api/application/)
- [Express, Upgrade to Express v5](https://expressjs.com/en/guide/migrating-5/)

## 관련 문서

- [[Express-Application|애플리케이션과 버전 전환]]
- [[Express-Request-and-Body|입력 파싱과 검증]]
- [[Express-Response-and-Files|응답 완료와 파일 오류]]
- [[Middleware패턴이란|미들웨어 패턴]]
