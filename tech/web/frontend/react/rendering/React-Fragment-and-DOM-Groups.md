---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Fragment와 DOM 그룹

## Fragment 계약

`<Fragment>`는 여러 React node를 하나의 JSX 그룹으로 표현하고 DOM wrapper를 추가하지 않는다. text와 element를 섞거나 그룹을 변수, props로 전달할 수 있다. 기본 그룹화는 `<>...</>`로 쓰고, `key`나 `ref`가 필요하면 `import { Fragment } from 'react'`와 명시적인 tag를 쓴다.

```jsx
sections.map(section => (
  <Fragment key={section.id}>
    <h2>{section.title}</h2>
    <p>{section.description}</p>
  </Fragment>
))
```

`key`는 sibling identity이고 DOM attribute가 아니다. CSS layout, semantic grouping이나 ARIA 역할이 필요한 경우에는 실제 DOM element를 선택한다. Fragment에 wrapper element의 class, style, role을 기대하지 않는다.

`<><Child /></>`, `[<Child />]`, `<Child />` 사이에서 한 단계 그룹을 바꾸는 것은 state를 보존할 수 있다. 두 단계 중첩 Fragment를 제거하는 경우까지 같은 결과를 보장하지 않는다. state identity는 전체 tree 위치와 type, key를 함께 판단한다.

## FragmentInstance 계약과 적용 범위

Fragment ref와 아래 확장 method는 React 19.3에서 지원한다. 공식 v19.3.0 source에서 `enableFragmentRefs`, `enableFragmentRefsScrollIntoView`, `enableFragmentRefsInstanceHandles`, `enableFragmentRefsTextNodes`가 모두 true다. 문서 예제의 이전 Canary pin을 현재 API의 채널 표시로 해석하지 않는다. 이전 React 버전을 지원하는 library는 일반 Fragment 그룹화와 ref 확장의 최소 버전을 구분한다.

`<Fragment ref={ref}>`의 ref에는 `FragmentInstance`가 전달된다. 첫 단계 **host DOM child**를 묶는다. React component를 통과해서 DOM을 찾지만 그 DOM element 안으로 다시 들어가지는 않는다.

```jsx
<Fragment ref={ref}>
  <div id="a" />
  <Wrapper><div id="b"><button id="c" /></div></Wrapper>
  <div id="d" />
</Fragment>
```

이 그룹의 첫 단계 DOM은 a, b, d다. event, observer, rect API는 그 셋을 대상으로 하고 focus 계열은 c처럼 깊은 자손까지 탐색한다.

| method | 입력 | 반환과 동작 |
|---|---|---|
| `addEventListener(type, listener, options?)` | DOM event 이름, handler, capture/options | `undefined`, 첫 단계 DOM에 listener 추가 |
| `removeEventListener(type, listener, options?)` | 등록한 handler와 대응 options | `undefined`, listener 해제 |
| `dispatchEvent(event)` | Event, 선택적 `bubbles` | 취소되지 않으면 true, preventDefault면 false, parent로 bubble 가능 |
| `focus(options?)`, `focusLast(options?)` | FocusOptions | `undefined`, 깊이 우선으로 첫/마지막 focusable 자손 선택 |
| `blur()` | 없음 | `undefined`, 그룹 안의 active element만 blur |
| `observeUsing(observer)` | IntersectionObserver 또는 ResizeObserver | `undefined`, 첫 단계 DOM 관찰 |
| `unobserveUsing(observer)` | 등록한 동일 observer | `undefined`, 관찰 해제 |
| `getClientRects()` | 없음 | 첫 단계 DOM의 `DOMRect[]` |
| `getRootNode(options?)` | `{ composed }` | parent의 Document/ShadowRoot, parent가 없으면 FragmentInstance |
| `compareDocumentPosition(otherNode)` | 비교할 DOM node | DOM position bitmask |
| `scrollIntoView(alignToTop?)` | boolean, 기본 true | `undefined`, 첫 child 위쪽 또는 false일 때 마지막 child 아래쪽으로 scroll |

`scrollIntoView`에 Element API의 options object를 넘기면 오류가 난다. 빈 그룹은 가까운 sibling이나 parent로 scroll한다. 빈 Fragment나 portal child의 position 비교에는 `DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC`가 포함될 수 있다.

## wrapper 없이 listener와 observer 연결

```jsx
function ClickGroup({ children, onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    const group = ref.current;
    group.addEventListener('click', onClick);
    return () => group.removeEventListener('click', onClick);
  }, [onClick]);
  return <Fragment ref={ref}>{children}</Fragment>;
}
```

동적으로 child가 추가되거나 빠지면 FragmentInstance가 listener 대상도 맞춘다. hidden Activity의 child에는 listener를 적용하지 않고 visible로 바뀔 때 적용한다. 등록과 해제는 같은 instance/handler에 맞추며 Strict Mode cleanup도 확인한다.

observer는 text node를 관찰하지 않는다. text만 있는 그룹은 개발 경고가 나올 수 있다. observer callback에서 visible element Set을 갱신해 하나라도 보이는지 계산할 수 있다. 여러 그룹이 같은 설정의 observer를 공유한다면 각 첫 단계 DOM의 `reactFragments: Set<FragmentInstance>`로 소유 그룹과 callback을 찾는다. 공유 cache의 key에는 root, rootMargin, threshold 등 실제 설정 차이를 반영하고 등록 해제를 책임진다.

## 이해 확인

1. 위 a/b/c/d 예제에서 focus와 getClientRects 대상이 다른 이유를 설명한다.
2. Fragment를 div로 바꾼 뒤 flex/grid layout과 DOM structure가 바뀌는지 확인한다.
3. listener를 연결한 그룹의 child를 추가, 제거하고 hide/show하며 listener가 누적되지 않는지 확인한다.
4. boolean scroll과 options object scroll의 계약을 구분한다.

## 출처

- [React, Fragment](https://react.dev/reference/react/Fragment)
- [React, v19.3.0 feature flags](https://github.com/facebook/react/blob/v19.3.0/packages/shared/ReactFeatureFlags.js)

## 관련 문서

- [[React-Conditional-and-List-Rendering]]
- [[React-Activity]]
- [[React-Refs-and-DOM]]
