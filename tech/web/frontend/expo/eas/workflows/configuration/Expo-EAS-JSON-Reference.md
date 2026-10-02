---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["eas.json 주요 필드와 우선순위"]
---

# eas.json 주요 필드와 우선순위

## Build profile 계약

build.<profile>에 공통 속성을 두고 android/ios로 플랫폼 값을 덮어쓴다. extends는 다른 profile을 참조하며 플랫폼 내부에 둘 수 없다. env에는 Git에 올려도 되는 설정만 두고 비밀번호는 EAS 환경 변수로 관리한다.

| 필드 | 동작과 주의점 |
| --- | --- |
| credentialsSource | remote 기본, local은 credentials.json 사용. cloud 실행에서는 local 자료도 작업에 전달된다. |
| withoutCredentials | credential 구성을 요구하지 않게 한다. 결과물의 정상 signing까지 대신 보장하지 않는다. |
| developmentClient | expo-dev-client 필요. Android Debug task/iOS Debug 설정을 선택한다. |
| distribution | store 또는 internal. 실제 APK/IPA와 provisioning 조건을 확인한다. |
| channel | EAS Update 수신 channel. development client는 여러 channel을 열 수 있다. |
| environment | EAS 환경 변수 집합. profile 이름과 독립적이다. |
| autoIncrement | 공통 true는 Android versionCode/iOS buildNumber 증가. 플랫폼별 version은 앱 버전 patch 증가다. |
| node/yarn/pnpm/bun/corepack | 도구 선택. corepack 기본 false. SDK 최소 버전과 맞춘다. |
| prebuildCommand | 기본 prebuild override. platform/non-interactive는 runner가 추가한다. |
| config | .eas/build 아래 custom build 파일. Workflow 파일과 별개다. |
| buildArtifactPaths | 추가 산출물 glob. 앱 archive 경로는 applicationArchivePath로 정한다. |
| uploadSourceMaps | 기본 false. cloud Build만 EAS에 map을 업로드하며 포함 소스 코드는 제거한다. |
| cache | disabled/key/paths. node_modules를 원격 cache로 복제하는 이득은 제한적이다. |

Classic releaseChannel과 옛 expoCli 필드는 deprecated다. SDK 57에는 channel과 프로젝트 expo 패키지의 CLI를 사용한다. 원문 예시의 Node 12는 현재 SDK 호환 설정이 아니다.

## 플랫폼별 우선순위

Android gradleCommand가 developmentClient와 buildType보다 우선한다. buildType의 app-bundle은 bundleRelease(AAB), apk는 assembleRelease(APK)를 선택한다. image/resourceClass/ndk를 별도로 정하고 산출물 경로는 기본 `android/app/build/outputs/**/*.{apk,aab}`다.

iOS buildConfiguration은 developmentClient보다 우선한다. scheme이 여러 개라면 명시해 대화형 선택을 없앤다. simulator=true는 실기기 IPA와 다른 결과를 만든다. image/resourceClass/bundler/fastlane/cocoapods와 필요할 때 enterpriseProvisioning을 설정한다. custom Gymfile로 출력 위치가 달라지면 applicationArchivePath도 맞춘다.

## Submit 계약

Android serviceAccountKeyPath는 Google 제출 key 파일이다. track은 production/beta/alpha/internal, releaseStatus는 completed/draft/halted/inProgress다. rollout은 0~1 비율이며 inProgress에만 적용한다. Update의 0~100 rollout_percentage와 혼동하지 않는다.

changesNotSentForReview=true는 Console에서 명시적으로 심사 제출하기 전까지 변경을 보내지 않게 한다. applicationId는 Expo가 관리하는 제출 credential 선택에 사용하며 local key에는 효과가 없다.

iOS ascAppId는 앱의 숫자 Apple ID, appleTeamId는 개발자 team이다. ascApiKeyPath/IssuerId/Id로 API key를 구성한다. appleId, sku, language, companyName, appName은 계정/스토어 record 생성 정보를 제공한다. bundleIdentifier는 Expo-managed submit credential 선택, metadataPath는 스토어 설정 파일, groups는 내부 TestFlight 그룹이다. 자동 배포 그룹은 명시한 그룹 외에도 build를 받을 수 있다.

## 출처

- [Expo Documentation, Configuration with eas.json](https://docs.expo.dev/eas/json)

## 관련 문서

- [[Expo-EAS-Configuration]]

- [[Expo]]
