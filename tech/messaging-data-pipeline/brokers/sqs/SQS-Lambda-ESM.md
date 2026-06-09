---
tags: [messaging, aws, sqs, lambda, event-source-mapping]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["SQS Lambda ESM", "Event Source Mapping", "Lambda SQS 폴링"]
---

# SQS → Lambda 폴링 (Event Source Mapping)

> 상위 문서: [[SQS|Amazon SQS]]

SQS를 Lambda 트리거로 연결하면 `ReceiveMessage`와 `DeleteMessage`를 직접 짜지 않는다. **Event Source Mapping(ESM)** 이라는, 함수 코드도 VPC 안도 아닌 **Lambda 서비스가 관리하는 별도 폴러 컴포넌트**가 대신 폴링한다. 이 폴러가 어떻게 뜨고 스케일하는지가 운영 안정성의 핵심이다.

## ESM이 하는 일

- 큐를 **long polling**으로 계속 찔러본다
- 메시지를 배치로 묶어 함수를 invoke
- **성공하면** 그 메시지들을 `DeleteMessage`로 지운다
- **실패하면** 안 지운다 → visibility timeout 만료 후 다시 큐에 나타남

즉 **삭제 타이밍을 내가 제어하지 못한다**는 점이 모든 함정의 출발점이다.

## Standard 큐 스케일링 알고리즘

옛 자료의 "분당 60개씩, 최대 1,000"은 낡았다. 현재 기준:

- 메시지가 들어오면 **5개 배치를 5개 동시 invocation**으로 시작
- 메시지가 계속 있으면 **분당 최대 300개씩** 배치 처리 프로세스를 늘림
- ESM 하나가 동시에 처리하는 배치 최대치는 **1,000개**, 기본 동시 함수 인스턴스 최대 **1,250개**
- 트래픽이 줄면 5개로, 비용을 아끼려고 **최소 2개 배치까지** 내림 (빈 큐 long polling 요청 비용 절감)
- 단, **maximum concurrency를 켜면 이 최소-2-배치 최적화는 꺼진다**

## 가장 큰 함정: throttling이 멀쩡한 메시지를 DLQ로 보낸다

계정 동시성 쿼터(또는 reserved concurrency)가 꽉 차면, 폴러가 함수를 invoke하려다 **throttle**된다.

```
throttle → 배치 실패 → 메시지 안 지워짐 → ReceiveCount 증가
→ 반복되면 maxReceiveCount 초과 → "처리한 적도 없는" 메시지가 DLQ로 떨어짐
```

비즈니스 로직 에러가 아닌데 멀쩡한 메시지가 DLQ에 쌓인다. Lambda는 invocation 문제 시 스케일링을 backoff하지만, **그 backoff가 ReceiveCount 누적을 막아주지는 않는다.** 이를 막으려고 나온 기능이 maximum concurrency다.

## Maximum concurrency vs Reserved concurrency

| 설정 | 레벨 | 의미 | 범위 |
|---|---|---|---|
| **Maximum concurrency** | ESM(이벤트 소스)별 | 이 큐가 띄울 동시 invocation 상한. 함수에 여러 SQS 소스가 붙으면 소스마다 따로 | 2 ~ 1,000 |
| **Reserved concurrency** | 함수별 | 이 함수에 보장(겸 상한)되는 동시성 | 0 ~ 계정 한도 |

**정석 조합: maximum concurrency를 reserved보다 낮게** 잡는다. 그래야 함수가 throttle되지 않아 위 가짜 DLQ 함정이 차단된다.

```bash
aws lambda create-event-source-mapping \
  --function-name my-consumer \
  --event-source-arn arn:aws:sqs:ap-northeast-2:123456789012:my-queue \
  --batch-size 10 \
  --scaling-config '{"MaximumConcurrency": 50}'
```

`MaximumConcurrency`를 켜는 순간 "최소 2배치 비용 최적화"는 꺼진다(트레이드오프).

## FIFO 폴링은 모델이 다르다: 동시성 = 활성 메시지 그룹 수

FIFO ESM은 **활성 MessageGroupId 수만큼만** 동시성으로 스케일한다. 그룹 종류가 곧 병렬성 상한이다(그룹 하나면 동시성 1).

- 같은 그룹 메시지는 순서대로 전달 (배치에 여러 그룹이 섞여도 그룹 내 순서 유지)
- 함수가 에러를 내면 그 그룹의 다음 메시지를 받기 전에 영향받은 메시지 재시도를 다 끝낸다 → **head-of-line blocking이 폴링 레벨에서 그대로 발생**
- "FIFO인데 동시성이 안 오른다"의 십중팔구 원인은 **메시지 그룹 종류가 적은 것**

## Provisioned Mode (전용 폴러)

기본 on-demand 스케일링은 분당 300개씩 늘어 스파이크 따라잡기에 지연이 있다. 이게 싫으면 **폴러를 미리 확보**하는 모드.

- 전용 event poller를 ESM에 붙여 **분당 최대 1,000 동시 invoke 오토스케일(약 3배 빠름), 최대 20,000 동시성(약 16배), 집계 2 GBps**까지
- `ProvisionedPollerConfig`로 폴러 min/max를 직접 지정
- sub-second 지연이 mission critical이거나 0에서 대량으로 튀는 스파이크가 잦을 때 고려, 평범한 비동기 처리면 기본 모드로 충분
- 따끈한 기능이라 정확한 필드와 한도는 도입 직전 최신 문서로 확인

## 실무 체크리스트

- visibility timeout은 함수 timeout의 **최소 6배**
- DLQ + 합리적인 `maxReceiveCount`(보통 3~5)
- **maximum concurrency를 reserved보다 낮게** → throttling발 가짜 DLQ 차단 (핵심 조합)
- **partial batch response**(`ReportBatchItemFailures`)로 배치 전체 재처리 방지
- BatchSize 기본 10, 배치 윈도우(`MaximumBatchingWindowInSeconds` 최대 300초) 쓰면 최대 10,000건(페이로드 6MB 상한)

## 관련 문서

- [[SQS|Amazon SQS]]
- [[SQS-Consumer-Lambda-vs-ECS|컨슈머 선택: Lambda vs ECS 워커]]
- [[Idempotency-Key|멱등성 키]]

## 출처

- [Amazon SQS event source for Lambda — AWS 공식 문서](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
</content>
