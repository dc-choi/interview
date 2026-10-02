---
tags: [react-native, mobile, accessibility]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native 접근성 focus 순서와 검증

React Native 0.87 Accessibility 기준. 화면의 탐색 순서는 layout, grouping, native 접근성 정책의 영향을 받는다. prop 설정만으로 실제 screen reader 흐름까지 검증했다고 판단하지 않는다.

## experimental_accessibilityOrder의 상태

`experimental_accessibilityOrder`는 **실험 API**다. 공식 가이드는 버그와 변경 가능성 때문에 production에서 사용하지 말라고 명시한다. 아래는 학습과 평가 용도로 계약을 정리한 예제다.

배열에 후손의 `nativeID`를 나열해 순서를 정한다.

```tsx
<View experimental_accessibilityOrder={['B', 'C', 'A']}>
  <View accessible nativeID="A" />
  <View accessible nativeID="B" />
  <View accessible nativeID="C" />
</View>;
```

원문 예제는 layout 코드를 생략하고 문서 순서가 layout 순서와 맞는다고 전제한다. 이 조건에서 B, C, A 순서로 focus한다.

## 활성화와 exhaustive 특성

order는 참조된 요소를 자동 accessible로 만들지 않는다. C에서 accessible을 제거하면 배열에 C가 있어도 B, A만 focus된다.

반대로 참조하지 않은 접근성 요소는 제외한다.

```tsx
<View experimental_accessibilityOrder={['B', 'C', 'A']}>
  <View accessible nativeID="A" />
  <View accessible nativeID="B" />
  <View accessible nativeID="C" />
  <View accessible nativeID="D" />
</View>;
```

D는 layout상 존재하고 accessible이어도 order 목록에 없으므로 focus되지 않는다. 부분 순서 힌트가 아니라 exhaustive 목록이다.

## 접근성 컨테이너의 중첩

컨테이너 자체가 accessible이 아니고 그 안의 자손들이 accessible이라면 컨테이너 nativeID를 order에 넣을 수 있다.

```tsx
<View experimental_accessibilityOrder={['B', 'C', 'A']}>
  <View accessible nativeID="A" />
  <View accessible nativeID="B" />
  <View nativeID="C">
    <View accessible nativeID="D" />
    <View accessible nativeID="E" />
    <View accessible nativeID="F" />
  </View>
</View>;
```

C는 접근성 element가 아닌 컨테이너다. C를 참조하면 내부의 기본 순서를 적용하므로 B, D, E, F, A 순서가 된다. D/E/F가 바깥 배열에 직접 없다고 제외되지 않는 이유다.

C에도 `experimental_accessibilityOrder={['F', 'E', 'D']}`를 넣으면 B, F, E, D, A로 중첩된다.

## element와 container를 동시에 쓰지 않기

위 C에 `accessible={true}`를 추가하면 C 자체가 element가 된다. 접근성 container와 element를 동시에 취급할 수 없으므로 B, C, A가 되고 D/E/F는 바깥 order의 exhaustive 성질에 의해 제외된다.

이 차이는 순서 배열을 잘못 적은 것만의 문제가 아니다. 어떤 View를 묶어서 하나의 요소로 읽을지와 자식이 독립 조작부인지 먼저 결정해야 한다.

## TalkBack 검증

Android 기기나 emulator의 접근성 설정에서 TalkBack을 켠다. emulator에는 기본 설치되지 않을 수 있으므로 Play Store가 있는 emulator와 TalkBack 설치 여부를 확인한다.

기기에서 volume key shortcut을 활성화했다면 양쪽 volume key를 약 3초 눌러 보조 도구를 전환하는 경로를 사용할 수 있다. 실제 기기와 OS 설정에 따라 메뉴와 shortcut 설정은 확인한다.

가이드에는 adb로 enabled_accessibility_services를 설정하는 예가 있지만 service ID는 설치된 TalkBack과 기기에 맞춰야 한다. 다른 활성 보조 서비스를 덮어쓰는 문제를 피하도록 설정 UI를 우선 사용하고 기존 값을 먼저 확인한다.

```sh
adb shell settings get secure enabled_accessibility_services
```

위는 현재 값을 읽는 명령이다. TalkBack 활성화나 비활성화를 실행한 결과가 아니다.

## VoiceOver와 Accessibility Inspector

iPhone 또는 iPad 접근성 설정에서 VoiceOver를 활성화하고 접근성 shortcut을 구성해 반복 검사한다. 가이드의 Home button triple click 같은 설명은 해당 하드웨어가 있는 기기 조건이며 모든 현재 iPhone의 동일한 버튼 경로로 보장하지 않는다.

Xcode Accessibility Inspector는 요소의 속성과 macOS VoiceOver를 이용한 보조 검사를 제공한다. 가이드의 simulator VoiceOver 제약 설명을 현재 Xcode 모든 버전의 영구 제한으로 단정하지 않는다. 실제 iOS VoiceOver 기기의 경험과 macOS 경유 검사 경험은 다를 수 있으므로 기기 검증을 포함한다.

## 확인할 점

- 화면의 모든 조작부에 도달하고 불필요하게 같은 내용을 반복하지 않는지
- 부모 grouping 때문에 자식 버튼이 사라지지 않는지
- modal이 뒤 화면을 차단하고 닫힌 뒤 focus가 적절한 곳으로 돌아가는지
- 상태 변화와 live region이 알맞게 읽히는지
- action을 통한 결과와 일반 탭의 결과가 일치하는지
- 실험 order에서 누락된 nativeID, 중첩 container와 element를 구분했는지

확인 항목은 적용 점검이며 이 문서 작성 중 기기에서 실행한 결과는 아니다.

## 출처

- [React Native 0.87, Accessibility](https://reactnative.dev/docs/accessibility)

## 관련 문서

- [[RN-Accessibility|접근성 의미와 grouping]]
- [[RN-Accessibility-Platforms|modal, 숨김, action]]
- [[RN-Gesture-Responder|일반 입력 생명주기]]
