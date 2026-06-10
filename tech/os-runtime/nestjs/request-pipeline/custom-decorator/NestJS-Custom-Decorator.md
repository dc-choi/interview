---
tags: [nestjs, decorator, metadata, aop]
status: index
category: "OS & Runtime - NestJS"
aliases: ["NestJS Custom Decorator", "커스텀 데코레이터"]
---

# NestJS 커스텀 데코레이터

`@Get`, `@Body`, `@UseGuards` 같은 NestJS 기본 데코레이터로 부족할 때, **메타데이터 + 런타임 탐색 + 실행 조작** 3단계를 직접 구현해 팀 고유의 횡단 관심사를 데코레이터로 표현할 수 있다. 서비스가 커질수록 Interceptor, Guard와 결합한 커스텀 데코레이터가 **반복 코드를 폭발적으로 줄인다**.

- [[NestJS-Custom-Decorator-Pipeline|3단계 구조 — 마킹(SetMetadata), 탐색(DiscoveryService), 실행(메서드 래핑)과 메타데이터 보존]]
- [[NestJS-Custom-Decorator-Patterns|활용 패턴 — createParamDecorator, applyDecorators, 플러그인 시스템 확장]]
- [[NestJS-Custom-Decorator-Pitfalls|@toss/nestjs-aop 라이브러리, 흔한 실수, 면접 체크포인트]]

## 관련 문서
- [[NestJS|NestJS 개요]]
- [[NestJS-AOP-Interceptor|Interceptor 기반 AOP]]
- [[Clean-Architecture-NestJS|Clean Architecture with NestJS]]
