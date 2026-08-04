---
tags: [architecture, design-pattern, behavioral, publish-subscribe]
status: done
verified_at: 2026-08-04
category: "Architecture & Design"
aliases: ["Publisher-Subscriber Pattern", "Publish-Subscribe", "발행-구독 패턴"]
---

# Publisher-Subscriber 패턴이란?

Publisher-Subscriber는 발행자가 메시지를 Topic이나 Channel에 보내고 중간 Broker가 관심 있는 구독자에게 전달하는 메시징 패턴이다. 발행자와 구독자는 서로의 주소와 수명을 직접 알지 않는다.

## Observer와 구분

| 관점 | Observer | Publisher-Subscriber |
|---|---|---|
| 중개자 | Subject가 목록을 직접 관리 | Broker, Topic이나 Event Bus가 중개 |
| 결합 | 객체 참조와 구독 계약 | 메시지 스키마와 채널 이름 |
| 범위 | 주로 인프로세스 | 인프로세스 또는 분산 시스템 |
| 전달 보장 | 호출 방식에 좌우 | 브로커 정책에 좌우 |

## 백엔드 설계 체크포인트

- 이벤트 이름, 버전과 payload 호환성
- at-most-once, at-least-once 같은 전달 의미
- 중복 소비를 견디는 멱등성
- 구독자 실패 시 재시도, DLQ와 관측성
- 같은 키에 대한 순서 보장 범위
- 생산자 DB 변경과 발행 사이의 원자성

패턴을 사용한다고 비동기, 영속 전달이나 정확히 한 번 처리가 자동으로 보장되지는 않는다. 구체 Broker와 소비자 구현의 계약을 확인한다. DB 상태 변경과 이벤트 발행을 일관되게 묶어야 하면 Transactional Outbox를 검토한다.

NestJS EventEmitter는 프로세스 내부의 느슨한 결합에는 유용하지만 별도 Broker의 내구성 보장을 대신하지 않는다.

## 출처

- 얄팍한 코딩사전, [Publisher-Subscriber 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=246916)
- [Enterprise Integration Patterns, Publish-Subscribe Channel](https://www.enterpriseintegrationpatterns.com/patterns/messaging/PublishSubscribeChannel.html)
- [NestJS 공식 문서, Events](https://docs.nestjs.com/techniques/events)

## 관련 문서

- [[Observer패턴이란|Observer 패턴]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Saga-Pattern|Saga 패턴]]
