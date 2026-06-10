---
tags: [nestjs, architecture, clean-architecture, typescript, di]
status: index
category: "OS&런타임(OS&Runtime)"
aliases: ["Clean Architecture NestJS", "NestJS 클린 아키텍처"]
---

# Clean Architecture with NestJS

Clean Architecture의 4겹 동심원을 NestJS의 모듈, 프로바이더, 컨트롤러 구조에 매핑하는 실무 가이드. 핵심은 **의존성 방향을 안쪽으로 고정**하고, NestJS의 DI 컨테이너로 바깥 레이어의 구체 구현을 주입하여 **비즈니스 로직이 프레임워크를 모르게** 하는 것.

- [[Clean-Architecture-NestJS-Layers|4겹 레이어 매핑과 의존성 역전 (Symbol 토큰 vs 추상 클래스)]]
- [[Clean-Architecture-NestJS-Structure|디렉토리 구조, 얇은 Controller, DI 테스트 전략, 흔한 실수]]
- [[Clean-Architecture-NestJS-CQRS|CQRS와 Event Handler 확장, Hexagonal과의 차이]]

## 출처
- [Better Programming — Clean Node.js Architecture With NestJS and TypeScript](https://medium.com/better-programming/clean-node-js-architecture-with-nestjs-and-typescript-34b9398d790f)
- [Jonathan Pretre — Clean Architecture with NestJS](https://medium.com/@jonathan.pretre91/clean-architecture-with-nestjs-e089cef65045)
- [GitHub — jonathanPretre/clean-architecture-nestjs](https://github.com/jonathanPretre/clean-architecture-nestjs)
- [assu10 — NestJS Clean Architecture](https://assu10.github.io/dev/2023/04/29/nest-clean-architecture/)
- [kscodebase — NestJS 클린 아키텍처](https://kscodebase.tistory.com/692)
- [junho2343 — Clean Architecture + Hexagonal Architecture with NestJS](https://junho2343.github.io/posts/clean-architecture-hexagonal-architecture-with-nestjs)

## 관련 문서
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal]]
- [[Hexagonal-In-Practice|Hexagonal 실전 적용]]
- [[DDD|DDD]]
- [[DTO-Layering|DTO 레이어 스코프, Entity 변환 위치]]
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
