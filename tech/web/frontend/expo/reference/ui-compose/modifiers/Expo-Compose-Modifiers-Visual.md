---
tags: [expo, react-native, modifiers]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose modifier의 모양과 애니메이션"]
---

# Compose modifier의 모양과 애니메이션

시각 modifier도 배열 순서를 따른다. `background(color, {animationSpec}?)`는 ColorValue를 받으며 옵션을 지정하면 값 변경을 animateColorAsState로 보간한다. `border(width,color)`는 dp 경계, `alpha(0~1)`는 투명도, `blur(radius)`는 dp 흐림, `rotate(degrees)`는 회전이다.

## Shape와 그림자

`clip(shape)`는 경계 밖 내용을 그리지 않는다. shape는 `Shapes.Rectangle`, `Shapes.Circle`, `Shapes.RoundedCorner(radius)`, `Shapes.CutCorner(radius)`다. corner는 숫자 또는 topStart/topEnd/bottomStart/bottomEnd 객체다. 내부 설정은 rectangle/circle/roundedCorner/cutCorner/material의 JSON이며 컴포넌트 `shape` prop에서 사용하는 Shape JSX와 구분한다.

Material shape는 `Shapes.Material`의 Arch, Boom, Bun, Clover4Leaf, Clover8Leaf, Cookie4Sided, Cookie6Sided, Cookie7Sided, Cookie9Sided, Cookie12Sided, Diamond, Fan, Ghostish, Heart, Oval, Pentagon, Pill, PixelCircle, PixelTriangle, Puffy, PuffyDiamond, Slanted, SoftBurst, Sunny, Triangle, VerySunny를 제공한다.

`shadow(elevation)`은 dp elevation 기반 그림자다. `dropShadow(shape,config?)`는 뒤쪽, `innerShadow(shape,config?)`는 안쪽 그림자다. config 기본은 빈 객체이며 `radius`(blur dp), `spread`(양수 확장/음수 축소 dp), `offsetX/Y` dp, `color`(기본 black), `alpha` 0~1을 지정한다. innerShadow는 background 뒤에 놓아야 보인다.

```tsx
const shape = Shapes.RoundedCorner(24);
<Box modifiers={[
  dropShadow(shape, { radius: 15, offsetX: -10, offsetY: -10, color: '#FFF' }),
  dropShadow(shape, { radius: 15, offsetX: 10, offsetY: 10, color: '#B1B1B1' }),
  background('#E0E0E0'),
]} />
```

밝고 어두운 두 dropShadow를 바탕 앞에 겹치면 돌출 효과, background 뒤의 두 innerShadow면 눌린 효과다. 강한 경계의 그림자는 radius/spread 0에 offset과 border를 조합한다. 이 이름들은 별도 API가 아니라 조합 예시다.

## 그래픽 레이어와 애니메이션

`graphicsLayer(params)`는 시각 변환과 합성을 담당한다. `alpha`, `rotationX/Y/Z`, `scaleX/Y`, `translationX/Y`, `shadowElevation`은 숫자 또는 `animated(targetValue,spec?)`를 받는다. `ambientShadowColor`, `spotShadowColor`, `shape`, `clip`, `cameraDistance`, `transformOriginX/Y`, `compositingStrategy`(auto/offscreen/modulate)는 레이어 옵션이다.

| AnimationSpec 생성 | 매개변수 |
| --- | --- |
| `spring(params?)` | dampingRatio, stiffness, visibilityThreshold |
| `tween(params?)` | delayMillis, durationMillis, easing |
| `snap(params?)` | delayMillis |
| `keyframes(params)` | delayMillis, durationMillis, 숫자 시간→숫자 값의 keyframes record |

tween easing은 linear/ease/fastOutSlowIn/fastOutLinearIn/linearOutSlowIn이다. `animated`는 `$animated:true`, targetValue, animationSpec JSON을 만들어 해당 숫자 속성에 전달한다.

```tsx
<Box modifiers={[graphicsLayer({
  alpha: animated(visible ? 1 : 0, tween({ durationMillis: 200 })),
  scaleX: animated(expanded ? 1 : 0.9, spring({ dampingRatio: 0.8 })),
})]} />
```

`animateContentSize(dampingRatio?,stiffness?)`는 내용 크기 변경을 spring으로 애니메이션화한다. 기본은 DampingRatioNoBouncy와 StiffnessMedium이다. 레이어 변환은 그리기 효과이고 내용 측정 변경의 animateContentSize와 목적이 다르다.

## 출처

- [Expo Documentation, Modifiers](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/modifiers)

## 관련 문서

- [[Expo-Compose-Modifiers-Layout]]
- [[Expo-Compose-Modifiers-Interaction]]
- [[Expo-Compose-Surfaces]]
