---
tags: [messaging]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Messaging Patterns", "메시징 패턴"]
---

# 메시징 패턴 (Messaging Patterns)

분산 시스템에서 컴포넌트 간 통신을 위한 세 가지 핵심 패턴

## 메시지 유형

| 유형 | 목적 | 예시 |
|------|------|------|
| Command | 특정 동작 실행 요청 | RPC 호출, HTTP 요청 |
| Event | 발생한 사실 알림 | 결제 완료, 사용자 가입 |
| Document | 데이터 전달 (실행 지시 없음) | 쿼리 결과, 리포트 |

## 전달 방식

| 방식 | 장점 | 단점 |
|------|------|------|
| P2P (Peer-to-Peer) | 단일 장애점 없음, 낮은 지연 | 복잡한 구현, 직접 연결 관리 |
| Broker 기반 | 발신/수신 분리, 메시지 영속성, 고급 라우팅 | 인프라 오버헤드, 브로커 장애 위험 |

## 1. Pub/Sub (발행/구독)

분산 Observer 패턴. 발행자가 메시지를 브로드캐스트하고, 관심 있는 구독자만 수신한다.

특징:
- 발행자는 구독자를 알 필요 없음 (느슨한 결합)
- 토픽/채널 기반 메시지 분류
- Fan-out: 하나의 메시지가 모든 구독자에게 전달
- 구독자가 사전에 등록되어 있어야 수신 가능

적합한 경우: 이벤트 전파, 실시간 알림, 로그 수집, 캐시 무효화

## 2. Task Distribution (작업 분배)

작업을 경쟁 소비자(competing consumers)에게 분배하여 병렬 처리한다.

특징:
- 각 메시지는 하나의 소비자만 처리 (Pub/Sub과 다름)
- 로드 밸런싱: 라운드 로빈 또는 최소 부하 할당
- Fanout/Fanin: 여러 단계의 파이프라인 처리
- ACK 기반 처리 확인으로 메시지 유실 방지

적합한 경우: 이미지 처리, 이메일 발송, 데이터 변환, 배치 작업

## 3. Request/Reply (요청/응답)

비동기 채널 위에 동기적 요청-응답 추상화를 구현한다.

특징:
- Correlation ID: 요청과 응답을 매칭하는 고유 식별자
- Return Address: 응답을 보낼 큐/채널 지정
- 타임아웃: 응답 대기 시간 제한으로 무한 블로킹 방지
- 순서 비보장: 응답이 요청 순서대로 오지 않을 수 있음

적합한 경우: 마이크로서비스 간 RPC, API Gateway, 동기 워크플로우

## 기술별 패턴 지원

| 기술 | Pub/Sub | Task Distribution | Request/Reply |
|------|---------|-------------------|---------------|
| Redis Pub/Sub | 최적 (비영속) | 미지원 | 구현 가능 |
| Redis Streams | 소비자 그룹 | 소비자 그룹 | 구현 가능 |
| Kafka | 토픽 기반 | 소비자 그룹 | 구현 가능 |
| RabbitMQ | Exchange | Work Queue | Reply Queue |
| ZeroMQ | PUB/SUB 소켓 | PUSH/PULL 소켓 | REQ/REP 소켓 |
| BullMQ | 미지원 | Job Queue | Job 결과 반환 |

## 패턴 선택 가이드
- 알림/이벤트 전파 → Pub/Sub
- 병렬 작업 분배 → Task Distribution
- 응답이 필요한 호출 → Request/Reply
- 대규모 스트림 처리 → Kafka + Consumer Group

## 관련 문서
- [[Delivery-Semantics|전달 보장]]
- [[Consumer-Group|소비자 그룹]]
- [[MQ-Kafka|Kafka]]
- [[Redis|Redis Messaging]]
