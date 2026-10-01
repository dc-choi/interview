---
tags: [cs, javascript, browser, fetch, xhr, ajax]
status: done
verified_at: 2026-10-01
category: "CS - JavaScript"
aliases: ["Browser Fetch and XHR", "브라우저 Fetch와 XHR"]
---

# 브라우저 Fetch와 XHR

Ajax는 페이지 전체를 다시 불러오지 않고 비동기 HTTP 통신으로 화면 일부를 갱신하는 역사적 기법을 가리킨다. 특정 API나 XML만을 뜻하지 않으며, 현대 browser에서는 Fetch와 XHR 중 요구사항에 맞는 transport API를 선택한다.

## XHR을 고를 때

XMLHttpRequest의 readyState와 event 순서, Promise로 감싸는 규칙, 요청 제약과 응답 해석은 [[Browser-Fetch-and-XHR-XMLHttpRequest|XMLHttpRequest의 상태, 이벤트와 응답 해석]]에서 다룬다. Window 환경의 synchronous XHR은 쓰지 않는다. XHR은 upload progress처럼 Fetch가 모든 환경에서 직접 제공하지 못하는 기능이 필요할 때 여전히 선택지가 될 수 있다.

## Fetch의 응답과 오류

```ts
const response = await fetch("/api/orders", { signal });
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}
const orders = await response.json();
```

Fetch Promise는 HTTP 404나 500만으로 reject되지 않고 `Response`로 resolve된다. network failure, abort처럼 response를 만들지 못한 경우에 reject된다. 따라서 status 또는 `response.ok`를 확인한 뒤 body를 해석한다.

`fetch()`는 status와 header를 받은 시점에 resolve되고 body는 그 뒤 stream으로 도착한다. `ok`, `status`, `redirected`, `url`, `Content-Type`은 body를 받기 전에 확인할 수 있고, body 읽기(`json()`, `text()`, `blob()`)는 두 번째 Promise라 연결 끊김, abort와 parse 오류로 따로 실패할 수 있다.

- response body는 stream이며 보통 한 번만 소비할 수 있다. 두 소비자가 필요하면 읽기 전에 `clone()`하거나 data를 한 번 materialize한다. 이미 읽은 body를 다시 읽으면 `TypeError`로 reject되고 `bodyUsed`는 true다.
- `json()`은 JSON syntax를 parse할 뿐 domain schema를 검증하지 않는다. syntax가 틀리면 `SyntaxError`로 reject된다.
- `text()`와 `json()`은 `Content-Type`의 charset과 무관하게 UTF-8로 decode한다. EUC-KR 같은 legacy charset 응답은 `arrayBuffer()`로 받아 `new TextDecoder("euc-kr")`로 decode한다.
- `credentials` 기본값은 `same-origin`이다. cross-origin cookie가 필요하면 server CORS 정책까지 함께 설정한다.
- redirect, cache, referrer와 integrity option은 보안/캐시 정책에 따라 명시한다. `redirect` 기본값은 `follow`라 세션 만료로 302를 받아 login HTML로 이동해도 `ok`는 true, `status`는 200이고 `json()`은 `SyntaxError`를 낸다. JSON API 호출은 body를 읽기 전에 `redirected`, `url`, `Content-Type`을 확인하거나, redirect를 받으면 network error로 실패하는 `redirect: "error"`를 명시한다.
- browser가 관리하는 forbidden header를 application code에서 마음대로 덮을 수 없다.
- 오류를 catch해 성공 값과 같은 통로로 돌려주면 호출부가 둘을 구분하기 어렵다. 전용 Error로 throw하거나 tagged result로 표현한다([[Promise-Async#오류 경계|오류 경계]]).

Fetch가 XHR보다 CORS를 우회하거나 더 넓은 origin에 접근하는 것은 아니다. 둘 다 browser의 same-origin/CORS 정책을 따른다. CORS 허용 여부는 server response와 browser가 판단한다.

## 요청 body와 header

JSON 요청은 직렬화와 content type을 맞춘다.

```ts
await fetch("/api/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(command),
  signal,
});
```

`FormData`를 보낼 때는 browser가 multipart boundary를 포함한 `Content-Type`을 만들게 둔다. 문자열 query는 `URL`/`URLSearchParams`로 encode한다. secret이나 민감정보를 URL에 넣으면 history, log와 referrer에 남을 수 있다.

- method는 `DELETE`, `GET`, `HEAD`, `OPTIONS`, `POST`, `PUT`만 대소문자 무관하게 대문자로 정규화된다. HTTP method token은 대소문자를 구분하므로 `method: "patch"`는 그대로 전송돼 `405 Method Not Allowed`가 날 수 있다. method는 대문자로 쓴다. `CONNECT`, `TRACE`, `TRACK`은 `TypeError`다.
- `GET`, `HEAD` 요청에 body를 넣으면 `fetch()`와 `new Request()`가 `TypeError`를 던진다.
- 문자열 body에 `Content-Type`을 지정하지 않으면 `text/plain;charset=UTF-8`이 붙는다(`URLSearchParams`는 `application/x-www-form-urlencoded;charset=UTF-8`). `JSON.stringify`만 하고 header를 빠뜨리면 `application/json`만 처리하는 server parser가 body를 읽지 않는다.
- body가 있는 `Request`는 한 번 보내면 body가 소비돼 같은 객체로 다시 `fetch()`하면 `TypeError`다. retry는 소비 전에 `clone()`하거나 요청을 만드는 함수로 매번 새 Request를 만든다.
- `keepalive: true`는 지속 시간 설정이 아니라 문서가 unload된 뒤에도 요청이 끝까지 가게 하는 flag다. 페이지를 떠날 때 보내는 분석 event에 쓰며, 진행 중인 keepalive 요청 body의 합계가 64KiB를 넘으면 network error다.

### Headers 객체

`Headers`는 header 이름을 대소문자 구분 없이 다룬다. HTTP field name 자체가 대소문자를 구분하지 않고, HTTP/2와 HTTP/3는 이름을 소문자로 바꿔 전송한다. `get`, `has`, `delete`는 대소문자를 무시하고, 순회하면 소문자로 정규화된 이름이 정렬된 순서로 나온다. 이름 비교 로직을 대소문자 구분으로 만들지 않는다.

- `append`는 기존 값을 남기고 값을 추가해 `get`이 `1, 2`처럼 이어 붙인 값을 돌려주고, `set`은 값을 교체한다. `Authorization`처럼 값이 하나여야 하는 header에 `append`를 반복하면 `Bearer a, Bearer b`가 전송돼 인증이 실패하므로 `set`을 쓴다.
- `fetch()`가 돌려준 `Response`의 headers는 immutable이라 `set`, `append`가 `TypeError`다. 바꾸려면 `new Headers(response.headers)`로 복사한다.
- 교차 출처 응답은 `Access-Control-Expose-Headers`에 없는 header를 `get`하면 null이다([[CORS#응답 헤더 정리|CORS 응답 헤더]]). browser는 `Set-Cookie`를 script에 노출하지 않는다.
- Node.js 같은 server runtime에서 여러 `Set-Cookie`를 `get("set-cookie")`로 읽으면 쉼표로 이어져 `Expires` 날짜 안의 쉼표와 구분할 수 없으므로 `getSetCookie()`로 배열을 받는다(MDN compatibility data 기준 Node.js 19.7.0부터).

## 취소와 timeout

Fetch 자체 option에 portable한 timeout 의미를 기대하지 말고 `AbortController`나 `AbortSignal.timeout()`으로 deadline을 연결한다. deadline은 header 도착이 아니라 body 소비까지 덮어야 한다.

```ts
const controller = new AbortController();
const timeout = setTimeout(
  () => controller.abort(new DOMException("deadline exceeded", "TimeoutError")),
  5_000,
);

try {
  const response = await fetch(url, { signal: controller.signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return await response.json();
} finally {
  clearTimeout(timeout);
}
```

- `fetch()` 직후 timer를 해제하면 deadline이 header 도착까지만 걸린다. 같은 signal은 body 읽기에도 적용돼 abort하면 진행 중인 `json()`이 reject되므로 body 소비가 끝난 뒤 해제한다.
- abort reason은 그대로 reject 값이 된다. `controller.abort("deadline")`처럼 문자열을 넘기면 `fetch()`와 body 읽기가 그 문자열로 reject돼 `error.name`이나 `instanceof Error`로 분류할 수 없고 stack도 없다. reason을 생략하면 `AbortError` DOMException이 되고, 직접 넘길 때는 Error 객체를 쓴다.
- `AbortSignal.timeout(ms)`는 `TimeoutError` DOMException으로 abort하고 body 읽기까지 적용된다. 사용자 취소 signal과는 `AbortSignal.any([userSignal, AbortSignal.timeout(ms)])`로 합친다. MDN compatibility data 기준 `AbortSignal.any`는 Chrome 116, Firefox 124, Safari 17.4, Node.js 20.3.0부터 쓸 수 있고, Chrome 103부터 123까지의 `AbortSignal.timeout`은 `TimeoutError` 대신 `AbortError`로 abort한다.

사용자 navigation, component 해제와 상위 request 취소도 같은 signal에 연결할 수 있다. abort 뒤 server가 이미 effect를 적용했을 수 있으므로 mutation retry에는 idempotency key와 결과 조회가 필요하다.

## 여러 요청과 파일 처리

여러 file/upload 요청을 한꺼번에 `Promise.all`로 시작하면 browser connection, memory와 server capacity를 압박한다. queue와 bounded concurrency를 두고 각 요청의 progress, retry와 결과 순서를 별도로 관리한다.

- 단일 실패 시 나머지를 취소할지 계속 수집할지 정한다.
- retry는 timeout/network error/일부 5xx처럼 분류된 실패에만 제한한다.
- retry 횟수, exponential backoff와 jitter를 둔다.
- upload는 size/type/content 검증, server-side 제한과 malware policy가 필요하다.
- UI에 외부 응답을 삽입할 때 `innerHTML` 문자열 조립 대신 안전한 DOM API와 escaping을 쓴다.

### Blob 응답과 object URL 수명

image나 file 응답은 `await response.blob()`으로 Blob을 받고, `URL.createObjectURL(blob)`이 만든 `blob:` URL을 `img.src`에 넣어 표시한다.

- `blob()`을 부르기 전에 `response.ok`를 확인한다. 404 HTML 오류 page도 Blob이 되어 깨진 image로만 드러난다.
- `createObjectURL`은 Blob을 blob URL store에 등록하고, 등록된 동안 Blob은 해제되지 않는다. `revokeObjectURL`을 부르거나 문서가 unload될 때 해제되므로, 오래 사는 SPA에서 미리보기와 반복 다운로드마다 URL을 만들고 해제하지 않으면 memory가 계속 쌓인다.
- 해제는 소비자가 URL을 다 쓴 뒤에 한다. image라면 `load`나 `error` 뒤, 미리보기를 교체할 때는 이전 URL을, component를 해제할 때는 남은 URL을 revoke한다. revoke 뒤의 접근은 network error가 되므로 `src`에 넣자마자 revoke하면 load가 실패할 수 있다.
- transport wrapper가 object URL을 반환하면 해제 책임이 흐려진다. wrapper는 Blob을 반환하고 화면 계층이 URL 생성과 해제를 함께 맡는다.

## XHR에서 Fetch로 옮길 때

XHR에서 조용히 넘어가던 입력과 응답이 Fetch에서는 예외나 다른 결과가 된다.

| 상황 | XHR | Fetch |
|---|---|---|
| `GET`, `HEAD` 요청 body | 조용히 버림 | `TypeError` |
| 금지 method(`CONNECT` 등) | `SecurityError` | `TypeError` |
| JSON parse 실패 | `responseType = "json"`이면 `response`가 null | `json()`이 `SyntaxError`로 reject |
| text 응답 decode | `Content-Type` charset 사용 | 항상 UTF-8 |
| 같은 header 재설정 | `setRequestHeader`가 `, `로 이어 붙임 | `set`은 교체, `append`는 이어 붙임 |
| 최종 URL 확인 | `responseURL` | `response.url`, `response.redirected` |

## 백엔드 적용

NestJS controller는 HTTP transport validation과 authentication을 처리하고 application service는 idempotent command/query 계약을 제공한다. 외부 API 호출 adapter에는 timeout, abort 전달, retry budget, circuit breaker와 관측성을 둔다. HTTP success와 business success를 섞지 말고 response schema와 domain result를 검증한다.

브라우저가 취소했다고 DB transaction이나 외부 결제가 자동 취소되는 것은 아니다. 연결 종료 signal을 application 작업에 전달할지, 이미 commit된 effect를 조회/보상할지 use case별로 정한다.

## 출처

- [XMLHttpRequest Standard](https://xhr.spec.whatwg.org/)
- [Fetch Standard](https://fetch.spec.whatwg.org/)
- [Fetch Standard, fetch() method](https://fetch.spec.whatwg.org/#fetch-method), [Fetch Standard, normalize a method](https://fetch.spec.whatwg.org/#concept-method-normalize), [Fetch Standard, Request class](https://fetch.spec.whatwg.org/#dom-request), [Fetch Standard, keepalive](https://fetch.spec.whatwg.org/#request-keepalive-flag), [Fetch Standard, Headers class](https://fetch.spec.whatwg.org/#headers-class), [Fetch Standard, Body mixin](https://fetch.spec.whatwg.org/#body-mixin), [Fetch Standard, redirected](https://fetch.spec.whatwg.org/#dom-response-redirected)
- [DOM Standard, aborting ongoing activities](https://dom.spec.whatwg.org/#aborting-ongoing-activities)
- [File API, Lifetime of blob URLs](https://w3c.github.io/FileAPI/#lifeTime), [File API, Creating and Revoking a blob URL](https://w3c.github.io/FileAPI/#creating-revoking)
- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110), [RFC 9113, HTTP/2](https://www.rfc-editor.org/rfc/rfc9113), [RFC 9114, HTTP/3](https://www.rfc-editor.org/rfc/rfc9114)
- [MDN browser-compat-data, AbortSignal](https://github.com/mdn/browser-compat-data/blob/main/api/AbortSignal.json), [MDN browser-compat-data, Headers](https://github.com/mdn/browser-compat-data/blob/main/api/Headers.json)
- Ajax: [개요](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51312), [애플리케이션 모델](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51371)
- XHR: [구조](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51414), [event](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51483), [요청](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51586), [응답](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51698), [responseText/responseXML/FormData](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51723)
- 비동기 통신 활용: [XHR과 Promise](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51765), [다수 파일과 Promise.all](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51965), [async/await](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52014), [데이터 전송과 변환](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52231), [this 참조](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52394), [handler 바인딩](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52508)
- Fetch: [개요](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52518), [요청/응답](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52688), [body/header](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52786), [활용](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52846)

## 관련 문서

- [[Browser-Fetch-and-XHR-XMLHttpRequest|XMLHttpRequest의 상태, 이벤트와 응답 해석]]
- [[Promise-Async|Promise와 async]]
- [[JavaScript-Async-Iterable-Pipelines|JavaScript 비동기 이터러블 파이프라인]]
- [[CORS|CORS]]
- [[External-Service-Resilience|외부 서비스 장애 대응]]
- [[NestJS-File-Upload|파일 업로드]]
