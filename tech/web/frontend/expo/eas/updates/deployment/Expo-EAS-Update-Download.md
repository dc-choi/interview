---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update download, reload와 background 전략"]
---

# EAS Update download, reload와 background 전략

이 동작은 release 또는 EX_UPDATES_NATIVE_DEBUG 설정에 해당한다. 기본 cold boot check/download는 앱 시작을 막지 않는다. download 후 다음 완전 restart에서 적용되므로 채택이 느릴 수 있지만 느린 network에서 splash 대기를 피한다. updates.checkAutomatically=NEVER는 자동 check/download를 끈다.

## Foreground와 사용자 작업

checkForUpdateAsync는 manifest/availability만 검사하고 fetchUpdateAsync가 필요한 assets를 받는다. reloadAsync로 적용하며 useUpdates로 상태/오류를 표시한다. foreground 전환 또는 제한된 interval에 검사하고 사용자에게 적용 시점을 안내한다. 작업을 저장한 뒤 reload한다. rollback directive의 isAvailable=false도 처리하는 예제는 [[Expo-SDK-Updates-API]]에 있다.

항상 최신 download가 끝날 때까지 startup을 막는 전략은 update가 없어도 느린 network에서 대기할 수 있다. critical/mandatory update는 first-class 기능이 없으며 앱이 metadata와 정책을 설계한다. backend minimum version 요구, offline 진입과 실패 시 재시도도 함께 판단한다.

## Background task

expo-background-task에서 check/fetch하여 다음 launch에 미리 준비할 수 있다. OS scheduling은 보장된 정확한 주기가 아니며 [[Expo-SDK-TaskManager]]의 task를 module global scope에서 정의한다. 원문은 setup 함수 안에 defineTask와 반환 Promise.resolve를 두었지만 실제 BackgroundTask 결과 계약을 따라 성공/실패를 반환한다.

background download와 background reload는 구분한다. reload는 **실험적**이며 crash/adoption을 관찰하고 상태 저장/복원을 설계해야 한다. 사용자가 돌아올 때 예상하지 못한 cold boot를 만들 수 있어 충분히 inactive인 경우에만 적용하거나 다음 restart까지 기다린다. 예제의 minimumInterval=60*24는 minutes이며 OS가 정하는 실행 조건을 무시하지 않는다.

## 채택 관찰

update details는 실행 사용자 수와 failed install(다운로드 후 실행 실패)을, deployment(channel/runtime)는 기간별 update 실행 분포를 제공한다. publish 성공, download 완료와 launch 성공을 다른 단계로 관찰한다. client override는 header-only와 URL override의 적용 시점을 구분한다.

## 출처

- [Expo Documentation, Downloading updates](https://docs.expo.dev/eas-update/download-updates)

## 관련 문서

- [[Expo-SDK-Updates]]
- [[Expo-SDK-Updates-API]]
- [[Expo-EAS-Update-Override]]
