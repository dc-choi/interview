---
tags: [expo, react-native, layout]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Universal List, ListItem과 FieldGroup"]
---

# Universal List, ListItem과 FieldGroup

## List의 virtualized 범위

List는 Android LazyColumn(+onRefresh면 PullToRefreshBox), iOS SwiftUI List(+refreshable), web scrolling overflow View를 사용한다. native scrolling chrome/separators/insets를 제공하지만 React는 모든 row를 먼저 생성한다. 따라서 큰 list의 JS mount가 lazy인 것은 아니다. 원문은 large list에 FlashList/Legend List를 제안하며 실제 dataset으로 mount/scroll 비용을 확인한다.

List props는 children ReactNode, testID, onRefresh `()=>Promise<void>`다. refresh indicator는 promise resolve/reject까지 유지된다. refresh는 Android/iOS에만 구현되고 web은 parity handler를 받더라도 pull indicator가 없다. 실패를 handler에서 사용자에게 알리는 책임은 app에 남는다.

## ListItem slots

ListItem은 onPress로 row 전체 rectangle(빈 gap 포함)을 tap할 수 있다. children 중 non-slot은 headline이고 leading/trailing/supportingText는 ReactNode shorthand다. Supporting string은 platform secondary style이고 rich content는 node를 사용한다.

`ListItem.Leading`, `.Trailing`, `.Supporting` children slots가 같은 shorthand보다 우선한다. slot markers의 props는 children이다. modifiers는 platform-native escape hatch이고 iOS underlying Button의 plain buttonStyle도 override할 수 있다. testID를 row에 제공한다.

```tsx
<List onRefresh={reload}>
  <ListItem onPress={openProfile} supportingText="Account details">
    <ListItem.Leading><Icon name={PROFILE_ICON} size={20} /></ListItem.Leading>
    Profile
  </ListItem>
</List>
```

## FieldGroup의 grouped settings rows

FieldGroup은 scrollable Settings-style group이다. Section(title)로 명시적인 groups를 만들고 SectionHeader/Footer slots로 custom heading/help를 둔다. direct non-section children은 implicit section처럼 grouped되거나 sections 사이 inline 처리되므로 명확한 경계가 필요하면 Section을 사용한다.

Section title string은 기본 header이며 custom SectionHeader가 있으면 ignored다. titleUppercase false(default)는 Android/web header casing을 제어하지만 iOS는 SwiftUI Form list style이 결정하며 custom header에도 적용되지 않는다. Section children에 rows와 각각 single header/footer marker를 둔다. Header/Footer props는 children만이다.

```tsx
<FieldGroup>
  <FieldGroup.Section title="Notifications">
    <Switch label="Push" value={enabled} onValueChange={setEnabled} />
    <FieldGroup.SectionFooter><Text>Change anytime.</Text></FieldGroup.SectionFooter>
  </FieldGroup.Section>
</FieldGroup>
```

`FieldGroup.getFieldItemPosition(index,total)`는 leading/middle/trailing/only를 반환해 grouped corner radii에 사용할 수 있다. implicit semantics와 실제 row count를 맞춘다. FieldGroup와 Section은 common presentation props를 제공하며 List 자체가 그 모든 props를 받는 것은 아니다.

## 공통 presentation 계약

이 컴포넌트의 `style`은 RN ViewStyle 전체가 아니라 padding(paddingHorizontal/Vertical/Top/Bottom/Left/Right), backgroundColor, borderRadius/Width/Color, opacity, width/height만 지원한다. native에서는 SwiftUI/Compose modifiers로 변환한다. Host 내부는 Yoga flexbox가 아니므로 flexDirection/alignItems 등을 일반 RN처럼 전달하지 않는다.

`disabled`, `hidden`은 interaction 비활성/표시 숨김, `onAppear`, `onDisappear`, `onPress`는 등장/제거/press callback, `testID`는 E2E 식별자다. `modifiers: ModifierConfig[]`는 Android/iOS의 platform escape hatch이며 style/props에서 만든 동일 type modifier를 대체한다. 잘못된 platform modifier와 web fallback의 실제 지원을 구분한다.

## 출처

- [Expo Documentation, List](https://docs.expo.dev/versions/latest/sdk/ui/universal/list)
- [Expo Documentation, FieldGroup](https://docs.expo.dev/versions/latest/sdk/ui/universal/fieldgroup)

## 관련 문서

- [[Expo-UI-Host]]
- [[Expo-UI-Toggles]]
- [[Expo-UI-Scroll]]
