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
- DI 그래프가 아니라 **TS import 사이클**로 생기는 순환도 있다 — barrel 파일(index.ts)로 모듈, 프로바이더 클래스를 묶으면 그 자체가 순환 원인이 될 수 있어, 같은 디렉토리 안에서는 barrel 경유 import를 피한다 (cats.controller가 cats.service를 index 경유로 가져오지 않기).

## 5가지 전략 한눈에

| 전략 | 메커니즘 | 적합 | 비용 |
|------|---------|------|------|
| **forwardRef** | DI 토큰 지연 평가 | 단순 양방향, 레거시 빠른 패치 | 가독성, 디버깅, 테스트 부담 |
| **ModuleRef Lazy** | 인스턴스 사후 해결 | 동적 토큰, 조건부 의존 | 컴파일 타임 안전성 ↓ |
| **Event 기반** | 발행-구독으로 호출 끊기 | 사이드이펙트성 통보 | 흐름 추적 어려움 |
| **Facade** | 양쪽을 호출하는 상위 서비스 | 두 도메인을 같이 쓰는 use-case | 추상화 1단계 추가 |
| **Domain 분리** | Repository, Application 레이어 | 대규모, 복잡한 도메인 | 설계 비용 큼 |

**도구 선택 우선순위**: 가능하면 Facade/Domain 분리 → 안 되면 Event → 그래도 안 되면 ModuleRef → 마지막이 forwardRef.

## 에러 메시지 판독

- `Nest cannot create the <module> instance. The module at index [N] of the <module> "imports" array is undefined.` — **모듈 레벨 순환**의 전형적 메시지 (또는 import 문 오류로 정말 undefined가 들어간 경우). forwardRef로 풀 땐 **모듈과 프로바이더 양쪽 모두**에 걸어야 한다.
- `Nest can't resolve dependencies ... argument dependency at index ...` — 생성자 DI 순환이 아니라 **파일 순환 import**가 원인. 모듈 파일에서 상수를 export하고 서비스가 그걸 도로 import하는 패턴이 단골 — 상수는 별도 파일로 분리한다. 판독 전체는 [[Custom-Provider|Cannot resolve dependency 진단]].

## 출처
- [NestJS — Circular dependency](https://docs.nestjs.com/fundamentals/circular-dependency)
- [NestJS — Common errors (FAQ)](https://docs.nestjs.com/faq/common-errors)
