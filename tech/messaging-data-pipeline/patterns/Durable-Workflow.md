---
tags: [workflow, orchestration, durable-execution, temporal, idempotency, reliability]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Durable Workflow", "Durable Execution", "지속 실행 워크플로"]
verified_at: 2026-09-30
---

# 지속 실행 워크플로 (Durable Workflow)

엔티티 하나의 장기 실행 과정을 코드로 기술하되, 그 실행 상태를 저장소에 durable하게 남겨 크래시와 긴 대기를 견디게 하는 오케스트레이션 모델이다. 대기 구간에는 스레드와 메모리를 붙잡지 않고 상태만 남긴 채 잠들었다가, 예정 시각이나 외부 신호에 다시 깨어나 이어서 실행한다. 폴링 배치나 손으로 만든 상태 머신의 대안이다.

## 폴링 배치가 장기 실행에 안 맞는 지점

주기 배치로 "미접수 3분 경과 시 알림" 같은 엔티티별 장기 대기를 흉내 내면 아래가 겹친다.

- 타이머 정밀도: 폴링 주기가 곧 오차다. 1분 주기면 최대 59초 늦게 발화한다.
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
| Timer / Scheduler | durable sleep. `resumeAt` 시각에만 인스턴스를 깨운다 |

부수효과는 Activity 안에만 두고 Workflow 본문은 결정적으로 유지한다. 이것이 replay 복구의 전제다.

## 상태 지속과 suspend/resume (mental model)

- `await(3분)`을 만나면 스레드를 반납하고 상태를 저장소에 남긴다. 대기 중 메모리 점유는 사실상 0이다.
- 스케줄러는 `resumeAt`이 지난 인스턴스만 폴링해 깨운다. 대기 물량은 저장소에만 쌓이므로 대기가 곧 메모리 압력이 되지 않는다 (지속 상태 기반의 자연스러운 backpressure).
- 깨어나면 저장된 결과로 빠르게 이어가고 다음 단계를 실행한다.

폴링 배치가 회차마다 전체를 훑는 것과 달리, 각 엔티티가 자기 시각에만 깨어나므로 대상이 몰려도 피크가 분산된다.

## 신뢰성 정책 (선언적, Activity 단위)

- 타임아웃: 개별 시도 상한(start-to-close)과 모든 재시도를 포함한 총 상한(schedule-to-close)을 나눈다.
- 재시도: maxAttempts와 backoff 곡선을 Activity별로 선언한다. 일시 오류와 영구 오류를 분류한다.
- 멱등성: invocation token 같은 실행 식별자를 외부 API의 idempotency 키로 넘겨, 재시도와 replay로 호출이 반복돼도 중복 반영을 막는다.

## 복구와 replay

크래시가 나도 마지막 체크포인트부터 자동 재개한다. 저장된 이벤트 히스토리를 단계별로 재생해 in-memory 상태를 복원하므로, 같은 히스토리에 대해 같은 결정을 내려야 한다. Workflow 코드에 시계, 난수, 직접 I/O 같은 비결정 요소를 두면 replay가 어긋난다.

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
- Workflow 본문의 비결정 요소는 replay를 깨뜨린다. 시계와 I/O는 Activity와 Timer로 밀어낸다.
- 타이머 정밀도가 요건이면 폴링 주기 오차 대신 `resumeAt` 기반 durable timer를 쓴다.

## 출처

- [한꺼번에 짊어지던 배치를 내려놓고, 하나씩 흘려보내는 워크플로로 — 우아한형제들 기술블로그](https://techblog.woowahan.com/26832/)
- [Temporal Documentation, Workflows](https://docs.temporal.io/workflows)
- [pg_durable — GitHub, microsoft](https://github.com/microsoft/pg_durable)
- [Microsoft, pg_durable User Guide](https://github.com/microsoft/pg_durable/blob/main/USER_GUIDE.md#transaction-semantics)

## 관련 문서

- [[Distributed-Batch-Execution|분산 배치 실행]]
- [[Stream-and-Batch-Processing|스트림과 배치 처리]]
- [[Saga-Pattern|Saga Pattern]]
- [[Idempotency-Key|멱등성 키]]
- [[Backpressure|Backpressure]]
- [[PostgreSQL-Extensions|PostgreSQL 확장]]
