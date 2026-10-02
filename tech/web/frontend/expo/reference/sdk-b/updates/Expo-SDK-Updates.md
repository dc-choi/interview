---
tags: [expo, expo-sdk, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Updates 런타임과 호환성"]
---

# Expo SDK Updates 런타임과 호환성

expo-updates는 Android/iOS/tvOS binary의 native runtime과 호환하는 JS/assets를 remote service에서 받아 저장한다. `npx expo install expo-updates` 후 namespace import한다. EAS Update는 Expo Updates protocol server 중 하나이며 custom server도 protocol을 구현해야 한다. development preview로 content를 보는 작업과 production API 검증은 구분한다.

## Build-time configuration

updates.url/runtimeVersion이 필요하다. 기본값은 enabled=true, checkAutomatically=ON_LOAD, fallbackToCacheTimeout=0ms, useEmbeddedUpdate=true, disableAntiBrickingMeasures=false, enableBsdiffPatchSupport=true다. requestHeaders, codeSigningCertificate/codeSigningMetadata, assetPatternsToBeBundled로 request, 서명과 asset 포함 범위를 설정한다. AndroidManifest meta-data 또는 iOS Expo.plist에 반영하며 native UpdatesController.overrideConfiguration/AppController.overrideConfiguration도 제공한다. OTA로 native dependency, 권한과 launch image를 추가할 수는 없다.

runtimeVersion은 build/update 호환성 계약이다. appVersion policy는 version만 사용하므로 같은 version 아래 native 변경을 하면 자동으로 안전해지지 않는다. nativeVersion은 version(versionCode/buildNumber) 형식이며 플랫폼별 값이 달라 runtime도 다를 수 있다. fingerprint는 SDK/native/config 등의 hash를 build/update에서 계산한다. 원문의 appVersion+autoIncrement 설명을 app version이 반드시 증가한다는 보장으로 읽지 않고 실제 version source와 runtime 결과를 확인한다.

## Startup와 release verification

기본 동작은 launch 시 check/download 후 다음 restart에 적용하는 것이다. ON_LOAD/ON_ERROR_RECOVERY/NEVER/WIFI_ONLY와 cache timeout으로 시작 지연을 조정한다. JS enum과 native ALWAYS/ERROR_RECOVERY_ONLY/NEVER/WIFI_ONLY 이름은 다르다. 전체 API는 release build에서 검증한다. debug 기본 동작은 Metro JS이며 dev client/Expo Go의 channel은 null이다. 업데이트 preview는 가능하지만 production API와 같은 환경은 아니다. release처럼 동작하는 debug 설정은 별도로 필요하다.

## Current state

channel/runtimeVersion/updateId는 string|null, createdAt는 Date|null, launchDuration은 ms|null이다. manifest는 Partial<Manifest>이며 disabled/dev에서는 빈 객체다. isEnabled=false 원인은 비활성화, URL/runtime 누락, storage 초기화 오류 등이며 embedded bundle을 실행한다. isEmbeddedLaunch는 build bundle 실행, isEmergencyLaunch/emergencyLaunchReason은 새 update 실패 후 embedded bundle로 돌아가는 예외적 downgrade다. 구버전 embedded 코드도 persistent 데이터를 읽을 수 있어야 한다. latestContext는 native state machine context다.

useUpdates()는 currentlyRunning, availableUpdate/downloadedUpdate, isChecking/isDownloading/isRestarting/isStartupProcedureRunning, isUpdateAvailable/isUpdatePending, checkError/downloadError, downloadProgress(0..1), lastCheckForUpdateTimeSinceRestart(Date?), restartCount를 반환한다. available과 downloaded를 구분한다. Content-Length가 있으면 progress가 더 연속적으로 갱신되며 lastCheck는 restart 사이에 저장되지 않는다. currentlyRunning의 optional field는 module constant의 null 대신 undefined일 수 있다. UpdateInfo는 NEW(manifest/updateId)와 ROLLBACK(createdAt, manifest/updateId 없음)을 구분한다. 원문 overview의 NEW만 지원한다는 문장은 타입과 맞지 않는다.

배포/branch/channel/rollout은 EAS Update 문서와 함께 읽는다. runtime 일치만으로 데이터 migration과 모든 행동의 호환성이 보장되지는 않는다.

## 출처

- [Expo Documentation, Updates](https://docs.expo.dev/versions/latest/sdk/updates)

## 관련 문서

- [[Expo-SDK-Updates-API]]
- [[Expo-SDK-Manifests]]
