---
tags: [architecture, ddd, hexagonal, bounded-context, spring, production]
status: index
category: "아키텍처&설계(Architecture&Design)"
aliases: ["DDD Hexagonal In Production", "DDD 헥사고날 실무", "멀티 바운디드 컨텍스트"]
---

# DDD + Hexagonal — 프로덕션 적용

DDD와 Hexagonal을 **함께** 도입할 때의 구조, 디렉토리, 트레이드오프 정리. 기본 개념은 [[DDD]]와 [[Hexagonal-In-Practice]]를 따로 본다.

- [[DDD-Hexagonal-In-Production-Structure|구조와 통신 규칙 — 왜 함께 쓰는가, Port/Adapter 안 DDD 구성요소 위치, 멀티 바운디드 컨텍스트 디렉토리, Tell Don't Ask]]
- [[DDD-Hexagonal-In-Production-Pragmatics|외부 통합과 실용주의 — ACL, Circuit Breaker 폴백, 과잉 설계를 피하는 타협 기준, 적용/비적용 매트릭스, 면접 체크포인트]]
- [[DDD-Hexagonal-In-Production-Cases|프로덕션 사례 — 당근페이 4년 아키텍처 진화, 배민 POS Kotlin 4-Hexagon 멀티 모듈]]

## 출처
- [appkr — 내가 경험한 DDD, Hexagonal](https://blog.appkr.dev/work-n-play/learn-n-think/ddd-hexagonal/)
- [당근페이 — 백엔드 아키텍처가 걸어온 여정 (Layered → Hexagonal → Clean + 모노레포)](https://medium.com/daangn/%EB%8B%B9%EA%B7%BC%ED%8E%98%EC%9D%B4-%EB%B0%B1%EC%97%94%EB%93%9C-%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98%EA%B0%80-%EA%B1%B8%EC%96%B4%EC%98%A8-%EC%97%AC%EC%A0%95-98615d5a6b06)
- [우아한형제들 — 배민 POS 헥사고날 적용 사례](https://techblog.woowahan.com/12720)
- [SK DEVOCEAN — DDD for MSA](https://devocean.sk.com/blog/techBoardDetail.do?ID=165765)

## 관련 문서
- [[Hexagonal-In-Practice|Hexagonal 실전 적용 (Port/Adapter 일반화 가이드)]]
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal 비교]]
- [[DDD|DDD 기본 개념 (Aggregate, CQRS, 도메인 서비스)]]
- [[Elegant-OOP-Design|우아한 객체지향]]
- [[Aggregate-Boundary|Aggregate 경계와 데이터 접근]]
- [[Monolith-vs-Microservice|Monolith vs Microservice]]
