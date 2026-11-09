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
- **언어/런타임 업그레이드**는 워크로드에 따라 성능 개선 기회가 될 수 있음 (이 문서의 Java 8→17 약 20% 수치는 2024년 Netflix 자료의 측정치)
- **개발자 경험(DX)** 이 장기 생산성의 결정 변수

## Netflix 사례 — 5단계 진화

아래 Netflix 사례와 수치는 2024년 4월 공개된 2차 정리 자료의 당시 스냅샷이다. 2026년 현재의 전사 운영 현황으로 해석하지 않는다.

### 1단계: BFF with Groovy

- 마이크로서비스 수천 개 + 한 화면에 10+ 서비스 호출 → 디바이스가 직접 orchestration하면 확장성 붕괴
- API Gateway(Zuul) + 디바이스별 BFF(Backend For Frontend)
- **UI 개발자가 Groovy 스크립트**를 작성해 orchestration을 서버 측에 둠

**트레이드오프**: 유지보수할 스크립트 폭증, UI 개발자의 서버 개발 부담.

### 2단계: RxJava + Hystrix

- BFF 안에서 다중 서비스 fanout의 장애 격리, 스레드 관리 필요
- **RxJava** 로 리액티브 전환, **Hystrix** 로 failover, bulkheading
- 문제: 러닝 커브 가파름, UI 개발자 저항

### 3단계: GraphQL Federation + DGS

- 강타입 스키마로 over-fetching 해결, 마이크로서비스별 느슨한 결합
- 각 마이크로서비스를 **DGS(Domain Graph Service)** 로 재정의
- Federation Gateway가 DGS들을 통합 → **BFF 필요성 소멸**
- UI와 백엔드는 **스키마에 대한 협업만** 하면 됨

자체 프레임워크 개발 이유: "Netflix 규모에서 쓸 만큼 성숙한 Java GraphQL 프레임워크 부재".

### 4단계: Java 버전 업그레이드

- Java 8 → 17: **코드 변경 없이 ~20% CPU 효율 개선** (G1 GC 개선)
- 해당 자료는 Netflix 규모에서 비용 절감 기회가 크다고 설명
- Java 21 추진: **가상 스레드**, Record와 Pattern Matching 같은 언어 기능, GC 선택지 검토

JVM은 자체 빌드 없이 **Azul Zulu(OpenJDK 빌드)** 사용.

### 5단계: Spring Boot 표준화

- 1년에 걸쳐 **Guice 기반 자체 스택 → Spring Boot로 완전 이전**
- 선택 이유: 커뮤니티, 문서, 교육 자료, "highly aligned, loosely coupled" 원칙 부합
- Netflix 사내 인프라 통합용 Spring Boot 확장 묶음과 OSS 프로젝트 **Spring Cloud Netflix**를 구분한다. 2026-09-03에 확인한 Spring Cloud Netflix 공식 문서는 Eureka 기반 서비스 디스커버리를 기능으로 제시한다.

### 2024년 공개 자료 기준 스택

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
| **리액티브(RxJava, Reactor)** | 비동기 fanout, 장애 격리 | 비동기 합성 | 높은 러닝 커브 |
| **GraphQL Federation** | BFF 폭증, over-fetching | 단일 스키마, 느슨한 결합 | Gateway 운영 복잡도 |
| **표준 프레임워크 이식** | 자체 스택 유지비 | 생산성, 커뮤니티 | 프레임워크 락인 |

## 런타임 전환 결정의 공통 기준

어떤 전환이든 다음 질문으로 판단:

1. **이전 방식의 한계가 명확한가** — 추상적 불만이 아닌 측정된 비용(시간, 인력, 장애)
2. **전환 비용이 감당 가능한가** — 3~6개월 동결, 병렬 운영, 팀 학습
3. **팀 숙련도가 맞는가** — 러닝 커브 가파른 기술은 조직 성숙도 필수
4. **5년 후에도 커뮤니티가 있을까** — 자체 개발보다 업계 표준이 유리한 이유
5. **점진 이주 경로가 있는가** — 빅뱅 전환은 리스크 급증 ([[Legacy-Modernization-Strategies]])
6. **플랫폼 계약을 감당할 수 있는가** — 언어 도입의 실제 비용은 컴파일러가 아니라 보안 툴체인 빌드, 개발 도구, 품질 워크플로, 플랫폼 통합, 보안 개발 수명주기 준수까지 조직이 책임지는 지원 수준에 있다. Microsoft가 Rust를 C++, C#, TypeScript와 같은 Tier-1로 둔 것도 언어 선호가 아니라 이 지원 계약의 선언이었고, 기존 MSVC 백엔드에 붙는 코드 생성 백엔드로 디버깅, 프로파일링, 하드닝 도구를 공유하게 한 뒤 자기 호스팅과 100개 이상 저장소 사용으로 성숙도를 검증했다 (2026년 9월 기준)

AI 코딩 에이전트가 코드를 쓰는 비용을 낮춰도 5번의 점진 경로와 검증 수단은 여전히 필요하다(적용 판단). GitHub은 Copilot 런타임을 TypeScript에서 Rust로 옮기며 main에 들어간 128개 PR로 나눠 점진 배포했고, 이전 PR은 기존 구현을 Rust를 호출하는 얇은 shim으로 바꿨다. CLI와 SDK의 기존 E2E 테스트를 매 단계 새 코드에 실행해 필수 테스트가 실패한 PR은 병합하지 않았고 main은 늘 배포 가능한 상태였다. 코드는 대부분 AI 에이전트가 썼고 주로 개발자 한 명이 진행했으며, 같은 기간 다른 개발자들의 변경도 계속 병합됐다(2026-09-23 갱신된 공식 글, 2026-11-08 대조). 점진 경로의 비용은 임시 상호 운용 코드다. 저자는 인터뷰에서 TypeScript와 Rust를 NAPI-RS로 이었고 상호 운용 시그니처가 최고 2,000~3,000개였다가 끝에는 0이 됐다고 말한다. 별도 브랜치에서 모두 바꾼 뒤 한 번에 교체하면 실사용에서 모든 변경을 동시에 시험하게 되지만, 매일 조금씩 내보내면 문제가 생겼을 때 원인을 빨리 좁힐 수 있다고 본다. 언어 자체도 후보마다 작은 끝단 간 시험 구현을 만들어 같은 목표로 비교했고, 성능과 내장성이 비슷한 C# Native AOT와 Rust 사이에서는 조직 안의 기존 프로젝트와 사람으로 정했다(위 3, 4번 기준, [[AI-Infrastructure-Language-Layers#C ABI 공유 라이브러리: 별도 프로세스를 없애는 통합|선택 조건]]). 언어 계층의 판단은 [[AI-Infrastructure-Language-Layers|AI 서비스 스택의 언어 계층]], 테스트 오라클은 [[Agent-Test-Verification-Behavior#포팅에서는 기존 E2E 테스트를 오라클로 지킨다|기존 E2E 테스트 오라클]]에 있다.

## 흔한 함정

- **신기술 추종** — 해결할 문제 없이 도입 → 복잡성만 증가
- **자체 프레임워크 집착** — 초기엔 맞지만 장기 유지비가 큰 이유
- **빅뱅 전환** — 한 번에 모든 걸 바꾸려다 롤백 경로 상실
- **언어 업그레이드 방치** — "바꿀 필요 없다"가 수년 누적되면 지원 종료, 성능 손실
- **개발자 경험 무시** — 성능만 보고 러닝 커브 가파른 스택 도입 → 생산성 반토막
- **표준화 타이밍 지연** — 자체 스택이 너무 퍼져 전환 비용이 기하급수적 증가

## 면접 체크포인트

- **BFF → RxJava → GraphQL Federation** 진화의 각 단계가 해결한 문제
- **GraphQL Federation**이 BFF를 대체하는 메커니즘 (DGS, 스키마 중심 협업)
- **2024년 Netflix 자료에서 제시한 Java 8→17 CPU 효율 개선**을 일반화할 때 워크로드별 측정이 필요한 이유
- **가상 스레드(Project Loom)** 가 thread-per-request 구조에 주는 의미 ([[Async-vs-Threads]])
- **자체 프레임워크 → 표준 프레임워크 전환** 의 장기 가치
- 런타임 전환 결정의 **5가지 공통 기준**
- 일반화된 **5단계 진화 패턴** (직접 호출 → BFF → 리액티브 → GraphQL → 표준화)

## 출처
- [integer.blog — Evolution of Java Usage at Netflix](https://www.integer.blog/evolution-of-java-usage-at-netflix/)
- [Spring Cloud Netflix, README](https://github.com/spring-cloud/spring-cloud-netflix/blob/main/README.adoc)
- [Spring Cloud Netflix, Features](https://docs.spring.io/spring-cloud-netflix/reference/spring-cloud-netflix.html)
- [OpenJDK, JEP 444: Virtual Threads](https://openjdk.org/jeps/444)
- [Oracle, Java Language Changes in Java SE 21](https://docs.oracle.com/en/java/javase/21/language/java-language-changes-release.html)
- [Guest Post: Rust Is Tier-1 Language at Microsoft — Rust Foundation](https://rustfoundation.org/media/guest-post-rust-is-tier-1-language-at-microsoft/)
- [Migrating the GitHub Copilot runtime to Rust, using Copilot — GitHub](https://github.blog/ai-and-ml/generative-ai/migrating-the-github-copilot-runtime-to-rust-using-copilot/)
- [Microsoft Distinguished Eng: Why And How To Port Your Entire Codebase to Rust — Ryan Peterman, Stephen Toub](https://www.youtube.com/watch?v=PLMOVlZC4eU) — 2026-11-02 공개 인터뷰. 언어 후보 비교, NAPI-RS 상호 운용과 점진 출시의 근거를 2026-11-09 로컬 음성 인식 전사로 확인

## 관련 문서
- [[Legacy-Modernization-Strategies|레거시 현대화 전략]]
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal]]
- [[Hexagonal-In-Practice|Hexagonal 실전 적용]]
- [[Monolith-vs-Microservice|Monolith vs Microservice]]
- [[Async-vs-Threads|async/await vs 스레드 (가상 스레드)]]
- [[Tech-Decision|기술 의사결정]]
- [[AI-Infrastructure-Language-Layers|AI 서비스 스택의 언어 계층]]
