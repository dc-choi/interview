---
tags: [messaging, aws, eventbridge, sqs, event-driven]
status: done
verified_at: 2026-08-27
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["EventBridge SQS Target", "EventBridge to SQS", "EventBridge SQS 패턴"]
---

# EventBridge → SQS 타겟 패턴

> 상위 문서: [[EventBridge|Amazon EventBridge]]

규칙의 타겟을 SQS 큐로 두는 구성. 이벤트 기반 아키텍처에서 가장 자주 쓰는 조합이다. EventBridge가 라우팅과 필터링을, SQS가 버퍼링과 속도 조절을 맡는다.

## 왜 SQS를 타겟으로 두나

Lambda로 바로 push해도 되지만, 중간에 SQS를 끼우면 **버퍼와 디커플링**이 생긴다.

- **내구성 경계**: EventBridge가 SQS에 전달한 뒤에는 컨슈머가 멈춰도 retention 기간 안에서 메시지가 큐에 남는다. 직접 Lambda 타겟도 EventBridge 재시도와 타겟 DLQ를 설정할 수 있지만, 성공적으로 호출된 뒤 소비 속도를 흡수하는 독립 큐는 없다.
- **백프레셔와 속도 평탄화**: 이벤트가 폭주해도 컨슈머가 자기 페이스로 pull. Lambda 동시성 폭발 방지.
- **배치 처리**: 컨슈머가 여러 메시지를 묶어 처리.
- **실패 처리 일원화**: 큐 레벨에서 재시도와 DLQ.
- **순서 제약이 필요하면 FIFO 큐**: EventBridge 입력 순서를 복원하지는 않으며, 정한 `MessageGroupId` 안에서만 SQS 순서 보장을 얻는다.

## 함정 1: SQS 리소스 정책 (제일 자주 빠뜨림)

SQS 큐에 EventBridge의 `sqs:SendMessage`를 허용하는 **리소스 기반 정책**이 없으면 전달에 실패한다. 애플리케이션 요청 경로에는 직접 오류가 없어 조용해 보일 수 있지만, EventBridge의 `FailedInvocations` 지표와 타겟 DLQ의 `NO_PERMISSIONS` 오류 코드로 관측할 수 있다. 알람과 DLQ가 없으면 메시지만 오지 않는 것처럼 보인다.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowEventBridgeSendMessage",
    "Effect": "Allow",
    "Principal": { "Service": "events.amazonaws.com" },
    "Action": "sqs:SendMessage",
    "Resource": "arn:aws:sqs:ap-northeast-2:111122223333:OrderQueue",
    "Condition": {
      "ArnEquals": {
        "aws:SourceArn": "arn:aws:events:ap-northeast-2:111122223333:rule/my-app-bus/OrderCreatedRule"
      }
    }
  }]
}
```

`aws:SourceArn` 조건은 **confused deputy(혼동된 대리자)** 공격 방지용. 특정 규칙만 이 큐에 쏠 수 있게 제한한다.

## CDK target construct의 권한 처리

`SqsQueue` target construct는 변경 가능한 queue construct라면 SendMessage 권한을 요청해 정책을 함께 합성한다. imported queue나 외부에서 관리하는 queue는 정책을 이 stack에서 바꿀 수 없는 구성이 있으므로, 합성된 template과 실제 queue policy를 확인한다.

```typescript
import { Rule, EventBus, RuleTargetInput } from "aws-cdk-lib/aws-events";
import { SqsQueue } from "aws-cdk-lib/aws-events-targets";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Duration } from "aws-cdk-lib";

const dlq = new Queue(this, "OrderDlq", { retentionPeriod: Duration.days(14) });
const queue = new Queue(this, "OrderQueue", {
  visibilityTimeout: Duration.seconds(60), // 컨슈머 처리시간보다 넉넉히
});

const rule = new Rule(this, "OrderCreatedRule", {
  eventBus: EventBus.fromEventBusName(this, "Bus", "my-app-bus"),
  eventPattern: { source: ["weeklylab.orders"], detailType: ["OrderCreated"] },
});

rule.addTarget(new SqsQueue(queue, {
  deadLetterQueue: dlq,   // EventBridge → SQS 전달 실패 시 DLQ
  retryAttempts: 3,
  // message: RuleTargetInput.fromEventPath("$.detail"), // detail만 보낼 때
}));
```

여기 `deadLetterQueue`는 **EventBridge가 SQS로 전달하다 실패**했을 때 가는 DLQ다 (컨슈머 처리 실패와는 별개, 함정 3 참조).

## SQS에 들어오는 메시지 구조

EventBridge가 SQS로 보낼 땐 **이벤트 전체(envelope)가 메시지 body에 그대로** 들어간다. SNS → SQS처럼 한 번 더 감싸는 래퍼가 없다.

```json
{
  "version": "0", "id": "6a7e8feb-...", "detail-type": "OrderCreated",
  "source": "weeklylab.orders", "account": "111122223333",
  "time": "2026-06-09T12:00:00Z", "region": "ap-northeast-2", "resources": [],
  "detail": { "orderId": "ord-1234", "amount": 50000 }
}
```

컨슈머는 body를 파싱한 뒤 `.detail`을 꺼내 쓴다. (input transformer로 `$.detail`만 보내게 했다면 body가 곧장 detail 내용이 된다.)

## 컨슈머 구현

### Lambda + SQS event source mapping (부분 배치 실패)

`functionResponseTypes: ["ReportBatchItemFailures"]`를 켜면 배치 중 실패한 메시지만 재시도되고 나머지는 정상 삭제된다. 안 켜면 하나만 실패해도 전체 배치가 재유입되어 이미 처리한 것까지 중복된다.

아래 코드는 Standard 큐 기준이다. FIFO 큐에서 partial batch response를 사용하면 첫 실패 뒤 처리를 멈추고 실패한 메시지와 아직 처리하지 않은 메시지를 모두 `batchItemFailures`에 반환해야 그룹 순서를 보존할 수 있다.

```typescript
import { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from "aws-lambda";

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchItemFailure[] = [];
  for (const record of event.Records) {
    try {
      const ebEvent = JSON.parse(record.body);     // EventBridge 이벤트 전체
      const { orderId, amount } = ebEvent.detail;
      await processOrder(orderId, amount);          // 멱등 처리 (중복 가능)
    } catch (e) {
      batchItemFailures.push({ itemIdentifier: record.messageId }); // 이 메시지만 재시도
    }
  }
  return { batchItemFailures };
};
```

### NestJS 상시 워커

Lambda 대신 상시 떠 있는 컨슈머면 `@aws-sdk/client-sqs`로 `ReceiveMessage`(long polling) → 처리 → `DeleteMessage` 루프를 돌리거나, `@ssut/nestjs-sqs`(내부적으로 sqs-consumer 사용)로 데코레이터 기반으로 구성한다.

## 생산자 DB와 이벤트 발행의 원자성 경계

EventBridge를 SQS 앞에 둬도 생산자가 업무 DB를 commit한 뒤 `PutEvents`를 별도로 호출하는 이중 쓰기는 원자적이지 않다. DB commit만 성공하거나 이벤트 발행만 재시도되는 실패 구간은 EventBridge 타겟 DLQ로 복구할 수 없다. 타겟 DLQ는 EventBridge가 이미 받은 이벤트를 SQS에 전달하지 못한 경우만 다룬다.

업무 상태 변경과 이벤트 생성이 함께 성공해야 하면 같은 DB transaction에서 업무 row와 outbox row를 저장하고, 별도 relay가 commit된 outbox를 EventBridge에 발행하는 Transactional Outbox를 검토한다. relay 재시도는 중복 발행을 만들 수 있으므로 outbox 상태와 consumer 멱등성도 함께 둔다. 이 절은 현재의 설계 교정안이며, 아래 과거 경험에서 Transactional Outbox까지 구현했다는 뜻은 아니다.

## 베스트 프랙티스

- **멱등성 필수**: 종단 간 exactly-once로 보지 않는다. AWS 서비스 source는 best-effort 또는 durable delivery level을 가지며, EventBridge는 한 이벤트에 같은 타겟을 드물게 두 번 이상 호출할 수 있다. source, rule target과 SQS 소비 경계를 나눠 관측하고 orderId 같은 업무 키로 중복을 차단한다.
- **DLQ를 2단으로**: ① EventBridge → SQS **전달 실패용** DLQ(타겟 설정), ② SQS 컨슈머 **처리 실패용** DLQ(큐의 redrivePolicy). 둘은 다른 것이며 EventBridge target DLQ는 Standard queue만 지원한다.
- **Visibility timeout**: Lambda 트리거면 함수 타임아웃의 **최소 6배**로 두고, batch window를 사용하면 그 시간도 더한다.
- **FIFO 큐**: EventBridge rule target에는 deduplication ID를 지정하는 파라미터가 없으므로 타겟 FIFO 큐에 **content-based deduplication**을 켠다. 동시에 타겟의 `SqsParameters.MessageGroupId`, CDK의 `messageGroupId`를 명시한다. content hash는 제한된 deduplication window에서 전송 중복을 줄이는 장치일 뿐이므로, consumer의 업무 멱등성을 대신하지 않는다.
- **그룹 선택**: EventBridge rule target의 `MessageGroupId`는 정적 문자열 또는 원본 이벤트를 가리키는 전체 JSONPath를 받을 수 있다. `orders`처럼 고정하면 하나의 순서 lane으로 직렬화되고, `$.detail.orderId`처럼 지정하면 주문별 순서와 병렬성을 함께 얻는다. 동적 값은 input transformer 결과가 아니라 원본 이벤트에 있어야 한다.
- **전달 실패 관측**: `FailedInvocations`, `InvocationsSentToDlq`, `InvocationsFailedToBeSentToDlq`에 알람을 걸고 타겟 DLQ의 `ERROR_CODE`를 확인한다.

## 본인이 직접 수행한 경험을 공개 가능한 범위로 일반화한 사례 — 실패 성격별로 DLQ 정책을 나눈 비동기 업무

비동기 업무를 운영하면서 DLQ를 모든 큐에 같은 정책으로 두지 않았다. 전제는 하나다. 재시도로 나아지는 실패만 재시도한다.

- **보상이 필요한 실패**: 실패 메시지를 감지하면 현재 상태를 확인하고 보상 동작을 시도한다. 보상에 실패하면 수동 처리로 넘긴다. 앞 단계가 이미 커밋됐다면 단순 재시도보다 보상 설계가 필요하다.
- **영구 오류와 일시 오류 분기**: 잘못된 입력처럼 결과가 바뀌지 않는 영구 오류는 재시도 없이 실패 처리한다. 분류가 불확실하거나 외부 상태가 바뀔 수 있으면 영구 오류로 폐기하지 않고 검토 큐와 재처리 절차로 보낸다. 네트워크 오류와 서버 부하는 점진 재시도로 회복을 기다린다.
- **일시 오류 위주 전달**: 문서나 알림처럼 일시 장애 비중이 높은 전달은 점진 재시도를 사용하고, 최종 실패에서만 긴급 대응으로 넘긴다.

같은 업무 흐름에서 나온 큐라도 실패의 회복 가능성이 달라 정책을 달리했다. 영구 오류를 재시도하면 DLQ가 무의미한 재시도 기록으로 차고, 보상이 필요한 실패를 그냥 재시도하면 데이터가 어긋난 채 남는다. 그 결과 실패 처리와 수동 개입의 경계가 명확해졌다. 재시도 횟수와 DLQ 알림은 실제 실패율과 처리 역량에 맞춰 계속 조정한다. 브로커 선택 근거는 [[Messaging-Broker-Comparison|메시지 브로커 비교]], 오류 분류 일반론은 [[Event-Driven-Patterns|이벤트 드리븐 실전 패턴]].

## 출처

- [Amazon EventBridge API Reference, Target](https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_Target.html)
- [Amazon EventBridge, Event bus targets](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-targets.html)
- [Amazon EventBridge, Monitoring Amazon EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring.html)
- [Amazon EventBridge, Delivery level for AWS service events](https://docs.aws.amazon.com/eventbridge/latest/ref/event-delivery-level.html)
- [Amazon EventBridge, How EventBridge retries delivering events](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-retry-policy.html)
- [Amazon EventBridge, Using dead-letter queues to process undelivered events](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html)
- [AWS Prescriptive Guidance, Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [AWS Lambda, Handling errors for an SQS event source](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html)
- [AWS CDK API Reference, SqsQueueProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events_targets.SqsQueueProps.html)

## 관련 문서

- [[EventBridge|Amazon EventBridge]]
- [[EventBridge-Event-Patterns|이벤트 패턴 매칭]]
- [[SQS|SQS]]
- [[Delivery-Semantics|전달 보장]]
- [[Transactional-Outbox|Transactional Outbox]]
