---
tags: [expo, react-native, controls]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Material3 Chips와 Badge overlay"]
---

# Material3 Chips와 Badge overlay



## Chip의 역할과 슬롯

AssistChip은 행동, FilterChip은 콘텐츠 필터 선택, InputChip은 입력한 태그와 제거, SuggestionChip은 맥락에 맞는 제안에 쓴다. 모두 필수 children과 선택적 border/colors/elevation(dp)/enabled/modifiers/onClick을 받는다. Assist/Input/Suggestion의 enabled 기본은 true이며 Filter 원문에는 기본값이 명시되지 않는다.

Filter의 selected는 필수 boolean, Input의 selected는 선택적이며 기본 false다. 선택 토글과 입력 삭제는 onClick에서 앱 상태로 처리한다. 닫기 아이콘을 넣었다고 그 아이콘만의 삭제 callback이 자동으로 생기지는 않는다.

Assist/Filter는 Label/LeadingIcon/TrailingIcon, Input은 Label/Avatar/TrailingIcon, Suggestion은 Label/Icon 슬롯을 제공한다. 여러 Chip은 FlowRow로 줄바꿈한다.

```tsx
<FilterChip selected={imagesOnly} onClick={() => setImagesOnly(v => !v)}>
  <FilterChip.Label><Text>이미지</Text></FilterChip.Label>
</FilterChip>
```

ChipBorder의 width 기본은 1dp, color는 선택적 ColorValue다. Assist 색은 containerColor/labelColor/leadingIconContentColor/trailingIconContentColor, Suggestion 색은 containerColor/labelColor/iconContentColor다. Filter는 containerColor/labelColor/iconColor, Input은 containerColor/labelColor/leadingIconColor/trailingIconColor가 기본 색이다. 두 종류 모두 selectedContainerColor/selectedLabelColor/selectedLeadingIconColor/selectedTrailingIconColor를 추가로 제공한다. 각 공개 필드는 선택적 ColorValue다.

## Badge와 BadgedBox

Badge는 자식이 없으면 점, Text 자식이 있으면 개수나 라벨을 표시한다. children/containerColor/contentColor/modifiers가 선택적이며 기본 색은 BadgeDefaults다. BadgedBox의 자식은 주요 내용과 BadgedBox.Badge 슬롯이며 modifiers도 선택적이다.

```tsx
<BadgedBox>
  <BadgedBox.Badge>
    {count > 0 ? <Badge><Text>{String(count)}</Text></Badge> : null}
  </BadgedBox.Badge>
  <Icon source={mailIcon} size={24} />
</BadgedBox>
```

개수가 0이면 숨기는 조건은 앱 정책이다. 점과 숫자가 뜻하는 상태를 정하고 아이콘 설명과 배지 개수의 접근성을 함께 확인한다. RN absolute 위치로 대체하면 Compose/RN 경계와 터치 판정 위치도 고려해야 한다.

## 출처

- [Expo Documentation, Chip](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/chip)
- [Expo Documentation, Badge](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/badge)
- [Expo Documentation, BadgedBox](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/badgedbox)

## 관련 문서

- [[Expo-Compose-Layout]]
- [[Expo-Compose-Icons]]
