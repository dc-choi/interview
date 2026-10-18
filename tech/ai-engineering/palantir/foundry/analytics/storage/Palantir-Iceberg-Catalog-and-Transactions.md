---
tags: [palantir, iceberg, catalog, transaction, storage]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir Iceberg catalog와 transaction"]
---

# Iceberg catalog와 transaction

Palantir-managed Iceberg와 REST catalog는 open table format 위에 Foundry의 transaction, branch, permission과 pipeline integration을 연결한다. 아래는 2026년 9월 GA 공지의 계약이며 실제 write/concurrency/복구를 시험한 결과는 아니다.

## Open format과 catalog의 보장을 나눈다

Iceberg format은 row insert/update/delete, snapshot/changelog와 table layout/compaction을 제공하는 기반이다. Palantir catalog는 job의 여러 table write에 all-or-nothing transaction을 제공한다고 명시했다. 이 보장을 임의 외부 engine의 여러 독립 commit이나 외부 API 호출까지 확대하지 않는다.

Schema branch isolation은 branch별 current schema/default partition spec/default sort order를 분리한다. 데이터 branch를 골랐다고 schema가 Main과 무조건 같아야 하는 것은 아니다. Code/input/output branch와 실제 consumer가 참조하는 schema를 함께 확인한다.

## Credential vending은 접근 검사를 거친다

호환 client는 Foundry 인증으로 catalog에 연결하고 table permission과 inherited marking을 확인한 뒤 read용 storage credential을 받는다. Bucket credential을 각 사용자에게 직접 배포하는 것과 다르다. Credential을 받은 이후의 유효기간/범위와 external client의 저장/로그는 별도 구현 계약으로 확인한다.

Managed storage 또는 customer-provided bucket을 사용하고 space/project마다 file system을 달리할 수 있다. Storage 소유, catalog 관리와 table permission은 서로 다른 운영 책임이다. 2026년 9월 GA 범위는 AWS/Azure/GCP의 standard enterprise environment이며 관리자/ISO가 settings를 enable/configure해야 했다.

## Table 상태와 업무 객체를 연결한다

지원 connector sync, Python/Builder pipeline과 Ontology backing, Contour/SQL/lineage로 table을 연결한다. Source별 sync 지원과 Object Storage 재색인 경로를 각각 확인한다. Table mutation이 객체 조회에 즉시 반영됐다는 보장으로 읽지 않는다.

Compaction은 작은 file/layout의 성능, snapshot expiration은 보존/재현의 선택이다. Changelog incremental의 insert/update/delete와 append-only dataset의 incremental 계산을 같은 의미로 취급하지 않는다.

2026년 10월 Faster Builder는 encrypted/unencrypted Iceberg input/output과 dataset 혼합, snapshot overwrite/incremental append output을 지원했다. **Faster의 incremental Iceberg input 읽기는 당시 미지원**이므로 incremental output 지원과 혼동하지 않는다. Output data-quality expectation은 publish 전에 build를 실패시키는 gate이며 단순 사후 health chart와 다르다.

## 출처

- [Palantir, September 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-09)
- [Palantir, October 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-10)

## 관련 문서

- [[Palantir-Data-History-and-Time-Travel|Snapshot 조사와 retention]]
- [[Palantir-Object-Backend|객체 색인]]
- [[Palantir-SQL-Execution-and-Worksheets|SQL 실행과 쓰기]]
