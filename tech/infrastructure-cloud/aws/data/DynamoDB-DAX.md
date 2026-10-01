---
tags: [infrastructure, aws, dynamodb, dax, cache]
status: done
category: "Infrastructure - AWS"
aliases: ["DynamoDB DAX", "DAX", "DynamoDB Accelerator"]
verified_at: 2026-09-30
---

# DynamoDB DAX — 적합성, 캐시 일관성, 운영 제약

> 상위 문서: [[DynamoDB|Amazon DynamoDB]]

DAX(DynamoDB Accelerator)는 DynamoDB API와 호환되는 클러스터형 인메모리 캐시다. eventually consistent read 응답을 한 자릿수 ms에서 μs로 한 차수 줄이고, 반복 읽기를 캐시가 흡수해 RCU 과잉 프로비저닝을 줄인다. 쓰기는 빨라지지 않는다.

## 동작 — item cache와 query cache

- 클러스터는 primary node 하나와 read replica node로 구성되고 VPC 안에서만 동작한다. 애플리케이션은 AWS 제공 DAX client(Go, Java, Node.js, Python, .NET)로 cluster endpoint에 연결한다. 테이블 생성, 수정 같은 관리 API는 DAX가 처리하지 않으므로 DynamoDB client로 따로 호출한다
- **item cache**: `GetItem`, `BatchGetItem` 결과를 primary key로 저장한다. 기본 TTL은 5분이고 공간이 차면 LRU로 퇴출한다
- **query cache**: `Query`, `Scan` 결과 집합을 요청 파라미터 값 기준으로 저장한다. item cache와 서로 독립이라 `Scan`으로 item cache를 데울 수 없다
- cache miss면 DynamoDB에서 eventually consistent read로 가져와 캐시에 넣고 반환한다. strongly consistent read와 `TransactGetItems`는 DynamoDB로 통과시키고 캐시하지 않는다
- 요청이 노드 용량을 넘으면 `ThrottlingException`을 반환한다. `ThrottledRequestCount`가 계속 보이면 클러스터를 키운다

## 쓰면 좋은 경우와 피할 경우

| 적합 | 부적합 |
|---|---|
| 실시간 입찰, 게임, 트레이딩처럼 가장 빠른 읽기가 필요한 앱 | strongly consistent read가 필요하거나 eventual read를 허용할 수 없는 앱 |
| 하루 특가 상품처럼 일부 핫 키에 읽기가 몰리는 이벤트 | μs 응답도, 반복 읽기 오프로딩도 필요 없는 앱 |
| 읽기 비중이 크고 비용에 민감해 RCU를 줄이려는 앱 | 쓰기 집중 앱. 노드 간 복제가 늘어 자원 소모와 가용성 위험이 커진다 |
| 같은 대량 데이터를 반복해 읽는 분석이 다른 앱의 읽기 용량을 잠식할 때 | 반복 읽기가 적은 앱. 적중률 90% 이상에서 효과가 크고, 낮으면 miss 처리가 클러스터 자원을 소모해 성능과 비용이 오히려 나빠진다 |

## 캐시 일관성 — 어디까지 최신인가

- **write-through 범위**: DAX client로 보낸 `PutItem`, `UpdateItem`, `DeleteItem`, `BatchWriteItem`은 DynamoDB가 성공을 응답한 뒤 item cache에 반영된다. `TransactWriteItems`는 성공 응답 뒤 DAX가 백그라운드에서 `TransactGetItems`로 읽어 item cache를 채운다. DynamoDB 쓰기가 throttling 등으로 실패하면 캐시하지 않는다
- **DAX를 거치지 않은 쓰기**: 다른 서비스, 콘솔, DAX를 쓰지 않는 애플리케이션이 DynamoDB에 직접 쓴 변경은 item cache를 갱신하지 않는다. 해당 key는 item TTL 만료, LRU 퇴출, 다음 DAX 경유 쓰기 전까지 옛 값을 준다. 테이블 변경이 캐시에 자동 반영된다는 설명은 DAX 경유 쓰기에만 맞다
- **query cache**: item 쓰기로 무효화되거나 갱신되지 않는다. 쓴 직후 같은 `Query`는 query TTL이 끝날 때까지 옛 결과를 준다. 결과가 없던 요청도 빈 결과(negative cache)로 저장되어 TTL 동안 유지된다
- **노드 간 복제**: primary node의 변경은 read replica로 eventual하게(보통 1초 미만) 복제되므로 같은 key를 노드에 따라 잠시 다른 값으로 읽을 수 있다
- **대량 적재**: 쓰기 대부분이 다시 읽히지 않는다면 DynamoDB에 직접 쓰는 write-around가 캐시 오염과 쓰기 지연을 줄인다. 대신 위의 불일치를 허용해야 한다. DAX 경유 쓰기는 네트워크 홉이 하나 늘어 조금 느리다
- item cache TTL을 0으로 두면 LRU 퇴출과 write-through로만 갱신되고, query cache TTL을 0으로 두면 `Query` 결과를 캐시하지 않는다

## 운영 제약과 비교

- 고가용성을 위해 3노드 이상을 여러 AZ에 둔다
- 클러스터는 속성 이름 메타데이터를 무기한 유지한다. 타임스탬프, UUID, 세션 ID처럼 끝없이 늘어나는 값을 top-level attribute 이름으로 쓰면 메모리가 고갈될 수 있다(값이 아니라 이름의 문제)
- 지원 Region은 DynamoDB 요금 페이지와 General Reference의 DAX endpoint 목록으로 확인한다. 2026-09-30 endpoint 목록에는 서울(`ap-northeast-2`)이 있다
- ElastiCache(Redis, Valkey, Memcached)는 집계 결과나 세션처럼 애플리케이션이 key와 무효화를 직접 설계하는 범용 캐시다. DAX는 DynamoDB API와 호환되어 client 교체 정도의 작은 변경으로 붙일 수 있지만 무효화 제어가 TTL과 write-through로 제한된다. 캐시 전략 일반론은 [[Cache-Strategies|캐시 전략]]

## 체크포인트

- 반복되는 eventually consistent read에 μs 응답이 필요하면 DAX. strong read, 쓰기 가속, 집계 결과 캐싱은 DAX의 답이 아니다
- DAX를 우회한 쓰기와 query cache가 옛 값을 주는 조건, write-around를 고르는 기준을 설명할 수 있는가

## 출처

- [AWS DynamoDB — In-memory acceleration with DAX](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html)
- [AWS DynamoDB — DAX: How it works](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.concepts.html)
- [AWS DynamoDB — DAX and DynamoDB consistency models](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.consistency.html)
- [AWS General Reference — Amazon DynamoDB endpoints and quotas](https://docs.aws.amazon.com/general/latest/gr/ddb.html)
- [Sungmin Kim 강사 — DAX](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=60469)

## 관련 문서

- [[DynamoDB|Amazon DynamoDB]]
- [[DynamoDB-Streams|DynamoDB Streams]]
- [[ElastiCache|Amazon ElastiCache]]
- [[Cache-Strategies|캐시 전략]]
