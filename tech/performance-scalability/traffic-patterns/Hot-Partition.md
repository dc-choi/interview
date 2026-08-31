---
tags: [performance, scalability, partition, sharding, kafka, key-design]
status: done
verified_at: 2026-08-31
category: "성능&확장성(Performance&Scalability)"
aliases: ["Hot Partition", "핫 파티션 대응", "파티션 키 설계", "Salting"]
---

# 핫 파티션 대응 (키 설계, 샤딩, salting)

파티션과 샤드를 늘려도 키가 한쪽으로 몰리면 병렬성은 늘지 않는다. 전체 용량 부족과 국소 편중은 지연 증가, 스로틀, lag 축적이라는 증상이 비슷하지만 처방은 반대다. 용량 부족은 증설로 풀리고, 편중은 증설로 더 나빠질 수도 있다(파티션만 늘고 트래픽은 그대로 한 곳에 남는다). 이 문서는 그 구분과 키 설계, salting, 격리의 트레이드오프를 다룬다.

## 편중이 생기는 지점

- **저카디널리티 키** — 상태 코드, 국가 코드처럼 값의 종류가 적은 컬럼. DynamoDB 문서는 사용자가 많은 서비스의 user ID를 균등한 파티션 키로, 값이 몇 개뿐인 status code를 나쁜 파티션 키로 분류한다.
- **자연 편중** — 값의 종류는 많아도 접근이 몰리는 경우. 같은 문서가 기기 ID를 쓰되 한 기기가 다른 전부보다 훨씬 자주 접근되면 나쁜 설계라고 못박는다. 인기 상품, 대형 테넌트, 도심 H3 셀이 같은 구조다 ([[Geospatial-Matching|위치 기반 매칭]]).
- **단조 증가 키** — 타임스탬프, auto increment. 날짜를 일 단위로 반올림해 파티션 키로 쓰면 그날의 신규 항목이 전부 한 파티션 키 값으로 들어간다. 항상 마지막 파티션만 쓰는 구조가 된다.
- **키 없는 발행을 라운드로빈으로 오해** — Kafka 기본 파티셔너는 키가 없으면 sticky partition을 골라 `batch.size` 바이트가 찰 때까지 그 파티션에 보낸다(Kafka 4.3 `partitioner.class` 문서 기준). 레코드 단위 균등 분배를 원하면 `RoundRobinPartitioner`를 명시해야 한다.
- **해시 파티션의 분포 착시** — 해시를 쓴다고 균등해지지 않는다. 해시 입력값 자체의 빈도가 치우쳐 있으면 결과도 치우친다 ([[MySQL-Partitioning|MySQL 파티셔닝]], [[Consistent-Hashing|Consistent Hashing]]).

## 진단 — 평균이 편중을 숨긴다

클러스터 평균 CPU, 테이블 총 처리량은 정상인데 특정 요청만 스로틀되는 상태가 편중의 전형이다. DynamoDB는 파티션 하나가 초당 3,000 read unit, 1,000 write unit을 상한으로 두므로(2026-08-31 개발자 안내서 기준), 테이블 전체에 여유가 있어도 한 파티션이 그 선을 넘으면 스로틀된다. 진단의 원칙은 하나다. **집계 단위를 파티션과 샤드까지 내려서 본다.**

| 계층 | 봐야 하는 단위 지표 | 편중 신호 | 상세 |
|---|---|---|---|
| Kafka | 파티션별 lag, 파티션별 유입 바이트 | 한 파티션만 lag이 계속 증가 | [[Kafka-Partition-Sizing|파티션 개수 산정]] |
| OpenSearch | 샤드별 문서 수와 크기, 노드별 CPU 편차 | 특정 노드만 hot, 429 발생 | [[OpenSearch-Performance-Troubleshooting|성능 트러블슈팅]], [[OpenSearch-Shard-Sizing|샤드 사이징]] |
| DynamoDB | 스로틀 이벤트와 그 파티션 키 값 | 총 사용량은 여유인데 스로틀 | [[DynamoDB|DynamoDB]] |
| Redis | 키별 접근 빈도 | 단일 키에 요청 집중 | [[Hot-Key|hot key 탐지와 대응]] |
| RDBMS 파티션 | 파티션별 행 수와 스캔량 | 한 파티션만 커지고 느려짐 | [[MySQL-Partitioning|MySQL 파티셔닝]] |

파티션 수를 늘렸는데 총 처리량이 안 오르면 용량이 아니라 분포 문제라고 봐야 한다.

## 1차 방어는 키 설계

키 설계는 세 축의 트레이드오프다.

- **카디널리티** — 서로 다른 키 값의 개수. 파티션 수보다 충분히 많아야 분산의 여지가 생긴다.
- **분포** — 값의 개수가 아니라 접근 빈도의 평탄함. 카디널리티가 높아도 상위 몇 개에 트래픽이 쏠리면 소용없다.
- **순서와 지역성 요구** — 같은 키를 한곳에 모아 얻는 이득. Kafka 설계 문서는 키를 user ID로 잡으면 한 사용자의 데이터가 같은 파티션으로 가고 컨슈머가 지역성을 가정할 수 있다고 설명한다.

카디널리티를 올리는 기본 수단은 **복합 키**다. 날짜만 쓰던 키를 `날짜 + 주문 ID`, 셀 ID만 쓰던 키를 `셀 ID + 차량 종류`처럼 보조 차원과 묶는다. 대가는 지역성이다. 키를 잘게 쪼갤수록 같은 키로 모아 처리하던 것들, 즉 Kafka Streams 상태 저장소의 셀별 상황판이나 키 단위 배치 병합이 깨진다. 카디널리티를 올린 만큼 지역성을 잃는다는 것이 이 축의 본질이다.

## Salting — 키 공간을 강제로 넓히기

키에 `key:0`부터 `key:N-1`까지 접미사를 붙여 하나의 논리 키를 N개의 물리 키로 흩는 기법. AWS는 이를 write sharding으로 문서화하며 두 방식을 구분한다.

| 방식 | 접미사 | 단건 조회 | 용도 |
|---|---|---|---|
| random suffix | 쓰기 시점 난수 | 불가 (어느 salt에 썼는지 모름) | 쓰기 처리량만 필요한 적재 |
| calculated suffix | 조회 축의 해시(예: 주문 ID mod N) | 가능 (같은 값을 재계산) | 단건 조회가 필요한 경우 |

비용은 명확하다.

- **읽기 fan-out** — 논리 키 전체를 읽으려면 N개 키를 모두 조회해 애플리케이션이 병합해야 한다. AWS 예시는 접미사를 1~200으로 잡고, 하루치를 읽으려면 200번의 Query를 날려 결과를 합치라고 설명한다. N을 키우면 쓰기는 퍼지지만 읽기 왕복이 그만큼 늘어난다.
- **쓰기와 무효화의 N배** — 캐시처럼 복제형 salting을 쓰면 갱신과 무효화를 N개 키 전부에 반복해야 한다 (단일 키 관점의 상세는 [[Hot-Key|hot key 대응]]).
- **N 선정** — 분산의 이론상 상한은 `min(salt 수, 파티션 수)`지만 실제 점유 파티션 수는 해시 충돌 때문에 더 작을 수 있다. 파티션 수의 배수로 잡아도 균등 분산은 보장되지 않는다. 실제 파티셔너로 salt별 매핑을 시뮬레이션하거나 측정하고, 필요한 분산이 나오는 최소 N만 쓴다. 파티션 수보다 큰 N은 점유를 개선할 여지가 작아지는 반면 읽기 fan-out은 계속 늘어난다.
- **N 변경의 잔재** — salt 수를 나중에 바꾸면 이미 적재된 데이터는 옛 배치로 남는다. 읽기 측은 한동안 옛 범위와 새 범위를 모두 훑어야 하므로, 전환 구간의 조회 규칙을 미리 정해 둔다.

전체 키에 일괄 적용하지 말고 **상위 몇 개의 핫 키만 salting하는 하이브리드**가 현실적이다. 나머지 키는 fan-out 비용 없이 단순 조회를 유지한다.

## 순서 보장과의 상충

키 단위 순서는 같은 키가 같은 파티션에 간다는 전제에서 나온다. salting은 그 전제를 정면으로 깬다. 순서와 분산을 동시에 요구받으면 둘 중 하나를 포기해야 하고, 판단 기준은 **그 순서가 인과인지**다.

- **salting 금지** — 잔액 변경, 주문 상태 전이처럼 이전 이벤트가 다음 이벤트의 전제인 흐름. 이 경우 키는 인과 단위(계좌 ID, 주문 ID)로 유지한다.
- **salting 가능** — 조회 로그, 노출 집계처럼 최종 집계만 맞으면 되는 이벤트.
- **키를 안 쪼개고 병렬성만 올리기** — 파티션 키는 인과 단위로 두고, 컨슈머 안에서 하위 키별 워커로 갈라 처리한다. 파티션 수를 늘리지 않고 소비 측 병렬성만 키우는 방식이며, 순서 보장 메커니즘 자체는 [[MQ-Kafka-Event-Ordering|Kafka 이벤트 순서 보장]] 참고.

## 핫 파티션 격리와 사후 재분배

키를 못 바꾸거나 편중이 특정 소수에 고정돼 있으면, 그 소수를 떼어내는 격리가 남는다.

| 방식 | 대상 | 이득 | 운영 비용 |
|---|---|---|---|
| 전용 토픽, 전용 인덱스 | 상위 N개 테넌트, 도심 셀 | 나머지 트래픽을 오염에서 분리 | 라우팅 규칙과 상위 N 목록의 지속 관리 |
| 전용 샤드, 전용 노드 | 대형 테넌트 | 자원 상한을 개별로 조정 | 인프라 수와 비용 증가 |
| 요청 병합, 로컬 캐시 | 읽기 편중 | 하위 계층 도달 자체를 줄임 | 일관성 지연 ([[Cache-Stampede|cache stampede]]) |

플랫폼의 사후 재분배도 있지만 상한은 남는다. DynamoDB adaptive capacity는 트래픽이 몰린 파티션의 처리량을 자동으로 올리고, 자주 접근되는 항목들이 같은 파티션에 있지 않도록 재배치한다. 다만 테이블 총 용량과 파티션 최대치(3,000 RCU, 1,000 WCU) 안에서만 동작하고, local secondary index가 있는 테이블에서는 item collection을 여러 파티션으로 나누지 않는다. burst capacity는 미사용 용량을 최대 5분(300초)치까지 보관하므로 짧은 스파이크는 흡수하지만 지속되는 편중은 막지 못한다(문서 기준 2026-08-31, AWS는 이 수치가 바뀔 수 있다고 명시).

## 흔한 실수

- 파티션 수만 늘리고 키는 그대로 둔다. 분포가 그대로면 처리량도 그대로다.
- 평균 지표로 정상 판정. 노드 평균 CPU와 테이블 총 처리량은 단일 파티션 스로틀을 보여주지 않는다.
- 순서 보장이 필요한 스트림에 salting 적용. 집계는 맞는데 상태 전이가 뒤집힌다.
- salt 수를 파티션 수와 무관하게 잡아, N을 키웠는데 실제로는 몇 개 파티션에만 몰린다.
- 읽기 fan-out 비용을 계산하지 않고 salting 도입. 쓰기 병목을 읽기 병목으로 옮긴다.
- 키 없이 발행하면 알아서 균등해진다고 가정. sticky partition 동작을 확인하지 않는다.

## 면접 체크포인트

- 파티션을 늘렸는데 처리량이 안 오르는 이유 → 병목이 용량이 아니라 키 분포
- 용량 부족과 편중을 어떻게 구분하나 → 집계를 파티션, 샤드 단위로 내려 편차를 본다
- salting의 대가 두 가지 → 읽기 fan-out과 순서 보장 상실
- 순서 보장과 분산을 동시에 요구받으면 → 인과 단위는 키로 지키고 병렬성은 컨슈머 내부로 옮긴다
- 위치 기반 키의 도심 쏠림을 어떻게 푸나 → 해상도 조정, 보조 차원 복합 키, 핫 셀만 격리
- 키 없는 Kafka 발행이 균등 분배인가 → 기본 파티셔너는 sticky partition이며 라운드로빈은 별도 설정

## 출처

- [Amazon DynamoDB, Best practices for designing and using partition keys effectively in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html)
- [Amazon DynamoDB, Designing partition keys to distribute your workload in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-uniform-load.html)
- [Amazon DynamoDB, Using write sharding to distribute workloads evenly in your DynamoDB table](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html)
- [Amazon DynamoDB, DynamoDB burst and adaptive capacity](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html)
- [Apache Kafka 4.3 — Design](https://kafka.apache.org/43/design/design/)
- [Apache Kafka 4.3 — Producer Configs](https://kafka.apache.org/43/generated/producer_config.html)

## 관련 문서

- [[Hot-Key|Redis hot key 탐지와 대응 (키 단위 편중)]]
- [[Consistent-Hashing|Consistent Hashing (링 기반 재배치와 virtual node)]]
- [[Kafka-Partition-Sizing|Kafka 파티션 개수 산정]]
- [[MQ-Kafka-Event-Ordering|Kafka 이벤트 순서 보장]]
- [[OpenSearch-Performance-Troubleshooting|OpenSearch 성능 트러블슈팅 (hot shard 진단)]]
- [[OpenSearch-Shard-Sizing|OpenSearch 샤드 사이징]]
- [[Sharding|샤딩 (키에서 서버로의 매핑)]]
- [[Redis-Cluster-Sharding|Redis Cluster hash slot]]
- [[MySQL-Partitioning|MySQL 파티셔닝]]
- [[DynamoDB|DynamoDB (용량 모드와 스로틀링)]]
- [[Geospatial-Matching|위치 기반 매칭 (도심 셀 편중)]]
- [[Traffic-Spike-Query-Types|트래픽 폭증과 질의 유형]]
