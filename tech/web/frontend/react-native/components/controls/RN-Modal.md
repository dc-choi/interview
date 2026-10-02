---
tags: [react-native, components]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native Modal과 닫기 계약

React Native 0.87 기준이다. 예제는 계약을 설명하는 코드이며 앱 빌드나 기기 실행을 검증한 결과는 아니다.

Modal은 상위 화면 위에 별도 콘텐츠를 표시한다. `visible`로 열림 상태를 제어하며 animationType은 none/slide/fade다. 기본 visible은 true이므로 앱 state와 명시적으로 연결하는 편이 안전하다.

## 닫기 경로

```tsx
<Modal visible={opened} onRequestClose={() => setOpened(false)}>
  <Button title="닫기" onPress={() => setOpened(false)} />
</Modal>
```

Android hardware back과 TV menu는 `onRequestClose`로 온다. Modal이 열려 있는 동안 BackHandler event는 발생하지 않는다. iOS sheet drag와 `allowSwipeDismissal`도 닫기 callback을 처리해야 state가 실제 화면과 맞는다. `onShow`는 표시 후, iOS `onDismiss`는 닫힌 후의 callback이다.

## 표시 영역과 플랫폼

`transparent`가 true면 투명 배경 위에 콘텐츠를 올리고 backdropColor는 무시한다. iOS presentationStyle은 fullScreen/pageSheet/formSheet/overFullScreen이며 기본은 transparent 조건에 따라 달라진다.

Android navigationBarTranslucent는 statusBarTranslucent가 함께 true여야 적용된다. hardwareAccelerated는 별도 window 가속 설정이다. iOS supportedOrientations는 Info.plist의 허용 방향을 넘지 못하며 sheet에서는 무시될 수 있다. onOrientationChange는 최초 표시에서도 호출된다.

modal 안의 배경 탭, 닫기 버튼, 뒤로 가기와 swipe dismiss를 모두 같은 state 변경에 연결한다. safe area와 접근성 focus도 실제 플랫폼에서 확인한다.

## 출처

- [React Native, Modal](https://reactnative.dev/docs/modal)

## 관련 문서

- [[RN-Basic-Controls]]
- [[RN-Navigation]]
- [[RN-Accessibility-Focus]]
