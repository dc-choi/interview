---
tags: [messaging, aws, amazon-mq, rabbitmq, activemq, broker]
status: done
category: "Messaging - Brokers"
aliases: ["Amazon MQ", "ActiveMQ", "RabbitMQ on AWS"]
---

# Amazon MQ

ActiveMQ·RabbitMQ용 **AWS 관리형 메시지 브로커**. 온프레미스 기술인 RabbitMQ·ActiveMQ를 **개방형 프로토콜** 액세스로 제공.

## 핵심

- 매니지드 ActiveMQ / RabbitMQ
- **개방형 표준 프로토콜** 지원: AMQP, MQTT, STOMP, OpenWire, WebSocket
- SQS·SNS의 AWS 독점 API와 달리 **표준 프로토콜 호환** — 온프레미스 코드를 그대로 들고 옴

## SQS·SNS와 차이

| 측면 | Amazon MQ | SQS / SNS |
|------|-----------|-----------|
| 프로토콜 | 표준 (AMQP, MQTT…) | AWS 독점 API |
| 확장성 | **제한적** (브로커 인스턴스 운영) | **무제한** |
| HA | Active/Standby 또는 클러스터 (수동 구성) | 완전 매니지드·자동 |
| 사용처 | **온프레미스 → AWS 마이그레이션** (코드 그대로) | AWS 네이티브 신규 설계 |

## 시험 빈출 포인트

- "**기존 RabbitMQ/ActiveMQ 워크로드를 AWS로 마이그레이션**" → Amazon MQ
- "**AMQP/MQTT 표준 프로토콜**" → Amazon MQ
- "무한 확장이 필요" → SQS/SNS (Amazon MQ 아님)
- "신규 클라우드 네이티브 설계" → SQS/SNS

## 관련 문서

- [[SQS]] · [[SNS]] · [[브로커(Brokers)]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
