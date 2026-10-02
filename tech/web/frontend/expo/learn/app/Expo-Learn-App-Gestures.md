---
tags: [expo, react-native, app]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 스티커의 double tap과 pan 제스처"]
---

# Expo 스티커의 double tap과 pan 제스처

## 입력과 animated state

Gesture Handler는 native touch system으로 tap/pan/rotation 등을 인식하고 Reanimated는 shared values와 animated styles로 transition을 처리한다. GestureHandlerRootView를 해당 tree의 상위에 두고 `flex: 1` 등의 container style을 유지한다.

sticker의 size와 X/Y translation은 React render마다 setState하지 않고 shared value로 보관한다. `Animated.Image`는 이 예제에서 React Native animated image이며 expo-image 컴포넌트를 이름만 바꾼 것은 아니다. `resizeMode: contain`으로 sticker 비율을 유지한다.

## Double tap과 pan

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { type ImageSourcePropType } from 'react-native';

export const Sticker = ({ source, imageSize = 40 }: {
  source: ImageSourcePropType; imageSize?: number;
}) => {
  const size = useSharedValue(imageSize);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const tap = Gesture.Tap().numberOfTaps(2).onStart(() => {
    size.value = size.value === imageSize ? imageSize * 2 : imageSize;
  });
  const pan = Gesture.Pan().onChange((event) => {
    x.value += event.changeX;
    y.value += event.changeY;
  });
  const imageStyle = useAnimatedStyle(() => ({
    width: withSpring(size.value), height: withSpring(size.value),
  }));
  const position = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));
  return <GestureDetector gesture={pan}>
    <Animated.View style={position}>
      <GestureDetector gesture={tap}>
        <Animated.Image source={source} resizeMode="contain" style={imageStyle} />
      </GestureDetector>
    </Animated.View>
  </GestureDetector>;
};
```

tap은 두 번 입력해야 시작하고 size를 기본/두 배로 전환한다. spring은 width/height 변화에 적용한다. pan의 changeX/changeY는 이전 event 이후 delta이므로 누적한다. translationX/Y 같은 전체 gesture 누적값과 혼동해 매 event 중복 누적하지 않는다.

바깥 detector는 container 이동, 안쪽 detector는 image double tap을 담당한다. 이 구조의 gesture competition은 실제 platform에서 테스트하고 simultaneous/exclusive behavior가 필요한 경우 library의 composition API로 명시한다.

## 사용 조건과 확장 경계

예제는 이동 범위를 제한하지 않아 sticker가 image 밖으로 나갈 수 있다. product에서 canvas 안에 가둬야 하면 현재 size와 canvas bounds로 위치를 clamp한다. 처음 source/size props가 바뀌면 기존 shared state를 유지할지 새 sticker state로 reset할지도 정의한다.

width/height animation은 layout 영향을 주므로 성능과 중심점 변화가 중요하면 scale transform을 검토한다. spring이 진행 중인 순간 save하면 중간 크기가 capture될 수 있다. export 시 animation settling과 image readiness를 확인한다.

Gesture Handler/Reanimated major와 SDK57 호환성을 Expo install/reference로 맞춘다. 화면에서 한 gesture가 보인다는 것만으로 web mouse/touch와 native device의 전체 동작을 검증한 것은 아니다.

## 출처

- [Expo Documentation, Add gestures](https://docs.expo.dev/tutorial/gestures)

## 관련 문서

- [[Expo-Learn-App-Modal]]
- [[Expo-Learn-App-Capture]]
- [[Expo-Home-Themes-Animation]]
