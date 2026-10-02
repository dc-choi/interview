---
tags: [expo, react-native, controls]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose NavigationBar의 선택 상태"]
---

# Compose NavigationBar의 선택 상태

`NavigationBar`는 Android Material 3의 최상위 목적지 행이다. `expo-navigation-bar`의 운영체제 시스템 내비게이션 바와 구분한다. `@expo/ui/jetpack-compose`의 `NavigationBarItem`으로 항목을 구성하고 앱이 선택 상태와 실제 화면 이동을 관리한다.

```tsx
<Host style={{ width: '100%' }} matchContents={{ vertical: true }}>
  <NavigationBar>
    {tabs.map(tab => <NavigationBarItem key={tab.id}
      selected={selected === tab.id} onClick={() => setSelected(tab.id)}>
      <NavigationBarItem.Icon><Icon source={tab.icon} /></NavigationBarItem.Icon>
      <NavigationBarItem.Label><Text>{tab.label}</Text></NavigationBarItem.Label>
    </NavigationBarItem>)}
  </NavigationBar>
</Host>
```

## Bar와 Item 계약

Bar의 선택적 props는 `children`, `containerColor`, `contentColor`, `tonalElevation`, `modifiers`다. 컨테이너 기본은 NavigationBarDefaults, content 기본은 `contentColorFor(containerColor)`, tonal elevation은 기본 Material dp 높이다.

Item은 `NavigationBar` 내부에 있어야 하며 `selected: boolean`이 필수다. `enabled`와 `alwaysShowLabel`은 기본 true, `onClick`은 선택적 callback다. `children`, `modifiers`, `colors`도 선택적이다. 자식 슬롯은 `.Icon`, `.SelectedIcon`, `.Label`이다. 선택된 아이콘을 별도로 지정해 상태를 표현할 수 있다. `alwaysShowLabel=false`면 라벨의 표시를 선택 상태에 맞춘다.

`colors`의 모든 필드는 선택적 `ColorValue`다. 선택 상태는 `selectedIconColor`, `selectedTextColor`, `selectedIndicatorColor`, 미선택은 `unselectedIconColor`, `unselectedTextColor`, 비활성은 `disabledIconColor`, `disabledTextColor`로 조정한다. 화면 라우팅은 callback에서 Router 등과 연결해야 하며 선택 표시만 바뀌어도 화면 이동이 자동으로 일어나는 계약은 없다.

## 출처

- [Expo Documentation, NavigationBar](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/navigationbar)

## 관련 문서

- [[Expo-Compose-Icons]]
- [[Expo-Compose-Colors]]
