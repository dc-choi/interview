---
tags: [expo, react-native, controls]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Checkbox, Switch, Radio와 Segmented selection"]
---

# Checkbox, Switch, Radio와 Segmented selection



## Boolean과 세 가지 상태

Checkbox는 필수 value boolean과 선택적 onCheckedChange(boolean), enabled(기본 true), colors, modifiers를 받는다. TriStateCheckbox는 필수 state(on/off/indeterminate)와 선택적 onClick/enabled/colors/modifiers로 전체 선택의 부분 선택 상태를 표현한다. 모두 선택이면 on, 하나도 없으면 off, 일부 선택이면 indeterminate로 계산한다.

부모 Row에 `toggleable(value,callback,{role:'checkbox'})`를 넣으면 라벨까지 누를 수 있다. 이때 자식 Checkbox의 onCheckedChange나 TriState의 onClick을 생략해 행동 중복을 피한다. 부분 상태에서 전체 선택으로 바꿀지 해제할지는 앱 정책이다.

CheckboxColors는 checkedColor/checkmarkColor/uncheckedColor/disabledCheckedColor/disabledIndeterminateColor/disabledUncheckedColor이며 모두 선택적 ColorValue다. 시각적 비활성과 업무상의 유효성 검증을 구분한다.

Switch도 필수 value와 선택적 onCheckedChange/enabled/colors/modifiers/children을 받는다. Switch.ThumbContent 슬롯에 Switch.DefaultIconSize에 맞춘 아이콘이나 Box를 넣는다. SwitchColors는 checked/unchecked/disabledChecked/disabledUnchecked 각각 BorderColor/IconColor/ThumbColor/TrackColor, 총 16개 필드다. 라벨은 Row나 ListItem 슬롯으로 조합한다.

## Radio 그룹

RadioButton은 필수 selected와 선택적 onClick/modifiers를 받는다. 한 항목만 고르려면 부모 selectedOption을 공유한다. Column의 selectableGroup과 Row의 selectable로 그룹 의미와 넓은 터치 영역을 만들고 자식 onClick은 생략한다.

```tsx
<Column modifiers={[selectableGroup()]}>
  {options.map(option => <Row key={option} modifiers={[
    selectable(selected === option, () => setSelected(option), 'radioButton'),
  ]}>
    <RadioButton selected={selected === option} /><Text>{option}</Text>
  </Row>)}
</Column>
```

단독 boolean을 뒤집는 예제만으로 상호 배타적 Radio 그룹이 구현되는 것은 아니다.

## Segmented 선택

SingleChoiceSegmentedButtonRow/MultiChoiceSegmentedButtonRow는 필수 children과 선택적 modifiers를 받는다. SegmentedButton은 반드시 둘 중 하나 안에 둔다. single은 selected/onClick, multi는 checked/onCheckedChange를 사용한다. 선택적 children(Label 슬롯), enabled(기본 true), colors, modifiers도 받는다. 부모 React 상태가 하나의 선택 인덱스 또는 독립 boolean을 관리한다.

SegmentedButtonColors는 active/inactive/disabledActive/disabledInactive 각각 BorderColor/ContainerColor/ContentColor, 총 12개 필드다. Label 슬롯으로 라벨을 구성하고 안정적인 key를 둔다. 선택지가 많아 한 행을 넘치면 다른 선택 UI를 검토한다.

## 출처

- [Expo Documentation, Checkbox](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/checkbox)
- [Expo Documentation, Switch](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/switch)
- [Expo Documentation, RadioButton](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/radiobutton)
- [Expo Documentation, SegmentedButton](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/segmentedbutton)

## 관련 문서

- [[Expo-Compose-Buttons]]
- [[Expo-Compose-Modifiers-Interaction]]
