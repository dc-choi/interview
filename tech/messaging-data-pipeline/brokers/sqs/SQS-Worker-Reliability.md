---
tags: [messaging, aws, sqs, reliability, retry, idempotency, worker]
status: done
verified_at: 2026-08-21
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["SQS Worker Reliability", "SQS 워커 신뢰성", "가시성 하트비트"]
---

# SQS 워커 신뢰성 (재시도 간격, 좌초 회수)

> 상위 문서: [[SQS|Amazon SQS]]

워커를 오래 굴리면 두 질문이 남는다. 실패한 메시지를 언제 다시 줄 것인가, 그리고 처리 중이라고 표시된 채 아무도 손대지 않는 작업을 누가 되찾을 것인가. 앞은 SQS가 주는 원시 기능의 조합 문제이고, 뒤는 워커 쪽 상태 설계 문제다.

## 재시도 간격을 만드는 원시 기능 세 개

SQS에는 메시지마다 재시도 백오프 곡선을 지정하는 설정이 없다. 재시도 시점을 움직이는 수단은 아래 세 가지이고, 채널별 정책은 이 위에 애플리케이션이 얹는다.

| 수단 | 무엇을 미루나 | 지정 범위 | 상한 |
|---|---|---|---|
| Visibility timeout | 수신된 메시지가 다시 보이기까지 | 큐 기본값과 `ChangeMessageVisibility`로 메시지별 조정 | 최초 수신 시점부터 12시간 |
| `DelaySeconds` | 큐에 들어온 메시지의 최초 노출 | 큐 단위 delay queue, 메시지 단위 message timer | 15분 |
| `maxReceiveCount` | 미루지 않고 재시도를 끝냄 | redrive policy, 큐 단위 | 수신 횟수만 셈, 간격에는 관여 안 함 |

### Visibility timeout

- 큐 기본값은 30초이고 `ChangeMessageVisibility`의 `VisibilityTimeout`은 0에서 43,200초(12시간)를 받는다. 새 값은 호출 시점부터 카운트한다. 수신 15초 뒤에 10초를 걸면 그 호출 시점부터 10초다.
- 12시간 상한은 최초 수신 시점 기준이고 연장 호출이 이 상한을 리셋하지 않는다. 남은 시간보다 큰 값을 넣으면 AWS는 에러를 돌려주며, 남은 최대치로 알아서 깎아주지 않는다.
- 메시지별로 바꾼 값은 보존되지 않는다. 삭제하지 않아 다시 수신되면 큐의 원래 값으로 돌아간다. 이 API로 백오프 상태를 누적할 수 없다는 뜻이고, 매 수신마다 `ApproximateReceiveCount`를 읽어 간격을 새로 계산하는 방식이 이 동작에 맞는다.
- 가시성이 이미 만료된 메시지에 `ChangeMessageVisibility`를 부르면 `MessageNotInflight` 에러다. 연장 실패는 소유권을 잃었다는 신호로 읽는다.

### DelaySeconds

- 큐 단위 지연과 메시지 단위 타이머 모두 0에서 15분이고, 메시지에 준 값이 큐 값을 덮는다.
- FIFO 큐는 메시지 단위 타이머를 지원하지 않는다. 큐 단위 지연 설정 변경도 FIFO에서는 이미 큐에 있는 메시지까지 소급되고 표준 큐에서는 소급되지 않는다.
- 15분을 넘는 스케줄이 필요하면 AWS 문서는 EventBridge Scheduler를 권한다.

### maxReceiveCount

- 소비자가 메시지를 이 횟수만큼 수신한 뒤에도 삭제하지 않으면 DLQ로 옮긴다. DLQ는 소스 큐와 같은 계정, 같은 리전이어야 한다.
- 표준 큐에서 `maxReceiveCount`가 3보다 크면, 3회 이상 수신되고 삭제되지 않은 메시지를 SQS가 큐 뒤로 보낸다. 이때 `ApproximateAgeOfOldestMessage`는 그 임계를 넘지 않은 다음 메시지의 나이를 반영하므로, 이 메트릭만 보면 오래 재시도 중인 메시지의 지연이 가려진다.

## 채널별 재시도 정책을 얹는 세 가지 방법

카카오톡 발송은 간격을 점점 벌려 재시도하고 이메일은 오래 붙잡고 재시도한다는 식의 정책은 큐 설정 항목이 아니다. 위 원시 기능 위에 아래 셋 중 하나로 구현한다.

| 구현 | 지연이 생기는 곳 | 감당 가능한 간격 | 대가 |
|---|---|---|---|
| 워커 내부 재시도 | 프로세스 안의 대기 | 초 단위 | 재시도 내내 메시지가 in-flight를 점유해 처리 슬롯과 in-flight 한도를 갉아먹음 |
| `ChangeMessageVisibility` 백오프 | SQS 가시성 | 초에서 시간 (12시간 상한 안) | 시도 횟수를 `ApproximateReceiveCount`로만 알 수 있음 |
| 지연 큐 재발행 | `DelaySeconds` | 15분까지 | 새 메시지가 되어 수신 횟수와 DLQ 안전망이 리셋됨 |

- **워커 내부 재시도**는 visibility timeout 안에서 끝나야 한다. 백오프가 길어져 timeout을 넘기면 아직 처리 중인 메시지가 다른 워커에 노출된다.
- **`ChangeMessageVisibility` 백오프**는 실패 시 삭제도 재발행도 하지 않고 다음 노출 시점만 민다. 대기가 워커 프로세스를 점유하지 않는 것이 핵심 이점이다. 시도 횟수는 `ApproximateReceiveCount`에서 얻는데 이름 그대로 근사치이고 삭제되지 않은 수신 횟수를 세는 값이라, 정확한 카운터가 필요한 로직의 근거로는 쓰지 않는다. 간격 공식과 지터 변형은 [[Retry-Backoff-Jitter|지수 백오프와 지터]].
- **지연 큐 재발행**은 단계별 지연 큐를 두거나 실패 시 `DelaySeconds`를 붙여 다시 보낸다. 15분 상한에 더해, 재발행된 메시지는 새 `MessageId`를 받아 수신 횟수가 처음부터 다시 세어진다. 시도 횟수를 메시지 속성으로 직접 운반하고 종료 조건도 직접 판단해야 `maxReceiveCount` 기반 DLQ 없이 무한 순환을 막을 수 있다.

정책 매핑은 이렇게 갈린다. 간격을 벌리는 채널은 `ChangeMessageVisibility` 백오프로 간격을 만들고 `maxReceiveCount`로 끝을 정한다. 오래 붙잡는 채널은 `maxReceiveCount`를 크게 잡고 간격에 상한을 둔다. 다만 재시도가 무기한은 아니다. 메시지 보존 기간(기본 4일, 최대 14일)이 실질적인 상한이라 그 안에서 몇 번을 시도할지 역산한다. 두 정책이 한 큐에 섞이면 큐를 나누는 편이 낫다. 가시성 기본값, `maxReceiveCount`, DLQ 연결은 모두 큐 단위 설정이라 한 큐 안에서 채널별로 다르게 잡을 수 없다.

## PROCESSING으로 좌초된 행 회수

이 절의 하트비트, 소유권 토큰 설계는 AWS 공식 규격이 아니라 lease 기반 작업 큐에서 반복되는 구현 패턴이다. SQS 쪽 동작(가시성 연장과 12시간 상한)만 공식 문서에 근거한다.

insert-first 패턴([[At-Least-Once|At-Least-Once]])처럼 처리 상태를 DB에 `PROCESSING`으로 남기는 설계에서, 워커가 죽으면 그 행이 `PROCESSING`으로 굳는다. 가장 나쁜 조합은 SQS 가시성이 만료돼 메시지가 다시 나오는데 DB가 `PROCESSING`이라 다른 워커가 처리 중으로 판단하고 실행을 건너뛰는 경우다. 이 수신자가 정상 반환해 메시지를 삭제하면 기존 워커 장애 시 작업이 즉시 유실되고, 삭제하지 않더라도 회수 조건이 없으면 수신 횟수만 쌓여 DLQ로 간다.

**시작 시각만으로는 죽은 워커와 느린 워커가 구별되지 않는다.** `started_at`이 10분 전이라는 사실은 워커가 죽었다는 증거가 아니라 처리가 10분째라는 사실일 뿐이다. 임계를 넘겼다고 회수하면 살아 있는 워커가 붙잡은 작업을 다른 워커가 다시 잡아 같은 부수효과를 두 번 실행한다. 반대로 임계를 늘리면 진짜 좌초의 회복이 그만큼 늦어진다. 이 트레이드오프는 임계값 튜닝으로 사라지지 않는다.

기준을 시작 시각에서 하트비트 신선도로 바꾸면 두 상황이 구별된다.

1. **하트비트**: 워커가 처리 중 주기적으로 `heartbeat_at`을 갱신하고, 같은 주기에 `ChangeMessageVisibility`로 가시성도 연장한다. 죽은 워커는 하트비트를 못 찍고 느린 워커는 계속 찍는다.
2. **주기 선택**: 하트비트 주기는 회수 임계의 몇 분의 1로 둔다. 30초 주기에 3분 임계면 연달아 대여섯 번 놓쳐야 회수된다. GC 정지나 순간적인 DB 지연 한 번으로 회수되지 않게 하는 여유다. 가시성 연장 폭도 하트비트 주기보다 넉넉히 잡아, 하트비트가 한 번 늦어도 메시지가 곧바로 재노출되지 않게 한다.
3. **소유권 토큰**: 회수할 때 `owner_token`을 새 값으로 바꾼다. 완료 처리와 하트비트 갱신 UPDATE에 `WHERE owner_token = ?`를 걸면, 회수된 뒤 되살아난 옛 워커가 남의 작업을 완료로 덮어쓰지 못하고 스스로 소유권 상실을 감지한다.
4. **멱등 부수효과**: 마지막 방어선이다. 네트워크 분단으로 하트비트만 끊기고 워커는 외부 API를 계속 호출하는 상황이 가능하므로, 하트비트가 정확하다는 전제로 안전성을 쌓지 않는다. 회수가 안전하려면 부수효과가 두 번 실행돼도 결과가 같아야 한다 ([[Idempotent-Consumer|멱등 컨슈머]], [[Idempotency-Key|멱등성 키]]).

```sql
ALTER TABLE message_processing
  ADD COLUMN owner_token CHAR(36) NULL,
  ADD COLUMN heartbeat_at DATETIME(6) NULL;

-- 회수 스위퍼: 시작 시각이 아니라 하트비트 신선도로 판단
UPDATE message_processing
SET status = 'FAILED', owner_token = NULL
WHERE status = 'PROCESSING'
  AND heartbeat_at < NOW(6) - INTERVAL 3 MINUTE;
```

회수 스위퍼 자체도 여러 인스턴스에서 돌면 같은 행을 동시에 회수한다. 인스턴스 중복 제거 축은 [[Transactional-Outbox#Relay를 여러 인스턴스에서 돌릴 때|Outbox Relay의 다중 인스턴스 절]]과 같다. lease 컬럼 설계 전반은 [[MySQL-Job-Queue|MySQL 작업 큐]].

## 운영 신호

- `ApproximateAgeOfOldestMessage`: 백오프를 길게 잡으면 이 값이 자연히 커진다. 알람 임계를 백오프 상한 위로 올리지 않으면 정상 재시도가 장애로 보인다.
- `ApproximateNumberOfMessagesNotVisible`: 워커 내부 대기 재시도를 쓰면 부풀고, 표준 큐 약 120,000건인 in-flight 한도에 가까워질 수 있다.
- DLQ 유입 건수: 재시도 정책을 바꾸면 가장 먼저 움직이는 지표. 처리한 적도 없는 메시지가 DLQ로 가는 throttling 함정은 [[SQS-Lambda-ESM|ESM 문서]].
- 좌초 회수 건수: 0이라고 하트비트가 잘 도는 것은 아니다. 회수 로직이 아예 안 돌 수도 있으므로 회수 건수와 좌초부터 회수까지 걸린 시간을 함께 본다.

## 면접 체크포인트

- SQS에 메시지별 백오프 설정이 없다는 사실과, 그 자리를 메우는 세 원시 기능의 역할 분담
- `ChangeMessageVisibility`의 12시간 상한이 최초 수신 기준이고 연장으로 리셋되지 않는다는 점
- 지연 큐 재발행이 수신 횟수와 DLQ 안전망을 리셋한다는 부작용
- 죽은 워커와 느린 워커가 시작 시각으로 구별되지 않는 이유, 하트비트가 그 구별을 만드는 방식
- 하트비트, 소유권 토큰, 멱등 부수효과의 3층 방어에서 각 층이 막는 실패가 무엇인지

## 출처

- [Amazon SQS visibility timeout — AWS 공식 문서](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [ChangeMessageVisibility — Amazon SQS API Reference](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ChangeMessageVisibility.html)
- [ReceiveMessage — Amazon SQS API Reference](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html)
- [Amazon SQS delay queues — AWS 공식 문서](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-delay-queues.html)
- [Amazon SQS message timers — AWS 공식 문서](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-timers.html)
- [Using dead-letter queues in Amazon SQS — AWS 공식 문서](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
- [Amazon SQS message quotas — AWS 공식 문서](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html)

## 관련 문서

- [[SQS|Amazon SQS]]
- [[SQS-Consumer-Lambda-vs-ECS|컨슈머 선택: Lambda vs ECS 워커]]
- [[SQS-Lambda-ESM|SQS → Lambda 폴링 (ESM)]]
- [[At-Least-Once|At-Least-Once (insert-first와 PROCESSING 상태 머신)]]
- [[Idempotent-Consumer|멱등 컨슈머]]
- [[Retry-Backoff-Jitter|지수 백오프와 지터]]
- [[MySQL-Job-Queue|MySQL 작업 큐 (lease와 SKIP LOCKED claim)]]
- [[Transactional-Outbox|Transactional Outbox]]
