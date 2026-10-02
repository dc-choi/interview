---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 외부 그래픽과 화면 캡처"]
---

# Expo 외부 그래픽과 화면 캡처

## MaskedView

`@react-native-masked-view/masked-view`는 마스크와 겹치는 영역에 자식 콘텐츠를 표시한다. Android, iOS, tvOS와 Expo Go에서 제공하지만 Android 지원은 실험적이며 iOS와 동작 차이가 있을 수 있다.

`npx expo install @react-native-masked-view/masked-view`로 설치한다. 이전 `@react-native-community/masked-view`와 두 패키지를 동시에 설치하지 않는다. React Navigation 6 이상은 새 scope 패키지를 사용한다. `@expo/ui`에도 MaskedView 대체 컴포넌트가 있다.

## FlashList

`@shopify/flash-list`는 셀을 재사용하는 목록 컴포넌트로 FlatList 대안이다. Android, iOS, tvOS, 웹과 Expo Go를 지원한다. `npx expo install @shopify/flash-list`로 설치한다.

재사용 방식은 렌더링 비용을 줄일 수 있지만 앱의 데이터와 셀 복잡도에 따라 결과가 달라진다. 전환 전에 실제 긴 목록의 스크롤과 셀 상태를 확인한다. 구체적인 props와 마이그레이션 계약은 설치 버전의 FlashList 문서를 따른다.

## Skia

`@shopify/react-native-skia`는 Skia 기반 그래픽을 React Native에 노출한다. Android, iOS, tvOS, 웹과 Expo Go를 지원한다. `npx expo install @shopify/react-native-skia`로 설치한다.

웹은 패키지 설치만으로 끝나지 않는다. CanvasKit 로딩을 포함한 별도 웹 구성이 필요하다. 네이티브 그래픽 사용 예제를 웹에서도 그대로 실행할 수 있다고 가정하지 않는다.

## SVG

`react-native-svg`는 Android, iOS, macOS, tvOS, 웹과 Expo Go에서 벡터 그래픽 요소를 제공한다. `npx expo install react-native-svg`로 설치한다. `Svg`를 좌표계로 두고 `Circle`, `Rect`, `Path`, `ClipPath`, `Polygon` 등을 조합한다.

```tsx
import Svg, { Circle } from 'react-native-svg';

const Dot = () => (
  <Svg width={40} height={40} viewBox="0 0 40 40">
    <Circle cx={20} cy={20} r={16} fill="navy" />
  </Svg>
);
```

SVG를 최적화할 때 Android 표시를 위해 `viewBox`를 보존한다. SVG 파일을 React Native 컴포넌트로 변환할 때는 native 출력 옵션을 확인한다.

## ViewShot

`react-native-view-shot`은 Android와 iOS의 View를 이미지로 캡처하며 Expo Go에 포함된다. `npx expo install react-native-view-shot`으로 설치한다. `captureRef`는 View ref와 출력 옵션을 받아 캡처 결과를 비동기로 반환한다.

```ts
import { PixelRatio } from 'react-native';
import { captureRef } from 'react-native-view-shot';

const size = 1080 / PixelRatio.get();
const uri = await captureRef(viewRef, {
  result: 'tmpfile', width: size, height: size,
  format: 'png', quality: 1,
});
```

UI의 논리 픽셀과 이미지의 물리 픽셀을 구분해야 한다. 위 예제는 1080 × 1080 이미지용 크기를 계산한다. 임시 파일 반환과 사진 보관함 저장은 별도 작업이다. GLView 캡처에는 GLView의 `takeSnapshotAsync`를 사용한다.

## 출처

- [Expo Documentation, @react-native-masked-view/masked-view](https://docs.expo.dev/versions/latest/sdk/masked-view)
- [Expo Documentation, @shopify/flash-list](https://docs.expo.dev/versions/latest/sdk/flash-list)
- [Expo Documentation, @shopify/react-native-skia](https://docs.expo.dev/versions/latest/sdk/skia)
- [Expo Documentation, react-native-svg](https://docs.expo.dev/versions/latest/sdk/svg)
- [Expo Documentation, react-native-view-shot](https://docs.expo.dev/versions/latest/sdk/captureRef)

## 관련 문서

- [[Expo-Third-Party-Libraries]]

- [[Expo]]
