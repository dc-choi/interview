---
tags: [nestjs, circular-dependency, di, architecture]
status: index
category: "OS & Runtime - NestJS"
aliases: ["NestJS Circular Dependency", "순환 의존성 해결", "forwardRef vs ModuleRef"]
---

# NestJS 순환 의존성 해결 전략

DI 컨테이너는 **위상 정렬 가능한 비순환 그래프(DAG)**를 전제로 인스턴스화 순서를 결정한다. 순환이 생기면 부팅 자체가 실패. NestJS는 우회용 도구(`forwardRef`, `ModuleRef`)를 제공하지만, 진짜 해법은 **그래프를 단방향으로 다시 그리는 것**.

- [[NestJS-Circular-Dependency-Overview|왜 문제인가, 5가지 전략 비교 표와 선택 우선순위]]
- [[NestJS-Circular-Dependency-ForwardRef-ModuleRef|forwardRef 지연 평가와 ModuleRef Lazy Loading 우회]]
- [[NestJS-Circular-Dependency-Refactoring|Event 기반, Facade, Repository + Domain Layer 분리]]
- [[NestJS-Circular-Dependency-Prevention|자동화 방어(ESLint, 아키텍처 테스트), 성능, 흔한 실수, 면접 체크포인트]]

## 관련 문서

- [[NestJS-Module-Dynamic|Module 시스템 (forwardRef 기본)]]
- [[NestJS-Lifecycle|Lifecycle (OnModuleInit, OnApplicationBootstrap 시점)]]
- [[Clean-Architecture-NestJS|Clean Architecture with NestJS]]
- [[NestJS-Custom-Decorator|커스텀 데코레이터, DiscoveryService]]
- [[NestJS-Plugin-System|Plugin System (DiscoveryService 확장)]]
