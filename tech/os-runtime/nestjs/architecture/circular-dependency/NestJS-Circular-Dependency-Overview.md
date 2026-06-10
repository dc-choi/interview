---
tags: [nestjs, circular-dependency, di, architecture]
status: done
category: "OS & Runtime - NestJS"
aliases: ["순환 의존성 문제 정의", "5가지 전략 비교"]
---

# NestJS 순환 의존성 — 문제 정의와 전략 비교

## 왜 문제인가

- DI 컨테이너가 의존성 그래프를 위상 정렬해 순서대로 인스턴스화 → 사이클이 있으면 정렬 불가 → throw.
- forwardRef로 우회해도 **컴파일은 통과하지만 코드가 읽기 어려워지고**, 도메인 경계 흐려짐.
- 순환은 보통 **응집도 낮은 모듈 분리**의 신호. 두 클래스가 서로 호출해야 한다면 **공통 책임이 빠진 것**.

## 5가지 전략 한눈에

| 전략 | 메커니즘 | 적합 | 비용 |
|------|---------|------|------|
| **forwardRef** | DI 토큰 지연 평가 | 단순 양방향, 레거시 빠른 패치 | 가독성, 디버깅, 테스트 부담 |
| **ModuleRef Lazy** | 인스턴스 사후 해결 | 동적 토큰, 조건부 의존 | 컴파일 타임 안전성 ↓ |
| **Event 기반** | 발행-구독으로 호출 끊기 | 사이드이펙트성 통보 | 흐름 추적 어려움 |
| **Facade** | 양쪽을 호출하는 상위 서비스 | 두 도메인을 같이 쓰는 use-case | 추상화 1단계 추가 |
| **Domain 분리** | Repository, Application 레이어 | 대규모, 복잡한 도메인 | 설계 비용 큼 |

**도구 선택 우선순위**: 가능하면 Facade/Domain 분리 → 안 되면 Event → 그래도 안 되면 ModuleRef → 마지막이 forwardRef.
