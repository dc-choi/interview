---
tags: [database, nosql, base, consistency]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["NoSQL Overview", "NoSQL 개요", "RDBMS vs NoSQL", "BASE 모델"]
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

NoSQL은 ACID보다 느슨한 BASE 모델을 따르는 경우가 많다. 강한 일관성을 일부 양보하는 대신 가용성과 확장성을 얻는 방향이다.

- **Basically Available**: 항상 접근 가능한 상태를 우선한다. 데이터를 여러 노드에 분산 저장해 일부 장애가 나도 서비스가 계속 동작한다.
- **Soft State**: 데이터 상태가 항상 즉시 확정된 것은 아니다. 외부 입력이 없어도 복제 전파에 따라 상태가 변할 수 있다.
- **Eventual Consistency(최종적 일관성)**: 업데이트 직후엔 일부 노드/사용자가 예전 값을 볼 수 있지만, 시간이 지나면 결국 같은 상태로 수렴한다.

BASE는 분산 시스템의 일관성-가용성 트레이드오프(CAP/PACELC)의 가용성(AP) 쪽 선택과 맞닿아 있다 — ACID는 CP 성향, BASE는 AP 성향. 깊이는 [[CAP-Theorem|CAP 정리]] 참고. ACID 자체의 정의(원자성, 일관성, 독립성, 영속성)는 [[Transactions|트랜잭션, ACID]]에 정리돼 있다.

## RDBMS vs NoSQL 핵심 차이

| 축 | RDBMS | NoSQL |
|---|---|---|
| 강점 | 정확성, 관계, 복잡한 쿼리(조인/집계) | 유연성, 수평 확장성, 높은 가용성 |
| 스키마 | 저장 전에 고정 (강한 설계도) | 스키마리스/유연 |
| 일관성 | 강한 일관성(ACID) | 최종적 일관성(BASE) 중심 |
| 약점 | 수평 확장과 구조 변경이 신중함 | 복잡한 관계 조회, 엄격한 일관성 작업에 주의 |

**선택 기준**: 돈, 주문, 회원 정보처럼 정확성과 관계가 핵심이면 RDBMS를 먼저 본다. 대규모 트래픽, 빠른 조회, 유연한 데이터 구조, 분산 처리가 중요하면 NoSQL이 후보가 된다. 워크로드가 운영성이냐 분석성이냐의 분리는 [[OLTP-vs-OLAP|OLTP vs OLAP]]와도 연결된다.

## 선택 절차

유형 비교보다 먼저 네 가지를 차례로 확인한다.

1. **데이터 성격**: 잘못된 값이 돈, 재고, 예약 같은 되돌리기 어려운 결과로 이어지는가. 그렇다면 제약과 트랜잭션을 DB가 보장하는 RDBMS가 기본값이다.
2. **조회 패턴**: 주요 조회가 키 하나로 끝나는 고정 패턴인가, 아니면 조건과 집계가 계속 바뀌는가. NoSQL은 조회 패턴에 맞춰 비정규화해야 성능이 나오므로 패턴이 정해지지 않았으면 설계 근거가 없다.
3. **규모**: 지금이 아니라 1~2년 안에 예상되는 데이터량과 초당 쓰기 수가 단일 RDBMS와 읽기 복제본으로 감당되는가. 감당된다면 확장성은 NoSQL을 고를 이유가 되지 않는다.
4. **팀 역량**: 선택한 저장소의 모델링, 장애 대응, 비용 관리를 팀이 할 수 있는가.

확신이 없으면 SQL로 시작하고, NoSQL은 측정으로 확인한 병목에 부분적으로 들인다. 되돌아오는 비용이 비대칭이기 때문이다. RDBMS에서 특정 접근 패턴만 NoSQL로 떼어내는 일은 데이터 복제와 동기화 문제로 끝나지만, NoSQL에서 RDBMS로 돌아올 때는 코드에 흩어진 스키마를 다시 정의하고, 애플리케이션이 대신하던 조인과 트랜잭션 로직을 걷어 내고, 중복 저장된 데이터의 정본을 가려내야 한다.

### 흔한 실수

- **유행이나 막연한 확장성 기대로 도입**: 사용자와 데이터가 적은 단계에서 수평 확장을 이유로 NoSQL을 고르면 조인, 제약, 트랜잭션을 애플리케이션이 떠안는다.
- **스키마리스를 스키마 없음으로 오해**: 스키마가 사라지는 것이 아니라 DB에서 코드로 옮겨 가며, 문서 버전이 섞이면 읽는 쪽 코드가 모든 버전을 처리해야 한다.
- **조회 패턴 없이 문서 모델부터 설계**: embed와 reference 선택은 조회 패턴이 정해져야 판단할 수 있다([[MongoDB-Schema-Design|MongoDB 스키마 설계]]). 나중에 정규화가 필요해지면 `$lookup` 같은 서버 측 조인이나 여러 번 조회한 뒤 애플리케이션에서 합치는 방식 사이에서 타협하게 된다.
- **NoSQL 위에 분산 트랜잭션 재구현**: 여러 항목의 원자적 변경이 핵심 요구라면 제품의 트랜잭션 제한을 먼저 확인하고, 그 요구가 많으면 RDBMS가 맞는 저장소일 가능성이 크다. DynamoDB의 트랜잭션과 일관성 옵션은 [[DynamoDB|DynamoDB]]에서 확인한다.
- **RDBMS에서 조인을 피하려고 억지 비정규화**: RDBMS를 쓰면서 NoSQL식 중복을 만들면 두 모델의 단점을 함께 가진다.

### 여러 저장소를 함께 쓸 때

주문과 결제는 RDBMS, 검색은 검색 엔진, 세션은 key-value 저장소처럼 용도별로 나누는 구성이 흔하다. 대신 저장소 사이 동기화(CDC, 배치), 늘어난 장애 지점, 학습과 운영 비용을 함께 산다. 동기화의 정본과 지연 계약은 [[Polyglot-Persistence|Polyglot Persistence]]에서 따진다.

### 의사결정 체크리스트

- 정합성이 깨졌을 때 비용이 큰 데이터가 어디인지 구분했는가
- 주요 조회 패턴을 목록으로 적을 수 있고, 그 목록이 안정적인가
- 1~2년 뒤 규모 추정이 단일 RDBMS의 한계를 실제로 넘는가
- 선택한 저장소를 운영하고 장애를 대응할 사람이 있는가
- 저장소를 둘 이상 쓴다면 동기화 방식과 정본이 정해졌는가

## AWS 서비스 매핑

- **RDBMS 계열**: Amazon RDS, Amazon Aurora, (분석/컬럼형) Amazon Redshift
- **NoSQL 계열**: Amazon DynamoDB(Key-Value/Document), Amazon MemoryDB(인메모리 KV), Amazon DocumentDB(Document)

흔한 구성은 **RDBMS를 메인 데이터베이스로 두고, 캐시/추천/세션/단순 조회용 데이터에 NoSQL을 보조로 붙이는 폴리글랏(polyglot persistence)** 형태다. 하나의 DB로 모든 접근 패턴을 강제하지 않고, 데이터 성격에 맞는 저장소를 조합한다.

## 면접 체크포인트

- NoSQL 4유형(Key-Value, Document, Graph, Wide-Column)과 각각의 적합 사례
- BASE 세 글자의 의미와 ACID와의 대비 (강일관성 vs 최종 일관성)
- BASE가 CAP의 AP 선택과 어떻게 맞닿는가
- 데이터 성격, 조회 패턴, 규모, 팀 역량 순으로 저장소를 고르는 절차와 SQL로 시작하는 이유
- "무엇이 더 좋은가"가 아니라 "데이터 성격에 무엇이 더 적합한가"로 선택하는 논리
- RDBMS 메인 + NoSQL 보조(폴리글랏)가 흔한 이유

## 출처
- [AWS 데이터베이스 기초 — RDBMS와 NoSQL (YouTube)](https://www.youtube.com/watch?v=idBsng-hafk&list=PLfth0bK2MgIYuFahPhXTpTomkwVx5Fl-v&index=33)
- [DBA의 SQL vs NoSQL 선택 가이드 — Threads, bear_dba](https://www.threads.com/@bear_dba/post/Dc13-Dpk38f)

## 관련 문서
- [[Transactions|트랜잭션, ACID]] — 원자성/일관성/독립성/영속성 정의
- [[CAP-Theorem|CAP 정리]] — BASE, Eventual Consistency, AP/CP 심화
- [[MongoDB-Schema-Design|MongoDB 스키마 설계]] — Document 모델링 Embed vs Reference
- [[OLTP-vs-OLAP|OLTP vs OLAP]] — 운영 DB vs 분석 DB 분리
- [[Polyglot-Persistence|Polyglot Persistence]] — 여러 저장소의 동기화와 정본
- [[DynamoDB|DynamoDB]] — key-value와 document 모델의 AWS 관리형 NoSQL
- [[tech/database/rdbms/RDBMS|RDBMS (OLTP)]] — 관계형 DB 전반
