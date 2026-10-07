---
tags: [ai, agent, a2a, kafka, msk, reliability]
status: done
verified_at: 2026-10-07
category: "AI엔지니어링(AIEngineering)"
aliases: ["A2A Kafka 전송", "에이전트 메시징과 재처리"]
---

# A2A와 Kafka 전송의 책임 경계

A2A는 에이전트 간 작업과 결과 교환을 정의하고, Kafka는 메시지 보관과 소비를 담당한다. 에이전트 메시지를 Kafka로 운반하는 것과 A2A의 동작 계약을 구현하는 것은 별개다.

## 표준 바인딩과 사용자 정의 바인딩

A2A v1.0.0의 표준 바인딩은 JSON-RPC, gRPC, HTTP+JSON/REST다. Kafka 기반 전송을 추가하려면 사용자 정의 바인딩으로 다룬다. 기본 SDK가 Kafka를 표준 전송으로 제공한다고 가정하지 않는다.

사용자 정의 바인딩은 Agent Card의 `supportedInterfaces`에 바인딩 식별 URI, endpoint와 protocol version을 선언한다. 데이터 모델, 오류 매핑, 지원하는 스트리밍의 순서와 종료, 인증과 권한 전달을 명세해야 한다. 요청과 응답을 두 topic으로 보내는 데모만으로 표준 바인딩과 동등한 동작을 증명할 수 없다.

## 메시지 구조의 설계 예시

다음은 Kafka를 이용할 때 필요한 애플리케이션 설계 항목이다. A2A가 특정 topic 구성이나 correlation key를 강제하는 것은 아니다.

| 항목 | 설계할 계약 |
|---|---|
| 요청과 응답의 대응 | correlation ID로 호출과 응답을 연결하고, timeout 뒤 도착한 응답의 처리 방식을 정한다 |
| 작업과 대화 | `taskId`는 작업, `contextId`는 관련 작업과 메시지의 문맥을 연결한다. 호출별 correlation ID와 수명 범위를 구분한다 |
| 재전달 | A2A의 Send Message 멱등성은 선택 사항이다. 중복 메시지와 외부 도구 실행을 어떻게 감지할지 별도로 정한다 |
| 순서 | 같은 작업의 이벤트를 같은 파티션으로 보내고 소비자 처리 순서를 유지하는지 확인한다 |
| 재시작 | 메모리의 응답 대기 목록만으로 복구하지 않는다. 작업 상태와 처리 완료 지점을 보존하고 재시작 시 대조한다 |

## 로그 보존과 업무 완료는 다르다

Kafka에 메시지가 남아 있어도 소비자가 외부 DB를 갱신한 뒤 offset을 커밋하기 전에 중단되면 같은 작업이 다시 실행될 수 있다. Kafka topic 사이의 트랜잭션 보장을 외부 API 호출이나 DB 변경까지 확장하지 않는다. 목적지와 완료 지점을 조정하거나 업무 멱등성을 확보해야 한다.

재처리 가능 기간은 retention과 compaction 설정에 묶인다. 감사에 필요한 전체 이력과 Agent Card의 최신 상태를 같은 보존 정책으로 취급하지 않는다. 호출자가 기다리기를 멈춘 것과 원격 작업의 취소도 구분한다.

## 보안과 도입 판단

브로커를 경유해도 인증과 권한은 필요하다. MSK의 IAM identity에는 Kafka ACL이 권한 제어로 적용되지 않으므로 IAM policy로 접근을 제어한다. 에이전트가 읽을 topic과 발행할 topic, 응답 수신 대상의 경계를 함께 정한다.

재생, 비동기 완충이나 여러 독립 소비자가 필요할 때 Kafka를 검토한다. 단순한 요청과 응답이면 표준 바인딩을 먼저 비교한다. 운영 검증에서는 중복 요청, 소비자 재시작, 응답 지연과 권한 없는 topic 접근을 각각 재현한다.

## 출처

- [A2A Protocol, v1.0.0 Specification](https://a2a-protocol.org/v1.0.0/specification/)
- [A2A Protocol, Custom Protocol Bindings](https://a2a-protocol.org/v1.0.0/topics/custom-protocol-bindings/)
- [Apache Kafka 4.1, Design](https://kafka.apache.org/41/design/design/)
- [Amazon MSK, IAM access control](https://docs.aws.amazon.com/msk/latest/developerguide/iam-access-control.html)

## 관련 문서

- [[MCP#A2A와의 경계 — 도구 연결과 에이전트 협업|MCP와 A2A의 경계]]
- [[MQ-Kafka-Patterns|Kafka 실전 패턴과 도입 조건]]
- [[MQ-Kafka-Event-Ordering|파티션과 소비자 처리 순서]]
