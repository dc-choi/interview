---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI modifier, animation과 symbol effect"]
---

# Expo SwiftUI modifier, animation과 symbol effect

## Animation value와 chaining

animation(Animation preset, animatedValue:number|boolean)은 해당 값 변화와 연관된 view 변화를 animate한다. Animation.default 또는 easeInOut/easeIn/easeOut/linear({duration?}) timing preset을 사용한다. duration 단위는 seconds다. spring({duration,bounce,response,dampingFraction,blendDuration}?)과 interpolatingSpring({duration,bounce,mass,stiffness,damping,initialVelocity}?)는 각각 spring 모형 options를 받는다. 생략 가능한 필드는 원하는 preset만 지정한다.

ChainableAnimationType의 `.delay(seconds)`는 시작을 미루고 `.repeat({repeatCount,autoreverses})`는 반복한다. 함수는 새 chainable animation을 반환한다. 서로 다른 spring parameter군을 아무 의미 없이 모두 혼합하지 않고 원하는 모델의 계약에 맞춰 선택한다.

contentTransition(type,params?)은 iOS/tvOS16+의 content 교체 효과다. opacity/identity/interpolate/numericText가 있고 numericText의 countsDown을 지정할 수 있다. animation을 함께 지정하여 숫자 내용 변화에 효과를 준다. matchedGeometryEffect(id,namespaceId)는 같은 Namespace 안의 geometry를 연결한다. glassEffectId는 GlassEffectContainer의 Liquid Glass identity를 연결하는 별도 modifier다.

```tsx
import { Host, Text } from '@expo/ui/swift-ui';
import { animation, Animation, contentTransition, monospacedDigit } from '@expo/ui/swift-ui/modifiers';
export function AnimatedCount({ count }: { count: number }) {
  return <Host matchContents><Text modifiers={[monospacedDigit(),
    contentTransition('numericText'), animation(Animation.easeInOut({ duration: 0.3 }), count)]}>
    {String(count)}
  </Text></Host>;
}
```

## SymbolEffect trigger

symbolEffect(effect,args?)는 iOS/tvOS17+이며 SF Symbol이 지원하는 시각 효과를 적용한다. effect union은 appear/disappear/bounce/breathe/drawOn/drawOff/pulse/rotate/scale/variableColor/wiggle 계열이다. effect 종류마다 더 최신 OS에서 도입된 경우가 있어 broad method 지원만으로 모두 17에서 사용 가능하다고 단정하지 않는다. generated 문서는 모든 하위 effect별 필드를 펼쳐 설명하지 않는다.

기본 호출은 연속 실행을, args.value ObservableState<number|string|boolean>는 값이 바뀔 때의 discrete trigger를, args.isActive ObservableState<boolean>는 true 동안의 연속 effect를 연결한다. value와 isActive의 서로 다른 의미에 맞춰 사용한다. 예제의 bounce는 direction:'up', variableColor는 fillStyle:'iterative'/playbackStyle:'reversing'을 사용한다.

```tsx
import { Host, Image, Button, VStack, useNativeState } from '@expo/ui/swift-ui';
import { symbolEffect } from '@expo/ui/swift-ui/modifiers';
import { scheduleOnUI } from 'react-native-worklets';
export function BounceBell() {
  const trigger = useNativeState(0);
  return <Host matchContents><VStack>
    <Image systemName="bell.fill" modifiers={[
      symbolEffect({ effect: 'bounce', direction: 'up' }, { value: trigger }),
    ]} />
    <Button label="반응" onPress={() => scheduleOnUI(() => {
      'worklet'; trigger.set(trigger.get() + 1);
    })} />
  </VStack></Host>;
}
```

options.speed는 배속(default1), options.repeat는 natural cadence를 쓰려면 생략한다. nonRepeating은 한 번, continuous는 무한 연속 반복(iOS18+), `{count?,delay?}`는 주기 반복(iOS18+, delay seconds)이다. continuous와 count 반복을 같은 값으로 전달하지 않는다. native state hook의 listener와 UI worklet 수명은 [[Expo-UI-Swift-NativeState]]를 따른다.

## 출처

- [Expo Documentation, Modifiers](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/modifiers)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
