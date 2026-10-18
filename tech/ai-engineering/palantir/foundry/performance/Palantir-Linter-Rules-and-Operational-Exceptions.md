---
tags: [palantir, linter]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Linter 규칙과 운영 예외

## 계산량 규칙을 해석한다

규칙은 고정 진리가 아니라 metadata 기반 heuristic이다. 최근 7일의 높은 build 점유, 고정 executor의 낮은 병렬성, 많은/작은 파일, 높은 memory/core ratio, 내용이 없는 copy transform 등을 비용 후보로 찾는다. Native/lightweight/local/incremental 전환은 실제 plan과 data semantics를 확인한 뒤 선택한다.

300 MB 이하 입력의 local 실행 후보라도 중간 join 증폭이나 향후 성장이 크면 적합하지 않다. Memory/core 7.5 GB 기준과 70% 병렬성 등은 해당 rule의 판단 기준이지 모든 작업의 안전 상한이 아니다. 자동 추정의 지난달 usage와 최근 1주 input 변화율이 서로 다른 기간을 쓴다는 점도 고려한다.

APPEND small-file 문제는 compaction/projection을 검토할 수 있다. Replace가 기존 파일을 변경/삭제하거나 SNAPSHOT이면 projection 재계산으로 이득이 없어질 수 있어 같은 처방을 복사하지 않는다. Dataset should be view는 통계상 로직이 없다는 후보이므로 실제 의미를 검토한다. Filtered projection이라는 rule 이름도 조건이 projection 부재를 찾는다는 설명과 구분한다.

## 스케줄 정합성과 의도

중복 schedule, self-trigger, trigger이지만 input이 아닌 대상, disconnected input, target/output 불일치와 잘못된 scope를 점검한다. Ignored 목록에 효과가 없는 자원, trashed dataset, 비어 있는 schedule도 의도와 대조한다. Unscheduled buildable input은 누락일 수 있지만 discretionary snapshot은 예외일 수 있다.

Non-default branch schedule은 실험 종료 후 방치됐을 가능성을 찾는 것이며 정상적인 대체 버전을 금지하는 규칙이 아니다. Force Build도 외부 API처럼 추적되지 않는 의존성이 있으면 필요할 수 있다. AND trigger로 비용을 줄이려면 모든 입력 갱신을 기다려도 freshness를 충족하는지 확인한다.

지난 30일 성공이 없는 schedule은 pause/fix/exclude 후보다. Unused 판단은 관측 가능한 하류 사용에 근거하므로 외부 소비와 중요한 비정기 작업을 확인한 뒤 중단한다. Abort on failure, exceeded-duration mode와 retry는 탐지 시간, source flake와 재실행 비용에 맞춘다.

## 저장소와 정확성

Default branch 보호, squash merge, upgrade PR 활성화/막힘과 stale JobSpec commit을 점검한다. Rule의 master라는 이름은 환경의 실제 default branch와 대조한다. Upgrade 자동 merge를 켜는 권고는 조직 검토 정책과 호환성 검증을 생략할 이유가 아니다.

Code Workbook/Contour 기반 production schedule은 Pipeline Builder/Code Repositories 이전 후보다. Warm module을 재사용하는 Workbook 구간은 같은 schedule로 모아 읽기 비용을 줄일 수 있다. Spark 비결정적 plan은 비용 문제와 별개로 출력 정확성을 조사한다. User-scoped schedule은 project-scoped token의 최소 범위로 전환할지 검토한다.

## 출처

- [Palantir Foundry, rules](https://www.palantir.com/docs/foundry/linter/rules/)

## 관련 문서

- [[Palantir-Foundry-Performance]]
