---
tags: [nestjs, testing, transport, contract]
status: done
verified_at: 2026-10-02
category: "테스트&품질(Testing&Quality)"
---

# NestJS 전송과 공개 API 계약의 검증

Nest 컨테이너가 만든 인스턴스, handler의 반환값, 실제 transport 응답은 서로 다른 검증 단계다. 같은 module을 써도 운영 bootstrap 설정과 adapter를 재현해야 공개 계약을 시험할 수 있다.

## Adapter와 실제 전송

| 대상 | 필요한 경계 | 단위 mock이 놓치는 조건 |
|---|---|---|
| HTTP | 실제 adapter, global pipe/guard, prefix, parser | 잘못된 입력의 거부, 응답 serializer, content type |
| Fastify | init 뒤 native ready, 실제 plugin/options | Express 전용 middleware와 view/parser 계약 |
| TCP/gRPC | microservice listen, ClientProxy/service client | pattern/package/service name, serialize, port, 오류 계약 |
| Socket.IO/ws | 일치하는 client와 실제 연결 | handshake, event payload, ack, close와 adapter 차이 |
| GraphQL | 실제 document를 endpoint로 전송 | schema coercion, data/errors, field enhancer, entity resolution |
| SSE | 실제 streaming response와 disconnect | text/event-stream framing, connection lifetime와 cleanup |

`TestingModuleBuilder`의 overrideProvider/Guard/Pipe/Interceptor/Filter는 해당 역할을 교체하고 overrideModule은 module 정의를 대체한다. mock을 적용한 기능을 그 테스트가 검증했다고 보고하지 않는다. `createNestMicroservice()`는 컨테이너 생성과 별개로 listen이 필요하고 hybrid는 startAllMicroservices도 필요하다.

WebSocket은 native ws client와 Socket.IO client가 wire 호환하지 않는다. Gateway method를 직접 호출하는 테스트는 Observable의 값만 볼 수 있으며 network routing이나 ack 계약을 시험하지 않는다. `@Ack()`로 수동 ack를 받는 handler와 반환값으로 자동 ack하는 handler의 중복 응답 여부도 실제 client에서 확인한다.

GraphQL HTTP 200은 execution 성공의 증거가 아니다. `data`와 `errors`를 확인하고, 입력 거부를 직접 resolver 호출의 try/catch만으로 검증하지 않는다. 예외가 없으면 실패해야 하는 테스트는 `await expect(...).rejects`처럼 실패를 단언하거나 actual response error를 검사한다.

## 증거가 되는 단언

- status뿐 아니라 저장 결과와 금지된 응답 field의 부재를 확인한다. serializer는 controller 직접 호출과 실제 응답이 다르다.
- Swagger JSON의 path/schema가 있다는 사실과 해당 route의 validation/auth 동작을 따로 시험한다.
- cache는 두 번째 요청이 빨랐다는 wall-clock 비교보다 handler/store 호출 횟수와 key/TTL 경계를 확인한다. system 부하만으로 속도 비교가 뒤집힐 수 있다.
- scheduler registry에 cron이 등록됐다는 사실과 작업 실행, 중복 방지, 실패 복구는 별도다. local cron의 다중 instance 중복 실행도 registry 테스트로 확인되지 않는다.
- queue.add 성공과 worker 업무 완료를 구분한다. queue mock의 인자는 생산자 계약만 확인하며 실제 broker/consumer의 결과는 완료 조건을 기다려 검증한다.

## 격리와 종료

실제 server는 충돌하지 않는 port를 사용하고 test 종료 때 client, app, DB/pool을 모두 닫는다. timeout timer와 socket listener도 성공/실패 양쪽에서 정리한다. streaming 응답은 전체 종료를 기다리는 일반 HTTP assertion만으로 다루기 어렵다.

ORM token은 Entity/Model뿐 아니라 datasource/connection 이름까지 맞춘다. `getRepositoryToken(Entity, name)`와 `getModelToken(Model, connectionName)`을 운영 등록과 동일하게 사용한다. DB 대체의 engine, version, transaction 동시성은 [[NestJS-Testing-Durable-Processes]]에서 구분한다.

공식 sample은 학습용 배열 데이터, plaintext fixture password, root DB credential, synchronize, placeholder guard와 mock business service를 포함한다. module/transport 배선은 참고하되 그 설정을 운영 정책으로 채택하지 않는다. 이 문서는 source에서 검증 전략을 도출한 것으로 sample 실행 결과를 기록한 문서가 아니다.

## 관련 문서

- [[NestJS-Testing-Module-and-Unit]]
- [[NestJS-Testing-E2E-and-Scope]]
- [[NestJS-Testing-Durable-Processes]]
- [[NestJS-GraphQL-Driver-and-Federation-Operations]]

## 출처

- [NestJS API, TestingModuleBuilder](https://api-references-nestjs.netlify.app/api/testing/TestingModuleBuilder)
- [NestJS API, Ack](https://api-references-nestjs.netlify.app/api/websockets/Ack)
- [NestJS sample, gRPC transport test](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/04-grpc/e2e/hero/hero.e2e-spec.ts)
- [NestJS sample, native WebSocket test](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/16-gateways-ws/e2e/events/events.e2e-spec.ts)
- [NestJS sample, SSE transport test](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/28-sse/e2e/app.e2e-spec.ts)
- [NestJS sample, caching test](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/20-cache/e2e/app/app.e2e-spec.ts)
- [NestJS sample, ORM injection token](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/06-mongoose/src/cats/cats.service.spec.ts)
