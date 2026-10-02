---
tags: [expo, e2e, testerarmy, testing, eas]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
aliases: ["Expo e2e by TesterArmy"]
---

# Expo의 e2e 테스트와 재생

e2e는 agent-device로 Android Emulator와 iOS Simulator를 조작하는 오픈소스 E2E 프레임워크다. 테스트 실행 위치와 모델 호출 위치는 별개다. 로컬 실행에는 TesterArmy 계정이 필요하지 않으며, 호스팅 TesterArmy 플랫폼과도 구분한다.

## Exact step과 agent step

| 단계 | 동작과 비용 |
|---|---|
| Exact step | locator로 요소를 찾아 조작하고 결과를 assertion으로 검사한다. 모델이 필요 없다. |
| Agent step | 자연어 목표를 모델이 UI 동작으로 변환한다. 최초 동작을 기록하고 이후 실행에서 재생할 수 있다. |

`agent.act()`에는 한 목표를 주고, 그 뒤 exact assertion으로 기대 결과를 확인한다. 목표를 수행했다고 모델이 판단한 것과 앱의 실제 상태를 검증한 것은 다르다. 최초 실행의 token 수와 후속 실행의 cache replay를 구분한다.

기록은 `.e2e/cache`, 결과는 `.e2e/report.json`, 실패 증거는 `.e2e/artifacts`에 남는다. 실패 locator, screenshot과 화면의 role/text를 담은 `screen.txt`를 함께 읽는다. `--video`는 테스트별 영상 기록 옵션이다.

재생은 기록 당시 요소가 현재 화면에 존재해야 한다. UI 변경뿐 아니라 simulator runtime별 accessibility tree 차이로 모델이 다시 호출될 수 있다. 캐시는 assertion을 대신하지 않고, 모델 호출이 없다는 사실도 테스트가 모든 회귀를 발견한다는 보장이 아니다.

## 빌드와 기기 수명주기

2026-10-02 확인 기준 Node.js 22.12 이상이 필요하며 Windows에서는 WSL로 실행한다. Android SDK/emulator 또는 Xcode/iOS Simulator를 준비하고 `npx agent-device doctor`로 확인한다. Agent step을 쓸 때만 지원 subscription, provider API key 또는 local model을 구성한다.

Release build는 JavaScript bundle을 포함하므로 Metro 개발 서버 없이 테스트할 수 있다. `android.package`와 `ios.bundleIdentifier`를 설정하고 다음처럼 설치한다.

```sh
npx expo run:android --variant release
npx expo run:ios --configuration Release
npx e2e init
```

초기화는 `e2e`, `@e2e-dev/mobile` dev dependency와 `test:e2e` script, `e2e.config.ts`, 예제 테스트, coding-agent skill/MCP 설정을 만든다. 설정 파일 변경과 앱 테스트 실행은 구분한다.

각 target의 `app.bundleId`는 실행 앱을, `mobile()`의 `device`는 기기를 식별한다. Android에서는 `agent-device devices`에 표시된 실행 기기명과 underscore가 들어간 AVD 이름이 다를 수 있다. `app.appPath`만 지정해도 자동 설치되는 것은 아니며, 새 CI 기기에는 `device.installApp()` 등 설치 단계가 필요하다.

각 테스트를 `app.open()`으로 시작한다. 생략하면 이전 테스트가 남긴 화면에서 시작할 수 있다. 앱을 여는 것만으로 로그인, 서버 데이터와 모든 영속 상태까지 초기화된다고 가정하지 않는다.

## Accessibility와 deep link

- Native tab의 role은 플랫폼/runtime별로 달라질 수 있으므로 양 플랫폼의 실제 tree를 확인한다.
- `Pressable`에 role이 없으면 자식 label이 합쳐질 수 있다. 명확한 `accessibilityRole`/`accessibilityLabel`을 주거나 실제 tree에 맞는 locator를 쓴다.
- `textTransform: 'uppercase'`라면 플랫폼이 보고하는 대문자 text와 맞춘다.
- iOS deep link는 simulator에서 최초 승인 전에는 Open 확인창이 나타날 수 있다. 확인창 또는 목적 화면이 나타날 때까지 기다리고 두 경로를 처리한다.

불명확한 locator를 광범위한 partial text로 통과시키기 전에 accessibility 의미와 assertion 대상을 확인한다. Coding-agent skill과 `e2e mcp`로 locator를 먼저 확인하는 흐름을 사용할 수 있다.

## EAS Workflows의 테스트 worker

iOS Simulator용 build profile에 `ios.simulator: true`를 둔다. Build job 후 macOS worker에서 산출물을 다운로드하고 simulator boot/bootstatus, install, 테스트 순서로 진행한다. Worker 전용 config는 이미 boot된 단일 simulator를 대상으로 할 수 있다.

실패 시에도 `always()`로 report와 artifacts를 업로드해야 실패 증거가 남는다. PR마다 실행하려면 `pull_request` trigger를 별도로 설정한다.

Exact-only 테스트에는 모델 credential이 필요 없다. Agent step은 worker에서 갱신 token을 영속 반영하지 못하는 subscription login보다 provider API key가 권장된다. `E2E_OAUTH_CREDENTIALS`는 로컬 OAuth JSON 내용 전달 방식이며 token 갱신을 변수에 다시 저장하지 않는다. Job의 environment와 EAS Secret visibility를 맞춘다.

초기화는 cache를 gitignore하므로 CI는 기본적으로 기록 없이 시작한다. 기록을 재사용하려면 trace를 명시적으로 version 관리해야 한다. 공유 전 trace/artifact에 테스트 계정과 민감 화면이 포함되는지도 확인한다.

## EAS Simulator의 원격 기기

2026-10-02 기준 EAS Simulator는 limited-access preview다. `@e2e-dev/eas`는 e2e worker마다 원격 session을 만들고 종료한다. 테스트 프로세스는 로컬에서 실행되며 원격 기기는 agent-device로 제어한다.

프로젝트를 EAS에 연결하고 availability를 확인한다. 인증은 `EXPO_TOKEN`으로 하며 `eas login` 계정을 자동 사용하지 않는다. `easSimulators({ projectId, buildId })`가 지정한 EAS Build를 session 준비 중 설치/실행하므로 simulator용 build ID가 필요하다.

Worker 수는 session 수와 사용량에 영향을 준다. 원격 iOS의 touch indicator 지연 때문에 공식 예제는 `videoTouches: false`로 둔다. 비정상 종료 후 session은 10분 비활동으로 종료되며 plan별 최대 지속시간도 있어 긴 테스트는 이 한도를 확인한다. 로컬에서 녹화한 step도 remote accessibility 조건이 맞으면 replay할 수 있다.

## 출처

- [Expo Documentation, Using e2e by TesterArmy](https://docs.expo.dev/guides/using-e2e) — 2026-10-01 수정본을 2026-10-02 대조

## 관련 문서

- [[Expo-Integrations-TesterArmy]]
- [[Expo-EAS-Workflows]]
- [[Expo-Router-Errors-Testing]]
