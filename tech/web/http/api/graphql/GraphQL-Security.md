---
tags: [web, graphql, api, security, authorization]
status: done
verified_at: 2026-07-15
category: "웹&네트워크(Web&Network)"
aliases: ["GraphQL Security", "GraphQL 보안", "demand control", "depth limiting", "query complexity", "GraphQL authorization"]
---

# GraphQL 보안과 인가

GraphQL 공격은 상당수가 DoS다. 클라이언트가 응답 모양을 정하는 유연함이 곧 한 요청으로 서버에 과부하를 걸 여지가 된다. 방어는 요청이 요구하는 양을 실행 전에 제한하는 demand control과, 누가 무엇을 볼 수 있는지의 인가로 나뉜다. 인가는 스키마나 resolver가 아니라 비즈니스 로직 계층에 둔다.

## demand control (요구량 제한)

한 요청이 끌어갈 수 있는 데이터 양을 제한하는 계층들. 공식은 정성적 원칙만 주고 최대 depth 7 같은 구체 수치는 주지 않는다.

- **trusted document**: 개발 때 작성한 연산만 허용 목록에 올리고, 런타임엔 클라이언트가 문서 id(대개 해시)만 보내 서버가 아는 id만 실행한다. 실행 전 게이트. 3rd-party가 연산을 미리 못 정하는 public API엔 못 쓴다.
- **paginated fields**: List 필드가 많은 데이터를 낼 수 있으면 페이지네이션으로 한 번에 반환할 최대치를 제한한다([[GraphQL-Pagination|페이지네이션]]).
- **depth limiting**: 연산의 최대 필드 깊이를 제한하고 초과 시 실행 전에 에러를 낸다. 중첩 리스트는 지수적으로 커질 수 있어 더 작은 별도 한도를 건다.
- **breadth, batch limiting**: 최상위 필드 수와 alias 수를 제한하고, 한 배치에 담기는 쿼리 수에 상한을 둔다. alias 남용(`friends1` 부터 `friends100` 까지)이 여기 걸린다.
- **rate limiting**: 특정 필드가 비싸다는 것을 depth나 breadth로는 표현하지 못하니, 더 정밀한 제어로 rate limit을 건다. 서버가 요청 수만으로 비용을 미리 알 수 없어, 네트워크 계층이 아니라 비즈니스 로직 계층에서 거는 것을 권장한다.
- **query complexity analysis**: 타입과 필드에 가중치를 매겨 요청 비용을 추정하고, 요청당 최대 비용을 넘으면 거절한다. 그 비용을 rate limit 예산에서 차감할 수도 있다.

complexity와 rate limit은 스펙이 가이드를 주지 않는다. 커뮤니티 드래프트 스펙의 custom 타입 시스템 directive로 구현한다.

## introspection 차단

- first-party 클라이언트만 쓰는 API는 non-dev 환경에서 introspection을 막을 수 있다.
- 단 이건 security through obscurity라 그 자체로 충분하지 않다. 에러 메시지로 스키마 모양을 추론당할 수 있어서, 민감한 스키마와 데이터 보호는 trusted document와 인가로 한다.

## 그 밖의 공격 표면

- alias 기반 breadth 공격, cyclic 쿼리(depth limit으로 완화), batching 공격.
- 인자 값 주입: `commentary` 같은 문자열의 unsafe HTML 등은 resolver가 부르는 비즈니스 로직 계층에서 sanitize한다.
- 에러 메시지가 스키마나 데이터 소스 정보를 흘리지 않게 마스킹한다.

## 인가는 비즈니스 로직 계층에

- 인가는 이 사용자나 세션이 이 행동이나 데이터에 권한이 있는지를 정하는 비즈니스 로직이다(예: 작성자만 자기 초안을 본다).
- resolver 안에 인가를 박으면 진입점(REST, GraphQL, RPC)마다 복제해야 하고, 어긋나면 API에 따라 다른 데이터가 보인다. 그래서 단일 진실 소스인 비즈니스 로직 계층에 위임한다. resolver는 `postRepository.getBody({ user, post })`처럼 그 계층을 호출만 한다.
- resolver 내 인가는 학습이나 프로토타입엔 괜찮지만 프로덕션은 위임한다.
- 인증 vs 인가: 실행은 인증 미들웨어가 신원을 확인한 뒤 시작하고, 그 뒤 요청된 필드를 이 사용자가 볼 수 있는지 인가로 정한다. 비즈니스 로직 계층엔 불투명 토큰이 아니라 완전히 하이드레이션된 user 객체를 넘긴다.
- 타입 단위와 필드 단위 인가 모두 가능하다. 굳이 GraphQL 계층에서 하려면 `@auth` 같은 타입 시스템 directive가 대안이지만, 실제 인가 로직은 여전히 비즈니스 로직 계층에 위임한다.

## 타이밍: demand control은 실행 전, 인가는 실행 중

demand control은 대체로 실행 전에 요청을 막고(depth limit은 명시적으로 실행 시작 전), 인가는 실행이 시작된 뒤 필드별로 판단한다. 라이프사이클 위치는 [[GraphQL-Architecture-Map|지도]]의 validate와 execute 단계와 겹친다.

## 흔한 실수

- introspection만 끄면 안전하다고 믿음(security through obscurity, 그 자체로 불충분).
- complexity나 rate limit이 스펙 기본이라고 가정(커뮤니티 드래프트, custom directive).
- rate limit을 무조건 게이트웨이에서 처리(비용을 미리 모르니 비즈니스 로직 계층 권장).
- 인가를 resolver마다 산발적으로(단일 진실 소스에 위임).
- 최대 depth 같은 고정 수치가 공식에 있다고 가정(정성적 원칙만).
- 에러 메시지로 스키마를 흘림.

## 면접 체크포인트

- demand control 계층들(trusted document, pagination, depth, breadth와 batch, rate limit, complexity)과 각자 막는 것
- complexity와 rate limit이 왜 스펙이 아니라 custom directive인가
- introspection 차단이 왜 그 자체로 불충분한가
- 인가를 비즈니스 로직 계층에 두는 이유(단일 진실 소스, 진입점 간 일관성)
- demand control은 실행 전, 인가는 실행 중이라는 타이밍 차이

## 관련 문서

- [[GraphQL|GraphQL 개념]]
- [[GraphQL-Query-Language|introspection]]
- [[GraphQL-Pagination|paginated fields]]
- [[GraphQL-Schema-Design|비즈니스 로직 계층]]
- [[GraphQL-Architecture-Map|전체 그림 지도 (validate 단계 demand control)]]

## 출처

- [graphql.org — Security](https://graphql.org/learn/security/)
- [graphql.org — Authorization](https://graphql.org/learn/authorization/)
