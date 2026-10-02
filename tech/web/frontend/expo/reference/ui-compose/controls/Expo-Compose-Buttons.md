---
tags: [expo, react-native, controls]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Material3 Button, IconButton과 ToggleButton"]
---

# Material3 Button, IconButton과 ToggleButton



## 행동의 강조 수준

Button은 채운 주요 행동, FilledTonalButton은 색조로 강조한 행동, ElevatedButton은 그림자 강조, OutlinedButton은 보조 행동, TextButton은 낮은 강조에 사용한다. 다섯 종류는 필수 children과 선택적 onClick, enabled(기본 true), modifiers, shape(ShapeJSXElement), colors, contentPadding을 공유한다. contentPadding의 start/top/end/bottom dp는 버튼 내부 간격이며 modifier 패딩의 배치 효과와 구분한다.

ButtonColors는 containerColor/contentColor/disabledContainerColor/disabledContentColor의 선택적 ColorValue다. shape는 Shape.RoundedCorner의 cornerRadii 등으로 정한다. 원문의 아이콘과 라벨 예제는 18dp 아이콘과 8dp 간격을 사용한다.

```tsx
<Button onClick={save} enabled={!saving}
  colors={{ containerColor: '#6200EE', contentColor: 'white' }}>
  <Icon source={addIcon} size={18} />
  <Spacer modifiers={[width(8)]} /><Text>저장</Text>
</Button>
```

IconButton은 기본 배경이 없는 아이콘 행동이다. FilledIconButton/FilledTonalIconButton/OutlinedIconButton도 필수 children과 onClick/enabled/modifiers/shape/colors를 공유한다. colors는 버튼과 같은 바탕/내용/비활성 쌍이다. 보통 24dp 아이콘에 contentDescription으로 접근성 설명을 제공한다. native 버튼에 Universal의 label/variant/onPress를 적용하지 않는다.

## 선택 상태 버튼

ToggleButton/IconToggleButton/FilledIconToggleButton/OutlinedIconToggleButton은 checked boolean과 children이 필수다. 선택적 onCheckedChange(boolean), enabled(기본 true), colors, modifiers를 받으며 앱이 checked를 갱신한다. ToggleButtonColors는 containerColor/contentColor, checkedContainerColor/checkedContentColor, disabledContainerColor/disabledContentColor다.

```tsx
<ToggleButton checked={favorite} onCheckedChange={setFavorite}>
  <Text>즐겨찾기</Text>
</ToggleButton>
```

ToggleButton.DefaultIconSize는 Material 기본 아이콘 크기를 제공한다. 일반 행동과 선택 상태를 구분하고 비활성/선택 색의 대비를 확인한다. 클릭 callback 호출이 작업 성공을 의미하지 않으므로 대기와 오류 표시는 앱 상태로 관리한다.

## 출처

- [Expo Documentation, Button](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/button)
- [Expo Documentation, IconButton](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/iconbutton)
- [Expo Documentation, ToggleButton](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/togglebutton)

## 관련 문서

- [[Expo-Compose-Host]]
- [[Expo-Compose-Selection]]
- [[Expo-Compose-Icons]]
