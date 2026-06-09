---
tags: [infrastructure, aws, rds, database, operations, troubleshooting, reliability]
status: done
category: "Infrastructure - AWS"
aliases: ["RDS Operational Pitfalls", "RDS 운영 함정", "RDS 운영 장애", "RDS 프로덕션 문제"]
---

# RDS 운영 함정 — 프로덕션에서 실제로 터지는 것들

> 상위 문서: [[RDS-Aurora|RDS / Aurora 관리형 DB]]

관리형이라고 운영 책임이 사라지지 않는다. RDS 인스턴스 자체는 멀쩡한데 그 주변(커넥션, failover 거동, 복제 지연, 스토리지 크레딧, 파라미터 적용, 지표 오독)에서 장애가 난다. 아래는 빈도와 고통이 큰 순서다.

## 1. 커넥션 풀 고갈 — 운영 장애 1순위

RDS가 죽는 게 아니라 **커넥션이 말라서 앱이 죽는다.** 핵심은 `max_connections`가 인스턴스 메모리에 비례한다는 것. 파라미터 그룹에 수식으로 박혀 있다.

```
# MySQL 기본값
max_connections = {DBInstanceClassMemory/12582880}
# PostgreSQL 기본값
max_connections = LEAST({DBInstanceClassMemory/9531392}, 5000)
```

`db.t3.medium`(4GB)이면 MySQL 기준 약 340개뿐이다. 작은 인스턴스일수록 천장이 낮다. 그런데 NestJS 앱을 ECS로 가로 확장하면 **태스크 수 × 풀 사이즈**만큼 커넥션이 곱해진다. Prisma 기본 풀은 `물리 CPU × 2 + 1`이라, 4코어 태스크 10개면 9 × 10 = 90개. 여기에 마이그레이션, 배치 잡, 다른 서비스까지 더하면 금세 천장을 치고 `Too many connections`로 신규 요청이 전부 실패한다.

```
# Prisma는 connection_limit으로 풀을 명시적으로 조인다
DATABASE_URL="mysql://user:pw@host:3306/db?connection_limit=10&pool_timeout=20"
```

- **태스크 수 × 풀 + 여유분이 `max_connections`의 70~80% 안**에 들어오게 역산해 둔다. 풀 사이징 이론은 [[Connection-Pool]].
- `max_connections`를 무작정 올리지 않는다. 커넥션 하나가 메모리를 먹어 OOM 위험이 커진다. 천장을 올리기보다 **풀을 조이는 게** 맞다.
- **Lambda를 직접 붙이면 지옥**. 동시 실행 1000 = 커넥션 시도 1000. 람다는 자연스러운 풀링이 안 되니 [[RDS-Connection-Credentials|RDS Proxy]]가 거의 필수.
- RDS Proxy의 함정은 **커넥션 피닝(pinning)**. 세션 상태(임시 테이블, 세션 변수, 일부 prepared statement)를 쓰면 Proxy가 그 커넥션을 특정 클라이언트에 고정해 멀티플렉싱 이득이 사라진다. CloudWatch `DatabaseConnectionsCurrentlySessionPinned`로 피닝 빈도를 본다.

## 2. Multi-AZ Failover는 무중단이 아니다

Multi-AZ를 켜도 failover는 보통 **60~120초**(Aurora는 약 30초) 걸린다. 그 사이에 진행 중 트랜잭션은 전부 롤백되고 기존 커넥션은 모두 끊기며, 엔드포인트(DNS CNAME)가 새 인스턴스로 재지정된다.

더 무서운 두 번째 함정은 **죽은 소켓**이다. 엔드포인트가 CNAME이라, 앱이나 풀이 죽은 인스턴스의 TCP 연결을 쥐고 있으면 failover가 끝나도 죽은 박스를 계속 때린다. Node는 JVM의 DNS 영구 캐싱만큼 악명 높진 않지만, 풀이 잡고 있는 죽은 소켓이 동일한 문제를 만든다. 빨리 감지해 폐기하지 않으면 failover 후에도 한참 에러가 난다.

```typescript
// 끊김 계열만 지수 백오프 재시도 — failover 60~120초를 버틴다
async function queryWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  const retryable = ['PROTOCOL_CONNECTION_LOST', 'ECONNRESET', 'ETIMEDOUT'];
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (err: any) {
      if (i === retries - 1 || !retryable.includes(err.code)) throw err;
      await new Promise(r => setTimeout(r, 2 ** i * 1000));
    }
  }
  throw new Error('unreachable');
}
```

- 풀에 헬스체크/검증(`SELECT 1`, error 핸들러 evict)을 걸어 죽은 커넥션을 빨리 버린다.
- failover를 예외가 아니라 **정기적으로 일어나는 일**로 가정한다. 유지보수 윈도의 패치 재부팅도 failover를 유발한다.
- **커넥션 폭풍(thundering herd)**: failover 직후나 재배포 직후 모든 인스턴스가 동시에 재연결해 막 살아난 DB를 또 눕힌다. 재연결 백오프에 **지터(jitter)**를 넣는다.

## 3. Read Replica 복제 지연 → read-after-write 버그

복제는 비동기다. 게다가 MySQL 바이너리 로그 복제는 전통적으로 단일 스레드로 재생되므로(병렬 복제 미설정 시) 마스터 쓰기가 몰리면 복제본이 뒤처진다. `SecondsBehindMaster`(MySQL) / `ReplicaLag`(PostgreSQL)가 수 초에서 수십 초까지 벌어진다.

전형적 사고: 유저가 글 작성(마스터 INSERT) → 직후 목록 조회가 복제본으로 라우팅 → 아직 복제 안 됨 → 방금 쓴 글이 안 보임 → 문의 폭주.

- 쓰기 직후 바로 읽어야 하는 조회(방금 내가 한 행동의 결과)는 **마스터로 강제 라우팅**한다. 라우팅 전략은 [[Read-Replica-Routing]].
- 통계, 대시보드, 검색처럼 stale을 견디는 읽기만 복제본으로 보낸다.
- 복제 지연 지표에 알람을 건다. 지연 증가는 마스터 쓰기 부하나 복제본 스펙 부족 신호.

## 4. 스토리지 IOPS와 storage-full

gp2는 IOPS가 용량에 묶인다(GiB당 3 IOPS). 작은 볼륨은 **burst credit**으로 순간 3000 IOPS까지 끌어쓰는데, 크레딧이 바닥나면 baseline으로 뚝 떨어진다. 평소 멀쩡하다 트래픽 몰린 날 갑자기 느려지는데, `BurstBalance` 지표를 안 보면 원인을 못 잡는다. 그래서 **gp3가 기본 추천** — IOPS와 용량이 분리돼 용량과 무관하게 baseline 3000 IOPS를 보장하고 필요하면 IOPS만 올린다. 보통 gp2보다 싸다. (스토리지 타입 상세는 [[EBS]].)

- **스토리지가 꽉 차면 DB가 멈춘다**. `storage-full`은 사실상 사용 불가. Storage Autoscaling을 켜되 쿨다운과 최대 한도가 있어 무한이 아니다.
- **할당 스토리지는 줄일 수 없다**(늘리기만 가능). 크게 잘못 잡으면 덤프 떠서 새 인스턴스로 이전해야 한다. 초기 사이징을 신중히.

## 5. 메이저 업그레이드와 파라미터 static/dynamic

- 마이너 패치는 비교적 안전하지만 **메이저 업그레이드(MySQL 5.7→8.0, PG 14→15)는 다운타임 + 어려운 롤백**이다. PostgreSQL은 extension 호환성과 `pg_upgrade` 이슈가 잦다. Blue/Green Deployment로 리스크를 줄일 수 있으나 논리 복제 기반이라 일부 기능 제한이 있다.
- EOL 지난 버전을 끌면 **Extended Support 비용**이 붙는다. 버전 관리를 안 하면 돈으로 맞는다.
- 파라미터 그룹에는 **동적(즉시 적용)과 정적(재부팅 필요 = 다운타임)**이 섞여 있다. `max_connections`나 일부 메모리 파라미터는 정적이라 "값만 바꾸면 되겠지" 했다가 재부팅이 필요해 당황한다. 적용 전 dynamic인지 static인지 확인한다.

## 6. 모니터링 사각지대 — FreeableMemory 함정

지표 오독으로 헛다리를 짚는 대표가 `FreeableMemory`다. 낮다고 "메모리 부족"으로 단정하면 오판이다. RDS는 남는 메모리를 버퍼 풀(InnoDB buffer pool 등) 캐싱에 적극적으로 쓰므로 free가 적은 건 오히려 정상일 수 있다. **진짜 위험 신호는 `SwapUsage` 상승** — 스왑을 쓰기 시작하면 성능이 급락한다. FreeableMemory 단독이 아니라 SwapUsage와 ReadIOPS 급증을 함께 본다. 지표 임계, Performance Insights, Enhanced Monitoring, slow query log 설계는 [[RDS-Monitoring]].

## 7. 백업/복구 RTO 함정 — 스냅샷 복구는 느리다

스냅샷 복구는 인스턴스는 빨리 뜨지만, RDS가 스토리지를 **S3에서 lazy loading**으로 가져온다. 복구 직후엔 아직 안 받아온 블록을 처음 접근할 때마다 S3에서 끌어오느라 한동안 I/O가 바닥이다. "복구는 됐는데 왜 느리지"가 이것. 대용량일수록 정상 성능 회복(워밍업)에 시간이 걸린다. **DR의 RTO 계산에 이 워밍업 시간을 반드시 포함**한다. "스냅샷 있으니 금방 복구"가 아니다.

## 빈도는 낮지만 진단이 어려운 것들

장기 실행 트랜잭션의 디스크 부풀림, cross-AZ 전송비, Aurora I/O 과금, utf8/utf8mb4, CA 인증서 만료, 암호화 사후 불가, 로그 디스크 잠식, Read Replica 승격 비가역, max_allowed_packet, IAM 토큰 15분, PostgreSQL XID wraparound는 빈도는 낮지만 처음 당하면 원인 찾기가 어렵다. → [[RDS-Operational-Pitfalls-Rare|RDS 운영 함정 (저빈도, 진단 어려운 것들)]]

## 면접 체크포인트

- 운영 장애 1순위가 커넥션 고갈인 이유와 `max_connections`가 메모리에 비례한다는 사실, 태스크 × 풀 역산
- RDS Proxy의 이득과 피닝(pinning) 함정, 무엇이 피닝을 유발하나
- Multi-AZ가 무중단이 아닌 이유(60~120초), DNS CNAME과 죽은 소켓, 재시도와 지터
- 복제 지연으로 인한 read-after-write 버그와 마스터 강제 라우팅
- gp2 BurstBalance 소진과 gp3 전환 이유, storage-full과 스토리지 축소 불가
- 정적 파라미터(재부팅)와 메이저 업그레이드 다운타임
- FreeableMemory가 낮은 게 정상일 수 있는 이유와 SwapUsage가 진짜 신호인 점
- 스냅샷 복구의 lazy loading 워밍업을 RTO에 포함해야 하는 이유

## 출처

- [Amazon RDS User Guide — DB instance storage, parameter groups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html)
- [Using Amazon RDS Proxy — connection pinning](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html)
- [Working with read replicas — replication lag](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)

## 관련 문서

- [[RDS-Operational-Pitfalls-Rare|RDS 운영 함정 (저빈도, 진단 어려운 것들)]]
- [[RDS-Aurora|RDS / Aurora 관리형 DB]]
- [[RDS-Connection-Credentials|RDS 앱 연결과 자격증명]]
- [[RDS-Monitoring|RDS 모니터링]]
- [[RDS-Security-Group|RDS Security Group 구성]]
- [[Connection-Pool|DB 커넥션 풀 사이징]]
- [[Read-Replica-Routing|Read Replica 라우팅]]
- [[EBS|EBS (gp2/gp3 스토리지)]]
