---
tags: [expo, react-native, debugging]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo DevTools와 프로파일러 선택"]
---

# Expo DevTools와 프로파일러 선택

## Developer menu

Expo CLI에서 `M`은 연결된 device/Emulator/Simulator의 menu를 연다. Android shake, Cmd/Ctrl+M 또는 `adb shell input keyevent 82`, iOS shake/세 손가락 터치, Simulator의 Ctrl+Cmd+Z/Cmd+D도 사용할 수 있다.

menu는 dev server link 복사, reload, launcher로 돌아가기, Fast Refresh, performance monitor와 element inspector, DevTools 열기를 제공한다. SDK58의 `EXPO_NO_DEV_MENU=1` launch behavior를 SDK57 공통 기능으로 가정하지 않는다.

performance overlay는 RAM, JS heap, view count와 UI/JS thread FPS를 표시한다. element inspector는 component/element, performance, network와 touchable highlight를 확인한다. overlay는 빠른 신호이며 정확한 원인 분석은 profile/trace와 함께 한다.

## React Native DevTools

RN0.76 이후 새 DevTools는 Hermes 앱의 JS debugging을 담당한다. 앱을 연결하고 Expo CLI에서 `J`를 누른다. Chrome에서 JS를 대신 실행하던 remote debugging과 다르다.

| 탭 | 주요 작업 |
| --- | --- |
| Sources | line breakpoint, debugger statement, pause on exceptions |
| Console | 실행 중 JS 조사, breakpoint scope에서 값과 method 확인 |
| Network | Expo dev-client/Go의 fetch/media와 일부 native requests |
| Memory | JS heap와 heap snapshot |
| Components | React tree, props/styles |
| Profiler | React/JS performance 기록과 commit 분석 |

caught exception을 Router 등에서 처리하더라도 원인을 보려면 Pause on caught exceptions를 켠다. Console은 기본 global scope, breakpoint에 멈췄을 때 해당 scope에서 실행된다. 진단용 code 실행도 앱 상태를 바꿀 수 있다.

Network 탭은 `expo-dev-client` 또는 Go에서 제공하는 Expo-specific 기능이며 모든 native network layer를 포괄한다고 보장하지 않는다. native traffic/CPU/memory는 Android Studio/Xcode 또는 적절한 proxy/profile을 사용한다.

공식 가이드의 JS profile 제한은 debug builds와 sourcemap symbolication 미지원이다. 설치된 DevTools/version이 개선되었는지 실제 capability를 확인한다. development instrumentation과 release performance 차이도 고려한다.

## 확장 도구

Rozenite는 DevTools 안에 auto-discovered panels를 추가하는 plugin framework다. Expo의 browser dev-tools plugin과 같은 mechanism으로 단정하지 않는다.

Expo Tools VS Code debugger는 inspector protocol로 연결해 breakpoint/variables/debug console을 제공한다. Command Palette > Expo: Debug로 attach하며 가이드는 alpha로 분류한다. 안정적인 기본 경로는 React Native DevTools다. Radon IDE는 별도 IDE extension으로 debugging/network/router 통합을 제공하며 실제 가격/지원은 현재 provider 자료에서 확인한다.

## Deprecated debugging

standalone React Native Debugger는 RN0.73부터 deprecated인 remote JS debugging을 요구하며 Hermes와 호환되지 않는다. SDK57의 권장 경로로 설치하지 않는다. React Native DevTools와 Redux 등의 dev-tools plugins를 사용한다.

옛 SDK49 이하 가이드의 port8081, Debug remote JS와 network inspector는 historical workflow다. 현재 native traffic 조사에는 Charles, Proxyman, mitmproxy, Fiddler 같은 proxy를 검토하되 certificate/platform/network setup과 관측 제한을 확인한다.

## 출처

- [Expo Documentation, Debugging and profiling tools](https://docs.expo.dev/debugging/tools)

## 관련 문서

- [[Expo-Home-Debugging-Runtime]]
- [[Expo-Home-DevTools-Plugins]]
- [[Expo-Home-AI-Device-Toolkits]]
