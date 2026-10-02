---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 제스처, 애니메이션과 키보드"]
---

# Expo 제스처, 애니메이션과 키보드

## GestureHandler

`react-native-gesture-handler`는 복잡한 터치와 제스처 인식을 위한 네이티브 기능을 노출한다. Android, iOS, 웹과 Expo Go를 지원하고 `npx expo install react-native-gesture-handler`로 설치한다. 인식 로직을 네이티브 쪽에서 처리하는 점과 모든 앱 콜백이 같은 스레드에서 실행된다는 주장은 구분한다.

Expo reference는 호환 설치와 역할을 안내한다. 제스처 조합, 루트 구성과 이벤트 API는 설치 버전의 Gesture Handler reference를 함께 확인한다.

## Reanimated

`react-native-reanimated`는 shared value와 animated style로 애니메이션을 선언한다. Android, iOS, tvOS, 웹과 Expo Go에서 사용한다.

```sh
npx expo install react-native-reanimated react-native-worklets
```

`babel-preset-expo`를 쓰는 구성에서는 라이브러리 설치에 따라 Babel plugin이 자동 구성된다. 임의로 중복 plugin을 추가하기 전에 preset 사용 여부부터 확인한다.

```tsx
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';

const Grow = () => {
  const width = useSharedValue(40);
  const style = useAnimatedStyle(() => ({
    width: withTiming(width.value, { duration: 300 }),
  }));
  return <Animated.View style={[{ height: 40 }, style]} />;
};
```

이 예제에서 `width.value`의 변경을 애니메이션으로 반영한다. 값 변경 트리거는 앱에서 연결한다. JavaScriptCore의 Remote JS Debugging과 호환되지 않으므로 Hermes와 해당 JavaScript Inspector를 사용한다.

## KeyboardController

`react-native-keyboard-controller`는 Android와 iOS에서 키보드에 반응하는 UI를 구성하며 Expo Go에 포함된다. `npx expo install react-native-keyboard-controller`로 설치한다.

`KeyboardAwareScrollView`는 입력 필드를 키보드 위로 보이도록 스크롤하는 데 사용한다. `bottomOffset`은 추가 여백을 지정하며 `KeyboardToolbar`는 키보드 탐색 도구 모음을 제공한다. 실제 앱의 provider 설정과 애니메이션 의존성은 패키지 설치 지침 및 키보드 가이드와 대조한다.

여러 TextInput이 있는 폼에서 키보드 표시, 다음 입력 이동, 마지막 필드의 가림 여부를 Android와 iOS에서 각각 확인한다. 플랫폼 간 일관된 API가 OS 키보드 동작까지 같다는 의미는 아니다.

## Screens

`react-native-screens`는 일반 View보다 OS 화면 동작에 적합한 네이티브 화면 primitive를 제공한다. Android, iOS, tvOS, 웹과 Expo Go를 지원하며 `npx expo install react-native-screens`로 설치한다.

주로 내비게이션 라이브러리 내부에서 사용한다. React Navigation의 `createNativeStackNavigator`에도 필요한 네이티브 구성요소다. 일반 앱에서 직접 화면 전환 엔진을 만들기보다 사용하는 내비게이터의 설치 요구를 따른다.

## 출처

- [Expo Documentation, react-native-gesture-handler](https://docs.expo.dev/versions/latest/sdk/gesture-handler)
- [Expo Documentation, react-native-reanimated](https://docs.expo.dev/versions/latest/sdk/reanimated)
- [Expo Documentation, react-native-keyboard-controller](https://docs.expo.dev/versions/latest/sdk/keyboard-controller)
- [Expo Documentation, react-native-screens](https://docs.expo.dev/versions/latest/sdk/screens)

## 관련 문서

- [[Expo-Third-Party-Libraries]]

- [[Expo]]
