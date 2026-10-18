---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Kafka, Kinesis와 Pub/Sub의 스트림 계약

streaming sync는 장시간 실행되며 재시작도 예상 중단에 포함한다. 문서상 Foundry worker는 적어도 48시간마다 재시작하고 대기 자원에 따라 수분의 중단이 생길 수 있다. legacy agent는 유지보수 창의 중단을 확인하고 두 agent를 쓰면 창을 겹치지 않게 한다. 이것이 무중단 SLA는 아니다.

## Kafka

기본 key/value는 binary이고 key가 없으면 null이다. payload를 자동 해석하지 않으므로 후속 streaming transform에서 parse한다. Schema Registry URL과 등록 schema를 구성하면 Avro/Protobuf/JSON을 first-class type으로 해석할 수 있다.

기본 consumer thread 하나를 늘릴 수 있지만 partition보다 많은 thread는 이득이 없다. Topic Read는 sync/exploration, Write는 export에 필요하다. bootstrap host의 DNS egress와 실제 broker 경로를 맞춘다.

SSL/SASL_SSL, username/password, OAuth client credentials, Azure Event Hubs Entra service principal과 legacy Kerberos의 조건을 나눈다. Event Hubs SAS는 username `$ConnectionString`, password에 connection string을 넣는다. NONE은 PLAINTEXT이므로 인증과 전송 암호화가 없다.

hostname identification 기본은 HTTPS이며 NONE은 검증을 끈다. mTLS의 client certificate/private key와 server CA를 각각 구성하고 direct upload alias `kafka` 조건을 확인한다. OAuth는 token endpoint와 scope/SASL extensions를 맞춘다.

export는 topic 필수, linger 기본 0이다. key column의 null은 지원하지 않으며 value column을 생략하면 전체 row를 bytes로 직렬화한다. header column은 struct이고 각 field는 string으로 해석한다. Base64 decode는 key/value column을 모두 지정한 경우만 켠다. legacy export task는 신규 export와 분리한다.

## Amazon Kinesis

원본 payload는 Unicode string과 partition_key이며 ingestion/Foundry timestamp를 구별한다. 순서는 같은 partition key 안에서만 보장된다. active shard당 consumer 하나를 사용하므로 shard와 처리량 관계를 확인한다.

Foundry worker의 IAM key와 legacy agent의 AWS instance auth를 나눈다. optional STS role에는 ARN/session name, 기본 duration 900초를 확인한다. ListShards/GetShardIterator/GetRecords/DescribeStream과 export PutRecords를 작업별로 부여한다. Kinesis/STS region endpoint egress도 맞춘다.

export partition column은 string이어야 하며 기본은 첫 string column이다. 대상 stream ARN이 필요하다.

## Google Pub/Sub

sync schema는 `id:string`, `data:string`과 맞아야 하고 data는 raw payload다. sync consumer는 하나, export는 Foundry stream partition별 thread를 쓴다.

output dataset별 subscription을 생성하므로 viewer/subscriber 외에 `projects.subscriptions.create`가 필요하다. 같은 topic의 import가 여럿이면 각각 subscription을 만들고 각자 모든 메시지를 읽는다. topic 자체에서 분담한다고 가정하지 않는다.

JSON/PKCS8 service account와 GCP agent 전용 instance auth를 구별한다. export는 publisher 권한과 topic을 지정하며 value column 생략 시 전체 row를 string으로 보낸다. broker 성공/Foundry 상태와 downstream 업무 처리 완료는 별개다.

## 출처

- [Palantir, kafka](https://www.palantir.com/docs/foundry/available-connectors/kafka)
- [Palantir, amazon-kinesis](https://www.palantir.com/docs/foundry/available-connectors/amazon-kinesis)
- [Palantir, pubsub](https://www.palantir.com/docs/foundry/available-connectors/pubsub)

## 관련 문서

- [[Palantir-Connector-Contracts]]
