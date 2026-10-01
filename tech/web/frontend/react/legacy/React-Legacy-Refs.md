---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React createRef와 forwardRef migration

## createRef 계약

`createRef()`는 인자 없이 `{ current: null }` ref object를 새로 반환한다. DOM의 ref attribute에 전달하면 React가 commit에 current를 채우고 제거 때 비운다. 임의 값도 담을 수 있지만 변경만으로 UI render를 요청하지 않는다.

```jsx
class Input extends Component {
  constructor(props) {
    super(props);
    this.inputRef = createRef();
  }
  render() {
    return (
      <>
        <input ref={this.inputRef} />
        <button onClick={() => this.inputRef.current.focus()}>입력하기</button>
      </>
    );
  }
}
```

class instance에서 한 번 생성해 보존한다. function component render마다 createRef를 호출하면 매번 object가 달라진다. function은 동일 instance reference를 보존하는 `useRef(null)`로 옮긴다. current를 state의 대체 저장소로 사용해 화면 갱신을 기대하지 않는다.

## forwardRef 계약

`forwardRef(render)`는 `(props, ref)` render 함수를 받아 ref를 받을 수 있는 component를 반환한다. ref는 parent의 object/callback이며 없으면 null이다. render는 React node를 반환하고 받은 ref를 하위 DOM/component로 전달하거나 useImperativeHandle에 연결한다.

```jsx
const Field = forwardRef(function Field({ label, ...props }, ref) {
  return <label>{label}<input {...props} ref={ref} /></label>;
});
```

위 형태는 React 18 이하 code와 호환 library를 읽는 데 필요한 계약이다. **React 19에서는 ref를 prop으로 받을 수 있어 forwardRef가 더 이상 필요하지 않다.** 공식 문서는 미래 deprecated를 예고하며 React 19에서 이미 제거됐다는 뜻은 아니다.

```jsx
// React 19 이상
function Field({ label, ref, ...props }) {
  return <label>{label}<input {...props} ref={ref} /></label>;
}
```

wrapper가 여러 단계면 모두 ref를 전달해야 한다. forwardRef로 감쌌다는 사실만으로 DOM node가 노출되지 않는다. ref를 실제 input에 빼먹거나 조건부 branch에 input이 없으면 current는 null이다. StrictMode 개발 검사에서 render를 추가 호출할 수 있으므로 render의 side effect를 제거한다.

## DOM 공개와 imperative handle의 선택

focus, scroll, text selection, animation과 media play/pause는 ref의 적절한 사용 사례다. low-level input/button의 DOM을 공개할 수 있지만 app-level comment/avatar가 DOM 구조를 외부 계약으로 노출하면 내부 변경이 어려워진다.

전체 DOM 대신 `useImperativeHandle`로 `{ focus, scrollIntoView }` 같은 제한된 method를 공개할 수 있다. 실제 내부 node는 별도 useRef로 보존하고 parent ref에 공개 handle을 연결한다. 상세 dependency/ref contract는 해당 Hook 문서에 둔다.

modal의 open/close처럼 props로 표현할 상태는 `<Modal isOpen={...}>`가 owner를 명확히 한다. ref method를 통해 UI state를 별도 통제하면 React data flow와 imperative 상태가 어긋날 수 있다.

## 이해 확인

1. function render마다 createRef를 만드는 코드와 useRef의 object identity를 비교한다.
2. 중간 wrapper 두 개 중 하나가 ref를 누락했을 때 parent current가 null인 원인을 찾는다.
3. React 19 prop 방식으로 옮길 때 library의 React 18 support 요구가 남아 있는지 먼저 확인한다.
4. DOM 공개, 제한 handle 공개, isOpen prop 중 제품 동작에 맞는 계약을 선택한다.

## 출처

- [React, createRef](https://react.dev/reference/react/createRef)
- [React, forwardRef](https://react.dev/reference/react/forwardRef)

## 관련 문서

- [[React-Refs-and-DOM]]
- [[React-Class-Component-Contracts]]
- [[React-Activity]]
