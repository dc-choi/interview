---
tags: [batch, distributed-systems, scheduling, messaging, idempotency, checkpoint]
status: done
verified_at: 2026-08-25
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Distributed Batch Execution", "분산 배치 실행", "트리거 외부화와 원자적 선점"]
---

# 분산 배치 실행 — 트리거 외부화와 원자적 선점

인스턴스에 내장된 스케줄러(`@Scheduled`, node-cron 류)는 인스턴스와 함께 복제된다. 스케일아웃하면 레플리카 수만큼 같은 스케줄이 살아나 같은 작업이 중복 실행되고, 반대로 인스턴스를 늘려도 처리량은 늘지 않는다. 분산 환경의 배치는 트리거(언제 시작하나)와 실행(무엇을 얼마나 병렬로 처리하나)을 분리해야 이 두 문제를 동시에 푼다.

## 내장 스케줄러가 스케일에서 깨지는 신호

- 중복 실행: 레플리카마다 스케줄러가 돌아 같은 회차가 N번 실행된다.
- 겹침(overrun): 데이터가 늘어 처리 시간이 실행 주기를 초과하면 이전 회차가 끝나기 전에 다음 회차가 시작된다.
- 확장 무효: 락으로 실행 주체를 하나로 좁혀 두면 인스턴스를 늘려도 처리 시간은 그대로다. 인스턴스를 늘렸는데 배치가 빨라지지 않는다면 스케줄러와 실행이 인스턴스에 묶여 있다는 신호다.

## 분산 배치의 요건 4가지

1. 한 회차의 대상은 결과에 한 번만 반영된다 (전달은 중복될 수 있으므로 중복 시도는 멱등으로 흡수).
2. 실패한 작업은 재시도된다.
3. 처리 중 인스턴스가 죽어도 대상이 유실되지 않는다.
4. 인스턴스를 늘리면 처리량이 늘어난다.

회차 멱등이나 스케줄러 공유 락(ShedLock 류의 동시 실행 배제)은 중복 실행 억제까지만 해결한다. 락도 시간 기반이라 TTL(`lockAtMostFor` 류)을 넘겨 실행되거나 노드 간 시계가 어긋나면 중복 실행이 가능하고, 모든 인스턴스가 내려가 있던 시각의 회차는 그대로 유실되며, 락은 실행 주체를 하나로 좁히는 도구라 4번과 정면으로 충돌한다.

## 구조 — 트리거, 준비, 실행, 연결

| 단계 | 주체 | 역할 |
|---|---|---|
| 트리거 | 외부 스케줄러 (K8s CronJob, Jenkins, EventBridge Scheduler 등) | 인스턴스 생명주기와 무관하게 회차를 발화. K8s CronJob은 중복 생성과 미생성이 모두 가능하고(approximate), EventBridge Scheduler는 at-least-once라 중복 전달이 가능하므로 회차 키 멱등이 전제 |
| 준비 | 회차당 한 번만 수행되는 단계 | 처리 대상을 공유 저장소에 행 단위로 펼친다 (대상 스냅샷) |
| 실행 | 다수 워커 인스턴스 | 저장소에서 대상을 원자적으로 선점해 병렬 처리 |
| 연결 | 메시지 큐 | 단계 간 전달, 재시도와 백오프, DLQ |

핵심은 처리 대상을 잡의 내부 상태가 아니라 공유 저장소의 데이터로 만드는 것이다. 대상이 데이터가 되면 어느 워커가 집어가든 상관없어져 워커 수만큼 처리를 병렬화할 수 있다 — 공유 저장소 경합이나 외부 API 한도가 새 병목이 되기 전까지다.

## 원자적 선점 (atomic claim)

여러 워커가 같은 대상을 집지 않으려면 가져가는 동작 자체가 원자적이어야 한다.

- DB 큐 방식: `SELECT ... FOR UPDATE SKIP LOCKED`으로 잠기지 않은 행의 id를 확보해 상태를 CLAIMED로 전이한다 (이 문서의 CLAIMED는 [[MySQL-Job-Queue|MySQL 작업 큐]]의 running, 재시도를 소진해 격리된 FAILED는 dead에 해당). 선점 트랜잭션은 짧게 끝내고 처리는 락 밖에서 하며, claim SQL, lease 길이 산정, 소유자 토큰과 회수 설계는 같은 문서가 자세히 다룬다.
- MQ 방식: SQS의 visibility timeout과 삭제처럼 큐가 선점과 반납을 대신한다. at-least-once 모델이라 중복 수신이 가능하므로 소비자는 멱등해야 한다 ([[Event-Driven-Patterns|경쟁 소비자 패턴]]).

선점한 워커가 죽어 트랜잭션이 롤백되면 `FOR UPDATE` 행 락도 함께 풀린다 (MySQL 8.4 문서 기준). 커넥션이 깔끔하게 끊기지 않는 장애(네트워크 단절, 프리즈)에서는 `wait_timeout` 류의 유휴 세션 타임아웃이 세션을 정리할 때까지 락이 남을 수 있다. 주된 설계 대상은 락이 아니라 커밋된 채 굳은 CLAIMED 상태다 — lease 만료로 회수하며, 죽은 워커와 느린 워커를 구별하는 하트비트와 소유자 토큰 설계는 [[SQS-Worker-Reliability|SQS 워커 안정성]]이 자세히 다룬다. 회수와 재처리가 전제이므로 대상 처리는 멱등해야 한다.

## 체크포인트와 재시작

- 대상 단위 상태(READY, CLAIMED, DONE, FAILED)가 1차 체크포인트다. 죽은 워커의 CLAIMED만 되돌리면 나머지 진행분은 그대로 이어진다.
- 대상 하나가 크면 내부 진행 좌표(어디까지 처리했는지)를 함께 저장해 중단 지점부터 재개한다.
- Spring Batch라면 메타데이터 테이블과 ExecutionContext가 이 역할을 한다. 실패한 실행의 재시작 조건과 동작은 [[Spring-Batch-Essentials-Structure|Spring Batch 구조]] 참조.

## 외부 시스템 호출과 일관성

배치가 외부 API나 PG 같은 외부 데이터 소스를 호출하면 그 호출은 DB 트랜잭션과 원자적이지 않다. 호출은 성공했는데 결과 기록 전에 죽으면 재시도가 이중 호출이 된다.

- 호출 전 의도 기록(intent) → 호출 → 결과 기록으로 단계를 나누고, 재시작 시 intent만 남은 건은 외부에 결과를 조회해 대사한다. 구체 사례는 [[Payment-Reconciliation-Worker|결제 대사 워커]].
- 외부 API가 멱등 키를 지원하면 대상 ID 기반 멱등 키로 이중 호출을 외부에서 흡수한다.
- 이벤트 발행이 목적이면 [[Transactional-Outbox|Outbox]]로 DB 커밋과 발행을 분리한다.

## 중앙 지휘형 vs 분산형

- 중앙 지휘형(Temporal 류 워크플로 엔진): 실행 상태를 엔진이 영속화하고 순차 흐름을 코드로 기술한다. 긴 순차 의존 흐름과 보상이 필요한 작업에 유리.
- MQ + 선점 분산형: 서로 독립인 대상의 대량 병렬 처리에 유리. 흐름 제어는 단순하지만 대상 간 의존성 표현은 약하다.

이 선택은 중앙 조정자가 실행 상태를 쥐는지라는 점에서 [[Saga-Pattern|Saga Pattern]]의 Orchestration vs Choreography 판단 기준과 겹친다.

## 면접 체크포인트

배치 경험을 말할 때 실행기 사용법보다 이 축들이 차별점이 된다.

- 다중 인스턴스에서 중복 실행을 어떻게 막았나 — `FOR UPDATE` 행 락은 정상 종료든 유휴 세션 타임아웃이든 서버가 결국 풀어 주므로, 직접 설계할 것은 커밋된 채 굳은 선점 상태의 회수와 외부 분산 락의 TTL이다.
- 중복 처리와 멱등을 어떤 상태 관리로 보장했나 — 상태를 어디에 뒀고 왜 그렇게 분리했나.
- 외부 API, PG 호출이 섞일 때 데이터 일관성을 어떻게 유지했나.
- 인스턴스를 늘리면 실제로 빨라지는 구조인가 — 아니라면 병목이 어디인가.

## 출처

- [@Scheduled 한 줄로 버티다, 트리거를 밖으로 꺼낸 이야기 — flex](https://flex.team/blog/2026/08/25/backend39)
- [ShedLock — GitHub](https://github.com/lukas-krecan/ShedLock)
- [MySQL 8.4 Reference Manual, Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
- [MySQL 8.4 Reference Manual, Server System Variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html)
- [Kubernetes Documentation, CronJob](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [Amazon EventBridge Scheduler User Guide, What is Amazon EventBridge Scheduler](https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html)
- [Amazon SQS Developer Guide, Visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Spring Batch Reference, The Domain Language of Batch](https://docs.spring.io/spring-batch/reference/domain.html)
- [Temporal Documentation, Understanding Temporal](https://docs.temporal.io/evaluate/understanding-temporal)

## 관련 문서

- [[MySQL-Job-Queue|MySQL 작업 큐 (lease와 SKIP LOCKED claim)]]
- [[Spring-Batch-Essentials-Scheduler|Spring Scheduler vs Quartz]] — 트리거 중복의 Spring 레벨 선택지
- [[Event-Driven-Patterns|이벤트 드리븐 실전 패턴 (경쟁 소비자, Retry+DLQ)]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[DML-Conflict-and-Batch-Patterns|MySQL DML 충돌 처리와 배치 패턴]]
- [[Stream-and-Batch-Processing|스트림과 배치 처리]]
- [[CDC-Debezium-Concept|CDC와 Debezium 개념]] — 폴링 파이프라인의 다음 단계
