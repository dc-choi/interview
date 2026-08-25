---
tags: [web, frontend, react, api, swr, axios, server-state]
status: done
verified_at: 2026-08-04
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

## query와 mutation 분리

Query는 remote snapshot을 읽고, mutation은 server state를 바꾼다. `POST`나 `PUT`이 성공한 뒤 현재 화면의 local copy만 고치면 다른 consumer cache는 stale할 수 있다. mutation 결과로 cache를 갱신하거나 관련 key를 revalidate한다.

Promise의 `.then/.catch`와 `async/await`은 같은 비동기 결과를 합성하는 문법이다. 오류를 log만 하고 성공 화면으로 이동하지 않으며, duplicate submit과 partial failure를 다룬다.

## SWR cache model

```jsx
const { data, error, isLoading, isValidating, mutate } = useSWR(
  ["/api/surveys", page],
  fetcher,
);
```

SWR key는 resource identity다. parameter를 key에 빠뜨리면 서로 다른 query가 cache를 공유한다. `isLoading`과 background `isValidating`을 구분하고, focus/reconnect revalidation과 retry 기본값이 product 요구에 맞는지 확인한다.

`mutate`와 `useSWRMutation`은 optimistic data, rollback과 revalidation을 제공한다. Server response가 authoritative한 field를 포함하면 mutation 결과로 cache를 갱신하거나 다시 fetch한다.

Table component에 보여 줄 column 정의와 row data 가공은 render cost가 실제 병목일 때 memoize한다. `useMemo`는 semantic 보장이 아니라 performance optimization이므로 object identity에 의존하는 잘못된 동작을 숨기는 용도로 쓰지 않는다. Row key는 server entity의 stable id를 사용한다.

## Suspense 경계

일반 Effect fetch가 Promise를 throw한다고 자동으로 Suspense data source가 되지 않는다. React는 framework, Relay, Next.js처럼 Suspense-enabled data source와 `lazy`에서의 사용을 지원한다. Library의 Suspense mode는 해당 React major, SSR와 error boundary 지원을 확인한다. Archived Recoil async selector 예제를 신규 data layer 기본값으로 옮기지 않는다.

## 관련 문서

- [[React-State-Management|Client state 선택]]
- [[API-Conventions-Response|API response 계약]]
- [[CORS|CORS]]
- [[Runtime-Validation-Libraries|Runtime validation]]

## 출처

- [Axios, The Axios Instance](https://axios-http.com/docs/instance)
- [SWR, Data Fetching](https://swr.vercel.app/docs/data-fetching)
- [SWR, API](https://swr.vercel.app/docs/api)
- [SWR, Mutation and Revalidation](https://swr.vercel.app/docs/mutation)
- [React, Suspense](https://react.dev/reference/react/Suspense)
- IT Share, [Axios와 API client](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161817)
- IT Share, [Async selector로 API 연동](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161818)
- IT Share, [설문 응답 저장](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161819)
- IT Share, [SWR API 연동](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161831)
- IT Share, [설문 list component](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161832)
