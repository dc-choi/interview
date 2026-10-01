---
tags: [messaging, rabbitmq, amqp, exchange, dlx, broker]
status: done
verified_at: 2026-10-01
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["RabbitMQ Exchange Routing", "RabbitMQ 라우팅", "AMQP 0-9-1 라우팅 모델", "Dead Letter Exchange", "DLX"]
---

# RabbitMQ Exchange 라우팅 (AMQP 0-9-1)

> 상위 인덱스: [[브로커(Brokers)|브로커]]

RabbitMQ에서 producer는 queue가 아니라 exchange에 발행하고, exchange가 binding 규칙으로 메시지를 넣을 queue를 고른다. 라우팅 결정이 broker 안에 있으므로 producer는 누가 받는지 몰라도 되고, 소비 측은 binding을 바꿔 받을 범위를 정한다. 브로커 간 비교와 운영 부담은 [[Messaging-Broker-Comparison|브로커 비교]], NestJS 전송 옵션(수동 ACK, prefetch, durable queue, 와일드카드)은 [[NestJS-Microservices]]에 있다. 버전 민감 내용은 RabbitMQ 4.3 문서 기준이다.

## 왜 broker로 비동기를 분리하나

- 주문, 결제, 배송, 메일이 한 흐름에서 동기로 강하게 묶여 있으면 트래픽이 몰릴 때 한 하위 시스템의 지연과 장애가 주문 응답까지 번진다.
- 업무 도메인 단위로 나누고 후속 작업을 메시지로 넘기면 호출자는 응답을 기다리지 않는다. 배송 처리가 실패해도 주문은 완료되고 실패는 배송 쪽에 격리되며, 바로 처리하지 못한 메시지는 queue에 남아 나중에 처리하거나 dead letter queue에서 보정한다.
- 분리 방법은 애플리케이션 안의 비동기 프로그래밍과 broker 같은 미들웨어 두 가지다. 소비자를 따로 배포하고 확장해야 하거나 프로세스가 죽어도 작업이 남아야 하면 broker가 맞다.
- AMQP 0-9-1은 규격을 따르는 client와 broker가 통신하는 개방형 메시징 프로토콜이고, exchange, queue, binding 같은 개체와 라우팅을 애플리케이션이 선언하는 모델이다. Kafka는 AMQP가 아닌 자체 binary protocol over TCP를 쓴다.

## 구성 요소와 흐름

| 요소 | 역할 |
|---|---|
| Producer | routing key와 header를 붙여 exchange에 발행 |
| Exchange | 자기 타입과 binding 규칙으로 메시지를 queue(또는 다른 exchange)로 라우팅 |
| Binding | exchange와 queue를 잇는 규칙. binding key나 header 조건을 가짐 |
| Queue | 메시지를 저장하고 consumer에 전달 |
| Consumer | queue를 구독해 처리하고 broker에 ACK를 보냄 |

exchange가 여러 queue로 라우팅하면 queue마다 사본이 생긴다. 한 queue를 여러 consumer가 구독하면 메시지 하나는 그중 한 consumer에게만 간다.

## Exchange 타입

| 타입 | 매칭 규칙 | 사전 선언 이름 | 고르는 상황 |
|---|---|---|---|
| Direct | binding key와 routing key가 정확히 같을 때 전달. 같은 key로 여러 queue를 묶으면 각 queue에 사본 | `""`(default exchange), `amq.direct` | 특정 queue로 보낼 때, 작업 종류별 분배 |
| Fanout | routing key를 무시하고 바인딩된 모든 queue에 사본 | `amq.fanout` | 브로드캐스트, 서비스별 후속 처리 |
| Topic | 점으로 구분한 단어 목록(최대 255바이트)인 routing key를 binding pattern과 비교. `*`는 정확히 한 단어, `#`는 0개 이상 단어 | `amq.topic` | 지역, 종류 같은 패턴으로 골라 구독 |
| Headers | routing key를 무시하고 header 값을 비교. binding 인자 `x-match`가 `all`이면 모두, `any`면 하나 이상 일치. `x-`로 시작하는 header는 `all-with-x`, `any-with-x`일 때만 비교 | `amq.match`(RabbitMQ는 `amq.headers`도) | 문자열 key로 표현하기 어려운 여러 속성 조합 |

exchange 타입은 메시지를 어느 queue에 넣을지만 정한다. 여러 queue에 사본을 넣으면 Pub/Sub이 되고, 한 queue에 consumer를 여럿 붙이면 exchange 타입과 무관하게 Task Distribution이 된다 ([[Messaging-Patterns|메시징 패턴]]).

### Default exchange

이름이 빈 문자열인 사전 선언 direct exchange다. queue를 선언하면 RabbitMQ가 queue 이름을 routing key로 삼아 이 exchange에 자동으로 binding하므로, queue 이름으로 발행하면 queue에 직접 넣는 것처럼 보인다. 이 exchange에는 binding을 추가하거나 해제할 수 없고 alternate exchange도 지원하지 않는다.

흔한 오해와 달리 exchange 타입을 정하지 않은 발행이 fanout으로 가지는 않는다. exchange 이름 없이 발행하면 이 direct default exchange로 가고, 직접 만드는 exchange는 선언할 때 타입을 명시한다. 별도 topology가 필요하면 default exchange에 기대지 말고 exchange를 따로 선언한다.

## 라우팅되지 않은 메시지

어느 binding과도 맞지 않으면 기본값(`mandatory=false`)에서는 메시지가 조용히 버려지고, alternate exchange가 있으면 그쪽으로 재발행된다. `mandatory=true`로 발행하면 publisher에게 반환되므로 반환 handler를 둬야 한다. routing key 오타나 binding 누락은 오류 없이 유실로 끝나므로 중요한 exchange에는 alternate exchange(policy로 지정 권장)나 mandatory 발행을 두고, unroutable dropped와 returned 지표를 감시한다. Kafka의 자동 토픽 생성 오타와 같은 종류의 조용한 실패다 ([[Kafka-Partition-Sizing#자동 토픽 생성은 산정을 우회한다|Kafka 자동 토픽 생성]]).

## Fan-out과 경쟁 소비 구분

- 주문 확정 이벤트를 fanout exchange에 발행하고 배송 준비, 확인 메일, 분석 queue를 각각 바인딩하면 서비스마다 자기 queue에서 자기 속도로 처리하고 따로 확장한다. 한 consumer가 느려도 다른 queue에는 영향이 없다 ([[Fan-Out-Architecture|Fan-out 아키텍처]]).
- 같은 queue에 워커를 여러 개 붙이면 사본이 아니라 분배다 ([[Event-Driven-Patterns|Competing Consumer]]).
- fanout은 queue마다 사본을 넣을 뿐 서비스 간 처리 결과의 원자적 일관성을 보장하지 않는다. 일부 queue의 소비만 실패할 수 있으므로 consumer 멱등 처리, dead letter 격리와 대사가 필요하다 ([[Idempotent-Consumer|멱등 컨슈머]]).
- 재고 차감처럼 주문 확정의 조건이 되는 단계를 확정 뒤 fan-out 대상으로 두면 초과 판매가 난다. 재고 예약과 실패 시 보상은 확정 전에 [[Saga-Pattern|Saga 패턴]]으로 처리하고, fan-out은 확정 뒤의 후속 작업(배송 준비, 메일)에 쓴다.

## 순서

queue는 FIFO지만 consumer가 관찰하는 순서는 조건부다.

- 한 channel에서 발행한 메시지는 발행 순서대로 각 queue에 들어간다. 여러 connection이나 channel에서 발행하면 순서가 섞인다.
- 같은 queue에 consumer가 여럿이면 dequeue는 FIFO여도 `requeue`를 켠 nack이나 channel 종료로 인한 재전달이 순서를 바꾼다. priority도 순서를 바꾼다.
- 순서가 필요하면 single active consumer(또는 queue당 consumer 하나)를 쓰거나 stream을 쓴다.

## ACK, 재큐잉과 dead letter 조건

- 수동 ACK에서 ACK 전에 channel이나 connection이 닫히면 미확인 메시지는 자동으로 재큐잉된다. 연결이 한 번 끊겼다고 dead letter queue로 가지는 않는다. 자동 ACK 모드는 전송 즉시 성공으로 간주하므로 consumer가 죽으면 그 메시지를 잃는다.
- quorum queue는 이 재큐잉을 실패한 전달로 세어 `delivery-limit`(기본 20)에 반영한다. poison message 때문에 consumer가 거듭 죽으면 메시지는 결국 dead-letter되고 DLX가 없으면 버려지며, prefetch가 1보다 크면 함께 미확인 상태였던 다른 메시지도 같이 세어진다. classic queue는 이 한도(poison message handling)를 지원하지 않는다.
- 메시지는 다음 넷 중 하나일 때 dead letter exchange(DLX)로 재발행된다.
  1. consumer가 `basic.reject` 또는 `basic.nack`을 `requeue=false`로 보냄 (AMQP 1.0은 `rejected` outcome)
  2. per-message TTL 만료
  3. queue 길이 한도 초과로 버려짐
  4. quorum queue에서 실패한 전달 횟수(`delivery-count`)가 `delivery-limit`을 넘음
- queue 자체가 TTL로 만료되면 그 안의 메시지는 dead-letter되지 않는다.
- DLX는 `dead-letter-exchange`, `dead-letter-routing-key` policy로 지정한다. queue 선언 인자(`x-dead-letter-exchange`)로 고정하면 바꿀 때 앱을 재배포해야 하므로 공식 문서는 policy를 권한다. 둘 다 있으면 선언 인자가 우선한다.
- 기본 dead-lettering은 내부적으로 publisher confirm 없이 재발행하므로 DLX 대상 queue가 받지 못하면 메시지를 잃을 수 있다. quorum queue는 at-least-once dead-lettering을 지원한다.
- quorum queue의 `delivery-limit` 기본값은 4.0부터 20이다. 4.3부터는 실패한 전달(`basic.reject`, consumer 연결 끊김)만 세는 `delivery-count` 기준이라 `basic.nack` requeue는 limit에 걸리지 않고 끝없이 반복될 수 있다. 이 반복은 consumer가 끊는다. nack 반환까지 세는 할당 횟수 header `x-acquired-count`를 보고(`x-delivery-count`는 nack 반환을 세지 않는다) 상한에서 `basic.reject`나 `basic.nack`을 `requeue=false`로 보내 DLX로 넘기거나, 재시도를 `basic.reject`(`requeue=true`)로 반환해 `delivery-limit`이 적용되게 한다.
- 4.3의 quorum queue delayed retry(`delayed-retry-type`, `delayed-retry-min`, `delayed-retry-max` policy)는 반환된 메시지의 재전달 간격만 벌릴 뿐 반복을 끝내지 않는다. 지연은 `min(delayed-retry-min * delivery-count, delayed-retry-max)`라 nack 반환은 `delivery-count`를 올리지 않아 지연도 늘지 않고, `failed` 타입은 `delivery-count`가 오른 반환만 지연하므로 nack 반환은 지연 없이 다시 전달된다.
- 지연 발행(`x-delay` header)에 쓰이던 `rabbitmq-delayed-message-exchange` plugin은 유지보수가 중단됐다. 저장소는 archived 상태이고 4.3에서 제거된 Mnesia에 의존하며, 마지막 릴리스가 4.2 시리즈용 v4.2.0이라 4.3용 빌드가 없다. plugin README는 4.4부터 quorum queue가 전달 지연을 기본 지원한다고 밝히지만 4.4는 2026-10-01 기준 출시 전이다.
- 4.3에서 재시도 간격은 TTL과 DLX 조합이나 위 delayed retry로 둔다. delayed retry는 consumer가 반환한 메시지에만 적용되므로 새로 발행하는 메시지의 예약 전달은 TTL과 DLX 조합이나 외부 scheduler로 구현한다. 만료된 메시지는 queue 머리에 와야 dead-letter되므로 TTL 조합은 지연 단계마다 message TTL을 고정한 queue를 따로 둔다. 재시도와 격리 설계 일반은 [[Event-Driven-Patterns|Retry와 DLQ]]에 있다.
- 소비 속도보다 유입이 빠르면 consumer가 과부하된다. prefetch로 미확인 메시지 수를 제한한다 ([[Backpressure]]).

## 내구성의 범위

broker 재시작 뒤에도 메시지를 남기려면 durable queue와 persistent 메시지를 함께 쓰고, publisher가 broker의 수신을 확인하려면 publisher confirm을 켠다. 이것은 node 재시작 대비이고 node 장애에 대비한 복제는 quorum queue나 stream의 몫이다 ([[Messaging-Broker-Comparison|브로커 비교]]의 복제 고가용성 항목).

## 활용 예: 설정 변경 브로드캐스트

Spring Cloud Bus는 가벼운 broker로 여러 인스턴스를 이어 설정 변경 같은 상태 변화를 브로드캐스트한다. AMQP(RabbitMQ)와 Kafka starter를 제공하고, `/actuator/busrefresh`는 각 인스턴스의 `RefreshScope` 캐시를 비우고 `@ConfigurationProperties`를 다시 바인딩한다(Spring Cloud Bus 5.0.3 문서 기준). 재시작 없이 설정을 여러 서비스에 반영하는 fan-out의 예다.

## 직접 확인

- management UI나 `rabbitmqadmin` v2(HTTP API를 쓰는 독립 바이너리)로 exchange, queue, binding을 선언하고 routing key를 바꿔 발행한 뒤 어느 queue에 쌓이는지 본다.
- Kafka와 대비하면 차이가 선명하다. Kafka는 consumer group이 다르면 같은 메시지를 각자 offset으로 읽는다. RabbitMQ는 ACK된 메시지가 queue에서 사라지므로 여러 서비스가 같은 메시지를 받으려면 서비스마다 queue를 두고 exchange로 사본을 만든다.

## 면접 체크포인트

- producer가 queue가 아니라 exchange에 발행하는 이유와 binding의 역할
- Exchange 4종의 매칭 규칙과 선택 상황, default exchange의 정체
- fan-out(서비스별 queue)과 경쟁 소비(한 queue에 여러 consumer)의 차이
- dead letter 조건 넷, ACK 없는 연결 종료가 재큐잉인 이유와 quorum queue에서 반복 실패가 dead letter로 끝나는 조건(`basic.nack` requeue는 제외)
- routing되지 않은 메시지가 조용히 사라지는 조건과 대응(mandatory, alternate exchange)
- queue가 FIFO여도 처리 순서가 보장되지 않는 조건

## 출처

- [RabbitMQ, AMQP 0-9-1 Model Explained](https://www.rabbitmq.com/tutorials/amqp-concepts)
- [RabbitMQ, Exchanges](https://www.rabbitmq.com/docs/exchanges)
- [RabbitMQ, Tutorial Five Topics](https://www.rabbitmq.com/tutorials/tutorial-five-javascript)
- [RabbitMQ, Publishers (Unroutable Message Handling)](https://www.rabbitmq.com/docs/publishers#unroutable)
- [RabbitMQ, Alternate Exchanges](https://www.rabbitmq.com/docs/ae)
- [RabbitMQ, Queues (Message ordering)](https://www.rabbitmq.com/docs/queues)
- [RabbitMQ, Consumer Acknowledgements and Publisher Confirms](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ, Reliability Guide](https://www.rabbitmq.com/docs/reliability)
- [RabbitMQ, Dead Letter Exchanges](https://www.rabbitmq.com/docs/dlx)
- [RabbitMQ, Quorum Queues (Poison Message Handling, Delayed Retry)](https://www.rabbitmq.com/docs/quorum-queues)
- [RabbitMQ, Classic Queues](https://www.rabbitmq.com/docs/classic-queues)
- [RabbitMQ, Time-To-Live and Expiration](https://www.rabbitmq.com/docs/ttl)
- [RabbitMQ, rabbitmqadmin v2](https://www.rabbitmq.com/docs/management-cli)
- [RabbitMQ Delayed Message Plugin 저장소 — GitHub](https://github.com/rabbitmq/rabbitmq-delayed-message-exchange)
- [RabbitMQ Delayed Message Plugin 릴리스 — GitHub](https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases)
- [RabbitMQ Server 릴리스 — GitHub](https://github.com/rabbitmq/rabbitmq-server/releases)
- [Apache Kafka 4.3, Protocol Guide](https://kafka.apache.org/43/design/protocol/)
- [Spring Cloud Bus, Reference](https://docs.spring.io/spring-cloud-bus/reference/)
- [Spring Cloud Bus, Bus Endpoints](https://docs.spring.io/spring-cloud-bus/reference/spring-cloud-bus/bus-endpoints.html)
- [인프런, 코드빌런, 비동기 아키텍처의 이해-1](https://www.inflearn.com/courses/lecture?courseId=334899&unitId=242780)
- [인프런, 코드빌런, 비동기 아키텍처의 이해-2](https://www.inflearn.com/courses/lecture?courseId=334899&unitId=242781)
- [인프런, Dowon Lee, RabbitMQ에서의 통신 방법](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=290013)
- [인프런, Dowon Lee, 실습 9 Message Broker 실행 및 메시지 발행](https://www.inflearn.com/courses/lecture?courseId=332731&unitId=290746)

## 관련 문서

- [[브로커(Brokers)|브로커 인덱스]]
- [[Messaging-Broker-Comparison|브로커 비교 (RabbitMQ, BullMQ, SQS, Kafka)]]
- [[NestJS-Microservices|NestJS RabbitMQ 전송 (수동 ACK, prefetch, durable queue)]]
- [[Amazon-MQ|Amazon MQ (관리형 RabbitMQ)]]
- [[Messaging-Patterns|메시징 패턴]]
- [[Fan-Out-Architecture|Fan-out 아키텍처]]
- [[Event-Driven-Patterns|이벤트 드리븐 실전 패턴 (경쟁 소비, Retry와 DLQ)]]
- [[Idempotent-Consumer|멱등 컨슈머]]
- [[Saga-Pattern|Saga 패턴]]
