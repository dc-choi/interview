---
tags: [infrastructure, aws, rds, database, operations, troubleshooting, mysql, postgresql]
status: done
category: "Infrastructure - AWS"
aliases: ["RDS Rare Pitfalls", "RDS 저빈도 함정", "RDS 진단 어려운 문제", "utf8mb4", "XID wraparound"]
---

# RDS 운영 함정 — 저빈도, 진단 어려운 것들

> 상위 문서: [[RDS-Operational-Pitfalls|RDS 운영 함정 (빈도 큰 빅7)]]

자주 터지는 빅7은 [[RDS-Operational-Pitfalls]]에 있다. 여기는 빈도는 낮지만 **처음 당하면 원인을 못 찾아 오래 헤매는** 것들이다. 코드를 안 건드렸는데 갑자기 깨지는 부류라 미리 알아두는 값어치가 크다.

## 장기 실행 트랜잭션이 디스크를 부풀린다

트랜잭션을 열어놓고 안 닫거나 너무 오래 도는 배치/리포트 쿼리가 있으면, MySQL은 롤백/MVCC용 **undo 로그**를 계속 쌓고, PostgreSQL은 오래된 튜플을 VACUUM이 못 치워 **테이블 bloat**이 생긴다. 트랜잭션 하나가 몇 시간 떠 있으면 스토리지가 슬금슬금 차고 복제 지연도 같이 커진다. MySQL 쪽 메커니즘(read view 수명, HLL 지표)과 진단 절차는 [[MySQL-Undo-Purge-HLL|Undo Purge와 HLL]] 참고.

ORM에서 가장 흔한 원인은 **트랜잭션 안에서 외부 API를 await**하는 것이다.

```typescript
// 안티패턴: 외부 호출 시간만큼 트랜잭션이 락과 커넥션을 쥔다
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data });
  await callPaymentGateway(order);   // 3초 걸리면 3초간 락 점유
  await tx.order.update({ ... });
});
```

외부 호출은 트랜잭션 밖으로 뺀다. 길어진 트랜잭션은 락과 커넥션을 오래 점유해 [[RDS-Operational-Pitfalls|커넥션 고갈]]과 결합하면 더 빨리 터진다. MySQL `INNODB_TRX`, PostgreSQL `pg_stat_activity`에서 오래 떠 있는 트랜잭션을 감시한다.

## 크로스 AZ 데이터 전송 비용

같은 AZ 안의 앱↔DB 통신은 무료지만 AZ를 넘으면 전송 요금이 붙는다. 평소엔 안 보이다 두 상황에서 청구서가 뛴다.

- **failover 이후** — 앱은 AZ-a인데 DB가 AZ-b로 넘어가면 그때부터 모든 쿼리가 크로스 AZ가 된다.
- **Read Replica가 다른 AZ** — 읽기 분산한 트래픽이 전부 크로스 AZ로 과금된다.

쿼리 자체보다 **결과셋 전송량**(큰 조회)이 클수록 금액이 커진다. 앱과 자주 읽는 복제본을 같은 AZ에 두면 줄지만 가용성과 트레이드오프라 정답은 없다.

## Aurora I/O 과금 폭탄

Aurora Standard는 스토리지 I/O를 **건당 과금**한다. 읽기/쓰기가 많고 캐싱이 약하면 이 I/O 비용이 인스턴스 비용을 넘기도 한다. 그래서 **Aurora I/O-Optimized** 옵션이 따로 있다. I/O 건당 과금이 없는 대신 인스턴스/스토리지 단가가 비싸다. 손익분기는 대략 **전체 비용에서 I/O가 25%를 넘으면 I/O-Optimized가 이득**(정확한 건 워크로드로 계산). 일반 RDS(MySQL/PostgreSQL)에는 이 건당 과금이 없는 Aurora 특유의 함정이다.

## 문자셋 — utf8 vs utf8mb4

MySQL의 `utf8`은 사실 **3바이트짜리(`utf8mb3`)** 라 완전한 UTF-8이 아니다. 한글은 3바이트라 저장되지만 **이모지나 일부 4바이트 문자가 들어오면 깨지거나 INSERT가 실패**한다. 옛 RDS MySQL은 기본 charset이 `latin1`이라 한글부터 깨지기도 했다(8.0부터 기본 `utf8mb4`).

```sql
ALTER DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE posts  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```
# 커넥션도 utf8mb4로 (서버만 바꾸면 안 된다)
DATABASE_URL="mysql://user:pw@host:3306/db?charset=utf8mb4"
```

**서버, 테이블, 컬럼, 커넥션 네 군데가 모두 utf8mb4로 일치**해야 안 깨진다. 하나라도 어긋나면 "어떤 글만 깨진다"는 미스터리가 생긴다. 운영 중인 DB를 안전하게 바꾸는 단계별 절차(인덱스 키 길이, collation 충돌, 클론 리허설, latin1 복구)는 [[MySQL-Charset-Migration]].

## SSL/TLS CA 인증서 만료

RDS 서버 인증서를 검증하는 **CA 번들에는 만료일이 있다**. AWS가 주기적으로 갱신하는데(`rds-ca-2019` → `rds-ca-rsa2048-g1` 등), 앱이 옛 CA를 고정해 두면 그게 만료되는 날 **SSL 연결이 전부 실패**한다. 코드를 안 건드렸는데 어느 날 DB 연결이 끊기면 이걸 의심한다. AWS가 이메일로 공지하지만 놓치기 쉽다. 갱신 일정을 챙기고 최신 CA 번들을 쓴다. SSL 설정 자체는 [[RDS-Connection-Credentials]].

## 기존 인스턴스는 암호화를 나중에 못 켠다

암호화 없이 만든 기존 RDS 인스턴스에 **암호화를 직접 켤 수 없다**. 대표적인 전환 방식은 스냅샷 생성, 암호화한 사본 만들기, 새 인스턴스로 복원하는 순서다. 새 인스턴스로의 연결 전환과 데이터 동기화 계획도 필요하다. 생성 시 암호화 요구사항과 사용할 키를 정하면 이 전환 작업을 줄일 수 있다.

## KMS 키 접근 불가와 복구 가능 상태

2026-10-16 RDS, Aurora와 KMS 공식 문서로 대조한 범위는 앞의 암호화 전환 절과 이 절이다. 다른 운영 항목 전체를 재검증한 날짜는 아니다.

암호화한 DB가 KMS 키를 사용할 수 없으면 DB 상태와 키 상태를 함께 확인한다. `inaccessible-encryption-credentials-recoverable`과 `inaccessible-encryption-credentials`는 복구 경로가 다르다.

| 대상 | 복구 가능 상태의 조건과 한계 |
| --- | --- |
| RDS DB 인스턴스 | 백업이 활성화된 경우 키 접근 상실 감지 후 2시간에 복구 가능 상태로 전환한다. 중지할 수 있어야 하며, 읽기 복제본과 읽기 복제본이 있는 인스턴스에는 이 유예가 적용되지 않는다. |
| Aurora DB 클러스터 | 키 접근 상실로 복구 가능 상태에 들어갈 수 있다. 중지할 수 없는 구성, 예를 들어 교차 리전 읽기 복제본이 있는 클러스터에는 이 유예가 적용되지 않는다. |

복구 가능 상태에서는 DB가 중지되며 유예는 7일이다. 삭제 예약된 키는 예약을 취소하고, 비활성화된 키는 다시 활성화한 뒤 DB를 시작한다. RDS 인스턴스에는 `start-db-instance`, Aurora 클러스터에는 `start-db-cluster`를 사용한다. 모든 구성에 7일의 복구 기회가 있다고 가정하지 않는다.

유예 안에 복구하지 못해 terminal 상태가 되면 기존 DB를 시작하는 대신 스냅샷이나 백업에서 새 DB로 복원해야 한다. **백업이 있어도 복호화에 필요한 키가 사용 가능해야 한다.** RDS의 최종 스냅샷도 원본 DB와 같은 키로 암호화되므로 복원 전에 그 키를 다시 활성화해야 한다. 삭제가 완료된 단일 리전 대칭 KMS 키는 새 키를 만들어 대체할 수 없고, 그 키로 암호화된 백업만으로 데이터를 복구할 수 없다. KMS의 다중 리전 복제 키는 원본 primary key가 남아 있으면 재생성할 수 있는 별도 예외다. 이 예외를 일반적인 DB 복원 절차로 가정하지 않는다.

## 로그가 디스크를 잠식한다

디버깅하려고 `general_log`(모든 쿼리 기록)를 켜고 끄는 걸 잊으면 트래픽 많은 서비스에서 디스크가 순식간에 찬다. 그대로 [[RDS-Operational-Pitfalls|storage-full → DB 정지]]로 직행한다. slow query log도 임계값을 너무 낮게 잡으면 비슷하게 쌓인다. 임시로 켰으면 반드시 끄고, 로그는 CloudWatch Logs로 내보내 보존 기간을 관리한다(설계는 [[RDS-Monitoring]]).

## Read Replica 승격은 되돌릴 수 없다

Read Replica를 독립 인스턴스로 **승격(promote)하면 마스터와의 복제 링크가 영구히 끊긴다**. 다시 복제본으로 되돌릴 수 없다. 실수로 승격하거나, 재해 상황에서 급히 승격했는데 원래 마스터가 살아있었다면 토폴로지가 꼬인다. 승격은 신중하게.

## max_allowed_packet — 큰 데이터에서 막힘

큰 BLOB이나 긴 SQL(대량 `IN` 절, 벌크 인서트)이 이 값을 넘으면 `Packet too large`로 실패한다. 평소엔 모르다 **첨부파일 저장이나 대량 마이그레이션**에서 갑자기 튀어나온다. 파라미터 그룹에서 조정한다(정적/동적 여부 확인은 [[RDS-Operational-Pitfalls|파라미터 적용]]).

## IAM 인증 토큰은 15분 만료 — 풀에 재발급을 물린다

IAM 데이터베이스 인증은 비밀번호 대신 **15분짜리 토큰**으로 붙는다(개념은 [[RDS-Connection-Credentials]]). 토큰은 연결 시점에만 필요하므로 이미 맺은 커넥션은 유지되지만, **새 커넥션을 맺을 때마다 토큰을 새로 발급**해야 한다. 커넥션 풀이 새 커넥션을 만들 때 만료된 토큰을 들고 있으면 인증이 실패하므로, **토큰 재발급 로직을 풀의 커넥션 생성 훅에 물려둔다**.

## (PostgreSQL) autovacuum과 XID wraparound

2026-10-16 PostgreSQL 18 공식 문서 부분 대조 기준이다. 오래된 미동결 XID를 제때 처리하지 못하면 wraparound로 인한 데이터 손실을 막기 위해 **새 XID를 할당하는 명령이 거부된다**. 이때 새 읽기 전용 트랜잭션과 `VACUUM`은 가능하지만 데이터 변경 작업은 실패할 수 있어 쓰기 서비스의 장애로 이어진다.

`pg_stat_user_tables`의 `n_dead_tup`은 dead tuple 추정치이고, `last_vacuum`과 `last_autovacuum`은 최근 실행 시각이다. 이 값들만으로 wraparound 여유를 판단하지 않는다. 테이블별 미동결 XID의 나이는 `age(pg_class.relfrozenxid)`, 데이터베이스별 나이는 `age(pg_database.datfrozenxid)`로 확인한다. 테이블을 점검할 때 연결된 TOAST 테이블의 XID 나이도 함께 본다. dead tuple 회수와 XID 동결은 관측 항목을 구분한다(MVCC 차이는 [[MySQL-vs-PostgreSQL]]).

## 면접 체크포인트

- 트랜잭션 안에서 외부 API를 await하면 안 되는 이유(락/커넥션 장기 점유 + undo/bloat)
- utf8과 utf8mb4의 차이, 네 군데(서버/테이블/컬럼/커넥션) 일치가 필요한 이유
- RDS CA 번들 만료가 코드 변경 없이 장애를 내는 시나리오
- 암호화는 생성 시점에 켜야 하는 이유와 우회 절차(스냅샷 복사 복원)
- KMS 키 복구와 DB 시작의 순서, 복구 가능 상태의 예외, 백업 복원에도 키가 필요한 이유
- Read Replica 승격의 비가역성
- IAM 15분 토큰을 커넥션 풀과 어떻게 결합하나
- XID wraparound가 무엇이고 왜 쓰기가 멈추나(PostgreSQL)

## 출처

- [Amazon RDS — Working with parameter groups, SSL/TLS, encryption](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html)
- [Amazon RDS — Encrypting Amazon RDS resources](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html)
- [Amazon Aurora — Encrypting Amazon Aurora resources](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Overview.Encryption.html)
- [AWS KMS — Delete an AWS KMS key](https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html)
- [Amazon Aurora storage and reliability — I/O-Optimized](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html)
- [PostgreSQL — Routine Vacuuming, preventing transaction ID wraparound](https://www.postgresql.org/docs/current/routine-vacuuming.html)
- [PostgreSQL — The Cumulative Statistics System, pg_stat_all_tables](https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-ALL-TABLES-VIEW)

## 관련 문서

- [[RDS-Operational-Pitfalls|RDS 운영 함정 (빈도 큰 빅7)]]
- [[RDS-Connection-Credentials|RDS 앱 연결과 자격증명]]
- [[RDS-Monitoring|RDS 모니터링]]
- [[RDS-Aurora|RDS / Aurora 관리형 DB]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
