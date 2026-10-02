---
tags: [expo, react-native, core]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose Host와 RNHostView layout 경계"]
---

# Compose Host와 RNHostView layout 경계



## Android 네이티브 영역

`@expo/ui/jetpack-compose`는 React에서 Android Compose 컴포넌트를 사용하게 한다. SDK57에 맞는 `@expo/ui`를 `expo install`로 설치하며 기존 RN 앱에는 Expo Modules 연결이 필요하다. 모든 Compose 컴포넌트는 `Host` 안에 둔다. Android/iOS/web 공통 코드는 Universal API, Android 전용 레이아웃과 modifier는 Compose API를 선택한다.

Host의 `style`은 RN ViewStyle이고 내부 배치는 Compose가 담당한다. Universal Button의 onPress와 native Button의 onClick처럼 행동 이름도 다르다. modifier 배열은 순서대로 적용한다. background 뒤의 paddingAll은 배경 안쪽에 패딩을 만든다.

## Host 속성

| 속성 | 계약 |
| --- | --- |
| `children` | 필수 ReactNode |
| `matchContents` | boolean 또는 축별 객체, 기본 false, mount 시 한 번 설정 |
| `onLayoutContent` | `{nativeEvent:{width,height}}` 내용 크기 |
| `useViewportSizeMeasurement` | 기본 false. 명시적 크기가 없을 때 viewport 기반 측정값 제공 |
| `layoutDirection` | leftToRight/rightToLeft, 기본 locale 방향 |
| `colorScheme`, `seedColor` | light/dark/device 테마와 ColorValue seed |
| `ignoreSafeAreaKeyboardInsets` | 기본 false, mount 시 한 번 설정. true는 키보드 회피를 끈다 |
| `pointerEvents` | box-none/none/box-only/auto |
| `style` | RN ViewStyle와 기본 컴포넌트 속성 |

colorScheme을 생략하면 시스템 테마를 따른다. Android 12 이상에서 seed가 없으면 배경화면 Material You 팔레트, 이전 Android는 정적 Material 3 팔레트다. seedColor는 SchemeTonalSpot으로 팔레트를 생성한다. 하위 컴포넌트는 useMaterialColors로 같은 팔레트를 읽는다.

스크롤 축에 matchContents를 적용하면 무한 크기 제약을 전달해 LazyRow/LazyColumn/Carousel/스크롤 modifier가 실패할 수 있다. 해당 축에 유한한 최대 크기를 제공하거나 그 축의 내용 크기 맞추기를 해제한다.

```tsx
<Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
  <LazyRow>{items.map(x => <Text key={x.id}>{x.label}</Text>)}</LazyRow>
</Host>
```

## RNHostView 경계

RNHostView는 Compose 부모와 Yoga shadow node의 크기를 동기화한다. `children`은 필수 단일 ReactElement다. 여러 RN 자식은 하나의 View로 묶는다. `matchContents` 기본 false는 mount 시 한 번 정하며, true이면 RN 자식의 본래 크기로 부모를 맞추고 false이면 Compose 부모 크기에 RN 영역을 채운다. `modifiers`, RN ViewStyle의 `style`, 기본 컴포넌트 속성도 받는다.

고정 50×50 자식은 matchContents, flex:1 자식은 유한한 부모 크기와 false를 조합한다. style은 RN shadow node 위치에도 적용되므로 화면의 위치와 RN 측정, 터치 판정 위치가 일치하는지 확인한다.

ModalBottomSheet 안에서도 사용할 수 있다. 짧은 내용은 matchContents로 맞추고, 스크롤 내용은 높이가 정해진 Column 안에 RN flex 영역을 넣는다. sheet를 닫을 때는 native hide 애니메이션을 기다린 뒤 unmount한다.

## 출처

- [Expo Documentation, Jetpack Compose](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose)
- [Expo Documentation, Host](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/host)
- [Expo Documentation, RNHostView](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/rnhostview)

## 관련 문서

- [[Expo-UI-Architecture]]
- [[Expo-Compose-Layout]]
- [[Expo-Compose-Colors]]
