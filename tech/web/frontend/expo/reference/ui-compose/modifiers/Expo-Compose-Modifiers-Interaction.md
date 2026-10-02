---
tags: [expo, react-native, modifiers]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose modifier의 입력과 관측"]
---

# Compose modifier의 입력과 관측

상호작용 modifier는 Compose 입력과 접근성 의미를 연결한다. 이미 행동 callback이 있는 컴포넌트에 겹쳐 적용할 때 입력 중복을 피한다.

## 클릭과 선택

| 함수 | 계약 |
| --- | --- |
| `clickable(handler, options?)` | 클릭 callback. options.indication은 ripple 설정 |
| `combinedClickable(handlers, options?)` | onClick/onLongClick. 사용 가이드에서 선택적 handler로 설명하며 API 표에는 두 함수가 표시된다. indication 기본 true |
| `selectable(selected,handler,role?)` | 선택 상태, 클릭 callback, switch/checkbox/tab/radioButton 역할 |
| `toggleable(value,handler,options?)` | boolean 현재 상태, 인자 없는 토글 callback, options.role |
| `selectableGroup()` | Row/Column의 자식을 접근성 선택 그룹으로 표시 |
| `semantics({contentType})` | 의미 정보 전달 |
| `testID(tag)` | 테스트 프레임워크 식별자 |

```tsx
<Row modifiers={[selectableGroup()]}>
  {options.map(option => <Text key={option.id} modifiers={[
    selectable(selected === option.id, () => setSelected(option.id), 'radioButton'),
    testID(`option-${option.id}`),
  ]}>{option.label}</Text>)}
</Row>
```

toggleable callback은 새 boolean을 전달하지 않는다. 현재 값을 기반으로 앱 상태를 갱신한다. 전체 행을 누르게 할 때 내부 Checkbox/Switch 자체 입력과 이중 행동이 발생하지 않도록 구성한다. combinedClickable은 짧은 클릭과 긴 클릭을 구분해 메뉴를 여는 패턴에 적합하다.

## 측정과 가시성

`onGloballyPositioned(handler)`는 `{x,y,width,height}`를 dp로 전달하며 x/y는 window 기준이다. `onSizeChanged(handler)`는 측정 크기가 바뀔 때 `{width,height}` dp를 전달한다. RN 부모 상대 좌표로 바로 해석하지 않는다.

`onVisibilityChanged(handler, {minDurationMs,minFractionVisible}?)`는 lazy viewport 진입/이탈 등 가시성 변경을 boolean으로 알린다. 최소 시간과 최소 노출 비율을 옵션으로 지정한다. callback 발생만으로 사용자의 실제 시선이나 관심을 증명하지 않는다.

```tsx
<Text modifiers={[onVisibilityChanged(visible => recordVisibility(visible), {
  minDurationMs: 500, minFractionVisible: 0.5,
})]}>추천 항목</Text>
```

## JSON 설정과 custom event

`ModifierConfig`는 `$type:string`, 선택적 `$scope:string`을 포함하는 JSON 설정이다. 예전 SharedRef 방식 ExpoModifier는 deprecated alias이므로 새 코드는 ModifierConfig를 사용한다.

`createModifier(type,params?)`는 설정만 만든다. `createModifierWithEventListener(type,eventListener,params?)`는 event callback도 연결한다. custom native view wrapper는 `createViewModifierEventListener(modifiers)`가 반환한 GlobalEvent props를 view에 전달해야 이벤트 기반 modifier가 작동한다. Registry 등록과 JS wrapper를 함께 확인하는 절차는 확장 문서를 따른다.

## 출처

- [Expo Documentation, Modifiers](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/modifiers)

## 관련 문서

- [[Expo-Compose-Modifiers-Layout]]
- [[Expo-Compose-Modifiers-Visual]]
- [[Expo-Compose-Extending]]
