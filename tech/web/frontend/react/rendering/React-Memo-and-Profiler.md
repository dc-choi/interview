---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React memo와 render 비용 측정

## memo 계약

`memo(Component, arePropsEqual?)`는 원본을 바꾸지 않고 memoized component를 반환한다. parent re-render에서 props가 같으면 하위 render를 보통 생략하지만 성능 최적화이며 동작 보장이 아니다. 원본 component는 순수해야 한다.

기본 비교는 각 prop에 `Object.is`를 적용한다. optional comparator는 `(previousProps, nextProps)`를 받아 **화면 결과와 동작이 같을 때 true**를 반환한다. true가 update 필요라는 뜻인 shouldComponentUpdate와 방향이 반대다.

```jsx
const Row = memo(function Row({ title, selected, onSelect }) {
  return <button aria-pressed={selected} onClick={onSelect}>{title}</button>;
});
```

own state나 읽는 context가 바뀌면 memo라도 re-render한다. context 일부만 필요하면 outer component에서 context를 읽고 최소 data를 memoized child props로 전달한다.

## memo를 선택할 조건

같은 props로 자주 다시 계산되는 무거운 UI를 측정했을 때 사용한다. 가벼운 페이지 교체나 이미 빠른 component에 일괄 추가하면 readability/비교 비용만 늘 수 있다.

- state를 필요한 가까운 위치에 둔다.
- wrapper는 children으로 내용을 조합한다.
- state를 다시 갱신하는 불필요한 Effect chain과 render mutation을 먼저 제거한다.
- props는 필요한 primitive/boolean만 전달한다. 큰 object 전체보다 실제 표시 field를 선택한다.
- 필요한 object/function identity는 useMemo/useCallback이나 module declaration으로 유지하되 semantic correctness를 그 cache에 의존하지 않는다.

항상 새 object, array, 함수인 prop 하나만 있어도 기본 비교가 달라진다. 같은 내용인 `{}`도 Object.is는 false다. compiler가 활성화된 code는 component, 중간 계산과 JSX를 자동 memoize할 수 있어 수동 memo 필요가 줄어든다. 실제 compilation 적용과 병목을 확인한 뒤 제거/추가한다.

comparator에서는 function prop까지 비교해야 한다. onClick이 다른데 같다고 반환하면 이전 render의 closure를 붙잡아 stale state로 동작할 수 있다. 알려진 제한 깊이 없이 deep equality/JSON.stringify로 비교하면 비교가 render보다 느려질 수 있다. production 조건에서 비용을 비교한다.

## Profiler 계약

`<Profiler id={string} onRender={callback}>`는 subtree의 **commit된 update** render 비용을 프로그램으로 수집한다. onRender는 아래 여섯 인자를 받으며 결과를 반환해 UI를 조정하는 함수가 아니다.

| 인자 | 의미 |
|---|---|
| id | 측정 subtree 식별자 |
| phase | mount, update, nested-update |
| actualDuration | 현재 update의 subtree render에 쓴 ms |
| baseDuration | 각 component의 최근 render 시간을 합친 최적화 없는 전체 render 비용 추정 ms |
| startTime | 현재 render 시작 timestamp |
| commitTime | commit timestamp, 같은 commit의 Profiler끼리 공유 |

```jsx
const recordRender = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
  console.log({ id, phase, actualDuration, baseDuration, startTime, commitTime });
};
<Profiler id="ResultList" onRender={recordRender}><ResultList /></Profiler>
```

actual/base의 update 차이를 보며 memo 효과를 판단한다. baseDuration은 browser paint/network/사용자 전체 latency가 아니라 render의 추정치다. 영역별 여러 Profiler나 중첩 Profiler를 두고 commitTime으로 묶을 수 있지만 중첩 비용을 단순 합산하면 중복을 셀 수 있다.

측정 자체에 CPU/memory overhead가 있다. production 기본 build에서는 profiling이 비활성이고 별도 profiling build가 필요하다. interactive 분석은 React DevTools Profiler를 사용한다. React Performance tracks의 Component track 표시는 개발 build와 profiling build의 범위가 다르다.

## 이해 확인

1. 같은 primitive prop과 render마다 생성한 object prop에서 memo 동작을 비교한다.
2. comparator가 onClick을 빼먹은 경우 stale closure를 재현한다.
3. state를 가까이 옮긴 수정과 memo 추가의 actualDuration을 같은 동작으로 측정한다.
4. baseDuration을 실제 page latency로 읽으면 안 되는 이유를 설명한다.

## 출처

- [React, memo](https://react.dev/reference/react/memo)
- [React, Profiler](https://react.dev/reference/react/Profiler)

## 관련 문서

- [[React-Compiler]]
- [[React-State-Management]]
- [[React-Render-Purity-and-Trees]]
