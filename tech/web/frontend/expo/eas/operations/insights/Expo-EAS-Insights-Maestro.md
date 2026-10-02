---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Insights Maestro 실패와 flaky 분석"]
---

# Insights Maestro 실패와 flaky 분석

## 결과 수집 조건

EAS Workflow의 maestro job이 생성한 JUnit report를 수집한다. output_format의 기본 junit 대신 html 등을 쓰면 이 Insights에 결과가 나타나지 않는다. 테스트가 실행됐다는 사실과 집계 데이터 수신을 분리한다.

PASSED는 첫 시도 성공, FLAKY는 재시도 뒤 성공, FAILED는 최종 실패다. **Pass rate에는 flaky 성공도 포함된다.** 높은 pass rate만으로 안정적인 테스트라고 판단하지 않는다.

## Flow별 조사

Runs/pass rate/fails/flake rate/p90 duration/last run을 비교한다. Workflow/status/tag/branch로 필터하고 flow path로 검색한다. Flow detail은 error pattern, 최근 run, retry 여부와 branch/commit을 연결한다.

문제 flow의 error pattern과 원래 Maestro log/artifact를 대조한다. 같은 오류 문자열이 같은 원인을 보장하지 않는다. Production30일/Enterprise365일 lookback과 집계 지연은 Workflow Insights와 같다.

## 출처

- [Expo Documentation, Maestro insights](https://docs.expo.dev/eas-insights/maestro)

## 관련 문서

- [[Expo-EAS-Insights]]

- [[Expo]]
