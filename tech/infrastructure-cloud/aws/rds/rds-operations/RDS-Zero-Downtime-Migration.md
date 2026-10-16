---
tags: [infrastructure, aws, rds, migration, dms, cdc, blue-green, zero-downtime]
status: done
verified_at: 2026-10-13
category: "Infrastructure - AWS"
aliases: ["RDS Zero Downtime Migration", "무중단 마이그레이션", "near-zero downtime cutover", "AUTO_INCREMENT drift"]
---

# 무중단(near-zero) RDS 마이그레이션

> 상위 문서: [[RDS-Migration-Scenarios|RDS 데이터 마이그레이션 — 언제 필요한가]]

초기 복사 중 서비스를 유지하고 최종 전환의 중단을 줄이는 것이 목표다. **near-zero는 중단 시간 보장이 아니다.** 복제 지연, 승격, 검증과 재연결 시간을 리허설로 확인한다. 어떤 상황에서 옮기는지는 [[RDS-Migration-Scenarios]], 여기서는 그 전환과 복구 조건을 다룬다.

## 공통 골격 — 초기 복사, 변경 추적, 전환

온라인 데이터 이전에서 자주 쓰는 흐름이다. 관리형 복제와 엔진별 승격 절차는 이 개념적 흐름을 서로 다르게 구현한다.

1. **Full Load(초기 적재)** — 기존 데이터를 통째로 복사. 이 동안 소스는 계속 살아 쓰기를 받는다.
2. **CDC(Change Data Capture)** — full load 도중과 이후의 변경분을 추적하고 타깃에 적용한다. 적용 지연이 있으므로 두 DB가 매 순간 같은 상태라는 뜻은 아니다.
3. **Cutover(전환)** — 쓰기를 잠깐 멈추고, 타깃이 마지막 변경분까지 따라잡으면 앱을 타깃으로 돌리고 쓰기 재개.

**쓰기 중단 구간과 사용자가 체감하는 장애 구간을 따로 측정한다.** CDC가 전환 직전까지 변경분을 줄여도 연결 종료, DNS 반영과 앱 재시도가 끝나야 요청이 회복된다.

## 방법 세 가지

- **Blue/Green Deployment (관리형, 동종/업그레이드)** — blue의 복사본 green에서 지원되는 변경을 검증하고 전환한다. RDS PostgreSQL은 조건에 따라 물리 또는 논리 복제를 사용하므로 스키마 변경 허용 범위를 먼저 확인한다. 전환은 쓰기와 연결 차단, 복제 따라잡기, 이름 변경을 포함한다. **기존 운영 엔드포인트 이름을 green이 이어받지만 재연결은 필요하다.** 지원 엔진, 버전과 리전을 공식 지원표로 확인한다.
- **DMS + CDC (이기종/복잡)** — 엔진 전환 등에서 검토하는 데이터 이전 수단이다. 지원되는 소스와 타깃, 로그 설정, 보존 기간과 변환 제약을 확인한다. 스키마 변환과 앱 호환성 수정까지 DMS가 대신한다고 가정하지 않는다. 메커니즘은 [[DMS]].
- **Read Replica 승격 (동종/리전 이동)** — 지원되는 복제본을 따라잡게 한 뒤 독립 DB로 승격하고 앱을 전환한다. 승격은 기존 복제 관계를 끊으며 RDS가 인스턴스를 재부팅한다. **수 분 이상 걸릴 수 있으므로** DMS 컷오버와 같은 중단 시간으로 가정하지 않는다. 리전 간 복제와 엔진/버전 조합의 지원 여부도 확인한다.

같은 엔진 업그레이드는 Blue/Green, 엔진 전환은 DMS, 동종 이전은 Read Replica 승격을 후보로 비교한다. 지원 조합과 허용 중단 시간, 복구 절차를 확인한 뒤 선택한다.

### Cloud SQL PostgreSQL 소스의 초기 복사와 CDC를 구분한다

부분 검증(2026-10-16): AWS DMS의 Google Cloud PostgreSQL 소스 문서와 작업 생성 문서를 대조했다. **Full Load만 완료한 결과는 지속 복제나 온라인 컷오버를 검증한 결과가 아니다.** 초기 복사와 이후 변경 반영이 모두 필요하면 `full-load-and-cdc` 작업을 선택하고 실제 변경 전파까지 확인한다.

- Cloud SQL PostgreSQL에서 논리 디코딩을 사용하려면 `cloudsql.logical_decoding=on`을 설정한다. `pglogical`을 사용할 때는 `cloudsql.enable_pglogical=on`과 DB 재시작이 필요하다.
- DMS는 소스에서 `pglogical`을 사용할 수 있으면 해당 플러그인을, 그렇지 않으면 `test_decoding`을 사용한다. 두 플래그를 모든 Full Load 작업의 필수 조건으로 묶지 않는다.
- 논리 디코딩 사용자에는 `REPLICATION` 속성이 필요하고, `pglogical`을 사용한다면 `cloudsqlsuperuser` 역할도 필요하다. 복제 슬롯 수는 동시에 실행할 DMS 작업 수를 고려해 설정한다.

적용 점검: 소스의 변경 추적 설정과 타깃의 적재 설정을 따로 검토한다. 작은 표를 복사한 뒤 행 수와 조회 결과가 맞아도, 변경 추적과 쓰기 정지, 시퀀스 보정, 앱 전환과 복구까지 시험한 것은 아니다. 이 절은 설정과 작업 유형의 문서 대조이며 실제 클라우드 간 이전을 실행한 결과는 아니다.

## 컷오버 시퀀스 — 여기서 사고가 난다

방법을 골랐어도 실제로 데이는 건 전환 순간이다. 이 순서를 지킨다.

```
1. 사전: 초기 적재, 데이터 검증과 복제 상태를 확인
2. 소스 쓰기 정지          ← 쓰기 중단 시작 (API, 배치와 워커 포함)
3. 진행 중 쓰기 종료와 마지막 변경분의 타깃 적용을 확인
4. 남은 차이, 미검증 행과 핵심 업무 불변조건을 검사
5. AUTO_INCREMENT / 시퀀스 값과 필요한 승격 절차를 확인
6. 앱 연결을 타깃으로 전환하고 기존 연결을 정리
7. 새 타깃에서 쓰기 재개 후 실제 요청 성공을 확인
```

위 순서는 수동 컷오버의 점검 틀이다. 관리형 Blue/Green에서는 AWS가 제공하는 전환 절차를 따른다. 지연 지표 하나가 0이라는 사실만으로 모든 테이블의 이전과 검증이 완료됐다고 판단하지 않는다.

## 컷오버 함정 (사고의 대부분)

### AUTO_INCREMENT / 시퀀스 드리프트 — 가장 악명 높은 함정

DMS 같은 논리적 적재에서 행은 옮겨졌어도 ID 생성기의 다음 값이 기존 키와 겹치면 **중복 키 에러(PK 충돌)**가 발생한다. DMS는 PostgreSQL 타깃의 시퀀스를 CDC로 이전하지 않으므로 복제를 멈춘 뒤 보정한다. 빈 테이블, 증가폭과 여러 테이블이 공유하는 시퀀스는 별도로 확인한다. 다음 예시는 쓰기를 멈춘 상태의 비어 있지 않은 테이블과 증가폭 1을 전제한다.

```sql
-- PostgreSQL: 다음 nextval이 max(id)+1이 되도록 현재 값을 설정
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
```

```sql
-- MySQL: 다음 값 확인 후 보정
SHOW TABLE STATUS LIKE 'users';            -- Auto_increment 값 확인
ALTER TABLE users AUTO_INCREMENT = <max(id)+1>;
```

컷오버 체크리스트에 반드시 넣는다. 놓치면 전환 직후 서비스가 PK 에러로 도배된다.

### DNS/엔드포인트 전환

- 앱 설정에 RDS 엔드포인트를 박아두면 재배포가 필요하고, 커넥션 풀이 옛 커넥션을 붙잡아 깔끔하지 않다.
- **Route 53 CNAME** 같은 별칭은 전환 선택지다. TTL을 낮춰도 기존 연결은 바뀌지 않는다. 별칭과 서버 인증서의 호스트명 검증이 맞는지 확인하고 TLS 검증을 끄는 우회는 하지 않는다.
- Blue/Green도 기존 연결을 종료하므로 드라이버의 재연결과 DNS 캐시 동작을 확인한다.
- failover와 똑같이 풀이 쥔 옛 커넥션은 폐기되게 한다(→ [[RDS-Operational-Pitfalls|죽은 소켓 evict]]).

### DMS 특유의 함정

- **PK 없는 테이블** — CDC 지원과 update/delete의 행 식별 방식은 엔드포인트별로 확인한다. DMS 데이터 검증에는 PK 또는 unique index가 필요하므로 키 없는 테이블을 검증 성공으로 처리하지 않는다.
- **FK / 트리거** — full load의 테이블 적재 순서는 FK를 위반할 수 있다. 타깃의 FK와 트리거 비활성화, 복원 시점을 계획한다. CDC도 적용 모드에 따라 제약 위반 가능성이 있으므로 full load 종료만으로 복원 시점을 정하지 않는다. 앱 쓰기 재개 전 필요한 제약과 트리거의 복원, 데이터 정합성을 확인한다.
- **큰 LOB/BLOB** — DMS의 LOB 모드를 안 맞추면 잘리거나 느리다. 큰 바이너리 컬럼이 있으면 모드를 확인한다.

### DDL 동결

마이그레이션 진행 중 소스에서 스키마를 바꾸면(컬럼 추가 등) 복제가 깨질 수 있다. 마이그레이션 윈도 동안 DDL을 동결한다.

## 검증과 롤백

- **검증 완료와 미완료를 구분한다.** DMS의 `ValidationFailed`뿐 아니라 `ValidationPending`, `ValidationSuspended`와 테이블 오류도 확인한다. 실패 0건이어도 비교하지 못한 행이 남으면 완료가 아니다. validation 쿼리는 양쪽 DB와 네트워크 부하를 늘리므로 사전 수행과 최종 확인의 시간을 나눈다.
- **업무 계약도 확인한다.** 행 비교와 별도로 주문 합계, 환불 상태, 중복 ID와 핵심 조회를 검사하는 것을 운영 기준으로 둔다. 이 기준은 스키마와 업무에 맞게 정하며 DMS가 자동 검증하는 범위와 구분한다.
- **쓰기 재개 전후의 롤백은 다르다.** 새 타깃에서 쓰기 전이면 소스 복귀를 검토할 수 있다. 쓰기 후에는 타깃에만 생긴 변경을 소스로 반영할 절차가 필요하다. 역방향 복제나 재적재, 재처리의 중복과 충돌 정책을 리허설하지 않았다면 주소만 되돌리지 않는다. 짧은 시간 안에 되돌려도 데이터 유실 위험은 남는다.
- **Blue/Green의 전환 실패 복구와 완료 후 복귀를 구분한다.** 전환 도중 실패하면 AWS가 변경을 되돌리지만, 전환 완료 뒤 기존 blue가 새 쓰기를 자동으로 받는 롤백 환경이라고 가정하지 않는다. 이전 DB 보존은 복구 재료를 남기는 조치이지 동기화 보장이 아니다.

## 현실적인 다운타임

- **Blue/Green**: AWS는 workload에 따라 보통 1분 미만이라고 설명한다. 해당 환경의 보장값은 아니다.
- **DMS 컷오버**: CDC에는 지연 SLA가 없다. 복제 적체, 최종 검증과 앱 재연결까지 측정한다.
- **Read Replica 승격**: 재부팅을 포함해 수 분 이상 걸릴 수 있다. 허용 중단 시간이 짧으면 리허설 결과로 적합성을 판단한다.
- **앱의 dual-write와 점진 전환**: 부분 실패, 순서와 충돌 해결이 추가로 필요하다. 도입 자체가 0초 중단이나 데이터 무손실을 보장하지 않는다.

## 구체적 런북

- [[RDS-Storage-Shrink-Runbook|스토리지 축소 (동종 MySQL → 작은 MySQL, 네이티브 binlog 복제)]] — 실제 토폴로지와 권한을 비운영 환경에서 먼저 검증해야 하는 후보 절차
- [[MySQL-to-PostgreSQL-Migration|MySQL → PostgreSQL (이기종, DMS + 스키마 변환 + 앱 포팅)]] — 사실상 앱 프로젝트

## 면접 체크포인트

- Full Load → CDC → Cutover에서 쓰기 중단과 사용자 체감 회복 시점이 다른 이유
- 세 방법의 적용 경계: Blue/Green(동종 업그레이드), DMS+CDC(이기종/복잡), Read Replica 승격(동종/리전)
- 컷오버 시퀀스에서 AUTO_INCREMENT/시퀀스 보정을 빼먹으면 생기는 사고(PK 충돌), PostgreSQL+DMS가 특히 위험한 이유
- DNS 변경 뒤에도 기존 연결 정리가 필요한 이유와 Blue/Green의 재연결 조건
- CDC 행 식별과 DMS 데이터 검증의 키 요구사항을 따로 확인하는 이유
- 롤백을 위해 소스를 살려두는 것과 역방향 복제의 트레이드오프

## 출처

- [AWS DMS — Using Google Cloud for PostgreSQL as a source](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.GCPostgres.html) — 2026-10-16 소스의 논리 디코딩, 플러그인과 권한 조건 대조
- [AWS DMS — Creating a task](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.Creating.html) — 2026-10-16 Full Load와 full-load-and-cdc의 범위 대조
- [Amazon RDS Blue/Green Deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-overview.html)
- [AWS DMS — Using change data capture (CDC)](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html)
- [AWS DMS — Data validation](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Validating.html)
- [Amazon RDS — Switching a blue/green deployment](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-switching.html)
- [Amazon RDS — Promoting a read replica to be a standalone DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Promote.html)
- [AWS DMS — Best practices](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_BestPractices.html)
- [AWS DMS — Using a PostgreSQL database as a target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.PostgreSQL.html)
- [PostgreSQL 18 Documentation — Sequence Manipulation Functions](https://www.postgresql.org/docs/18/functions-sequence.html)
- [Amazon RDS — Using SSL/TLS to encrypt a connection to a DB instance or cluster](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html)

## 관련 문서

- [[RDS-Migration-Scenarios|RDS 데이터 마이그레이션 — 언제 필요한가]]
- [[DMS|AWS Database Migration Service (Full Load + CDC, SCT)]]
- [[RDS-Aurora|RDS / Aurora (Blue/Green, Read Replica 승격)]]
- [[RDS-Operational-Pitfalls|RDS 운영 함정 (failover 죽은 소켓, 커넥션 폐기)]]
- [[MySQL-Charset-Migration|utf8mb4 마이그레이션 안전 절차]]
