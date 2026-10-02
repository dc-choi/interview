---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Insights Workflow 추세"]
---

# Insights Workflow 추세

## 분석 가능한 값

Workflow 실행에서 자동 집계하며 총 runs, success rate, active workflows와 failed runs를 이전 같은 길이의 기간과 비교한다. 시간별 chart는 success/failure/canceled를 나누고 table은 파일별 실행 횟수, 성공률과 마지막 실행을 보여 준다.

Workflow/status/trigger/git ref/name으로 좁힌다. Dashboard에서 현재 필터의 run을 CSV/NDJSON으로 export할 수 있다. CLI에는 dashboard export와 동일한 export 버튼 기능이 없으며 JSON query로 집계를 읽는다.

## 범위와 지연

2026-10-01 기준 Production은 시작 시각이 최근30일, Enterprise는 최근365일 범위여야 한다. 프로젝트 소유 계정의 plan을 적용한다. 아직 종료하지 않은 run은 CLI 집계에 포함되지 않는다.

Aggregated data는 지연되거나 최근 실행이 누락될 수 있다. 청구나 보안 감사의 정본으로 사용하지 않는다. 선택 기간의 성공률이 좋아도 특정 플랫폼/trigger에서만 실패할 수 있으므로 분리해 조사한다.

## 출처

- [Expo Documentation, EAS Workflows insights](https://docs.expo.dev/eas-insights/workflows)

## 관련 문서

- [[Expo-EAS-Insights]]

- [[Expo]]
