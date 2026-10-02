---
tags: [expo, react-native, inputs]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose Slider의 범위와 단계"]
---

# Compose Slider의 범위와 단계

`Slider`는 Android Compose의 수치 선택기다. `@expo/ui/jetpack-compose`에서 가져오고 `Host` 아래에 둔다. 사용자 입력값은 `onValueChange`에서 상태에 반영한다.

## 값과 콜백 계약

| 속성 | 의미 |
| --- | --- |
| `value` | 현재 숫자, 기본 0 |
| `min`, `max` | 표시 범위, 기본 0과 1 |
| `lowerLimit`, `upperLimit` | 사용자가 드래그할 수 있는 경계. 표시 트랙 범위는 바꾸지 않는다 |
| `steps` | 최소와 최대 사이의 중간 단계 개수. 0은 연속 입력 |
| `enabled` | 입력 허용 여부, 기본 true |
| `onValueChange(number)` | 드래그 중 값 변경 |
| `onValueChangeFinished()` | 사용자의 값 변경이 끝났을 때 실행 |
| `modifiers` | 레이아웃과 스타일 modifier 배열 |

`steps={9}`와 0~100 범위라면 내부 9개 지점과 양 끝을 포함해 10씩 선택한다. Universal Slider의 `step`처럼 증가량 자체를 전달하는 계약과 구분한다. `min`이나 `max` 변경은 현재 값이 새 범위를 벗어나더라도 `onValueChange`를 발생시키지 않는다. 프로그램으로 범위를 바꿀 때는 애플리케이션 상태도 조정한다.

```tsx
const [value, setValue] = useState(40);
<Host matchContents>
  <Slider value={value} min={0} max={100} steps={9}
    onValueChange={setValue} onValueChangeFinished={() => save(value)} />
</Host>
```

## 트랙과 손잡이

`colors`에는 `thumbColor`, `activeTrackColor`, `inactiveTrackColor`, `activeTickColor`, `inactiveTickColor`를 선택적으로 지정한다. 값은 React Native `ColorValue`다. 기본 Material 색은 테마에서 나온다.

`Slider.Thumb`과 `Slider.Track` 자식 슬롯에 Compose 뷰를 넣어 기본 손잡이와 트랙을 대체한다. 원문 예제의 `weight(Math.max(value, 0.01))`는 값이 0~1일 때의 표현이다. 다른 범위에서는 `(value-min)/(max-min)`으로 비율을 정규화해야 한다. 최소 크기는 `size`, 배치는 `padding`, 모양과 배경은 `clip`, `background` modifier로 설정한다.

## 출처

- [Expo Documentation, Slider](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/slider)

## 관련 문서

- [[Expo-Compose-Native-State]]
- [[Expo-UI-Compat-Slider]]
