---
tags: [cs, javascript, browser, xhr, ajax]
status: done
verified_at: 2026-10-01
category: "CS - JavaScript"
aliases: ["XMLHttpRequest", "XHR 상태와 이벤트"]
---

# XMLHttpRequest의 상태, 이벤트와 응답 해석

`XMLHttpRequest`(XHR)의 요청 구성, readyState와 event 순서, Promise로 감싸는 규칙과 응답 해석을 다룬다. Fetch와 고르는 기준, Fetch의 응답과 취소 규칙은 [[Browser-Fetch-and-XHR|브라우저 Fetch와 XHR]]을 본다.

## 요청 구성과 readyState

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

| readyState | 상수 | 의미 |
|---|---|---|
| 0 | `UNSENT` | 객체 생성 직후 |
| 1 | `OPENED` | `open()` 뒤, header 설정과 `send()`가 가능한 상태 |
| 2 | `HEADERS_RECEIVED` | redirect를 모두 따른 뒤 응답 header를 받음 |
| 3 | `LOADING` | 응답 body 수신 중 |
| 4 | `DONE` | 전송 완료 또는 전송 중 오류 |

- `send()`는 readyState를 바꾸지 않는다. 2는 send 시점이 아니라 응답 header가 도착한 시점이다.
- `readystatechange`는 상태가 바뀔 때 발생하고, LOADING 중에는 상태가 그대로여도 body chunk를 받을 때마다(약 50ms 간격) 반복된다.
- DONE은 성공을 뜻하지 않는다. network error, CORS 실패, timeout, abort처럼 HTTP 응답을 얻지 못한 DONE은 `status`가 0이다. 숫자 대신 `XMLHttpRequest.DONE` 같은 상수로 비교할 수 있다.

Window 환경의 synchronous XHR은 UI와 event loop를 막으므로 사용하지 않는다. 표준은 Window에서 `async=false`를 넘기지 말라고 정하고 제거를 진행 중이며, Window의 동기 요청에 `timeout`이나 `responseType`을 설정하면 `InvalidAccessError`다. worker의 제한적 사례를 일반화하지 않는다.

## event 순서와 정리 hook

`readystatechange`로 상태 값을 비교하기보다 개별 event에 listener를 둔다. 비동기 요청 한 번은 다음 순서로 event를 보낸다.

1. `loadstart`: `send()` 직후
2. `progress`: body 수신 중 반복
3. `readystatechange`: DONE으로 바뀔 때
4. 결과 event 하나: 정상 수신이면 `load`, 실패면 `error`, `timeout`, `abort` 중 하나
5. `loadend`: 결과와 무관하게 마지막에 한 번

```ts
xhr.addEventListener("load", () => {
  if (xhr.status < 200 || xhr.status >= 300) {
    onHttpError(xhr.status);
    return;
  }
  onSuccess(xhr.response);
});
xhr.addEventListener("error", onNetworkError);
xhr.addEventListener("timeout", onTimeout);
xhr.addEventListener("abort", onAbort);
xhr.addEventListener("loadend", cleanup); // spinner 해제와 listener 정리를 한 곳에서
```

- 결과 분기는 `load`, `error`, `timeout`, `abort`에 두고 공통 정리는 `loadend` 한 곳에 둔다. `loadend`만 쓸 때는 성공 여부를 따로 확인한다.
- 진행 중인 요청에 `abort()`를 부르면 `readystatechange`(DONE), `abort`, `loadend`를 보낸 뒤 readyState를 0으로 되돌리고, 이 마지막 변경에는 `readystatechange`를 보내지 않는다.
- 진행률은 `ProgressEvent`의 `loaded`와 `total`로 계산하고, `lengthComputable`이 false면 전체 크기를 모르는 것이다. upload 진행률은 `xhr.upload`에 listener를 둔다. listener 존재 여부는 `send()`에서 확인하므로 `send()` 전에 등록하고, upload listener가 있으면 cross-origin 요청이 preflight 대상이 된다([[CORS#1. Simple Request|Simple Request 조건]]).

## Promise로 감싸기

event 기반 API를 Promise로 바꿀 때는 모든 terminal path에서 정확히 한 번 settle한다.

```ts
const request = ({ method = "GET", url, body, timeout = 0, parseJson = true }) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.timeout = timeout;
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new HttpError(xhr.status, url));
        return;
      }
      try {
        resolve(parseJson ? JSON.parse(xhr.responseText) : xhr.response);
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => reject(new NetworkError(url));
    xhr.ontimeout = () => reject(new RequestTimeoutError(url));
    xhr.onabort = () => reject(new RequestAbortedError(url));
    if (body === undefined) {
      xhr.send();
      return;
    }
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(body));
  });
};
```

- 성공일 때만 `resolve`하면 404, network error, timeout, abort에서 Promise가 pending으로 남아 `await`한 호출부가 멈춘다. `onload`에서 status로 `reject`를 더해도 network error, timeout, abort는 `load` 대신 각자의 event로 끝나므로 그 event에서도 `reject`한다.
- executor 안의 동기 throw는 reject로 바뀌지만 `onload`처럼 나중에 실행되는 callback의 throw는 Promise와 무관한 uncaught error가 되고 Promise는 pending으로 남는다. callback 안의 parse는 `try/catch`로 감싸 `reject`한다([[Worker-Threads-Patterns#setImmediate 인터리빙|setImmediate chunk의 같은 원리]]).
- 성공은 200 한 값이 아니라 2xx 범위로 판정한다. `reject` 값은 xhr 객체 대신 status, URL과 원인을 담은 전용 Error로 만들어 호출부가 HTTP, network, timeout, parse 실패를 구분하게 한다.
- 기본 option은 `{ ...defaults, ...options }`나 `Object.assign({}, defaults, options)`로 병합한다. `Object.assign(defaults, options)`는 첫 인자를 바꾸므로 공유 기본값에 요청별 option이 쌓인다.
- 순차 loop의 실패 정책은 `try/catch` 위치가 정한다. `for...of` 밖에서 잡으면 첫 실패에서 loop가 끝나 뒤 요청은 시작되지 않고, 안에서 잡으면 실패를 기록하고 계속한다. `Promise.all`은 하나가 reject되면 결과 Promise만 reject하고 이미 시작한 요청은 계속 진행한다([[Promise-Async#순차와 동시 실행|순차와 동시 실행]]).
- handler를 object method로 두고 `xhr.onload`에 넘기면 호출 시 `this`가 xhr이 되므로 arrow나 `bind`로 고정한다. 위 예시처럼 closure 변수 `xhr`를 쓰면 이 문제가 생기지 않는다([[JavaScript-this-and-Function-Invocation#bind의 두 기능|bind의 두 기능]]).

## 요청 method, header와 body

- `open(method, url)`의 method는 `DELETE`, `GET`, `HEAD`, `OPTIONS`, `POST`, `PUT`만 대소문자 무관하게 대문자로 정규화되고 `PATCH`와 custom method는 입력 그대로 전송되므로 method는 대문자로 쓴다. `CONNECT`, `TRACE`, `TRACK`은 `SecurityError`다.
- `send(body)`는 method가 `GET`이나 `HEAD`면 body를 조용히 버린다.
- `setRequestHeader()`는 `open()` 뒤, `send()` 전에만 부를 수 있고 그 밖에는 `InvalidStateError`다. 같은 이름을 두 번 설정하면 교체하지 않고 `, `로 이어 붙이며, forbidden request header는 오류 없이 무시된다.
- `timeout`의 기본값 0은 timeout을 두지 않는다는 뜻이다. 요청 중에 값을 바꾸면 새 값도 fetch를 시작한 시점부터 잰다.

## 응답 type과 문자 인코딩

- `responseType`은 `""`, `"text"`, `"json"`, `"blob"`, `"arraybuffer"`, `"document"` 중 하나의 소문자 문자열이다. 목록에 없는 값(`"JSON"` 등)을 대입하면 예외 없이 무시되고 이전 값이 남는다(기본 `""`라 text로 처리된다). LOADING이나 DONE 상태에서 바꾸면 `InvalidStateError`이고 worker에서 `"document"`는 무시된다.
- `responseText`는 `responseType`이 `""`나 `"text"`일 때만, `responseXML`은 `""`나 `"document"`일 때만 읽을 수 있고 그 밖에는 `InvalidStateError`다. `responseType`이 `""`이면 XML MIME 응답만 Document가 되고 HTML 응답의 `responseXML`은 null이므로, HTML을 Document로 받으려면 `"document"`를 지정한다.
- `responseType = "json"`에서 JSON parse가 실패하면 예외 없이 `response`가 null이다. 실패는 null 검사로 구분한다.
- text 응답은 응답 `Content-Type`의 charset(또는 `overrideMimeType()`으로 지정한 charset)으로 decode하고 charset이 없을 때만 UTF-8을 쓴다. Fetch의 `text()`는 charset과 무관하게 UTF-8로 decode하므로 legacy charset API를 옮길 때 결과가 달라진다([[Browser-Fetch-and-XHR#XHR에서 Fetch로 옮길 때|XHR에서 Fetch로 옮길 때]]).
- `responseURL`은 redirect를 따른 뒤의 최종 URL이다. 세션 만료로 login page로 redirect된 응답을 구분할 때 쓴다.

## 출처

- [XMLHttpRequest Standard](https://xhr.spec.whatwg.org/)
- [XMLHttpRequest Standard, states](https://xhr.spec.whatwg.org/#states), [XMLHttpRequest Standard, The send() method](https://xhr.spec.whatwg.org/#the-send()-method), [XMLHttpRequest Standard, The abort() method](https://xhr.spec.whatwg.org/#the-abort()-method), [XMLHttpRequest Standard, The setRequestHeader() method](https://xhr.spec.whatwg.org/#the-setrequestheader()-method), [XMLHttpRequest Standard, The responseType attribute](https://xhr.spec.whatwg.org/#the-responsetype-attribute), [XMLHttpRequest Standard, Response body](https://xhr.spec.whatwg.org/#response-body)
- [Fetch Standard, normalize a method](https://fetch.spec.whatwg.org/#concept-method-normalize), [Fetch Standard, forbidden method](https://fetch.spec.whatwg.org/#forbidden-method)
- [Web IDL Standard, Attribute setter](https://webidl.spec.whatwg.org/#dfn-attribute-setter)
- XHR: [구조](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51414), [event](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51483), [요청](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51586), [응답](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51698), [responseText/responseXML/FormData](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51723)
- 비동기 통신 활용: [XHR과 Promise](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51765), [다수 파일과 Promise.all](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51965), [async/await](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52014), [데이터 전송과 변환](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52231), [this 참조](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52394), [handler 바인딩](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=52508)

## 관련 문서

- [[Browser-Fetch-and-XHR|브라우저 Fetch와 XHR]]
- [[Promise-Async|Promise와 async]]
- [[CORS|CORS]]
- [[JavaScript-this-and-Function-Invocation|JavaScript this와 함수 호출 방식]]
