---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["expo-updates error recovery의 경계"]
---

# expo-updates error recovery의 경계

error recovery는 문제가 있는 update로 앱이 새 fix를 받을 기회까지 잃는 상황을 줄이는 최후의 보호다. 사용자 crash를 모두 막는 기능이 아니며 동작은 바뀔 수 있다. staging 검증과 데이터 호환성, rollback/fix-forward를 대신하지 않는다.

## Fatal JS error와 content appeared

first render에서 fatal error까지10초를 넘으면 recovery가 잡지 않는다. 초기에 자동/수동 check를 하여 새 fix를 받을 기회를 남긴다. Android CONTENT_APPEARED/iOS RCTContentDidAppearNotification이 현재 update에서 이 launch 또는 과거 launch에 발생했는지가 분기 기준이다.

content가 나타난 적이 있으면5초 timer를 시작하고 checkAutomatically=NEVER가 아니면 새 update를 check/download한다. 새 update 없음, download 완료, timer 만료 중 먼저 발생한 시점에 원래 error를 다시 throw하고 crash한다. 다운로드한 fix는 다음 launch에 실행한다. persistent 데이터를 변경했을 가능성이 있으므로 자동으로 이전 update에 rollback하지 않는다.

content가 한 번도 나타나지 않은 update의 첫 launch에서 실패하면 device에서 failed로 기록하고 다시 실행하지 않는다.5초 동안 fix를 받아 즉시 reload를 시도한다. 새 fix도 실패하거나 없거나 timeout이면 가장 최근 성공적으로 실행한 이전 update로 rollback을 시도한다. 이전 update가 없거나 이것도 실패하면 원래 error로 crash한다. 첫 화면 전에는 데이터 변경이 없을 것이라는 보호의 가정이지 임의 app 초기화의 side effect까지 증명하는 것은 아니다.

## Broken update 대응

이전 내용이 변경된 persistent state를 읽을 수 있는지 device 상태를 재현해 확인한 뒤 republish한다. 안전한 이전 update가 없다면 fix-forward한다. native incompatibility가 원인이면 runtime과 native build를 다시 점검한다. pause는 새 제공만 막으므로 이미 설치된 broken update 복구와 다르다.

## Stack trace 해석

Android는 원래 JS exception stack을 보존하지만 crash reporting에 따라 추가 재현이 필요할 수 있다. iOS stack이 EXUpdatesAppController/EXUpdatesErrorRecovery를 가리켜도 실제 원인은 JS일 수 있다. Apple crash report는 원래 exception message를 포함하지 않을 수 있어 Xcode debugger/macOS Console로 재현한다. source의 구체적 method 이름과 timer를 영구 API 계약으로 의존하지 않는다.

## 출처

- [Expo Documentation, Error recovery](https://docs.expo.dev/eas-update/error-recovery)

## 관련 문서

- [[Expo-EAS-Update-Rollbacks]]
- [[Expo-EAS-Update-Debug]]
- [[Expo-EAS-Update-Override]]
