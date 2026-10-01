---
tags: [web, frontend, react, dom, event]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React DOM event object와 handler"]
---

# React DOM event object와 handler

## React event object

handler는 `onClick={handleClick}`처럼 함수로 전달하며 argument는 React event object다. DOM event interface를 따르면서 browser 차이를 보정한다. `e.nativeEvent`가 원래 event이지만 React event와 native event type의 구체 mapping은 공개 API가 아니다. 예를 들어 React `onMouseLeave`의 native event는 `mouseout`일 수 있다.

| property 또는 method | 계약 |
|---|---|
| `target` | event가 발생한 node, handler의 먼 자식일 수 있음 |
| `currentTarget` | 현재 React handler가 연결된 node |
| `bubbles`, `cancelable`, `eventPhase` | 전파 여부, 취소 가능 여부, 현재 phase |
| `defaultPrevented`, `isTrusted`, `timeStamp` | default 취소 여부, 사용자 기원 여부, 발생 시간 |
| `nativeEvent` | 실제 browser event |
| `preventDefault()` | default browser action 취소 |
| `stopPropagation()` | React tree를 따른 전파 중단 |
| `isDefaultPrevented()`, `isPropagationStopped()` | 취소/중단 상태 조회 |

React는 내부적으로 root에 handler를 붙이지만 `currentTarget`, `target`, `eventPhase`, `type`은 React 코드가 기대하는 의미로 제공한다. `nativeEvent.currentTarget`과 같다고 가정하지 않는다. React DOM에서 `persist()`/`isPersistent()`는 사용하지 않으며 React Native의 event pooling 설명을 그대로 적용하지 않는다.

## capture, bubble과 예외

대부분의 handler에는 `Capture` suffix를 붙여 capture phase에서 받을 수 있다. `onClickCapture`가 먼저 내려오고 target handler, 조상 `onClick` 순으로 올라간다. portal event도 실제 DOM 조상보다 React tree를 따른다.

- `onScroll`은 bubble하지 않는다. scroll을 처리할 node에 직접 연결한다.
- `onFocus`, `onBlur`, resource의 `onLoad`/`onError`, media의 여러 event는 browser에서는 bubble하지 않아도 React에서는 bubble할 수 있다.
- `onMouseEnter`/`onMouseLeave`, `onPointerEnter`/`onPointerLeave`에는 capture phase가 없다. 떠나는 element에서 들어가는 element로 전파된다.
- `onBeforeInput`은 native beforeinput을 그대로 사용하는 계약이 아니라 다른 event로 polyfill하는 동작이다.
- `onSelect`는 editable/contentEditable의 선택 변경을 받고, 빈 선택과 선택에 영향을 주는 편집에도 확장되어 발생한다.
- `onKeyPress`는 deprecated다. `onKeyDown` 또는 `onBeforeInput`을 쓴다.

## handler 계열과 추가 데이터

| 계열 | handler 이름 | React event의 추가 property |
|---|---|---|
| animation | `onAnimationStart`, `onAnimationIteration`, `onAnimationEnd` | `animationName`, `elapsedTime`, `pseudoElement` |
| clipboard | `onCopy`, `onCut`, `onPaste` | `clipboardData` |
| composition/IME | `onCompositionStart`, `onCompositionUpdate`, `onCompositionEnd` | `data` |
| input | `onBeforeInput` | `data` |
| keyboard | `onKeyDown`, `onKeyUp` | `key`, `code`, `location`, `repeat`, modifier 상태 |
| mouse | `onClick`, `onAuxClick`, `onDoubleClick`, `onMouseDown`, `onMouseUp`, `onMouseMove`, `onMouseOver`, `onMouseOut`, `onMouseEnter`, `onMouseLeave`, `onContextMenu` | button, 좌표, modifier 상태 |
| drag | `onDrag`, `onDragStart`, `onDragEnd`, `onDragEnter`, `onDragLeave`, `onDragOver`, `onDrop` | `dataTransfer`, mouse/UI property |
| focus | `onFocus`, `onBlur` | `relatedTarget`, UI property |
| pointer | `onPointerDown`, `onPointerUp`, `onPointerMove`, `onPointerCancel`, `onPointerEnter`, `onPointerLeave`, `onPointerOver`, `onPointerOut`, `onGotPointerCapture`, `onLostPointerCapture` | pointer id/type, 압력, 방향/크기, mouse/UI property |
| touch | `onTouchStart`, `onTouchMove`, `onTouchEnd`, `onTouchCancel` | `touches`, `targetTouches`, `changedTouches`, modifier 상태 |
| transition | `onTransitionEnd` | `propertyName`, `elapsedTime`, `pseudoElement` |
| UI/wheel | `onScroll`, `onWheel` | UI의 `detail`, `view`; wheel의 `deltaX/Y/Z`, `deltaMode` |
| generic | `onSubmit`, `onReset`, `onInvalid`, `onLoad` 등 | 공통 event property |

표에는 실제 prop 이름을 적었다. mouse event의 `button`은 바뀐 button, `buttons`는 눌린 button 조합이고 `clientX/Y`, `pageX/Y`, `screenX/Y`, `movementX/Y`, `relatedTarget`, `getModifierState()` 등을 쓸 수 있다. keyboard의 legacy `charCode`, `keyCode`, `which`보다 의미가 분명한 `key`/`code`를 우선한다. pointer는 `pointerId`, `pointerType`, `isPrimary`, `pressure`, `tangentialPressure`, `tiltX/Y`, `twist`, `width/height` 등으로 장치 입력을 구분한다.

## element별 event

모든 tag가 모든 event를 발생시키지는 않는다. `form`의 `onSubmit`/`onReset`, `dialog`의 `onCancel`/`onClose`, `details`의 `onToggle`은 해당 element 계약이다. dialog/details event는 React에서 bubble하며 Capture 형태도 제공한다.

`img`, `iframe`, `object`, `embed`, `link`, SVG `image`는 resource load/error를 처리한다. `audio`/`video`는 다음 흐름을 제공하며 필요한 handler와 `Capture` 형태를 사용할 수 있다.

- 로딩: `onLoadStart`, `onProgress`, `onSuspend`, `onStalled`, `onAbort`, `onEmptied`, `onError`.
- 준비: `onLoadedMetadata`, `onLoadedData`, `onDurationChange`, `onCanPlay`, `onCanPlayThrough`.
- 재생: `onPlay`, `onPlaying`, `onPause`, `onEnded`, `onWaiting`, `onTimeUpdate`.
- 조작: `onSeeking`, `onSeeked`, `onRateChange`, `onVolumeChange`, `onResize`, 암호화의 `onEncrypted`.

form control의 `onChange`는 text 입력마다 동작한다. native DOM `change`의 값 확정 시점과 혼동하지 않는다. input validation의 `onInvalid`는 React에서 bubble한다.

## subtree focus와 drag 예시

```jsx
const FocusGroup = () => (
  <section onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      console.log('입력 그룹을 떠남');
    }
  }}>
    <label>제목<input name="title" /></label>
    <label>내용<textarea name="body" /></label>
  </section>
);
```

`currentTarget === target`은 parent 자신이 focus됐는지, `contains(relatedTarget)`은 focus가 자식 사이를 이동한 것인지 구분한다. keyboard 접근을 추가하려고 양의 tabIndex를 무작정 지정하지 않는다.

```jsx
const DropZone = () => (
  <div
    onDragOver={event => event.preventDefault()}
    onDrop={event => {
      event.preventDefault();
      console.log(event.dataTransfer.getData('text/plain'));
    }}
  >여기에 놓기</div>
);
```

`onDragOver`에서 default를 취소해야 drop target이 된다. drag의 실제 사용자 경험에서는 keyboard 대체 조작도 설계한다.

## 이해 확인

1. 부모 `onBlur`가 자식 input 간 focus 이동에도 호출된다. 그룹 이탈만 어떻게 찾는가? `currentTarget.contains(relatedTarget)`으로 판별한다.
2. `stopPropagation()`과 `preventDefault()`는 같은가? 전파 중단과 browser action 취소는 별개다.
3. portal의 버튼을 눌렀는데 원래 parent가 반응하는 이유는? React tree를 따른 전파다.

## 출처

- [React DOM, Common Components](https://react.dev/reference/react-dom/components/common)

## 관련 문서

- [[React-State-Effects-and-Events]]
- [[React-DOM-Components]]
- [[React-DOM-Portals-and-Browser]]
