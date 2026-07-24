---
tags: [architecture, evolution, fitness-function, governance, quality-attribute]
status: done
category: "Architecture - 진화"
aliases: ["Architecture Fitness Functions", "Architectural Fitness Function", "아키텍처 피트니스 함수"]
---

# 아키텍처 Fitness Function

아키텍처 fitness function은 시스템이 의도한 품질 속성과 제약을 계속 만족하는지 **객관적으로 평가하는 검증 장치**다. 진화적 아키텍처에서 말하는 guided change의 기준이며, 설계 문서의 의도를 테스트, 지표, 모니터와 정책으로 옮긴다.

단위 테스트와 비슷한 역할을 하지만 형태가 테스트 코드에 한정되지는 않는다. 정적 분석, 성능 실험, 운영 SLO, 보안 정책 검사, 복구 훈련과 사람의 정기 검토도 목적에 맞으면 fitness function이 될 수 있다.

## 설계 순서

1. **보호할 품질 속성을 고른다** — 성능, 신뢰성, 보안, 변경 용이성처럼 시스템에서 중요한 것을 명시한다.
2. **검증 가능한 주장으로 바꾼다** — 빠르다 대신 어떤 부하와 구간에서 무엇을 측정할지 정한다.
3. **범위와 판정 기준을 정한다** — 대상 서비스, 환경, 시간 창, 임계값과 예외를 명시한다.
4. **실행 주기를 배치한다** — PR, 배포 전, 지속 모니터링, 정기 훈련 중 피드백이 유효한 시점을 고른다.
5. **실패의 행동을 연결한다** — merge 차단, 배포 중단, 경보, 검토 티켓처럼 결과를 누가 처리할지 정한다.
6. **기준을 재검토한다** — 트래픽, 비용과 사업 요구가 바뀌면 함수도 버전과 근거를 남기고 갱신한다.

## 예시

| 품질 속성 | Fitness function 예 | 실행 시점 |
|---|---|---|
| 모듈 경계 | 금지된 dependency 방향을 정적 분석으로 검사 | PR |
| API 호환성 | consumer contract와 schema compatibility 검사 | PR, 배포 전 |
| 성능 | 대표 부하에서 지연 분포와 자원 사용을 측정 | 배포 전, 정기 |
| 신뢰성 | 인스턴스와 의존성 장애에서 복구 시간과 데이터 손실 확인 | 정기 훈련 |
| 보안 | 정책 위반, 권한 경계와 취약 dependency 검사 | PR, 지속 |
| 운영성 | 로그, trace, runbook과 rollback 준비 여부 검사 | 배포 전 |

임계값은 보편 숫자가 아니다. 예를 들어 p99 목표는 사용자 여정, 호출량과 비용 예산에서 도출하고, 부하 조건과 측정 환경을 함께 기록해야 한다.

## 종류를 고르는 기준

- **원자적 vs 전체적**: 한 코드 규칙을 검사할지, 여러 서비스가 함께 보이는 결과를 평가할지
- **Triggered vs Continuous**: 변경 때 실행할지, 운영 중 계속 관측할지
- **Automated vs Manual**: 기계가 판정할 수 있는지, 복구 훈련이나 설계 검토가 필요한지
- **Intentional vs Emergent**: 처음부터 보호할 속성인지, 장애와 운영 경험에서 새로 발견한 제약인지

자동화할 수 없는 기준도 버리지 않는다. 대신 실행 주기, 판정자와 증거를 명시해 잊히지 않게 한다.

## 흔한 실패

- 측정 가능한 것만 중요하다고 보고 사용자 가치와 사업 제약을 놓침
- 결과가 아니라 특정 구현을 고정해 더 나은 설계를 막음
- 현실과 다른 부하나 데이터로 false green을 만듦
- 여러 품질 속성의 충돌을 숨기고 단일 점수로 합침
- 기준을 너무 많이 gate로 만들어 피드백이 느려지고 우회가 늘어남
- 소유자와 갱신 조건이 없어 오래된 임계값이 규칙으로 굳음

fitness function은 아키텍처 결정을 대신하지 않는다. [[Tech-Decision|기술 의사결정]]에서 선택한 방향이 실제 변화 속에서도 유지되는지 빠르게 반증하는 안전장치다.

## 면접 체크포인트

- 품질 속성을 측정 가능한 주장으로 바꾸는 방법
- 단위 테스트와 아키텍처 fitness function의 범위 차이
- PR gate, 운영 모니터와 정기 훈련을 함께 쓰는 이유
- 여러 품질 속성이 충돌할 때 임계값과 우선순위를 결정하는 방법
- 함수 자체도 시스템 변화에 맞춰 검토해야 하는 이유

## 출처

- [Building Evolutionary Architectures, free chapter — Thoughtworks](https://www.thoughtworks.com/content/dam/thoughtworks/documents/books/bk_building_evolutionary_architectures_second_edition_free_chapter.pdf)
- [Fitness function-driven development — Thoughtworks](https://www.thoughtworks.com/en-us/insights/articles/fitness-function-driven-development)
- [45권의 기술 서적에서 얻은 핵심 인사이트 — GeekNews](https://news.hada.io/topic?id=31718)
- [Our biggest insights from 45 technical books! — Book Overflow](https://www.youtube.com/watch?v=k2ek5MsUEMo)

## 관련 문서

- [[Tech-Decision|기술 의사결정]]
- [[Refactoring-In-Practice|실전 리팩토링]]
- [[CICD-Basics|CI/CD 기초]]
- [[SLI-SLO|SLO]]
