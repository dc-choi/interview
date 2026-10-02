---
tags: [react-native, mobile, interaction]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native 버튼과 터치 피드백

React Native 0.87 Handling Touches 기준. 간단한 탭에는 Button이나 Touchable 계열을 사용하고, 여러 컴포넌트가 터치를 협상해야 하는 복잡한 동작은 responder 시스템으로 이어진다.

## Button의 기본 동작

```tsx
import {Alert, Button, View} from 'react-native';

export const ButtonExample = () => (
  <View style={{padding: 24}}>
    <Button title="저장" color="#841584"
      onPress={() => Alert.alert('저장 버튼을 눌렀습니다')} />
  </View>
);
```

Button은 플랫폼 관례에 맞는 기본 표현을 제공한다. 기본 예는 iOS에서 파란 label, Android에서 밝은 텍스트가 있는 파란 버튼으로 설명한다. `color`를 바꾸더라도 두 OS에서 같은 형태의 색칠 결과를 기대하지 않는다. `onPress`가 탭 결과를 처리한다.

공식 Button Snack에는 기본 버튼, color를 바꾼 버튼, row에서 `space-between`으로 나란히 놓은 버튼이 있다. 버튼의 기본 디자인과 버튼 주변 배치의 책임을 구분해서 확인할 수 있다.

## Touchable 선택

Touchable은 탭 감지와 피드백을 제공하지만 버튼 디자인을 자동으로 만들어 주지 않는다. 크기, 배경, 텍스트 등의 모양은 직접 정의한다.

| 컴포넌트 | 눌렀을 때 피드백 | 선택 조건 |
|---|---|---|
| TouchableHighlight | 배경 underlay가 나타남 | 버튼과 링크에 명확한 누름 표시 |
| TouchableOpacity | 불투명도가 줄어듦 | 기존 모양을 투명도로 변화시킴 |
| TouchableNativeFeedback | Android ink ripple | Android 네이티브 ripple 표현 |
| TouchableWithoutFeedback | 시각적 변화 없음 | 무피드백이 의도적으로 필요한 탭 |

`TouchableNativeFeedback`는 Android 조건을 확인한다. 플랫폼 전용 피드백을 전 플랫폼 공통 표시로 취급하지 않는다.

```tsx
import {Text, TouchableHighlight, TouchableOpacity} from 'react-native';

export const CustomButtons = () => (
  <View style={{padding: 24, gap: 12}}>
    <TouchableHighlight underlayColor="#dddddd"
      onPress={() => Alert.alert('기본 동작')}
      onLongPress={() => Alert.alert('길게 누르기')}
      style={{padding: 16, backgroundColor: 'skyblue'}}>
      <Text>길게 누를 수 있는 버튼</Text>
    </TouchableHighlight>
    <TouchableOpacity onPress={() => Alert.alert('열기')}
      style={{padding: 16, backgroundColor: 'powderblue'}}>
      <Text>불투명도 피드백</Text>
    </TouchableOpacity>
  </View>
);
```

`onLongPress`는 일정 시간 누르고 있는 동작을 처리한다. 정확한 지연 설정과 press 이벤트 순서는 해당 컴포넌트 reference에서 확인한다. 길게 누르기를 추가한 상태에서 짧은 탭과 취소도 함께 확인한다.

## 스크롤과 스와이프

스크롤과 pan은 단순한 Button 탭보다 넓은 제스처다. 목록 스크롤과 페이지 간 스와이프에는 ScrollView의 기능을 먼저 확인한다. 부모 스크롤과 자식 버튼이 경쟁하는 사용자 경험은 [[RN-Gesture-Responder|responder 생명주기]]에서 이해한다.

## 피드백, 취소와 접근성

사용자는 지금 어느 요소가 입력을 처리하는지 보고, 손가락을 바깥으로 이동해 동작을 취소할 수 있어야 한다. `TouchableWithoutFeedback`를 택하면 다른 수단으로 피드백을 줄 필요가 있는지 검토한다.

시각적 디자인만 추가하면 버튼의 목적과 상태를 screen reader에 전달할 수 없다. 접근성 label, role, disabled 같은 상태도 컴포넌트 의미에 맞춘다.

## 알려진 경계와 확인할 점

터치 영역은 부모 View 경계를 넘지 않는다. Android negative margin의 알려진 제한도 시각적인 버튼 배치와 터치 영역을 함께 조사해야 하는 이유다.

두 플랫폼에서 기본 Button, underlay, opacity, ripple을 비교하고 짧은 탭, 길게 누르기, 손가락을 밖으로 끌어 취소, 부모 스크롤을 확인한다. 문서의 예제는 원문 패턴을 재구성했으며 실행 검증 결과가 아니다.

## 출처

- [React Native 0.87, Handling Touches](https://reactnative.dev/docs/handling-touches)
- [React Native 0.87, Gesture Responder System](https://reactnative.dev/docs/gesture-responder-system)

## 관련 문서

- [[RN-Gesture-Responder|터치 협상과 생명주기]]
- [[RN-Accessibility|버튼의 접근성 의미]]
- [[RN-Style|스타일과 부모 경계]]
