---
tags: [react-native, mobile, accessibility]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native 플랫폼 접근성 속성과 동작

React Native 0.87 Accessibility 기준. 공통 의미를 지정하더라도 iOS와 Android의 알림, modal focus, 숨김과 사용자 gesture는 차이가 있다.

## iOS 언어, 색상 반전과 큰 콘텐츠

| 속성 | 계약 |
|---|---|
| accessibilityLanguage | label, value, hint의 읽기 언어, BCP 47 문자열 |
| accessibilityIgnoresInvertColors | 색상 반전에서 사진 같은 특정 View를 제외 |
| accessibilityShowsLargeContentViewer | 길게 눌러 큰 콘텐츠 viewer 표시, iOS 13 이상 |
| accessibilityLargeContentTitle | 큰 콘텐츠 viewer 제목, viewer 활성화 필요 |

```tsx
<View accessible accessibilityLabel="Pizza" accessibilityLanguage="it-IT">
  <Text>피자</Text>
</View>;
<View accessibilityShowsLargeContentViewer
  accessibilityLargeContentTitle="홈 탭">
  <Text>홈</Text>
</View>;
```

읽기 언어는 표시 문자열의 언어와 맞추고 큰 콘텐츠 viewer 제목도 요소의 실제 목적을 전달한다.

## Android live region

동적으로 바뀌는 텍스트를 TalkBack에 알리려면 `accessibilityLiveRegion`을 쓴다.

| accessibilityLiveRegion | aria-live | 의미 |
|---|---|---|
| none | off | 변경을 안내하지 않음 |
| polite | polite | 진행 중 발화를 방해하지 않는 변경 안내 |
| assertive | assertive | 현재 발화를 중단하고 즉시 안내 |

```tsx
<Text accessibilityLiveRegion="polite">선택한 항목 {count}개</Text>;
```

단순 수량 변화에 assertive를 반복하면 읽기를 계속 방해할 수 있다. 중요한 변경인지와 발화 빈도를 함께 정한다. 이는 업데이트 상태를 어떻게 알릴지의 계약이며 visual state 갱신을 대신하지 않는다.

## iOS modal과 숨김, Android 숨김

`accessibilityViewIsModal` 또는 `aria-modal`은 iOS에서 해당 View의 **형제 View** 내부를 VoiceOver 탐색에서 제외한다.

형제 A와 B 중 B를 modal로 두면 A를 무시한다. B의 자식 C에만 modal prop을 붙이면 A는 C의 형제가 아니므로 A가 제외되지 않는다. 설정을 얼마나 깊은 View에 넣었는지가 중요하다.

`accessibilityElementsHidden`은 iOS에서 해당 요소와 그 자식을 숨긴다. `aria-hidden`도 요소와 자식의 보조 기술 노출을 숨긴다.

Android `importantForAccessibility`는 이벤트 발생과 보조 기술 보고 여부를 정한다.

| 값 | 용도 |
|---|---|
| auto | 시스템 기본 판단 |
| yes | 접근성 대상으로 처리 |
| no | 해당 View의 보고 여부 제어 |
| no-hide-descendants | 해당 View와 모든 자식을 무시 |

겹친 화면 뒤의 요소까지 무시해야 하면 no와 no-hide-descendants를 혼동하지 않는다. iOS accessibilityElementsHidden과 Android no-hide-descendants가 유사한 숨김 범위를 표현한다.

## iOS gesture 콜백

| 콜백 | gesture와 기대 동작 |
|---|---|
| onAccessibilityEscape | 두 손가락 Z/scrub, 계층에서 뒤로 가거나 modal 닫기 |
| onAccessibilityTap | 선택 요소를 두 번 탭해 활성화 |
| onMagicTap | 두 손가락 double tap, 현재 가장 중요한 동작 |

Escape나 Magic Tap을 현재 요소가 처리하지 않으면 시스템이 상위 계층에서 handler를 찾을 수 있다. escape의 handler를 못 찾으면 동작 불가 소리로 알려 줄 수 있다. 전화 앱의 magic tap이 통화 시작/종료인 것처럼 실제 기능과 맞춘다.

## 접근성 action 선언과 처리

`accessibilityActions`는 `{name, label?}` 배열이다. `onAccessibilityAction`이 `event.nativeEvent.actionName`에 따라 실행한다. 선언만 하고 handler를 구현하지 않으면 조작의 결과를 제공하지 못한다.

| 표준 name | 플랫폼과 의미 |
|---|---|
| activate | 일반 활성화와 같은 동작 |
| increment | adjustable 값을 증가 |
| decrement | adjustable 값을 감소 |
| magicTap | iOS, 두 손가락 double tap |
| escape | iOS, 두 손가락 scrub |
| longpress | Android, double tap 뒤 누르고 있기 |
| expand | Android, 펼침과 hint |
| collapse | Android, 접힘과 hint |

increment/decrement 입력 gesture는 iOS swipe와 TalkBack 버전에 따라 다르다. 가이드는 구버전 volume key와 이후 Adjust Reading Control gesture를 설명한다. 하드웨어 버튼 하나에만 의존해 접근성 동작을 설계하지 않는다.

표준 action의 label은 선택이며 기본 안내를 구체적인 결과 안내로 바꿀 수 있다. custom action에는 사용자 언어로 결과를 설명하는 label을 둔다.

```tsx
<View accessible accessibilityLabel="메시지"
  accessibilityActions={[
    {name: 'copy', label: '메시지 복사'},
    {name: 'delete', label: '메시지 삭제'},
  ]}
  onAccessibilityAction={event => {
    const {actionName} = event.nativeEvent;
    if (actionName === 'copy') copyMessage();
    if (actionName === 'delete') deleteMessage();
  }} />;
```

`copyMessage`, `deleteMessage`는 앱의 실제 기능으로 이미 정의된 상황의 조각이다. action handler와 일반 조작 경로가 같은 결과를 내도록 연결한다. 삭제를 action으로 노출했다는 사실이 권한 검사나 제품의 취소 정책을 대신하지 않는다.

## screen reader 상태와 Android 이벤트

`AccessibilityInfo`의 설정 조회, subscription, 발화와 ref 기반 focus 요청은 [[RN-Accessibility-Info]]에서 정리한다.

Accessibility 가이드는 Android `UIManager.sendAccessibilityEvent(viewTag, eventType)` 경로를 설명한다. 새 코드에서는 [[RN-Accessibility-Info|AccessibilityInfo.sendAccessibilityEvent]]의 host ref 계약을 우선 확인한다. 가이드가 나열한 유형은 `typeWindowStateChanged`, `typeViewFocused`, `typeViewClicked`다. `findNodeHandle`로 얻은 유효한 native view tag와 실제 UIManager 구현을 확인한 뒤 필요한 이벤트를 보낸다. 이벤트를 보냈다는 사실이 focus의 실제 이동을 증명하지는 않는다.

## 확인할 점

modal prop의 형제 범위, 숨겨야 할 자식, live region 빈도, 실제 action 실행, 언어와 큰 콘텐츠 viewer를 두 플랫폼에서 확인한다. 이 문서의 예제는 보조 기술로 실행 검증하지 않았다.

## 출처

- [React Native 0.87, Accessibility](https://reactnative.dev/docs/accessibility)

## 관련 문서

- [[RN-Accessibility|역할, 이름과 상태]]
- [[RN-Accessibility-Focus|순서와 TalkBack/VoiceOver 검증]]
