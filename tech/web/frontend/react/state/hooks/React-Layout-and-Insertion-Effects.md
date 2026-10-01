---
tags: [web, frontend, react, layout-effect, insertion-effect, css-in-js]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Layout and Insertion Effects", "React layout 측정과 style 삽입"]
---

# React layout 측정과 style 삽입

일반 외부 동기화는 useEffect, paint 전에 반드시 layout을 측정해야 하는 UI는 useLayoutEffect, runtime CSS를 삽입하는 library는 useInsertionEffect로 목적을 나눈다. 실행 시점을 앞당기는 것 자체를 성능 최적화로 보지 않는다.

## useLayoutEffect 계약

`useLayoutEffect(setup, dependencies?)`는 DOM commit 후 browser paint 전에 setup을 실행하고 undefined를 반환한다. setup은 선택적으로 cleanup을 반환한다. dependency가 바뀌면 이전 값의 cleanup 후 새 setup, 제거 전에는 마지막 cleanup을 실행한다.

dependencies는 setup에서 사용하는 reactive 값 전체를 고정 길이 inline 배열로 적고 `Object.is`로 비교한다. 생략하면 매 commit, 빈 배열이면 해당 mount의 시작/정리 계약이다. Hook 호출 위치와 개발 Strict Mode의 추가 setup/cleanup 검사는 Effect와 동일한 원칙을 따른다.

**setup 코드와 그 안에서 예약한 state update는 paint를 막는다.** state update를 시작하면 남은 Effect도 useEffect를 포함해 즉시 실행할 수 있다. 다른 useEffect가 언제나 paint 뒤라는 가정과 충돌하므로 layout 측정이 필요한 좁은 곳에서 사용한다.

### tooltip의 두 번 render

```jsx
import { useLayoutEffect, useRef, useState } from 'react';

const Tooltip = ({ anchor }) => {
  const ref = useRef(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    setHeight(ref.current.getBoundingClientRect().height);
  }, []);
  const top = anchor.top - height;
  return <div ref={ref} style={{
    position: 'fixed', left: anchor.left,
    top: top >= 0 ? top : anchor.bottom,
  }}>설명</div>;
};
```

처음 height 0으로 DOM을 만들고, commit 뒤 실제 높이를 측정해 다음 state를 요청한다. 다시 render하여 위 공간이 부족하면 아래에 배치한 뒤 browser가 최종 위치를 그린다. 사용자는 첫 임시 위치를 보지 않는다. portal을 사용하면 tooltip을 body 아래에 배치할 수 있고 이는 Effect 선택과 별도 책임이다.

useEffect로 측정하면 첫 위치가 먼저 paint되어 느린 환경에서 flicker가 보일 수 있다. 측정만 빨라져도 추가 render 비용은 남는다. 가능하면 CSS로 해결하고 필요할 때만 두 단계 render를 사용한다. 위 예제는 고정 content의 최초 높이를 측정하는 범위이며 dynamic content, font load와 resize까지 자동 추적하지 않는다.

### 서버 rendering의 layout 부재

Effects는 server에서 실행되지 않는다. server에는 실제 browser layout이 없어 tooltip 높이로 초기 HTML 위치를 정할 수 없다. `useLayoutEffect does nothing on the server` 문제는 다음 선택으로 다룬다.

- 초기 HTML을 먼저 보여 줘도 괜찮다면 useEffect로 전환한다.
- browser만 필요한 component는 Suspense의 서버 fallback과 client-only 경계로 분리한다. React 19.3의 `use(browser())`도 이 browser-only 경계를 표현한다. browser는 `react-dom`, use는 `react`에서 가져오며 Client Component/Suspense에서 사용한다.
- hydration 전에는 같은 FallbackContent를 보여 주고 useEffect에서 mounted를 true로 바꾼 뒤 실제 layout component를 render한다.
- layout 측정 대신 외부 store 구독 때문에 사용했다면 SSR 계약이 있는 useSyncExternalStore를 검토한다.

Client Component라는 분류만으로 server HTML 생성을 생략한다고 가정하지 않는다. hydration gate를 선택하면 느린 network에서 fallback이 오래 보일 수 있고 화면 전환 비용을 고려한다. browser-only API는 적용 프로젝트의 React 버전/exports 지원을 확인한다.

### useLayoutEffect 문제 진단과 이해 확인

flicker가 있으면 측정 시점, 측정 node, 실제 content 변경을 구분한다. 입력이 느려지면 layout Effect에서 오래 걸리는 작업과 state update 연쇄를 찾는다. root의 Effect 여러 개를 일괄 layout Effect로 바꾸지 않는다.

1. tooltip의 임시 DOM, 측정, 재render와 최초 paint 순서를 설명한다.
2. useEffect로 바꿔 느린 조건에서 위치 이동을 비교하되 correctness와 paint 지연 비용을 따로 본다.
3. SSR/hydration에서 두 환경의 최초 fallback이 일치하는지 확인한다.

## useInsertionEffect 계약

`useInsertionEffect(setup, dependencies?)`는 **layout Effect가 실행되기 전에** runtime style을 넣을 위치를 제공하고 undefined를 반환한다. setup은 선택적으로 cleanup을 반환한다. dependencies의 reactive 값, 고정 길이 inline 배열과 `Object.is` 비교는 다른 Effect와 같은 계약이다.

이 API는 CSS-in-JS library 작성자를 위한 것이다. application의 조회, DOM 측정이나 animation을 더 빨리 실행하려고 사용하는 API가 아니다. CSS-in-JS에서도 static CSS extraction과 dynamic inline style을 우선 검토한다. runtime `<style>` 삽입의 잦은 style 재계산 비용 자체는 이 Hook으로 없어지지 않는다.

### style 삽입과 제한

```jsx
import { useInsertionEffect } from 'react';

const useRuntimeRule = rule => {
  useInsertionEffect(() => {
    const node = document.createElement('style');
    node.textContent = rule;
    document.head.appendChild(node);
    return () => node.remove();
  }, [rule]);
};
```

위 예제는 library lifecycle의 최소 예이며 같은 rule을 여러 component에서 공유하는 dedup/reference counting 정책은 포함하지 않는다. rule은 신뢰할 수 있는 생성기에서 제공해야 한다. style insertion을 render 본문에서 실행하면 중단 가능한 render 과정에서 반복 style 재계산과 버려진 render의 DOM 변경을 만들 수 있다.

- state update를 실행할 수 없다.
- 실행 시점에 ref는 아직 attach되지 않았으므로 ref를 읽어 layout을 측정하지 않는다.
- DOM 변경 전/후 중 특정 시점을 보장하지 않는다. Hook overview의 간단한 설명을 DOM mutation 전이라는 절대 보장으로 확대하지 않는다.
- cleanup과 setup은 component별로 교차 실행된다. 모든 component cleanup을 먼저 하고 모든 setup을 하는 순서라고 가정하지 않는다.
- client에서만 실행하므로 SSR style 수집은 별도의 rendering/요청별 collector 경계로 처리한다.

useLayoutEffect/useEffect에 style을 넣으면 다른 component의 layout Effect가 오래된 style 기준으로 측정할 수 있다. insertion Effect는 style이 측정 전에 준비되도록 하는 순서를 제공한다. server rule collector를 module 전역에 무조건 축적하는 예제를 production 요청 격리/메모리 정책 없이 복사하지 않는다.

### useInsertionEffect 문제 진단과 이해 확인

ref가 비었으면 측정 API를 잘못 선택한 것이다. 삽입 중 setter 오류면 해당 state 전이를 application event/state 계층으로 옮긴다. SSR의 style 누락은 Hook이 server에서도 실행될 거라는 가정을 확인한다. 중복 rule, 오래 남는 style과 동시에 진행하는 요청의 collector 격리도 library 경계에서 확인한다.

**이해 확인:** style 삽입과 layout 측정을 서로 다른 Hook에 놓았을 때의 순서를 설명한다. DOM 변경 시점 보장, ref 접근, state update의 세 금지를 각각 구분한다.

## 출처

- [React, useLayoutEffect](https://react.dev/reference/react/useLayoutEffect)
- [React, useInsertionEffect](https://react.dev/reference/react/useInsertionEffect)
- [React DOM, browser](https://react.dev/reference/react-dom/browser)

## 관련 문서

- [[React-Hooks|Hook 선택]]
- [[React-Effect-Hook-Contracts|Effect의 호출 계약]]
- [[React-Refs-and-DOM|DOM ref와 layout 경계]]
- [[React-External-Store-and-Debug-Hooks|외부 store의 SSR 계약]]
