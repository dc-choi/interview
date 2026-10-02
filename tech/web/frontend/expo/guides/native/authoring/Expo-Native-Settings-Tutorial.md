---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["설정 저장 native module과 이벤트"]
---

# 설정 저장 native module과 이벤트

## 플랫폼별 저장소를 동일한 API로 노출

예제의 `ExpoSettings`는 `getTheme()`과 `setTheme(theme)`을 제공한다. Android는 앱 전용 SharedPreferences(`<package>.settings`), iOS는 UserDefaults에 `theme`을 저장한다. 값이 없을 때 `system`을 반환한다. 일반 설정 저장 예제이며 비밀키 보관 용도로 확대하지 않는다.

```swift
Name("ExpoSettings")
Function("getTheme") {
  UserDefaults.standard.string(forKey: "theme") ?? "system"
}
Function("setTheme") { (theme: String) in
  UserDefaults.standard.set(theme, forKey: "theme")
}
```

Android 예제는 SharedPreferences editor의 `commit()`을 사용한다. 이는 동기 disk write일 수 있으므로 작은 설정 예제의 선택을 큰 I/O 작업으로 일반화하지 않는다. 원문의 첫 단계 setter는 저장만 하며 React state를 갱신하지 않는다. reload해야 UI 값이 바뀌는 문제를 이벤트 단계에서 해결한다.

## 변경 이벤트와 JS 계약

native definition에 `Events("onChangeTheme")`을 선언하고 setter가 성공한 뒤 `sendEvent`로 `{theme}` payload를 전송한다. iOS는 dictionary, Android는 Map/Bundle을 사용한다.

```ts
import { NativeModule, requireNativeModule } from 'expo';
type Theme = 'light' | 'dark' | 'system';
type Events = { onChangeTheme(event: { theme: Theme }): void };
declare class SettingsModule extends NativeModule<Events> {
  getTheme(): Theme;
  setTheme(theme: Theme): void;
}
const Settings = requireNativeModule<SettingsModule>('ExpoSettings');
const subscription = Settings.addListener('onChangeTheme', ({ theme }) => {
  console.log(theme);
});
subscription.remove();
```

React에서는 state 초기값을 `getTheme()`로 읽고 effect에서 listener를 구독한다. effect cleanup은 subscription.remove()를 호출한다. native 저장 상태와 React state가 자동 공유되는 것은 아니다. 외부 native 변경도 이벤트로 반영하려면 해당 변경 경로에서 전송해야 한다.

## Enum으로 입력 범위 제한

Swift `enum Theme: String, Enumerable`과 Kotlin `enum class Theme(val value: String): Enumerable`을 만들고 `light`, `dark`, `system`을 raw value로 지정한다. `setTheme`의 native parameter를 이 enum으로 바꾸면 JS에서 잘못된 문자열을 넘길 때 변환 단계가 거부한다.

TypeScript union은 개발 시 검사를, native Enumerable은 runtime 검사를 담당한다. 타입을 우회한 잘못된 입력은 FunctionCallException/ArgumentCastException/EnumNoSuchValueException 원인 chain으로 나타날 수 있다. fallback, 저장된 구버전 값과 migration 정책은 별도로 정한다. web localStorage 구현은 이 native tutorial에 포함되지 않는다.

## 출처

- [Expo Documentation, Tutorial: Create a native module](https://docs.expo.dev/modules/native-module-tutorial)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
