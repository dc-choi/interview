---
tags: [react-native, mobile, interaction]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native LayoutAnimation

React Native 0.87 Animations 가이드 기준. LayoutAnimation은 다음 렌더와 레이아웃 사이클에서 View의 생성과 갱신에 적용할 애니메이션을 전역 트랜잭션처럼 설정한다.

## Animated와 책임 구분

Animated는 opacity, transform처럼 특정 값의 관계를 세밀하게 제어한다. LayoutAnimation은 layout 변경의 결과를 애니메이션한다. 펼치기 버튼을 눌러 부모가 커지고 아래 행이 밀리는 경우 각 크기와 위치를 직접 측정해서 연결하지 않아도 함께 변화시킬 수 있다.

전역의 다음 변경을 설정하므로 특정 요소만의 상세한 시간과 gesture 제어는 덜 자유롭다. 세부 진행 값을 직접 따라가야 하면 Animated 또는 해당 요구에 맞는 다른 접근을 확인한다.

## 상태 변경 전에 설정

```tsx
import {useState} from 'react';
import {Button, LayoutAnimation, Platform, UIManager, View} from 'react-native';

if (Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const ExpandingBox = () => {
  const [size, setSize] = useState(100);
  const expand = () => {
    LayoutAnimation.spring();
    setSize(value => value + 15);
  };
  return (
    <View style={{padding: 24}}>
      <View style={{width: size, height: size, backgroundColor: 'skyblue'}} />
      <Button title="확대" onPress={expand} />
    </View>
  );
};
```

먼저 `LayoutAnimation.spring()`으로 다음 layout update를 설정하고 그다음 state를 바꾼다. 공식 Snack은 w와 h를 15씩 증가시키는 예다. preset 이외의 사용자 정의 animation은 LayoutAnimation 설정 계약을 따른다.

Android 활성화 flag는 공식 가이드에 있는 조건부 설정을 보존한 예다. 실제 빌드의 architecture와 UIManager 구현에 따라 이 메서드가 유효한지, 존재하거나 필요한지를 확인한다. 메서드를 호출했다는 사실만으로 활성화와 기기 동작이 증명되지는 않는다.

## 트레이드오프와 확인할 점

- layout 영향을 함께 움직이는 데 적합하고 직접 위치 계산을 줄인다.
- 다음 변경이 전역 적용 대상이므로 같은 렌더의 다른 layout 변경도 고려한다.
- 빠르게 반복 누르기, 다른 상태 갱신과 겹치기, Android 설정, 부모와 형제 이동을 확인한다.
- native Animated driver에서 layout 속성을 지원하지 않는 문제를 useNativeDriver만 켜서 해결하지 않는다.

이 문서의 코드는 설명용 재구성이며 기기에서 실행하지 않았다.

## configureNext의 세 단계

`configureNext(config, onAnimationDidEnd?, onAnimationDidFail?)`는 다음 layout에 예약한다. config의 duration은 밀리초이며 새 View의 `create`, 기존 View의 `update`, 사라지는 View의 `delete`를 각각 설정한다. 종료와 실패 callback도 구분한다.

각 단계는 type, 선택적인 property, springDamping(spring용), initialVelocity, delay, duration을 받는다. create/delete에는 property를 지정하는 것이 권장된다. `Types`는 spring, linear, easeInEaseOut, easeIn, easeOut, keyboard이고 `Properties`는 opacity, scaleX, scaleY, scaleXY다. 이 enum을 모든 layout 속성을 임의로 보간하는 계약으로 확대하지 않는다.

`create(duration, type, creationProp)`는 create/update/delete를 포함하는 config를 만드는 도우미다. `Presets.easeInEaseOut`는 300ms/opacity, `Presets.linear`는 500ms/opacity이고 spring preset은 700ms에 create/delete opacity, update springDamping 0.4를 사용한다. `easeInEaseOut()`, `linear()`, `spring()`은 각 preset으로 configureNext를 호출하는 간편 메서드다.

Reference에도 Android UIManager 활성화 예가 남아 있으므로 메서드 존재를 확인하는 조건문을 보존한다. 이 문서의 조건부 호출은 현재 architecture에서 별도 활성화가 반드시 필요하다는 보장이 아니다.

## 출처

- [React Native 0.87, Animations](https://reactnative.dev/docs/animations)

- [React Native 0.87, layoutanimation](https://reactnative.dev/docs/layoutanimation)

## 관련 문서

- [[RN-Animated|특정 값의 Animated 제어]]
- [[RN-Animated-Interaction|native driver의 지원 제한]]
- [[RN-Flexbox|레이아웃 계산]]
