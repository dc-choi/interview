---
tags: [architecture, runtime, java, graphql, bff, evolution, microservice]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Runtime Stack Evolution", "Netflix Java 진화", "런타임 스택 진화", "BFF to GraphQL"]
---

# 런타임 스택 진화 — 대규모 서비스의 선택들

수년~수십 년을 살아남는 런타임 스택은 **한 번에 정해지지 않고 여러 단계의 전환**을 거친다. 각 단계는 이전 단계의 한계를 해결하려는 시도이며, 그 과정에서 생긴 부채를 다음 단계가 다시 해결한다. 대표 사례인 Netflix Java 스택의 진화를 통해 런타임 전환의 반복 패턴을 본다.

## 핵심 명제

- 아키텍처 진화는 **문제 해결의 연속** — 각 전환은 이전 방식의 한계를 뚫기 위함
- **복잡성 관리**가 기술 선택의 일관된 축 (리액티브의 난이도 → GraphQL의 단순성)
- **표준화**는 자체 프레임워크의 유지 비용을 피하는 전략 (Spring Boot 같은 업계 표준 채택)
- **언어/런타임 업그레이드만으로도 실질적 성능 개선** 가능 (Java 8→17에서 ~20% CPU 효율 개선)
- **개발자 경험(DX)** 이 장기 생산성의 결정 변수

## Netflix 사례 — 5단계 진화

### 1단계: BFF with Groovy

- 마이크로서비스 수천 개 + 한 화면에 10+ 서비스 호출 → 디바이스가 직접 orchestration하면 확장성 붕괴
- API Gateway(Zuul) + 디바이스별 BFF(Backend For Frontend)
- **UI 개발자가 Groovy 스크립트**를 작성해 orchestration을 서버 측에 둠

**트레이드오프**: 유지보수할 스크립트 폭증, UI 개발자의 서버 개발 부담.

### 2단계: RxJava + Hystrix

- BFF 안에서 다중 서비스 fanout의 장애 격리·스레드 관리 필요
- **RxJava** 로 리액티브 전환, **Hystrix** 로 failover·bulkheading
- 문제: 러닝 커브 가파름, UI 개발자 저항

### 3단계: GraphQL Federation + DGS

- 강타입 스키마로 over-fetching 해결, 마이크로서비스별 느슨한 결합
- 각 마이크로서비스를 **DGS(Domain Graph Service)** 로 재정의
- Federation Gateway가 DGS들을 통합 → **BFF 필요성 소멸**
- UI와 백엔드는 **스키마에 대한 협업만** 하면 됨

자체 프레임워크 개발 이유: "Netflix 규모에서 쓸 만큼 성숙한 Java GraphQL 프레임워크 부재".

### 4단계: Java 버전 업그레이드

- Java 8 → 17: **코드 변경 없이 ~20% CPU 효율 개선** (G1 GC 개선)
- Netflix 규모 = 막대한 비용 절감
- Java 21 추진: **가상 스레드**(thread-per-request 하드웨어 활용), **ZGC**(짧은 pause), **Record·Pattern Matching**

JVM은 자체 빌드 없이 **Azul Zulu(OpenJDK 빌드)** 사용.

### 5단계: Spring Boot 표준화

- 1년에 걸쳐 **Guice 기반 자체 스택 → Spring Boot로 완전 이전**
- 선택 이유: 커뮤니티·문서·교육 자료, "highly aligned, loosely coupled" 원칙 부합
- Netflix 인프라 통합을 위한 **Spring Cloud Netflix 모듈**(gRPC·SSO·분산추적·Eureka·AWS/Titus·Kafka·Cassandra·mTLS)

### 현재 스택

| 항목 | 사양 |
|---|---|
| Java 앱 | ~2,800개 |
| 내부 라이브러리 | ~1,500개 |
| 빌드 | Gradle + Nebula 플러그인 |
| 프레임워크 | Spring Boot 3+ |
| API 계층 | GraphQL Federation + DGS |
| Java 버전 | 21 테스트 중 |

## 일반화된 진화 패턴

대규모 서비스의 런타임 스택 진화는 거의 같은 궤적을 밟는다.

| 단계 | 등장 이유 | 해결한 문제 | 남긴 부채 |
|---|---|---|---|
| **직접 호출** | 서비스 수 적음 | 단순성 | 클라이언트 복잡도 |
| **BFF + 스크립팅** | UI별 다른 요구 | 클라이언트 단순화 | 스크립트 유지보수 |
| **리액티브(RxJava·Reactor)** | 비동기 fanout·장애 격리 | 비동기 합성 | 높은 러닝 커브 |
| **GraphQL Federation** | BFF 폭증, over-fetching | 단일 스키마·느슨한 결합 | Gateway 운영 복잡도 |
| **표준 프레임워크 이식** | 자체 스택 유지비 | 생산성·커뮤니티 | 프레임워크 락인 |

## 런타임 전환 결정의 공통 기준

어떤 전환이든 다음 질문으로 판단:

1. **이전 방식의 한계가 명확한가** — 추상적 불만이 아닌 측정된 비용(시간·인력·장애)
2. **전환 비용이 감당 가능한가** — 3~6개월 동결·병렬 운영·팀 학습
3. **팀 숙련도가 맞는가** — 러닝 커브 가파른 기술은 조직 성숙도 필수
4. **5년 후에도 커뮤니티가 있을까** — 자체 개발보다 업계 표준이 유리한 이유
5. **점진 이주 경로가 있는가** — 빅뱅 전환은 리스크 급증 ([[Legacy-Modernization-Strategies]])

## 흔한 함정

- **신기술 추종** — 해결할 문제 없이 도입 → 복잡성만 증가
- **자체 프레임워크 집착** — 초기엔 맞지만 장기 유지비가 큰 이유
- **빅뱅 전환** — 한 번에 모든 걸 바꾸려다 롤백 경로 상실
- **언어 업그레이드 방치** — "바꿀 필요 없다"가 수년 누적되면 지원 종료·성능 손실
- **개발자 경험 무시** — 성능만 보고 러닝 커브 가파른 스택 도입 → 생산성 반토막
- **표준화 타이밍 지연** — 자체 스택이 너무 퍼져 전환 비용이 기하급수적 증가

## 면접 체크포인트

- **BFF → RxJava → GraphQL Federation** 진화의 각 단계가 해결한 문제
- **GraphQL Federation**이 BFF를 대체하는 메커니즘 (DGS·스키마 중심 협업)
- **Java 버전 업그레이드만으로 20% CPU 절감** 가능한 이유 (GC 개선)
- **가상 스레드(Project Loom)** 가 thread-per-request 구조에 주는 의미 ([[Async-vs-Threads]])
- **자체 프레임워크 → 표준 프레임워크 전환** 의 장기 가치
- 런타임 전환 결정의 **5가지 공통 기준**
- 일반화된 **5단계 진화 패턴** (직접 호출 → BFF → 리액티브 → GraphQL → 표준화)

## 출처
- [integer.blog — Evolution of Java Usage at Netflix](https://www.integer.blog/evolution-of-java-usage-at-netflix/)

## 관련 문서
- [[Legacy-Modernization-Strategies|레거시 현대화 전략]]
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal]]
- [[Hexagonal-In-Practice|Hexagonal 실전 적용]]
- [[Monolith-vs-Microservice|Monolith vs Microservice]]
- [[Async-vs-Threads|async/await vs 스레드 (가상 스레드)]]
- [[Tech-Decision|기술 의사결정]]
