---
tags: [expo, react-native, ai]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["agent-device와 Argent의 실행 중 앱 검증"]
---

# agent-device와 Argent의 실행 중 앱 검증

## 역할 구분

Expo Skills는 구현 패턴, Expo MCP는 Expo/EAS 컨텍스트, device toolkit은 실행 중 앱의 제어와 관찰을 제공한다. 화면 렌더링, 완료된 흐름, 발생한 요청을 screenshots/logs/profiles로 확인해 코드 검토를 보완한다. UI 자동화 통과는 모든 기능의 정확성이나 native 성능을 보장하지 않는다.

## agent-device 설정

Callstack의 MIT 라이선스 CLI이며 Node.js 22.12 이상이 필요하다. Android local 환경에는 ADB, iOS local 환경에는 macOS/Xcode가 필요하고 device cloud/remote host는 로컬 도구 없이 사용할 수 있다. Android/iOS 기기, web, TV와 desktop 등 지원 범위는 설치한 CLI 문서로 확인한다.

```sh
npm install -g agent-device@latest
agent-device doctor
agent-device --version
agent-device help workflow
# 선택적 에이전트 Skill
npx skills add callstack/agent-device
```

설치된 앱을 제어하므로 앱에 agent-device 라이브러리를 추가할 필요는 없다. development build 또는 Expo Go를 열고 React inspection을 사용할 때는 Metro를 유지한다.

```sh
agent-device apps --platform ios
agent-device open MyApp --platform ios
agent-device snapshot -i
agent-device press @e2 --settle
agent-device screenshot ./artifacts/get-started.png
agent-device close
```

snapshot은 접근성 tree와 `@e2` 같은 actionable ref를 반환한다. 다음 동작은 관찰한 ref로 수행하고 settled UI를 확인한다. screen 좌표보다 roles/labels/testID/ref를 활용한다. 상태 변경 명령은 하나의 session에서 순서대로 처리한다.

## agent-device 검증과 제한

접근성 label/role/value, app launch, tap/type/scroll/gesture, alert, deep link, device state를 다룰 수 있다. React components/props/hooks와 느린 commit/re-render, Metro CDP의 JS 평가, network/logs, 지원 플랫폼의 CPU/memory/FPS/trace/crash/video/audio도 조사할 수 있다.

동작 session을 `.ad` script로 기록해 replay/test하고 실패 artifacts를 보관한다. 지원 Maestro YAML은 `agent-device test --maestro`로 실행하고 호환 흐름을 Maestro로 export할 수 있다. live native breakpoint/stepping은 Xcode/LLDB 같은 native debugger가 담당한다.

- 로그 수집은 기본 off다. 재현용 짧은 window를 연다.
- React inspection/profiling은 호환되는 React DevTools 연결과 dev server가 필요하다.
- Expo Go의 native CPU/memory/trace는 앱 전용 바이너리 대신 Expo Go host를 측정한다. 앱 native 코드는 development build로 프로파일링한다.
- 실기기는 pairing, signing, trust와 권한을 별도로 설정한다.
- EAS Simulator Android는 `AGENT_DEVICE_HEADLESS=1` 또는 `boot --headless`로 부팅한다.
- CI 종료에 emulator까지 멈춰야 하면 `agent-device close --shutdown`을 사용한다.

MCP를 선호하는 클라이언트는 설치한 `agent-device`를 `args: ["mcp"]`로 실행하도록 등록한다. 구조화된 MCP가 있어도 버전별 help와 setup에 CLI가 필요할 수 있다.

## Argent 설정

Software Mansion의 toolkit이며 공식 가이드 기준 Node.js 18 이상, Android Emulator 또는 iOS Simulator를 요구한다. Android에는 ADB, iOS에는 macOS/Xcode가 필요하다.

```sh
npx @swmansion/argent init
npm install -g @swmansion/argent
argent update
argent flags
argent remove
```

project root의 init wizard는 editor를 감지하고 MCP, Skills와 agent definitions를 workspace에 설정한다. editor는 `argent` 명령으로 서버를 시작하므로 global CLI와 PATH를 확인한 뒤 editor를 다시 연다. update는 최신 구성으로 갱신, flags는 feature state 조회, remove는 MCP 등록과 toolkit 제거다.

## Argent 관찰 경계

앱 launch/tap/swipe/type/deep link, 접근성 tree, console, view/React tree, JS와 native network payload를 조사한다. React와 native profile을 함께 기록해 느린 React commit, native stack, UI hang와 memory leak를 연결할 수 있다.

기기와 앱을 Argent가 launch/relaunch하게 하면 system dialog와 native modal을 관찰하기 쉽다. 수동 부팅은 일부 관찰을 제한할 수 있다. Expo Go에서 UI 제어, React tree와 profiler는 가능하지만 앱 native profiling은 development build를 사용한다. React tree/profiler에는 dev server와 JavaScript debugging connection이 필요하다.

연결 검증은 실행 중 화면 screenshot과 설명으로, 작업 검증은 대상 흐름과 로그/실패 증거로 수행한다. agent-device의 실기기/remote 지원을 Argent의 Simulator 중심 범위에 그대로 적용하지 않는다.

## 출처

- [Expo Documentation, agent-device and Expo](https://docs.expo.dev/agents/agent-device)
- [Expo Documentation, Argent and Expo](https://docs.expo.dev/agents/argent)

## 관련 문서

- [[Expo-Home-AI-MCP]]
- [[Expo-Home-Debugging-Tools]]
