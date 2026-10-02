---
tags: [react-native, touch]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Pressable과 누르기 영역

Pressable은 자식의 press 상태를 추적하고 각 단계의 callback과 UI feedback을 연결하는 wrapper다. React Native 0.87 기준이며 설명 예제는 기기에서 실행 검증하지 않았다.

## event 순서와 상태

일반적인 짧은 누름은 `onPressIn → onPressOut → onPress` 순서다. 계속 누르면 onLongPress가 발생하고 뗄 때 onPressOut으로 정리한다. 기본 long press 대기는 500ms이며 delayLongPress로 조절한다. unstable_pressDelay는 press down부터 onPressIn까지 지연을 바꾼다.

```tsx
<Pressable
  accessibilityRole="button"
  onPress={save}
  hitSlop={8}
  style={({pressed}) => ({opacity: pressed ? 0.6 : 1})}>
  <Text>저장</Text>
</Pressable>
```

style과 children은 `{pressed}`를 받는 함수로 작성할 수 있다. disabled는 press 동작을 막고 onHoverIn/Out은 hover feedback, onPressMove는 위치 변화를 처리한다. testOnly_pressed는 테스트/문서용 상태다.

## 시작 영역과 유지 영역

- **HitRect / hitSlop**: 요소 밖에서 눌러도 시작을 허용할 추가 영역이다.
- **PressRect / pressRetentionOffset**: 누른 뒤 바깥으로 조금 이동해도 활성 상태를 유지할 영역이다.

터치 영역은 부모 view 경계를 넘지 않는다. 겹친 형제는 z-index 우선순위가 영향을 주므로 hitSlop을 크게 주는 것만으로 해결하지 않는다. layout 크기, 시각 크기와 터치 영역을 따로 확인한다.

## Android ripple

android_ripple은 color, borderless, radius, foreground, alpha를 받는다. foreground는 자식 이미지나 배경이 ripple을 덮지 않게 한다. PlatformColor를 사용한 ripple은 system theme 변화에도 대응한다. alpha는 기존 color의 alpha 위에 적용된다. android_disableSound는 기본 touch sound를 끈다.

## 출처

- [React Native, Pressable](https://reactnative.dev/docs/pressable)

## 관련 문서

- [[RN-Touchable-Components]]
- [[RN-Touch-Event-Types]]
- [[RN-Gesture-Responder]]
