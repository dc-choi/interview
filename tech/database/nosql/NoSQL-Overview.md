---
tags: [database, nosql, base, consistency]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["NoSQL Overview", "NoSQL 개요", "RDBMS vs NoSQL", "BASE 모델"]
verified_at: 2026-09-30
---

# NoSQL 개요 — 유형, BASE, RDBMS와의 선택

NoSQL(Not Only SQL)은 행과 열의 고정 테이블 구조에 얽매이지 않는 저장소 계열이다. 정해진 스키마 없이 다양한 형식의 데이터를 담을 수 있어, 데이터 구조가 자주 바뀌거나 대규모 분산 처리가 필요한 환경에서 유리하다. 대신 복잡한 조인이나 정교한 다중 테이블 쿼리에는 상대적으로 약하다.

RDBMS와의 관계는 "무엇이 더 좋은가"가 아니라 **"무엇에 더 적합한가"**의 문제다. RDBMS는 정교한 장부, NoSQL은 빠르고 유연한 보관함에 가깝다.

## NoSQL 유형

| 유형 | 저장 형태 | 적합한 경우 | AWS 예 |
|---|---|---|---|
| **Key-Value** | 키 - 값 쌍 (값은 단순 blob부터 구조체까지) | 세션, 설정값, 캐시, 단순 조회 — `game_setting` 키에 난이도/언어/사용자 정보를 한 번에 | DynamoDB, MemoryDB |
| **Document** | JSON 유사 문서 | 구조가 조금씩 다른 데이터 — 사용자 프로필, 상품 상세, 책 정보 | DocumentDB |
| **Graph** | 노드 + 엣지(연결 관계) | "누가 누구와 연결되어 있나" — 소셜 친구 관계, 추천 시스템 | Neptune |
| **Wide-Column** | 컬럼 패밀리 | 시계열, 로그, 대량 쓰기 | Keyspaces(Cassandra) |

Document 모델링의 Embed vs Reference 트레이드오프는 [[MongoDB-Schema-Design|MongoDB 스키마 설계]] 참고.

## BASE 모델

BASE는 일시적 불일치를 허용하면서 가용성을 우선하는 설계 관점이다. NoSQL 전체의 필수 계약은 아니며 제품과 연산별 일관성, 트랜잭션 옵션을 확인한다.

- **Basically Available**: 일부 장애와 일시적 불일치 속에서도 가능한 요청에 응답하는 가용성을 우선한다. 모든 장애에서 모든 읽기와 쓰기가 성공하거나 서비스가 100% 가동된다는 보장은 아니다.
- **Soft State**: 데이터 상태가 항상 즉시 확정된 것은 아니다. 외부 입력이 없어도 복제 전파에 따라 상태가 변할 수 있다.
- **Eventual Consistency(최종적 일관성)**: 새 업데이트가 멈추고 변경 전파와 충돌 해결이 진행되면 읽기가 최종 상태로 수렴하는 보장이다. 업데이트 직후엔 이전 값을 볼 수 있으며, 정의만으로 불일치 시간이 몇 초 이하라고 정해지지는 않는다.

ACID는 트랜잭션의 성질이고 CAP는 네트워크 분할 중 선형화 가능성과 가용성의 관계이므로 ACID=CP, BASE=AP로 분류하지 않는다. ACID의 Consistency는 데이터 불변조건을 보존하는 의미이며 모든 replica 읽기의 최신성 보장과 다르다. [[CAP-Theorem|CAP 정리]]와 [[Transactions|트랜잭션, ACID]] 참고.

예를 들어 DynamoDB는 테이블과 LSI에 강한 일관성 읽기를 선택할 수 있고 여러 항목의 원자적 트랜잭션도 제공한다. GSI 읽기는 최종 일관성이므로 같은 NoSQL 제품에서도 접근 경로에 따라 계약이 달라진다. 이 옵션의 상세 범위는 [[DynamoDB]]에서 확인한다.

## RDBMS vs NoSQL 핵심 차이

| 축 | RDBMS | NoSQL |
|---|---|---|
| 강점 | 정확성, 관계, 복잡한 쿼리(조인/집계) | 유연성, 수평 확장성, 높은 가용성 |
| 스키마 | 저장 전에 고정 (강한 설계도) | 스키마리스/유연 |
| 일관성 | 격리 수준과 복제/읽기 경로를 확인 | 강한/최종 일관성과 트랜잭션을 제품, 연산별로 확인 |
| 약점 | 수평 확장과 구조 변경이 신중함 | 복잡한 관계 조회, 엄격한 일관성 작업에 주의 |

**선택 기준**: 돈, 주문, 회원 정보처럼 정확성과 관계가 핵심이면 RDBMS를 먼저 본다. 대규모 트래픽, 빠른 조회, 유연한 데이터 구조, 분산 처리가 중요하면 NoSQL이 후보가 된다. 워크로드가 운영성이냐 분석성이냐의 분리는 [[OLTP-vs-OLAP|OLTP vs OLAP]]와도 연결된다.

## 선택 절차

유형 비교보다 먼저 여섯 가지를 차례로 확인한다.

1. **데이터 성격**: 잘못된 값이 돈, 재고, 예약 같은 되돌리기 어려운 결과로 이어지는가. 그렇다면 제약과 트랜잭션을 DB가 보장하는 RDBMS가 기본값이다. 구조가 정형인지, 자주 바뀌는지도 여기서 본다.
2. **조회 패턴**: 주요 조회가 키 하나로 끝나는 고정 패턴인가, 아니면 조건과 집계가 계속 바뀌는가. NoSQL은 조회 패턴에 맞춰 비정규화해야 성능이 나오므로 패턴이 정해지지 않았으면 설계 근거가 없다.
3. **읽기와 쓰기 비중**: 읽기 중심이면 복제본과 캐시로 풀리는 경우가 많고, 쓰기 중심이면 쓰기 경합과 쓰기 확장 방식이 선택을 가른다.
4. **일관성과 가용성 요구**: 쓰자마자 모든 조회가 최신 값을 봐야 하는가, 잠시 이전 값을 허용하는가. 장애 때 쓰기를 멈출 수 있는가, 고가용성 구성이 필수인가.
5. **규모**: 지금이 아니라 1~2년 안에 예상되는 데이터량과 초당 쓰기 수가 단일 RDBMS의 수직 확장과 읽기 복제본으로 감당되는가. 감당된다면 확장성은 NoSQL을 고를 이유가 되지 않는다.
6. **팀 역량**: 선택한 저장소의 모델링, 장애 대응, 비용 관리를 팀이 할 수 있는가.

확신이 없으면 SQL로 시작하고, NoSQL은 측정으로 확인한 병목에 부분적으로 들인다. 되돌아오는 비용이 비대칭이기 때문이다. RDBMS에서 특정 접근 패턴만 NoSQL로 떼어내는 일은 데이터 복제와 동기화 문제로 끝나지만, NoSQL에서 RDBMS로 돌아올 때는 코드에 흩어진 스키마를 다시 정의하고, 애플리케이션이 대신하던 조인과 트랜잭션 로직을 걷어 내고, 중복 저장된 데이터의 정본을 가려내야 한다.

### 흔한 실수

- **유행이나 막연한 확장성 기대로 도입**: 사용자와 데이터가 적은 단계에서 수평 확장을 이유로 NoSQL을 고르면 조인, 제약, 트랜잭션을 애플리케이션이 떠안는다.
- **스키마리스를 스키마 없음으로 오해**: 스키마가 사라지는 것이 아니라 DB에서 코드로 옮겨 가며, 문서 버전이 섞이면 읽는 쪽 코드가 모든 버전을 처리해야 한다.
- **조회 패턴 없이 문서 모델부터 설계**: embed와 reference 선택은 조회 패턴이 정해져야 판단할 수 있다([[MongoDB-Schema-Design|MongoDB 스키마 설계]]). 나중에 정규화가 필요해지면 `$lookup` 같은 서버 측 조인이나 여러 번 조회한 뒤 애플리케이션에서 합치는 방식 사이에서 타협하게 된다.
- **NoSQL 위에 분산 트랜잭션 재구현**: 여러 항목의 원자적 변경이 핵심 요구라면 제품의 트랜잭션 제한을 먼저 확인하고, 그 요구가 많으면 RDBMS가 맞는 저장소일 가능성이 크다. DynamoDB의 트랜잭션과 일관성 옵션은 [[DynamoDB|DynamoDB]]에서 확인한다.
- **RDBMS에서 조인을 피하려고 억지 비정규화**: RDBMS를 쓰면서 NoSQL식 중복을 만들면 두 모델의 단점을 함께 가진다.

### 스케일아웃용 도입이 실패하는 경로

트래픽이 늘면 서버 사양을 올리거나(스케일업) 서버 대수를 늘린다(스케일아웃). NoSQL을 스케일아웃 수단으로 들였다가 비용이 오히려 늘거나 장애를 겪는 경로는 대개 도입 전에 확인하지 않은 동시성 모델과 운영 비용에서 나온다. 강의에 소개된 사례로, 한 대형 서비스는 Cassandra에 결국 상용 RDBMS와 비슷한 비용을 썼고 노드를 추가할 때 동기화 작업이 자원을 과다하게 써 장애가 났다. 다른 서비스는 쓰기 한 건이 데이터베이스 전체를 잠그던 시기의 MongoDB를 쓰면서 이를 메우려고 노드를 수십 대까지 늘렸다.

1. **쓰기 잠금 단위**: 저장 엔진이 쓰기를 어떤 단위(전역, 데이터베이스, 컬렉션이나 테이블, 문서나 행)로 직렬화하는지 먼저 확인한다. 잠금이 거칠면 노드를 늘려도 노드 안의 쓰기 직렬화는 그대로라 처리량보다 비용이 먼저 는다. MongoDB는 2.2 이전 전역 잠금에서 2.2에 데이터베이스 단위, 3.0에 MMAPv1의 컬렉션 단위와 WiredTiger의 문서 단위 동시성으로 바뀌었고, 3.2에 WiredTiger가 기본 엔진이 되었으며 4.2에서 MMAPv1이 제거됐다. 현재 공식 FAQ 기준 WiredTiger는 global, database, collection 수준에서 intent lock만 잡고 대부분의 읽기와 쓰기에 낙관적 동시성 제어를 써서, 충돌하면 한쪽이 write conflict를 받고 MongoDB가 투명하게 재시도한다.
2. **토폴로지 변경은 부하 이벤트다**: Cassandra 공식 문서 기준 새 노드는 자신이 맡을 token range의 현재 replica에서 데이터를 스트리밍받는다. 새 노드가 정상 동작하는 것을 확인한 뒤 범위를 잃은 노드에서 `nodetool cleanup`을 돌려야 옛 데이터가 load로 계산되지 않는다. 스트리밍은 순차 I/O로 네트워크를 포화시켜 요청 처리 성능을 떨어뜨릴 수 있어 `stream_throughput_outbound`(기본 24MiB/s)나 `nodetool setstreamthroughput`으로 제한한다. 이미 포화된 클러스터에 노드를 넣으면 스트리밍이 기존 노드의 디스크, 네트워크, CPU를 더 써서 장애를 키울 수 있다. 여유가 있을 때, 저부하 시간대에, 한 대씩 진행한다. Redis Cluster 리샤딩을 피크 시간에 하지 말라는 [[Redis-Cluster-Sharding|Redis Cluster 샤딩]]의 원칙과 같다.
3. **총비용**: 라이선스만 비교하지 않고 필요한 노드 수, 운영 인력, 토폴로지 변경 비용을 합쳐 RDBMS 구성과 비교한다.
4. **사전 검증**: 운영과 같은 쓰기 동시성으로 부하 시험을 해 잠금 경합과 노드 추가 중 지연을 측정한다.

### 여러 저장소를 함께 쓸 때

주문과 결제는 RDBMS, 검색은 검색 엔진, 세션은 key-value 저장소처럼 용도별로 나누는 구성이 흔하다. 대신 저장소 사이 동기화(CDC, 배치), 늘어난 장애 지점, 학습과 운영 비용을 함께 산다. 동기화의 정본과 지연 계약은 [[Polyglot-Persistence|Polyglot Persistence]]에서 따진다.

저장소는 역할로 나눠 보면 선택 이유를 설명하기 쉽다. 요구별 후보와 숨은 비용 표는 [[Polyglot-Persistence#저장소는 요구로 고른다|Polyglot Persistence]]가 정본이고, 여기서는 역할 구분만 둔다.

| 역할 | 예 | 먼저 확인할 것 |
|---|---|---|
| 메인(정본) | 정형 데이터와 트랜잭션 중심이면 관계형, 구조가 자주 바뀌고 aggregate 단위로 읽고 쓰면 문서형 | 관계형은 인덱스 수와 쓰기 비용, 격리 수준과 동시성, 실행 계획. 문서형은 인덱스 설계, 샤드 키, 중복 데이터 정합성 |
| 특수 목적 | 컬럼형(대용량 분석), 그래프(관계 탐색, 추천), 벡터(유사도 검색), 시계열(로그, 센서 데이터) | 정본과의 동기화 방식과 지연 허용치 |
| 보조 | 오브젝트 스토리지(파일, 정적 콘텐츠), 검색 엔진(키워드, 상품 검색), Key-Value(캐시, 휘발성 데이터) | 캐시는 TTL과 eviction 정책, 키 설계 및 정본과의 동기화. Key-Value라는 분류만으로 정합성과 트랜잭션 지원을 판단하지 않음 |

많은 DB를 쓰는 것보다 하나의 DB라도 왜 골랐는지 설명하고, 고른 DB를 가장 효율적으로 쓰는 법을 깊게 아는 편이 프로젝트에 도움이 된다.

### 의사결정 체크리스트

- 정합성이 깨졌을 때 비용이 큰 데이터가 어디인지 구분했는가
- 주요 조회 패턴을 목록으로 적을 수 있고, 그 목록이 안정적인가
- 1~2년 뒤 규모 추정이 단일 RDBMS의 한계를 실제로 넘는가
- 선택한 저장소를 운영하고 장애를 대응할 사람이 있는가
- 저장소를 둘 이상 쓴다면 동기화 방식과 정본이 정해졌는가
- 스케일아웃이 목적이라면 쓰기 잠금 단위와 노드 추가 중 부하를 운영 수준의 부하 시험으로 확인했는가

## AWS 서비스 매핑

- **RDBMS 계열**: Amazon RDS, Amazon Aurora, (분석/컬럼형) Amazon Redshift
- **NoSQL 계열**: Amazon DynamoDB(Key-Value/Document), Amazon MemoryDB(인메모리 KV), Amazon DocumentDB(Document)

흔한 구성은 **RDBMS를 메인 데이터베이스로 두고, 캐시/추천/세션/단순 조회용 데이터에 NoSQL을 보조로 붙이는 폴리글랏(polyglot persistence)** 형태다. 위의 역할 구분으로 보면 메인 하나에 특수 목적과 보조 저장소를 필요한 만큼만 붙이는 구조다. 하나의 DB로 모든 접근 패턴을 강제하지 않고, 데이터 성격에 맞는 저장소를 조합한다.

## 면접 체크포인트

- NoSQL 4유형(Key-Value, Document, Graph, Wide-Column)과 각각의 적합 사례
- BASE 세 글자의 의미와 가용성, 수렴의 조건
- ACID의 Consistency와 CAP의 Consistency 차이, 제품 이름만으로 CP/AP를 정할 수 없는 이유
- 데이터 성격, 조회 패턴, 읽기와 쓰기 비중, 일관성과 가용성, 규모, 팀 역량 순으로 저장소를 고르는 절차와 SQL로 시작하는 이유
- 노드를 늘려도 처리량이 늘지 않는 경우(거친 쓰기 잠금, 토폴로지 변경 부하)를 설명할 수 있는가
- "무엇이 더 좋은가"가 아니라 "데이터 성격에 무엇이 더 적합한가"로 선택하는 논리
- RDBMS 메인 + NoSQL 보조(폴리글랏)가 흔한 이유

## 출처

2026-10-02에는 가용성/최종 일관성의 한계, ACID와 CAP의 구분 및 DynamoDB 읽기/트랜잭션 반례를 대조했다. MongoDB 버전 이력, Cassandra 설정과 강의 사례 전체를 다시 검증한 기록은 아니다.

- [Amazon DynamoDB, Read consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html)
- [Amazon DynamoDB, Transactions: How it works](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html)
- [Eventually Consistent - Revisited — All Things Distributed, Werner Vogels](https://www.allthingsdistributed.com/2008/12/eventually_consistent.html)
- [AWS 데이터베이스 기초 — RDBMS와 NoSQL (YouTube)](https://www.youtube.com/watch?v=idBsng-hafk&list=PLfth0bK2MgIYuFahPhXTpTomkwVx5Fl-v&index=33)
- [DBA의 SQL vs NoSQL 선택 가이드 — Threads, bear_dba](https://www.threads.com/@bear_dba/post/Dc13-Dpk38f)
- [MongoDB Docs, FAQ: Concurrency](https://www.mongodb.com/docs/manual/faq/concurrency/)
- [MongoDB 2.2 FAQ: Concurrency, 2.2 이전 전역 잠금과 데이터베이스 단위 잠금 — MongoDB docs GitHub](https://github.com/mongodb/docs/blob/v2.2/source/faq/concurrency.txt)
- [MongoDB 3.0 Release Notes, WiredTiger와 MMAPv1 동시성 — MongoDB docs GitHub](https://github.com/mongodb/docs/blob/v3.0/source/release-notes/3.0.txt)
- [MongoDB 3.2 Release Notes, WiredTiger as Default — MongoDB docs GitHub](https://github.com/mongodb/docs/blob/v3.2/source/release-notes/3.2.txt)
- [MongoDB 4.2 Release Notes, Removed MMAPv1 Storage Engine — MongoDB docs GitHub](https://github.com/mongodb/docs/blob/v4.2/source/release-notes/4.2.txt)
- [Apache Cassandra Documentation, Adding, replacing, moving and removing nodes](https://cassandra.apache.org/doc/latest/cassandra/managing/operating/topo_changes.html)
- [Apache Cassandra Documentation, cassandra.yaml file configuration](https://cassandra.apache.org/doc/latest/cassandra/managing/configuration/cass_yaml_file.html)
- [Apache Cassandra Documentation, nodetool setstreamthroughput](https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/setstreamthroughput.html)
- [인프런, 모영철, MicroService Architecture - Process 여러 개면 여러모로 좋아](https://www.inflearn.com/courses/lecture?courseId=331869&unitId=178847)
- [인프런, 성장랜턴, DB 종류와 선택 전략](https://www.inflearn.com/courses/lecture?courseId=335130&unitId=278150)

## 관련 문서
- [[Transactions|트랜잭션, ACID]] — 원자성/일관성/독립성/영속성 정의
- [[CAP-Theorem|CAP 정리]] — BASE, Eventual Consistency, AP/CP 심화
- [[MongoDB-Schema-Design|MongoDB 스키마 설계]] — Document 모델링 Embed vs Reference
- [[OLTP-vs-OLAP|OLTP vs OLAP]] — 운영 DB vs 분석 DB 분리
- [[Polyglot-Persistence|Polyglot Persistence]] — 여러 저장소의 동기화와 정본
- [[Redis-Cluster-Sharding|Redis Cluster 샤딩]] — 리샤딩이 부하 이벤트인 이유
- [[DynamoDB|DynamoDB]] — key-value와 document 모델의 AWS 관리형 NoSQL
- [[tech/database/rdbms/RDBMS|RDBMS (OLTP)]] — 관계형 DB 전반
