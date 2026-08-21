---
tags: [database, rdbms, lock, concurrency, nowait]
status: done
verified_at: 2026-08-21
category: "Data & Storage - RDB"
aliases: ["Lock Wait Convoy", "락 대기 큐와 NOWAIT"]
---

# 락 대기 큐와 convoy

락 경합의 비용은 DB 안에서 끝나지 않는다. 대기하는 트랜잭션은 커넥션과 앱 스레드를 쥔 채로 줄을 서기 때문에, 한 행의 경합이 애플리케이션 전체의 처리량 문제로 번진다. 데드락 자체는 [[Lock-Deadlock|DB 데드락]], 잠금 범위와 격리 수준별 차이는 [[MySQL-InnoDB-Locking-and-Deadlocks|InnoDB Locking과 Deadlock]]에서 다루고, 이 문서는 대기 큐, NOWAIT의 등가 교환, 락 에러 분기만 맡는다.

## 대기 큐에서 실제로 붙잡혀 있는 것

InnoDB는 이미 잡힌 락과 함께 그 행이나 테이블에 대해 대기 중인 락 요청을 큐로 관리한다. Performance Schema의 `data_locks`가 `LOCK WAIT` 트랜잭션마다 진행을 막는 락 요청을 행으로 보여주고, 같은 행이나 테이블을 기다리는 큐의 락도 각각 한 행씩 담는다. `data_lock_waits`는 어떤 트랜잭션이 어떤 트랜잭션을 막고 있는지를 보여준다.

대기자가 큐에 서 있는 동안 다음이 함께 묶여 있다.

- **트랜잭션**: 아직 활성 상태다. 그때까지 잡은 락을 계속 보유하고, MVCC read view와 undo 참조도 유지된다.
- **커넥션**: 대기는 커넥션 위에서 일어난다. 대기 시간만큼 풀의 한 칸이 반환되지 않는다.
- **앱 실행 컨텍스트**: 드라이버 호출이 반환되지 않으므로 Node.js라면 요청 핸들러의 비동기 체인이, 스레드 모델이라면 워커 스레드 하나가 그대로 묶인다.

기본값 기준으로 이 대기는 `innodb_lock_wait_timeout` 초까지 이어질 수 있다. MySQL 8.4의 기본값은 50초이고 세션과 글로벌 모두에서 동적으로 바꿀 수 있다. 대기 순서가 도착 순서와 같다고 가정하지 않는다. 순서는 문서화된 계약이 아니므로 특정 요청이 먼저 깨어난다는 전제로 설계하지 않는다.

## 한 행의 경합이 커넥션 풀을 말리는 경로

임계 구역 보유 시간을 T, 그 행을 건드리는 요청 도착률을 λ라고 하면 대기 큐의 평균 길이는 대략 λ×T로 늘어난다. 도착률이 처리율을 넘는 동안 큐는 계속 자란다.

1. 핫 로우 하나에 T가 200ms인 트랜잭션이 초당 50건 도착하면 평균 10개 안팎이 상시 대기 상태가 된다.
2. 대기자 각각이 커넥션을 하나씩 물고 있으므로 풀 크기가 10이면 이 행 하나가 풀 전체를 점유한다.
3. 이 시점부터는 **핫 로우와 무관한 요청까지** 커넥션 획득 단계에서 막힌다. 원인은 한 행인데 증상은 서비스 전역 지연으로 보인다.
4. 앱 스레드나 이벤트 루프의 대기 핸들도 함께 소진되면 헬스체크와 관리용 엔드포인트까지 응답하지 못한다.

느린 자원 하나가 앞을 막아 뒤의 모든 작업이 그 속도로 줄지어 흘러가는 이 현상을 convoy라고 부른다. 락 경합에서 convoy의 특징은 병목 구간의 이용률이 낮은데도 전체 지연이 커진다는 점이다. DB의 CPU와 디스크는 한가한데 애플리케이션 지연만 치솟으면 대기 큐를 먼저 본다.

관찰 지점은 세 층으로 나눈다. DB 쪽은 `data_lock_waits`의 대기 관계와 `information_schema.INNODB_TRX`의 `LOCK WAIT` 상태, 앱 쪽은 커넥션 풀의 대기 시간과 pending 요청 수, 클라이언트 쪽은 타임아웃 발생률이다 ([[Connection-Pool|커넥션 풀 사이징]], [[MySQL-Slow-Query-Diagnosis|Slow Query와 lock wait 진단]]).

### 타임아웃 계층이 어긋날 때

클라이언트 타임아웃이 락 대기 타임아웃보다 짧으면 상황이 더 나빠진다. 클라이언트는 응답을 포기하고 재요청하지만 서버 쪽 트랜잭션은 여전히 큐에 남아 커넥션을 붙잡고 있다. 사용자가 체감하는 실패마다 서버에는 유령 대기자가 하나씩 쌓여, 재시도가 부하를 키우는 방향으로 작동한다. 클라이언트 타임아웃, 커넥션 획득 타임아웃, `innodb_lock_wait_timeout`을 안쪽이 짧아지는 순서로 맞추고, 취소된 요청의 트랜잭션을 실제로 종료시키는 경로를 확보한다.

## NOWAIT는 부하를 옮길 뿐 없애지 않는다

`NOWAIT`를 붙인 잠금 읽기는 행 락을 얻지 못하면 기다리지 않고 즉시 실패한다. 서버에 대기 큐가 생기지 않으므로 위의 convoy 경로는 끊긴다. 다만 충돌하는 요청의 수가 줄어드는 것은 아니다. **서버 안의 대기가 앱 쪽의 실패와 재시도로 형태만 바뀐다.**

| 관점 | 대기 (기본 동작) | NOWAIT + 앱 재시도 |
|---|---|---|
| 자원 점유 | 대기 내내 커넥션, 트랜잭션, 앱 컨텍스트 유지 | 즉시 반환, 재시도 사이에는 아무것도 점유하지 않음 |
| 인계 지연 | 선행 트랜잭션 커밋 직후 서버 안에서 이어받음 | 실패 응답, 백오프, 재요청의 왕복이 매번 추가 |
| 실패 모드 | 커넥션 풀 소진과 전역 지연 | 재시도 폭주와 상한 초과 실패 |
| 관측 | 지연 증가로 나타남 (성공률은 유지) | 에러율 증가로 나타남 (지연은 유지) |
| 유리한 상황 | 경합 구간이 짧고 처리량이 목표일 때 | 클라이언트 타임아웃이 짧고 빠른 실패가 나은 대화형 요청 |

정리하면 대기는 처리량에, NOWAIT는 응답 지연의 예측 가능성에 유리하다. 경합이 짧고 대기 시간이 커넥션 예산 안에 들어오면 기다리는 편이 왕복 비용이 없어 전체 처리량이 높다. 반대로 사용자가 몇 초 안에 결과를 봐야 하거나 다른 요청까지 말려드는 것이 더 큰 손해라면 NOWAIT로 즉시 실패시키고 재시도 정책을 앱에서 통제한다.

NOWAIT를 고를 때 함께 정해야 하는 것들이다.

- 재시도 상한과 지수 백오프, 지터를 반드시 함께 둔다. 상한 없는 즉시 재시도는 대기 큐를 재시도 폭주로 바꾼 것에 지나지 않는다 ([[Retry-Backoff-Jitter|재시도, 지수 백오프와 지터]]).
- 재시도 예산을 넘긴 요청의 최종 동작(사용자 안내, 큐로 이관, 실패 확정)을 미리 정한다.
- `NOWAIT`와 `SKIP LOCKED`는 행 수준 락에만 적용된다. 메타데이터 락 대기 같은 다른 대기는 그대로 남는다. 두 옵션 모두 statement-based replication에는 안전하지 않다.
- 큐 성격의 테이블에서 대기 없이 다음 일감을 집어야 하는 경우는 `SKIP LOCKED`가 맞는 선택지다. 잠긴 행을 결과에서 빼기 때문에 일관된 view가 아니라는 점은 [[Lock|DB Lock]] 참고.
- 애초에 잠금 읽기가 필요 없는 구조라면 그쪽이 앞선 해법이다. 조건부 UPDATE 한 문장으로 불변식을 표현할 수 있으면 대기도 재시도도 문제 범위가 줄어든다.

## 락 관련 에러 분기

세 에러는 원인, 롤백 범위, 재시도 단위가 모두 다르다. 하나로 묶어 catch하면 재시도가 틀린 지점에서 일어난다.

| 에러 | 번호 / SQLSTATE | 발생 | 기본 롤백 범위 | 재시도 단위 |
|---|---|---|---|---|
| `ER_LOCK_DEADLOCK` | 1213 / 40001 | 순환 대기 감지, victim으로 선택됨 | 트랜잭션 전체 | 새 트랜잭션으로 처음부터 |
| `ER_LOCK_WAIT_TIMEOUT` | 1205 / HY000 | `innodb_lock_wait_timeout` 초과 | 타임아웃난 문장만 | 문장 재시도, 트랜잭션 전체를 다시 하려면 먼저 명시적 rollback |
| `ER_LOCK_NOWAIT` | 3572 / HY000 | `NOWAIT` 잠금 읽기가 잠긴 행을 만남 | 해당 문장 실패 | 백오프 후 트랜잭션 재시작 |

- 1213은 트랜잭션이 이미 롤백된 상태다. 같은 커넥션에서 남은 문장을 이어 실행하면 안 되고 트랜잭션 경계 바깥에서 다시 시작해야 한다.
- 1205는 데드락의 증거가 아니다. 기본값에서는 문장만 롤백되고 트랜잭션은 살아 있으므로, 앞선 문장의 변경이 남은 채 재시도하는 사고가 나기 쉽다. 서버를 `--innodb-rollback-on-timeout`으로 띄우면 트랜잭션 전체가 롤백된다. 이 변수는 글로벌 범위이고 동적으로 바꿀 수 없으며 기본값은 OFF다. 운영 중인 서버의 현재 설정을 확인한 뒤 재시도 코드를 쓴다.
- 3572는 대기 자체가 없었다는 뜻이므로 즉시 재시도해도 같은 결과가 나오기 쉽다. 선행 트랜잭션이 끝날 시간을 벌도록 지연을 두고 다시 시도한다.
- 세 에러 모두 경합이 있는 서버에서 정상적으로 발생할 수 있는 사건이다. 예외를 알람으로만 처리하지 말고 재시도 경로와 카운터를 함께 둔다.

### Node.js 드라이버에서의 분기

mysql2의 에러 객체는 `NodeJS.ErrnoException`을 확장한 `QueryError`로, MySQL 서버 에러 심볼 문자열인 `code`(예: `ER_LOCK_DEADLOCK`)와 숫자 `errno`, `sqlState`를 함께 노출한다. TypeORM은 드라이버 에러를 `QueryFailedError`로 감싸면서 원본을 `driverError`에 두고, 원본의 속성들을 인스턴스에도 복사한다. 따라서 분기는 `driverError` 쪽을 기준으로 잡는 편이 드라이버 교체와 래핑 변화에 덜 흔들린다.

```typescript
const RETRYABLE = new Set([1213, 3572]) // deadlock, nowait

function lockErrno(e: unknown): number | undefined {
  const driver = (e as { driverError?: { errno?: number } })?.driverError
  return driver?.errno ?? (e as { errno?: number })?.errno
}
```

1205를 재시도 대상에 넣을지는 롤백 범위 판단이 먼저다. `innodb_rollback_on_timeout`이 꺼져 있으면 트랜잭션이 살아 있으므로, 재시도 전에 해당 트랜잭션을 명시적으로 롤백하고 새 트랜잭션으로 다시 시작하는 경로를 만든 뒤에 넣는다.

## 면접 체크포인트

- NOWAIT를 쓰면 대기 큐가 없다는 답에는 그래서 그 부하가 어디로 갔는지가 따라와야 한다. 서버 큐를 앱 재시도로 옮긴 등가 교환이고, 재시도 상한과 백오프가 그 교환의 대가라는 설명이 짝이다.
- 락 대기가 커넥션 풀 소진으로 번지는 경로를 λ×T와 풀 크기로 설명할 수 있으면 DB 문제와 앱 장애를 하나의 인과로 잇는다.
- 1213과 1205의 롤백 범위 차이를 말할 수 있으면 재시도 코드를 실제로 짜 본 사람으로 읽힌다.
- 어느 쪽이 항상 낫다고 답하지 않는다. 처리량이 목표인 배치와 응답 지연이 목표인 대화형 요청에서 선택이 갈린다.

## 출처

- [MySQL 8.4 Reference Manual — Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
- [MySQL 8.4 Reference Manual — InnoDB Error Handling](https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html)
- [MySQL 8.4 Reference Manual — InnoDB Lock and Lock-Wait Information](https://dev.mysql.com/doc/refman/8.4/en/innodb-information-schema-understanding-innodb-locking.html)
- [MySQL 8.4 Reference Manual — The INFORMATION_SCHEMA INNODB_TRX Table](https://dev.mysql.com/doc/refman/8.4/en/information-schema-innodb-trx-table.html)
- [MySQL 8.4 Reference Manual — InnoDB Startup Options and System Variables](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html)
- [MySQL 8.4 Error Reference — Server Error Message Reference](https://dev.mysql.com/doc/mysql-errors/8.4/en/server-error-reference.html)
- [MySQL Worklog WL#8919 — InnoDB: Implement NOWAIT and SKIP LOCKED](https://dev.mysql.com/worklog/task/?id=8919)
- [node-mysql2 — typings/mysql/lib/protocol/sequences/Query.d.ts, QueryError](https://github.com/sidorares/node-mysql2/blob/master/typings/mysql/lib/protocol/sequences/Query.d.ts)
- [TypeORM — src/error/QueryFailedError.ts](https://github.com/typeorm/typeorm/blob/master/src/error/QueryFailedError.ts)

## 관련 문서

- [[Lock|DB Lock]]
- [[Lock-Deadlock|DB 데드락]]
- [[MySQL-InnoDB-Locking-and-Deadlocks|MySQL 8.4 InnoDB Locking과 Deadlock]]
- [[Connection-Pool|DB 커넥션 풀, 사이징]]
- [[Retry-Backoff-Jitter|재시도, 지수 백오프와 지터]]
- [[MySQL-Slow-Query-Diagnosis|Slow Query와 lock wait 진단]]
- [[Transaction-Lock-Contention|트랜잭션 경합]]
