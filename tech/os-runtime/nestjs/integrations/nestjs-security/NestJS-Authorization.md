---
tags: [nestjs, authorization, policy, guards]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS Policy와 서비스 인가"]
---

# NestJS Policy와 서비스 인가

`@nestjs/authorization`은 singleton `@Policy()` provider의 ability를 호출해 동작을 허용한다. 인증은 주체를 정하고 인가는 그 주체가 해당 업무와 resource를 바꿀 수 있는지 판단한다.

## Policy와 route 계약

ability의 첫 인자는 사용자이며 boolean/Promise<boolean> 결과 중 **literal true만 허용**한다. global guard는 `@Can()`이 있는 route만 검사하므로 인증과 달리 전체 route에 정책이 자동 적용되지 않는다. 등록되지 않은 policy/ability는 시작 시 거부한다.

`@Can()`은 사용자를 인자로 호출하는 route 수준의 ability에 적합하다. record-dependent 검사는 service에서 resource를 읽은 뒤 실행한다. URL parameter의 resource 소유권이 인증된 사용자와 같은지는 별도 조건이다.

Policy는 singleton이고 ordinary DI를 사용한다. request/transient policy 또는 request-scoped dependency로 scope가 올라가는 구성은 시작 시 실패한다. `before(user, ability, args)`의 true는 허용, false는 거부, undefined는 ability로 위임한다. 관리자 true를 모든 ability에 반환하면 나중에 추가한 업무도 우회하므로 환불/출고 같은 불변조건은 별도로 보호한다.

## 인증 guard와 순서

AuthenticationModule을 AuthorizationModule보다 먼저 import해 인증을 선행한다. 공식 인증 marker로 잘못된 순서를 발견하면 시작 오류다. custom guard는 이름만으로 완전한 검증이 안 되어 warning 후 시작할 수 있다.

`app.useGlobalGuards()`나 request-scoped APP_GUARD는 singleton APP_GUARD 인가보다 뒤에 실행될 수 있다. custom 인증은 singleton APP_GUARD를 먼저 등록하거나 global authorization을 끄고 `@UseGuards(auth, AuthorizationGuard)` 순서를 명시한다. hybrid application은 `inheritAppConfig: true`로 guard와 오류 변환을 상속해야 한다.

## Service의 can과 authorize

`can()`은 거부에 false를 반환하고 예외/denied event를 만들지 않는다. 목록을 filter할 때는 권한 조건을 DB query로 옮겨 pagination과 집계를 일치시킨다. 모든 record를 읽어 async can을 반복하는 방식은 N+1과 정보 노출을 만든다.

`authorize()`는 미인증을 401, 권한 부족을 403으로 설명하는 AuthorizationError를 던진다. handler에서는 transport별로 변환되지만 middleware/guard 바깥 등 매핑 범위 밖에서는 500이 될 수 있다. 그 경우 can 결과를 보고 해당 계층의 예외를 직접 선택한다.

| 경로 | 거부 표현 |
|---|---|
| HTTP handler | 401/403 |
| GraphQL handler | field error의 code, httpStatus |
| WebSocket/RPC | transport 오류 payload |
| GraphQL WebSocket | message의 오류, HTTP/Apollo formatError와 동일하지 않음 |

resource 존재 자체를 숨길 필요가 있으면 can을 보고 404로 반환한다. UI에 노출한 can flag는 서버 실행 시점의 인가를 대신하지 않는다.

## 현재 message/operation의 사용자

기본 사용자 추출은 HTTP req.user, GraphQL의 현재 operation getter 또는 context req.user, WebSocket의 현재 message getter 또는 client/data user, RPC context user다. RPC payload는 신뢰 가능한 인증 주체로 읽지 않는다.

공식 authentication 연동의 사용자 getter는 현재 주체가 anonymous인 null과 답이 없는 undefined를 구별한다. 연결 객체에 남은 마지막 user를 custom getUser로 직접 읽으면 동시 operation의 주체를 섞을 수 있다. 현재 context가 우선이다.

## 동시성과 캐시

service에서 policy를 통과한 뒤 다른 transaction이 상태를 바꿀 수 있다. 환불 가능성 검사는 조건부 DB update와 외부 결제 멱등성으로 이어져야 한다. policy 확인만으로 이 경쟁을 막지 못한다.

URL별 cache interceptor가 handler보다 먼저 이전 사용자의 결과를 반환하면 service 인가가 실행되지 않는다. resource cache는 인가 아래에 두거나 사용자/권한을 포함한 key와 적절한 invalidation을 설계한다.

`before()`를 생략하는 ability 단위 테스트와 policy 전체 테스트를 구분한다. denied event에는 policy/ability/user/args가 들어갈 수 있으므로 필요한 식별자만 선택해 기록하고 record 전체나 비밀값을 log로 복사하지 않는다.

## 출처

- [NestJS Documentation, Authorization](https://docs.nestjs.com/security/authorization)

## 관련 문서

- [[NestJS-Authentication]]
- [[NestJS-Guards]]
- [[NestJS-Caching-Integration]]
- [[NestJS-Idempotency]]
