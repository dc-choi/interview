---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Insights 앱 사용량"]
---

# EAS Insights 앱 사용량

## 세 가지 분석 영역

Insights는 App usage, Workflows, Maestro tab으로 나뉜다. 앱 사용자 추세, CI 실행 추세와 E2E test 추세를 한 계기판에서 확인하지만 수집 근거와 단위는 다르다. 개별 실행의 확정 상태가 필요하면 해당 run detail과 log로 돌아간다.

## App usage 수집

EAS Update를 사용하면 기존 update-check 요청을 집계하여 플랫폼/시간별 제한된 usage view를 제공한다. expo-insights를 설치하고 project ID를 연결한 새 native build는 cold start event를 보내 더 정밀한 usage와 store version 구분을 제공한다.

Update 확인 요청 수, cold start event 수와 로그인한 사람 수는 같은 지표가 아니다. 앱을 종료하지 않고 오래 사용하는 경우와 여러 installation을 가진 경우를 고려한다. 현재 library를 모든 사용자 행동을 기록하는 analytics API로 가정하지 않는다.

App usage는 preview이며 preview 동안 무료라는 문서 조건이다. Workflows/Maestro plan 조건을 이 tab에 일괄 적용하지 않는다.

## 출처

- [Expo Documentation, EAS Insights](https://docs.expo.dev/eas-insights/introduction)
- [Expo Documentation, App usage](https://docs.expo.dev/eas-insights/app-usage)

## 관련 문서

- [[Expo-EAS-Insights]]

- [[Expo]]
