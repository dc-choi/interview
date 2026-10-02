---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Checkbox controlled boolean 입력"]
---

# Checkbox controlled boolean 입력

## 설치와 기본 사용

`npx expo install expo-checkbox`, `import { Checkbox } from 'expo-checkbox'`. Android/iOS/tvOS/web/Expo Go에서 boolean input을 제공한다.

```tsx
const [checked, setChecked] = useState(false);
return <Checkbox value={checked} onValueChange={setChecked} />;
```

value는 기본 false 인 rendered checked state 다. onValueChange(newBoolean)에서 state를 변경하는 controlled pattern을 사용한다. callback을 받았다고 parent value가 자동 변경되는 것으로 가정하지 않는다.

## Props와 events

color는 tint이며 disabled opacity style도 override 한다. disabled는 조작 불가 상태다. onChange는 native/web synthetic event를 받고 onValueChange는 boolean만 받는다. CheckboxEvent.value가 새 값, target은 native NodeHandle 또는 web DOM node 다. target을 cross-platform DOM API로 다루지 않는다. ViewProps를 상속하므로 style와 accessibility 설정을 적용할 수 있다.

여러 checkbox에 같은 state를 주면 원문의 세 UI 예처럼 함께 바뀐다. 독립 선택은 항목별 state 또는 selected ID set을 사용한다. label과 accessible name을 연결하고 disabled만 색으로 전달하지 않도록 한다. 저장 요청 중 disabled 여부와 optimistic rollback은 app 책임이다.

## 출처

- [Expo Documentation, Checkbox](https://docs.expo.dev/versions/latest/sdk/checkbox)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
