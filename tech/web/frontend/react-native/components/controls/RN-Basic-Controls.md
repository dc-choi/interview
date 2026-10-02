---
tags: [react-native, components]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Button, Switch와 로딩 표시

React Native 0.87 기준이다. 예제는 계약을 설명하는 코드이며 앱 빌드나 기기 실행을 검증한 결과는 아니다.

## Button의 범위

`Button`은 `title`과 `onPress`를 필수로 받는 기본 control이다. 세부 시각 디자인보다 플랫폼 기본 동작을 우선한다. Android는 title을 대문자로 바꿀 수 있고, `color`는 Android에서 배경, iOS에서 글자 색에 적용된다.

```tsx
<Button title="저장" disabled={saving} onPress={save} />
```

accessibilityLabel/language/actions와 TV focus props는 입력을 보조하지만 화면의 역할과 focus 순서까지 자동으로 해결하지 않는다. 자유로운 pressed style이 필요하면 Pressable로 구성한다.

## Switch는 controlled input이다

`value`가 정본이고 `onValueChange`가 새 boolean을 전달한다. callback에서 state를 바꾸지 않으면 사용자가 눌러도 전달한 value 상태를 계속 표시한다. `onChange`는 boolean 대신 event를 받는다.

```tsx
const [enabled, setEnabled] = useState(false);
<Switch value={enabled} onValueChange={setEnabled} />;
```

`disabled`는 사용자 변경을 막는다. trackColor는 false/true별 색, thumbColor는 grip 색이다. iOS에서 false track의 바깥 배경은 `ios_backgroundColor`로 조절하고 thumbColor를 지정하면 기본 그림자가 사라질 수 있다.

## ActivityIndicator의 상태

`animating`은 기본 true이며 회전 표시 여부를 제어한다. `size`는 small/large이고 Android는 숫자 크기도 지원한다. iOS의 `hidesWhenStopped`는 중단 시 숨길지를 정한다. spinner 표시 상태와 실제 요청 상태를 같은 state 흐름에서 연결한다. 로딩만 보이고 오류/취소/빈 결과가 빠지는 UI를 피한다.

## 출처

- [React Native, Core Components and APIs](https://reactnative.dev/docs/components-and-apis)
- [React Native, Button](https://reactnative.dev/docs/button)
- [React Native, Switch](https://reactnative.dev/docs/switch)
- [React Native, ActivityIndicator](https://reactnative.dev/docs/activityindicator)

## 관련 문서

- [[RN-Core-Components]]
- [[RN-Text-Input]]
- [[RN-Pressable]]
