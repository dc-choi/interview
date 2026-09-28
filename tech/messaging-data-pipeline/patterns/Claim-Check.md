---
tags: [messaging, pattern, claim-check, payload, integration]
status: done
verified_at: 2026-09-28
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Claim Check", "클레임 체크", "Claim Check 패턴", "페이로드 참조 전달"]
---

# Claim Check (클레임 체크)

Claim Check는 메시지 데이터를 영속 저장소에 두고 메시징 시스템에는 그 데이터를 찾을 참조(claim check)만 보내는 패턴이다. 수신 측은 처리할 때 참조로 저장소에서 데이터를 다시 읽는다. Enterprise Integration Patterns는 정보를 잃지 않고 메시지 데이터량을 줄이는 방법으로, Azure Architecture Center는 payload 저장과 메시지 전달을 분리해 브로커가 큰 payload를 저장하지 않게 하는 방법으로 설명한다. 공항에서 짐을 맡기고 번호표만 들고 이동하는 것과 같다.

## 동작

1. 송신 측이 payload를 외부 저장소(객체 저장소, DB)에 저장하고 고유 키를 얻는다.
2. 저장이 성공한 뒤에만 키를 담은 작은 메시지를 발행한다.
3. 수신 측이 메시지의 키로 저장소에서 payload를 읽어 처리한다.
4. 정해진 소유자가 더는 필요 없는 payload를 지우거나 보존 정책으로 만료시킨다.

Amazon SQS Extended Client Library for Java는 payload를 S3에 두고 그 객체의 참조를 담은 메시지를 큐에 보내는 구현이다([[SQS]]).

## 쓰는 이유와 쓰지 않을 때

- 브로커의 메시지 크기 한도를 피한다. 메시지 크기나 요금 등급으로 과금하는 브로커에서는 큰 payload로 늘어나는 요금과 상위 등급 전환 비용도 줄인다. 대신 저장소, 전송, 정리 작업 비용이 더해진다.
- 큰 payload가 브로커 메모리와 디스크, 직렬화 시간을 차지하지 않게 한다.
- 민감한 데이터를 브로커와 큐 모니터링 도구에서 빼고 접근 통제가 있는 저장소에만 둔다.
- 여러 라우팅 단계를 거치는 메시지가 단계마다 전체 payload를 다시 직렬화하지 않게 한다.

payload가 전송 한도 안에 있고 지연이 중요한 흐름은 인라인 전송이 더 단순하고 빠르다. 압축이나 더 작은 직렬화 형식으로 한도 안에 여유 있게 들어오고 모든 생산자와 소비자가 같은 형식을 쓸 수 있다면 그쪽을 먼저 검토한다.

## 참조가 가리키는 대상 — 사본인가 기준 원본인가

| 축 | payload 사본 참조 | 기준 저장소 행 참조 |
|---|---|---|
| 참조 대상 | 메시지를 위해 저장한 payload | 업무 테이블처럼 계속 바뀌는 기준 원본 |
| 읽는 값 | 저장 시점의 값 | 처리 시점의 현재 상태 |
| 예 | S3 객체 키, blob URL | 처리 대기 행 ID, 주문 ID |
| 주요 함정 | payload 수명과 메시지 보존의 불일치 | 중간 변경, 삭제, 복제 지연 |

기준 저장소 행을 참조하는 방식은 식별자와 조회 경로만 싣고 수신 측이 원본에 되묻는 Event Notification, [[Transactional-Outbox#Zero Payload 전략 — 오래된 payload 완화와 스키마 유연성|Zero Payload]]와 같은 모양이다. 오래된 payload를 적용할 위험은 줄지만 처리 시점의 상태를 읽으므로, 발생 당시 값이 필요한 감사나 이력 재구성에는 사본 참조나 상태를 실은 이벤트가 맞다. 순서가 의미 있으면 원본의 단조 증가 version을 함께 싣고, 소비자는 이미 반영한 것보다 오래된 version을 거부한다.

## 설계 체크

- **저장 후 발행** — payload 저장과 참조 발행은 서로 다른 시스템이라 하나의 원자적 트랜잭션이 아니다. 저장이 성공한 뒤에만 참조를 발행하고, 저장 뒤 발행 전에 실패해 남은 고아 payload는 정리 작업으로 회수한다.
- **중복 수신** — 재시도와 재전달로 같은 참조가 두 번 이상 올 수 있으므로 [[Idempotent-Consumer|멱등 컨슈머]]로 처리한다.
- **수명 소유자** — 누가 언제 payload를 지우는지 정하고, 유효한 참조가 지워진 데이터를 가리키지 않게 메시지 보존 기간과 맞춘다. Kafka처럼 소비 뒤에도 보존 기간 동안 이벤트를 다시 읽을 수 있는 로그에서는 한 소비자가 처리 직후 지운 payload가 재처리와 다른 컨슈머 그룹의 처리를 깨뜨릴 수 있다.
- **참조와 권한 분리** — 참조에 presigned URL이나 SAS 같은 보안 토큰을 넣지 않고, 인가는 생산자, 소비자와 저장소 사이에서 따로 처리한다. 참조에 토큰이 있으면 큐나 모니터링 도구에서 참조를 읽은 쪽이 토큰 유효 기간 동안 payload를 가져갈 수 있다. 소비자에게 임시 접근을 꼭 줘야 하면 Valet Key 패턴을 쓴다.
- **저장소 가용성** — 저장소가 멈추거나 데이터를 잃으면 유효한 참조를 가진 메시지도 처리하지 못해 파이프라인이 정체된다.
- **추가 왕복** — 메시지마다 저장소 조회가 늘고, 기준 원본을 참조하면 그 조회 부하가 원본 DB로 간다.
- **무결성** — 사본을 검증해야 하면 콘텐츠 해시나 서명을 메시지에 싣고 불일치 시 처리 규칙(거부, 재조회, 조사 경로)을 정한다.

## 기준 저장소 행 참조의 함정

처리 대기 행의 ID만 싣고, 처리가 끝나면 이력 기록과 대기 행 삭제를 한 트랜잭션으로 묶는 구조에서는 대기 행이 남아 있으면 미처리, 없으면 처리 완료로 본다. 이 판정에는 조건이 붙는다.

- **행 없음은 여러 뜻이다** — 이미 처리됨, 다른 경로(구 시스템, 취소)가 지움, 아직 보이지 않음일 수 있다. MySQL과 PostgreSQL 복제는 기본이 비동기라 replica에서는 primary에 커밋된 행이 아직 보이지 않을 수 있다. 동기 복제로 바꿔도 MySQL 반동기 복제와 PostgreSQL의 `synchronous_commit=on`은 replica의 수신과 로그 기록까지만 기다리고, PostgreSQL은 `remote_apply`일 때 동기 standby가 재생해 조회에 보일 때까지 기다린다. 존재 확인은 이벤트 원천보다 뒤처지지 않는 저장소(보통 primary)에서 하고, 행도 완료 이력도 없으면 건너뛰지 말고 확인 대상으로 남긴다.
- **중복 창이 남는다** — 외부 호출 뒤 삭제 트랜잭션 커밋 전에 죽으면 행과 offset이 모두 남아 재전달 때 다시 호출한다. 두 소비자가 같은 참조를 동시에 처리하면(리밸런스 중 겹침, 전환 중 구 경로와의 중첩) 둘 다 행을 본다. 파티션 할당의 배타성이 처리의 배타성은 아니다([[Consumer-Group|소비자 그룹]]). 되돌릴 수 없는 호출은 provider가 지원하는 멱등 키를 참조(예: 메시지 ID)에서 정해 모든 소비자가 같은 키를 쓰게 하고 키 보관 기간 안의 재호출을 막거나([[Idempotency-Key#TTL 정리|키 보관 기간]]), 호출 전 조건부 claim으로 한 소비자만 호출하게 하고 claim 뒤 결과가 불명확한 행은 대사로 확정한다([[At-Least-Once]]).
- **남은 행만 미처리를 드러낸다** — 처리 결과를 기록하지 못한 채 offset을 넘기면 그 메시지는 브로커가 다시 주지 않는다(at-most-once). 오래 남은 대기 행을 주기적으로 다시 흘려보내는 대사 경로와 가장 오래된 행의 나이 경보가 없으면 처리 실패가 조용한 누락이 된다. 멱등 키 보관 기간을 넘긴 행은 다시 흘려보내기 전에 claim 상태와 provider 쪽 처리 결과부터 확인한다.

## 사례

레거시 서비스들이 발송 대상 테이블에 직접 INSERT하거나 같은 테이블에 행을 넣는 발송용 저장 프로시저를 호출하면 CDC가 그 행 변경을 감지하고 Kafka에는 메시지 ID만 실으며, 워커가 ID로 행을 읽어 발송 API를 호출한 뒤 이력 저장과 원본 삭제를 한 트랜잭션으로 처리한 사례가 있다. 원본이 이미 없으면 재수신을 건너뛴다. 수십 개 서비스를 고치지 않고 발송 뒷단을 바꾸는 과도기 구조였고([[Legacy-Modernization-Strategies|레거시 현대화 전략]]), 참조 방식은 기준 저장소 행 참조에 해당하므로 위 함정의 조건이 그대로 적용된다. CDC 이벤트도 커넥터가 비정상 종료 후 복구될 때 중복될 수 있어 같은 멱등 조건이 필요하다([[CDC-Debezium-Concept|CDC와 Debezium]]).

## 면접 체크포인트

- Claim Check가 해결하는 문제(크기 한도, 브로커 자원, 민감 데이터)와 인라인 전송이 나은 조건
- payload 사본 참조와 기준 저장소 행 참조가 읽는 값의 시점 차이
- 저장 후 발행 순서와 payload 수명 소유자를 정해야 하는 이유
- 행 없음을 처리 완료로 볼 때 복제 지연, 동시 처리, 커밋 전 장애가 만드는 오판

## 출처

- [Enterprise Integration Patterns, Claim Check](https://www.enterpriseintegrationpatterns.com/patterns/messaging/StoreInLibrary.html)
- [Azure Architecture Center, Claim Check pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/claim-check)
- [What do you mean by “Event-Driven”? — martinfowler.com, Martin Fowler](https://martinfowler.com/articles/201701-event-driven.html)
- [Amazon SQS Developer Guide, Managing large Amazon SQS messages using Java and Amazon S3](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-s3-messages.html)
- [Amazon S3 User Guide, Download and upload objects with presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [Azure Storage, Grant limited access to data with shared access signatures (SAS)](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview)
- [Apache Kafka 4.3 Documentation, Introduction](https://kafka.apache.org/43/getting-started/introduction/)
- [Apache Kafka 4.3 Documentation, Design](https://kafka.apache.org/43/design/design/)
- [Apache Kafka 4.3 Javadoc, KafkaConsumer](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [MySQL 8.4 Reference Manual, Replication](https://dev.mysql.com/doc/refman/8.4/en/replication.html)
- [PostgreSQL Documentation, Log-Shipping Standby Servers](https://www.postgresql.org/docs/current/warm-standby.html)
- [Debezium Documentation, FAQ](https://debezium.io/documentation/faq/)
- [때로는 오버엔지니어링이 필요합니다 — 올리브영 테크블로그](https://oliveyoung.tech/2026-09-23/overengineering-message-system/)

## 관련 문서

- [[Transactional-Outbox|Transactional Outbox (Zero Payload)]]
- [[Event-Driven-Architecture|이벤트 드리븐 아키텍처 (Zero Payload 결정)]]
- [[Idempotent-Consumer|멱등 컨슈머]]
- [[At-Least-Once|At-Least-Once]]
- [[Consumer-Group|소비자 그룹 (Kafka 리밸런싱)]]
- [[SQS|SQS (큰 payload와 S3)]]
- [[SNS|SNS (Extended Client)]]
- [[CDC-Debezium-Concept|CDC와 Debezium 개념]]
- [[Legacy-Modernization-Strategies|레거시 현대화 전략]]
