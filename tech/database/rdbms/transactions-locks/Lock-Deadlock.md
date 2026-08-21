---
tags: [database, rdbms, lock, deadlock, concurrency]
status: done
verified_at: 2026-08-21
category: "Data & Storage - RDB"
aliases: ["DB Deadlock", "데드락", "Deadlock"]
---

# DB 데드락

두 개 이상의 트랜잭션이 서로가 보유한 lock을 기다리며 순환 대기에 빠지는 상태. [[Lock|DB Lock]]에서 분리한 데드락 전용 문서다.

## 발생 원인

- **서로 다른 행을 반대 순서로 (ABBA 패턴)**: TX1이 A행 lock 후 B행 lock을 시도하고, TX2가 B행 lock 후 A행 lock을 시도하면 상호 대기가 된다.
- **같은 행에서도 난다 (S → X 업그레이드)**: 두 트랜잭션이 공유 가능한 S Lock을 함께 잡은 뒤 같은 행의 X Lock으로 올리려 할 때. 대표 경로는 `INSERT IGNORE`의 중복 키 확인과, 자식 INSERT의 FK 검증이 부모 인덱스 레코드에 잡는 S Lock — 부모 행이 발급마다 갱신되는 핫 카운터를 겸하면 뒤따르는 UPDATE의 X 요청과 충돌한다. 유저당 한 행을 만들어 뮤텍스처럼 쓰는 get-or-create 뒤에 `FOR UPDATE`를 붙이는 패턴도 같은 경로다: `INSERT IGNORE`가 중복에서 잡은 S Lock을 두 트랜잭션이 나눠 쥔 채 서로의 해제를 기다린다. 해법은 S를 거치지 않아 승격이 생기지 않는 구조다: no-op ODKU로 중복 시점에 S 대신 X를 잡거나([[DML-Conflict-and-Batch-Patterns|DML 충돌 패턴]] 참고), 부모 카운터 UPDATE를 자식 INSERT보다 앞으로 옮겨 X를 선점하거나, 실익 낮은 FK를 제거한다. 그 행을 뒤에서 갱신할 필요가 없다면 locking read 자체를 없애는 것이 더 앞선 해법이다 (아래 락의 이유를 없애기).

## 예방만으로 충분하지 않은 이유

- 이론적으로 Lock 순서를 통일하면 Circular Wait를 제거하여 데드락을 예방할 수 있음
- 하지만 실무에서는 Gap Lock, Next-Key Lock이 **개발자가 의도하지 않은 순서로 암묵적으로 획득**됨
- 쿼리 실행 계획에 따라 InnoDB가 잡는 lock 범위가 달라질 수 있어 완벽한 순서 통일은 현실적으로 불가능
- 따라서 **데드락은 발생할 수 있다는 전제** 하에 감지 + 복구를 설계하는 것이 핵심

## 감지 + 자동 복구 (InnoDB 기본 전략)

- InnoDB는 wait-for graph로 순환 대기를 감지해 한쪽을 victim으로 rollback한다. 수정한 행 수가 적은 트랜잭션을 고르려고 시도할 뿐 보장은 아니므로 어느 쪽이 victim이 된다고 의존하지 않는다. 감지 설정과 lock wait과의 구분은 [[MySQL-InnoDB-Locking-and-Deadlocks|InnoDB Locking과 Deadlock]] 참고
- `SHOW ENGINE INNODB STATUS`의 LATEST DETECTED DEADLOCK 섹션에서 가장 최근 데드락을 확인하고, `innodb_print_all_deadlocks=ON`(기본 OFF)으로 모든 데드락을 에러 로그에 기록한다
- 앱에서 `ER_LOCK_DEADLOCK` 에러를 catch하고 **재시도**하는 것이 정석 대응. 재시도는 서버 안에서 데드락 예외만 좁게 잡아 제한 횟수와 짧은 랜덤 지연으로, 매 시도를 새 트랜잭션으로 수행한다 — 클라이언트의 무차별 재시도는 경합 중인 서버에 요청량과 동시성을 더하는 방향으로 작동할 수 있다. 재시도는 복구 전략이지 Lock 의존 관계를 바꾸는 구조 개선이 아니다
- 메시지 소비자는 offset 커밋을 처리 성공에 묶었을 때만(수동 커밋, 컨테이너 ack 모드) 데드락 rollback 후 재소비가 재시도가 된다. `enable.auto.commit=true`가 기본값인 클라이언트(Apache Kafka Java 클라이언트 등)에서는 offset이 주기적으로 자동 커밋되어 실패한 레코드의 offset도 커밋될 수 있다. 재소비를 복구 경로로 쓰려면 커밋 정책과 함께 생성, 상태 변경을 포함한 처리 전체가 멱등해야 한다 ([[Idempotent-Consumer|멱등 컨슈머]])

## 발생 확률 완화 전략

lock 보유 시간 단축(외부 호출과 긴 계산 제거), 잠금 범위를 줄이는 조건과 index 설계를 포함한 InnoDB 관점의 예방 원칙 목록은 [[MySQL-InnoDB-Locking-and-Deadlocks|InnoDB Locking과 Deadlock]] 참고. 애플리케이션 관점에서 더 보태면:
1. **Lock 순서 통일**: 일관된 순서(예: PK 오름차순)로 lock 획득 → Circular Wait 가능성 감소. 여러 테이블이 얽히면 획득 순서(예: 부모 → 자식)를 팀 규약으로 하나로 정한다. 자식을 먼저 읽어야 부모 키를 아는 경로는 비잠금 조회로 키만 확보한 뒤 정해진 순서로 다시 잠근다 — 이때 identity map(1차 캐시)을 쓰는 ORM은 이미 로드된 엔티티를 lock 모드로 재조회해도 DB에는 `FOR UPDATE`가 나가면서 반환 객체는 캐시된 이전 인스턴스일 수 있으므로, JPA의 `em.refresh(entity, PESSIMISTIC_WRITE)`처럼 lock과 함께 최신 값을 다시 읽는다
2. **NOWAIT 사용**: row lock 대기를 하지 않아 상호 대기를 회피한다. MDL 같은 다른 대기까지 없애지는 않는다

## 락의 이유를 없애기

완화 전략이 락을 잘 거는 방법이라면, 최종 단계는 락이 필요했던 이유 자체를 줄이는 것이다.

- **핫 로우 카운터를 계산으로 대체**: 이벤트 종류와 무관하게 모든 트랜잭션이 마지막에 같은 유저/계정 행의 카운터를 UPDATE하면 그 행이 Hot Row가 된다. 경합 자체는 데드락이 아니지만 락 대기와 보유 시간이 길어져 서로 다른 락이 얽힐 확률을 키운다. 카운터가 상세 행 조회로 계산 가능하고 행 수가 작으면(수백 건 수준) 저장 대신 조회 시 계산으로 바꾼다 — UPDATE가 사라지면 카운터 증가를 위해 `FOR UPDATE`를 걸 이유도 함께 사라진다. 집계 비용이 실제로 큰 경우의 판단은 [[Aggregate-Summary-Table-Patterns|집계 테이블]] 참고.
- **생성은 짧은 별도 트랜잭션으로 분리**: get-or-create의 락(`INSERT IGNORE` 중복 확인의 S Lock 등)도 문장이 아니라 트랜잭션 종료까지 유지되므로, 메시지 처리 전체를 감싼 긴 트랜잭션 안에서 실행하면 잠깐 필요한 락이 처리 시간 내내 남는다. 생성 문장만 별도 짧은 트랜잭션으로 분리하면(TypeORM이면 바깥과 별개의 `dataSource.transaction` 호출, Spring이면 `REQUIRES_NEW`) 락 수명이 생성 작업 시간으로 줄어든다. REPEATABLE READ에서 그 새 트랜잭션은 새 Read View로 조회하므로 다른 트랜잭션이 방금 커밋한 행을 락 없는 일반 조회로도 본다 — 바깥 트랜잭션의 오래된 스냅샷이 새로워지는 것은 아니라서, 새 트랜잭션에서 읽은 결과를 사용하는 구조여야 한다. 대신 커넥션을 추가로 점유하고 바깥 트랜잭션과 롤백 경계가 분리되며([[Spring-Transactional|트랜잭션 전파]]), 영속성 컨텍스트를 쓰는 ORM(JPA류)에서는 내부 트랜잭션이 반환한 엔티티가 바깥 컨텍스트에 속하지 않으므로 존재와 식별 확인 용도로 제한한다.

## 출처

- [MySQL 8.4 Reference Manual — Deadlocks in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks.html)
- [MySQL 8.4 Reference Manual — Deadlock Detection](https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-detection.html)
- [MySQL 8.4 Reference Manual — Locks Set by Different SQL Statements in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html)
- [MySQL 8.4 Reference Manual — Consistent Nonlocking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)
- [Apache Kafka Documentation — Consumer Configs, enable.auto.commit](https://kafka.apache.org/40/generated/consumer_config.html)
- [Transactions — TypeORM](https://typeorm.io/docs/transactions/)
- [Jakarta Persistence 3.1 Specification — Jakarta EE](https://jakarta.ee/specifications/persistence/3.1/)
- [Real MySQL 시즌 1 - Part 2, 데드락 — 인프런](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226583)
- [DB Lock으로 동시성을 해결하려다 Deadlock을 만난 이야기 — velog](https://velog.io/@joona95/DB-Lock%EC%9C%BC%EB%A1%9C-%EB%8F%99%EC%8B%9C%EC%84%B1%EC%9D%84-%ED%95%B4%EA%B2%B0%ED%95%98%EB%A0%A4%EB%8B%A4-Deadlock%EC%9D%84-%EB%A7%8C%EB%82%9C-%EC%9D%B4%EC%95%BC%EA%B8%B0)
- [데드락을 해결하려다, 락을 줄이게 된 이야기 — 여기어때 기술블로그](https://techblog.gccompany.co.kr/%EB%8D%B0%EB%93%9C%EB%9D%BD%EC%9D%84-%ED%95%B4%EA%B2%B0%ED%95%98%EB%A0%A4%EB%8B%A4-%EB%9D%BD%EC%9D%84-%EC%A4%84%EC%9D%B4%EA%B2%8C-%EB%90%9C-%EC%9D%B4%EC%95%BC%EA%B8%B0-97bf2b0c91b6)

## 관련 문서

- [[Lock|DB Lock]]
- [[MySQL-InnoDB-Locking-and-Deadlocks|MySQL 8.4 InnoDB Locking과 Deadlock]]
- [[Transactions|트랜잭션]]
- [[Isolation-Level|트랜잭션 격리 수준]]
- [[DML-Conflict-and-Batch-Patterns|MySQL DML 충돌 처리와 배치 패턴]]
- [[Idempotent-Consumer|멱등 컨슈머]]
- [[Retry-Backoff-Jitter|재시도, 지수 백오프와 지터]]
