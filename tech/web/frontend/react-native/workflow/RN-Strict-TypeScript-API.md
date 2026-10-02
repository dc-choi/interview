---
tags: [react-native, workflow]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 0.87 Strict TypeScript API"]
---

# React Native 0.87 Strict TypeScript API

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 기본 활성화와 public API

Strict TypeScript API는 0.80부터 opt-in으로 제공됐고 **0.87에서는 기본 활성화**됐다. React Native 소스에서 생성한 타입으로 이전 수동 TypeScript 정의를 대체하며 `react-native` root index의 public API만 노출한다. 내부 경로 deep import를 허용하던 과거 타입 계약과 달라 breaking change가 될 수 있다.

React Native는 Flow로 작성돼 있고 이전 TypeScript 타입은 따로 관리돼 구현과 어긋날 수 있었다. 소스에서 생성하는 타입은 public export와 구현을 더 직접적으로 연결한다.

## runtime 변화와 분리

Strict API의 변경은 TypeScript가 어떤 타입 정의를 해석하는가다. 양쪽 모드는 같은 JavaScript를 해석하므로 이 설정 자체가 bundle을 변경하지 않는다. 다만 0.87에서 `react-native/src/private/*`가 package exports에서 제거된 별도 변경은 runtime resolution에 영향을 주며 Strict API와 구분해야 한다.

## 이행 준비와 일시 opt-out

프로젝트 자신의 tsconfig 범위에서 활성화된다. 일반적으로 앱과 라이브러리는 독립적으로 이행할 수 있다. `@react-native/typescript-config`가 기본 설정하는 `skipLibCheck`를 유지하면 dependency `.d.ts` 내부 오류를 해당 프로젝트의 오류와 분리할 수 있다.

```json
{
  "extends": "@react-native/typescript-config",
  "compilerOptions": {
    "customConditions": ["react-native", "react-native-legacy-deep-imports"]
  }
}
```

이 설정은 0.87에서 이전 수동 타입으로 일시적으로 돌아가는 경로다. 미래 release에서 제거할 예정이므로 영구 호환 계층으로 계획하지 않는다. 선택적 migration agent skill도 제공되지만 설치와 자동 수정은 타입 변경의 검증을 대신하지 않는다.

## dependency의 raw TypeScript 예외

앱이 import하는 dependency의 `.d.ts`와 raw `.ts`는 다르다. Jest setup 같은 raw TypeScript entrypoint는 소비자 프로젝트의 소스로 분석돼 deep import 오류를 일으킬 수 있다. 먼저 library의 수정 release를 확인한다. 페이지가 제시하는 수정 사례는 `@expensify/react-native-live-markdown` 0.1.335, `react-native-safe-area-context` 5.8.1이다.

임시 우회는 해당 subpath만 `paths`로 local declaration에 연결하는 방식이다.

```ts
// untyped-module.d.ts
// 해당 subpath의 실제 export 형태에 맞춰 작성한다.
declare const exportValue: unknown;
export default exportValue;
```

이 경로는 타입 검증 범위를 줄이는 local workaround다. library에 문제를 보고하고 upstream 수정 후 제거한다. library 저자는 raw source 대신 compiled output과 `.d.ts`를 제공해 소비자 분석 경계를 지킨다.

## CodegenTypes와 root import

```tsx
import {CodegenTypes, codegenNativeComponent} from 'react-native';
import type {ViewProps} from 'react-native';

interface NativeProps extends ViewProps {
  enabled?: CodegenTypes.WithDefault<boolean, true>;
  size?: CodegenTypes.Int32;
}

export default codegenNativeComponent<NativeProps>('RNCustomComponent');
```

`Int32`, `Double`, `WithDefault` 같은 Codegen 타입은 `CodegenTypes` namespace로 사용한다. `codegenNativeComponent`, `codegenNativeCommands`도 root에서 import한다. 이 root exports는 Strict API를 사용하지 않는 모드에도 제공돼 library의 점진 이행을 돕는다.

## ref는 component가 아니라 Instance 타입

built-in component는 Strict API에서 함수 타입이므로 `useRef<View>` 같은 클래스 기반 ref 타입을 쓰지 않는다.

```tsx
import {useRef} from 'react';
import {TextInput, View} from 'react-native';
import type {TextInputInstance, ViewInstance} from 'react-native';

const Form = () => {
  const viewRef = useRef<ViewInstance>(null);
  const inputRef = useRef<TextInputInstance>(null);
  return <View ref={viewRef}><TextInput ref={inputRef} /></View>;
};
```

`React.ComponentRef<typeof View>`도 유효하며 `ViewInstance`와 같은 타입을 만든다. Instance 타입은 Animated variant에도 사용하므로 제거된 `Animated.LegacyRef` cast가 필요 없다. JSX에 쓰는 `View`/`TextInput`은 value import로 유지한다. 공식 페이지의 한 예제에서 이를 type-only로 import한 줄은 실행 가능한 JSX 예제로 그대로 복사하지 않는다.

| 종류 | 제공하는 Instance 타입 |
|---|---|
| 기본 표시 | ViewInstance, TextInstance, ImageInstance, ImageBackgroundInstance |
| 입력과 터치 | TextInputInstance, ButtonInstance, PressableInstance, SwitchInstance, TouchableHighlightInstance, TouchableNativeFeedbackInstance, TouchableOpacityInstance |
| 목록 | FlatListInstance, SectionListInstance, VirtualizedListInstance, VirtualizedSectionListInstance |
| 컨테이너 | ScrollViewInstance, ModalInstance, DrawerLayoutAndroidInstance, KeyboardAvoidingViewInstance, SafeAreaViewInstance |
| 상태와 보조 UI | ActivityIndicatorInstance, ProgressBarAndroidInstance, RefreshControlInstance, StatusBarInstance |

ref를 지원하지 않는 InputAccessoryView, TouchableWithoutFeedback와 experimental_LayoutConformance에는 Instance 타입이 없다. 타입 이름은 component API 사용 권장을 별도로 의미하지 않는다.

## Static 타입과 제거된 이름

`LinkingStatic`처럼 `*Static` 타입 이름을 API의 일반 이름으로 바꾼다. 이전의 type alias 유무가 일관되지 않았던 계약을 정리한다.

```ts
import {Linking} from 'react-native';
const useLinking = (linking: Linking) => linking;
```

페이지의 변경 목록은 Alert, ActionSheetIOS, ToastAndroid, InteractionManager, UIManager, Platform, SectionList, PixelRatio, AppState, AccessibilityInfo, ImageResizeMode, BackHandler, DevMenu, Clipboard, PermissionsAndroid, Share, DeviceEventEmitter, LayoutAnimation, Keyboard, DevSettings, I18nManager, Easing, PanResponder, NativeModules, LogBox, PushNotificationIOS, Settings와 Vibration의 `*Static` 이름이다. 이 목록이 해당 API 모두의 현재 사용 권장이나 runtime 제공을 보장하는 것은 아니다.

## test mocks와 환경 초기화

`jest.mock('react-native/...')`의 경로 문자열은 type-check하지 않으므로 기존 mock 호출은 일반적으로 유지된다. Strict API가 Jest/Metro의 module path resolution 자체를 바꾸지는 않는다. 실제로 deep module을 import하면 타입 오류가 나며 root 대안이 없는 test 내부 경로에는 의도와 함께 `@ts-expect-error`를 사용할 수 있다.

```ts
// 이전 InitializeCore side-effect import 대체
import 'react-native/setup-env';
```

`react-native/Libraries/Core/InitializeCore`는 0.87부터 deprecated다. 앱 대부분은 직접 import하지 않지만 Jest setup이나 custom entrypoint를 확인한다.

## 나머지 타입 이행

- Animated node는 이전 output 기반 generic에서 non-generic node와 generic `interpolate` method로 바뀐다.
- optional props는 `type | undefined`로 통일한다.
- `ViewProperties`, `TextInputProperties` 등 오래된 `*Properties` alias를 `*Props`로 바꾼다. `ImagePropertiesSourceOptions`는 `ImageSourcePropType`을 사용한다.
- 사용되지 않던 props, 예를 들어 Text의 lineBreakMode, ScrollView의 scrollWithoutAnimationTo와 transform array 밖의 transform style은 제거된다.
- public export가 아니던 내부 helper인 StyleSheet의 RecursiveArray/RegisteredStyle/Falsy와 Animated의 WithAnimatedArray/WithAnimatedObject 등에 의존하지 않는다.

이행 시 자신의 source import, refs, mocks와 raw TS dependency를 나눠 확인한다. 타입 오류가 사라졌다는 사실은 native runtime 검증을 대체하지 않는다.

## 출처

- [React Native, Strict Typescript Api](https://reactnative.dev/docs/strict-typescript-api)

## 관련 문서

- [[RN-TypeScript]]
- [[RN-Upgrading]]
- [[RN-Android-Integration]]
- [[RN-iOS-Integration]]
