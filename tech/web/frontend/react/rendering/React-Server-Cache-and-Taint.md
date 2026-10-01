---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React server cache와 taint 경계

## cache 계약

`cache(fn)`은 같은 signature의 memoized function을 반환하며 선언 시 fn을 실행하지 않는다. fn은 임의 인자와 반환값, Promise를 사용할 수 있다. module에서 한 번 만든 **동일 memoized function**을 Server Component들이 공유한다. 현재 React Server Components 전용이다.

같은 인자는 각각 Object.is로 비교한다. 값이 같은 새 object/array도 다른 reference면 cache miss다. primitive id를 받거나 같은 object reference를 전달한다. cache(fn)을 각 component에서 새로 만들면 cache를 공유하지 않는다. component 밖에서 memoized function을 호출하면 fn은 실행되지만 React render cache를 읽거나 갱신하지 않는다.

```jsx
import { cache, cacheSignal } from 'react';
export const getReport = cache(async (id) => {
  const response = await fetch(`/reports/${id}`, { signal: cacheSignal() });
  if (!response.ok) throw new Error('보고서 조회 실패');
  return response.json();
});

async function Report({ id }) {
  const report = await getReport(id);
  return <h2>{report.title}</h2>;
}
```

예제는 RSC 환경에서 data fetch 함수를 제공한다는 전제다. 실제 server URL, auth, validation은 data layer 계약에 맞춘다. error도 같은 인자에 cache되어 다시 호출하면 같은 오류를 던질 수 있다. React는 server request마다 cache를 무효화하므로 영구 application cache나 client revalidation 정책을 대신하지 않는다.

await 전에 같은 함수를 호출하면 work를 미리 시작하고 후속 consumer가 동일 Promise를 공유한다. render scope 밖의 module 실행에서 preload하면 request cache 공유가 되지 않는다.

| API | cache 대상과 수명 |
|---|---|
| cache | RSC request 내 component 간 fetch/computation 공유 |
| useMemo | client component instance의 최근 dependency 계산 |
| memo | client component의 props 기준 render 생략 |
| SWR/framework cache | resource key, 최신성, 재검증 정책은 해당 data layer가 관리 |

## cacheSignal 계약

`cacheSignal()`은 인자가 없고 render 중 cache lifetime에 대응하는 AbortSignal, render 밖에서는 null을 반환한다. React의 render 성공 완료, abort, 실패 때 signal이 abort되어 필요 없는 in-flight work를 취소할 수 있다. 현재 RSC 전용이며 Client Component에서는 null이다. 미래 client 지원 가능성이 명시되어 있으므로 null을 영구 계약으로 고정하지 않는다.

module 최상위에서 먼저 시작한 요청은 render 밖에서 null signal을 받아 render 종료 때 취소되지 않는다. render scope 안의 cached function에서 signal을 얻고 downstream fetch/DB client에 전파한다. catch에서 `signal?.aborted`를 확인해 cancellation log를 줄일 수 있으나 업무 실패를 모두 null로 숨기는 정책으로 확대하지 않는다.

## experimental_taintObjectReference 계약

`experimental_taintObjectReference(message, object)`는 object instance를 그대로 Client Component에 전달하려는 오류를 탐지하고 undefined를 반환한다. message는 위반 시 React error에 포함된다. function/class instance도 입력 가능하며 기존 직렬화 오류의 메시지를 바꿀 수 있다. TypedArray를 등록해도 다른 copy까지 등록하지 않는다.

```jsx
experimental_taintObjectReference('전체 user object를 client에 보내지 마세요.', user);
return <Profile label={user.publicLabel} />;
```

`{ ...user }`, `{ secret: user.secret }`는 새로운 untainted object다. object instance를 차단하는 보호이지 민감 field의 전파를 추적하는 완전한 보안 모델이 아니다. data API가 승인된 공개 field만 선택해 보내도록 설계한다.

## experimental_taintUniqueValue 계약

`experimental_taintUniqueValue(message, lifetime, value)`는 고유 secret 값을 Client Component로 전달하지 못하게 등록하고 undefined를 반환한다. lifetime은 보호 수명을 정하는 object이며 그 object가 살아 있는 동안 해당 값을 막는다. value는 높은 entropy의 string, bigint, TypedArray다.

```jsx
experimental_taintUniqueValue('session token을 client에 보내지 마세요.', user, user.sessionToken);
```

app lifetime이면 globalThis/process 같은 장기 object를 쓸 수 있고, user별 secret이면 그 값을 가진 user object를 lifetime으로 쓴다. lifetime owner를 잃은 채 값만 다른 전역 저장소에 남기면 보호가 끝날 수 있다.

- 대문자 변환, 연결, base64, substring 등 **파생값은 자동 taint되지 않는다**.
- PIN/전화번호 같은 low entropy 값은 공격자가 후보 값을 나열해 taint 여부로 추측할 수 있어 이 API로 보호하지 않는다.
- secret helper를 server-only module로 격리하고 authorization, 최소 data 반환을 함께 적용한다.

두 taint API는 **Experimental, 안정 버전 미제공, RSC 전용, production 사용 비권장** 계약이다. 관련 React/react-dom/eslint plugin experimental channel이 필요하다. 일반 React 19 보안 기능으로 도입을 약속하지 않는다. 보안의 기본은 server 접근 통제와 public DTO 설계이고 taint는 실수 탐지의 추가 계층이다.

## 이해 확인

1. cache 함수를 한 module에서 공유한 경우와 매 render에서 만든 경우의 호출 횟수를 비교한다.
2. 같은 primitive id와 같은 값인 두 object를 인자로 넘길 때 cache hit를 예측한다.
3. request cache와 client resource cache가 같은 것으로 쓰일 수 없는 이유를 설명한다.
4. tainted object의 spread copy, tainted token의 base64 변환이 왜 보호되지 않는지 설명한다.
5. render 밖 요청과 cacheSignal을 render 안에서 전달한 요청의 cancellation 차이를 설명한다.

## 출처

- [React, cache](https://react.dev/reference/react/cache)
- [React, cacheSignal](https://react.dev/reference/react/cacheSignal)
- [React, experimental_taintObjectReference](https://react.dev/reference/react/experimental_taintObjectReference)
- [React, experimental_taintUniqueValue](https://react.dev/reference/react/experimental_taintUniqueValue)

## 관련 문서

- [[React-Resources-and-Use]]
- [[React-Server-State-and-API]]
- [[React-Server-Components]]
- [[React-Server-Boundaries]]
