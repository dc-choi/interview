---
tags: [expo, react-native, compat]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Community MenuView action tree와 trigger"]
---

# Community MenuView action tree와 trigger

## Trigger ownership

MenuView named import는 `@expo/ui/community/menu`다. Android는 internal Pressable anchor+Compose DropdownMenu, iOS tap는 SwiftUI Menu/long-press는 ContextMenu다. shouldOpenOnLongPress false(default), true면 long press로 연다. iOS context menu는 blurred preview를 제공한다.

Android outer Pressable이 gesture를 claim하므로 child Pressable의 onPress/onLongPress가 실행되지 않는다. 별도 action은 onPressAction switch로 옮기거나 native DropdownMenu로 trigger ownership을 직접 구성한다. web은 trigger만 render하고 actions는 실행되지 않으며 warning을 남긴다.

## MenuView와 action contracts

required actions MenuAction[], optional children trigger, onPressAction({nativeEvent:{event:string}}), style/testID, title(iOS), onOpenMenu/onCloseMenu(Android), ref.show(Android)를 제공한다. iOS open/close hooks가 없고 show()는 no-op/dev warning이다.

MenuAction title required, id omitted면 title을 event ID로 사용한다. subactions는 nested submenu, displayInline true는 section이다. iOS parent title이 section header, Android는 divider만 제공한다. state on/off는 checkmark이며 선택 뒤 state 갱신은 caller 책임이다. attributes destructive/disabled/hidden는 각각 visual danger/input disable/item hide다.

```tsx
<MenuView actions={[{id:'pin',title:'Pin',state:pinned?'on':'off'}]}
  onPressAction={e=>{if(e.nativeEvent.event==='pin')setPinned(v=>!v);}}>
  <View><Text>Open menu</Text></View>
</MenuView>
```

image는 iOS SF Symbol string, Android ImageSourcePropType(XML asset 등)다. Android resource-name string을 upstream처럼 lookup하지 않는다. Icon.select로 platform source를 선택하면 unused side를 tree-shake할 수 있다. Android imageColor는 tint, titleColor는 label tint다. iOS imageColor는 accepted지만 system menu에서 per-item color를 무시할 수 있다.

themeVariant,hitSlop,isAnchoredToRight,subtitle,keepsMenuPresented,preferredElementSize,state mixed는 unsupported다. checked toggle, submenu, inline section, destructive action, tap/long-press flow를 target OS에서 검증한다. duplicate titles면 explicit unique id를 사용해 action routing을 분명히 한다.

## 출처

- [Expo Documentation, Menu](https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/menu)

## 관련 문서

- [[Expo-UI-Text-Icons]]
