---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-11-26
category: "AI엔지니어링(AIEngineering)"
---

# Kafka, Kinesis와 Pub/Sub의 스트림 계약

streaming sync는 장시간 실행되며 재시작도 예상 중단에 포함한다. 문서상 Foundry worker는 적어도 48시간마다 재시작하고 대기 자원에 따라 수분의 중단이 생길 수 있다. legacy agent는 유지보수 창의 중단을 확인하고 두 agent를 쓰면 창을 겹치지 않게 한다. 이것이 무중단 SLA는 아니다.

## 수집 방향과 커넥터 범위

Streaming resource guide는 stream 데이터를 Foundry로 들이는 경로를 둘로 나눈다. 하나는 Data Connection이 streaming platform에서 record를 당겨 오는 pull 방식이다. Guide는 이를 batch sync처럼 agent architecture의 단방향 연결로 설명하지만, Kafka connector 문서는 streaming sync를 Foundry worker(인터넷 direct connection 또는 agent proxy)에서 돌리기를 권하고 agent worker는 legacy로 둔다. 다른 하나는 외부 stream이 stream proxy를 통해 Foundry stream에 record를 직접 넣는 push 방식이다. Push는 원천 쪽 producer를 고쳐 Foundry로 보내게 할 수 있을 때의 선택지이고, Foundry 인증이나 표준 stream schema를 맞출 수 없는 inbound webhook은 [[Palantir-Listener-Integration-and-Rotation|Listener]] 경로를 본다. 둘 다 어려우면 pull 경로의 connector 지원부터 확인한다(적용 판단). 지원되는 장시간 sync의 continuous compute 실행 모드는 [[Palantir-Connection-Capability-Boundaries|연결 기능 경계]]에 정리했다.

2026-11-26 확인한 guide가 전용 커넥터가 있는 streaming 원천의 예로 드는 것은 Apache Kafka, Amazon Kinesis, Amazon SQS, Aveva PI, Google Pub/Sub이다. 전용 커넥터가 없는 원천은 external transform으로 연결할 수 있으며, guide는 ActiveMQ, Amazon SNS, IBM MQ, RabbitMQ, Solace와 MQTT([Beta] 표기)를 예로 든다. 두 목록은 예시이며 수집(sync) 기준의 분류다. Exports 문서는 Solace source type을 streaming export 대상에 올리고 있어([[Palantir-Export-State-and-Governance|export 상태와 거버넌스]]), 방향별 지원은 connector별 capability 표에서 다시 확인한다. External transform은 소비 위치와 중복 처리를 사용자 코드가 맡으므로(Kafka라면 아래 예제의 offset 관리) 전용 커넥터의 streaming sync와 같은 운영 계약으로 보지 않는다(적용 판단).

## Kafka

기본 key/value는 binary이고 key가 없으면 null이다. payload를 자동 해석하지 않으므로 후속 streaming transform에서 parse한다. Schema Registry URL과 등록 schema를 구성하면 Avro/Protobuf/JSON을 first-class type으로 해석할 수 있다.

기본 consumer thread 하나를 늘릴 수 있지만 partition보다 많은 thread는 이득이 없다. Topic Read는 sync/exploration, Write는 export에 필요하다. bootstrap host의 DNS egress와 실제 broker 경로를 맞춘다.

SSL/SASL_SSL, username/password, OAuth client credentials, Azure Event Hubs용 Azure AD service principal의 조건을 나눈다. Kerberos는 인증 방식 목록에만 있고 문서에 설정 항목이 없다. Event Hubs SAS는 username `$ConnectionString`, password에 connection string을 넣는다. NONE은 PLAINTEXT이므로 인증과 전송 암호화가 없다.

hostname identification 기본은 HTTPS이며 NONE은 검증을 끈다. mTLS의 client certificate/private key와 server CA를 각각 구성하고 direct upload alias `kafka` 조건을 확인한다. OAuth는 token endpoint와 scope/SASL extensions를 맞춘다.

export는 topic 필수, linger 기본 0이다. key column의 null은 지원하지 않으며 value column을 생략하면 전체 row를 bytes로 직렬화한다. header column은 struct이고 각 field는 string으로 해석한다. Base64 decode는 key/value column을 모두 지정한 경우만 켠다. legacy export task는 신규 export와 분리한다.

### 외부 transform의 Kafka 읽기와 쓰기

streaming sync와 export로 부족한 경우 source를 external transform에 가져와 `kafka-python`의 `KafkaConsumer`/`KafkaProducer`를 직접 쓴다. 2026-11-24 확인한 문서의 기본 읽기와 쓰기 예제는 `@external_systems(kafka_source=Source(...))`, 읽기 예제만 `@incremental()`, 그다음 `@transform.using(output=Output(...))` 순서로 감싸고 `compute(kafka_source, output: LightweightOutput)`에서 polars DataFrame을 `output.write_table`로 쓴다. offset 추적 예제는 records와 offsets 두 출력과 `ctx`를 받는다. 2026-10 수집본에서는 기본 읽기 예제가 `@lightweight`와 `@transform_pandas`, 쓰기 예제가 `@lightweight` 없는 `@transform_pandas`로 pandas DataFrame을 반환했고, offset 추적 예제는 그때도 `@transform.using`과 polars를 썼다. lightweight API 문서 기준 `@transform.using`은 transforms 3.68.0 이상과 Code Repositories의 `transformsLangPythonPluginVersion` 1.978.0 이상에서 쓰는 권장 문법이며 기존 `@lightweight` 구문도 계속 지원된다.

- 기본 읽기: consumer group의 auto-commit을 켜고 1분 또는 대략 100개까지 poll한다. 개수는 while 조건에서만 확인하므로 poll 한 번(kafka-python `max_poll_records` 기본 500)에 100개를 넘을 수 있다. kafka-python의 auto-commit은 기본 5초마다 background로 commit하고 close 때도 commit을 시도하며, 예제는 `write_table` 전에 `consumer.close()`를 부른다. 그래서 loop 중 예외(JSON이 아닌 payload 등)나 Foundry 쓰기 실패가 나면 이미 commit된 메시지를 다음 실행에서 다시 읽지 못할 수 있다. Kafka commit에 따른 이 유실을 피하려면 아래 offset 추적 방식을 검토한다.
- offset 추적 읽기: auto-commit을 끄고 `auto_offset_reset="earliest"`로 시작한다. partition 할당을 기다린 뒤 end offset을 기록하고, 이전 실행의 offset dataset(`mode="previous"`)에서 partition별 마지막 offset의 다음 위치로 seek한다. 모든 partition이 end offset에 닿거나 빈 poll이 이어지면 멈추고 records와 offsets를 각각 replace로 쓴다. 새 메시지가 없으면 `ctx.abort_job()`으로 끝낸다. 예제를 그대로 쓰면 records dataset의 현재 view에는 마지막 실행분만 남고, 이번 실행에서 메시지가 없던 partition은 저장 offset이 덮어쓴 map에서 빠져 다음 실행에서 처음부터 다시 읽힌다. 문서는 무손실이나 중복 없음을 명시하지 않고 모든 가용 메시지 처리는 종료 조건의 설명이므로 partition별 offset 병합과 (topic, partition, offset) 기준 중복 제거를 따로 구현한다. 한 실행의 모든 row를 메모리에 모으므로 대량 topic은 버퍼링 Parquet 쓰기를 검토한다.
- 쓰기: producer로 topic에 보낸 뒤 `flush`와 `close`를 부르고 보낸 이벤트를 dataset에 기록한다. 예제의 1분, 2초 간격과 임의 센서 값은 시연용이다.

## Amazon Kinesis

원본 payload는 Unicode string과 partition_key이며 ingestion/Foundry timestamp를 구별한다. 순서는 같은 partition key 안에서만 보장된다. active shard당 consumer 하나를 사용하므로 shard와 처리량 관계를 확인한다.

Foundry worker의 IAM key와 legacy agent의 AWS instance auth를 나눈다. optional STS role에는 ARN/session name, 기본 duration 900초를 확인한다. ListShards/GetShardIterator/GetRecords/DescribeStream과 export PutRecords를 작업별로 부여한다. Kinesis/STS region endpoint egress도 맞춘다.

export partition column은 string이어야 하며 기본은 첫 string column이다. 대상 stream ARN이 필요하다.

## Google Pub/Sub

sync schema는 `id:string`, `data:string`과 맞아야 하고 data는 raw payload다. sync consumer는 하나, export는 Foundry stream partition별 thread를 쓴다.

output dataset별 subscription을 생성하므로 viewer/subscriber 외에 `projects.subscriptions.create`가 필요하다. 같은 topic의 import가 여럿이면 각각 subscription을 만들고 각자 모든 메시지를 읽는다. topic 자체에서 분담한다고 가정하지 않는다.

JSON/PKCS8 service account와 GCP agent 전용 instance auth를 구별한다. export는 publisher 권한과 topic을 지정하며 value column 생략 시 전체 row를 string으로 보낸다. broker 성공/Foundry 상태와 downstream 업무 처리 완료는 별개다.

## 출처

- [Palantir, streaming-guide](https://www.palantir.com/docs/foundry/data-integration/streaming-guide)
- [Palantir, push-based-ingestion](https://www.palantir.com/docs/foundry/data-connection/push-based-ingestion)
- [Palantir, export-overview](https://www.palantir.com/docs/foundry/data-connection/export-overview)
- [Palantir, kafka](https://www.palantir.com/docs/foundry/available-connectors/kafka)
- [Palantir, amazon-kinesis](https://www.palantir.com/docs/foundry/available-connectors/amazon-kinesis)
- [Palantir, pubsub](https://www.palantir.com/docs/foundry/available-connectors/pubsub)
- [Palantir, lightweight-api-evolution](https://www.palantir.com/docs/foundry/transforms-python/lightweight-api-evolution)
- [kafka-python, KafkaConsumer](https://kafka-python.readthedocs.io/en/master/apidoc/KafkaConsumer.html)

## 관련 문서

- [[Palantir-Connector-Contracts]]
