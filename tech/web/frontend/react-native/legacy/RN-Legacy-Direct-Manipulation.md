---
tags: [react-native, native, legacy, refs, performance]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 레거시 직접 조작과 native ref 메서드"]
---

# React Native 레거시 직접 조작과 native ref 메서드

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 직접 조작의 목적

`setNativeProps`는 React state/props를 바꾸지 않고 native view 속성을 직접 설정한다. 연속 animation이나 gesture에서 잦은 subtree reconciliation이 확인된 병목일 때 사용할 수 있다.

먼저 state 갱신과 불필요한 render 감소로 해결할 수 있는지 확인한다. 명령형 state는 native와 React 두 곳에 생기므로 reasoning과 유지보수가 어려워질 수 있다. 새 architecture의 범위는 [[RN-Native-Component-Advanced]]를 함께 확인한다.

## props와 native 값 충돌

render 함수가 관리하는 속성을 `setNativeProps`로 바꾸면 다음 render에서 해당 속성이 다시 바뀔 때 직접 설정한 값이 덮어써진다. 같은 값을 두 갱신 경로에서 소유하지 않는다.

레거시 페이지의 `NativeMethodsMixin`, `RCTUIManager.updateView` 설명은 이전 구현의 연결이다. 현재 내부 구조를 증명하는 근거로 사용하지 않는다.

## TouchableOpacity와 custom component

레거시 예제는 TouchableOpacity가 child opacity를 직접 갱신하는 동작으로 비용 차이를 설명한다. composite custom component 자체는 native view를 갖지 않아 `setNativeProps` 메서드가 자동 제공되지 않는다.

custom wrapper는 native-backed child의 ref를 외부로 전달해야 한다. 예제는 `forwardRef`로 내부 View ref를 연결하고 `{...props}`를 전달한다. opacity 변경뿐 아니라 touch handling props도 내부로 내려가야 한다.

기존 Touchable 예제의 모든 내부 조건을 현재 implementation으로 일반화하지 않는다. 사용한 wrapper가 필요한 ref와 event props를 전달하는지 source와 실제 동작으로 확인한다.

## TextInput 값 직접 수정

native-backed TextInput ref로 `setNativeProps({text: '...'})`를 호출하거나 `clear()`로 지울 수 있다.

```ts
const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
const editText = () => {
  inputRef.current?.setNativeProps({text: 'Edited text'});
};
```

직접 수정한 값을 React의 `value`가 다시 덮어쓰지 않는지 확인한다. 원문 `bufferDelay`와 controlled 입력 누락 설명은 기존 context다. 모든 현재 TextInput 문제의 해결책으로 uncontrolled 직접 조작을 적용하지 않는다.

## measure

native render 이후 `measure(callback)`은 비동기로 다음 값을 전달한다.

| 값 | 역할 |
| --- | --- |
| `x`, `y` | View의 위치 |
| `width`, `height` | viewport의 View 크기 |
| `pageX`, `pageY` | viewport/screen 기준 위치 |

`pageX/pageY`가 필요 없고 layout 발생 즉시 크기를 알고 싶으면 `onLayout`을 검토한다. viewport 측정과 content 자체 크기를 같은 것으로 해석하지 않는다.

## measureInWindow

`measureInWindow(callback)`은 window 기준 `x`, `y`, `width`, `height`를 반환한다. RN root가 native View 안에 들어가 있어 absolute window 좌표가 필요할 때 사용할 수 있다.

## measureLayout

`measureLayout(relativeToNativeComponentRef, onSuccess, onFail)`은 ancestor native ref를 기준으로 상대 위치와 크기를 측정한다. ref 대상과 ancestor 관계를 확인하고 실패 경로를 처리한다.

과거 numeric native node handler를 넘기는 변형은 New Architecture에서 obsolete로 안내된다. 새 구현은 ref 기반 측정과 `useLayoutEffect` 시점 계약을 대조한다.

측정 결과로 state를 바꾼 뒤 같은 결과를 다시 측정하는 effect loop를 만들지 않는다. 측정할 layout 변화와 effect dependency를 구분한다.

## focus와 blur

`focus()`는 해당 input/view에 focus를 요청하고 `blur()`는 focus를 해제한다. 정확한 동작은 플랫폼과 View 종류에 따라 다르다. 모든 composite 컴포넌트에서 같은 메서드가 있는 것은 아니므로 native-backed ref 또는 명시적으로 노출한 imperative API를 사용한다.

## 검토 항목

bottleneck 측정, props 소유권, wrapper ref 전달, null ref, render 완료와 좌표계가 맞는지 확인한다. 직접 조작으로 문제를 우회하기 전에 state 구조와 render 범위가 원인인지 확인한다.

## 출처

- [React Native, Direct Manipulation](https://reactnative.dev/docs/legacy/direct-manipulation)

## 관련 문서

- [[RN-Native-Component-Advanced]]
- [[RN-Fabric-Native-Components]]
- [[React-Refs-and-DOM]]
