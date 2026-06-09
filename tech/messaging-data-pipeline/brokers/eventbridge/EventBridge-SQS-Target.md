---
tags: [messaging, aws, eventbridge, sqs, event-driven]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["EventBridge SQS Target", "EventBridge to SQS", "EventBridge SQS 패턴"]
---

# EventBridge → SQS 타겟 패턴

> 상위 문서: [[EventBridge|Amazon EventBridge]]

규칙의 타겟을 SQS 큐로 두는 구성. 이벤트 기반 아키텍처에서 가장 자주 쓰는 조합이다. EventBridge가 라우팅과 필터링을, SQS가 버퍼링과 속도 조절을 맡는다.

## 왜 SQS를 타겟으로 두나

Lambda로 바로 push해도 되지만, 중간에 SQS를 끼우면 **버퍼와 디커플링**이 생긴다.

- **내구성**: 컨슈머가 죽어 있어도 메시지가 큐에 남는다. 직접 Lambda 호출은 실패 시 재시도 후 유실 위험.
- **백프레셔와 속도 평탄화**: 이벤트가 폭주해도 컨슈머가 자기 페이스로 pull. Lambda 동시성 폭발 방지.
- **배치 처리**: 컨슈머가 여러 메시지를 묶어 처리.
- **실패 처리 일원화**: 큐 레벨에서 재시도와 DLQ.
- **순서가 필요하면 FIFO 큐**: EventBridge 자체는 순서 보장이 없으니 여기서 보완.

## 함정 1: SQS 리소스 정책 (제일 자주 빠뜨림)

SQS 큐에 "EventBridge가 메시지 보내도 된다"는 **리소스 기반 정책**을 안 붙이면, EventBridge가 **조용히 전달 실패**한다. 에러도 안 뜨고 메시지만 안 와서 한참 헤맨다.

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

## CDK는 정책을 자동으로 붙인다

`addTarget` 한 줄이 큐의 SendMessage 권한 정책까지 자동 처리하므로 위 함정을 피한다.

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

## 베스트 프랙티스

- **멱등성 필수**: EventBridge는 at-least-once라 같은 이벤트가 2번 올 수 있다. orderId 같은 키로 중복 차단.
- **DLQ를 2단으로**: ① EventBridge → SQS **전달 실패용** DLQ(타겟 설정), ② SQS 컨슈머 **처리 실패용** DLQ(큐의 redrivePolicy). 둘은 다른 것.
- **Visibility timeout**: Lambda 트리거면 함수 타임아웃의 **최소 6배** 권장.
- **FIFO 큐**: EventBridge가 dedup ID를 넣어주지 않으므로 타겟 FIFO 큐에 **content-based deduplication**을 켜야 한다. 안 켜면 전달이 거부된다.

## 관련 문서

- [[EventBridge|Amazon EventBridge]]
- [[EventBridge-Event-Patterns|이벤트 패턴 매칭]]
- [[SQS|SQS]]
- [[Delivery-Semantics|전달 보장]]
- [[Transactional-Outbox|Transactional Outbox]]
</content>
