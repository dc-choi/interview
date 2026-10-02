---
tags: [expo, react-native, visual]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose Material 색 팔레트"]
---

# Compose Material 색 팔레트

Compose Host는 Material 3 팔레트를 하위 컴포넌트에 적용한다. seed가 없을 때 Android 12 이상은 배경화면에서 만든 Dynamic Colors, Android 11 이하는 정적 Material 기본 팔레트를 쓴다. `seedColor`를 전달하면 모든 Android 버전에서 SchemeTonalSpot 알고리즘으로 seed 기반 팔레트를 만들며 배경화면에 의존하지 않는다.

## Host와 조회 방법

```tsx
<Host seedColor="#8E24AA" colorScheme="dark" matchContents>
  <PaletteContent />
</Host>
function PaletteContent() {
  const colors = useMaterialColors();
  return <Text color={colors.onSurface}>브랜드 테마</Text>;
}
```

인자 없는 `useMaterialColors()`는 Host 내부에서 해당 Host의 팔레트를 받는다. 팔레트 객체 참조가 안정적이며 재렌더마다 네이티브 브리지를 건너지 않는다. 명시적 옵션은 Host 밖에서도 팔레트를 계산할 수 있다. 팔레트를 조회하는 것만으로 다른 Host의 테마를 바꾸지는 않는다.

| API | 옵션 |
| --- | --- |
| `useMaterialColors` | `{ colorScheme, seedColor }`. colorScheme은 light/dark, unspecified/null/생략은 시스템 |
| `getMaterialColors` | `{ scheme, seedColor }`. scheme은 light/dark, 생략은 시스템 |
| `isDynamicColorAvailable` | Android 12 이상 Dynamic Colors 지원 boolean |

```tsx
const dark = useMaterialColors({ colorScheme: 'dark' });
const brand = getMaterialColors({ scheme: 'dark', seedColor: '#8E24AA' });
```

함수 옵션 이름 `scheme`과 hook 옵션 `colorScheme`은 다르다. `isDynamicColorAvailable=false`여도 seed 기반 팔레트는 생성할 수 있다. 반환 색은 대문자 `#RRGGBBAA` 형태이며 RN `ColorValue`와 호환된다.

## 역할별 전체 팔레트

| 역할 | 필드와 사용 |
| --- | --- |
| 주요 행동 | `primary`, `onPrimary`, `primaryContainer`, `onPrimaryContainer` |
| 보조 강조 | `secondary`, `onSecondary`, `secondaryContainer`, `onSecondaryContainer`. 선택 제어, 링크 등 |
| 추가 강조 | `tertiary`, `onTertiary`, `tertiaryContainer`, `onTertiaryContainer` |
| 오류 | `error`, `onError`, `errorContainer`, `onErrorContainer` |
| 배경 | `background`, `onBackground` |
| 표면 | `surface`, `onSurface`, `surfaceVariant` |
| 밝기 | `surfaceBright`, `surfaceDim` |
| 표면 컨테이너 | `surfaceContainerLowest`, `surfaceContainerLow`, `surfaceContainer`, `surfaceContainerHigh`, `surfaceContainerHighest`, 강조도에 맞춘 단계 |
| 표면 elevation | `surfaceTint`, tonal elevation이 높을수록 표면에 적용 |
| 반전 표면 | `inverseSurface`, `inverseOnSurface`, `inversePrimary`, snackbar 같은 반전 영역 |
| 경계와 가림 | `outline`, `outlineVariant`, `scrim` |
| primary 고정 | `primaryFixed`, `primaryFixedDim`, `onPrimaryFixed`, `onPrimaryFixedVariant` |
| secondary 고정 | `secondaryFixed`, `secondaryFixedDim`, `onSecondaryFixed`, `onSecondaryFixedVariant` |
| tertiary 고정 | `tertiaryFixed`, `tertiaryFixedDim`, `onTertiaryFixed`, `onTertiaryFixedVariant` |

`on*`은 해당 바탕 위의 텍스트와 아이콘 색이다. fixed 역할은 light/dark에서 같은 tone을 유지한다. dim은 더 강조된 바탕, onFixedVariant는 강조가 덜한 내용이다. 대비가 필요한 경계는 outline, 장식 경계는 outlineVariant를 사용한다.

## 출처

- [Expo Documentation, Material Colors](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/colors)

## 관련 문서

- [[Expo-Compose-Host]]
- [[Expo-Compose-Surfaces]]
