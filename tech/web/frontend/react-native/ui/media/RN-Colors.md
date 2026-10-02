---
tags: [react-native, mobile, image, color]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native 색상 표현

React Native 0.87 기준. 색상은 스타일 객체의 `color`, `backgroundColor` 등으로 전달한다. 문자열 색상, 정수 색상과 플랫폼의 의미 기반 색상 API를 구분한다.

## RGB와 alpha

| 표기 | 예 | alpha 위치 |
|---|---|---|
| 짧은 RGB | `'#f0f'` | 없음 |
| 긴 RGB | `'#ff00ff'` | 없음 |
| 짧은 RGBA | `'#f0ff'` | 마지막 자리 |
| 긴 RGBA | `'#ff00ff00'` | 마지막 두 자리 |
| 함수 | `'rgb(255, 0, 255)'` | 없음 |
| 함수 RGBA | `'rgba(255, 0, 255, 1.0)'` | 마지막 인자 |
| 공백 구문 | `'rgb(255 0 255)'` | 없음 |
| slash alpha | `'rgba(255 0 255 / 1.0)'` | slash 뒤 |

정수 색상도 `0xrrggbbaa` 순서다. 예를 들어 `0xff00ff00`은 alpha가 00인 값이다. Android Color 정수의 `0xaarrggbb`와 순서가 달라 그대로 옮기면 다른 색이나 투명도가 된다.

## HSL과 HWB

HSL은 hue, saturation, lightness로 표현한다. 아래의 comma 구문과 공백 구문을 지원한다.

```tsx
const colors = {
  hsl: 'hsl(360, 100%, 100%)',
  hslSpaces: 'hsl(360 100% 100%)',
  hsla: 'hsla(360, 100%, 100%, 1.0)',
  hslaSpaces: 'hsla(360 100% 100% / 1.0)',
  hwb: 'hwb(70 50% 0%)',
};
```

HWB는 hue, whiteness, blackness로 표현하며 `hwb(0, 0%, 100%)`, `hwb(0 0% 0%)` 같은 형식이 가능하다. RGB보다 색조를 기준으로 조정하기 쉽지만 지원 문법을 CSS의 모든 최신 색 공간으로 확대해서 해석하지 않는다.

## 이름 색상과 transparent

이름 색상은 소문자만 지원한다. `red`는 지원하지만 대문자 `RED`를 지원한다고 가정하지 않는다. `transparent`는 `rgba(0,0,0,0)`에 해당한다. 지원 이름과 RGB 값은 [[RN-Color-Keywords|이름 색상 표]]에서 찾는다.

## 플랫폼 색상 API

- `PlatformColor`는 OS의 색상 체계를 참조한다. 플랫폼의 의미 있는 색상 이름을 사용하려는 경우의 API다.
- `DynamicColorIOS`는 iOS 전용이며 light와 dark 모드 색상을 지정한다.

```tsx
import {DynamicColorIOS, PlatformColor, Platform, Text} from 'react-native';

const textColor = Platform.OS === 'ios'
  ? DynamicColorIOS({light: '#111111', dark: '#eeeeee'})
  : PlatformColor('?attr/textColorPrimary');

export const ThemeLabel = () => <Text style={{color: textColor}}>설명</Text>;
```

플랫폼별 색상 이름은 해당 OS 색상 reference에서 확인해야 한다. 위 코드는 선택 방식을 설명하는 재구성 예제이며 실제 OS 테마별 결과를 실행 확인한 것은 아니다.

## 트레이드오프와 확인할 점

고정 RGB는 브랜드 색상을 일정하게 표현하기 쉽다. 플랫폼 의미 색상은 사용자 테마와 플랫폼 관례를 따라갈 수 있지만 모든 플랫폼에 같은 이름과 같은 RGB가 있는 것은 아니다. Light/Dark Mode, alpha 혼합 배경, Android 정수 변환, 소문자 이름을 확인한다.

## 출처

- [React Native 0.87, Color Reference](https://reactnative.dev/docs/colors)

## 관련 문서

- [[RN-Color-Keywords|지원 이름 색상 표]]
- [[RN-Style|스타일 객체]]
- [[RN-Accessibility|접근성 의미와 상태]]
