---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI modifier, sheet와 privacy 표시"]
---

# Expo SwiftUI modifier, sheet와 privacy 표시

## Sheet presentation

presentation modifier는 BottomSheet의 content Group에 적용한다. 설정은 아래 OS 조건을 따르며 component 자체의 넓은 지원 표로 확장하지 않는다.

| 함수 | options와 지원 |
| --- | --- |
| presentationDetents(detents[],{selection,onSelectionChange}?) | iOS/tvOS16+, medium/large/{fraction:0..1}/{height:points}; 선택한 높이 tracking/control |
| presentationDragIndicator | iOS/tvOS16+, automatic/visible/hidden |
| presentationBackground | iOS16.4+, hex string, drag indicator와 home indicator inset까지 sheet surface를 칠한다 |
| presentationBackgroundInteraction | iOS/tvOS16.4+, automatic/enabled/disabled 또는 {type:'enabledUpThrough',detent} |
| presentationSizing | iOS/tvOS18+, automatic/fitted/form/page |
| interactiveDismissDisabled | boolean 기본 true, gesture dismiss를 막는다 |

fitted는 content 크기, form은 compact centered sheet, page는 큰 page sheet다. detent의 controlled selection은 목록에 실제 포함된 값으로 유지한다. background()는 content 뒤만 칠하고 List/Form이 덮을 수 있으므로 presentationBackground와 scrollContentBackground('hidden')를 조합한다. **compact adaptation modifier는 이 SDK 57 generated API 목록에 기재되어 있지 않아 사용 가능 API로 추가하지 않는다**.

menuActionDismissBehavior(automatic/enabled/disabled)는 iOS16.4+/tvOS17+에서 action 뒤 menu가 닫히는 동작을 정한다. menuOrder는 automatic/fixed/priority다. automatic은 위로 열리는 menu에서 순서를 뒤집을 수 있고 fixed는 제공한 순서를 유지한다. priority의 세부 배치 규칙은 원문이 설명하지 않는다.

## Redaction, privacy와 pending 상태

redacted() 기본 placeholder는 subtree를 skeleton처럼 대체한다. reasons는 placeholder/privacy/invalidated 또는 배열이며 empty array는 없음이다. privacy는 privacySensitive() marker가 붙은 child만, invalidated는 invalidatableContent() marker가 붙은 child만 바꾼다. reasons는 함께 적용 가능하고 unredacted()는 해당 subtree를 예외로 만든다.

**privacySensitive(boolean=true)는 단독으로 화면을 가리거나 screenshot을 자동 차단하지 않는다**. ancestor의 redacted('privacy')가 있어야 효과가 있다. invalidatableContent(boolean=true)는 iOS/tvOS17+, invalidated reason도 iOS17+이며 pending-update appearance에 쓰인다. redaction은 앱 권한, 저장 암호화, 로그 제거를 대신하지 않는다.

```tsx
import { Host, VStack, Text } from '@expo/ui/swift-ui';
import { redacted, privacySensitive, unredacted } from '@expo/ui/swift-ui/modifiers';
export function PrivacyPreview() {
  return <Host matchContents><VStack modifiers={[redacted('privacy')]}>
    <Text modifiers={[privacySensitive()]}>개인 내용</Text>
    <Text modifiers={[unredacted()]}>공개 제목</Text>
  </VStack></Host>;
}
```

## Environment, widget와 Live Activity

environment는 `{key,value}` 또는 `(key,value)` overload다. colorScheme light/dark, editMode active/inactive/transient, locale 문자열, timeZone IANA 문자열을 설정한다. descendant 환경을 바꾸므로 특정 control만 바꾸려면 적용 범위를 좁힌다.

activityBackgroundTint(Color|null)는 Live Activity 배경이며 null은 시스템 기본값이다. widgetAccentedRenderingMode(fullColor/accented/desaturated/accentedDesaturated)는 WidgetKit accented mode의 Image 표시 방식을 지정한다. widgetURL(string)는 widget 클릭 때 containing app에서 여는 URL이다. **widget view hierarchy에는 하나만 허용되고 여러 개면 동작이 undefined**다. modifier만으로 widget/Live Activity extension을 생성하거나 시작하지 않으며 해당 native 환경과 별도 패키지 계약이 필요하다.

## 출처

- [Expo Documentation, Modifiers](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/modifiers)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
