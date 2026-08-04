---
tags: [web, frontend, react, state, localstorage, persistence]
status: done
verified_at: 2026-08-04
category: "웹&네트워크(Web&Network)"
aliases: ["React Local State", "React localStorage 영속화"]
---

# React 지역 state와 localStorage 영속화

작은 편집 application도 item collection, 현재 선택과 draft를 분리하면 state 오류를 줄일 수 있다. 화면에서 계산 가능한 값은 중복 저장하지 않고 stable id로 관계를 표현한다.

```typescript
type Memo = { id: string; title: string; body: string; updatedAt: string };

type MemoState = {
  memos: Memo[];
  selectedId: string | null;
};
```

선택 위치를 array index로 저장하면 앞 item 삭제와 정렬 뒤 다른 item을 가리킬 수 있다. `selectedId`를 저장하고 현재 item은 render 중 `find`로 계산한다. 빈 목록에서는 `null` 상태를 명시한다.

## immutable update

React state의 object와 array는 읽기 전용 snapshot으로 다룬다.

```jsx
setMemos(current => current.map(memo =>
  memo.id === edited.id ? { ...memo, body: nextBody } : memo
));
```

원본 array나 item을 mutation한 뒤 같은 reference를 setter에 넘기면 update가 누락되거나 이전 snapshot까지 바뀔 수 있다. 추가, 수정, 삭제를 reducer action으로 모으면 선택 fallback과 같은 invariant를 한곳에서 검사할 수 있다.

Event propagation도 state 설계와 분리한다. 행 click은 선택, 내부 삭제 button은 삭제라면 button에서 propagation을 막을 수 있지만 keyboard와 accessible name도 함께 제공한다.

## localStorage 경계

`localStorage`는 origin별 string key/value 저장소이며 browser session을 넘어 남을 수 있다. JSON 직렬화가 Date, class, `undefined`와 cyclic object를 보존하지 않는다는 점을 고려한다.

```jsx
const [memos, setMemos] = useState(() => {
  try {
    const raw = localStorage.getItem("memos:v2");
    return raw === null ? [] : parseAndValidate(raw);
  } catch {
    return [];
  }
});
```

- 읽기와 쓰기는 synchronous이므로 큰 payload와 잦은 저장은 main thread를 막을 수 있다.
- quota, privacy mode, disabled storage와 잘못된 JSON 때문에 API가 실패할 수 있다.
- client JavaScript가 읽을 수 있으므로 access token과 민감 정보 저장소로 사용하지 않는다.
- schema version과 runtime validation을 두고 오래된 값의 migration 또는 폐기 정책을 정한다.
- SSR 환경에서는 `window`와 `localStorage`가 없으므로 client boundary에서 접근한다.

저장을 debounce한다면 timer를 cleanup하고 마지막 변경이 unmount나 page 종료 전에 사라질 수 있는 정책을 결정한다. `useCallback` 자체는 debounce가 아니다. 여러 tab 동기화가 필요하면 `storage` event를 처리하되 같은 document의 write에는 해당 event가 발생하지 않는다는 점을 고려한다.

IndexedDB, server 저장과 conflict resolution이 필요한 규모라면 localStorage를 임시 database처럼 확장하지 않는다.

## 관련 문서

- [[React-State-Effects-and-Events|State와 Effect]]
- [[React-Application-Design|React application 설계]]
- [[OAuth2|Browser token 저장 경계]]

## 출처

- [React, Updating Arrays in State](https://react.dev/learn/updating-arrays-in-state)
- [React, Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer)
- [WHATWG HTML, Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html)
- IT Share, [Memo project 설계](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161787)
- IT Share, [기본 component 구현](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161788)
- IT Share, [Memo 수정과 선택](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161789)
- IT Share, [Memo 추가](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161790)
- IT Share, [Memo 삭제](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161791)
- IT Share, [localStorage 영속화](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161792)
