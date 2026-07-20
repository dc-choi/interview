---
tags: [web, graphql, api, federation, microservices]
status: done
verified_at: 2026-07-20
category: "웹&네트워크(Web&Network)"
aliases: ["GraphQL Federation", "GraphQL 페더레이션", "subgraph", "federated gateway", "schema composition"]
---

# GraphQL Federation

여러 독립 서비스가 각자 스키마를 정의하고, 그것을 하나의 통합 스키마로 합성해 단일 GraphQL API로 제공하는 아키텍처 패턴. MSA의 원리를 GraphQL에 적용한 것으로, 자율 컴포넌트가 독립성을 유지한 채 협력한다(연방제 비유 — 주가 주권을 유지하며 공동 관심사는 중앙이 조율). Apollo Federation이 사실상의 레퍼런스로 확산됐고, 현재는 GraphQL Foundation의 Composite Schema Working Group이 업계 여러 조직과 공식 표준화를 진행 중이다.

## 구성 요소 3가지

- **Subgraph**: 자기 도메인 몫의 스키마와 resolver를 정의하는 개별 서비스. 팀이 독립적으로 개발, 배포, 확장한다.
- **Gateway**: 클라이언트와 subgraph들 사이의 진입점. 통합 스키마를 단일 엔드포인트로 노출하고, 쿼리를 적절한 subgraph로 라우팅해 결과를 조립하며, 캐싱과 성능 최적화를 얹기도 한다. Apollo Federation 2 용어로는 이 역할이 Router, 합성된 통합 스키마가 supergraph다.
- **Schema composition**: 여러 subgraph 스키마를 하나로 합성하는 과정. 단순 병합이 아니라 서비스 간 타입 참조를 해결하고 비호환을 감지한다. schema registry가 이 합성과 검증을 담당하는 경우가 많다.

## 타입이 subgraph를 가로지르는 법

한 엔티티를 여러 subgraph가 나눠 가진다. 소유 subgraph가 엔티티를 선언하고, 다른 subgraph는 스텁으로 참조한다 (아래는 Apollo Federation 문법).

```graphql
# Products subgraph — 소유자
type Product @key(fields: "id") {
  id: ID!
  title: String!
  price: Float!
}

# Orders subgraph — id만 아는 스텁으로 참조
type Order @key(fields: "id") {
  id: ID!
  products: [Product!]!
}
type Product {
  id: ID!
}
```

합성된 통합 스키마에서 클라이언트는 경계를 모르고 쿼리한다. `user { orders { products { title } } }` 한 쿼리에서 user는 Users subgraph, orders는 Orders subgraph, products의 상세는 Products subgraph가 해소하고 gateway가 조립한다.

## 이점

- **도메인 주도 개발**: 팀이 독립적으로 일하면서 하나의 API에 기여. 조정 오버헤드 감소.
- **서비스 무결성 보호**: composition 단계가 한 subgraph의 변경이 다른 subgraph와 충돌하지 않는지 검증한다.
- **독립 확장**: 상품 카탈로그와 주문 처리는 다른 확장 특성을 가질 수 있다.
- **단일 통합 API**: 분산의 복잡성이 gateway 뒤로 숨는다. 클라이언트는 단일 엔드포인트만 본다.

## 도입 판단

- DDD 경계와 자연스럽게 정렬된다: 팀이 도메인 경계를 유지하면서 스키마가 명시적 통합 지점이 된다. 여러 팀이 서로 다른 기술 스택으로 독립 작업해야 할 때 특히 가치 있다.
- 대신 인프라 비용이 실질적이다: gateway, schema registry 운영과 subgraph 연결, 베스트 프랙티스 가이드를 맡는 전담 팀이 필요하다.
- 조기 도입을 경계한다. 모놀리식 스키마로 시작해 필요가 생기면 전환하는 편이 낫고, 마이그레이션의 가장 쉬운 출발점은 기존 스키마 전체를 첫 subgraph로 취급하는 것이다.

### 사례

GraphQL을 만든 Meta는 2012년부터 모놀리식 GraphQL API를 유지한다. 반면 Netflix, Expedia Group, Volvo, Booking은 조직 구조와 MSA에 맞춰 페더레이션을 채택했다. 어느 쪽도 규모 때문에 강제되는 선택이 아니라 조직 구조의 함수다.

## 도입 단계

1. 서비스 경계 식별 (도메인 간 명확한 경계 정의)
2. 경계를 반영한 스키마 설계 (상호작용 방식 고려)
3. subgraph 구현
4. gateway 구축 (합성된 통합 스키마 서빙)
5. schema registry로 합성, 검증 관리

## 거버넌스: 스키마를 누가 소유하나

스키마 변경을 누가 결정하는지의 모델 셋 (페더레이션 전용이 아니라 모놀리식 스키마에도 적용). 중앙 감독과 팀 자율, 반복 속도 사이 트레이드오프로 고른다.

- **중앙집중**: 한 팀이 전체 스키마를 소유하고 모든 변경을 리뷰한다. 도메인 간 엄격한 일관성과 규제 요건에 맞고, 대가는 반복 속도다(모든 변경이 한 팀을 통과). 병목을 막으려면 자동 검증(유효성, breaking change 감지, 네이밍)을 CI에 태우고, 리뷰 SLA(48시간이 흔함)와 제안-머지 소요, 리비전 횟수를 추적한다.
- **페더레이티드**: 팀이 subgraph 단위로 소유하고 경계 안에서는 승인 없이 독립 배포한다. 빠른 반복과 배포 독립이 장점, 대가는 더 강한 표준과 도구다 — 소유권 레지스트리(subgraph → 팀 매핑), 의존 팀 자동 알림, 배포 전 전체 subgraph와의 composition 검증(실패 시 배포 거부). breaking change는 소비 팀 승인을 요구한다. 한 엔티티에 여러 팀이 필드를 기여하면 `@owner` 같은 custom directive로 소유를 표시해 리뷰어 배정, 문의 라우팅 도구가 쓰게 하기도 한다.
- **하이브리드**: User, 공통 인터페이스, 에러 타입, 루트 필드 같은 공유 핵심은 중앙이, 도메인 특화 타입은 팀이 소유한다. 어떤 타입이 중앙 관할이고 변경 제안 절차가 무엇인지 명시적 문서화가 전제다.

규모에 따라 진화시킨다: 작을 땐 직접 소통으로 충분하고, 리뷰 병목과 우선순위 충돌이 생기면 가이드라인과 승인 절차를 갖추고, 스키마가 한 팀이 감당 못 할 만큼 커지면 페더레이티드로 간다(전제는 명확한 도메인 경계, 분산 소유 문화, registry와 composition 인프라). 변형으로 guild 모델(스키마 전문가들이 조율하되 변경을 게이트하지 않음)도 있다 — 일관성과 자율의 절충이지만 개인 챔피언 의존이 약점이다. 어느 모델이든 정기 스키마 헬스 리뷰(분기 단위로 미사용 필드, 문서화 커버리지, 유사 타입 통합 기회 점검)로 누적 부채를 걷어낸다. 페더레이티드와 하이브리드에는 게이트키핑이 아니라 팀이 스스로 좋은 결정을 내리게 하는 프레임워크를 만드는 working group을 둔다(각 도메인 subgraph 리드, graph champion, 플랫폼 담당, 임원 스폰서). 효과는 제안-배포 소요, breaking change 빈도, CI vs 프로덕션 적발 비율, 팀 만족도로 측정해 조정한다.

## 흔한 실수

- 필요 검증 없이 조기 도입 (전담 팀 없이 gateway, registry 운영 부담만 증가).
- composition 검증 없이 subgraph 배포 (충돌이 합성 시점에 조기 차단되지 못하고 publish, 배포 시점에야 드러남).
- 페더레이션이 규모의 필수 조건이라는 가정 (모놀리식 GraphQL로 대규모를 운영하는 사례가 있다).

## 면접 체크포인트

- Federation이 MSA에서 하는 역할 (여러 서비스 스키마를 단일 그래프로, 팀 자율성과 단일 API 양립)
- gateway와 schema composition이 각각 무엇을 책임지나
- 한 쿼리가 여러 subgraph를 가로지르는 흐름 (@key 참조와 조립)
- 언제 도입하지 말아야 하나 (전담 인프라 비용, 모놀리식 우선 전략)
- 거버넌스 3모델(중앙집중, 페더레이티드, 하이브리드)과 선택 기준, 규모별 진화

## 관련 문서

- [[GraphQL|GraphQL 개념 (단점: MSA에서의 복잡도)]]
- [[GraphQL-Schema-Design|스키마 설계 (도메인 경계, shared language)]]
- [[Content-Availability-System-Design|Federation subgraph 실전 사례 (콘텐츠 가용성 조회 시스템)]]

## 출처

- [graphql.org — GraphQL federation](https://graphql.org/learn/federation/)
- [graphql.org — Schema Ownership and Governance Models](https://graphql.org/learn/governance-ownership/)
- [graphql.org — Review and validate schema changes](https://graphql.org/learn/schema-review/)
