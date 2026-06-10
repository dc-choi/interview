---
tags: [infrastructure, aws, rds, migration, dms, cdc, blue-green, zero-downtime]
status: done
category: "Infrastructure - AWS"
aliases: ["RDS Zero Downtime Migration", "무중단 마이그레이션", "near-zero downtime cutover", "AUTO_INCREMENT drift"]
---

# 무중단(near-zero) RDS 마이그레이션

> 상위 문서: [[RDS-Migration-Scenarios|RDS 데이터 마이그레이션 — 언제 필요한가]]

진짜 0초는 앱 레벨 오케스트레이션(dual-write, 점진적 트래픽 전환) 없이는 사실상 불가능하다. 현실적 목표는 **다운타임을 초 단위로 줄이는 near-zero**다. 어떤 상황에서 옮기는지는 [[RDS-Migration-Scenarios]], 여기서는 그걸 무중단에 가깝게 해내는 법을 다룬다.

## 공통 골격 — 모든 무중단 마이그레이션의 뼈대

방법이 무엇이든 구조는 같다.

1. **Full Load(초기 적재)** — 기존 데이터를 통째로 복사. 이 동안 소스는 계속 살아 쓰기를 받는다.
2. **CDC(Change Data Capture)** — full load 도중과 이후의 변경분을 계속 따라잡아 타깃을 동기 상태로 유지.
3. **Cutover(전환)** — 쓰기를 잠깐 멈추고, 타깃이 마지막 변경분까지 따라잡으면 앱을 타깃으로 돌리고 쓰기 재개.

**다운타임 = 쓰기를 멈춰둔 시간**이다. CDC로 평소에 거의 다 따라잡아 두면 컷오버 때 멈추는 건 마지막 몇 초뿐이다. 이것이 near-zero의 원리다.

## 방법 세 가지

- **Blue/Green Deployment (관리형, 동종/업그레이드)** — AWS가 위 골격을 대신한다. 운영(blue)의 논리 복제본 green을 띄워 거기서 업그레이드/스키마/파라미터 변경을 검증한 뒤 switchover를 누르면, blue 쓰기 정지 → green 따라잡기 → 엔드포인트 바꿔치기를 AWS가 한다. 보통 1분 이하, 결정적으로 **엔드포인트 이름이 그대로 유지**돼 앱 커넥션 문자열을 안 바꿔도 된다. 메이저 버전 업그레이드나 동종 변경이면 1순위. 제약은 같은 리전, 동종 엔진.
- **DMS + CDC (이기종/복잡)** — 엔진 전환(MySQL→PostgreSQL)이나 구조 재설계처럼 Blue/Green이 안 되면 DMS다. 소스에 CDC 설정이 필요하다 — MySQL은 `binlog_format=ROW` + binlog 보존 기간, PostgreSQL은 `wal_level=logical`. 가장 강력하지만 함정도 가장 많다. 메커니즘은 [[DMS]].
- **Read Replica 승격 (동종/리전 이동)** — 소스의 Read Replica는 계속 복제 중이므로, 준비되면 승격(promote)하고 앱을 돌리면 끝. 리전 이동이면 크로스 리전 복제본을 만들어 승격한다. 단 **승격은 비가역**이고 엔진/버전을 크게 못 바꾼다.

정리하면 같은 엔진 업그레이드면 Blue/Green, 엔진을 바꾸거나 복잡하면 DMS, 단순 동종 이전이나 리전 이동이면 Read Replica 승격.

## 컷오버 시퀀스 — 여기서 사고가 난다

방법을 골랐어도 실제로 데이는 건 전환 순간이다. 이 순서를 지킨다.

```
1. 사전: 복제 지연(lag)이 거의 0으로 수렴했는지 확인
2. 소스 쓰기 정지          ← 다운타임 시작 (앱 read-only 플래그 또는 writer 정지)
3. lag = 0 도달까지 대기    (타깃이 마지막 변경분까지 따라잡음)
4. 행 수 / 체크섬 검증
5. AUTO_INCREMENT / 시퀀스 값 맞추기   ← 빼먹으면 바로 사고
6. 앱을 새 엔드포인트로 전환
7. 새 타깃에서 쓰기 재개     ← 다운타임 끝
```

2~7 사이가 다운타임이고, CDC가 잘 따라잡고 있었으면 보통 수 초에서 수십 초다.

## 컷오버 함정 (사고의 대부분)

### AUTO_INCREMENT / 시퀀스 드리프트 — 가장 악명 높은 함정

DMS 같은 논리적 적재에서 데이터는 다 옮겨졌는데 AUTO_INCREMENT(MySQL)나 시퀀스(PostgreSQL)의 "다음 값"이 안 맞으면, 컷오버 후 쓰기 재개하자마자 **중복 키 에러(PK 충돌)**가 터진다. 특히 **PostgreSQL + DMS는 시퀀스 현재값을 안 옮긴다**. 반드시 수동 보정한다.

```sql
-- PostgreSQL: 각 시퀀스를 실제 max(id)+1로
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
- 더 나은 방법: **Route 53 CNAME**을 RDS 엔드포인트 앞에 두고 컷오버 때 CNAME만 새 엔드포인트로 바꾼다. 단 **DNS TTL을 미리 낮춰둬야**(예: 5초) 빠르게 전환된다. 안 그러면 옛 주소를 오래 캐싱한다.
- Blue/Green은 AWS가 엔드포인트를 바꿔치기해 이 고민이 없다.
- failover와 똑같이 풀이 쥔 옛 커넥션은 폐기되게 한다(→ [[RDS-Operational-Pitfalls|죽은 소켓 evict]]).

### DMS 특유의 함정

- **PK 없는 테이블** — CDC는 update/delete를 적용하려면 PK(또는 유니크 키)가 필요하다. PK 없는 테이블은 CDC가 제대로 못 따라가니 미리 만든다.
- **FK / 트리거** — full load 중 FK 순서 위반이 날 수 있어 로드 중에는 FK 체크를 끄고 끝나면 켠다. 타깃 트리거도 CDC 적용 중에는 꺼서 중복 발화를 막는다.
- **큰 LOB/BLOB** — DMS의 LOB 모드를 안 맞추면 잘리거나 느리다. 큰 바이너리 컬럼이 있으면 모드를 확인한다.

### DDL 동결

마이그레이션 진행 중 소스에서 스키마를 바꾸면(컬럼 추가 등) 복제가 깨질 수 있다. 마이그레이션 윈도 동안 DDL을 동결한다.

## 검증과 롤백

- **검증** — DMS는 행 단위 data validation을 제공하고, MySQL이면 `pt-table-checksum`으로 소스/타깃을 비교한다. 컷오버 전에 돌려 데이터 일치를 확인한다.
- **롤백** — 핵심은 **소스를 바로 지우지 않는 것**. 검증될 때까지 살려둔다. 단 새 타깃에서 쓰기가 이미 시작됐으면 단순 롤백 시 그 사이 데이터를 잃는다. 진짜 안전하게 가려면 **역방향 복제(타깃 → 소스)**까지 거는데 난이도가 확 오른다. 보통은 "검증을 빨리 하고, 문제 시 짧은 윈도 안에 되돌린다"로 타협한다.

## 현실적인 다운타임

- **Blue/Green**: switchover 시 보통 1분 이하. 관리형이라 가장 안정적.
- **DMS / Read Replica 컷오버**: 쓰기 정지~전환 사이 수 초~수십 초. CDC가 얼마나 따라잡아 뒀는지에 달림.
- **진짜 0초**: 앱 레벨 dual-write나 점진적 트래픽 전환을 직접 구현해야 해 복잡도가 매우 높다. 대개 위 방법으로 초 단위 near-zero에서 타협한다.

## 구체적 런북

- [[RDS-Storage-Shrink-Runbook|스토리지 축소 (동종 MySQL → 작은 MySQL, 네이티브 binlog 복제)]] — 리스크 낮은 인프라 작업
- [[MySQL-to-PostgreSQL-Migration|MySQL → PostgreSQL (이기종, DMS + 스키마 변환 + 앱 포팅)]] — 사실상 앱 프로젝트

## 면접 체크포인트

- 무중단의 공통 골격(Full Load → CDC → Cutover)과 다운타임이 곧 쓰기 정지 시간인 이유
- 세 방법의 적용 경계: Blue/Green(동종 업그레이드), DMS+CDC(이기종/복잡), Read Replica 승격(동종/리전)
- 컷오버 시퀀스에서 AUTO_INCREMENT/시퀀스 보정을 빼먹으면 생기는 사고(PK 충돌), PostgreSQL+DMS가 특히 위험한 이유
- 엔드포인트 전환을 Route 53 CNAME + 낮은 TTL로 하는 이유, Blue/Green이 엔드포인트를 유지하는 장점
- CDC가 PK 없는 테이블을 못 따라가는 이유
- 롤백을 위해 소스를 살려두는 것과 역방향 복제의 트레이드오프

## 출처

- [Amazon RDS Blue/Green Deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-overview.html)
- [AWS DMS — Using change data capture (CDC)](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html)
- [AWS DMS — Data validation](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Validating.html)

## 관련 문서

- [[RDS-Migration-Scenarios|RDS 데이터 마이그레이션 — 언제 필요한가]]
- [[DMS|AWS Database Migration Service (Full Load + CDC, SCT)]]
- [[RDS-Aurora|RDS / Aurora (Blue/Green, Read Replica 승격)]]
- [[RDS-Operational-Pitfalls|RDS 운영 함정 (failover 죽은 소켓, 커넥션 폐기)]]
- [[MySQL-Charset-Migration|utf8mb4 마이그레이션 안전 절차]]
