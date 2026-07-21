---
tags: [messaging, aws, amazon-mq, rabbitmq, activemq, broker]
status: done
category: "Messaging - Brokers"
aliases: ["Amazon MQ", "ActiveMQ", "RabbitMQ on AWS"]
verified_at: 2026-07-21
---

# Amazon MQ

Apache ActiveMQ Classic과 RabbitMQ용 **AWS 관리형 메시지 브로커**. 브로커의 설치, 운영, 유지보수 일부를 AWS가 관리하면서 각 엔진과 버전이 지원하는 표준 메시징 프로토콜로 접속한다.

## 핵심

- 매니지드 ActiveMQ / RabbitMQ
- **표준 프로토콜** 지원. ActiveMQ는 OpenWire, AMQP, STOMP, MQTT, WebSocket 등을 지원하고 RabbitMQ는 엔진 버전에 따라 AMQP 0-9-1, AMQP 1.0 등을 지원하므로 생성 전 호환표 확인
- SQS, SNS의 AWS API와 달리 기존 ActiveMQ, RabbitMQ 클라이언트를 재사용할 수 있다. 다만 엔드포인트, TLS, 인증, 지원 엔진 버전과 브로커 설정 차이는 마이그레이션 시 검증해야 함

## SQS, SNS와 차이

| 측면 | Amazon MQ | SQS / SNS |
|------|-----------|-----------|
| 프로토콜 | 엔진, 버전별 표준 프로토콜 | AWS API |
| 확장성 | 선택한 브로커 인스턴스, 엔진 토폴로지와 리소스 한계 적용 | 자동 확장되는 고처리량 서비스. SQS에는 메시지와 in-flight 할당량이 있고 SQS/SNS 모두 API와 리전별 서비스 할당량을 확인 |
| HA | ActiveMQ active/standby, RabbitMQ 다중 AZ 클러스터 등 배포 옵션을 선택하고 AWS가 기반 운영 | 서비스가 가용성을 관리하며 큐, 토픽 설계와 리전 장애 대응은 사용자가 결정 |
| 사용처 | 기존 ActiveMQ, RabbitMQ 호환성과 브로커 기능이 중요할 때 | AWS 네이티브 큐와 pub/sub를 새로 설계할 때 |

## 시험 빈출 포인트

- "**기존 RabbitMQ/ActiveMQ 워크로드를 AWS로 마이그레이션**" → Amazon MQ가 우선 후보
- "**엔진이 지원하는 표준 프로토콜과 브로커 기능 유지**" → Amazon MQ
- "운영할 브로커 토폴로지 없이 높은 처리량의 큐나 pub/sub 필요" → SQS/SNS를 우선 비교
- 신규 AWS 네이티브 설계라도 순서, 전달 의미, 프로토콜 호환성과 라우팅 요구사항을 비교해 결정

## 관련 문서

- [[SQS]], [[SNS]], [[브로커(Brokers)]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
- [AWS Amazon MQ 개요](https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/welcome.html)
- [AWS Amazon MQ for RabbitMQ 지원 프로토콜](https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-supported-protocols.html)
- [AWS SQS 큐 유형과 처리량 특성](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-types.html)
