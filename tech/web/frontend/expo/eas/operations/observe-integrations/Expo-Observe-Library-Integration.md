---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Library의 Observe 선택적 통합"]
---

# Library의 Observe 선택적 통합

## 선택적 dependency

Library는 Observe가 없는 앱에서도 정상 동작하도록 optional peer dependency로 선언하고 개발 중에는 compatible expo-observe를 dev dependency로 사용한다. require 실패나 native module 부재를 처리해 계측 때문에 library 기능이 실패하지 않게 한다.

SDK 57부터 registerIntegration으로 package별 integration을 등록한다. 원문 예시에는 dependency >=58도 섞여 있으므로 설치 SDK와 실제 library release에 맞춘다. SDK 57 API 지원이라는 설명만으로 SDK 58 package를 강제로 설치하지 않는다.

## Config 계약

TypeScript declaration merging으로 ObserveIntegrationsConfig에 package key와 boolean/object 타입을 추가하고 package types entry에서 노출한다. true면 기본 config, object면 해당 config로 초기화한다. false 또는 누락이면 callback을 실행하지 않는다.

초기화는 중복 호출을 고려하고 event listener가 중복 등록되지 않게 한다. app의 configure 호출이 전체 config를 교체한다는 조건도 문서화한다. 원문의 인자 없는 함수 선언과 config를 넘기는 호출을 그대로 복제하지 않고 함수 signature를 일치시킨다.

## Event 설계

package namespace를 쓰되 expo. 예약 prefix를 사용하지 않는다. 이미지 decode나 네트워크 재시도처럼 행동 가능한 지표를 기록하고 매 render마다 무제한 event를 보내지 않는다. 사용자 데이터는 필요한 범위로 제한한다. native/SSR 환경 판정도 해당 library의 실제 실행 환경에 맞춰 확인한다.

## 출처

- [Expo Documentation, Integrate a third-party package with EAS Observe](https://docs.expo.dev/eas/observe/integrations/third-party)

## 관련 문서

- [[Expo-Observe-Integrations]]

- [[Expo]]
