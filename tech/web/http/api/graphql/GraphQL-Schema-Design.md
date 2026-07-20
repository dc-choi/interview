---
tags: [web, graphql, api, schema, schema-design]
status: done
verified_at: 2026-07-20
category: "웹&네트워크(Web&Network)"
aliases: ["GraphQL Schema Design", "GraphQL 스키마 설계", "nullability", "schema versioning", "mutation payload"]
---

# GraphQL 스키마 설계

스키마는 DB 테이블이나 REST 엔드포인트가 아니라 클라이언트가 쓰는 도메인을 그래프로 표현한다. 문법이 아니라 nullability 전략, 버전 없는 진화, mutation 모양, 그리고 규칙을 어디에 두느냐(비즈니스 로직 계층)가 핵심 축이다. 타입 kind 문법은 [[GraphQL-Schema-Types|타입 시스템]]에 있다.

## nullable가 기본인 이유

- null을 인지하는 타입 시스템 대부분은 기본 타입에 null이 포함되지 않고 nullable을 명시적으로 선언하게 한다. GraphQL은 반대로 모든 필드가 기본 nullable이다. 네트워크 서비스에선 DB 다운, 비동기 실패, 예외, 그리고 필드 단위로 다른 인가 규칙 등 잘못될 게 많기 때문이다.
- 기본이 nullable이면 그중 무엇이 터져도 요청 전체가 실패하는 대신 그 필드만 null로 돌려 부분 결과를 준다.
- non-null(`!`)은 클라이언트에 이 필드는 절대 null이 아니라고 약속한다. 대신 그 필드가 null이 되면(resolver 에러) 부모 필드가 null이 된다.

## non-null은 계약, 남용은 위험

- non-null 출력은 서버 약속, non-null 인자는 검증 규칙이다(문법은 [[GraphQL-Schema-Types|타입 시스템]]).
- 남용 위험: non-null 필드가 null이 되면 부모로 전파되고, 부모도 non-null이면 더 위로 올라가 최악엔 `data`가 통째로 null이 된다(null bubbling, 전파 단계는 [[GraphQL-Architecture-Map|지도]]). 작은 실패가 큰 구멍이 된다. null이 그 필드에 적절한 값인지 따져 정말 아닐 때만 non-null을 준다.

## 버전을 피한다

- REST가 버전을 파는 이유는 반환 데이터를 클라이언트가 통제하지 못해 어떤 변경이든 breaking이 될 수 있어서다. 그 대가로 기능을 붙일 때마다 새 버전이 필요해져, 자주 릴리스하며 버전을 증식시킬지 API의 이해가능성과 유지보수성을 지킬지의 트레이드오프가 생긴다.
- GraphQL은 요청한 필드만 반환하므로 새 타입이나 새 필드 추가는 breaking이 아니다. 그래서 관례가 breaking change를 피하고 버전 없는 API를 서빙하는 것이다.
- breaking change로 치는 것(공식 스키마 리뷰 가이드 기준): 필드나 타입 제거, 인자 제거와 개명, 필수(기본값 없는 non-null) 인자 추가, enum 값 제거, 필드 타입 변경, 출력 필드를 non-null에서 nullable로 약화(약속 파기). 타입 개명이나 object에서 interface로의 전환처럼 런타임엔 호환일 수도 있는 변경도 확신할 수 없으므로 breaking으로 취급한다. 반대 방향(출력 nullable에서 non-null, 인자 required에서 optional, 새 필드 추가)은 안전하다.
- 그 사이의 dangerous change: enum 값 추가, union이나 interface에 새 멤버 타입 추가, input 타입에 필드 추가. 스키마 계약상 breaking은 아니지만 enum이나 `__typename`을 exhaustive하게 매칭하거나 spread로 input을 조립하는 구식 클라이언트를 깰 수 있다. 클라이언트 쪽 대비는 아래 클라이언트도 진화를 견디게.
- 제거 대신 `@deprecated`로 표시하고 스키마 diff 도구(Apollo, GraphQL Inspector)로 회귀를 잡는다. 버저닝을 피하는 대신 부담이 호환성 규율과 도구로 옮겨간다. 불가피한 breaking은 4단계로 굴린다: 대체 필드 추가 → 구 필드 `@deprecated`(대체 경로와 제거 시점 명시) → 필드 사용량 계측으로 이관 확인(예: 최근 30일 0건, 계절성 감안) → 사용이 0일 때 제거.

## 클라이언트도 진화를 견디게

버전 없는 진화는 클라이언트가 추가 변경을 견딜 때만 성립한다. 스키마 인식 클라이언트(TypeScript codegen, Apollo iOS, Apollo Kotlin)는 일부를 빌드 타임에 잡아 주지만, 동적 언어나 스키마 비인식 환경에선 앱 코드가 직접 챙겨야 한다. 흔히 깨지는 세 곳:

- **모르는 enum 값**: enum엔 언제든 값이 추가될 수 있다. fallback 없는 exhaustive switch는 새 값에서 크래시하거나 조용히 데이터를 버린다. 항상 default 분기를 두고, codegen이 catch-all 값(`__UNKNOWN`)을 생성해 주면 그걸 쓴다. JSON.parse 같은 내장 파서를 쓰는 환경에선 catch-all 매핑이 안 되므로 codegen이 합성 sentinel 값을 넣어 default 분기를 강제하기도 한다 — sentinel은 이름으로 매칭하지 말고 default로만 처리한다.
- **모르는 union, interface 멤버**: union과 interface엔 새 멤버 타입이 추가될 수 있다. `__typename`을 항상 조회하고, 인식 못 하는 타입이면 크래시 대신 우아하게 강등한다(unknown 렌더링). 구버전 앱이 확장된 스키마를 만나는 장수 모바일 앱에서 특히 중요하다.
- **nullable 필드 강제 언랩 금지**: nullable은 값이 없을 수 있다는 스키마의 명시적 신호다(데이터가 선택적이거나, 그 필드만 에러가 나 응답 전체를 실패시키지 않았거나). Swift `!`, Kotlin `!!`, TypeScript non-null assertion으로 우회하면 우아한 부분 응답이 크래시로 바뀐다. optional chaining, guard let, null 병합으로 접근하고, 정말 항상 있어야 하는 필드라면 스키마 쪽을 non-null로 바꿔 보증을 스키마에 인코딩한다.

## mutation 설계

- 인자는 input object로 구조화해 넘긴다(특히 생성).
- 반환 타입: graphql.org 관례는 변경된 엔티티 자체를 반환하는 것이다(`createReview: Review`, `updateHumanName: Human`). 클라이언트가 갱신 후 상태를 바로 가져오게 하려는 것.
- 목적 특화 mutation: 범용 `updateHuman` 하나보다 `updateHumanName`처럼 좁게 쪼개면 인자를 non-null로 둘 수 있어 표현력이 오른다. 범용은 온갖 nullable 인자와 런타임 검증을 떠안는다.
- 삭제 반환: 스펙이 정하지 않아 삭제된 id나 payload 객체로 성공을 알린다.
- payload 래퍼 패턴(errors-as-data): 엔티티 대신 `CreateReviewPayload { review, userErrors }` 같은 결과 타입으로 감싸, 예상되는 도메인 에러(userErrors)를 top-level `errors`가 아니라 데이터로 돌려준다. Relay, Apollo 관례로 출발했고 현재는 공식 에러 처리 가이드도 도메인 에러에 이 패턴을 권장한다. userError에 message, 대상 field 경로, code enum(USERNAME_TAKEN 같은)을 두면 에러 상태가 스키마에 드러나 introspection으로 발견되고 타입 안전해진다. 변형으로 payload들이 `MutationResponse { code, success, message }` 같은 공통 인터페이스를 구현해 상태 필드를 표준화하는 관례도 있다. 단일 `input` 인자 관례는 Relay식이다.
- 에러 채널 선택 기준은 예외성이다: 인프라 장애(DB 타임아웃), 잘못된 GraphQL(문법 오류, 없는 필드), 인증 부재 같은 예외적 실패는 top-level `errors`로, 비즈니스 규칙 위반(사용자명 중복), 입력 검증 실패, 도메인 제약(재고 부족) 같은 예상되는 실패는 errors-as-data로 돌려준다. top-level error에는 `extensions`에 기계가 읽을 code(예: INTERNAL_SERVER_ERROR)를 싣는 관례가 있다.
- 직렬이지 트랜잭션이 아니다: mutation 최상위 필드는 순차 실행된다 — 한 요청에 같은 자원을 건드리는 필드 둘을 보내도 앞 필드가 끝난 뒤 다음이 시작돼 자기 자신과의 race condition이 없다. 하지만 일부 성공 일부 실패 시 GraphQL은 성공분을 되돌리지 못한다. 원자성이 필요하면 비즈니스 로직 계층에서 직접 만든다. (스펙상 최상위 mutation 필드 외의 필드 resolution은 side-effect-free하고 idempotent해야 한다.)

## 네이밍 컨벤션

스펙은 네이밍을 정하지 않는다. 아래는 프로덕션에서 검증된 관례로, 벗어날 수 있지만 의도적으로 벗어나고 이유를 문서화한다.

- 케이스: 필드, 인자, directive는 camelCase. 타입, enum, interface, union은 PascalCase. enum 값은 SCREAMING_SNAKE_CASE.
- Boolean 필드는 is, has 접두사(스펙 introspection의 `isDeprecated`도 이 패턴). 리스트 필드는 복수 명사. query 필드엔 get, fetch 같은 동사 접두사를 붙이지 않는다 — 연산 타입이 이미 조회임을 말하고, 중첩 필드와도 어긋난다.
- mutation 네이밍은 두 전략이 있다: verb-first(`createUser` — 자연스럽고 비CRUD 동작에 강함) vs noun-first(`userCreate` — 엔티티별로 정렬돼 발견이 쉬움, 대형 CRUD 스키마에 유리, Shopify 관례). 어느 쪽이든 일관성이 선택 자체보다 중요하다.
- 접미사 관례: input 타입은 Input(`CreateUserInput`), connection은 `{TypeName}Connection`과 `{TypeName}Edge`.
- 리스트 필드는 관례상 `[Item!]!`로 선언해 클라이언트가 null 대신 빈 배열을 받게 한다.
- 문서화: 모든 타입과 자명하지 않은 필드에 description을 단다 — GraphiQL과 생성 문서에 노출되는 사용자 대상 문서다. deprecation에는 대체 필드와 제거 예정 시점을 함께 적는다(`@deprecated(reason: "Use 'id' instead. Removal scheduled for v3.0.")`).
- 린트로 강제한다: GraphQL-ESLint의 naming-convention, require-description, require-deprecation-reason 규칙을 CI에 태워 사람 리뷰에 의존하지 않는다.

## input 부분 업데이트의 3상 문제

- nullable input 필드는 기계적으로 세 상태를 구분한다: 필드 생략, 명시적 null, 값 전달. 무엇을 의미하는지는 API가 정하는 계약이고, 흔한 계약은 생략=변경 없음, null=값 지우기, 값=갱신이다. 부분 업데이트에서 지우기를 표현해야 할 때 이 구분이 핵심이 된다.
- 모호함을 피하려고 `clearBio: Boolean` 같은 명시 플래그를 두는 팀도 있다. 어느 쪽이든 동작을 필드 description에 문서화한다.

## custom scalar 사용 판단

- DateTime, Date, Email, URL, UUID, JSON처럼 형식과 검증 규칙이 명확한 값은 String 대신 custom scalar로 만든다. 검증이 GraphQL 계층으로 당겨져 잘못된 값이 resolver에 닿기 전에 실패하고, 스키마가 자기 문서화된다(graphql-scalars 라이브러리, scalars.graphql.org 커뮤니티 명세).
- 비용도 있다: 클라이언트와 서버 양쪽에 구현이 필요하고 이식성이 준다. Username, ProductCode처럼 비즈니스 규칙 있는 문자열일 뿐인 값엔 만들지 말고 resolver가 부르는 로직에서 검증한다.

## 도메인을 그래프로

- 비즈니스 도메인을 노드와 관계의 그래프로 모델링한다. 그래프가 자연스러운 멘탈 모델에 가깝다. 클라이언트 쪽에선 타입이 타입을 참조하는 OOP 비슷한 패턴이 되고, 서버 쪽에선 GraphQL이 인터페이스만 정의하므로 신규든 레거시든 어떤 백엔드와도 붙는다.
- DB를 그대로 비추지 말고 클라이언트가 데이터를 쓰는 방식을 표현한다. what이 아니라 how를 표현하면 인터페이스를 깨지 않고 구현을 바꿀 수 있다.
- 한 번에 전 도메인을 모델링하지 말고 시나리오 하나씩 점진 확장해 피드백을 자주 받는다.
- 스키마는 팀과 사용자의 공유 언어(공식 표현은 shared language)다. 일상 업무 언어에서 직관적이고 오래 가는 이름을 고른다. DDD의 유비쿼터스 언어와 같은 취지지만 공식 용어는 shared language다.
- 이름을 얻는 기법: 도메인을 평문 문장으로 서술해 보고(사용자는 여러 이메일 계정을 가진다, 계정마다 inbox와 drafts가 있다 식), 실제로 날리고 싶은 쿼리를 먼저 상상해 그 모양에서 노드, 관계, 필드 이름을 뽑는다.

## 규칙은 비즈니스 로직 계층에

- 검증, 인가, 에러 처리는 전용 비즈니스 로직 계층에 두고 그것이 도메인 규칙의 단일 진실 소스가 된다.
- REST, GraphQL, RPC 모든 진입점이 같은 검증, 인가, 에러 규칙을 태운다. 그래서 인가를 스키마나 resolver에 흩뿌리지 않는다(→ [[GraphQL-Security|인가]]).

## 흔한 실수와 안티패턴

- DB 스키마를 그대로 GraphQL로 노출.
- 관계를 객체 대신 외래키 id로 노출(`authorId: ID!`가 아니라 `author: User!` — 관계는 그래프의 간선으로).
- non-null 남용으로 작은 실패가 큰 null 구멍이 됨.
- mutation을 트랜잭션으로 착각(부분 성공 롤백 없음).
- 범용 CRUD mutation 하나로 온갖 케이스를 떠안음.
- 인가를 resolver마다 산발적으로 흩뿌림.
- 필드 제거나 타입 변경으로 조용히 클라이언트를 깨뜨림(`@deprecated`와 diff 도구로 회피).

## 면접 체크포인트

- nullable 기본값이 왜 회복탄력성 설계인가, non-null 남용의 대가(부모 전파)
- GraphQL이 버저닝을 피하는 법과 그 부담이 어디로 가나(호환성 도구, deprecation 규율)
- 버전 없는 진화가 클라이언트에 요구하는 것(enum default 분기, unknown `__typename` 강등, nullable 안전 접근)
- mutation이 직렬이지만 트랜잭션이 아니라는 것과 원자성 대응
- payload와 userErrors 패턴이 왜 나왔나(예상되는 도메인 에러는 데이터로, 예외적 실패만 top-level errors로)
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
- [graphql.org — Error Handling](https://graphql.org/learn/error-handling/)
- [graphql.org — Robust Applications](https://graphql.org/learn/robust-applications/)
- [graphql.org — Naming Conventions and Design Standards](https://graphql.org/learn/naming-design/)
- [graphql.org — Review and validate schema changes](https://graphql.org/learn/schema-review/)
- [Apollo Server — Schema basics (MutationResponse 패턴)](https://www.apollographql.com/docs/apollo-server/schema/schema)
