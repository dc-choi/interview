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
| 스케일링 | 메시지 양 따라 자동, **scale-to-zero**(유휴 0원) | Task 수를 직접 오토스케일(backlog-per-task). 컨테이너 시작 지연, scale-to-zero 까다로움 |
| 실행 시간 | **최대 15분** | 무제한 (수 시간 작업 OK) |
| 콜드 스타트 | 있음. NestJS DI 부팅 + Prisma 엔진 로딩으로 더 아픔 | 떠 있으면 콜드 스타트 없음, 첫 메시지부터 저지연 |
| 비용 | invocation + GB초. 간헐적이면 압도적으로 쌈 | task 떠있는 시간만큼. 꾸준한 고처리량이면 더 쌈(EC2 Spot 더↓) |
| DB 커넥션 | 인스턴스마다 커넥션 → 스케일아웃 시 RDS 고갈 위험 | task 수 × 풀로 총 커넥션 정밀 제어 |
| 코드 재사용 | 가벼운 핸들러에 적합. 무거운 도메인은 궁합 X | 기존 NestJS 모듈, DI, Prisma, 도메인 서비스 그대로 재사용 |
| 운영 부담 | 패치, 스케일, 가용성 모두 AWS. 거의 0 | task 정의, 오토스케일 정책, 헬스체크, 배포, ECR 이미지 관리 |

## Prisma/RDS 커넥션이 갈림길이 되는 이유

실무에서 가장 자주 간과되는 축이다.

- **Lambda**: 인스턴스마다 자기 커넥션을 연다. 분당 300개씩 스케일아웃하면 순식간에 **RDS 커넥션을 고갈**시킨다(Lambda + Prisma + RDS의 고전적 사고). 막으려면 **RDS Proxy**를 끼우거나 maximum concurrency로 빡세게 제한.
- **ECS**: `task 5개 × 풀 10 = 최대 50 커넥션`처럼 총량이 **예측 가능**. 백프레셔도 동시 처리 개수(`Promise.all` 묶음)로 직관적으로 조절. 다운스트림 보호는 명백히 ECS가 쉽다.

## NestJS 워커 컨슈머 골격

직접 제어 + graceful shutdown + 도메인 서비스 재사용이 핵심.

```typescript
import { Injectable, OnApplicationShutdown, Logger } from '@nestjs/common';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, Message } from '@aws-sdk/client-sqs';

@Injectable()
export class OrderConsumer implements OnApplicationShutdown {
  private readonly sqs = new SQSClient({ region: 'ap-northeast-2' });
  private readonly queueUrl = process.env.QUEUE_URL!;
  private running = true;
  private inFlight = 0;

  async start() {
    while (this.running) {
      const { Messages } = await this.sqs.send(new ReceiveMessageCommand({
        QueueUrl: this.queueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 20, // long polling
      }));
      if (!Messages?.length) continue;
      await Promise.all(Messages.map((m) => this.handle(m))); // task당 동시 처리 = 백프레셔
    }
  }

  private async handle(message: Message) {
    this.inFlight++;
    try {
      await this.orderService.process(JSON.parse(message.Body!)); // 도메인 서비스 재사용
      await this.sqs.send(new DeleteMessageCommand({              // 성공해야만 삭제
        QueueUrl: this.queueUrl, ReceiptHandle: message.ReceiptHandle!,
      }));
    } catch (e) {
      this.logger.error(e); // 삭제 안 함 → SQS가 재시도, 결국 DLQ
    } finally { this.inFlight--; }
  }

  async onApplicationShutdown() { // SIGTERM(배포, 스케일인) → graceful
    this.running = false;
    while (this.inFlight > 0) await new Promise((r) => setTimeout(r, 200)); // in-flight 소진 대기
  }
}
```

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

- [Amazon SQS event source for Lambda — AWS 공식 문서](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
</content>
