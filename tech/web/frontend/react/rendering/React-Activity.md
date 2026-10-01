---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Activity와 UI 수명

## Activity 계약

`<Activity mode="visible" | "hidden">`는 child UI와 state를 보존하며 표시를 바꾼다. `children`은 보여 줄 UI, mode 기본값은 visible이다. hidden일 때 DOM에 `display: none`을 적용하고 Effect를 cleanup한다. 다시 visible이 되면 기존 state와 DOM을 드러내며 Effect를 setup한다.

| 선택 | state/DOM | 외부 동기화 | 사용할 조건 |
|---|---|---|---|
| 조건부 unmount | 버림 | cleanup | 다시 열 때 초기화가 필요함 |
| CSS만 숨김 | 보존 | Effect가 계속 활성화 | 보이지 않아도 계속 동작해야 함 |
| Activity hidden | 보존 | Effect cleanup, 다시 보이면 setup | 자주 돌아올 UI의 상태 보존과 동기화 중단 |

```jsx
<Activity mode={tab === 'draft' ? 'visible' : 'hidden'}>
  <DraftEditor />
</Activity>
```

controlled React state뿐 아니라 uncontrolled textarea의 입력, media timecode 같은 DOM state도 보존할 수 있다. hidden child는 새 props에 반응해 더 낮은 우선순위로 re-render할 수 있다. 따라서 숨김을 계산이나 memory 사용이 0인 상태로 해석하지 않는다.

## 미리 준비와 selective hydration

처음부터 hidden인 tree도 낮은 우선순위로 pre-render되지만 Effect는 mount하지 않는다. `lazy` code나 `use(promise)`로 읽는 Suspense resource를 미리 준비할 수 있다. Effect fetch는 이 단계에서 실행되지 않으므로 화면 표시 전에 data를 준비하려면 data source 계약을 맞춘다.

SSR에서는 Activity도 독립 hydration 단위를 만들 수 있어 무거운 내용보다 navigation button을 먼저 interactive하게 만들 수 있다. 항상 visible인 boundary도 이 목적에 사용할 수 있다. 모든 탭을 pre-render하면 필요 없는 code/data 요청과 memory가 늘어날 수 있으므로 사용자가 곧 다시 볼 영역에 적용하고 비용을 확인한다.

hidden child가 text만 반환하면 visibility를 적용할 DOM element가 없어 숨겨진 text도 DOM에 남기지 않는다. wrapper 없는 text 보존을 일반 element 보존과 같은 것으로 기대하지 않는다.

## DOM 자체의 부작용 cleanup

hidden은 unmount와 달리 DOM을 파괴하지 않는다. video/audio는 계속 재생하거나 iframe이 동작할 수 있다. UI가 숨겨질 때 멈춰야 한다면 cleanup으로 명시한다.

```jsx
function VideoTab({ src }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const video = ref.current;
    return () => video.pause();
  }, []);
  return <video ref={ref} src={src} controls playsInline />;
}
```

visual hiding과 함께 일어나야 하므로 여기서는 layout Effect cleanup을 쓴다. 일반 Effect는 re-suspension이나 ViewTransition으로 시점이 늦어질 수 있다. cleanup에서 pause하면 timecode를 유지한 채 숨길 수 있다.

hidden에서 Effect가 실행되지 않는 것은 의도된 동작이다. 숨긴 뒤 cleanup하려고 Effect setup에 의존하지 않는다. visible→hidden→visible과 Strict Mode의 setup→cleanup→setup을 모두 견디게 만든다.

Transition으로 visible/hidden을 바꾸고 ViewTransition을 함께 사용하면 enter/exit animation을 만들 수 있다. animation이 state 보존을 담당하는 것이 아니라 Activity가 UI 수명을 담당한다.

## 이해 확인

1. 입력한 textarea를 unmount, CSS 숨김, Activity 숨김으로 각각 전환하고 보존과 subscription 차이를 비교한다.
2. hidden Activity의 Effect fetch와 `use` data 읽기가 pre-render 때 다른 이유를 설명한다.
3. video를 숨겼을 때 소리가 계속 나는 문제를 cleanup으로 고치고 재표시 시 timecode를 확인한다.

## 출처

- [React, Activity](https://react.dev/reference/react/Activity)

## 관련 문서

- [[React-Suspense-and-Lazy]]
- [[React-Transitions-and-Animation]]
- [[React-Effects]]
