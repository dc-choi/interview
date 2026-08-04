---
tags: [architecture, msa, monolith]
status: done
verified_at: 2026-08-04
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Monolith vs Microservice", "MSA"]
---

# Monolith vs Microservice

## MSA란 무엇인가

Martin Fowler와 James Lewis는 MSA를 독립 프로세스로 실행되고 경량 메커니즘으로 통신하는 작은 서비스들의 모음으로 설명한다. 모놀리스는 기능 전체를 한 단위로 배포, 확장하는 반면 MSA는 기능을 서비스 단위로 분해한다.

### 9가지 핵심 특성 (Fowler)

1. **서비스를 통한 Componentization** — 라이브러리가 아닌 독립 배포 단위
2. **비즈니스 역량 중심 조직** — UI/백엔드/DB 계층이 아니라 결제, 주문, 회원 같은 도메인으로 팀 분할
3. **프로젝트가 아닌 프로덕트** — "you build it, you run it". 릴리스 후 인계가 아닌 **전 생애주기 운영**
4. **Smart Endpoints, Dumb Pipes** — 서비스에 로직 집중, 메시지 버스는 단순 경로 역할. ESB의 "스마트 버스" 반대
5. **분산 거버넌스** — 공통 기준 안에서 언어, DB와 프레임워크를 상황에 맞게 선택. Polyglot은 가능성이지 의무가 아니다
6. **분산 데이터 관리** — 서비스가 데이터 쓰기 권한을 소유하고 다른 서비스는 계약을 통해 접근. 물리 DB 분리는 점진적으로 할 수 있다
7. **인프라 자동화** — CI/CD, IaC, 컨테이너 오케스트레이션이 필수. 수동 운영으로는 N개 서비스 관리 불가
8. **실패를 전제로 설계** — 네트워크 호출은 실패한다. Circuit Breaker, Retry, Timeout, Bulkhead로 격리
9. **Evolutionary Design** — 서비스는 **교체, 폐기 가능**하게. 경계를 리팩토링할 수 있는 유연성

### 장단점 요약

| 장점 | 단점 |
|---|---|
| 독립 배포, 독립 확장 | 분산 트랜잭션 어려움 (Saga 필요) |
| 기술 선택 자유도 | 운영 복잡도 (관측, 추적, 네트워크) |
| 도메인 단위 소규모 팀 자율 | 네트워크 지연, 직렬화 비용 |
| 장애 격리 가능성 | 연쇄 장애를 막는 별도 설계 필요 |
| 부분 릴리스 가능 | 조직 성숙도, 자동화 전제 |

## 언제 MSA를 도입할 것인가

- 도메인 복잡도가 단일 배포로 관리 불가능할 때
- 팀이 커져 **독립적으로 움직여야 할 때** (Conway's Law)
- 서비스 간 **부하, 기술 요구가 크게 다를 때**
- 이미 **인프라 자동화, 관측 도구가 준비**됐을 때

도입 전에 사업 동기, 경계, 팀 소유권, 독립 전달, 데이터, 운영과 거버넌스를 [[Microservice-Readiness-and-Maturity|마이크로서비스 준비도]]로 점검한다.

반대로 **초기 스타트업, 단순 도메인, 작은 팀**은 모놀리스가 빠르고 싸다. "Monolith First → 성장하며 분리"가 Fowler의 권고. 둘 사이의 현실적 중간 지점, 즉 단일 배포를 유지하면서 도메인 경계를 미리 연습하는 구조는 [[Modular-Monolith|모듈러 모노리스]].

### 초기 스타트업의 점진적 선택

1. **모놀리스로 시장을 검증한다.** 초기에는 배포 단위 하나와 짧은 피드백 루프가 기능별 독립 확장보다 중요하다.
2. **실제 병목을 관찰한다.** 사용자 증가, 팀 간 배포 충돌, 특정 기능의 부하 편차처럼 운영에서 확인된 문제를 분리 근거로 삼는다.
3. **필요한 경계부터 추출한다.** 전체를 한 번에 재작성하지 않고 독립 배포나 독립 확장의 효과가 큰 도메인부터 서비스로 분리한다.

미래의 확장성만 보고 MSA를 먼저 도입하면 서비스 간 통신, 데이터 일관성, 배포 자동화와 관측성 비용을 제품 검증 전에 떠안는다. 반대로 모놀리스를 의도적으로 선택하더라도 내부 모듈 경계를 무시해도 된다는 뜻은 아니다. 나중에 분리할 수 있도록 도메인별 책임과 의존 방향은 초기에 관리한다.

## 아임웹 MSA 전환 사례

### 전환 배경
- 기존: 거대한 PHP 모놀리식 구조
- MSA를 도입하면 배포가 빨라질 것으로 기대

### 전환 후 발생한 문제
- 인프라 복잡성 급증
- 인증 구현의 파편화
- 공통 기능의 중복 구현

## 해결 전략

핵심 원칙: 수기 작업 제거. 인프라 담당자는 서비스 신뢰성, 백엔드는 비즈니스에 집중.

### 1. 모노레포 도입
분산된 코드 관리 문제를 해결하기 위해 모노레포를 도입

### 2. 인프라 자동화
- **테라폼 모듈**: 하나의 인프라 모듈로 복붙 방지
- **ArgoCD 자동화**: 코드 푸시 후 배포 시간 1주일 -> 20분

### 3. 인증 시스템 표준화
- JWT 기반 인증 서버와 SDK/모듈
- 클라이언트 SDK와 서버 모듈로 제공
- npm 패키지로 배포

### 4. API Gateway

#### 검토한 선택지
| 도구 | 문제점 |
|---|---|
| Istio | 학습 곡선 가파름, 쿠버네티스 외부 연결 오류 |
| Nginx | 설정 유지보수 복잡, 백엔드가 다른 언어를 배워야 함 |

#### Kong Gateway 선택
- DB 없이 YAML 기반 선언형 설정
- 설정을 파일로 관리, Git으로 형상 관리 가능
- 마이크로서비스의 인증, 로깅, 라우팅을 모두 처리
- 게이트웨이를 타고 넘어오면 신뢰할 수 있는 구조

### 성과
- 현재 27개 서비스 운영
- 매주 새로운 어플리케이션 배포
- 기능 배포: 2주 -> 1일

## 분산 백엔드와 동시성

- 분산 백엔드에서는 결국 **데이터 동기화**가 가장 중요하다. 이것이 없으면 서비스가 터진다
- 설계의 문제는 객체지향(OOP), 로직의 문제는 함수형(FP)으로 접근

## 출처
- [Martin Fowler — Microservices](https://martinfowler.com/articles/microservices.html)
- [Martin Fowler — Microservice Trade-Offs](https://martinfowler.com/articles/microservice-trade-offs.html)
- [Martin Fowler — Microservice Prerequisites](https://martinfowler.com/bliki/MicroservicePrerequisites.html)
- [Martin Fowler — Monolith First](https://martinfowler.com/bliki/MonolithFirst.html)
- [han jeong heon 강사 — 모노리스와 마이크로서비스](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=104423)
- [bcho — 대용량 웹서비스를 위한 마이크로 서비스 아키텍쳐의 이해](https://bcho.tistory.com/948)
- [스타트업 딜레마, 모놀리스냐 MSA냐? - 코딩하는기술사](https://www.youtube.com/watch?v=p71m3q2QsfU)

## 관련 문서
- [[Modular-Monolith|모듈러 모노리스 (중간 지점)]]
- [[Microservice-Readiness-and-Maturity|마이크로서비스 준비도와 성숙도]]
- [[Microservice-Service-Decomposition|마이크로서비스 서비스 분해]]
- [[Microservice-Data-Ownership-and-Queries|마이크로서비스 데이터 소유권과 교차 서비스 조회]]
- [[Microservice-Edge-and-Composition-Patterns|마이크로서비스 경계와 조합 패턴]]
- [[Reactive-Systems-Principles|리액티브 시스템 원칙]]
- [[Monorepo-Architecture|모노레포 아키텍처 (모노레포 vs 모놀리스가 직교하는 이유)]]
- [[DDD]]
- [[DDD-Hexagonal-In-Production|DDD + Hexagonal 프로덕션]]
- [[Event-Driven-Patterns|Event-Driven 패턴]]
- [[MQ-Kafka|Kafka (MSA 통신 기반)]]
- [[IaC|IaC — 테라폼으로 MSA 인프라 관리]]
- [[Transactional-Outbox|Transactional Outbox (분산 데이터)]]
