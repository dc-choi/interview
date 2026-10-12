---
tags: [messaging, aws, sqs, lambda, ecs, architecture]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["SQS Consumer Lambda vs ECS", "Lambda vs ECS 워커", "SQS 컨슈머 선택"]
---

# SQS 컨슈머 선택: Lambda vs ECS 워커

> 상위 문서: [[SQS|Amazon SQS]]

같은 SQS 메시지를 소비해도 **Lambda Event Source Mapping**과 **NestJS 앱을 띄운 ECS 워커**는 운영 철학이 완전히 다르다. 축별 트레이드오프로 가른다. (Lambda 폴러 내부 동작은 [[SQS-Lambda-ESM|ESM 문서]].)

## 축별 비교

| 축 | Lambda (ESM) | ECS 워커 (NestJS) |
|---|---|---|
| 제어권 | ESM이 폴링, 배치, 삭제를 위임 처리. 1건 처리 로직만 | Receive long-polling 루프와 Delete를 직접. 프리페치, 동시성, 백프레셔, 종료까지 손안 |
| 스케일링 | 메시지 양 따라 자동, Lambda compute는 **scale-to-zero** | Task 수를 직접 오토스케일(backlog-per-task). 컨테이너 시작 지연, scale-to-zero 까다로움 |
| 실행 시간 | 호출당 **최대 15분** | 호출당 플랫폼 상한은 없지만 task lifecycle과 배포 종료 예산은 있음 |
| 콜드 스타트 | 있음. NestJS DI 부팅 + Prisma 엔진 로딩으로 더 아픔 | 떠 있으면 콜드 스타트 없음, 첫 메시지부터 저지연 |
| 비용 | invocation + GB초. 간헐적 workload에 유리할 수 있음 | task 실행 시간 과금. 꾸준한 고처리량에 유리할 수 있음(EC2 Spot 선택 가능) |
| DB 커넥션 | 인스턴스마다 커넥션 → 스케일아웃 시 RDS 고갈 위험 | task 수 × 풀로 총 커넥션 정밀 제어 |
| 코드 재사용 | 가벼운 핸들러에 적합. NestJS 모듈도 쓸 수 있지만 package 크기, cold start와 connection 비용을 확인 | 기존 NestJS 모듈, DI, Prisma, 도메인 서비스 그대로 재사용 |
| 운영 부담 | 인프라 부담은 낮지만 IAM, ESM 동시성, DLQ, alarm과 실패 처리는 필요 | task 정의, 오토스케일 정책, 헬스체크, 배포, ECR 이미지 관리 |

## 비동기 추론은 응답 기한과 처리량으로 고른다

입력 업로드와 모델 추론을 큐로 분리하면 API 응답과 분석 결과의 준비 시점이 달라진다. 다음은 2026-10-13 AWS의 SQS Standard와 ECS 큐 기반 확장 문서를 대조해 정리한 설계 점검이다. 기존 코드 예제와 비교표 전체의 재검증은 아니다.

- **순서와 중복:** Standard 큐는 중복 전달과 순서 역전을 허용한다. 분석 조각이 독립적인지 확인하고, 결과 저장에는 입력 식별자와 모델 버전 등을 이용한 멱등 처리를 검토한다. 이전 조각의 상태가 필요한 추론이라면 순서 제어를 별도로 설계한다.
- **대기시간 예산:** ECS의 backlog per task는 대기 메시지 수를 실행 중 task 수로 나눈 값이다. task가 한 번에 한 메시지를 처리한다는 전제에서는 허용 큐 대기시간을 평균 처리시간으로 나눈 값을 목표의 출발점으로 삼을 수 있다. 예를 들어 10초와 0.5초라면 task당 20건이다. 이는 지연 보장이 아니며 배치 크기와 동시성이 다르면 실측 처리량으로 보정한다.
- **모델 준비 비용:** 컨테이너가 실행 중이어도 모델 로딩이 끝났는지 확인한다. 최소 용량과 확장 상한은 기동 지연, 입력 전송, 추론과 결과 저장을 포함한 전체 응답 기한으로 검증한다. Lambda와 ECS 모두 실제 workload로 비교한다.
- **축소 중 작업:** 처리 중 task가 종료될 수 있으므로 재처리와 결과 중복을 시험한다. ECS task scale-in protection은 작업 중 축소를 막는 수단이지만, 멱등 처리와 실패 복구를 대신하지 않는다.

추론 시간 단축과 사용자에게 결과가 도착하는 시간 단축은 같은 측정치가 아니다. 확장 정책과 0개 task에서의 재기동 조건은 [[ECS-Service-AutoScaling|ECS 워커 오토스케일링]]에서 함께 확인한다.

## Prisma/RDS 커넥션이 갈림길이 되는 이유

실무에서 가장 자주 간과되는 축이다.

- **Lambda**: 인스턴스마다 자기 커넥션을 연다. 분당 300개씩 스케일아웃하면 순식간에 **RDS 커넥션을 고갈**시킨다(Lambda + Prisma + RDS의 고전적 사고). 막으려면 **RDS Proxy**를 끼우거나 maximum concurrency로 빡세게 제한.
- **ECS**: `task 5개 × 풀 10 = 최대 50 커넥션`처럼 오토스케일 상한 안에서 총량을 예측할 수 있다. 백프레셔도 동시 처리 개수(`Promise.all` 묶음)로 직접 조절한다. Lambda도 ESM maximum concurrency, reserved concurrency와 RDS Proxy로 제한할 수 있으므로, 핵심 차이는 제어 수단과 운영 방식이다.

## NestJS 워커 컨슈머 골격

직접 제어 + graceful shutdown + 도메인 서비스 재사용이 핵심.

```typescript
import { Injectable, OnApplicationShutdown, Logger } from '@nestjs/common';
import { SQSClient, ReceiveMessageCommand, ChangeMessageVisibilityCommand, DeleteMessageCommand, Message } from '@aws-sdk/client-sqs';
import { setTimeout as delay } from 'node:timers/promises';

@Injectable()
export class OrderConsumer implements OnApplicationShutdown {
  private readonly sqs = new SQSClient({ region: 'ap-northeast-2' });
  private readonly logger = new Logger(OrderConsumer.name);
  private readonly queueUrl = process.env.QUEUE_URL!;
  private readonly receiveAbort = new AbortController();
  private receiveLoop?: Promise<void>;

  constructor(private readonly orderService: OrderService) {}

  start() {
    if (this.receiveLoop) return;
    this.receiveLoop = this.poll();
    void this.receiveLoop.catch((error) => this.logger.error(error));
  }

  private async poll() {
    let consecutiveReceiveFailures = 0;
    while (!this.receiveAbort.signal.aborted) {
      const receiveStartedAt = Date.now();
      let Messages: Message[] | undefined;
      try {
        ({ Messages } = await this.sqs.send(new ReceiveMessageCommand({
          QueueUrl: this.queueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 20, // long polling
        }), { abortSignal: this.receiveAbort.signal }));
      } catch (error) {
        if (this.receiveAbort.signal.aborted) return;
        consecutiveReceiveFailures++;
        const ceilingMs = Math.min(30_000, 500 * 2 ** Math.min(consecutiveReceiveFailures - 1, 6));
        this.logger.error(error);
        try {
          await delay(Math.random() * ceilingMs, undefined, { signal: this.receiveAbort.signal });
        } catch (delayError) {
          if (this.receiveAbort.signal.aborted) return;
          throw delayError;
        }
        continue;
      }
      consecutiveReceiveFailures = 0;
      if (this.receiveAbort.signal.aborted) return;
      if (!Messages?.length) continue;
      await Promise.all(Messages.map((m) => this.handle(m, receiveStartedAt))); // task당 동시 처리 = 백프레셔
    }
  }

  private async handle(message: Message, receiveStartedAt: number) {
    try {
      const result = await this.orderService.process(JSON.parse(message.Body!));
      if (result.kind === 'BUSY') {
        const seconds = Math.max(1, Math.ceil((result.deferUntil.getTime() - Date.now()) / 1000));
        const elapsed = Math.ceil((Date.now() - receiveStartedAt) / 1000);
        const remainingLimit = Math.max(0, 43200 - elapsed - 1);
        if (remainingLimit > 0) {
          await this.sqs.send(new ChangeMessageVisibilityCommand({
            QueueUrl: this.queueUrl, ReceiptHandle: message.ReceiptHandle!, VisibilityTimeout: Math.min(remainingLimit, seconds),
          }));
        }
        return; // 다른 owner의 lease가 끝나기 전에는 다시 받지 않고, 삭제도 하지 않음
      }
      await this.sqs.send(new DeleteMessageCommand({              // 성공해야만 삭제
        QueueUrl: this.queueUrl, ReceiptHandle: message.ReceiptHandle!,
      }));
    } catch (e) {
      this.logger.error(e); // 삭제 안 함 → SQS가 재시도, 결국 DLQ
    }
  }

  async onApplicationShutdown() { // SIGTERM(배포, 스케일인) → graceful
    this.receiveAbort.abort();
    let deadline: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.receiveLoop ?? Promise.resolve(),
        new Promise<never>((_, reject) => {
          deadline = setTimeout(() => reject(new Error('SQS consumer drain timed out')), 25_000);
          deadline.unref();
        }),
      ]);
    } finally {
      if (deadline) clearTimeout(deadline);
      this.sqs.destroy();
    }
  }
}
```

수신 오류는 루프 안에서 full jitter 지수 백오프로 다시 시도하고, 대기 상한은 30초로 제한한다. 종료 시에는 같은 `AbortSignal`로 백오프와 long poll을 먼저 중단하고 `receiveLoop`를 기다린다. 루프가 현재 배치의 `Promise.all`까지 포함하므로 이미 시작한 handler도 함께 drain된다. 25초 안에 끝나지 않으면 hook을 실패시켜 상위 프로세스의 전체 종료 제한이 강제 종료를 맡게 한다.

`orderService.process()`의 반환 계약도 ACK의 일부다. 새로 `COMPLETED`가 됐거나 이미 `COMPLETED`인 경우만 `ACK`, 다른 owner의 신선한 `PROCESSING`은 남은 lease와 jitter가 반영된 `deferUntil`을 포함한 `BUSY`를 반환한다. 컨슈머는 `BUSY`면 visibility만 연장하고 삭제하지 않는다. 연장값은 `ReceiveMessage` 요청 직전부터 흐른 시간을 12시간에서 빼고 1초 여유를 둔 남은 한도 이하로 제한한다. 더 긴 lease는 다음 수신에서 다시 미루며, 그 수신도 `maxReceiveCount` 예산에 포함한다. 상세 상태 전이는 [[At-Least-Once|At-Least-Once]]를 따른다.

배치, visibility 연장, 에러 처리를 직접 짜기 싫으면 `sqs-consumer`(BBC)를 NestJS 서비스로 감싸는 패턴도 흔하다. 다만 NestJS 래퍼들은 유지보수 상태가 들쭉날쭉하니 최근 커밋과 버전 호환을 확인하고 도입한다.

## 언제 무엇을

- **Lambda 유리**: 트래픽이 간헐적이거나 스파이키, 처리 15분 이내, 가벼운 변환과 팬아웃, 운영 최소화와 scale-to-zero 비용 절감, 빠른 출시.
- **ECS(NestJS 워커) 유리**: 처리 15분 초과나 대용량, 꾸준한 고처리량, 기존 NestJS 도메인 재사용, RDS 커넥션 정밀 제어(Prisma), 콜드 스타트 못 견디는 저지연, 세밀한 백프레셔.
- **현실은 하이브리드**: 가볍고 간헐적인 처리(알림, 썸네일)는 Lambda, 도메인이 무겁고 트래픽 꾸준하고 DB를 많이 두드리는 핵심 처리는 ECS 워커. NestJS와 Prisma 자산이 있으면 무거운 컨슈머는 ECS가 코드 재사용과 커넥션 제어에서 자연스럽다.

## 관련 문서

- [[SQS|Amazon SQS]]
- [[SQS-Lambda-ESM|SQS → Lambda 폴링 (ESM)]]
- [[ECS-Service-AutoScaling|ECS 워커 오토스케일링 (backlog-per-task)]]
- [[MQ-Kafka-Consumer|Kafka 컨슈머 구현]]

## 출처

- [AWS 공식 문서, Scale Amazon ECS services based on an Amazon SQS queue](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-autoscaling-queue.html) — 2026-10-13 backlog per task, 허용 대기시간과 축소 중 작업 보호 대조
- [AWS 공식 문서, Amazon SQS standard queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html) — 2026-10-13 중복 전달과 순서 역전, 요청과 백그라운드 작업의 분리 대조
- [AWS 공식 문서, Amazon SQS event source for Lambda](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
- [AWS 공식 문서, Lambda timeout](https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html)
- [AWS 공식 문서, SQS event source mapping 구성과 maximum concurrency](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html)
- [AWS SDK for JavaScript v3, AbortController](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/introduction/)
