---
tags: [messaging, kafka, event-streaming, patterns]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Kafka Patterns", "카프카 실전 패턴"]
verified_at: 2026-08-28
---

# Kafka 실전 패턴

> 상위 인덱스: [[MQ-Kafka|Kafka]]

대규모 운영에서 반복적으로 쓰이는 Kafka 활용 패턴.

## 키 기반 순서 보장 + 로드 분산

같은 엔티티(예: 주문 ID) 메시지는 **동일 키**로 발행 → 같은 파티션에 저장되어 **키 단위 순서 보장**. 서로 다른 키는 다른 파티션으로 분산되어 병렬 처리가 유지됨.

순서를 지키면서 소비를 병렬화할 때 깨지는 지점(생산자 재시도, 소비자 병렬화)과 소비자 체이닝, watermark식 제한적 비순서는 [[MQ-Kafka-Event-Ordering|이벤트 순서 보장]] 참고.

## Transactional Outbox + Debezium

DB 트랜잭션으로 business row와 Outbox 테이블의 이벤트를 함께 기록하고, **Debezium MySQL Connector**가 committed binlog 변경을 읽어 Kafka로 발행 (→ [[Transactional-Outbox]], [[CDC-Debezium]]).
- business row와 Outbox row의 원자성은 **DB 트랜잭션**이 보장한다. CDC 발행은 그 뒤 독립적으로 일어나므로, 기본 at-least-once delivery에서는 restart나 failure 뒤 같은 이벤트가 다시 전달될 수 있음
- Outbox의 고유 event ID를 메시지에 보존하고, consumer는 그 ID로 멱등 처리 또는 중복 제거. Kafka Connect exactly-once 설정은 별도 지원 범위와 운영 조건을 확인
- Debezium MySQL Connector는 source server의 binlog를 **단일 task**로 읽는다. 같은 DB의 Outbox 테이블만 나누거나 `tasks.max`를 늘려도 Connector 병렬화가 되지 않는다. DB가 이미 shard별 server로 분리된 경우에만 server별 Connector 구성을 검토

## MSK Connect로 DB 변경을 S3에 적재한다

2026-10-14 부분 검증: MSK Connect 개요와 Debezium source connector 공식 문서를 대조했다. 기존 절 전체의 검증일은 유지한다.

데이터 경로는 **DB 변경 → Debezium source connector → Kafka 토픽 → S3 sink connector → S3 객체**로 나눈다. Source는 외부 데이터를 토픽에 넣고 sink는 토픽 데이터를 외부 저장소로 내보낸다. MSK Connect는 이 커넥터의 실행 인프라를 관리한다. Source 생성 성공만으로 S3 적재까지 확인한 것은 아니다.

- **확장 조건:** Debezium MySQL connector는 task 하나만 지원한다. AWS는 MSK Connect에서 autoscaled capacity 대신 provisioned capacity와 `workerCount=1`을 사용하도록 안내한다. 일반적인 MSK Connect 자동 확장 기능을 이 커넥터의 병렬 처리 보장으로 적용하지 않는다.
- **접근 조건:** DB 연결, Kafka 인증과 토픽 권한, sink의 S3 쓰기 권한을 구분한다. AWS의 Debezium 예제는 Secrets Manager Config Provider로 DB 자격증명을 커넥터 설정 밖에 둔다. 예제의 평문 비밀번호를 운영 설정에 복사하지 않는다.
- **데이터 의미:** Debezium의 `before`, `after`, `op`는 변경 이벤트를 설명한다. S3에 이벤트 파일이 생겼다는 사실을 현재 DB 테이블과 같은 조회 결과가 만들어졌다는 뜻으로 해석하지 않는다. 갱신과 삭제를 반영한 현재 상태가 필요하면 별도 변환과 검증을 설계한다.

검증 제안: 초기 데이터와 이후 INSERT, UPDATE, DELETE를 구분해 토픽과 S3 양쪽에서 확인한다. 커넥터 재시작 뒤 중복, 누락과 소비 지연도 확인하고, S3 sink의 파일 생성 조건과 오류 로그를 별도로 점검한다. 이 절은 특정 플러그인 조합의 실행 성공이나 end-to-end exactly-once를 보장하지 않는다.

## Event Bus (Spring Cloud RemoteApplicationEvent)

설정 변경과 라우팅 규칙 같은 **모든 인스턴스가 동시에 알아야 하는 브로드캐스트**에 사용.
- 각 서버 인스턴스가 **유니크 Consumer Group ID** 사용 → 같은 토픽을 N대 서버가 독립 소비
- 낮은 처리량이 충분하므로 파티션 1개로 단순화

## Kafka Streams로 실시간 집계

원본 이벤트 스트림을 **상태 저장소(State Store)** 로 집계해 지표화. Grafana 대시보드로 시각화 → 이상 감지와 운영 모니터링. 상태 저장소, KStream/KTable, 윈도우, EOS, 운영 지표는 [[MQ-Kafka-Streams|Kafka Streams]] 참고.

## Kafka가 필요한 시점

- 이벤트 리플레이가 필요 (장애 후 재처리, 새 소비자가 과거 이벤트 재생)
- 파티션 내 순서 보장이 필수
- record 크기, durability, latency와 consumer 병렬성을 반영한 부하 시험에서 지속 처리량 요구가 다른 후보를 넘어설 때
- 여러 소비자 그룹이 같은 이벤트를 독립적으로 소비

다른 시스템(SQS, Pub/Sub 등)과의 상세 비교는 [[Messaging-Patterns|메시징 패턴]]과 [[Messaging-Broker-Comparison|브로커 비교]] 참고.

## 클러스터 이전: 데이터 복제와 소비 위치를 따로 확인한다

2026-10-10 Amazon MSK Replicator 공식 문서 기준이다. 복제본의 레코드 offset은 원본과 다를 수 있다. Consumer group offset 동기화는 원본의 커밋 위치를 대상 위치로 변환하며, 정확히 같은 위치가 아니라 일부 재처리를 허용하는 근사 위치에서 재개할 수 있다. 외부 DB 갱신이나 결제 같은 부수효과에는 별도 멱등 처리가 필요하다.

| 확인 대상 | 이전 전 확인할 조건 |
|---|---|
| 복제 시작 위치 | 기본은 `latest`다. 기존 이력이 필요하면 생성 시 `earliest`를 선택한다 |
| 토픽과 그룹 필터 | 필요한 토픽과 consumer group이 include/exclude 조건에 포함되는가 |
| 대상 그룹 상태 | 대상에서 이미 소비 중인 그룹에는 변환 offset을 덮어쓰지 않는다. 동기화 전에 소비자를 시작하면 기대한 재개 위치를 쓰지 못할 수 있다 |
| 복귀 경로 | `LEGACY` 단방향 동기화는 역방향 복귀 위치를 자동으로 변환하지 않는다 |

`ENHANCED` 동기화로 양방향 이동을 준비하려면 반대 방향의 Replicator도 구성하고 두 Replicator에 동일 토픽 이름 복제를 사용한다. 각 Replicator의 데이터 복제는 여전히 단방향이다. 옵션 하나를 켰다는 이유로 역방향 데이터 경로까지 생겼다고 판단하지 않는다.

운영 점검에서는 데이터 복제 지연, consumer group 동기화 실패와 실제 재개 위치를 나눠 확인한다. 아래는 제품 기능에서 도출한 이전 검증 제안이다.

1. 작은 기준 데이터에 이벤트 ID를 넣고 대상에서 누락과 중복을 비교한다.
2. 같은 그룹의 소비 위치가 변환됐는지 확인한 뒤 소비자를 전환한다.
3. 역방향 복제가 준비된 경우에만 복귀 시험을 하고, 외부 부수효과가 중복되지 않는지 확인한다.

이 절은 이전 판단의 점검 항목이며 특정 클러스터의 무손실 전환을 검증한 실행 절차는 아니다.

### 새 토픽 생성 직후의 복제 공백

2026-10-13 Amazon MSK 공식 문서 대조 기준이다. MSK Replicator는 비동기로 복제하며, `Detect and copy new topics`를 켜도 새 토픽이나 파티션의 발견과 대상 생성에 최대 30초가 걸릴 수 있다. 기본 `latest` 시작 조건에서는 대상 토픽이 만들어지기 전에 원본에 쓴 메시지가 복제되지 않는다. 기존 메시지까지 필요하면 Replicator 생성 시 `earliest` 시작을 선택한다.

이는 소비자의 `auto.offset.reset`과 다른 단계다. 대상에 복제되지 않은 레코드는 대상 소비자를 `earliest`로 시작해도 읽을 수 없다. 원본의 보존 기간 안에 남아 있는 데이터와 복제 시작 위치를 함께 점검한다.

기본 토픽 이름은 `<sourceKafkaClusterAlias>.topic`처럼 접두사가 붙는다. 원본과 동일한 토픽 이름을 사용하는 모드도 있으므로, 대상 소비자의 구독 이름이 실제 복제 설정과 맞는지 확인한다.

운영 검증 제안: 새 토픽 생성 직후와 대상 토픽 생성 확인 뒤에 서로 다른 이벤트 ID를 발행하고, 선택한 복제 시작 조건에서 어느 레코드가 도착하는지 비교한다. 데이터 도착과 consumer group offset 변환의 성공 여부도 따로 확인한다.

## Confluent Cluster Linking의 offset 보존과 장애 전환

부분 검증(2026-10-14): Confluent Cloud의 mirror topic 문서를 대조했다. 앞 절의 MSK Replicator와 다른 제품 계약이며 문서 전체의 검증일은 유지한다.

Mirror topic은 원본 레코드의 바이트와 offset을 보존하는 **비동기 복제본**이다. Offset이 같다는 사실은 최신 메시지가 이미 도착했다는 뜻이 아니다. 토픽 설정, consumer group offset과 ACL의 동기화도 비동기로 진행된다.

- **소비 위치:** consumer group offset 동기화의 `consumer.offset.sync.enable` 기본값은 `false`다. 동기화를 켜고 필요한 그룹 필터를 지정했는지 별도로 확인한다.
- **계획된 전환:** `promote`는 메시지, 설정과 소비 위치의 지연이 없는지 확인하므로 원본 클러스터에 연결할 수 있어야 한다.
- **장애 전환:** `failover`는 원본의 접근 가능 여부와 복제 지연에 관계없이 전환할 수 있다. 아직 복제되지 않은 데이터의 손실 가능성을 전환 성공과 구분한다.
- **복귀:** 양방향 링크의 `truncate-and-restore`는 기존 원본을 새 원본의 mirror로 바꾸면서 분기된 레코드를 잘라낼 수 있다. 데이터 보존과 재처리 계획을 확인한 뒤 복귀 절차를 정한다.

운영 검증 제안: 원본과 복제본의 마지막 offset, 동기화된 그룹 위치, 생산자와 소비자의 실제 접속 대상을 각각 확인한다. 링크 구성만으로 클라이언트 전환이나 무손실 복구가 완료됐다고 판단하지 않는다.

## 출처

- [Amazon MSK, Understand MSK Connect](https://docs.aws.amazon.com/msk/latest/developerguide/msk-connect.html)
- [Amazon MSK, Use Debezium source connector with configuration provider](https://docs.aws.amazon.com/msk/latest/developerguide/mkc-debeziumsource-connector-example.html)
- [AWS News Blog — Introducing Amazon MSK Connect](https://aws.amazon.com/blogs/aws/introducing-amazon-msk-connect-stream-data-to-and-from-your-apache-kafka-clusters-using-managed-connectors/)
- [Amazon Web Services Korea — Amazon MSK Connect를 활용해 쉽게 DB 데이터를 S3로 이동하기](https://www.youtube.com/watch?v=MQ6Zvsqxpfc)
- [Confluent Documentation, Manage Mirror Topics for Cluster Linking on Confluent Cloud](https://docs.confluent.io/cloud/current/multi-cloud/cluster-linking/mirror-topics-cc.html)
- [Amazon MSK, Consumer group offset synchronization](https://docs.aws.amazon.com/msk/latest/developerguide/msk-replicator-bidirectional-offset-sync.html)
- [Amazon MSK, Create a replicator using the AWS console](https://docs.aws.amazon.com/msk/latest/developerguide/msk-replicator-create-console.html)
- [Amazon MSK, How replication works](https://docs.aws.amazon.com/msk/latest/developerguide/msk-replicator-how-replication-works.html)

- [Debezium, Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html)
- [Debezium, Exactly once delivery](https://debezium.io/documentation/reference/configuration/eos.html)
- [Debezium, MySQL connector](https://debezium.io/documentation/reference/stable/connectors/mysql.html)
- [우아한형제들 — 우리팀은 카프카를 어떻게 사용하고 있을까](https://techblog.woowahan.com/17386/)

## 관련 문서

- [[MQ-Kafka|Kafka 인덱스]]
- [[MQ-Kafka-Consumer|컨슈머 구현]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[CDC-Debezium|CDC, Debezium]]
- [[Event-Driven-Patterns|이벤트 드리븐 패턴]]
