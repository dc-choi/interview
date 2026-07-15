---
tags: [web, graphql, api, schema, schema-design]
status: done
verified_at: 2026-07-15
category: "웹&네트워크(Web&Network)"
aliases: ["GraphQL Schema Design", "GraphQL 스키마 설계", "nullability", "schema versioning", "mutation payload"]
---

# GraphQL 스키마 설계

스키마는 DB 테이블이나 REST 엔드포인트가 아니라 클라이언트가 쓰는 도메인을 그래프로 표현한다. 문법이 아니라 nullability 전략, 버전 없는 진화, mutation 모양, 그리고 규칙을 어디에 두느냐(비즈니스 로직 계층)가 핵심 축이다. 타입 kind 문법은 [[GraphQL-Schema-Types|타입 시스템]]에 있다.

## nullable가 기본인 이유

- GraphQL은 모든 필드가 기본 nullable이다. 네트워크 서비스에선 DB 다운, 비동기 실패, 예외, 그리고 필드 단위로 다른 인가 규칙 등 잘못될 게 많기 때문이다.
- 기본이 nullable이면 그중 무엇이 터져도 요청 전체가 실패하는 대신 그 필드만 null로 돌려 부분 결과를 준다.
- non-null(`!`)은 클라이언트에 이 필드는 절대 null이 아니라고 약속한다. 대신 그 필드가 null이 되면(resolver 에러) 부모 필드가 null이 된다.

## non-null은 계약, 남용은 위험

- non-null 출력은 서버 약속, non-null 인자는 검증 규칙이다(문법은 [[GraphQL-Schema-Types|타입 시스템]]).
- 남용 위험: non-null 필드가 null이 되면 부모로 전파되고, 부모도 non-null이면 더 위로 올라가 최악엔 `data`가 통째로 null이 된다(null bubbling, 전파 단계는 [[GraphQL-Architecture-Map|지도]]). 작은 실패가 큰 구멍이 된다. null이 그 필드에 적절한 값인지 따져 정말 아닐 때만 non-null을 준다.

## 버전을 피한다

- REST가 버전을 파는 이유는 반환 데이터를 클라이언트가 통제하지 못해 어떤 변경이든 breaking이 될 수 있어서다.
- GraphQL은 요청한 필드만 반환하므로 새 타입이나 새 필드 추가는 breaking이 아니다. 그래서 관례가 breaking change를 피하고 버전 없는 API를 서빙하는 것이다.
- breaking change로 치는 것(공식 스키마 설계 페이지엔 목록이 없다, 일반 지식과 툴링 기준): 필드 제거, 필드 타입 변경, 기본값 없는 non-null 인자 추가, 출력 필드를 non-null에서 nullable로 약화(약속 파기). 반대 방향(출력 nullable에서 non-null, 인자 required에서 optional, 새 필드 추가)은 안전하다.
- 제거 대신 `@deprecated`로 표시하고 스키마 diff 도구(Apollo, GraphQL Inspector)로 회귀를 잡는다. 버저닝을 피하는 대신 부담이 호환성 규율과 도구로 옮겨간다.

## mutation 설계

- 인자는 input object로 구조화해 넘긴다(특히 생성).
- 반환 타입: graphql.org 관례는 변경된 엔티티 자체를 반환하는 것이다(`createReview: Review`, `updateHumanName: Human`). 클라이언트가 갱신 후 상태를 바로 가져오게 하려는 것.
- 목적 특화 mutation: 범용 `updateHuman` 하나보다 `updateHumanName`처럼 좁게 쪼개면 인자를 non-null로 둘 수 있어 표현력이 오른다. 범용은 온갖 nullable 인자와 런타임 검증을 떠안는다.
- 삭제 반환: 스펙이 정하지 않아 삭제된 id나 payload 객체로 성공을 알린다.
- payload 래퍼 패턴(Relay, Apollo 관례이고 graphql.org 기본이 아님): 엔티티 대신 `CreateReviewPayload { review, userErrors }` 같은 결과 타입으로 감싸, 복구 가능한 도메인 에러(userErrors)를 top-level `errors`가 아니라 데이터로 돌려준다. 단일 `input` 인자 관례도 Relay식이다.
- 직렬이지 트랜잭션이 아니다: mutation 최상위 필드는 순차 실행되지만, 일부 성공 일부 실패 시 GraphQL은 성공분을 되돌리지 못한다. 원자성이 필요하면 비즈니스 로직 계층에서 직접 만든다. (최상위 mutation 필드만 side effect를 내고 나머지 resolver는 side-effect-free해야 한다.)

## 도메인을 그래프로

- 비즈니스 도메인을 노드와 관계의 그래프로 모델링한다. 그래프가 자연스러운 멘탈 모델에 가깝다.
- DB를 그대로 비추지 말고 클라이언트가 데이터를 쓰는 방식을 표현한다. what이 아니라 how를 표현하면 인터페이스를 깨지 않고 구현을 바꿀 수 있다.
- 한 번에 전 도메인을 모델링하지 말고 시나리오 하나씩 점진 확장해 피드백을 자주 받는다.
- 스키마는 팀과 사용자의 공유 언어(공식 표현은 shared language)다. 일상 업무 언어에서 직관적이고 오래 가는 이름을 고른다. DDD의 유비쿼터스 언어와 같은 취지지만 공식 용어는 shared language다.

## 규칙은 비즈니스 로직 계층에

- 검증, 인가, 에러 처리는 전용 비즈니스 로직 계층에 두고 그것이 도메인 규칙의 단일 진실 소스가 된다.
- REST, GraphQL, RPC 모든 진입점이 같은 검증, 인가, 에러 규칙을 태운다. 그래서 인가를 스키마나 resolver에 흩뿌리지 않는다(→ [[GraphQL-Security|인가]]).

## 흔한 실수와 안티패턴

- DB 스키마를 그대로 GraphQL로 노출.
- non-null 남용으로 작은 실패가 큰 null 구멍이 됨.
- mutation을 트랜잭션으로 착각(부분 성공 롤백 없음).
- 범용 CRUD mutation 하나로 온갖 케이스를 떠안음.
- 인가를 resolver마다 산발적으로 흩뿌림.
- 필드 제거나 타입 변경으로 조용히 클라이언트를 깨뜨림(`@deprecated`와 diff 도구로 회피).

## 면접 체크포인트

- nullable 기본값이 왜 회복탄력성 설계인가, non-null 남용의 대가(부모 전파)
- GraphQL이 버저닝을 피하는 법과 그 부담이 어디로 가나(호환성 도구, deprecation 규율)
- mutation이 직렬이지만 트랜잭션이 아니라는 것과 원자성 대응
- payload와 userErrors 패턴이 왜 나왔나(복구 가능한 도메인 에러를 데이터로)
- 스키마를 DB가 아니라 클라이언트 사용과 도메인 언어로 설계하는 이유

## 관련 문서

- [[GraphQL|GraphQL 개념]]
- [[GraphQL-Schema-Types|타입 시스템 (non-null, input 문법)]]
- [[GraphQL-Architecture-Map|전체 그림 지도 (null bubbling)]]
- [[GraphQL-Security|보안과 인가 (비즈니스 로직 계층)]]
- [[GraphQL-Pagination|페이지네이션]]

## 출처

- [graphql.org — Schema Design (Nullability, Versioning)](https://graphql.org/learn/schema-design/)
- [graphql.org — Thinking in Graphs](https://graphql.org/learn/thinking-in-graphs/)
- [graphql.org — Mutations](https://graphql.org/learn/mutations/)
