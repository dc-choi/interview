---
tags: [react-native, mobile, quality]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 네이티브 로그와 기존 디버거"]
---

# React Native 네이티브 로그와 기존 디버거

React Native 0.87 문서 기준이다.

네이티브 모듈의 crash, build 문제와 플랫폼 API 호출은 네이티브 프로젝트에서 조사한다. 네이티브 프로젝트를 직접 열지 않는 프레임워크 흐름에서는 먼저 해당 프레임워크의 prebuild 또는 네이티브 프로젝트 접근 절차를 확인한다.

## Android와 iOS 로그

```sh
npx react-native log-android
npx react-native log-ios
adb logcat "*:S" ReactNative:V ReactNativeJS:V
```

React Native tag만 선택하면 사용자 정의 모듈 로그가 빠질 수 있다. Android에서 `Log.d("MyModule", message)`로 남겼다면 `MyModule:D`를 logcat 필터에 추가한다. iOS의 `NSLog`나 Swift `print` 출력은 Xcode console에서 확인한다.

CLI 명령은 설치된 Community CLI와 프로젝트 구성을 전제로 한다. OS 전체 로그를 볼지 앱별 로그만 볼지는 crash 위치에 맞춰 정한다.

## 네이티브 debugger 연결

Android Studio나 Xcode에서 앱을 시작하고 native breakpoint를 사용한다. CLI로 실행한 프로세스에도 Android Studio의 Run > Attach to Process, Xcode의 Debug > Attach to Process로 붙일 수 있다.

JavaScript breakpoint에 도달하지 않는다면 해당 코드가 아직 실행되지 않았는지, bridge/module 경계 이전에 native crash가 발생했는지 확인한다. debugger가 연결됐다는 사실과 원하는 프로세스, build variant에 붙었다는 사실도 구분한다.

## Safari와 JSC

JavaScriptCore를 사용하는 iOS 앱에서는 Safari Web Inspector가 직접 JSC를 조사하는 기존 방식이다. 실제 기기는 Safari > Advanced의 Web Inspector를 켜고, Mac Safari에서 Develop 메뉴를 활성화해 기기의 JSContext를 선택한다.

reload마다 새 JSContext가 만들어진다. Automatically Show Web Inspectors for JSContexts 옵션은 새 context 선택을 반복하는 부담을 줄인다. breakpoint의 원본 위치 대응에는 source map 설정을 확인한다.

## 제거된 Remote JavaScript Debugging

JavaScript를 Chrome의 V8에서 실행하던 Remote JavaScript Debugging은 React Native 0.79에서 제거됐다. 이를 현재 Hermes 앱의 표준 디버깅 방식으로 안내하지 않는다. 과거 runtime 문서의 Chrome/V8 설명은 이 오래된 흐름에 해당한다.

새 앱은 React Native DevTools를 기본 진입점으로 삼고, JSC를 선택한 앱은 그 엔진의 도구를 사용한다. 엔진을 바꿔 재현한 결과를 원래 기기 엔진의 동작과 같다고 단정하지 않는다.

## 출처

- [React Native, Debugging Native Code](https://reactnative.dev/docs/debugging-native-code)
- [React Native, Other Debugging Methods](https://reactnative.dev/docs/other-debugging-methods)

## 관련 문서

- [[React-Native-Debugging]]
- [[React-Native-JavaScript-Runtime]]
- [[React-Native-Hermes]]
