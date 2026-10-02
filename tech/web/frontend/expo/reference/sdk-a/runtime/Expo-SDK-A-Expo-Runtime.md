---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo runtime web API와 native module 수명"]
---

# Expo runtime web API와 native module 수명

## 공통 runtime과 entrypoint

`expo`는 Android, iOS, tvOS, Web의 runtime API를 제공한다. `registerRootComponent(App)`는 native AppRegistry 등록, Web runApplication, process.nextTick polyfill을 수행한다. development에서 Fast Refresh indicator와 updates 설정, react-native-web alias 검사를 추가한다. Router를 쓰지 않는 custom package.json `main` entrypoint는 default export만 으로 등록되지 않으므로 직접 호출한다. native root이 름은 `main`과 맞춰야 한다. Router custom entry는 Router의 초기화 순서를 따른다.

```tsx
import { registerRootComponent } from 'expo';
function App() { return <View />; }
registerRootComponent(App);
```

`reloadAppAsync(reason?)`는 release/debug 모두 **현재 JS bundle**을 다시 로드한다. 새 OTA update로 전환하는 `Updates.reloadAsync`와 다르다. `isRunningInExpoGo()`는 Expo Go 여부를 반환한다.

## Fetch, encoding, streams

`import { fetch } from 'expo/fetch'`는 streaming response를 제공하는 WinterCG Fetch 구현이다. native에서는 global fetch도 같은 구현이다. `EXPO_PUBLIC_USE_RN_FETCH=1`이면 global만 RN 구현으로 유지하며 named import는 계속 Expo 구현이다. HTTP 응답의 성공 여부와 body null가 능성을 확인한다.

```ts
import { fetch } from 'expo/fetch';
const response = await fetch(endpoint);
if (!response.ok || !response.body) throw new Error('Streaming response unavailable');
const reader = response.body.getReader();
try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    consumeBytes(value);
  }
} finally { reader.releaseLock(); }
```

`TextEncoder`, `TextDecoder`, `TextEncoderStream`, `TextDecoderStream`와 `ReadableStream`, `WritableStream`, `TransformStream`을 전역으로 사용한다. native TextDecoder는 UTF-8만 지원하며 encoding specification 전체 준수 구현이 아니다. URL/URLSearchParams는 native RN shim을 대체하지만 hostname의 non-ASCII 변환을 완전히 지원하지 않는다. `structuredClone`은 Map/Set/ArrayBuffer를 복제하지만 ArrayBuffer/TypedArray transfer option은 미구현이다. browser와 server의 지원 여부는 해당 runtime에 도 의존한다.

## native object와 event

`requireNativeModule(name)`는 JSI를 우선하고 bridge proxy로 fallback 하며 missing module에서 throw 한다. proxy는 synchronous method 같은 일부 기능을 지원하지 않을 수 있다. `requireOptionalNativeModule`은 missing 일 때 null, `requireNativeView(moduleName, viewName?)`는 native component를 반환한다. `registerWebModule(Implementation, name)`은 NativeModule subclass의 singleton을 등록한다. `installOnUIRuntime(getUIRuntimeHolder())`는 Expo Modules와 serializable SharedObject를 worklet runtime에 설치한다.

EventEmitter의 `addListener`, `emit`, `listenerCount`, `removeListener`, `removeAllListeners`는 event이 름별로 동작한다. emit은 listener를 **동기 호출**하고 반환값을 무시한다. subclass의 startObserving/stopObserving은 첫 listener 추가와 마지막 제거 시 실행된다. `useEvent(emitter, name, initialValue=null)`는 최신 payload를 state로 제공하고 `useEventListener`는 callback을 등록해 unmount 시 해제한다.

NativeModule은 emitter를 확장한다. SharedObject는 native counterpart와 연결되고 `release()` 후 native 호출은 throw 한다. 다른 소비자가 참조하는 object를 조기에 release 하지 않는다. hook이 만든 image/player 객체는 보통 cleanup에서 자동 release 된다. SharedRef의 `nativeRefType`은 native object 종류이며 서로 독립된 module 간 bitmap 등 참조 공유를 가능하게 한다.

## permission 공통 계약

`createPermissionHook({ getMethod, requestMethod })`은 `[permission|null, request, get]` hook을 만든다. PermissionResponse의 status는 granted/denied/undetermined, granted는 convenience boolean, canAskAgain=false 면 Settings 안내가 필요하다. expires는 never 또는 timestamp 타입이며 현재 문서의 permission은 영구 부여로 표기된다. OS 설정 변경 이후에도 기존 permission snapshot이 항상 최신이라고 가정하지 않는다.

## 출처

- [Expo Documentation, Expo](https://docs.expo.dev/versions/latest/sdk/expo)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
