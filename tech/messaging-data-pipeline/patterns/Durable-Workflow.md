---
tags: [workflow, orchestration, durable-execution, temporal, idempotency, reliability]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Durable Workflow", "Durable Execution", "지속 실행 워크플로"]
verified_at: 2026-09-30
---

# 지속 실행 워크플로 (Durable Workflow)

엔티티 하나의 장기 실행 과정을 코드로 기술하되, 복구에 필요한 실행 기록을 영속화해 크래시와 긴 대기를 견디게 하는 오케스트레이션 모델이다. 같은 애플리케이션 프로세스가 계속 살아 있어야 하는 의존을 줄이고, 타이머나 외부 신호를 받아 실행을 이어간다. 폴링 배치나 손으로 만든 상태 머신의 대안이다.

## 폴링 배치가 장기 실행에 안 맞는 지점

주기 배치로 "미접수 3분 경과 시 알림" 같은 엔티티별 장기 대기를 흉내 내면 아래가 겹친다.

- 타이머 정밀도: 1분 주기로 조회하면 조건 충족부터 다음 조회까지 약 1분 미만의 대기가 생기고, 스케줄링과 처리 지연이 더해진다.
- 피크 결합: 한 회차의 처리량이 대상 수에 선형으로 늘어 피크에 부담이 몰린다.
- 원천 부하: 매 회차 대량 조회로 DB를 훑는다.
- 상태 외재화: "얼마나 기다렸나, 신호가 왔나"를 매번 저장소에서 재구성해야 한다.

대기와 신호 대기가 본질인 흐름은 주기 스캔이 아니라 대기 자체를 일급으로 다루는 모델이 맞는다.

## 핵심 프리미티브

| 개념 | 역할 |
|---|---|
| Workflow | 비즈니스 흐름 자체. 결정적(deterministic)이어야 replay로 복원된다 |
| Activity | 외부 부수효과 호출(네트워크, DB 쓰기). 타임아웃과 재시도의 단위 |
| Signal | 실행 중인 인스턴스로 들어오는 외부 이벤트(예: 접수 완료) |
| Timer | 대기 만료를 영속 실행 흐름에 연결한다. 반복 실행을 시작하는 Schedule과는 구분한다 |

부수효과는 Activity 안에만 두고 Workflow 본문은 결정적으로 유지한다. 이것이 replay 복구의 전제다.

## 상태 지속과 suspend/resume (mental model)

부분 검증(2026-10-13): 이 절과 아래 Temporal replay, Activity 재시도 경계를 공식 문서와 대조했다. pg_durable의 버전과 API는 기존 절에 적힌 확인 시점을 유지한다.

- Workflow가 SDK의 Timer나 Signal을 기다리면 실행 진전을 멈추고, 이후 이벤트를 처리할 때 다시 이어간다. 이 대기를 일반 프로세스의 sleep이나 메모리 스냅샷 저장과 동일하게 보지 않는다.
- Temporal Worker는 처리한 Workflow 상태를 메모리 캐시에 보관할 수 있다. 캐시가 없어져도 Event History로 재구성하므로, 프로세스의 생존과 복구 가능성을 분리할 수 있다. 대기 중 메모리 사용량이 0이라는 뜻은 아니다.
- 타이머 만료와 실제 코드 실행 시점은 구분한다. 후속 Task를 처리할 Worker와 용량이 필요하며, 동일 시각에 많은 대기가 끝나면 작업이 몰릴 수 있다.

따라서 durable timer는 업무 테이블의 반복 스캔을 줄이는 수단이지, 자동 부하 분산이나 backpressure의 보장은 아니다. 대기 수, Worker 처리량과 재시도 유입을 따로 관측한다.

### 논리적 실행의 수명과 리전 장애의 경계

부분 검증(2026-10-15): Temporal Cloud Failovers 문서와 Agent memory and state 문서로 아래 경계를 대조했다. 기존 pg_durable 절의 검증 시점은 유지한다.

Workflow를 논리적 프로세스로 다룬다는 것은 특정 Worker 프로세스의 생존에 실행 상태를 묶지 않는다는 뜻이다. 실행 이력 자체가 사라져도 복구된다거나, 서비스와 Worker를 사용할 수 없는 동안 업무가 계속 진전된다는 뜻은 아니다. 종료한 실행의 Event History는 Namespace 보존 기간이 지나면 삭제되므로 영구 기록으로 가정하지 않는다.

Temporal Cloud의 High Availability Namespace는 기본 리전에서 복제본으로 이력을 비동기 복제한다. 정상 전환은 복제 대기를 비운 뒤 전환하지만 강제 전환에는 아직 복제되지 않은 이력이 남을 수 있다. 이전 리전이 회복되지 않으면 그 이력이 영구 유실될 가능성도 있다. 따라서 durable execution 도입만으로 리전 장애 시 데이터 손실이 없다고 약속할 수 없다.

일반적인 Workflow replay는 기록된 Activity 결과를 재사용하지만, HA 장애 전환 뒤 새 활성 Namespace에서는 완료했던 Activity가 다시 배정될 수 있다. 외부 효과의 멱등성은 프로세스 재시도뿐 아니라 이런 장애 전환에도 필요하다.

운영 점검 제안: 실행 이력의 보존과 복제, 대체 Worker의 기동, 외부 시스템 접근, 중복 효과 억제를 각각 시험한다. 실행 이력이 남았다는 사실과 업무가 재개됐다는 사실을 별도로 확인한다.

## 신뢰성 정책 (선언적, Activity 단위)

- 타임아웃: 개별 시도 상한(start-to-close)과 모든 재시도를 포함한 총 상한(schedule-to-close)을 나눈다.
- 재시도: maxAttempts와 backoff 곡선을 Activity별로 선언한다. 일시 오류와 영구 오류를 분류한다.
- 멱등성: 같은 업무 작업의 재시도 동안 유지되는 키를 외부 API에 넘긴다. 매 시도마다 새 키를 만들면 중복 반영 방지가 되지 않는다. 완료 결과가 기록된 Activity의 replay와 결과가 확정되지 않은 Activity의 재시도는 구분한다.

## 복구와 replay

Temporal은 메모리 스냅샷이나 임의의 코드 줄에서 복구하지 않는다. 캐시가 없으면 Workflow 코드를 다시 실행하면서 Event History에 기록된 결과를 사용해 상태를 재구성한다. 같은 히스토리에 대해 호환되는 Command 순서를 만들어야 하며, 외부 I/O는 Activity로 분리하고 시간과 난수는 SDK가 제공하는 replay-safe API와 규칙을 따른다.

### Workflow replay와 Activity 재시도의 차이

- **완료가 기록된 Activity**: Workflow replay는 기록된 결과를 재사용한다. replay 자체를 이유로 외부 API를 다시 호출하지 않는다.
- **완료가 기록되지 않은 Activity**: 외부 시스템은 요청을 반영했지만 Worker가 결과를 보고하기 전에 끊길 수 있다. 재시도 정책에 따라 같은 작업이 다시 실행될 수 있으므로 외부 부수효과의 멱등성이 필요하다.
- **긴 Activity**: Workflow 복구가 Activity 함수 내부의 실행 위치까지 복원하는 것은 아니다. Activity 재시도는 기본적으로 처음부터 시작하며, Heartbeat details를 체크포인트로 활용하려면 Activity 코드가 해당 정보를 읽고 이어서 처리해야 한다.

예를 들어 결제 승인 뒤 완료 보고가 유실됐다면 재시도에서도 같은 결제 키를 써야 한다. Workflow가 복구된다는 사실만으로 결제가 한 번만 반영된다고 보장할 수 없다.

### 생성 작업의 결과와 실행 기록을 분리한다

부분 검증(2026-10-15): Temporal의 Activity와 Claim Check 공식 문서를 대조했다. 아래 이미지 처리 흐름은 이 원리를 적용한 설계 예시이며 특정 서비스의 내부 구현을 재현한 것은 아니다.

이미지 생성 요청, 결과 저장, 후속 알림을 각각 Activity로 나누면 실패한 단계의 재시도 범위를 좁힐 수 있다. 저장이나 알림이 실패해도 생성 Activity의 완료가 기록되어 있다면 Workflow replay는 그 결과를 재사용한다. 생성 요청은 외부에서 처리됐지만 완료가 기록되지 않았다면 다시 호출될 수 있으므로, 공급자의 멱등성 지원이나 기존 작업 조회 수단을 확인해야 한다.

큰 이미지 본문을 실행 이력에 반복해서 넣기보다 외부 저장소에 두고 참조를 전달하는 [[Claim-Check|Claim Check]]를 검토한다. Temporal의 공식 예제는 큰 payload를 S3에 저장하고 Event History에는 참조를 남긴 뒤 필요할 때 원본을 읽는다. 이는 생성 결과의 품질 검사나 외부 부수효과의 중복 제거를 대신하지 않는다.

이 설계에서는 결과를 다시 읽을 기간과 저장소의 보존 기간을 맞추고, 재개할 Worker의 조회 권한과 객체 누락 처리도 확인한다. 실행 이력이 남아 있어도 참조한 객체가 사라지면 해당 결과를 읽을 수 없다. 내구성 있는 실행, 결과 데이터의 보존, 생성 품질을 별도 완료 조건으로 관리한다.

## 언제 쓰나 — 대안 비교

| 모델 | 맞는 문제 |
|---|---|
| 폴링 배치 | 짧은 주기의 단순 스캔, 대기가 본질이 아닌 작업 |
| [[Distributed-Batch-Execution|분산 배치 실행]] | 유한한 대량 회차를 워커로 병렬 처리(트리거 외부화, 원자적 선점) |
| 지속 실행 워크플로 | 엔티티별 장기 대기, 신호 구동, 정밀 타이머가 섞인 흐름 |
| [[Saga-Pattern\|Saga]] | 분산 트랜잭션 보상. 오케스트레이션 Saga의 실행 기반으로 durable workflow를 쓰기도 한다 |
| [[Airflow-DAG-Parsing\|Airflow]] | 스케줄된 태스크 그래프 배치 |
| DB 내장 durable execution (Postgres 확장) | 상태가 이미 Postgres에 있고 단계를 SQL로 표현할 수 있는 데이터 근접 작업(임베딩 인제스트, 팬아웃 집계) |

### DB 내장형의 조건과 한계

별도 오케스트레이터 없이 DB 확장이 단계별 체크포인트와 재개를 맡는 선택지다. 워크플로 정의, 진행 상태와 재시도 기록이 데이터와 같은 저장소, 같은 권한과 백업 체계 안에 머문다. Postgres를 이미 운영하는 작은 팀이라면 cron, 상태 테이블, 폴링 워커를 엮던 구성을 확장 하나로 줄일 수 있다. 대신 다음을 감수한다.

- 주 DB 부하: 워크플로 실행과 체크포인트 쓰기가 트랜잭션 워크로드와 같은 인스턴스의 CPU, WAL, 커넥션을 나눠 쓴다.
- 확장 한계: 처리량이 DB 인스턴스에 묶이고, 여러 이기종 시스템을 넘나드는 흐름에는 맞지 않는다.
- 표현력: 단계가 SQL, 분기, 루프, HTTP 호출로 표현돼야 한다. 임의의 애플리케이션 로직은 SQL 함수나 HTTP 엔드포인트로 감싸야 한다.
- 관측과 운영: 전용 UI 대신 상태 테이블 조회가 기본이고, 확장 설치와 백그라운드 워커 실행이 허용되지 않는 환경에서는 쓸 수 없다.
- 성숙도: 예시인 microsoft/pg_durable은 2026-09 기준 0.2.x 릴리스(PostgreSQL License, PostgreSQL 17과 18 대상)다. `~>`(순차), `|=>`(결과에 이름 붙이기), `&`(병렬 join) 같은 연산자로 단계를 조합해 `df.start()`로 실행하고, 공개 Docker 이미지는 평가용으로만 안내된다.

### pg_durable의 시작 트랜잭션과 완료 경계

이 절은 2026-10-07에 확인한 pg_durable User Guide 기준이다. 앞의 Workflow/Activity와 결정적 replay 설명은 Temporal형 모델이며, 모든 DB 내장 실행기의 API 계약이 같다는 뜻은 아니다.

- 기본 `df.start()`는 호출자의 트랜잭션에 참여한다. 호출자가 커밋해야 워크플로가 실행되며, 롤백하면 시작 요청도 취소된다.
- `transaction_mode => 'new'`는 별도 세션의 트랜잭션으로 시작 요청을 커밋한다. 호출자의 롤백 뒤에도 요청이 남지만, 이는 비동기 작업의 시작만 독립시킨다. 업무 처리가 끝났다는 보장은 아니다.
- 반환된 인스턴스 ID를 보관하고 `df.status()`, `df.result()`와 모니터링 API로 후속 결과를 확인한다. 별도 트랜잭션 시작 중 연결이 끊기면 시작 여부가 불확실할 수 있으므로 대상 작업을 멱등하게 설계한다.

예를 들어 주문 저장과 후속 작업 등록을 함께 취소해야 한다면 기본 호출자 트랜잭션의 경계를 유지한다. 호출자 롤백과 무관하게 남겨야 할 비동기 작업에만 별도 시작 트랜잭션을 검토한다. DB 확장이 추가 서비스 수를 줄여도 이 완료 확인과 실패 처리는 필요하다.

## Build vs Buy

- Buy(Temporal 등): durable execution을 관리형으로 제공하고 결정적 실행, 재시도, replay, 관측 UI를 갖춘다. 대신 deterministic execution 패러다임 학습, 별도 cluster/DB/UI 운영, 핵심 실행 기반의 기술 종속이 비용이다.
- Build(경량 자작): 이미 쓰는 인프라(예: 코루틴 suspend/await + reactive DB 영속 + atomic CAS) 위에 Workflow/Activity/Signal/Timer 같은 필수 프리미티브만 압축한다. 인프라 부담과 종속을 줄이는 대신 멱등성, 결정성, replay 같은 정확성의 가장자리를 직접 책임진다.

무겁게 통째로 도입하지 말고 필요한 개념만 차용하면 배치의 단순함과 워크플로의 안정성을 함께 얻을 수 있으나, 자작은 durable execution의 어려운 부분(멱등, 결정성, 복구)을 스스로 지는 선택임을 분명히 한다.

## 운영과 면접 체크포인트

- 모든 인스턴스 상태를 한 저장소에 모으면 상태별 카운트 대시보드, 다음 깨움 시각, replay 히스토리, 변수 스냅샷을 한 화면에서 본다.
- 멱등성 키 없이 재시도하면 외부 부수효과가 중복된다. Activity 경계마다 idempotency를 설계한다.
- Workflow 본문의 비결정 요소는 replay를 깨뜨릴 수 있다. 외부 I/O는 Activity에 두고 시간과 대기는 SDK의 replay-safe API를 사용한다.
- 타이머 요건은 대기 만료와 후속 Task의 실제 시작 지연을 나눠 측정한다. durable timer를 실시간 실행 시각 보장으로 해석하지 않는다.

## 출처

- [한꺼번에 짊어지던 배치를 내려놓고, 하나씩 흘려보내는 워크플로로 — 우아한형제들 기술블로그](https://techblog.woowahan.com/26832/)
- [Temporal Documentation, Workflows](https://docs.temporal.io/workflows)
- [Temporal Documentation, Failovers](https://docs.temporal.io/cloud/high-availability/failovers)
- [Temporal Documentation, Agent memory and state](https://docs.temporal.io/ai/featured/memory-state-stripe)
- [Temporal Documentation, Workflow Execution overview](https://docs.temporal.io/workflow-execution)
- [Temporal Documentation, Activities](https://docs.temporal.io/activities)
- [Temporal Documentation, Claim check pattern with Temporal](https://docs.temporal.io/ai/cookbook/claim-check-pattern-python)
- [Temporal Documentation, Workers](https://docs.temporal.io/workers)
- [pg_durable — GitHub, microsoft](https://github.com/microsoft/pg_durable)
- [Microsoft, pg_durable User Guide](https://github.com/microsoft/pg_durable/blob/main/USER_GUIDE.md#transaction-semantics)

## 관련 문서

- [[Distributed-Batch-Execution|분산 배치 실행]]
- [[Stream-and-Batch-Processing|스트림과 배치 처리]]
- [[Saga-Pattern|Saga Pattern]]
- [[Idempotency-Key|멱등성 키]]
- [[Backpressure|Backpressure]]
- [[PostgreSQL-Extensions|PostgreSQL 확장]]
