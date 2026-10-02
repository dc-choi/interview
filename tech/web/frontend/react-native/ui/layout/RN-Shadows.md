---
tags: [react-native, style]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native 그림자의 box와 alpha mask

React Native 0.87 기준이다.

| API | 그림자 기준 | 플랫폼과 제약 |
|---|---|---|
| boxShadow | border box, inset 가능 | New Architecture, Android outset 9+, inset 10+ |
| filter dropShadow | alpha가 있는 pixel의 mask | Android 12+, inset/spread 없음 |
| shadowColor/Offset/Opacity/Radius | platform native shadow | Offset/Opacity/Radius는 iOS, Android color는 API 28+ |
| elevation | Android elevation과 z-order | Android 5+ |

## object value의 차이

BoxShadowValue는 필수 offsetX/offsetY와 선택 blurRadius/spreadDistance/color/inset을 가진다. blur는 음수가 아니며 spread는 크기를 늘리거나 줄인다. boxShadow는 문자열 또는 여러 object 배열로 여러 그림자를 구성한다.

DropShadowValue는 offsetX/offsetY와 선택 standardDeviation/color다. boxShadow의 blurRadius와 같은 field 이름으로 쓰지 않는다. 투명한 이미지 외곽과 사각 container 외곽은 다른 그림자가 생긴다.

```tsx
<View style={{boxShadow: [{
  offsetX: 0, offsetY: 4, blurRadius: 8,
  spreadDistance: 0, color: '#00000033',
}]}} />
```

설명 조각이며 실제 기기에서 검증하지 않았다. 필요가 단순하면 native shadow props로 충분할 수 있다. iOS shadowOpacity는 shadowColor alpha와 곱해지고 shadowOffset은 width/height 구조다. clipping, inset과 elevation의 z-order 부작용을 대상 OS에서 확인한다.

## 출처

- [React Native, shadow-props](https://reactnative.dev/docs/shadow-props)
- [React Native, boxshadowvalue](https://reactnative.dev/docs/boxshadowvalue)
- [React Native, dropshadowvalue](https://reactnative.dev/docs/dropshadowvalue)
- [React Native, view-style-props](https://reactnative.dev/docs/view-style-props)

## 관련 문서

- [[RN-Styling-Effects]]
- [[RN-Image-Presentation]]
- [[RN-View-Contracts]]
