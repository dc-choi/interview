---
tags: [nestjs, event-emitter, queue, cron, background-job]
status: index
category: "OS & Runtime - NestJS"
aliases: ["NestJS Events and Jobs", "NestJS 이벤트와 잡"]
---

# NestJS 이벤트와 잡

요청-응답 흐름 밖에서 트리거되는 실행을 NestJS 모듈에 얹는 통합을 모은다. 인프로세스 이벤트, Redis 잡 큐, 선언적 크론은 호출자와 실행을 분리하는 대신 유실, 중복 실행, 실패 감지를 각자 책임져야 한다.

- [[NestJS-Events|Events]]: @nestjs/event-emitter — 발행과 구독, 리스너 에러 억제 기본값, 부트스트랩 전 발행 유실, 인프로세스 경계
- [[NestJS-Queues|Queues]]: @nestjs/bullmq — 잡 옵션과 재시도, WorkerHost 컨슈머, 큐 이벤트 리스너, 분리 프로세스 워커
- [[NestJS-Task-Scheduling|Task Scheduling]]: @nestjs/schedule — 6필드 크론과 옵션, @Interval과 @Timeout, SchedulerRegistry 동적 API, 멀티 인스턴스 중복 실행

## 함께 볼 문서

- [[integrations|NestJS 통합]]
