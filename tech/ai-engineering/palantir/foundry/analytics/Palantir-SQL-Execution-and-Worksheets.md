---
tags: [palantir, sql-studio, ontology-sql, furnace]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry SQL 실행 engine과 worksheet"]
---

# SQL 실행 engine과 worksheet

SQL Studio는 tabular data와 Ontology object를 공통 Spark SQL dialect로 탐색하는 전용 UI다. 하나의 앱과 dialect를 쓴다는 것이 같은 engine, 쓰기 지원과 performance를 뜻하지 않는다. 아래는 2026년 5월 도입 공지의 계약이며 당시 beta에 6월 15일 주 GA 갱신이 붙어 있다.

## Query shape에 따라 실행 경로가 달라진다

Ontology SQL은 object와 many-to-many link를 읽고 지원 shape는 object storage의 in-memory path, 복잡한 query는 Spark로 route한다. Furnace는 tabular query를 Trino/Spark로 route하며 읽기/쓰기를 지원한다. Low-latency 소개와 모든 query의 latency 보장을 구분한다.

SQL Studio는 data/object mode를 바꾸고 table/chart preview를 표시한다. 당시 default 1,000행, 적합한 권한으로 최대 10,000행을 반환하는 설정이었다. Result limit에 맞는 preview가 전체 input에 같은 집계/품질을 보장하는지 query 의미를 확인한다.

## 읽기, dataset 생성과 table mutation을 나눈다

Dataset은 CREATE TABLE, Iceberg는 CREATE/INSERT/UPDATE/DELETE, Ontology object mode는 읽기였다. Ontology를 직접 SQL UPDATE하는 경로로 일반화하지 않는다. Published parameterized Ontology SQL function은 Workshop/Action/Automate/OSDK에서 소비하는 재사용 경로지만 최초 공지에는 beta/experimental과 enrollment 제한이 함께 남아 있다. 실제 enablement와 현재 전용 문서를 확인한다.

AI side panel은 editor/query/schema를 보고 작성/설명을 돕는다. 제안 query의 권한과 mutation 대상, result cardinality를 실행 전에 검토한다. Model의 설명이 실행 계획/데이터 검증을 대체하지 않는다.

## Worksheet 저장과 실행 결과를 구분한다

6월 GA는 scatter/pie/histogram/custom Vega, 다중 editor tab과 `SHOW FUNCTIONS`를 추가했고 SQL function은 enrollment 제한이 있는 beta로 설명했다. Worksheet branching/Marketplace와 production CI, reusable stored procedure는 여전히 후속 계획이었다. 앱의 GA와 별도 기능의 lifecycle을 나눠 확인한다.

Scratchpad는 일회성 작업, private/project worksheet는 재사용/공유를 위한 코드 자원이다. Save가 version을 만들고 unsaved edit는 auto-stage할 수 있다. 코드/worksheet 보존, query history와 반환 row의 snapshot 보존을 같은 것으로 취급하지 않는다.

당시 Global Branching/Marketplace worksheet packaging과 production pipeline/Git CI 연계는 후속 계획이었다. Worksheet 저장을 production pipeline 배포로 보고하지 않는다.

Workshop SQL query variable은 module 내부 계산이며 reusable SQL function과 다르다. 2026년 8월에는 Object/Interface Set table과 bound parameter를 `@alias`로 참조하고 parameter 변경 시 재계산했다. Scalar는 1행1열, array는 단일 column의 모든 row/array cell을 flatten, struct는 반환 column에서 field를 유도한다. Many-to-many join table은 당시 후속 계획이었다. 반환 shape와 widget binding을 함께 검증한다.

## 출처

- [Palantir, May 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-05)
- [Palantir, June 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-06)
- [Palantir, August 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-08)

## 관련 문서

- [[Palantir-SQL-Drivers-and-BI-Connectivity|외부 SQL client 연결]]
- [[Palantir-Analysis-and-Output-Semantics|분석과 출력물]]
- [[Palantir-Branching-and-Packaging-Boundaries|Branch와 배포]]
