---
tags: [expo, react-native, controls]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose FloatingActionButton과 Toolbar"]
---

# Compose FloatingActionButton과 Toolbar

Android Material 3 FAB는 화면의 주요 행동을 나타낸다. 작은 `SmallFloatingActionButton`, 기본 `FloatingActionButton`, 큰 `LargeFloatingActionButton`, 텍스트 라벨이 있는 `ExtendedFloatingActionButton`을 제공한다. 여러 행동을 모으려면 `HorizontalFloatingToolbar`를 사용한다.

## FAB 슬롯

네 변형은 필수 `children`과 선택적 `onClick`, `containerColor`, `modifiers`를 공유한다. 배경 기본은 Material primary container다. 각 컴포넌트의 `.Icon` 슬롯에 아이콘을 넣는다. Extended에는 `.Text` 슬롯과 `expanded`(기본 true)가 추가된다. expanded 변경은 라벨 표시를 애니메이션으로 전환한다.

```tsx
<ExtendedFloatingActionButton expanded={expanded} onClick={createItem}>
  <ExtendedFloatingActionButton.Icon>
    <Icon source={require('./assets/add.xml')} />
  </ExtendedFloatingActionButton.Icon>
  <ExtendedFloatingActionButton.Text><Text>새 항목</Text></ExtendedFloatingActionButton.Text>
</ExtendedFloatingActionButton>
```

스크롤 내용 위에 띄우는 원문 패턴은 전체 화면 `Host` 안의 `Box`에 목록과 FAB를 형제로 둔다. FAB에 `align('bottomEnd')`, `offset(-16, -16)`을 적용한다. Compose 레이어 내부에서 겹치고 정렬하므로 RN absolute 배치를 추가하지 않아도 된다.

## 여러 행동의 Toolbar

`HorizontalFloatingToolbar`는 필수 자식, `variant`(`standard` 기본 또는 `vibrant`), `colors`, `modifiers`를 받는다. 직접 자식의 `IconButton`은 일반 행동이고 `.FloatingActionButton` 슬롯은 주요 행동이다. 이 슬롯은 `onPress`를 사용한다. 일반 FAB의 `onClick`과 이름이 다르다.

```tsx
<Box modifiers={[fillMaxSize()]} floatingToolbarExitAlwaysScrollBehavior="bottom">
  <LazyColumn modifiers={[fillMaxSize()]}>{rows}</LazyColumn>
  <HorizontalFloatingToolbar variant="vibrant"
    modifiers={[align('bottomCenter'), offset(0, -16)]}>
    <IconButton onClick={edit}><Icon source={editIcon} /></IconButton>
    <HorizontalFloatingToolbar.FloatingActionButton onPress={createItem}>
      <Icon source={addIcon} />
    </HorizontalFloatingToolbar.FloatingActionButton>
  </HorizontalFloatingToolbar>
</Box>
```

Box의 `floatingToolbarExitAlwaysScrollBehavior`와 내부 스크롤을 연결하면 스크롤에 따라 toolbar가 숨거나 나타난다. 정렬만으로 스크롤 동작까지 활성화되는 것은 아니다. `colors`의 `toolbarContainerColor`, `toolbarContentColor`, `fabContainerColor`, `fabContentColor`는 각 variant 기본 색 중 지정한 필드만 대체한다.

## 출처

- [Expo Documentation, FloatingActionButton](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/floatingactionbutton)
- [Expo Documentation, HorizontalFloatingToolbar](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/horizontalfloatingtoolbar)

## 관련 문서

- [[Expo-Compose-Buttons]]
- [[Expo-Compose-Layout]]
