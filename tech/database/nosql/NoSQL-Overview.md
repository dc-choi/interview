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

## AWS 서비스 매핑

- **RDBMS 계열**: Amazon RDS, Amazon Aurora, (분석/컬럼형) Amazon Redshift
- **NoSQL 계열**: Amazon DynamoDB(Key-Value/Document), Amazon MemoryDB(인메모리 KV), Amazon DocumentDB(Document)

흔한 구성은 **RDBMS를 메인 데이터베이스로 두고, 캐시/추천/세션/단순 조회용 데이터에 NoSQL을 보조로 붙이는 폴리글랏(polyglot persistence)** 형태다. 하나의 DB로 모든 접근 패턴을 강제하지 않고, 데이터 성격에 맞는 저장소를 조합한다.

## 면접 체크포인트

- NoSQL 4유형(Key-Value, Document, Graph, Wide-Column)과 각각의 적합 사례
- BASE 세 글자의 의미와 ACID와의 대비 (강일관성 vs 최종 일관성)
- BASE가 CAP의 AP 선택과 어떻게 맞닿는가
- "무엇이 더 좋은가"가 아니라 "데이터 성격에 무엇이 더 적합한가"로 선택하는 논리
- RDBMS 메인 + NoSQL 보조(폴리글랏)가 흔한 이유

## 출처
- [AWS 데이터베이스 기초 — RDBMS와 NoSQL (YouTube)](https://www.youtube.com/watch?v=idBsng-hafk&list=PLfth0bK2MgIYuFahPhXTpTomkwVx5Fl-v&index=33)

## 관련 문서
- [[Transactions|트랜잭션, ACID]] — 원자성/일관성/독립성/영속성 정의
- [[CAP-Theorem|CAP 정리]] — BASE, Eventual Consistency, AP/CP 심화
- [[MongoDB-Schema-Design|MongoDB 스키마 설계]] — Document 모델링 Embed vs Reference
- [[OLTP-vs-OLAP|OLTP vs OLAP]] — 운영 DB vs 분석 DB 분리
- [[tech/database/rdbms/RDBMS|RDBMS (OLTP)]] — 관계형 DB 전반
