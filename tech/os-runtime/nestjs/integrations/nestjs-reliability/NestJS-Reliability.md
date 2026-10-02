---
tags: [nestjs, reliability]
status: index
category: "OS & Runtime - NestJS"
aliases: ["NestJS 신뢰성"]
---

# NestJS 신뢰성

요청 재실행, 외부 의존성 장애, DB와 메시지 발행, 인스턴스 간 작업 소유권은 서로 다른 실패 경계를 다룬다.

- [[NestJS-Resilience|timeout, retry, breaker와 bulkhead의 실행 계약]]
- [[NestJS-Idempotency|요청 키, 결과 재생과 shared store]]
- [[NestJS-Outbox|업무 transaction, relay와 consumer inbox]]
- [[NestJS-Distributed-Locks|lease, scheduled job, leader election과 fencing]]

요청 키가 중복 효과를 막는 범위, 외부 provider가 이미 수행한 효과, outbox의 전달 보장과 resource의 stale-write 방어를 각각 설계한다.

- [[NestJS-Workflows|durable workflow, replay, compensation과 schedule]]

## 관련 문서

- [[NestJS-Events-and-Jobs]]
- [[NestJS-Security]]
