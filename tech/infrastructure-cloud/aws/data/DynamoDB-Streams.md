---
tags: [infrastructure, aws, dynamodb, streams, cdc, lambda]
status: done
category: "Infrastructure - AWS"
aliases: ["DynamoDB Streams", "DynamoDB 스트림"]
verified_at: 2026-09-30
---

# DynamoDB Streams — 변경 로그, view type, 소비 구조

> 상위 문서: [[DynamoDB|Amazon DynamoDB]]

DynamoDB Streams는 테이블 아이템의 생성, 수정, 삭제를 시간 순서대로 기록하는 변경 로그(CDC)다. 테이블을 실시간으로 조회하는 기능이 아니라 변경 이벤트를 near-real-time으로 흘려보내는 저장소이며, 레코드는 24시간 보관된다. 스트림은 비동기로 동작해 켜도 테이블 성능에 영향을 주지 않는다.

## StreamViewType 선택

| 값 | 기록 내용 | 쓰임 |
|---|---|---|
| `KEYS_ONLY` | 변경된 아이템의 key 속성 | 변경 알림만 보내고 소비자가 최신 값을 다시 읽을 때 |
| `NEW_IMAGE` | 변경 후 아이템 전체 | 최신 상태 전파, 검색 색인이나 캐시 갱신 |
| `OLD_IMAGE` | 변경 전 아이템 전체 | 삭제된 데이터 보관, 삭제 감사 |
| `NEW_AND_OLD_IMAGES` | 변경 전후 전체 | 변경 diff 감사, 다른 저장소로의 CDC 복제 |

- StreamViewType은 설정 뒤 바꿀 수 없다. 스트림을 끄고 새로 켜야 하며, 새 스트림은 다른 stream ARN을 받으므로 Lambda event source mapping 같은 소비자도 새 ARN으로 바꾼다. 최신 ARN은 `DescribeTable`의 `LatestStreamArn`으로 확인한다
- 끈 스트림의 데이터는 24시간 동안 계속 읽을 수 있고, 그 뒤 자동 삭제된다

## Endpoint와 보장

- DynamoDB와 별도 endpoint(`streams.dynamodb.<region>.amazonaws.com`, dual-stack은 `streams-dynamodb.<region>.api.aws`)를 쓰고 SDK도 별도 client가 필요하다
- 각 stream record는 스트림에 정확히 한 번 나타나고, 같은 아이템(같은 primary key)의 변경은 실제 순서대로 나타난다. 순서 보장은 아이템 단위이며 파티션이나 item collection 전체 순서가 아니다
- 데이터가 바뀌지 않은 `PutItem`, `UpdateItem`은 레코드를 만들지 않는다
- 24시간이 지난 레코드는 언제든 잘릴 수 있다. 소비 지연(`IteratorAge`)이 커지면 레코드를 잃는다

## 소비 구조

- 테이블 파티션마다 전용 shard가 있고 파티션이 늘면 shard도 늘거나 나뉜다. 부모 shard를 자식 shard보다 먼저 처리해야 순서가 유지되며, Lambda와 Kinesis adapter는 이를 대신 처리한다
- 한 shard를 동시에 읽는 reader는 2개 이하로 둔다. 넘으면 throttling될 수 있고 global table에서는 1개를 권장한다
- Lambda는 shard당 인스턴스 1개가 기본이다. `ParallelizationFactor`를 최대 10까지 올려도 같은 partition key 레코드는 같은 배치에서 순서대로 처리된다
- Lambda event source mapping은 레코드를 최소 한 번 처리하므로 실패한 배치를 재시도하며 같은 레코드를 다시 처리할 수 있다. 결제, 알림처럼 부작용이 있는 소비자는 멱등 키로 중복을 막고([[Idempotency-Key|멱등 키]]), partial batch response로 이미 성공한 레코드의 재처리를 줄인다
- 매핑 시작 위치를 `LATEST`로 두면 매핑 생성과 수정 중 이벤트를 놓칠 수 있으므로 누락이 안 되면 `TRIM_HORIZON`을 쓴다

## 팬아웃 예시 — 구매 이벤트 처리

구매 인보이스가 테이블에 저장되면 INSERT 레코드가 Lambda를 호출하고, Lambda가 SNS topic에 발행하면 SNS가 SQS queue로 전달해 결제 소비자가 처리한다. shard당 reader 제한 안에서 소비자를 늘리는 방법이 [[SNS]] 팬아웃이고, [[SQS]]는 소비자 장애와 처리 속도 차이를 흡수하는 버퍼다. Lambda 재시도로 같은 이벤트가 여러 번 발행될 수 있으므로 결제 소비자는 인보이스 ID로 멱등 처리한다. 레코드 삭제를 감지해 알림을 보내는 흐름도 같은 구조에 `OLD_IMAGE`를 쓴다.

## Kinesis Data Streams for DynamoDB와 비교

| 축 | DynamoDB Streams | Kinesis Data Streams for DynamoDB |
|---|---|---|
| 보관 | 24시간 | 최대 1년 |
| shard당 동시 소비자 | 2 | 5, enhanced fan-out이면 20 |
| 순서 | 아이템 단위 수정 순서 보장 | 레코드 timestamp로 실제 순서 판별 |
| 중복 | 스트림에 중복 레코드 없음 | 가끔 중복 가능 |
| 처리 | Lambda, Kinesis adapter | Lambda, Managed Service for Apache Flink, Firehose, Glue streaming ETL |

두 방식은 같은 테이블에 함께 켤 수 있다. 긴 보관, 재처리, 많은 소비자가 필요하면 [[Kinesis]] 쪽을 비교한다.

## 출처

- [AWS DynamoDB — Change data capture for DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)
- [AWS DynamoDB — Change data capture with Amazon DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/streamsmain.html)
- [AWS Lambda — Using AWS Lambda with Amazon DynamoDB](https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html)
- [Sungmin Kim 강사 — DynamoDB Streams](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=60753)

## 관련 문서

- [[DynamoDB|Amazon DynamoDB]]
- [[DynamoDB-DAX|DynamoDB DAX]]
- [[AWS-Lambda-Invocation-Concurrency|Lambda 호출 모델과 event source mapping]]
- [[Kinesis]]
