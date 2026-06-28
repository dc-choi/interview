---
tags: [database, mysql, aurora, parameter-group, tuning, operations]
status: done
category: "Database - RDBMS"
aliases: ["MySQL Aurora Parameter Tuning", "Aurora 파라미터 표준", "DB 파라미터 표준 튜닝", "max_connections", "ngram_token_size", "Aurora OOM Response"]
---

# MySQL/Aurora 파라미터 표준 튜닝 (fleet 안전)

기본 파라미터는 "특정 워크로드 최적"이 아니라 "넓은 호환과 안전"을 노려 잡혀 있다. 다양한 크기의 인스턴스가 섞인 fleet에서는 **작은 인스턴스(T 계열 등)에서 기본값이 오히려 위험**해지는 경우가 많다. 표준 파라미터 템플릿은 이 작은 인스턴스 안전과 일관성을 동시에 노린다. 파라미터를 표준 템플릿에서 복사해 적용하는 구조는 [[DB-Provisioning-Pipeline|DB 프로비저닝 파이프라인]] 참고.

## max_connections — 기본값은 작은 인스턴스에서 너무 낮다

작은 인스턴스의 기본 연결 수는 수십~백여 개 수준이라, 트래픽 증가나 인스턴스 변경 상황에서 빠르게 한계에 도달한다.

- **표준 접근**: 인스턴스 메모리 크기에 **로그 함수를 적용**해 크기별로 적절한 연결 수가 자동으로 나오도록 스케일링. (선형으로 늘리면 큰 인스턴스에서 과해진다)
- **트레이드오프**: 연결 수를 늘리면 **커넥션당 메모리**도 함께 늘어난다. 그래서 버퍼/임시테이블 메모리 파라미터와 **함께** 봐야 한다. 커넥션 자체의 비용 관리는 [[Connection-Pool|커넥션 풀]]로 보완.

## 버퍼 메모리 — 비율보다 '고정 차감'

InnoDB Buffer Pool(MySQL)과 Shared Buffers(PostgreSQL)는 데이터/인덱스 캐시 영역으로 성능을 좌우한다([[MySQL-InnoDB-Tuning|InnoDB 튜닝]]). 기본값은 메모리의 **큰 비율**로 잡혀 있어, 작은 인스턴스에서는 남는 메모리가 부족해진다.

- **표준 접근**: 비율로 줄이는 대신 **고정 크기를 차감**한다. 예) MySQL은 약 800MB, PostgreSQL은 약 850MB를 전체에서 빼고 나머지를 버퍼에 할당.
- **효과**: 작은 인스턴스에는 OS/커넥션/임시테이블용 여유 메모리를 확보해 주고, 큰 인스턴스에는 차감 비중이 작아 영향이 미미하다.

## temptable_max_ram / temptable_max_mmap — 임시 테이블 한계

MySQL 8.0의 **TempTable 엔진**은 내부 임시 테이블을 **메모리 → 로컬 스토리지 → 클러스터 스토리지** 순서로 처리한다.

- 기본 `temptable_max_ram`과 `temptable_max_mmap`이 작아 복잡한 쿼리(큰 GROUP BY, DISTINCT, 정렬)에서 한계가 빨리 온다.
- **Aurora Reader**에서는 로컬 스토리지 한계를 넘으면 에러가 날 수 있다(Reader는 쓰기 스토리지 제약이 다름).
- **표준 접근**: 최소값을 높여 작은 인스턴스에서도 임시 테이블 쿼리가 지나치게 쉽게 실패하지 않게 한다.

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

- 토큰 크기 **1**: 한 글자 검색도 가능하지만 후보 토큰이 폭발해 인덱스 크기와 검색 부하가 급증.
- 토큰 크기 **2**: 검색 품질과 부하의 균형점. 특별한 이유가 없으면 `ngram_token_size=2`를 표준으로.

## Aurora OOM Response — 인스턴스 재시작 방지

메모리가 부족할 때 아무 대응이 없으면 OS의 **OOM Killer가 DB 프로세스를 종료** → 인스턴스 재시작 → 서비스 영향.

- Aurora MySQL의 **OOM Response**는 메모리 부족 상황에서 문제 쿼리를 **기록하거나 종료**하는 기능.
- **표준 접근**: 문제 쿼리를 로그에 남기고(원인 추적), 위험한 쿼리는 종료해서 **"기록은 남기고 인스턴스는 살리는"** 방향. 프로세스 전체가 죽는 것보다 개별 쿼리를 희생하는 게 가용성에 낫다.

## 표준 파라미터 한눈에

| 파라미터 | 기본값 문제 | 표준 조정 | 목적 |
|----------|-------------|-----------|------|
| `max_connections` | 작은 인스턴스에서 너무 낮음 | 메모리에 로그 스케일링 | 연결 고갈 방지 |
| Buffer Pool / Shared Buffers | 큰 비율 → 여유 메모리 부족 | 고정 차감(MySQL ~800MB, PG ~850MB) | 작은 인스턴스 안정 |
| `temptable_max_ram/mmap` | 작아서 임시테이블 한계 | 최소값 상향 | 복잡 쿼리 실패 방지 |
| `sysdate_is_now` | SYSDATE 비결정성 | ON | 복제 안정, 인덱스 활용 |
| `cte_max_recursion_depth` | 폭주 가능 | 보수적 하향 | 재귀 쿼리 차단 |
| `ngram_token_size` | 1이면 부하 폭발 | 2 | 한국어 검색 균형 |
| Aurora OOM Response | 미설정 시 OOM Kill | 기록 + 위험 쿼리 종료 | 인스턴스 생존 |

## 면접 체크포인트

- 기본 파라미터가 작은 인스턴스(T 계열)에서 위험한 이유와 fleet 표준화의 의미
- max_connections를 선형이 아니라 **로그 스케일**로 잡는 이유 + 커넥션당 메모리 트레이드오프
- 버퍼를 비율이 아니라 **고정 차감**하는 게 작은/큰 인스턴스 모두에 안전한 이유
- `NOW()` vs `SYSDATE()` 차이가 복제와 인덱스에 미치는 영향
- ngram_token_size 1 vs 2의 검색 품질, 부하 균형
- OOM Response가 "프로세스 종료" 대신 "쿼리 종료"로 가용성을 지키는 메커니즘

## 출처
- [Aurora DB 생성 자동화와 표준 운영 — DB 밋업 (YouTube)](https://www.youtube.com/watch?v=NrPY9J1a2ag&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=4)

## 관련 문서
- [[DB-Provisioning-Pipeline|DB 프로비저닝 파이프라인]] — 이 파라미터를 템플릿으로 복사해 적용
- [[MySQL-InnoDB-Tuning|InnoDB 튜닝]] — Buffer Pool, redo log, I/O 심화
- [[MySQL-Architecture|MySQL 아키텍처]] — 옵티마이저, 복제 처리 맥락
- [[MySQL-Slow-Query-Diagnosis|Slow Query 진단]] — 파라미터 조정 효과 검증
- [[RDS-Aurora-Architecture|Aurora 아키텍처]] — Reader/Writer 스토리지 차이
