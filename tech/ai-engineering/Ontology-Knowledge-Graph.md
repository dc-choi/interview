---
tags: [ai, ontology, knowledge-graph, data-model, entity-resolution, palantir, graph-database]
status: done
verified_at: 2026-10-12
category: "AI엔지니어링(AIEngineering)"
aliases: ["Ontology and Knowledge Graph", "온톨로지와 지식 그래프", "Palantir Foundry Ontology", "팔란티어 온톨로지"]
---

# 온톨로지와 지식 그래프

온톨로지는 한 업무 영역에서 쓰는 대상의 종류, 속성, 관계와 규칙을 정한 의미 모델이다. 지식 그래프는 실제 대상과 그 사이의 사실을 노드와 엣지로 연결한 데이터다. 문서에서 개체와 관계를 뽑아 그래프로 그렸다고 온톨로지가 생기지는 않는다. 같은 대상을 가려내는 식별자와 허용하는 관계가 정해져 있고, 들어오는 데이터가 규칙을 지키는지 판정해 반영하거나 반려하는 검사가 함께 있어야 그래프의 조회 결과를 믿을 수 있다.

이 문서의 그래프는 지식을 표현하는 구조다. 에이전트의 실행 순서를 노드와 엣지로 표현하는 그래프는 [[Agent-Graph-Engineering|그래프 엔지니어링]]에서 다룬다.

## 구성 요소

| 요소 | 뜻 | 배송 회사 예시 |
|---|---|---|
| 타입(클래스) | 대상의 종류 | 고객, 주문, 라이더, 허브 |
| 속성 | 대상의 특성과 식별자 | 고객 ID, 주문 번호, 라이더 ID, 허브 지역 |
| 관계 | 두 타입 사이에 허용한 연결과 방향 | 고객이 주문을 생성, 주문이 라이더에게 배정 |
| 인스턴스 | 타입에 속한 실제 대상 하나 | 라이더 R-102, 주문 1001 |
| 규칙과 제약 | 허용 조합, 필수 관계, 값과 개수 조건 | 주문마다 출발 허브가 하나 있음 |
| 행동과 함수 | 데이터를 바꾸는 정의된 작업과 그 위의 조회, 계산 | 주문 배정, 라이더별 월간 배송 건수 |

관계에는 방향이 있다. 고객은 주문을 생성하지만 주문이 고객을 생성하지는 않고, 라이더는 주문을 배송하지만 주문이 라이더를 배송하지는 않는다. 허용 관계를 (출발 타입, 관계, 도착 타입)으로 적어 두면 업무상 불가능한 연결을 걸러낼 기준이 생긴다.

| 출발 타입 | 관계 | 도착 타입 |
|---|---|---|
| Customer | PLACED | Order |
| Order | ASSIGNED_TO | Rider |
| Rider | BELONGS_TO | Hub |
| Order | ORIGIN_HUB | Hub |

W3C OWL 2는 대상을 개체(individual), 종류를 클래스, 관계를 속성(property)으로 부른다. 개체끼리 잇는 object property와 개체에 값을 붙이는 datatype property를 구분한다. 업무 플랫폼은 여기에 데이터를 바꾸는 행동과 계산 함수까지 온톨로지 정의에 포함하기도 한다(아래 Palantir 절).

## 온톨로지와 지식 그래프의 차이

친족 호칭으로 보면 구분하기 쉽다. 아버지의 형은 큰아버지라는 규칙이 온톨로지이고, 어떤 사람의 큰아버지가 누구라는 사실이 지식 그래프다. 규칙이 있으면 아버지와 그 형에 대한 사실만으로 큰아버지 관계를 추론할 수 있다. OWL 2는 부모의 부모를 조부모로 정의하는 property chain 공리를 제공하고, reasoner가 명시되지 않은 관계를 계산한다.

| 구분 | 온톨로지 | 지식 그래프 |
|---|---|---|
| 담는 것 | 타입, 관계 정의와 규칙 | 실제 대상과 관계의 사실 |
| 바뀌는 때 | 업무 정의나 정책이 바뀔 때 | 데이터가 들어올 때마다 |
| 흔한 결함 | 모호한 용어, 빠진 규칙, 과한 관계 종류 | 중복 노드, 규칙 위반 관계, 빠진 관계 |
| 점검 질문 | 업무 질문을 표현할 수 있는가 | 정의된 규칙을 지키는가 |

- 택소노미는 분류 계층이다. 온톨로지는 여기에 속성, 다른 타입과의 관계와 제약을 더한다. 분류 체계의 운영 사례는 [[Recommendation-System-Taxonomy-Content-Based|추천 시스템 택소노미]]에 있다.
- 그래프 DB에 데이터를 적재한다고 온톨로지가 생기지 않는다. 반대로 온톨로지는 그래프 DB 없이 관계형 스키마와 검증 규칙, 문서 메타데이터 규칙으로도 구현할 수 있다.
- 주문, 접수, 환불 같은 용어를 팀마다 다르게 쓰지 않도록 뜻을 정하는 일은 [[DDD#Ubiquitous Language — 공통 언어|DDD의 공통 언어]]와 목적이 같다.

## 규칙 없이 추출한 그래프의 결함

LLM으로 사내 문서에서 개체와 관계를 자유롭게 추출하면 그래프는 빨리 생기지만 다음 결함이 함께 들어온다.

- 중복 노드: 같은 라이더가 이름, 이름과 직함, 줄임말처럼 표기마다 다른 노드가 된다. 허브도 정식 명칭과 약칭으로 갈린다.
- 관계명 증식: 같은 고객과 주문의 관계가 문장마다 다른 동사로 추출되어 관계 종류가 계속 늘어난다.
- 불가능한 연결: 타입이 없으면 라이더가 고객을 주문했다는 식의 연결도 막을 기준이 없다.

이 상태에서 같은 허브의 동료 라이더를 조회하면 중복 노드 때문에 사람이 빠지거나 두 번 나오고, 다른 이름으로 저장된 관계는 조회에서 빠진다. 수집한 데이터를 그대로 그린 그래프는 질의 결과를 믿기 어려운 원시 데이터에 가깝다.

## 통제된 지식 그래프를 만드는 순서

1. **질문을 먼저 정한다.** 라이더별 월간 배송 건수, 허브별 환불액, 같은 허브의 동료 라이더처럼 반복되는 질문에 필요한 타입과 관계만 고른다.
2. **허용 관계와 정본 이름을 정한다.** 관계마다 정본 이름 하나를 두고 같은 뜻의 다른 표현은 그 이름으로 매핑한다.
3. **추출 단계에 타입을 준다.** 엔터티 타입과 관계 타입을 추출기에 지정하면 노드에 라벨이 붙고 자유로운 관계명이 줄어든다. Graphiti는 Pydantic 모델로 엔터티 타입과 엣지 타입을 정의하고 `edge_type_map`으로 (출발 타입, 도착 타입) 쌍별 허용 엣지 타입을 정한다. 매핑이 없는 쌍은 추출된 술어를 엣지 이름으로 남기므로(2026-10-12 공식 문서 기준) 추출 설정만으로 관계명 증식이 사라지지 않는다.
4. **식별자를 부여하고 개체를 해소한다.** 이름이 같은 두 노드가 같은 대상인지 동명이인인지는 이름으로 판단할 수 없다. 대상마다 바뀌지 않는 식별자가 있어야 같은 식별자는 합치고 다른 식별자는 분리한다. OWL도 서로 다른 이름이 서로 다른 개체라고 가정하지 않으며, 같은 개체라는 사실은 `owl:sameAs`로 명시할 수 있다. 자동 판단이 어려운 후보는 사람이 검토하고 병합 근거를 남긴다. 사후 병합은 같은 대상인지 가릴 근거가 부족해지기 쉬우므로 원천 DB 설계 단계에서 식별자를 정해 둔다. 매칭, 병합과 분할 절차는 [[Content-Entity-Resolution|콘텐츠 식별과 중복 병합]]에서 다룬다.
5. **반영 전에 검사한다.** 허용 목록 밖의 관계, 필수 관계 누락과 식별자 중복을 찾아 통과하면 반영하고 위반하면 반려하거나 검토 대기열로 보낸다. 데이터는 계속 들어오므로 일회성 정리가 아니라 수집 파이프라인의 단계로 둔다.
6. **질의와 함수를 온톨로지 위에 만든다.** 용어와 관계가 통일되면 동료 라이더 조회는 같은 허브에 소속된 다른 라이더를 찾는 짧은 질의가 된다.

```cypher
MATCH (r:Rider {riderId: $riderId})-[:BELONGS_TO]->(:Hub)<-[:BELONGS_TO]-(peer:Rider)
WHERE peer <> r
RETURN peer.riderId
```

원시 데이터를 통제된 그래프로 바꾸고 그 위에 배송 건수, 환불액, 동료 조회 같은 함수를 붙이면 온톨로지를 쓰는 서비스가 된다.

## 검사 수단

- OWL은 열린 세계 가정(open world assumption)을 따른다. 문서에 없는 사실을 거짓으로 보지 않고 아직 모르는 것으로 본다. W3C는 OWL 2가 구문 적합성을 검사하는 스키마 언어가 아니라고 밝힌다. 필수 관계 누락 같은 검증은 별도 수단이 맡는다.
- RDF 그래프는 SHACL로 검증한다. 조건을 담은 shapes graph로 data graph를 검사하고, 적합 여부와 위반 결과를 validation report로 받는다.
- Neo4j는 식별자 속성에 property uniqueness constraint를 둘 수 있다. 관계 유형별 출발, 도착 노드의 레이블은 Cypher 25의 graph type(Enterprise Edition)으로 강제할 수 있다. 2026.02에 preview로 도입되어 2026.06에 GA가 되었다(2026-10-12 Cypher Manual 기준). 충돌하는 기존 데이터를 고쳐야 설정할 수 있고, graph type이 제약하지 않은 데이터는 계속 추가할 수 있다. 정의하지 않은 관계명이 늘어나는 것은 허용 목록에 없는 (레이블, 관계 유형, 레이블) 조합을 찾는 검사 질의로 잡는다.

## 운영에서 무너지는 지점

| 위험 | 증상 | 대응 |
|---|---|---|
| 식별자 없음 | 같은 대상의 중복 노드, 동명이인의 잘못된 병합 | 원천 식별자 설계, 병합 근거와 사람 검토 |
| 관계명 증식 | 같은 뜻의 관계가 여러 이름으로 늘어남 | 정본 이름과 매핑, 허용 목록 밖 관계 반려 |
| 규칙 없음 | 그래프는 있지만 위반을 판정할 기준이 없음 | 타입, 허용 관계와 필수 관계 정의 |
| 검사 없음 | 처음 맞던 그래프가 수집이 이어지며 어긋남 | 반영 전 검사와 위반 지표 |
| 필요한 경로 누락 | 있어야 할 관계가 없어 질의 결과가 비거나 빠짐 | 필수 관계 검사와 업무 경로 점검 |

관계 종류를 줄이는 일과 필요한 경로를 남기는 일은 서로 당긴다. 너무 줄이면 업무 질문에 필요한 경로가 사라지고, 풀어 두면 같은 뜻의 관계가 증식한다. 이 균형은 구현보다 용어와 규칙을 합의하는 설계에서 정해지므로 도메인 담당자와 함께 정의하고 검토한다.

## Palantir Foundry Ontology

2026-10-12 Palantir 공식 문서 기준이다. Palantir는 Ontology를 조직의 운영 계층(operational layer)으로 정의한다. 플랫폼에 통합된 데이터셋, 가상 테이블과 모델 위에 놓이고, 많은 경우 조직의 디지털 트윈 역할을 한다. 의미 요소(object, property, link)와 실행 요소(action, function, dynamic security)로 구성되며, 데이터 요소를 기업의 명사로, 액션을 동사로 설명한다. Ontology가 단순한 데이터가 아니라 기업의 의사결정을 표현한다는 것이 Palantir의 설명이다.

| 일반 개념 | Foundry 용어 | 공식 문서의 정의와 제약 |
|---|---|---|
| 타입 | Object type | 현실의 엔터티나 이벤트에 대한 스키마 정의. object type은 데이터셋 정의, object는 데이터셋의 행에 대응한다 |
| 속성 | Property | 엔터티나 이벤트의 특성에 대한 스키마 정의 |
| 식별자 | Primary key | 원천의 모든 레코드에서 유일해야 하고 결정적인 값을 쓰도록 권한다. 행 번호나 난수로 만든 키는 빌드마다 바뀔 수 있어 피하고, 시간 값은 충돌 가능성 때문에 권하지 않는다. OSv2는 한 트랜잭션 안의 중복 키로 indexing이 실패하고, 트랜잭션 사이의 중복은 나중 트랜잭션의 값을 쓴다 |
| 관계 | Link type | 두 object type 사이 관계의 스키마 정의. 같은 타입끼리도 연결할 수 있고 many-to-many link는 datasource가 link 자체를 저장한다 |
| 공통 형태 | Interface | object type의 형태와 capability를 기술하는 타입. 여러 object type이 구현할 수 있다 |
| 행동 | Action type | object, 속성 값과 link에 대한 편집 묶음. rule이 파라미터를 object 생성, 수정, 삭제와 link 생성, 삭제로 바꾸고 알림, webhook 같은 side effect를 둘 수 있다 |
| 함수 | Function | TypeScript와 Python으로 속성을 읽고 link를 따라가며 Ontology 편집을 만든다. Workshop과 function-backed action에서 쓴다 |

- 스키마와 데이터의 권한을 나눈다. object type, link type, action type은 스키마를 정의하는 자원이고 object와 link는 실제 primary key와 속성 값을 가진 데이터다. 현재의 프로젝트 기반 권한 모델에서 object type과 object의 권한은 따로 확인하며, object를 보려면 object type의 View 권한과 데이터 접근 권한이 모두 필요하다.
- action은 submission criteria로 제출자의 ID와 그룹, 파라미터와 대상 object의 속성을 검사한다. 이 조건은 action type 자체를 편집하는 권한과 독립이다. 공식 예시는 항공편의 기체 재배정을 운항 관제 담당에게만 허용하고, 기체가 운항 가능 상태일 때만 제출을 받는다.
- Ontology scenario에서 적용한 편집은 격리된 sandbox에만 있고 main Ontology를 바꾸지 않는다. 적용하기로 하면 merge action이 쌓인 편집을 한 트랜잭션으로 반영한다. 주문이 몰리는 상황을 가정한 배정안처럼 실제 데이터를 바꾸기 전에 대안을 비교할 때 쓴다.

앞의 원칙과 대응해 보면 식별자 유일성은 indexing 단계의 primary key 검사로, 허용 관계는 object type 사이에 정의한 link type으로, 사용자 편집의 반영 전 검사는 action의 rule과 submission criteria로 제품에 들어 있다.

## 도입 점검

- 반복되는 업무 질문과 그 질문에 필요한 타입과 관계를 먼저 정했는가?
- 모든 타입에 원천과 연결된 안정적인 식별자가 있고 병합과 분할의 근거가 남는가?
- 허용 관계, 필수 관계와 위반 시 처리(반려, 검토 대기)가 수집 파이프라인에 있는가?
- LLM이 추출한 관계를 후보로 두고 원문 근거로 확인하는가? 검색되거나 추출된 관계가 참이라는 보장은 없다([[GraphRAG-Retrieval|GraphRAG 검색]]).
- 데이터를 바꾸는 행동에 실행 조건이 있고, 스키마 편집 권한과 데이터 접근 권한을 구분하는가?
- 그래프 DB나 플랫폼을 도입하기 전에 기존 관계형 스키마와 제약으로 같은 질문에 답할 수 있는지 비교했는가?

## 출처

- [YouTube, ZeroCho TV, 팔란티어의 핵심 기술, 온톨로지(Ontology) 5분 간단 정리 + 실습](https://www.youtube.com/watch?v=165vVglFnps) — 개념 설명과 실습 흐름을 반영했다. 화면의 실습 코드는 확인하지 않았다.
- [Palantir, Ontology overview](https://www.palantir.com/docs/foundry/ontology/overview/)
- [Palantir, Why create an Ontology?](https://www.palantir.com/docs/foundry/ontology/why-ontology)
- [Palantir, Object types overview](https://www.palantir.com/docs/foundry/object-link-types/object-types-overview/)
- [Palantir, Properties overview](https://www.palantir.com/docs/foundry/object-link-types/properties-overview/)
- [Palantir, Create an object type](https://www.palantir.com/docs/foundry/object-link-types/create-object-type)
- [Palantir, Object indexing data restrictions](https://www.palantir.com/docs/foundry/object-indexing/data-restrictions)
- [Palantir, Link types overview](https://www.palantir.com/docs/foundry/object-link-types/link-types-overview/)
- [Palantir, Interfaces overview](https://www.palantir.com/docs/foundry/interfaces/interface-overview/)
- [Palantir, Action types overview](https://www.palantir.com/docs/foundry/action-types/overview/)
- [Palantir, Action type rules](https://www.palantir.com/docs/foundry/action-types/rules/)
- [Palantir, Submission criteria](https://www.palantir.com/docs/foundry/action-types/submission-criteria/)
- [Palantir, Functions overview](https://www.palantir.com/docs/foundry/functions/overview/)
- [Palantir, Object permissioning](https://www.palantir.com/docs/foundry/object-permissioning/overview/)
- [Palantir, Ontology permissions](https://www.palantir.com/docs/foundry/object-permissioning/ontology-permissions)
- [Palantir, Merge scenarios](https://www.palantir.com/docs/foundry/ontology/merge-scenario)
- [W3C, OWL 2 Web Ontology Language Primer (Second Edition)](https://www.w3.org/TR/owl2-primer/)
- [W3C, Shapes Constraint Language (SHACL)](https://www.w3.org/TR/shacl/)
- [Neo4j, Cypher Manual: Set graph types](https://neo4j.com/docs/cypher-manual/current/schema/graph-types/set-graph-types/)
- [Neo4j, Cypher Manual: Constraints](https://neo4j.com/docs/cypher-manual/current/schema/constraints/)
- [Neo4j, Cypher Manual: Additions, deprecations, removals, and compatibility](https://neo4j.com/docs/cypher-manual/current/deprecations-additions-removals-compatibility/)
- [Zep, Graphiti: Custom entity and edge types](https://help.getzep.com/graphiti/core-concepts/custom-entity-and-edge-types)

## 관련 문서

- [[Development-Ontology|이 vault의 개발 판단 온톨로지]]
- [[Ontology-Context-Platform-Implementation|Markdown Vault 기반 온톨로지 구축 방법]]
- [[Agentic-Context-Platform|에이전트 컨텍스트 플랫폼]]
- [[GraphRAG-Retrieval|GraphRAG 검색]]
- [[Content-Entity-Resolution|콘텐츠 식별과 중복 병합]]
- [[Recommendation-System-Taxonomy-Content-Based|추천 시스템 택소노미]]
- [[DDD|DDD]]
- [[IoT-Edge-Cloud-Pipeline#설비 관계 조회와 원인 판단을 구분한다|설비 관계 그래프와 원인 판단]]
- [[Agent-Graph-Engineering|그래프 엔지니어링 (에이전트 실행 흐름 그래프)]]
