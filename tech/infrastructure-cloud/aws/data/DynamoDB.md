---
tags: [infrastructure, aws, dynamodb, nosql, serverless, database]
status: done
category: "Infrastructure - AWS"
aliases: ["DynamoDB", "Amazon DynamoDB"]
verified_at: 2026-09-30
---

# Amazon DynamoDB

AWS 완전관리형 **서버리스 NoSQL** 키-값/문서 데이터베이스. 인스턴스를 직접 프로비저닝하지 않고 테이블의 용량 모드를 선택하며, 일반적인 키 기반 요청에 한 자릿수 ms 지연시간을 목표로 한다. 테이블 크기에는 실질적인 상한을 두지 않지만 항목 크기, 처리량, 계정 및 테이블별 서비스 할당량은 적용된다.

## 핵심 특징

- **서버리스**: 인스턴스 프로비저닝 불필요. On-Demand는 요청량 기반, Provisioned는 설정한 RCU/WCU 기반으로 과금
- **NoSQL**: 스키마를 사전에 모두 정의할 필요 없음. 키 기반 액세스에 최적
- **트랜잭션 지원**: ACID 트랜잭션 (TransactWriteItems, TransactGetItems)
- **IAM 통합** 보안. 빠른 스키마 전개에 적합
- **한 자릿수 ms 지연시간**을 목표로 설계. 처리량은 Provisioned 또는 On-Demand 모드로 확장하지만 서비스 할당량과 파티션별 처리 특성에 따라 스로틀링될 수 있음

## 키 구조

- **Simple primary key**: partition key(PK) 하나. 같은 PK 값을 가진 아이템은 둘일 수 없다
- **Composite primary key**: PK + sort key(SK). 여러 아이템이 같은 PK를 가질 수 있고 (PK, SK) 조합이 유일해야 한다. 고객 ID를 PK, 구매 시각을 SK로 두면 한 고객의 여러 구매를 저장할 수 있는 이유다. 같은 PK를 공유하는 아이템 묶음을 item collection이라 부른다
- PK 값은 내부 hash 함수를 거쳐 물리 파티션을 정하고, 같은 PK의 아이템은 SK 순으로 함께 저장된다. 그래서 PK 선택이 트래픽 분산(hot partition, 아래 스로틀링 절)과 한 번의 Query로 가져올 범위를 함께 정한다. 키 속성 타입은 String, Number, Binary만 된다
- 쿼리는 PK 일치 + SK 조건이 기본. 비키 필드 검색은 **Scan** 또는 **GSI/LSI** 필요
- `PutItem`은 같은 primary key의 아이템이 있으면 오류 없이 통째로 교체한다. 새 아이템만 만들려면 `ConditionExpression`에 `attribute_not_exists(<PK 속성명>)`을 넣고, 덮어썼는지 확인하려면 `ReturnValues=ALL_OLD`로 이전 아이템을 받는다. 키 중복을 insert 실패로 기대하면 조용한 덮어쓰기 사고가 난다

## 보조 인덱스, LSI와 GSI

| 축 | LSI | GSI |
|---|---|---|
| 키 | base table과 같은 partition key, 다른 sort key | base table과 다른 partition key와 sort key 가능 |
| 생성 시점 | 테이블 생성 때만 정의 | 테이블 생성 후 추가, 삭제 가능 |
| 처리량 | base table 처리량 공유 | 별도 처리량과 파티션 사용 |
| 일관성 | eventual 또는 strong read 선택 가능 | eventual read만 지원 |
| 범위 | 같은 partition key의 item collection | 테이블 전체 partition key를 가로질러 조회 |

인덱스는 SQL optimizer가 자동 선택하지 않는다. 요청이 `IndexName`을 명시해야 하며, access pattern에서 역으로 key와 projection을 설계한다. GSI에 write가 전파되므로 읽기 비용만이 아니라 write amplification과 hot key도 함께 본다.

## Query와 Scan

- `Query`는 partition key equality가 필수이고 sort key 조건으로 범위를 좁힌다. 필요한 access pattern이 현재 key로 표현되지 않으면 GSI나 LSI를 설계한다.
- `Scan`은 table 또는 index의 모든 item을 읽은 뒤 filter를 적용한다. `FilterExpression`은 반환량만 줄이고 이미 읽은 데이터의 read capacity는 줄이지 않는다.
- 한 요청은 최대 1MB까지 처리하고 `LastEvaluatedKey`가 있으면 pagination을 이어간다. 대형 table의 online request path에서는 Scan을 피하고, 불가피한 관리 작업은 rate limit, projection, 별도 table 또는 off-peak 실행으로 production traffic을 보호한다.
- `ProjectionExpression`은 반환 속성만 줄이고 소비 RCU는 줄이지 않는다. RCU는 읽은 아이템 수와 크기로 계산된다.
- `Limit`과 1MB 한도는 필터 적용 전에 걸린다. `Limit=10`에 필터를 붙이면 10개보다 적게 오거나 빈 결과와 `LastEvaluatedKey`가 함께 올 수 있다. `ScannedCount`가 크고 `Count`가 작으면 비효율적인 요청이라는 신호이며, 보통 key나 index가 access pattern과 맞지 않는 경우다.
- 최신 N건은 시간 값을 sort key로 두고 `ScanIndexForward=false`, `Limit=N`으로 Query한다. `ConsistentRead=true` Scan은 기본보다 RCU를 두 배 쓴다.
- **Parallel Scan**: 순차 Scan은 한 번에 한 파티션만 읽어 단일 파티션 처리량에 묶인다. `Segment`와 `TotalSegments`로 table이나 index를 논리 분할해 worker마다 요청한다. 세그먼트는 PK hash로 배정되어 불균등할 수 있으므로 세그먼트 수를 늘린다고 빨라진다는 보장이 없다. worker가 많으면 provisioned throughput을 모두 소진할 수 있어 다른 트래픽이 많은 시간을 피하고 요청별 `Limit`으로 worker당 소비를 제한한다.
- Scan이 무난한 곳은 작은 테이블이나 자주 바뀌지 않는 참조용 룩업 테이블 정도다. 대형 테이블 전체 분석은 Scan보다 아래 Export to S3와 Athena를 먼저 비교한다.

## 항목 단위 접근 제어

IAM condition의 `dynamodb:LeadingKeys`로 요청의 partition key가 사용자나 tenant 식별자와 일치할 때만 항목 작업을 허용할 수 있다. 실제 권한은 허용한 API, table과 index ARN, condition을 모두 만족해야 한다. `Scan`은 전체 항목을 읽는 작업이라 이 방식의 partition key 격리 정책과 양립하지 않으므로 허용하지 않는다. 멀티테넌트 경계는 key 설계, 인증된 principal tag와 정책 테스트까지 함께 검증한다.

### IAM action은 API 단위다

IAM action은 DynamoDB API 작업마다 따로 평가된다. `dynamodb:PutItem`은 `dynamodb:BatchWriteItem`을, `dynamodb:GetItem`은 `dynamodb:BatchGetItem`을 포함하지 않는다. 단건 `put_item`은 되는데 boto3 `Table.batch_writer()`(내부적으로 `BatchWriteItem` 호출)로 대량 적재하면 `AccessDeniedException`이 나는 이유다.

- SDK 고수준 helper가 실제로 호출하는 API를 확인해 최소 권한 목록을 만든다. NestJS 서비스에서 AWS SDK for JavaScript v3를 쓸 때도 `BatchWriteCommand`는 `BatchWriteItem` 호출이라 같은 권한이 필요하다. index를 Query하면 `table/<테이블>/index/<인덱스>` 형태의 index ARN도 Resource에 넣는다
- 거부 메시지에 나온 action만 추가하고 `dynamodb:*`로 넓히지 않는다. 배포 전 [[IAM-Policy|IAM Policy Simulator]]로 필요한 action 조합을 확인한다
- 미처리 항목 재시도는 아래 스로틀링 절을 따른다

### 다른 계정의 접근은 양쪽 정책과 대상 ARN을 확인한다

2026-10-09 공식 문서로 대조한 추가 내용이다. 다른 계정의 주체가 테이블을 읽으려면 호출 주체의 identity-based policy와 대상 테이블의 resource-based policy가 모두 해당 action을 허용해야 한다. 호출 역할에 `GetItem`을 허용한 것만으로 다른 계정의 테이블에 접근할 수 있는 것은 아니다.

- 교차 계정 호출의 `TableName`에는 대상 테이블의 전체 ARN을 전달한다. 이름만 주면 요청자 계정의 테이블을 대상으로 처리된다.
- 같은 계정에서는 조건부 resource-based `Allow`만 추가해 기존의 무조건적인 identity-based `Allow`를 제한할 수 없다. 속성 접근을 제한하려면 명시적 `Deny` 등 전체 정책 평가를 검토한다.
- AWS managed KMS key로 암호화한 테이블은 resource-based policy를 통한 교차 계정 접근을 지원하지 않는다. 테이블 정책과 암호화 키의 접근 조건을 따로 확인한다.

이 절만 추가 대조했으며, 문서 전체의 `verified_at`은 갱신하지 않았다.

## 테이블 클래스

| 클래스 | 용도 |
|--------|------|
| **Standard** | 자주 액세스되는 데이터 (기본) |
| **Standard-IA** (Infrequent Access) | 자주 액세스되지 않는 데이터. 스토리지 단가는 낮고 읽기/쓰기 단가는 높으므로 리전별 최신 요금으로 비교 |

## 용량 모드

| 모드 | 특징 |
|------|------|
| **Provisioned** | RCU/WCU 사전 예약. Auto Scaling 가능. 예측 가능한 트래픽 |
| **On-Demand** | 요청량 기반 과금. 트래픽이 변동하거나 예측하기 어려울 때 유리할 수 있으며 Provisioned 대비 비용은 리전과 사용 패턴에 따라 달라짐 |

On-Demand 테이블의 기본 테이블별 할당량은 초당 읽기 40,000 request units와 쓰기 40,000 request units이며 조정 요청이 가능하다. On-Demand에는 provisioned mode와 같은 계정 수준 read/write throughput quota가 적용되지 않는다. 다만 사용자가 정한 최대 처리량, 테이블별 할당량, 이전 피크 대비 급격한 증가와 파티션 키 분포에 따라 요청이 스로틀링될 수 있으므로 자동 확장을 무제한 처리량으로 해석하면 안 된다.

### Provisioned 용량 계산

- **1 RCU**: 최대 4KB 항목을 초당 한 번 strongly consistent read하거나 초당 두 번 eventually consistent read
- **1 WCU**: 최대 1KB 항목을 초당 한 번 write
- 항목 크기는 읽기는 4KB, 쓰기는 1KB 단위로 올림한다. 6KB 항목의 strongly consistent read 한 번은 2 RCU, write 한 번은 6 WCU가 필요하다.
- 필요한 용량은 평균이 아니라 peak request rate, 일관성, item size와 GSI write까지 계산한다. batch 요청도 내부의 각 항목이 capacity를 소비한다.

### TTL

TTL 속성에는 Unix epoch seconds의 Number 값을 저장한다. 만료는 정시 삭제 보장이 아니라 비동기 정리이며 일반적으로 며칠 안에 삭제된다. 삭제 전까지 만료 항목은 읽기와 쓰기가 가능하고 저장 공간과 읽기 비용에도 포함되므로, 즉시 숨겨야 하는 데이터는 query filter나 애플리케이션 조건으로 만료 시각을 검사한다. 원본 리전의 TTL 삭제는 WCU를 소비하지 않지만 Global Table 복제 리전의 삭제 전파는 복제 write capacity를 소비할 수 있다.

### 스로틀링과 재시도

스로틀링은 provisioned capacity 부족뿐 아니라 hot partition, 계정 할당량, on-demand 최대 처리량에서도 발생한다. 예외의 `ThrottlingReason`과 table 또는 index ARN을 CloudWatch 지표와 대조해 원인을 먼저 구분한다.

2026-10-07 AWS 공식 문서로 대조한 진단 절차다. `ThrottlingReasons` 배열의 각 항목에서 `reason`과 `resource` ARN을 읽는다. `reason`은 `Table`/`Index`, `Read`/`Write`, 제한 종류의 조합이다. 예외 이름만으로 테이블 전체 용량 부족이라고 판단하지 않는다.

| 제한 종류 | 먼저 확인할 대상 | 대응 방향 |
|---|---|---|
| `KeyRangeThroughputExceeded` | 해당 테이블/GSI의 `ReadKeyRangeThroughputThrottleEvents` 또는 `WriteKeyRangeThroughputThrottleEvents`, Contributor Insights | hot key와 key range 집중을 구분하고 키 분산이나 요청 속도를 조정 |
| `ProvisionedThroughputExceeded` | 해당 테이블/GSI의 provisioned 용량과 `ReadProvisionedThroughputThrottleEvents` 또는 `WriteProvisionedThroughputThrottleEvents` | 용량, Auto Scaling의 최소/최대값과 목표 사용률 확인 |
| `AccountLimitExceeded` | on-demand 테이블/GSI에 적용되는 리전별 처리량 quota | Service Quotas의 적용값 확인과 증액 검토 |
| `MaxOnDemandThroughputExceeded` | 사용자가 설정한 on-demand 최대 읽기/쓰기 처리량 | 비용 상한 의도와 필요한 처리량을 대조해 설정 조정 |

`IndexWriteProvisionedThroughputExceeded`처럼 ARN이 GSI를 가리키면 그 인덱스의 지표를 본다. GSI 갱신이 밀리면 base table 쓰기도 제한될 수 있다. 테이블의 키가 고르게 분산되어도 GSI의 키가 소수 상태값에 집중되면 GSI에서 병목이 생긴다.

Provisioned Auto Scaling은 목표 사용률을 2분 연속 넘은 뒤 작동하며, 알람 평가와 `UpdateTable` 반영에 추가 시간이 걸린다. 확장 중에는 이전 용량을 넘는 요청이 제한될 수 있다. 짧은 급증을 자동 확장이 즉시 흡수한다고 가정하지 않으며, on-demand 전환도 파티션과 quota 제한을 없애지는 않는다.

- AWS SDK의 제한된 exponential backoff와 jitter를 사용하고 전체 deadline과 최대 시도 횟수를 둔다.
- write 재시도는 조건부 쓰기나 idempotency key로 중복 부작용을 막는다.
- 재시도만 반복하지 말고 partition key 분산, GSI write pressure, capacity 또는 on-demand maximum을 교정한다.
- `BatchWriteItem`, `BatchGetItem`의 미처리 항목만 backoff 후 다시 보낸다.

## DAX (DynamoDB Accelerator)

- **DynamoDB 호환 인메모리 캐시**. eventually consistent read의 cache hit에서 마이크로초 단위 응답을 목표로 하며 strongly consistent read는 DynamoDB로 통과시킴
- 애플리케이션에 AWS 제공 DAX client를 사용하고 DAX cluster endpoint를 지정해야 한다. DynamoDB API와 호환돼 기능 변경은 작을 수 있지만 연결, consistency, cluster 용량과 장애 동작을 검증해야 함
- 개별 객체 캐시 + 쿼리/스캔 캐시 처리. 쓰기는 빨라지지 않고, DAX를 거치지 않은 쓰기와 Query 결과는 TTL 전까지 옛 값을 줄 수 있음
- cf. **ElastiCache**는 일반적 인메모리 캐시 — **집계 결과 저장**에 적합
- 적합성, write-through 범위, query cache, 운영 제약은 [[DynamoDB-DAX|DynamoDB DAX]]

## DynamoDB Streams

- 테이블 수정사항을 near-real-time 변경 로그로 노출. 같은 아이템의 변경 순서를 보장하고 레코드는 스트림에 한 번만 나타남
- 보관 24시간. 소비자는 무제한이 아니며 shard당 동시 읽기 제한이 있다. Lambda, Kinesis Client Library, EventBridge Pipes 등 소비 방식별 한도를 함께 봐야 한다.
- Lambda 트리거로 후속 작업 가능 (이벤트 소싱, CQRS 패턴)
- StreamViewType, 전용 endpoint, 소비 구조와 팬아웃, Kinesis Data Streams 비교는 [[DynamoDB-Streams|DynamoDB Streams]]

## Global Table

- 여러 리전 간 **다중 활성** 복제 (Multi-Active, Multi-Region)
- 각 리전에서 로컬 replica를 읽고 쓰는 다중 리전 구성을 지원한다. 실제 저지연과 DR은 consistency mode, 애플리케이션 라우팅과 failover, 충돌 처리, RTO/RPO 시험까지 갖춰야 달성됨

## 백업, 복구

- **PITR (Point-In-Time Recovery)**: 기본 35일, 1-35일로 설정 가능한 연속 백업에서 초 단위 복원 지점 선택
- **On-Demand 백업**: 삭제할 때까지 무기한 보존

## S3 통합

- **Export to S3** (PITR 필요): Dynamo → S3 → Athena 쿼리 가능
- **Import from S3** (CSV/JSON/ION): S3 객체를 새 테이블로 가져오기

## 시험 빈출 포인트

- **서버리스, NoSQL, 자동 확장** 키워드 → DynamoDB
- 반복되는 eventually consistent read에서 마이크로초 단위 cache 응답 필요 → DAX 검토
- 집계 결과 캐싱 → ElastiCache
- 여러 리전 active-active → Global Table
- 테이블 변경 → Lambda 트리거 → DynamoDB Streams
- S3 객체에서 Athena로 쿼리 → DynamoDB Export to S3

## 출처

- [AWS DynamoDB — Cross-account access with resource-based policies](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/rbac-cross-account-access.html)
- [AWS DynamoDB — Authorization with IAM identity-based policies and DynamoDB resource-based policies](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/rbac-auth-iam-id-based-policies-DDB.html)
- [AWS DynamoDB — Resource-based policy considerations](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/rbac-considerations.html)
- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
- [AWS DynamoDB 서비스 할당량](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html)
- [AWS DynamoDB On-Demand 용량 모드와 최대 처리량](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode-max-throughput.html)
- [AWS DynamoDB Accelerator 개요](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html)
- [AWS DynamoDB PITR](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html)
- [AWS DynamoDB — Core components and secondary indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html)
- [AWS DynamoDB — Query and Scan best practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html)
- [AWS DynamoDB — Scan API](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html)
- [AWS DynamoDB — Provisioned capacity mode](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/provisioned-capacity-mode.html)
- [AWS DynamoDB — Fine-grained access conditions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html)
- [AWS DynamoDB — Time to Live](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html)
- [AWS DynamoDB — Error handling and exponential backoff](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.Errors.html)
- [AWS DynamoDB — Troubleshooting throttling](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TroubleshootingThrottling.html)
- [AWS DynamoDB — Diagnosing throttling](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/throttling-diagnosing-workflow.html)
- [AWS DynamoDB — Managing throughput capacity automatically with DynamoDB auto scaling](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/AutoScaling.html)
- [AWS DynamoDB — Understanding Global Secondary Index (GSI) write throttling and back pressure](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/gsi-throttling.html)
- [AWS DynamoDB — PutItem API](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html)
- [AWS DynamoDB — Query API](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html)
- [AWS DynamoDB — Scanning tables](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html)
- [AWS DynamoDB — API permissions reference](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/api-permissions-reference.html)
- [AWS Service Authorization Reference — Actions, resources, and condition keys for Amazon DynamoDB](https://docs.aws.amazon.com/service-authorization/latest/reference/list_dynamodb.html)
- [Boto3 — DynamoDB Table.batch_writer](https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/batch_writer.html)
- [Sungmin Kim 강사 — DynamoDB란?](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=58198)
- [Sungmin Kim 강사 — DynamoDB 실습 1부](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=60033)
- [Sungmin Kim 강사 — DynamoDB 실습 2부](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=60038)
- [Sungmin Kim 강사 — DynamoDB Index](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=58839)
- [Sungmin Kim 강사 — Query VS Scan](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=59591)
- [Sungmin Kim 강사 — DAX](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=60469)
- [Sungmin Kim 강사 — DynamoDB Streams](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=60753)
- [Sungmin Kim 강사 — Provisioned Throughput](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=74226)
- [Sungmin Kim 강사 — Access Control](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=69317)
- [Sungmin Kim 강사 — TTL](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=69318)
- [Sungmin Kim 강사 — Provisioned Throughput Exceeded와 Exponential Backoff](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=69316)
