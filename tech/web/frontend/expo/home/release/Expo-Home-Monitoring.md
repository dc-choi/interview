---
tags: [expo, react-native, release]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 운영 관측 서비스 선택"]
---

# Expo 운영 관측 서비스 선택

## 관측 질문

usage는 누가 어떤 version/update를 사용하는지, error monitoring은 어떤 실패가 발생하는지, performance는 언제/어떤 device에서 느린지, session replay는 어떤 사용 흐름에서 문제가 생겼는지를 다룬다. 한 지표를 전체 사용자 경험으로 해석하지 않는다.

| 도구 | 주요 신호 |
| --- | --- |
| EAS Insights App usage | EAS Update requests와 expo-insights의 platform/store version/time별 usage |
| EAS Insights Workflows | 실행 수, 성공률과 추세 |
| EAS Insights Maestro | E2E pass/flake/failure 추세 |
| EAS Observe | cold launch, first render, interactive, rendering, device/network 조건과 custom event |
| LogRocket | session replay, update ID별 filtering, EAS dashboard integration |
| Sentry | exception/crash stack, device/version/context, alerts |
| BugSnag | stability/error reporting과 analytics |
| PostHog | product analytics, session replay, feature flags, error tracking |

EAS Insights의 update request 기반 집계는 모든 사용자 행동 event와 같지 않다. Observe는 `expo-observe` 등의 instrumentation에서 사용자 session performance를 수집하며 custom events를 함께 볼 수 있다. 보고 대상과 sampling이 다르면 수치 비교를 직접 하지 않는다.

## Integration과 release 연결

Sentry는 route 같은 app-specific context를 추가할 수 있지만 사용자 identifier/민감값의 수집 정책을 먼저 정한다. LogRocket은 update ID로 session을 좁히고 EAS에서 계정 연결로 접근할 수 있다. PostHog EAS CLI integration은 project provisioning, SDK setup와 update release tagging을 도와 release별 analytics/errors를 filtering한다.

현재 SDK/platform에 맞는 native dependency와 upload/source-map 설정을 해당 guide에서 확인한다. service 설치만으로 exception capture, symbols나 release association이 완료되었다고 간주하지 않는다.

## 운영 확인

재현 가능한 오류와 startup/navigation 시나리오를 통해 event가 도착하는지 검증한다. build/store version/update ID를 함께 기록해 regression 범위를 찾는다. crash rate의 denominator, session volume, device/network distribution과 rollout cohort를 확인한다.

session replay, network payload와 user events는 PII를 포함할 수 있으므로 masking, retention와 consent 요구를 실제 data flow에서 검토한다. monitoring 도구가 anonymized usage를 소개한다고 모든 custom payload도 자동 익명화되는 것은 아니다.

## 출처

- [Expo Documentation, Monitoring services](https://docs.expo.dev/monitoring/services)

## 관련 문서

- [[Expo-Home-Debugging-Runtime]]
- [[Expo-Home-Release-Updates]]
