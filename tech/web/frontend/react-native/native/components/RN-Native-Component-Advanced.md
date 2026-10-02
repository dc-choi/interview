---
tags: [react-native, native, fabric, layout]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 컴포넌트 직접 조작, 측정과 명령"]
---

# React Native 컴포넌트 직접 조작, 측정과 명령

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 적용 범위

Fabric 구현과 Codegen을 준비한 뒤 View를 직접 조작하거나 측정하고 네이티브 명령을 호출한다. 0.87 고급 인덱스의 native command 링크는 Next를 향하지만 아래는 0.87의 동일 주제를 대조했다.

## 직접 조작과 state의 소유권

`setNativeProps`는 React state/props 갱신 대신 native view에 속성을 직접 설정한다. 잦은 subtree render가 측정된 병목일 때 고려한다. 먼저 일반 state 갱신과 불필요한 render 감소로 해결할 수 있는지 확인한다.

native에 저장한 값을 React render도 소유하면 다음 render에서 해당 속성이 변경될 때 직접 설정한 값이 덮어써진다. 같은 속성의 소유권을 두 경로로 나누지 않는다. `TextInput`을 지울 때는 `clear()`를 사용할 수 있다. ref가 가리키는 native-backed 컴포넌트에서 호출한다.

## 레이아웃 측정

측정은 `useLayoutEffect`에서 실행하면 최근 layout 값을 읽고 같은 frame의 조정 흐름에 연결하기 쉽다. custom composite 컴포넌트에는 native 측정 메서드가 자동으로 생기지 않는다. 내부 native view ref에 연결한다.

| 메서드 | 결과 |
| --- | --- |
| `measure(callback)` | 비동기 callback에 `x`, `y`, `width`, `height`, `pageX`, `pageY` |
| `measureInWindow(callback)` | 현재 window 기준 `x`, `y`, `width`, `height` |

RN root가 다른 native view에 포함되어 있으면 window 좌표가 필요한 작업에서 `measureInWindow`를 사용한다. viewport 좌표와 부모 상대 좌표를 같은 값으로 취급하지 않는다. native render가 완료되기 전에는 유효한 측정을 기대하지 않는다.

## Native Commands

props는 상태를, event는 native에서 발생한 변화를 전달한다. reload처럼 특정 View instance에 동작을 요청할 때 typed Native Command를 사용한다.

1. component Spec에 `NativeCommands` 인터페이스를 선언한다.
2. 메서드의 첫 인자로 native component ref를 받는다.
3. `codegenNativeCommands<NativeCommands>`의 `supportedCommands`에 공개 명령을 나열한다.
4. JS에서 ref가 존재할 때 `Commands.reload(ref.current)`를 호출한다.
5. Codegen을 다시 실행한 뒤 플랫폼 명령을 구현한다.

### 플랫폼 구현

Android ViewManager는 생성 interface에 추가된 `reload(view)`를 구현하여 해당 View의 `reload()`를 호출한다. 명령이 생성 interface에 추가되면 native 구현도 갱신해야 한다.

iOS ComponentView는 `handleCommand:args:`에서 생성된 `RCT<컴포넌트명>HandleCommand`로 전달한다. 생성 helper는 지원 명령과 인자를 검사한 뒤 구현 메서드를 호출한다. `reload`는 예제의 `WKWebView.reloadFromOrigin`을 호출한다.

동일 종류의 여러 View가 있어도 전달한 ref의 instance를 대상으로 한다. 선언, supportedCommands 목록과 native 메서드명을 맞추고 native 재빌드 후 확인한다.

## 출처

- [React Native, Advanced Topics on Native Components Development](https://reactnative.dev/docs/the-new-architecture/advanced-topics-components)
- [React Native, Direct Manipulation](https://reactnative.dev/docs/the-new-architecture/direct-manipulation-new-architecture)
- [React Native, Measuring the Layout](https://reactnative.dev/docs/the-new-architecture/layout-measurements)
- [React Native, Invoking native functions on your native component](https://reactnative.dev/docs/the-new-architecture/fabric-component-native-commands)

## 관련 문서

- [[RN-Fabric-Native-Components]]
- [[RN-Codegen]]
- [[RN-Legacy-Direct-Manipulation]]
- [[React-Refs-and-DOM]]
