---
tags: [nestjs, microservices, kafka, grpc, nats, rabbitmq]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS 전송별 계약"]
---

# NestJS 전송별 전달과 오류 계약

Nest의 메시지 핸들러 모양이 같아도 전달 보장, 직렬화, 재연결과 오류 전파는 전송별로 다르다. 다음 내용은 2026-10-01 현재 v12 공식 문서 기준이며 메시지 처리 기본은 [[NestJS-Microservices-Message-Pipeline]]을 따른다.

## TCP와 Redis

- TCP는 기본 전송이다. `retryAttempts`/`retryDelay`는 서버의 비정상 종료 뒤 listen 재시도이며 RPC 업무 재시도와 구분한다. `tlsOptions`로 서버 인증서/키와 클라이언트 CA를 설정해 전송을 암호화한다.
- TCP `maxBufferSize`는 수신 버퍼의 **문자 수**다. `incompleteMessageTimeout` 기본 30초는 패킷 중간에서 침묵한 peer를, `maxSendBufferSize` 기본 128MB는 응답을 읽지 않는 peer를 제한한다. 전체 작업의 실행 deadline을 대신하지 않는다.
- Redis는 ioredis Pub/Sub다. 구독자가 없는 발행은 복구되지 않고 최소 1회 처리 보장이 없다. `wildcards: true`를 서버와 클라이언트 양쪽에 설정하면 `psubscribe`/`pmessage`를 쓴다.
- Redis `unwrap()`은 `[pub, sub]` 두 연결을 반환하고 `on('error', (connection, error) => ...)`의 첫 인자는 `'pub'` 또는 `'sub'`다. v12.1 Redis/v12.1.1 TCP의 client 이벤트 등록은 `close()` 전까지 재연결에 유지되며 중복 제거하지 않으므로 한 번만 등록한다.

## MQTT와 NATS

- MQTT의 구독 QoS 기본값은 0이며 전역 `subscribeOptions.qos`, 패턴 extras의 `qos`로 바꾼다. **발행** 옵션은 `MqttRecordBuilder`의 QoS, retain, properties로 별도 설정한다. `+`는 한 topic level, `#`는 여러 level이다.
- MQTT `maxConnectionAttempts`는 서버의 최초 연결만 제한한다. 연결 성공 뒤 재연결 제한으로 해석하지 않는다. `MqttContext.getPacket()`으로 user properties와 원본 packet을 확인한다.
- v12 NATS 드라이버는 기존 `nats` 대신 `@nats-io/transport-node`다. Nest의 request-response는 NATS의 `request()` API를 호출하지 않고 `publish()`와 고유 reply subject를 사용한다.
- NATS queue group은 같은 그룹의 구독자 중 하나에 분배한다. 이를 비즈니스 작업의 영구 중복 방지나 JetStream persistence 보장으로 확대하지 않는다. Nest의 기본 NATS 전송은 subject Pub/Sub이며 JetStream 통합은 별도 계약이다.
- NATS `NatsRecordBuilder`의 headers가 client 공통 headers보다 우선한다. v12 custom deserializer는 raw Uint8Array 대신 전체 NATS message를 받고 `msg.json()`으로 읽는다.
- NATS `gracefulShutdown: true`는 subject 구독을 해제한 뒤 `gracePeriod`(기본 10초)를 기다린다. 진행 중 작업의 실제 완료와 deadline을 별도로 조정한다.

## RabbitMQ

- 기본 `noAck: true`를 그대로 두면 수동 ACK를 기다리지 않는다. `noAck: false`에서 처리 완료 후 `RmqContext.getChannelRef().ack(getMessage())`를 호출한다. ACK 없이 연결이 닫히면 재큐잉될 수 있으므로 업무 처리는 멱등하게 만든다.
- 큐 `durable`과 발행 `persistent`는 서로 다른 설정이다. 메시지 restart 보존에는 살아남는 큐와 persistent 메시지가 모두 필요하며 ACK만으로 모든 유실을 막는다는 표현은 피한다.
- `prefetchCount`는 미ACK 선인출을 제한한다. `isGlobalPrefetchCount`는 consumer 기준 대신 channel 기준을 선택한다. `maxConnectionAttempts`는 consumer 설정이다.
- `wildcards: true`는 topic exchange 라우팅을 켠다. `*`는 정확히 한 단어, `#`는 0개 이상이다. 기본 exchange 이름은 큐 이름이며 `routingKey`, `exchangeType`, exchange/queue arguments와 배포된 binding을 함께 맞춘다.
- `RmqRecordBuilder`로 headers, priority 등을 보내며 큐가 지원하는 옵션도 확인한다. request-response producer의 기본 reply queue는 `amq.rabbitmq.reply-to`다.

## Kafka

- request-response는 request topic과 기본 `<topic>.reply` topic을 사용한다. `ClientKafkaProxy.subscribeToResponseOf()`를 비동기 `connect()` 전에 호출하고 **동시에 실행하는 요청 클라이언트 수 이상**의 reply partition을 준비한다. event-only에는 response 구독이 필요 없고 `producerOnlyMode`를 사용할 수 있다.
- Nest의 reply partition assigner는 rebalance 때 기존 client의 reply partition을 유지하려 한다. 업무 처리의 정확히 한 번 보장과는 다른 장치다. clientId/groupId의 `-client`/`-server` 접미는 `postfixId`로 바꾼다.
- v12 Kafka는 `RegExp` 패턴 구독을 지원한다. Nest가 `lastIndex`를 초기화하므로 `/g`, `/y`의 상태 때문에 다음 매칭이 누락되지 않는다. MQTT/NATS의 topic wildcard와 같은 API로 취급하지 않는다.
- key/value/header Buffer는 문자열로 변환하고 object-like 문자열은 JSON 파싱을 시도한다. 보내는 `{ key, value, headers }`에서 같은 키의 partition 배치는 순서를 위한 계약이며 TS payload 타입은 런타임 검증이 아니다.
- 이벤트의 미처리 예외는 기본으로 retriable이다. 요청 핸들러에서 KafkaJS로 실패를 전파하려면 `KafkaRetriableException`을 사용한다. 일반 RPC 오류 응답과 재전달을 혼동하지 않는다.
- 긴 처리에는 `KafkaContext.getHeartbeat()`를 호출해 session timeout을 피한다. 자동 commit을 끌 때는 `run.autoCommit: false`를 설정하고 처리 완료한 offset의 **다음 값**을 commit한다. offset은 문자열이므로 큰 값의 정밀도를 보존하려면 `BigInt(offset) + 1n`처럼 계산한다.
- 공식 retry filter 예제의 재발행 후 commit은 두 연산을 원자적으로 묶지 않는다. 재발행 성공 뒤 commit 실패에 따른 중복과 처리된 payload 재직렬화를 설계해야 한다. retry-count 헤더만으로 모든 장애에서 정확히 N번 재시도를 보장하지 않는다.

## gRPC

- `@GrpcMethod(service, method)`와 `ClientGrpc.getService<T>()`를 사용한다. proto 메서드는 클라이언트에서 lowerCamelCase로 노출된다. `.proto`를 `nest-cli.json` assets에 포함하고 실제 빌드 경로를 맞춘다.
- 기본 credentials는 insecure다. TLS가 필요한 환경에서는 서버 credentials와 client channel credentials를 명시한다. loader의 `keepCase` 설정은 underscore 필드의 wire mapping을 바꾸므로 양쪽 입력 이름을 맞춘다.
- v12의 상태별 `Grpc*Exception`은 `GrpcExceptionFilter`를 등록해야 ALREADY_EXISTS 같은 상태로 직렬화된다. 일반 `RpcException`은 숫자 `code`/`status`가 없으면 UNKNOWN이고, 기타 예외는 UNKNOWN + 일반 메시지가 된다.
- client-streaming 단일 응답은 `@GrpcStreamMethod()`의 반환 Observable **마지막 값** 또는 `@GrpcStreamCall()`의 callback으로 보낸다. `@GrpcMethod()`로 client stream을 처리하지 않는다. 양방향 RxJS 처리에는 반환 Observable이 필요하다.
- call-stream 방식은 Duplex의 write/end와 callback을 직접 관리한다. proto의 request/response stream 선언에 따라 handler 인자가 달라진다. `Metadata`는 인증이나 추적 데이터를 운반할 뿐 인증 검증을 대신하지 않는다.
- `onLoadPackageDefinition`에서 `@grpc/reflection` 또는 `grpc-health-check`를 등록할 수 있다. reflection 공개 여부와 health의 SERVING 상태는 실제 서비스 준비 여부에 맞춘다.

## 출처
- [NestJS — Microservices basics](https://docs.nestjs.com/microservices/basics)
- [NestJS — Redis](https://docs.nestjs.com/microservices/redis)
- [NestJS — MQTT](https://docs.nestjs.com/microservices/mqtt)
- [NestJS — NATS](https://docs.nestjs.com/microservices/nats)
- [NestJS — RabbitMQ](https://docs.nestjs.com/microservices/rabbitmq)
- [NestJS — Kafka](https://docs.nestjs.com/microservices/kafka)
- [NestJS — gRPC](https://docs.nestjs.com/microservices/grpc)
