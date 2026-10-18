---
tags: [palantir, dataset, iceberg, time-travel, retention]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 데이터 이력과 Time Travel"]
---

# 데이터 이력과 Time Travel

Time Travel은 dataset/Iceberg의 committed version을 읽고 비교하는 조사 도구다. 과거 데이터를 본다는 것과 현재 상태를 rollback하는 것은 다르다. 아래는 2026년 7월 beta 도입 계약이다.

## 같은 query로 version을 비교한다

Single version은 선택 시점의 data/schema를 보여주고 Refine query의 SQL filter/column/sort/aggregate를 유지한 채 timeline을 이동한다. 비교 시점마다 분석 조건이 달라져 차이를 잘못 해석하지 않도록 query도 함께 확인한다.

Range는 두 version 사이 added/removed/modified와 schema 변화를 보여준다. Unique row key를 고르지 않으면 값 변경이 removal+addition으로 나타난다. Key 선택은 차이 표현의 정체성 계약이며 중복 key를 임의로 동일 객체라고 판단하지 않는다.

## 검색 범위와 보존 범위를 명시한다

Bisect는 row 추가/삭제 또는 cell 값 변경의 첫 시점을 찾지만 현재 page에 로드한 version만 검색한다. 결과 없음은 전체 역사의 부재를 증명하지 않는다. 필요한 timeline 범위를 먼저 로드한다.

Retention에 따라 데이터가 남아 있는 version만 조사할 수 있다. Transaction metadata가 보존돼도 row가 복원 가능하다는 뜻은 아니다. Media path version, model evaluation version과 branch-only data deletion도 각각 별도 retention 계약이다.

## 출처

- [Palantir, July 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-07)

## 관련 문서

- [[Palantir-Pipeline-Execution-and-Review|Rollback과 다음 build의 snapshot]]
- [[Palantir-Media-Extraction-and-Evidence|Media version과 보존]]
- [[Palantir-Branching-and-Packaging-Boundaries|Branch data lifecycle]]
