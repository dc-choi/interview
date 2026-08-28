---
tags: [database, mysql, aurora, parameter-group, tuning, operations]
status: done
verified_at: 2026-08-28
category: "Database - RDBMS"
aliases: ["MySQL Aurora Parameter Tuning", "Aurora 파라미터 표준", "DB 파라미터 표준 튜닝", "max_connections", "ngram_token_size", "Aurora OOM Response"]
---

# MySQL/Aurora 파라미터 표준 튜닝 (fleet 안전)

이 문서의 파라미터 동작 서술은 출처의 밋업 발표 기준이고, 공식 문서로 대조한 항목만 본문에 별도로 표기한다. 기본 파라미터는 특정 워크로드 최적이 아니라 넓은 호환과 안전을 노려 잡혀 있다. 다양한 크기의 인스턴스가 섞인 fleet에서는 **작은 인스턴스(T 계열 등)에서 기본값이 오히려 위험**해지는 경우가 많다. 표준 파라미터 템플릿은 이 작은 인스턴스 안전과 일관성을 동시에 노린다. 파라미터를 표준 템플릿에서 복사해 적용하는 구조는 [[DB-Provisioning-Pipeline|DB 프로비저닝 파이프라인]] 참고.

## max_connections — 기본값은 작은 인스턴스에서 너무 낮다

작은 인스턴스의 기본 연결 수는 수십~백여 개 수준이라, 트래픽 증가나 인스턴스 변경 상황에서 빠르게 한계에 도달한다.

- **표준 접근**: 인스턴스 메모리 크기에 **로그 함수를 적용**해 크기별로 적절한 연결 수가 자동으로 나오도록 스케일링. (선형으로 늘리면 큰 인스턴스에서 과해진다)
- **트레이드오프**: 연결 수를 늘리면 **커넥션당 메모리**도 함께 늘어난다. 그래서 버퍼/임시테이블 메모리 파라미터와 **함께** 봐야 한다. 커넥션 자체의 비용 관리는 [[Connection-Pool|커넥션 풀]]로 보완.

## 버퍼 메모리 — 비율보다 고정 차감

InnoDB Buffer Pool(MySQL)과 Shared Buffers(PostgreSQL)는 데이터/인덱스 캐시 영역으로 성능을 좌우한다([[MySQL-InnoDB-Tuning|InnoDB 튜닝]]). 기본값은 메모리의 **큰 비율**로 잡혀 있어, 작은 인스턴스에서는 남는 메모리가 부족해진다.

- **표준 접근**: 비율로 줄이는 대신 **고정 크기를 차감**한다. 예) MySQL은 약 800MB, PostgreSQL은 약 850MB를 전체에서 빼고 나머지를 버퍼에 할당.
- **효과**: 작은 인스턴스에는 OS/커넥션/임시테이블용 여유 메모리를 확보해 주고, 큰 인스턴스에는 차감 비중이 작아 영향이 미미하다.

## temptable_max_ram / temptable_max_mmap — 임시 테이블 한계

Aurora MySQL v3의 **TempTable 엔진**은 DB 인스턴스의 내부 임시 테이블이 공유하는 메모리 풀을 사용한다. `temptable_max_ram`을 넘은 데이터는 writer에서 local storage의 memory-mapped file 또는 on-disk InnoDB temporary table로 넘길 수 있다. Reader는 Aurora cluster volume에 쓸 수 없고 overflow가 local storage의 memory-mapped file에만 머문다.

- `temptable_max_ram`은 쿼리별 한도가 아니라 공유 풀이다. 너무 크게 잡으면 인스턴스 여유 메모리를 줄여 OOM을 유발할 수 있다.
- Reader는 global TempTable limit 또는 `temptable_max_mmap` 한계를 넘으면 쿼리가 `Table is full` 오류로 끝날 수 있다.
- **표준 접근**: 값을 일괄 상향하지 말고 workload의 합산 임시 데이터, `FreeableMemory`, `FreeLocalStorage`를 기준으로 RAM과 mmap 예산을 함께 정한다. Aurora MySQL 3.04+에서 per-table limit을 켠 경우에는 `tmp_table_size`도 별도 검증한다.

## sysdate_is_now — 시간 함수의 예측 가능성

| 함수 | 반환 시각 |
|------|-----------|
| `NOW()` | **쿼리 시작 시각** (statement 단위로 고정) |
| `SYSDATE()` | **함수가 실행되는 그 순간**의 시각 |

이 차이가 문제를 만든다: `SYSDATE()`는 statement-based 복제에서 마스터/레플리카 값이 어긋날 수 있고, **함수 결과가 행마다 달라져 인덱스를 못 타는** 경우가 생긴다.

- **표준 접근**: `sysdate_is_now`를 켜서 `SYSDATE()`가 `NOW()`처럼 동작하게 만든다 → 복제 안정성과 인덱스 활용 가능성 확보.

## cte_max_recursion_depth — 재귀 CTE 폭주 차단

재귀 CTE는 계층형/트리 데이터 조회에 유용하지만, 잘못 작성하면 무한 루프처럼 동작해 DB 자원을 과소비한다.

- **표준 접근**: `cte_max_recursion_depth`를 **보수적으로 낮게** 설정해 비정상 재귀 쿼리를 빠르게 차단.
- 깊은 재귀가 정말 필요하면 DB가 아니라 **애플리케이션에서 처리**하는 편이 적합한 경우가 많다.

## ngram_token_size — 한국어 Fulltext 균형점

MySQL Fulltext의 **n-gram 파서**는 문장을 N글자 단위로 쪼개 인덱스를 만든다. 한국어는 띄어쓰기만으로 단어 분리가 어려워 n-gram 방식이 유용하다.

- 토큰 크기 **1**: 한 글자 검색이 필요할 때만. 공식 문서는 token size가 작을수록 인덱스가 작고 검색이 빠르다고 하지만, 발표 사례 기준으로는 한 글자 매칭 후보가 넓어져 검색 부하와 결과 노이즈가 커진다.
- 토큰 크기 **2**: 검색 품질과 부하의 균형점. 특별한 이유가 없으면 `ngram_token_size=2`를 표준으로.

## Aurora OOM Response — 인스턴스 재시작 방지

메모리가 부족하면 OS가 DB 프로세스를 종료해 재시작될 수 있다. Aurora의 OOM 대응은 이를 줄일 수 있지만 엔진 버전과 인스턴스 유형에 따라 동작이 다르다.

- Aurora MySQL 8.4에서는 기본값인 `aurora_enable_memory_management=ON`일 때 Aurora가 복구 동작을 관리하며 `aurora_oom_response`는 무시된다.
- `kill_query`는 메모리를 많이 쓰는 `SELECT`를 종료하지만 DDL, 다른 DML, 트랜잭션에는 적용되지 않는다. `kill_connect`는 연결을 종료하고 진행 중인 트랜잭션을 롤백하며 DDL도 종료할 수 있다.
- **표준 접근**: 공통 문자열을 배포하지 말고 대상 엔진 버전, provisioned 또는 Serverless v2, 허용 가능한 롤백 범위를 확인한 뒤 복구 동작을 스테이징에서 검증한다. 로그와 CloudWatch OOM 지표도 함께 관측한다.

## 표준 파라미터 한눈에

| 파라미터 | 기본값 문제 | 표준 조정 | 목적 |
|----------|-------------|-----------|------|
| `max_connections` | 작은 인스턴스에서 너무 낮음 | 메모리에 로그 스케일링 | 연결 고갈 방지 |
| Buffer Pool / Shared Buffers | 큰 비율 → 여유 메모리 부족 | 고정 차감(MySQL ~800MB, PG ~850MB) | 작은 인스턴스 안정 |
| `temptable_max_ram/mmap` | 공유 메모리와 local storage 한계 | workload 예산과 관측으로 조정 | 복잡 쿼리와 OOM 위험의 균형 |
| `sysdate_is_now` | SYSDATE 비결정성 | ON | 복제 안정, 인덱스 활용 |
| `cte_max_recursion_depth` | 폭주 가능 | 보수적 하향 | 재귀 쿼리 차단 |
| `ngram_token_size` | 1이면 한 글자 후보 노이즈 | 2 | 한국어 검색 균형 |
| Aurora OOM Response | 버전, 인스턴스별 동작 차이 | 지원 여부와 롤백 영향 확인 후 설정 | 재시작 위험 완화 |

## 면접 체크포인트

- 기본 파라미터가 작은 인스턴스(T 계열)에서 위험한 이유와 fleet 표준화의 의미
- max_connections를 선형이 아니라 **로그 스케일**로 잡는 이유 + 커넥션당 메모리 트레이드오프
- 버퍼를 비율이 아니라 **고정 차감**하는 게 작은/큰 인스턴스 모두에 안전한 이유
- `NOW()` vs `SYSDATE()` 차이가 복제와 인덱스에 미치는 영향
- ngram_token_size 1 vs 2의 검색 품질, 부하 균형
- 엔진 버전과 인스턴스 유형에 따라 자동 메모리 관리와 configured OOM action이 달라지는 이유, 종료 대상과 트랜잭션 롤백 범위

## 출처
- [Aurora DB 생성 자동화와 표준 운영 — DB 밋업 (YouTube)](https://www.youtube.com/watch?v=NrPY9J1a2ag&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=4)
- [MySQL 8.4 Reference Manual, ngram Full-Text Parser](https://dev.mysql.com/doc/refman/8.4/en/fulltext-search-ngram.html)
- [Amazon Aurora, New temporary table behavior in Aurora MySQL version 3](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/ams3-temptable-behavior.html)
- [Amazon Aurora, Troubleshooting out-of-memory issues for Aurora MySQL databases](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQLOOM.html)

## 관련 문서
- [[DB-Provisioning-Pipeline|DB 프로비저닝 파이프라인]] — 이 파라미터를 템플릿으로 복사해 적용
- [[MySQL-InnoDB-Tuning|InnoDB 튜닝]] — Buffer Pool, redo log, I/O 심화
- [[MySQL-Architecture|MySQL 아키텍처]] — 옵티마이저, 복제 처리 맥락
- [[MySQL-Slow-Query-Diagnosis|Slow Query 진단]] — 파라미터 조정 효과 검증
- [[MySQL-SQL-Mode|MySQL SQL Mode]] — 파라미터 그룹이 덮는 sql_mode와 strict 전환
- [[RDS-Aurora-Architecture|Aurora 아키텍처]] — Reader/Writer 스토리지 차이
