---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Transition과 ViewTransition

## startTransition 계약

`startTransition(action)`은 인자 없는 action을 즉시 호출하고 그 실행 중 예약한 state update를 non-urgent Transition으로 표시한다. 반환값은 없다. callback을 나중에 호출하거나 계산 자체를 다른 thread로 보내는 기능은 아니다.

```jsx
startTransition(() => setTab(nextTab));
```

urgent update가 오면 React는 진행 중인 render 작업을 중단하고 나중에 다시 시작할 수 있다. 순수한 render를 요구하는 이유가 여기에 연결된다. Transition은 이미 표시한 Suspense content가 다시 suspend할 때 불필요한 fallback을 피하는 데도 쓰인다.

- standalone API에는 pending flag가 없다. pending UI가 필요하면 `useTransition`을 쓴다.
- setter를 직접 통제할 수 없고 props/Hook 반환값 일부의 표시만 늦추려면 `useDeferredValue`를 검토한다.
- controlled text input 값은 Transition으로 갱신하지 않는다. input은 즉시, 무거운 결과는 따로 갱신한다.
- setTimeout에서 실행할 setter는 timeout callback 내부에서 다시 Transition으로 감싼다.
- async action을 await할 수 있지만 **await 뒤 setter는 추가 startTransition으로 감싸야 한다**는 현재 제한이 있다.
- 여러 진행 중 Transition은 현재 함께 batch될 수 있다. 요청 순서나 race 해결까지 보장하지 않는다.
- standalone startTransition은 component와 연결되지 않으므로 throw/rejected Promise를 `reportError`로 보고한다. `useTransition`이 돌려준 함수의 Error Boundary 연동과 구분한다.

## ViewTransition 계약

`<ViewTransition>`은 DOM tree의 변화 전후 snapshot을 browser view transition으로 이동, scale, cross-fade한다. React 19.3의 stable API로, v19.3.0 source에서 export와 `enableViewTransition = true`를 확인했다. React API 지원과 browser View Transition 지원은 구분한다. 현재 DOM용이며 React Native 계약으로 확대하지 않는다.

일반 즉시 setState만으로는 활성화되지 않는다. Transition, Suspense reveal, useDeferredValue로 발생한 update가 대상이다. name을 생략하면 React가 unique name을 만들고 가장 가까운 DOM node에 animation 시점에 view-transition-name을 적용한다. DOM sibling이 여럿이면 suffix로 구분한다.

| trigger | 의미 |
|---|---|
| enter | 삽입 subtree의 첫 component 경계 |
| exit | 삭제 subtree의 첫 component 경계 |
| update | 내부 DOM mutation 또는 immediate sibling 변화로 size/position 변경 |
| share | 같은 Transition의 제거/삽입 tree에 동일한 name이 대응됨 |

enter/exit와 목록 reorder animation은 대상 subtree에서 ViewTransition보다 앞에 DOM wrapper가 있으면 개별로 활성화되지 않을 수 있다. nested boundary의 mutation은 parent 대신 nested boundary가 담당한다. snapshot animation은 자손 각각의 layout animation이 아니므로 독립적으로 움직일 요소에는 별도 boundary가 필요할 수 있다.

## class, type과 JavaScript animation

`enter`, `exit`, `update`, `share`, `default` prop은 `auto`, `none`, CSS class 문자열 또는 type별 object를 받는다. auto는 browser 기본 animation이고 default="none"이면 명시한 trigger만 활성화한다. class는 `::view-transition-new(.slide-in)` 같은 pseudo selector로 style한다.

```jsx
<ViewTransition
  default="none"
  enter={{ forward: 'slide-in', default: 'auto' }}
  exit="auto"
  onEnter={(instance, types) => {
    const animation = instance.new.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: types.includes('fast') ? 150 : 300 },
    );
    return () => animation.cancel();
  }}
>
  <Card />
</ViewTransition>
```

`onEnter`, `onExit`, `onUpdate`, `onShare`는 `(instance, types)`를 받는다. instance에는 `old`, `new`, `group`, `imagePair` pseudo-element handle과 `name`이 있고 types는 string 배열이다. 한 boundary에서 한 event만 실행되고 share가 enter/exit보다 우선한다. callback은 animation 종료/중단 때 정리할 cleanup을 반환한다.

React가 사용자 motion preference를 자동으로 끄지 않는다. CSS `@media (prefers-reduced-motion: reduce)`로 animation을 줄이거나 해제하고 JavaScript animation에서도 같은 preference를 반영한다.

## addTransitionType 계약

`addTransitionType(type)`은 React 19.3에서 지원하며 임의 문자열 cause를 현재 Transition에 추가하고 반환값은 없다. startTransition scope 안에서 호출한다. 여러 Transition이 합쳐지면 type들도 모이고 하나에 여러 type을 추가할 수 있다.

```jsx
startTransition(() => {
  addTransitionType('forward');
  setPage(nextPage);
});
```

type을 animation에 적용하는 방법은 browser의 `:active-view-transition-type(...)`, ViewTransition class object, callback의 types 검사 세 가지다. class object에서 여러 type이 일치하면 class를 합치고, 없으면 default entry를 사용한다. 어떤 일치 type이 none이면 disable이 우선한다.

type은 **각 commit 뒤 reset**된다. 처음 Suspense fallback commit에 붙었던 원인이 나중 content reveal에 자동으로 남지 않는다. 영구 navigation state나 analytics 저장소로 사용하지 않는다.

## share, Suspense와 Activity 조합

name은 서로 다른 component tree 사이의 shared element에만 수동 지정한다. app 전체에서 동시에 mount된 동일 name은 하나여야 하므로 namespace와 entity id를 넣는다. React key는 sibling identity이고 ViewTransition name은 animation pairing이므로 서로 대체하지 않는다.

같은 Transition에서 한쪽을 삭제하고 다른 쪽을 삽입할 때 share한다. 두 단계 사이에 Suspense fallback이 끼면 나중 reveal과 원래 node를 자동 pairing하지 않는다. pair 양쪽이 viewport 안에 있어야 share하고, 아니면 개별 enter/exit로 처리한다. 동일 instance의 position update는 viewport 밖 이동도 animate할 수 있다.

ViewTransition이 Suspense 밖이면 fallback→content는 update/cross-fade이고 각 fallback/content 내부에 별도로 두면 exit/enter다. 새 font는 최대 500ms 대기를 설명하며 visible image도 timeout까지 준비를 기다린다. `onLoad`가 있는 image는 그 대기에서 제외된다. Activity로 state를 보존하며 visible/hidden 전환을 animation에 연결할 수도 있다.

## 실행 순서와 router 함정

React가 startViewTransition을 조정하므로 app에서 같은 update를 다시 직접 호출하지 않는다. 기존 React animation 중 여러 update가 도착하면 다음 animation은 마지막 결과까지 합쳐질 수 있다(A→B 중 C/D 요청이면 다음은 B→D).

DOM mutation/insertion Effect, font 준비, mount/update/layout Effect/ref, pending Navigation 완료, layout 측정 뒤 animation event를 실행한다. 중간 flushSync는 animation을 skip할 수 있다. 일반 Effect는 보통 animation 뒤 실행하지만 다른 state update 때문에 더 일찍 실행될 수 있으므로 완료 보장으로 사용하지 않는다.

router가 Navigation을 React에 막아 둔 경우 useLayoutEffect에서 unblock해야 한다. useEffect로 풀면 React의 기다림과 교착할 수 있다. legacy popstate는 scroll/form restoration의 동기 처리 때문에 animation을 skip한다. browser Navigation API 기반 router와 해당 지원을 확인한다.

## 이해 확인

1. startTransition 안에서 무거운 동기 계산을 하면 그 계산이 즉시 실행되는 이유를 설명한다.
2. DOM wrapper를 경계 앞/뒤로 옮겨 enter와 reorder animation 차이를 확인한다.
3. name 중복 오류를 entity namespace로 고치고 key만으로 해결되지 않는 이유를 설명한다.
4. type이 fallback commit 뒤 content reveal까지 남는지 예측한다.
5. reduced motion과 animation cleanup을 함께 확인한다.

## 출처

- [React, startTransition](https://react.dev/reference/react/startTransition)
- [React, ViewTransition](https://react.dev/reference/react/ViewTransition)
- [React, addTransitionType](https://react.dev/reference/react/addTransitionType)
- [React, v19.3.0 React exports](https://github.com/facebook/react/blob/v19.3.0/packages/react/index.js)
- [React, v19.3.0 feature flags](https://github.com/facebook/react/blob/v19.3.0/packages/shared/ReactFeatureFlags.js)

## 관련 문서

- [[React-Suspense-and-Lazy]]
- [[React-Activity]]
- [[React-Render-Purity-and-Trees]]
