---
tags: [infrastructure, aws, dynamodb, streams, cdc, lambda, firehose, athena, analytics]
status: done
category: "Infrastructure - AWS"
aliases: ["DynamoDB Streams", "DynamoDB 스트림", "DynamoDB 분석 적재"]
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

## 분석 적재 — 변경 로그를 S3와 Athena로

2026-10-14 공식 문서와 SDK 소스 부분 대조 기준이다. 운영 테이블을 Scan해 통계를 내면 운영 요청과 읽기 용량을 나눠 쓴다([[DynamoDB#Query와 Scan|Query와 Scan]]). 분석 데이터는 변경 로그나 내보내기로 S3에 쌓고 Athena 같은 엔진에서 조회해 운영 경로와 분리한다.

```
테이블 → Streams → Lambda(형식 변환) → Firehose(버퍼링, 압축, 경로) → S3 → Athena(Glue Data Catalog)
```

- 형식 변환: 스트림 이미지는 `{"S": "..."}`, `{"N": "101"}`처럼 타입을 감싼 DynamoDB JSON이며 숫자도 문자열로 전달된다. Lambda에서 JavaScript SDK v3 `@aws-sdk/util-dynamodb`의 `unmarshall()` 등으로 일반 JSON으로 바꾸고 분석에 쓰지 않는 속성을 뺀다. `unmarshall()`의 기본 변환은 안전 정수 범위를 넘는 정수를 BigInt로 바꾸고, BigInt는 `JSON.stringify`에서 TypeError를 낸다. 64비트 ID를 Number 타입으로 저장했다면 `wrapNumbers`에 함수를 넘겨 원래 표현을 유지한다. 이 함수는 모든 Number 속성의 문자열을 받으므로 문자열을 그대로 돌려주면 개수나 시각까지 문자열이 되어 Athena 열 타입이 바뀐다. 안전 정수 범위를 넘는 값만 문자열로 돌려주는 식으로 고르며, 함수 형태는 3.689.0(2024-11-11)부터 지원한다.
- 레코드 경계: Firehose는 S3로 보낼 때 레코드를 구분자 없이 이어 붙이는 것이 기본이다. Athena의 JSON SerDe는 한 줄에 레코드 하나를 기대하므로 레코드마다 줄바꿈을 붙이거나 Firehose의 줄바꿈 구분자 설정을 켠다.
- 묶음과 객체 크기: `PutRecordBatch`는 요청당 500개, 4 MB까지 받는다. 호출이 성공해도 일부 레코드가 실패할 수 있으므로 `FailedPutCount`를 확인해 실패한 레코드만 다시 보낸다. Firehose는 S3 대상에서 버퍼 크기 1~128 MiB(기본 5)와 간격 0~900초(기본 300) 중 먼저 충족한 조건으로 객체를 쓰며, 작은 스트림 레코드를 묶어 객체 수를 줄이는 단계가 된다. 간격을 60초 미만으로 두면 multipart upload로 S3 `PUT` 비용이 늘 수 있다. 압축은 GZIP, Snappy, Zip, Hadoop-Compatible Snappy 중에서 고르고, Parquet, ORC 변환의 스키마 조건은 [[Log-Pipeline#객체 저장소 경로에서 적재와 카탈로그를 구분한다|로그 파이프라인]]을 따른다.
- 경로의 시각: 기본 경로 `yyyy/MM/dd/HH`와 `timestamp` 식은 그 객체에 담긴 가장 오래된 레코드가 Firehose에 도착한 시각(기본 UTC)으로 계산된다. 아이템이 바뀐 시각이 아니므로 경계 부근 레코드는 앞뒤 시간 경로에 섞여 들어갈 수 있고, 소비가 밀리면 더 늦은 경로로 간다. 사건 시각으로 집계할 때는 경로 범위에 여유를 두고 본문의 시각 속성으로 다시 거른다.
- 파티션 등록: 기본 경로는 Hive 형식(`key=value`)이 아니어서 `MSCK REPAIR TABLE`이 파티션으로 등록하지 못한다. `year=!{timestamp:yyyy}/`처럼 Hive 형식 prefix를 쓰거나(식을 넣은 prefix에는 `ErrorOutputPrefix`도 지정해야 하고, 그 값에 식을 쓰면 `!{firehose:error-output-type}`를 넣는다) `ALTER TABLE ADD PARTITION`, partition projection 또는 폴더 단계를 파티션 열로 잡는 Glue crawler를 쓴다([[Athena#조회가 성공했는데 결과가 0건일 때|Athena 파티션 진단]]). 레코드 값으로 경로를 나누는 dynamic partitioning은 Firehose 스트림을 만들 때만 켤 수 있고 켠 뒤에는 끌 수 없다. 활성 파티션이 스트림당 기본 500개에 닿으면 나머지 레코드는 오류 prefix로 간다.

### 버전, 삭제와 누락

- 수정마다 변경 뒤 이미지 전체가 새 레코드가 되므로 S3에는 같은 키의 여러 버전이 쌓인다. Lambda event source mapping의 재처리와 `PutRecordBatch` 재호출도 중복을 만들 수 있다. 현재 상태를 집계할 때는 아이템에 둔 갱신 시각이나 버전 속성으로 키별 최신 행을 고른다.
- 삭제(`REMOVE`) 레코드에는 `NewImage`가 없다. 공식 예시(`NEW_AND_OLD_IMAGES`)의 `REMOVE`는 `Keys`, `OldImage`와 `SequenceNumber` 같은 메타데이터를 담고, `NEW_IMAGE` 스트림이면 `OldImage`도 없다. 변경 뒤 이미지만 저장하면 삭제가 빠져 지워진 항목이 계속 집계되므로 키와 이벤트 종류를 삭제 표시로 남긴다. 삭제 전 값이 필요하면 `NEW_AND_OLD_IMAGES`를 고른다. TTL 만료 삭제는 `userIdentity`의 type `Service`, principalId `dynamodb.amazonaws.com`로 사용자 삭제와 구분하며, global table에서는 TTL이 실행된 리전의 레코드에만 이 값이 있다.
- 실패 배치는 기본 설정에서 레코드가 만료될 때까지 재시도되어 해당 shard를 최대 하루 막을 수 있다. `MaximumRetryAttempts`, `MaximumRecordAgeInSeconds`와 OnFailure 대상을 정한다. SNS, SQS 대상에는 shard와 sequence 범위만 남으므로 만료 전에 스트림에서 다시 읽어야 하고, S3 대상에는 원본 호출 레코드도 함께 남는다. Direct PUT으로 받은 레코드도 Firehose가 24시간 안에 S3에 전달하지 못하면 잃는다.
- PITR이 그 구간에 이미 켜져 있었고 구간이 PITR 복구 기간 안이면 버려진 구간을 아래 incremental export로 다시 채울 수 있다. 출력은 DynamoDB JSON 또는 Amazon Ion이라 같은 변환과 키별 최신 행 선택을 거쳐 합친다. 기본 view type에서도 구간 시작 직전 상태(old image)와 구간의 최종 상태(new image)만 담기므로 중간 버전은 되살리지 못한다.

### 조인과 대안 경로

RDB 같은 다른 저장소의 데이터는 Glue job으로 S3에 스냅숏을 쓰고 crawler나 DDL로 Data Catalog에 등록해 Athena에서 조인한다. Athena Federated Query의 data source connector로 원본을 직접 조회할 수도 있으며, 이때는 조회 시점에 원본 DB를 읽는다. 커넥터 유형에 따라 계정에 Lambda 함수가 필요하고, 2026-04-21 이후 만든 일부 Glue Data Catalog 연동 커넥터는 계정의 Lambda를 쓰지 않는다.

| 경로 | 특성 | 맞는 경우 |
|---|---|---|
| Streams, Lambda, Firehose | Firehose 버퍼 간격 수준의 지연, 변환과 경로를 직접 운영 | 변경을 계속 쌓고 변환 규칙을 소유할 때 |
| Kinesis Data Streams for DynamoDB와 Firehose | 소비 Lambda 없이 Firehose를 연결하지만 이미지는 DynamoDB JSON이라 평탄화에는 Firehose 변환 Lambda나 Athena 중첩 파싱이 필요, 최대 1년 보관, 가끔 중복, S3 전달 재시도는 스트림 보관 기간까지 | 긴 재처리 구간이나 여러 소비자가 필요할 때 |
| Export to S3 (full, incremental) | PITR 필요, RCU를 쓰지 않고 테이블 성능에 영향 없음, 출력은 DynamoDB JSON 또는 Amazon Ion, 완료 시간 SLA 없음. incremental은 15분~24시간 구간에서 바뀐 항목의 최종 상태(기본 view type은 구간 직전 상태도)만 담음 | 배치 분석, Streams 누락 구간 보정 |
| zero-ETL integration | Amazon Redshift, Amazon SageMaker Lakehouse로 관리형 복제. 두 대상 모두 소스 테이블의 PITR과 대상 서비스에 export 권한을 주는 테이블 리소스 기반 정책 필요 | 분석 저장소가 정해져 있고 파이프라인 코드를 줄일 때 |

사례(2022 발표 기준): 당근마켓 채팅은 메인 PostgreSQL에 있던 채팅 데이터를 DynamoDB로 분리한 뒤 이 경로로 분석 데이터를 쌓았다. 방 ID를 파티션 키, 정렬 가능한 메시지 ID를 정렬 키로 두었고, Lambda에서 변경 뒤 이미지만 키-값으로 펴서 Firehose(128 MiB 또는 60초, GZIP, 시간 단위 경로)로 보냈다. PostgreSQL 테이블은 Glue job으로 S3에 덤프해 Athena에서 채팅 데이터와 조인했고, 매일 도는 통계 쿼리는 Step Functions로 관리했다.

이 절의 추가 내용만 대조했으며 문서 전체의 검증일은 유지한다.

## 출처

- [AWS DynamoDB — Change data capture for DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)
- [AWS DynamoDB — Change data capture with Amazon DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/streamsmain.html)
- [AWS Lambda — Using AWS Lambda with Amazon DynamoDB](https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html)
- [AWS Lambda — Tutorial: Using AWS Lambda with Amazon DynamoDB streams](https://docs.aws.amazon.com/lambda/latest/dg/with-ddb-example.html)
- [AWS Lambda — Retain discarded records for a DynamoDB event source in Lambda](https://docs.aws.amazon.com/lambda/latest/dg/services-dynamodb-errors.html)
- [AWS DynamoDB — StreamRecord](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_streams_StreamRecord.html)
- [AWS DynamoDB — AttributeValue](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_AttributeValue.html)
- [AWS DynamoDB — DynamoDB Streams and Time to Live](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-streams.html)
- [AWS DynamoDB — Programming Amazon DynamoDB with JavaScript](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-javascript.html)
- [AWS DynamoDB — DynamoDB data export to Amazon S3: how it works](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataExport.HowItWorks.html)
- [AWS DynamoDB — Requesting a table export in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataExport_Requesting.html)
- [AWS DynamoDB — DynamoDB table export output format](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataExport.Output.html)
- [AWS DynamoDB — Getting started with Kinesis Data Streams for Amazon DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/kds_gettingstarted.html)
- [AWS DynamoDB — DynamoDB zero-ETL integration with Amazon Redshift](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/RedshiftforDynamoDB-zero-etl.html)
- [AWS DynamoDB — Creating a DynamoDB zero-ETL integration with Amazon Redshift](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/RedshiftforDynamoDB-zero-etl-getting-started.html)
- [AWS DynamoDB — DynamoDB zero-ETL integration with Amazon SageMaker Lakehouse](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/amazon-sagemaker-lakehouse-for-DynamoDB-zero-etl.html)
- [AWS DynamoDB — Creating a DynamoDB zero-ETL integration with Amazon SageMaker Lakehouse](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/amazon-sagemaker-lakehouse-for-DynamoDB-zero-etl-getting-started.html)
- [Amazon Data Firehose — Configure buffering hints](https://docs.aws.amazon.com/firehose/latest/dev/create-configure-backup.html#buffering-hints)
- [Amazon Data Firehose — Configure destination settings for Amazon S3](https://docs.aws.amazon.com/firehose/latest/dev/create-destination.html#create-destination-s3)
- [Amazon Data Firehose — Understand data delivery in Amazon Data Firehose](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html)
- [Amazon Data Firehose — Understand custom prefixes for Amazon S3 objects](https://docs.aws.amazon.com/firehose/latest/dev/s3-prefixes.html)
- [Amazon Data Firehose — Enable dynamic partitioning](https://docs.aws.amazon.com/firehose/latest/dev/dynamic-partitioning-enable.html)
- [Amazon Data Firehose — Buffer data for dynamic partitioning](https://docs.aws.amazon.com/firehose/latest/dev/buffering.html)
- [Amazon Data Firehose — Handle data delivery failures](https://docs.aws.amazon.com/firehose/latest/dev/retry.html)
- [Amazon Data Firehose — Transform source data in Amazon Data Firehose](https://docs.aws.amazon.com/firehose/latest/dev/data-transformation.html)
- [Amazon Data Firehose — PutRecordBatch](https://docs.aws.amazon.com/firehose/latest/APIReference/API_PutRecordBatch.html)
- [Amazon Athena — Best practices for reading JSON data](https://docs.aws.amazon.com/athena/latest/ug/parsing-json-data.html)
- [Amazon Athena — MSCK REPAIR TABLE](https://docs.aws.amazon.com/athena/latest/ug/msck-repair-table.html)
- [Amazon Athena — Use Amazon Athena Federated Query](https://docs.aws.amazon.com/athena/latest/ug/federated-queries.html)
- [AWS Glue — Using crawlers to populate the Data Catalog](https://docs.aws.amazon.com/glue/latest/dg/add-crawler.html)
- [MDN — TypeError: BigInt value can't be serialized in JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/BigInt_not_serializable)
- [util-dynamodb convertToNative.ts — aws-sdk-js-v3 GitHub](https://github.com/aws/aws-sdk-js-v3/blob/main/packages-internal/util-dynamodb/src/convertToNative.ts)
- [util-dynamodb CHANGELOG — aws-sdk-js-v3 GitHub](https://github.com/aws/aws-sdk-js-v3/blob/main/packages-internal/util-dynamodb/CHANGELOG.md)
- [2200만 사용자를 위한 채팅 시스템 아키텍처 — AWS Summit Korea 2022](https://www.youtube.com/watch?v=lCxgddyxDyg)
- [Sungmin Kim 강사 — DynamoDB Streams](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=60753)

## 관련 문서

- [[DynamoDB|Amazon DynamoDB]]
- [[DynamoDB-DAX|DynamoDB DAX]]
- [[AWS-Lambda-Invocation-Concurrency|Lambda 호출 모델과 event source mapping]]
- [[Kinesis]]
- [[Athena|Amazon Athena]]
- [[Glue|AWS Glue]]
- [[Log-Pipeline|로그 파이프라인]]
- [[Realtime-Chat-Architecture-Delivery-and-Storage|채팅 메시지 전달 경로와 이력 저장소]]
