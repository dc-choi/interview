---
tags: [react-native, mobile, ui]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native 스타일

React Native 0.87 기준. 기본 컴포넌트는 `style` prop으로 JavaScript 객체를 받는다. CSS의 속성과 값에 가까운 부분이 많지만 웹 스타일시트 전체를 그대로 적용하는 모델은 아니다.

## 스타일 객체와 우선순위

속성은 `background-color` 대신 `backgroundColor`처럼 camelCase로 쓴다. 단일 객체나 객체 배열을 전달할 수 있고, 배열에서는 뒤쪽 스타일이 앞쪽의 같은 속성을 덮어쓴다. 서로 다른 속성은 함께 적용된다.

```tsx
import {StyleSheet, Text, View} from 'react-native';

const styles = StyleSheet.create({
  container: {padding: 24},
  emphasis: {fontSize: 30, fontWeight: 'bold', color: 'blue'},
  error: {color: 'red'},
});

export const StyleExample = () => (
  <View style={styles.container}>
    <Text style={[styles.emphasis, styles.error]}>큰 빨간 글씨</Text>
    <Text style={[styles.error, styles.emphasis]}>큰 파란 글씨</Text>
  </View>
);
```

이 예제에서 `fontSize`와 `fontWeight`는 두 줄에 모두 남고 `color`만 배열 순서에 따라 바뀐다. 상태별 색상을 기본 모양 뒤에 놓으면 우선순위를 읽기 쉽다.

## StyleSheet와 컴포넌트의 스타일 계약

`StyleSheet.create`는 복잡해진 스타일을 한곳에 이름 붙여 관리하는 방법이다. 간단한 예제의 인라인 객체도 유효하다. StyleSheet를 쓰면 자동으로 성능이 보장된다는 결론은 이 가이드의 범위를 넘는다.

재사용 컴포넌트가 `style`을 받아 내부에 전달하면 호출자가 표현을 조정할 수 있다. 어떤 하위 요소를 조정하는 prop인지 명확히 정한다.

```tsx
import type {PropsWithChildren} from 'react';
import {Text, type StyleProp, type TextStyle} from 'react-native';

type LabelProps = PropsWithChildren<{
  readonly style?: StyleProp<TextStyle>;
}>;

export const Label = ({style, children}: LabelProps) => (
  <Text style={[{fontSize: 16, color: 'black'}, style]}>{children}</Text>
);
```

호출자의 `style`이 마지막이므로 기본 색상과 크기를 덮어쓸 수 있다. 디자인 규칙상 덮어쓰기를 금지할 속성이 있다면 배열 순서를 포함해 컴포넌트 계약을 별도로 정해야 한다.

웹의 cascade를 기대해 부모 `View`에 텍스트 스타일을 넣기보다 텍스트 컴포넌트에 필요한 스타일을 전달한다. 공식 가이드에서 말하는 cascade 패턴은 컴포넌트가 받은 스타일을 하위 컴포넌트에 명시적으로 전달하는 방식이다.

## 웹 CSS와 다른 조건

- 터치 영역은 부모 View 경계 밖으로 확장되지 않는다. 자식이 시각적으로 밖에 보인다고 같은 범위가 터치된다고 가정하지 않는다.
- Style 가이드는 Android의 negative margin을 알려진 문제로 기록한다. 음수 margin에 의존하는 레이아웃은 대상 OS에서 별도로 확인한다.
- 텍스트 속성은 Text reference, 배치 속성은 Layout Props reference의 지원 범위를 확인한다.

## 확인할 점

스타일 배열 순서를 바꿨을 때 의도한 속성만 바뀌는지, 사용자 style이 어디에 적용되는지, 두 플랫폼에서 텍스트와 터치 영역이 같은 제품 요구를 만족하는지 확인한다. 예제는 원문 패턴을 재구성했으며 기기에서 실행한 결과를 뜻하지 않는다.

## StyleSheet static API

create는 style의 identity function이며 native style 타입 검사와 이름 부여가 실용적인 이점이다. compose(style1, style2)는 두 번째가 우선이고 한 값이 falsy면 새 배열 없이 나머지를 반환한다. flatten은 여러 style을 하나의 객체로 합친다. render마다 무조건 flatten하는 별도 layer를 만들 필요는 없다.

absoluteFill은 absolute와 네 방향 0을 묶은 overlay style이다. hairlineWidth는 플랫폼과 밀도에 맞춘 얇은 선이며 모든 기기에서 같은 숫자가 아니다. 축소된 simulator에서는 보이지 않을 수 있다.

setStyleAttributePreprocessor는 불안정한 experimental API다. 사용자 style 한두 개를 바꾸려는 용도로 내부 색/transform 처리 경계를 수정하지 않는다.

## 출처

- [React Native 0.87, Style](https://reactnative.dev/docs/style)

- [React Native, stylesheet](https://reactnative.dev/docs/stylesheet)

## 관련 문서

- [[RN-Dimensions|크기와 부모 크기 조건]]
- [[RN-Flexbox|Flexbox 배치]]
- [[RN-Colors|색상 표현과 플랫폼 색상]]
- [[RN-Layout-Contracts]]
- [[RN-Styling-Effects]]
