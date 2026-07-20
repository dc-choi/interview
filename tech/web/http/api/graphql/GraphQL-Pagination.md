---
tags: [web, graphql, api, pagination]
status: done
verified_at: 2026-07-15
category: "웹&네트워크(Web&Network)"
aliases: ["GraphQL Pagination", "GraphQL 페이지네이션", "Relay Connection", "커서 페이지네이션", "Global Object Identification"]
---

# GraphQL 페이지네이션 (Connection과 Global Object ID)

큰 리스트를 잘라 주는 방식. GraphQL이 권장하는 정본은 cursor 기반 connection 모델이다. offset은 단순하지만 대용량과 동시 삽입에 약하고, cursor는 불투명 토큰이라 백엔드 페이징 전략을 감춰 안정성과 교체 자유를 준다. 여기에 객체를 전역 유일 ID로 식별하는 Global Object Identification이 붙으면 클라이언트 캐시와 단건 refetch가 표준화된다.

## 언제 페이지네이션인가

- 작고 상한이 있는 리스트는 그냥 복수형 List 필드로 충분하다.
- 많은 데이터를 반환할 수 있는 리스트는 페이지네이션한다(공식 권고 규칙).
- 클라이언트가 몇 개를 가져올지(`first: 2`), 그다음 페이지를 어떻게 이어갈지 통제하고 싶어지는 순간이 분기점이다.

## offset 기반과 한계

- 형태: `friends(first: 2, offset: 2)`. 고전적 offset 페이지네이션.
- 공식이 명시한 단점: 대용량에서 성능과 보안 문제, 그리고 요청 사이에 새 레코드가 삽입되면 다음 페이지 offset 계산이 ambiguous해진다. 페이지 경계가 어긋나 앞쪽 삽입은 행 중복을, 앞쪽 삭제는 누락을 낳는다.
- (일반 지식) 큰 OFFSET은 앞 행을 다 세고 버려서 느리다. 대신 offset은 임의 페이지 점프(50페이지로)와 전체 페이지 수 계산이 쉽다.

## cursor 기반

- 형태: `friends(first: 2, after: $cursor)`. 마지막 항목의 cursor를 받아 그다음을 잇는다.
- cursor는 불투명 토큰이다. 형식에 의존하지 말라는 신호로 base64 인코딩을 권장한다. 클라이언트가 cursor를 파싱하면 백엔드가 페이징 전략을 못 바꾼다.
- 공식 평가: cursor 기반이 가장 강력하다. 불투명 cursor면 offset이든 ID든 그 아래로 구현할 수 있어, 나중에 페이징 모델을 바꿔도 클라이언트는 그대로다.
- 양방향: 앞으로는 `first`/`after`, 뒤로는 `last`/`before`. 뒤로 페이지네이션은 Relay Cursor Connections 스펙에 정의돼 있고, 단순화된 입문 예제에서는 forward만 다루기도 한다.

## Connection 모델 (Relay)

- edge 층이 있는 이유: cursor는 객체(User)가 아니라 connection의 속성이라 node 바깥에 둔다. edge는 node와 cursor를 함께 들고, 관계 고유 정보(예: 친구가 된 시각)를 얹을 자리도 된다.
- connection은 edges와 pageInfo를 담는다. `totalCount`는 Relay Cursor Connections의 필수 field가 아닌 schema별 선택 확장이다.

```graphql
type FriendConnection {
  totalCount: Int              # 선택 확장. 선언했다면 선택 결과는 값 또는 null
  edges: [FriendEdge]
  pageInfo: PageInfo!
}
type FriendEdge {
  cursor: String!              # 불투명 위치 토큰
  node: User
  friendshipTime: DateTime     # edge 고유 메타 예시
}
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

- `pageInfo.endCursor`만 있으면 `edges`를 안 골라도 다음 페이지를 요청할 수 있다.
- edge 메타가 필요 없는 클라이언트를 위해 connection 안에 node만 담는 직통 리스트 필드를 따로 노출할 수 있다(예: connection 타입에 `friends: [User]` 헬퍼 필드). edge 간접층을 건너뛰는 사용성 개선이고, 페이지네이션에 필요한 cursor는 pageInfo에서 얻는다.
- Schema에서 `totalCount` field 자체를 노출하지 않을 수 있다. Field를 선언했고 client가 선택했다면 response key를 임의로 생략할 수 없으며 값이나 `null`을 반환해야 한다. Nullable로 두면 COUNT가 너무 비싼 조건에서 `null`을 반환하는 계약을 설계할 수 있다.
- 위 표준형(`String` cursor, 양방향 pageInfo)은 Relay Cursor Connections 스펙 기준이다. 입문용 단순 예제에서는 cursor를 `ID`로 두고 `hasPreviousPage`를 생략하기도 한다.

## Global Object Identification

- 목적: 캐싱과 refetch를 우아하게 하려면 서버가 객체 식별자를 표준 방식으로 노출해야 한다. 이 식별 스펙은 Relay 클라이언트 호환 기준으로 서술되지만 어떤 클라이언트에도 유용하다.
- Node 인터페이스: `id: ID!` 하나. 이 id는 전역 유일이고, id만으로 서버가 객체를 다시 가져올 수 있어야 한다.

```graphql
interface Node { id: ID! }

type User implements Node {
  id: ID!
  name: String!
}

type Query {
  node(id: ID!): Node          # 단건 refetch 진입점, 정확히 인자 하나(non-null id)
}
```

- 타입별 필드는 inline fragment로 꺼낸다: `node(id: "4") { id ... on User { name } }`.
- refetch 실패(객체 삭제, DB 불가)는 null 반환이 정상이다. 유효했던 id도 null일 수 있으니 처리해야 한다.
- field-stability 불변식: 한 응답에 같은 id의 두 객체가 있으면 둘은 같아야 한다. 이게 클라이언트가 id로 캐시를 정규화(중복 병합)할 수 있는 근거다.
- ID 인코딩: 스펙은 전역 유일만 요구한다. Relay 관례로 base64(`"Type:id"`)를 흔히 쓴다(타입과 DB id를 합쳐 전역 유일 + 불투명). 공식 요구가 아니라 관례임에 주의.
- plural identifying root field: username 같은 자연 키의 리스트로 객체들을 배치 조회하는 루트 필드(예: `usernames(usernames: [String!]!)`). 인자는 non-null 리스트 of non-null 하나뿐이어야 하고, 반환은 Node(또는 구현 타입)의 리스트다. 응답 리스트는 입력과 길이가 같고 순서가 대응해야 한다(입력을 치환하면 출력도 같은 치환) — 클라이언트가 입력과 응답을 위치로 짝짓는 근거. 응답 원소를 non-null로 감싸지 않기를 권한다. 특정 입력의 객체를 못 가져와도 그 자리에 값을 내야 하므로 null이 유용하다.
- cursor와 global id는 다르다: cursor는 connection 내 위치 표식, global id는 객체 자체의 정체성. 예제 타입이 겹쳐 보여도 개념이 다르다.

## 설계 트레이드오프

- cursor vs offset: cursor는 동시 삽입에도 안정적이고 백엔드 페이징을 감춘다. offset은 임의 페이지 점프와 전체 페이지 수 계산이 쉽다. 무한 스크롤, 피드는 cursor, 페이지 번호 UI는 offset이 자연스럽다.
- totalCount 비용: 필수 field가 아니므로 필요할 때만 schema에 노출한다. Nullable로 설계했다면 계산 불가 조건과 `null` 의미를 문서화한다.
- connection 과설계: 페이지네이션도, connection과 edge 메타도, 백엔드 교체 자유도 다 필요 없으면 그냥 복수형 List가 낫다. 공식도 connection이 더 복잡함을 인정한다.

## 흔한 실수

- cursor를 객체 타입에 두기. edge에 둬야 한다.
- cursor 형식에 의존. 불투명으로 취급하고 base64는 파싱 억제 신호로 본다.
- offset이 항상 일관되다고 가정. 앞쪽 삽입은 중복, 앞쪽 삭제는 누락을 낳는다.
- 작은 리스트를 connection으로 과설계.
- node refetch가 항상 성공한다고 가정. null 처리를 빠뜨림.
- totalCount가 Relay 필수 field이거나 항상 싸다고 가정. 선택 확장이며, 선언하고 요청받은 field의 response key를 임의로 생략하면 안 된다.
- 전역 id 안정성 위반(같은 id에 다른 데이터). 클라이언트 캐시 정규화가 깨진다.

## 면접 체크포인트

- offset의 두 실패(대용량 성능, 삽입 시 offset ambiguous)와 cursor가 어떻게 푸는가
- 불투명 cursor가 백엔드에 주는 자유(페이징 전략 교체)
- edge 층이 왜 필요한가(cursor 위치 + edge 고유 메타)
- Global Object Identification이 클라이언트 캐시 정규화와 어떻게 연결되나(field-stability 불변식)
- cursor vs offset 선택 기준(무한 스크롤 vs 페이지 번호 UI)

## 관련 문서

- [[GraphQL|GraphQL 개념]]
- [[GraphQL-Architecture-Map|전체 그림 지도]]
- [[GraphQL-Schema-Types|타입 시스템 (interface, non-null과 list 수식자)]]
- [[API-Conventions-Response|REST 페이지네이션 (offset, cursor 대조)]]

## 출처

- [graphql.org — Pagination](https://graphql.org/learn/pagination/)
- [graphql.org — Global Object Identification](https://graphql.org/learn/global-object-identification/)
- [Relay — GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- [GraphQL September 2025 Specification — Response](https://spec.graphql.org/September2025/#sec-Response)
