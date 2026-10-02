---
tags: [expo, react-native, core]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose useNativeState와 ObservableState"]
---

# Compose useNativeState와 ObservableState

`useNativeState(initialValue)`는 Compose `MutableState`에 연결되는 `ObservableState<T>`를 생성한다. 최초 렌더에서 초기값을 잡으며 이후 인자 변경으로 재초기화하지 않는다. 생성된 SharedObject는 컴포넌트가 unmount될 때 정리된다.

## UI 스레드와 JS 스레드

UI 스레드 worklet에서 `value`를 쓰거나 `set`을 호출하면 동기적으로 변경되고 즉시 다시 읽을 수 있다. JS 스레드에서 쓰면 UI 스레드에 작업이 예약되므로 직후 읽은 값이 아직 변경 전 값일 수 있다. 즉시 읽어야 하는 입력 포매팅은 UI 스레드에서 처리한다.

| 멤버 | 계약 |
| --- | --- |
| `value: T` | 읽기와 쓰기 가능한 상태 값 |
| `get(): T` | 현재 값 조회 |
| `set(value: T): void` | 상태 변경 |
| `onChange` | 단일 UI 스레드 listener 또는 null |

React Compiler를 사용하는 코드에서는 `.value` 접근보다 `get()`과 `set()`을 사용한다. `onChange`에 할당하는 함수는 worklet이어야 한다. 새 listener를 할당하면 이전 listener를 대체하며 초기값 설정만으로 listener가 호출되지 않는다. 등록한 효과의 cleanup에서 `null`로 비운다.

```tsx
const text = useNativeState('');
useEffect(() => {
  text.onChange = value => {
    'worklet';
    if (value.length > 20) text.set(value.slice(0, 20));
  };
  return () => { text.onChange = null; };
}, [text]);
<TextField value={text} />
```

동기 UI 스레드 작업은 선택적 의존성 `react-native-worklets`가 필요하다. 일반 JS 스레드 상태 사용만으로 이 의존성이 항상 필요한 것은 아니다. `useEffectEvent`를 이용하는 원문 패턴도 handler 안에 worklet 지시문을 유지한다.

전화번호 마스크 예제는 텍스트를 숫자로 정리하고 커서를 끝으로 옮기는 방식이다. 입력 중간에서 편집 가능한 실제 마스크에는 원래 위치와 포매팅 후 위치를 연결하는 선택 영역 계산이 추가로 필요하다. React 상태를 매 키 입력마다 왕복시키지 않아도 된다는 장점과, JS 스레드 read-after-write가 비동기라는 계약을 함께 이해해야 한다.

## 출처

- [Expo Documentation, useNativeState](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/usenativestate)

## 관련 문서

- [[Expo-Compose-TextField]]
- [[Expo-UI-TextInput]]
