---
tags: [security, spring-security, authorization, policy, typeorm]
status: done
verified_at: 2026-08-04
category: "Security - 인증"
aliases: ["Spring Security Dynamic Authorization", "DB 기반 동적 인가"]
---

# Spring Security DB 기반 동적 정책

DB 기반 인가는 정책을 Code 배포 없이 바꾸게 해주지만, DB 행을 URL과 Role 문자열로 연결하는 것만으로 안전한 정책 System이 되지는 않는다. 결정 모델, Version, Cache, Rollback과 모든 집행 경계를 함께 설계한다.

## Legacy 구현을 현재 구조로 읽는다

강의의 `FilterInvocationSecurityMetadataSource`, `MapBasedSecurityMetadataSource`, `AccessDecisionManager`와 Voter는 당시의 확장 지점이다. 현재는 Request와 Method 양쪽에 `AuthorizationManager`를 구현하고 안정적인 Filter/Advisor가 Versioned Policy Snapshot을 평가하도록 구성한다.

Runtime에 Singleton Bean을 제거하고 `ProxyFactory`로 다시 등록하는 방식은 다음 위험이 있다.

- 이미 Bean Reference를 가진 Consumer와 새 Proxy가 달라질 수 있다.
- 동시 요청 중 일부만 새 정책을 볼 수 있다.
- AOP 적용, Cache, Transaction과 Lifecycle Callback이 누락될 수 있다.
- 삭제와 Rollback 뒤 원래 Bean Graph 복원이 어렵다.

동적 정책은 Container 구조를 바꾸기보다 고정된 Enforcement Point가 최신 Policy Data를 읽게 한다.

## 정책 모델

```text
decision = evaluate(subject, action, resource, environment, policyVersion)
```

| 데이터 | 예시 |
|---|---|
| Subject | userId, tenantId, role, account state |
| Action | order.read, order.cancel, policy.update |
| Resource | orderId, ownerId, tenantId, state |
| Environment | trusted network, time, risk |
| Effect | permit 또는 deny |
| Metadata | priority, version, validFrom, validTo |

HTTP Method와 Path만 저장하면 Service Method, Queue와 다른 Transport에서 같은 정책을 재사용하기 어렵다. Route Metadata는 Domain Action으로 변환하고 Policy는 Action과 Resource를 기준으로 평가한다.

## TypeORM 저장 구조

- `roles`, `permissions`, `role_permissions`와 `user_roles`: 안정적인 RBAC 기본축
- `policies`: Resource 조건, Effect, Priority와 Version
- `policy_versions`: 활성 Version, 배포 상태와 변경자
- `policy_outbox`: Commit된 변경을 Cache Subscriber에 전달

Foreign Key, Unique Constraint와 Check Constraint로 중복 Mapping, 잘못된 Effect와 Role Hierarchy Cycle을 최대한 일찍 차단한다. Admin이 임의 SpEL이나 JavaScript를 저장하게 하지 않고 Type이 제한된 Policy DSL을 사용한다.

```typescript
await dataSource.transaction(async (manager) => {
  await manager.save(PolicyEntity, nextPolicy);
  await manager.increment(PolicyVersionEntity, { scope }, 'version', 1);
  await manager.save(PolicyOutboxEntity, event);
});
```

Policy와 Version, Outbox를 같은 Transaction에 저장해야 변경 Event만 발행되거나 Policy만 바뀌는 틈을 막을 수 있다.

## Cache와 반영

1. Schema와 충돌, Role Cycle을 검증한다.
2. 새 Version을 Transaction으로 Commit한다.
3. Subscriber가 Snapshot을 Load하고 완전히 검증한다.
4. Process 안의 Reference를 원자적으로 교체한다.
5. Old Version을 일정 시간 보관해 In-flight 요청과 Rollback을 지원한다.

DB를 매 요청 조회하면 지연과 장애 결합이 커진다. Snapshot Cache는 빠르지만 즉시 반영이라는 표현을 엄밀하게 정의해야 한다. Commit, Event 전달과 각 Instance 교체 사이에는 지연이 있고 In-flight 요청은 이전 Version을 사용할 수 있다.

민감 Resource는 Policy Load 실패, Version 불일치와 평가 오류를 허용으로 바꾸지 않는다. Audit에는 Subject ID, Action, Resource ID, Policy Version, 결정과 이유 Code를 남기되 Credential과 불필요한 개인정보는 기록하지 않는다.

## IP 제한

Application IP Allowlist는 보조 통제다. 직접 연결인지 신뢰한 Reverse Proxy를 거쳤는지에 따라 Client IP 추출 규칙이 달라지고, 무조건 `X-Forwarded-For` 첫 값을 믿으면 Spoofing된다. 가능하면 Network Layer에서 먼저 제한하고 Application은 Proxy Trust 설정, CIDR Parsing과 IPv4/IPv6 정규화를 검증한다.

IP가 허용됐다는 이유만으로 인증이나 Resource 권한을 생략하지 않는다. 여러 조건을 조합할 때는 한 조건의 Grant가 전체 결정을 조기 허용하지 않도록 명시적인 결합 정책을 사용한다.

## NestJS 집행 구조

```text
APP_GUARD
  -> Reflector: action/resource metadata
  -> typed Principal
  -> PolicyService
       -> TypeORM-backed attributes
       -> versioned policy snapshot
  -> permit or ForbiddenException
```

- `Reflector` Metadata는 Handler가 요구하는 Domain Action을 선언한다.
- `PolicyService`는 HTTP Guard, Service, Queue Consumer와 Scheduler가 공유한다.
- TypeORM Repository는 Policy 판단에 필요한 Resource와 Tenant 속성을 Server에서 조회한다.
- Global Guard만 믿지 않고 실제 상태 변경 Service 안에서 Resource 단위 검사를 반복한다.
- Policy 변경 Endpoint 자체에는 더 강한 권한, 재인증, 직무 분리와 Audit를 적용한다.

## Test와 운영

- 새 Policy를 Shadow 평가해 현재 결정과 차이를 비교한다.
- Permit, Deny, Not Applicable, 속성 누락, Cache Stale과 DB 장애를 Test한다.
- Role Hierarchy와 Route Pattern의 Cycle, 중복과 우선순위를 검증한다.
- 여러 Instance가 같은 Version으로 수렴했는지 Metric과 Health Signal로 확인한다.
- Rollback이 Bean 재시작 없이 이전 Snapshot으로 복구되는지 연습한다.

## 출처

- 정수원 강사, [2) 관리자 시스템 권한 Domain, Service와 Repository](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29876)
- 정수원 강사, [3) 웹 기반 DB 인가 아키텍처](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=34076)
- 정수원 강사, [4) FilterInvocationSecurityMetadataSource 1](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29877)
- 정수원 강사, [5) FilterInvocationSecurityMetadataSource 2](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29878)
- 정수원 강사, [6) 웹 기반 인가처리 실시간 반영](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29879)
- 정수원 강사, [7) 인가처리 허용 필터](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29880)
- 정수원 강사, [9) IP 접속 제한](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29882)
- 정수원 강사, [4) MapBasedSecurityMetadataSource 1](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29884)
- 정수원 강사, [5) MapBasedSecurityMetadataSource 2](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29886)
- 정수원 강사, [6) MapBasedSecurityMetadataSource 3](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29917)
- 정수원 강사, [7) ProtectPointcutPostProcessor](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29888)
- 정수원 강사, [ProxyFactory를 활용한 실시간 Method 보안](https://www.inflearn.com/courses/lecture?courseId=324591&unitId=29918)
- [Spring Security 7.1, Authorization Architecture](https://docs.spring.io/spring-security/reference/servlet/authorization/architecture.html)
- [Spring Security 7.1, Method Security](https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html)
- [Spring Security 7.1, Authorize HttpServletRequests](https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html)

## 관련 문서

- [[Access-Control-Models|Policy 평가 Architecture]]
- [[Spring-Security-Authorization|Spring Security 인가]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[NestJS-Guards-Patterns|NestJS Policy Guard]]
