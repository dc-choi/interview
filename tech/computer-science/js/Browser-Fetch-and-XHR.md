---
tags: [cs, javascript, browser, fetch, xhr, ajax]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["Browser Fetch and XHR", "브라우저 Fetch와 XHR"]
---

# 브라우저 Fetch와 XHR

Ajax는 페이지 전체를 다시 불러오지 않고 비동기 HTTP 통신으로 화면 일부를 갱신하는 역사적 기법을 가리킨다. 특정 API나 XML만을 뜻하지 않으며, 현대 browser에서는 Fetch와 XHR 중 요구사항에 맞는 transport API를 선택한다.

## XHR의 상태와 이벤트

`XMLHttpRequest`는 `open`, header 설정, event handler 등록, `send` 순서로 요청을 구성한다.

```ts
const xhr = new XMLHttpRequest();
xhr.open("GET", "/api/orders");
xhr.responseType = "json";
xhr.timeout = 5_000;
xhr.onload = () => {
  if (xhr.status < 200 || xhr.status >= 300) {
    handleHttpError(xhr.status);
    return;
  }
  render(xhr.response);
};
xhr.onerror = handleNetworkError;
xhr.ontimeout = handleTimeout;
xhr.send();
```

`load`는 HTTP 응답 전송이 끝났다는 뜻이지 2xx 성공만을 뜻하지 않는다. status를 별도로 검사한다. network error, timeout, abort는 각 event로 구분하고 cleanup이 중복되지 않게 terminal state를 통합한다.

Window 환경의 synchronous XHR은 UI와 event loop를 막으므로 사용하지 않는다. 표준도 `async=false` 사용을 금지하는 방향이며 worker의 제한적 사례를 일반화하지 않는다. XHR은 upload progress처럼 Fetch가 모든 환경에서 직접 제공하지 못하는 기능이 필요할 때 여전히 선택지가 될 수 있다.

## Fetch의 응답과 오류

```ts
const response = await fetch("/api/orders", { signal });
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}
const orders = await response.json();
```

Fetch Promise는 HTTP 404나 500만으로 reject되지 않고 `Response`로 resolve된다. network failure, abort처럼 response를 만들지 못한 경우에 reject된다. 따라서 status 또는 `response.ok`를 확인한 뒤 body를 해석한다.

- response body는 stream이며 보통 한 번만 소비할 수 있다. 두 소비자가 필요하면 읽기 전에 `clone()`하거나 data를 한 번 materialize한다.
- `json()`은 JSON syntax를 parse할 뿐 domain schema를 검증하지 않는다.
- `credentials` 기본값은 `same-origin`이다. cross-origin cookie가 필요하면 server CORS 정책까지 함께 설정한다.
- redirect, cache, referrer와 integrity option은 보안/캐시 정책에 따라 명시한다.
- browser가 관리하는 forbidden header를 application code에서 마음대로 덮을 수 없다.

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

## 취소와 timeout

Fetch 자체 option에 portable한 timeout 의미를 기대하지 말고 `AbortController`로 deadline을 연결한다.

```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort("deadline"), 5_000);

try {
  return await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

사용자 navigation, component 해제와 상위 request 취소도 같은 signal에 연결할 수 있다. abort 뒤 server가 이미 effect를 적용했을 수 있으므로 mutation retry에는 idempotency key와 결과 조회가 필요하다.

## 여러 요청과 파일 처리

여러 file/upload 요청을 한꺼번에 `Promise.all`로 시작하면 browser connection, memory와 server capacity를 압박한다. queue와 bounded concurrency를 두고 각 요청의 progress, retry와 결과 순서를 별도로 관리한다.

- 단일 실패 시 나머지를 취소할지 계속 수집할지 정한다.
- retry는 timeout/network error/일부 5xx처럼 분류된 실패에만 제한한다.
- retry 횟수, exponential backoff와 jitter를 둔다.
- upload는 size/type/content 검증, server-side 제한과 malware policy가 필요하다.
- UI에 외부 응답을 삽입할 때 `innerHTML` 문자열 조립 대신 안전한 DOM API와 escaping을 쓴다.

## 백엔드 적용

NestJS controller는 HTTP transport validation과 authentication을 처리하고 application service는 idempotent command/query 계약을 제공한다. 외부 API 호출 adapter에는 timeout, abort 전달, retry budget, circuit breaker와 관측성을 둔다. HTTP success와 business success를 섞지 말고 response schema와 domain result를 검증한다.

브라우저가 취소했다고 DB transaction이나 외부 결제가 자동 취소되는 것은 아니다. 연결 종료 signal을 application 작업에 전달할지, 이미 commit된 effect를 조회/보상할지 use case별로 정한다.

## 출처

- [XMLHttpRequest Standard](https://xhr.spec.whatwg.org/)
- [Fetch Standard](https://fetch.spec.whatwg.org/)
- [DOM Standard, aborting ongoing activities](https://dom.spec.whatwg.org/#aborting-ongoing-activities)
- Ajax: [개요](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51312), [비동기 통신](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51371)
- XHR: [구조](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51414), [요청](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51483), [응답](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51586), [event](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51698), [timeout/abort](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51723)
- 비동기 통신 활용: [JSON](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51765), [GET](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51965), [POST](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52014), [파일](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52231), [다중 요청](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52394), [진행/오류 처리](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52508)
- Fetch: [개요](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52518), [요청/응답](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52688), [body/header](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52786), [활용](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52846)

## 관련 문서

- [[Promise-Async|Promise와 async]]
- [[JavaScript-Async-Iterable-Pipelines|JavaScript 비동기 이터러블 파이프라인]]
- [[CORS|CORS]]
- [[External-Service-Resilience|외부 서비스 장애 대응]]
- [[NestJS-File-Upload|파일 업로드]]
