---
tags: [expo, react-native, layout]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Universal Row, Column과 Spacer layout"]
---

# Universal Row, Column과 Spacer layout

## Main axis와 cross axis

Column은 Android Column/iOS VStack/web flex View로 top-to-bottom children을 배치한다. Row는 Android Row/iOS HStack/web flex View로 start-to-end 배치한다. Native 내부는 일반 RN flexbox가 아니라 toolkit layout다.

| API | 기본값/타입 | 의미 |
| --- | --- | --- |
| Row/Column.children | ReactNode optional | 순서대로 render |
| Row/Column.spacing | number optional | main-axis child 간 dp 간격 |
| Row/Column.alignment | start(center/end 지원), default start | cross-axis 정렬 |
| Spacer.size | number optional | Row에서는 width, Column에서는 height |
| Spacer.flexible | boolean false | 남은 main-axis 공간을 채워 siblings를 밀어냄 |

Column alignment는 horizontal, Row alignment는 vertical이다. Row에서 leading/trailing을 양끝으로 벌리려면 사이에 Spacer flexible을 넣고 parent가 충분한 width를 제안해야 한다. shrink-to-content Host 안에서는 남은 공간이 작아 flexible spacer 효과가 없을 수 있다.

```tsx
<Host matchContents={{vertical:true}} style={{width:'100%'}}>
  <Row alignment="center" spacing={8}>
    <Text>Title</Text><Spacer flexible /><Button label="Edit" onPress={edit} />
  </Row>
</Host>
```

fixed Spacer size32는 vertical gap32 또는 horizontal gap32다. 모든 children 사이 동일 gap이면 container spacing을 사용하고 일부 gap만 다르면 Spacer를 넣는다. Spacer는 content가 없는 layout primitive이고 Row/Column/Spacer 모두 common presentation을 제공한다. RTL start/end와 text direction은 Host layoutDirection을 기준으로 확인한다.

## 공통 presentation 계약

이 컴포넌트의 `style`은 RN ViewStyle 전체가 아니라 padding(paddingHorizontal/Vertical/Top/Bottom/Left/Right), backgroundColor, borderRadius/Width/Color, opacity, width/height만 지원한다. native에서는 SwiftUI/Compose modifiers로 변환한다. Host 내부는 Yoga flexbox가 아니므로 flexDirection/alignItems 등을 일반 RN처럼 전달하지 않는다.

`disabled`, `hidden`은 interaction 비활성/표시 숨김, `onAppear`, `onDisappear`, `onPress`는 등장/제거/press callback, `testID`는 E2E 식별자다. `modifiers: ModifierConfig[]`는 Android/iOS의 platform escape hatch이며 style/props에서 만든 동일 type modifier를 대체한다. 잘못된 platform modifier와 web fallback의 실제 지원을 구분한다.

## 출처

- [Expo Documentation, Row](https://docs.expo.dev/versions/latest/sdk/ui/universal/row)
- [Expo Documentation, Column](https://docs.expo.dev/versions/latest/sdk/ui/universal/column)
- [Expo Documentation, Spacer](https://docs.expo.dev/versions/latest/sdk/ui/universal/spacer)

## 관련 문서

- [[Expo-UI-Host]]
- [[Expo-UI-Scroll]]
