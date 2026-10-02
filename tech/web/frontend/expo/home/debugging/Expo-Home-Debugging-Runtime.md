---
tags: [expo, react-native, debugging]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 런타임 오류의 재현과 네이티브 로그"]
---

# Expo 런타임 오류의 재현과 네이티브 로그

## 오류와 warning

LogBox의 fatal error는 앱 실행을 막는 redbox, warning은 출시 전에 확인할 잠재 문제를 알리는 yellowbox로 나타난다. `console.warn`, `console.error`, uncaught throw도 logging/error UI를 만들 수 있다. development error UI와 production crash reporting은 같은 전달 경로가 아니다.

stack trace는 오류 메시지, 발생 file/line와 호출 경로를 함께 제공한다. 먼저 최초 앱 코드 위치와 실제 값/상태를 읽고 native/module/bundler 오류인지 분류한다. stack이 난해하면 최소 재현으로 범위를 줄인다.

## 재현 흐름

1. 마지막 동작 버전과 실패 버전의 변경 범위를 확인한다.
2. 작은 기능을 blank project나 isolated screen으로 옮긴다.
3. 변경을 조금씩 적용해 처음 깨지는 조건을 찾는다.
4. breakpoint/log로 code 실행 여부와 variable 값을 확인한다.
5. package 버전, device/OS, build type와 재현 순서를 함께 기록한다.

현재 작업을 무조건 reset하는 대신 별도 재현 환경을 사용해 원래 변경을 보존한다. state management 같은 중간 layer를 제거했을 때 오류가 사라지면 그 layer의 caller/state/lifecycle을 조사한다. 검색 결과는 같은 메시지의 후보이며 현재 SDK/환경에서 직접 검증한다.

## Native debugger

```sh
npx expo prebuild -p android
# macOS 예시
open -a "/Applications/Android Studio.app" ./android
npx expo prebuild -p ios
xed ios
```

Android Studio는 native build/debugger를, macOS Xcode는 workspace build와 LLDB를 제공한다. source generation과 native compilation을 해야 native breakpoint를 걸 수 있다. 생성 파일을 유지하며 수동 수정하면 native library upgrade/config도 직접 관리할 수 있다. 진단용 generated dirs를 제거하기 전에 수동 변경과 원래 관리 방식을 확인한다.

## Native 로그

Android는 연결된 device/Emulator에서 `adb logcat`으로 system/native 로그를 읽는다. WebADB는 지원 browser에서 toolchain 설치를 줄일 수 있는 대안이다. iOS는 macOS Console > Devices에서 실기기/Simulator를 선택하고 Start streaming한다.

JS error boundary가 native process crash를 잡지 못할 수 있으므로 native 로그를 함께 확인한다. 긴 전체 log 대신 재현 시간, app process와 오류 주변 context로 좁힌다. secret과 PII가 포함될 수 있는 payload를 공유 기록에 그대로 넣지 않는다.

## Production 오류

local reproduction을 우선하고 Google Play Console crashes, Xcode Crashes Organizer/App Store/TestFlight reports, Sentry/BugSnag dashboard를 확인한다. production version/update ID, device와 발생 단계가 중요하다.

```sh
npx expo start --no-dev --minify
```

이 명령은 development server에서 production-like/minified JS 오류를 재현하는 수단이며 signed release binary 자체를 만든 것은 아니다. 일부 구형 device에서만 crash하면 memory, CPU와 native OS 조건을 profile한다. JS profiler와 native profiler의 관측 범위를 구분한다.

Crash reporting은 stack trace, device/context와 alerts를 제공하지만 instrumentation/전송 실패로 일부 사건을 놓칠 수 있다. 데이터 수집 범위, source maps와 release 연결을 구성하고 실제 오류를 재현해 확인한다.

## 출처

- [Expo Documentation, Errors and warnings](https://docs.expo.dev/debugging/errors-and-warnings)
- [Expo Documentation, Debugging runtime issues](https://docs.expo.dev/debugging/runtime-issues)

## 관련 문서

- [[Expo-Home-Debugging-Tools]]
- [[Expo-Home-Monitoring]]
