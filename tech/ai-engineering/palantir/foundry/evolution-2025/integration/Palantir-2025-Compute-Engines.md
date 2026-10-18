---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 경량 엔진, 외부 compute와 virtual storage

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## 경량화가 바꾸는 실행 위치

- 1월 lightweight transforms에서 `transforms-media`를 Spark 없이 single node에서 사용할 수 있게 됐다.
- 2월 새 Spark Python repository template의 native acceleration이 기본 활성화됐다. 분산 Spark와 single-node lightweight가 같은 실행 방식이 되는 것은 아니다.
- 7월 Pipeline Builder lightweight 베타는 Rust/DataFusion 기반으로 15분 이하 batch/incremental pipeline에 적합하다고 소개됐다. 당시 Use LLM, media와 geospatial 등 미지원 기능이 있었고 변환 뒤 결과 비교가 필요했다.
- 9월 lightweight 기본 경로는 Polars/pandas 중심이며 큰 distributed workload에는 Spark를 조합했다. 공지의 2억 row/50GB 등의 수치는 경험적 가이드이며 hard quota로 해석하지 않는다.
- 11월 DuckDB native Python transforms는 single-node SQL, incremental와 partition output을 지원하고 memory/parallelism을 설정했다.
- 12월 Faster Pipelines GA는 DataFusion 경로를 확대했다. 기존 pipeline 변환 시 compatibility warning과 build 결과를 확인한다. engine 변경은 계산 의미와 resource 사용량을 함께 바꿀 수 있다.

## Virtual table과 pushdown은 다른 축

- 1월 Python transforms에서 Snowflake virtual table compute pushdown이 소개됐다.
- 4월 Databricks lightweight pushdown 베타, 6월 Databricks 연동 GA는 Unity REST/Iceberg catalog, vended storage credentials, virtual IO, incremental와 외부 모델을 묶었다. input/output과 compute에 같은 source를 요구하는 경로를 확인한다.
- 당시 virtual output 베타가 모든 pipeline 계산의 외부 실행을 뜻하지 않았다. Code Repositories는 명시적 pushdown 코드를 쓰고 Pipeline Builder는 별도 외부 compute 설정이 필요하다.
- 6월 Databricks/BigQuery/Snowflake bulk registration 베타, 8월 virtual update detection 베타는 각각 등록과 주기적 변경 감지다. 저장소의 virtual화와 실행 engine 전환을 나눠 판단한다.
- 8월 Iceberg CDC 베타는 `transforms-tables` changelog의 insert/update/delete를 제공했다. 11월 Databricks virtual object CDC indexing, managed Delta/managed Iceberg/external Delta output이 확대됐다.
- 11월 Pipeline Builder external Databricks 베타는 Foundry orchestration과 Databricks 실행을 분리했다. Jupyter Iceberg/Delta IO snippet도 추가됐다.
- 12월 Snowflake external Pipeline Builder는 제한적 opt-in 베타였고 `SnowflakeInput/Output`와 warehouse를 사용했다. Horizon REST virtual Iceberg는 warehouse를 경유하지 않는 direct storage/changelog 경로로 구분됐다.

## 적용 판단

저장 형식, catalog, credential vending, 변경 감지, orchestration과 compute engine를 각각 기록한다. 외부 table을 읽는다고 모든 계산이 외부에 pushdown되거나 Foundry 복제가 없다고 모든 metadata/로그가 외부에만 남는 것은 아니다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [June 5, 2025, Databricks enhanced connectivity and compute pushdown now available — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#30c0cf4c-8b53-42a0-8a51-da71d7951588)
- [June 5, 2025, Introducing virtual table outputs in data transformations [Beta] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#3494b4a3-6d95-482a-85f6-68b8b6f2adac)
- [September 9, 2025, Lightweight Python transforms enhanced with expanded features, better performance, and updated API — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#7699fea1-7729-4989-a9e9-4060f7a38d37)
- [November 6, 2025, Use Pipeline Builder external pipelines to push down compute to Databricks — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#9d38d948-cf36-41dc-a00f-92aae4df8c5c)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
- [[Palantir-Iceberg]]
