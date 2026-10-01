---
tags: [web, frontend, react, api, swr, axios, server-state]
status: done
verified_at: 2026-09-30
category: "웹&네트워크(Web&Network)"
aliases: ["React Server State", "React API 연동"]
---

# React server state와 API

Server state는 remote source가 소유하고 client가 잠시 cache한 snapshot이다. 여러 component가 같은 resource를 읽고, stale 여부와 refetch, mutation, race condition을 다뤄야 하므로 일반 client state와 수명주기가 다르다.

## HTTP client는 transport 선택

Browser의 `fetch`와 Axios 모두 HTTP 요청을 보낼 수 있다. Axios는 instance, interceptor와 response 변환 같은 편의를 제공하지만 필수 React library가 아니다.

```typescript
const api = axios.create({
  baseURL: "/api",
  timeout: 10_000,
});
```

- method, URL, header와 body를 API contract에 맞춘다.
- loading, empty, error, cancellation과 retry 정책을 UI state로 드러낸다.
- component가 unmount되거나 request key가 바뀌면 stale response가 최신 화면을 덮지 않게 AbortSignal 또는 data library 동작을 사용한다.
- response를 TypeScript type으로 단언하지 않고 boundary에서 runtime validation한다.
- CORS는 browser와 server response header가 적용하는 origin policy다. Axios 설치나 client header 조작만으로 해결되지 않는다.

Interceptor는 auth와 공통 error 처리에 유용하지만 모든 오류를 같은 message로 바꾸거나 token refresh recursion을 만들 수 있다. request 대상 origin과 credential 전송 범위를 제한한다.

`getSurvey(surveyId)`, `postAnswers(surveyId, answers)`처럼 입력을 인자로 받는 service 함수를 instance와 같은 module에 모으면 URL 반복과 호출부의 transport 결합이 줄어든다. 저장 요청은 Network 탭의 status(`201` 등)와 payload, 실제 저장소 반영까지 확인한다.

### Axios 응답과 오류 구조

Axios 요청은 response object로 resolve된다. payload는 `data`에 있고 `status`, `statusText`, 소문자 이름의 `headers`, 요청 `config`, 하위 `request`가 함께 온다. service 함수는 Axios response를 호출부로 흘리지 않고 검증한 `data`를 반환한다.

기본 `validateStatus`는 2xx만 성공으로 보므로 4xx와 5xx는 reject된다. 오류는 세 갈래로 나눠 처리한다.

| 오류 상태 | 의미 | 처리 |
|---|---|---|
| `error.response`가 있음 | server가 2xx 밖의 status로 응답 | status와 application error code로 분기 |
| `error.request`만 있음 | 요청은 보냈지만 응답을 받지 못함 | network, timeout, CORS 차단을 의심한다. browser는 CORS 실패 이유를 JavaScript에 알려 주지 않는다 |
| 둘 다 없음 | 요청을 구성하는 단계의 오류 | 요청 생성 code를 점검 |

`fetch`는 404나 500에도 resolve되므로([[Browser-Fetch-and-XHR|Fetch와 XHR]]) 같은 `catch`라도 두 client가 잡는 오류가 다르다. client를 섞거나 교체할 때 오류 분기를 다시 확인한다.

## query와 mutation 분리

Query는 remote snapshot을 읽고, mutation은 server state를 바꾼다. `POST`나 `PUT`이 성공한 뒤 현재 화면의 local copy만 고치면 다른 consumer cache는 stale할 수 있다. mutation 결과로 cache를 갱신하거나 관련 key를 revalidate한다.

Promise의 `.then/.catch`와 `async/await`은 같은 비동기 결과를 합성하는 문법이다. 오류를 log만 하고 성공 화면으로 이동하지 않으며, duplicate submit과 partial failure를 다룬다.

## SWR cache model

SWR이라는 이름은 HTTP `Cache-Control`의 `stale-while-revalidate` 확장(RFC 5861, [[CDN]])에서 왔다. cache의 stale data로 먼저 화면을 그리고 background에서 다시 받아 최신 data로 갱신하므로 빠른 표시와 최신성을 함께 얻는다. HTTP directive는 cache의 응답 재사용 규칙이고 SWR library는 client memory cache와 React re-render로 같은 전략을 구현한다는 층위 차이가 있다.

```jsx
const { data, error, isLoading, isValidating, mutate } = useSWR(
  ["/api/surveys", page],
  fetcher,
);
```

fetcher는 key를 받아 data를 반환하는 Promise 함수이며, SWR은 transport를 정하지 않으므로 `fetch`, Axios와 GraphQL client를 고를 수 있다. 첫 응답 전 `data`는 `undefined`이므로 `isLoading`과 `error` 분기를 둔다.

SWR key는 resource identity다. parameter를 key에 빠뜨리면 서로 다른 query가 cache를 공유한다. 정렬 조건 `?sort=id:desc`를 key가 아니라 fetcher 안에서 URL에 붙이면 정렬이 고정일 때는 동작하지만, 정렬이나 filter가 바뀌면 다른 결과가 한 cache entry를 공유하고 key 기반 `mutate`도 어긋난다. query 입력은 모두 key에 넣는다. `isLoading`과 background `isValidating`을 구분하고, focus/reconnect revalidation과 retry 기본값이 product 요구에 맞는지 확인한다.

| option(SWR 2.x 기본값) | 동작 |
|---|---|
| `dedupingInterval: 2000` | 같은 key 요청을 2초 안에서 하나로 합친다 |
| `revalidateIfStale: true` | stale data가 있어도 mount 때 다시 검증한다 |
| `revalidateOnFocus: true`, `focusThrottleInterval: 5000` | window focus 때 다시 검증하되 5초에 한 번으로 제한한다 |
| `revalidateOnReconnect: true` | network가 복구되면 다시 검증한다 |
| `refreshInterval: 0` | 주기적 polling을 하지 않는다 |
| `shouldRetryOnError: true` | fetcher 오류 뒤 재시도한다 |

SWR은 key가 같으면 한 번만 호출하는 도구도, 주기적으로 호출하는 도구도 아니다. 기본 재검증 trigger는 mount, window focus, network 복구와 key 변경이다.

`mutate`와 `useSWRMutation`은 optimistic data, rollback과 revalidation을 제공한다. Server response가 authoritative한 field를 포함하면 mutation 결과로 cache를 갱신하거나 다시 fetch한다.

- `useSWR`이 반환한 bound `mutate`는 자기 key에 묶여 있어 key 없이 호출한다. `useSWRConfig()`나 `import { mutate } from "swr"`로 얻는 global `mutate`는 key를 넘긴다.
- data 없이 `mutate(key)`를 호출하면 data를 만료로 표시하고 다시 fetch한다. 다만 global `mutate`에 key만 넘기면 같은 key를 쓰는 mounted hook이 없을 때 cache 갱신도 재검증도 일어나지 않는다.
- 생성, 수정, 삭제 성공 뒤 목록 갱신은 focus 같은 암묵적 trigger에 맡기지 않고 목록 hook과 정확히 같은 key로 `mutate`한다. page별 key처럼 여러 entry를 갱신할 때는 key filter 함수를 쓴다.

## table pagination과 total 계약

Server-side pagination에서 `current`와 `pageSize`는 요청 parameter다. table의 `pagination` 설정과 `onChange`로 바뀐 page를 state로 관리하고, 그 값을 SWR key에 넣는다.

- 전체 개수 `total`은 응답 metadata(`totalCount` 등)에서 읽는다. 받아 온 현재 page 배열의 길이를 `total`로 쓰면 전체가 한 page로 계산된다. Ant Design Table의 server 처리 예제도 `total`을 server 응답에서 읽도록 안내한다. offset 응답 계약은 [[API-Conventions-Response|API response 계약]]의 `totalCount`, `totalPages` 예시를 따른다.
- 전체 목록을 한 번에 받아 table이 잘라 보여 주는 client-side pagination은 전체 data가 작고 한 번에 받아도 될 때만 쓴다.
- 공유와 뒤로 가기가 필요하면 page를 URL search parameter에 둔다([[React-State-Management|공유 state 관리]]의 URL state).

Table component에 보여 줄 column 정의와 row data 가공은 render cost가 실제 병목일 때 memoize한다. `useMemo`는 semantic 보장이 아니라 performance optimization이므로 object identity에 의존하는 잘못된 동작을 숨기는 용도로 쓰지 않는다. Row key는 server entity의 stable id를 사용한다.

## 첫 render와 loading UX

React는 data를 기다리지 않고 먼저 렌더링한 뒤 응답이 오면 state를 갱신한다. 첫 render에는 data가 없으므로 초기값이 `null`인 state의 속성에 바로 접근하면 오류가 난다. 곳곳의 optional chaining으로 가리기보다 loading 분기를 명시하고, 빈 배열 기본값은 loading과 실제 빈 결과를 같아 보이게 하므로 empty 상태와 구분한다.

DevTools Network throttling으로 느린 network를 걸면 대기 중 빈 화면이 드러난다. 대기 시간을 줄이는 방향(cache, prefetch, stale data 먼저 표시)과 대기를 보여 주는 방향(spinner, skeleton)은 대체 관계가 아니라 함께 쓰는 선택지다([[Pagination-Patterns|pagination 구현 체크]]).

## Suspense 경계

`<Suspense fallback={...}>`는 안쪽 component가 준비되기를 기다리는 동안 fallback을 보여 준다. Suspense는 Effect나 event handler 안의 data fetch를 감지하지 않으므로 일반 Effect fetch를 감싸도 fallback이 나오지 않는다. data 쪽에서는 `use`로 Promise를 읽을 때 활성화된다. react.dev는 Suspense-enabled framework가 내부에서 Promise cache를 유지하고 `use`로 suspend한다고 설명하며, framework 없이 `use`를 쓰려면 render마다 같은 Promise instance를 재사용하도록 cache해야 한다. Relay와 Next.js처럼 Suspense를 지원하는 data layer는 각 문서가 정한 방식으로 읽는다. `lazy`로 component code를 불러올 때도 Suspense가 활성화된다(2026-09-30 react.dev 기준). Library의 Suspense mode는 해당 React major, SSR와 error boundary 지원을 확인한다. Archived Recoil async selector 예제를 신규 data layer 기본값으로 옮기지 않는다.

## 관련 문서

- [[React-State-Management|Client state 선택]]
- [[API-Conventions-Response|API response 계약]]
- [[CORS|CORS]]
- [[Runtime-Validation-Libraries|Runtime validation]]

## 출처

- [Axios, Create an Instance](https://axios.rest/pages/advanced/create-an-instance)
- [Axios, Response Schema](https://axios.rest/pages/advanced/response-schema)
- [Axios, Error Handling](https://axios.rest/pages/advanced/error-handling)
- [Axios, Request Config](https://axios.rest/pages/advanced/request-config)
- [SWR, Overview](https://vercel.com/oss/swr)
- [SWR, Data Fetching](https://swr.vercel.app/docs/data-fetching)
- [SWR, API](https://swr.vercel.app/docs/api)
- [SWR, Automatic Revalidation](https://swr.vercel.app/docs/revalidation)
- [SWR, Mutation and Revalidation](https://swr.vercel.app/docs/mutation)
- [RFC Editor, RFC 5861 HTTP Cache-Control Extensions for Stale Content](https://www.rfc-editor.org/rfc/rfc5861.html)
- [Ant Design, Table](https://ant.design/components/table/)
- [Ant Design GitHub, Table Ajax demo](https://github.com/ant-design/ant-design/blob/master/components/table/demo/ajax.tsx)
- [React, Suspense](https://react.dev/reference/react/Suspense)
- [React, use](https://react.dev/reference/react/use)
- IT Share, [Axios와 API client](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161817)
- IT Share, [Async selector로 API 연동](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161818)
- IT Share, [설문 응답 저장](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161819)
- IT Share, [응답 완료 page](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161821)
- IT Share, [SWR API 연동](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161831)
- IT Share, [설문 list component](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161832)
- IT Share, [새 설문 생성](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161840)
