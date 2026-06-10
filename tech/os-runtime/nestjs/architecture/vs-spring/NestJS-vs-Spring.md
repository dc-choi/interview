---
tags: [nestjs, spring, framework, comparison]
status: done
category: "OS - Runtime - NestJS"
aliases: ["NestJS vs Spring", "Spring vs NestJS"]
---

# NestJS vs Spring

두 프레임워크는 **모듈 기반 구조·DI·데코레이터(어노테이션) 중심 컴포넌트 조립**이라는 설계 철학을 공유한다. 실제로 NestJS는 Spring·Angular의 설계를 TypeScript/Node.js로 옮긴 것에 가까움. 그래서 개념 매핑은 대부분 1:1로 성립하지만, **런타임 모델·DI 해석 시점·생태계 성숙도**에서 분명한 차이가 있다.

## 언어·런타임 베이스

| 축 | Spring (Boot) | NestJS |
|---|---|---|
| 언어 | Java / Kotlin | TypeScript |
| 런타임 | JVM (HotSpot·GraalVM) | Node.js (V8) |
| 기본 서버 | Tomcat (내장) | Express (기본) 또는 Fastify |
| 동시성 | **스레드-per-요청** (Servlet·Tomcat 스레드 풀) | **싱글 스레드 + 이벤트 루프** (libuv) |
| 확장 | JVM 스레드 수 증가, 가상 스레드(Java 21+) | 수평 확장(cluster·PM2), 워커 스레드 |

같은 "동시 요청 N개"를 처리하는 방식이 근본적으로 다르다. Spring은 CPU-바운드 작업에 유리하고, NestJS는 I/O-바운드·대규모 동시 연결에 유리.

## DI (의존성 주입)

### Spring
- **컴포넌트 스캔 + 어노테이션 기반** (`@Component`, `@Service`, `@Repository`, `@Controller`)
- 주입 방식: **생성자 주입 권장** (`@Autowired`는 생략 가능), 필드/세터 주입도 가능하지만 비권장
- **컴파일 타임 어노테이션 처리** + 런타임 리플렉션
- 스코프: singleton(기본), prototype, request, session

### NestJS
- **`@Module` 단위 선언** — 각 모듈이 `providers`·`controllers`·`imports`·`exports`를 명시
- 주입 방식: **TypeScript constructor 매개변수** + 타입 정보를 `reflect-metadata`로 런타임에 읽음
- **런타임 데코레이터 처리** — `emitDecoratorMetadata: true` 필요
- 스코프: `DEFAULT`(싱글턴, 기본), `REQUEST`, `TRANSIENT`

두 프레임워크 모두 "생성자 주입 + 싱글턴 기본"이라는 핵심 패턴을 공유. NestJS는 **모듈 단위로 제공자 가시성을 명시**해야 하는 점이 Spring의 자동 스캔보다 더 엄격.

## 모듈 구조

### Spring
- `@SpringBootApplication` = `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan`
- 컴포넌트 스캔으로 **자동 발견** (패키지 계층 기반)
- 외부 기능: `spring-boot-starter-*` 의존성 추가만으로 자동 설정

### NestJS
- **명시적 모듈 그래프** — `AppModule`을 루트로 `imports`로 다른 모듈을 조립
- `providers`에 등록 + `exports`로 외부 공개 — 둘 다 해야 다른 모듈에서 쓸 수 있음
- 외부 기능: `@nestjs/*` 패키지 + 각 모듈을 `imports`에 명시

NestJS는 의존 그래프가 **코드로 명시**되어 추적이 쉬운 반면, Spring은 **자동성이 높아 설정 비용이 낮은** 대신 의존 관계를 런타임에서 파악해야 할 때가 있음.

## 데코레이터 vs 어노테이션

| 축 | Java 어노테이션 | TypeScript 데코레이터 |
|---|---|---|
| 처리 시점 | **컴파일 + 런타임 리플렉션** | **런타임에만** (transpile 시 `__decorate` 호출로 변환) |
| 메타데이터 접근 | `Reflection API` 표준 | `reflect-metadata` 라이브러리 |
| 표준 지위 | JLS 표준 | TC39 **Stage 3** (2024+ 정식 표준화 중) |
| 타겟 | 클래스, 메서드, 필드, 파라미터 등 | 클래스, 메서드, 접근자, 속성, 파라미터 |

NestJS의 데코레이터는 TypeScript의 `experimentalDecorators` + `emitDecoratorMetadata` 컴파일러 옵션에 의존. 최신 TC39 Stage 3 데코레이터는 의미론이 약간 달라 NestJS가 점진적 전환 중.

## 요청 처리 파이프라인

### Spring MVC
```
Client → Tomcat → Filter Chain → DispatcherServlet
  → HandlerMapping → HandlerAdapter → Interceptor (preHandle)
  → Controller → Service → Repository
  → Interceptor (postHandle/afterCompletion)
  → ViewResolver 또는 Message Converter → Response
```

### NestJS
```
Client → Express/Fastify → Middleware
  → Guard → Interceptor (pre)
  → Pipe (validation/transform)
  → Controller Handler → Service → Repository
  → Interceptor (post)
  → Exception Filter (에러 시)
  → Response
```

개념 매핑:
| 역할 | Spring | NestJS |
|---|---|---|
| 전역 전처리 | Filter | Middleware |
| 인증·인가 | Spring Security Filter | **Guard** |
| 요청 검증·변환 | `@Valid` + `Argument Resolver` | **Pipe** (`ValidationPipe`) |
| 횡단 로직 | Interceptor + AOP Aspect | **Interceptor** |
| 예외 변환 | `@ControllerAdvice` + `@ExceptionHandler` | **Exception Filter** (`@Catch`) |

NestJS는 AOP의 여러 역할을 **Guard·Pipe·Interceptor·Filter로 쪼개** 명시적 표시. Spring은 AOP가 더 범용이라 같은 일을 다양하게 할 수 있지만 선택지가 많아 팀 컨벤션이 중요.

## AOP vs 횡단 관심사

### Spring AOP
- Spring AOP는 **런타임 프록시 기반** (JDK Dynamic Proxy 또는 CGLIB)
- AspectJ 연동 시 컴파일 타임 위빙도 가능
- `@Aspect` + `@Before`/`@After`/`@Around` + PointCut 표현식
- 트랜잭션·보안·캐시·로깅의 대표 구현

### NestJS
- **AOP 개념이 직접 있지 않고** Guard/Pipe/Interceptor/Filter로 대체
- Interceptor의 `intercept()` = Spring의 `@Around`와 유사 (before + after + 반환값 변환)
- 트랜잭션은 **ORM(Prisma·TypeORM) 레벨**에서 처리하거나 `cls-hooked` 기반 AsyncLocalStorage로 구현

AOP의 "코드 분리" 가치는 NestJS에서도 **데코레이터 기반 가로채기**로 달성. 표현식 포인트컷이 없어서 **어디에 적용할지는 데코레이터로 명시**해야 함(예: `@UseGuards(AuthGuard)`).

## 트랜잭션

- **Spring**: `@Transactional` 애노테이션. 프록시 기반 AOP로 메서드 진입/종료 시 트랜잭션 시작·커밋/롤백. **자기 호출 함정** 유명 ([[Spring-Transactional]])
- **NestJS**: 프레임워크 표준 없음. ORM별로 다름:
  - TypeORM: `QueryRunner` 수동 또는 `@Transaction` (deprecated)
  - Prisma: `$transaction` API
  - typeorm-transactional (AsyncLocalStorage 기반 데코레이터 라이브러리)로 Spring-like 경험 가능

Spring의 `@Transactional`이 워낙 강력해서 **NestJS 도입 시 트랜잭션 관리가 가장 먼저 느끼는 갭**.

## 검증 (Validation)

- **Spring**: Bean Validation API (JSR 380) + Hibernate Validator. `@Valid` + `@NotNull`·`@Size` 등
- **NestJS**: `class-validator` + `class-transformer` + `ValidationPipe`. DTO 클래스에 `@IsEmail`·`@Min` 등 데코레이터

설계 철학 동일. Spring은 표준 API라서 교체 구현체가 많고, NestJS는 `class-validator` 사실상 표준.

## 예외 처리

- **Spring**: `@ControllerAdvice` + `@ExceptionHandler(Class)`로 전역 예외 매핑
- **NestJS**: `@Catch(ExceptionClass)` + `ExceptionFilter` 구현. 전역 적용은 `app.useGlobalFilters()` 또는 `APP_FILTER` 프로바이더

## 생태계

| 영역 | Spring | NestJS |
|---|---|---|
| ORM | Spring Data JPA (표준적) | TypeORM, Prisma, Drizzle, Sequelize 중 택 |
| 보안 | Spring Security (범용·복잡) | Passport (전략 조합·가볍) |
| 테스트 | JUnit + Spring Test (매우 성숙) | Jest + `@nestjs/testing` (성숙도 쓸 만함) |
| 메시징 | Spring Cloud Stream, Kafka Template | `@nestjs/microservices`, 각 브로커 라이브러리 |
| 클라우드 | Spring Cloud (서비스 디스커버리·서킷 브레이커 등) | 개별 라이브러리 조합 |
| 모니터링 | Actuator + Micrometer (사실상 표준) | Prometheus·OpenTelemetry 수동 통합 |

Spring은 **엔터프라이즈 기능이 프레임워크에 내장**되어 있고, NestJS는 **Node.js 생태계 조각을 붙이는** 방식.

### View 레이어 철학
- **Spring**: 원래 MVC 풀스택 프레임워크. JSP·Thymeleaf·JSF 같은 **SSR 엔진** 내장. `@Controller`가 View 이름을 반환하고 `ViewResolver`가 렌더링. `@RestController`로 API-only 모드도 선택 가능
- **NestJS**: **API 서버 중심**. View 렌더링은 프론트엔드(React·Vue·Next.js)에 맡기는 구조가 기본. `@Render()` 데코레이터로 Handlebars·Pug 등 SSR도 가능하지만 드뭄

현대 Spring 프로젝트 대부분도 `@RestController` + 별도 프론트엔드 조합으로 가고 있어서 실질 격차는 줄어드는 중. 다만 "한 프로젝트 안에서 View까지 책임지느냐"는 팀 컨벤션 차이.

## 실무 체감 차이

기술 스펙 비교로는 드러나지 않는 **개발·운영 경험**에서 나타나는 차이.

### 빌드·부팅 속도 (Cold Start)
- NestJS는 **TypeScript → JavaScript 트랜스파일 + Node.js 시작**만으로 충분. 보통 몇 초
- Spring Boot는 JVM 기동 + 클래스패스 스캔 + 빈 초기화 + ApplicationContext 구축으로 **10~30초 이상** (앱 규모에 따라). GraalVM native image로 줄일 수 있지만 빌드 자체가 비쌈
- **서버리스(AWS Lambda) 적합성**: NestJS가 cold start에서 유리. Spring은 Lambda SnapStart·native image 아니면 cold start 비용 큼
- **개발 생산성**: 로컬 핫 리로드(NestJS `--watch`) 반영이 훨씬 빠름 → 피드백 사이클 짧음

### 비동기 처리 표현력
- NestJS: **async/await + Promise**가 언어 차원에서 일급. I/O 여러 개를 `Promise.all`로 병렬 실행하는 게 자연스러움. 콜백 지옥이 사라지고 직렬 코드처럼 읽힘
- Spring (전통): 스레드-per-요청 모델이라 동시성을 "여러 스레드로" 처리. 한 스레드 안에서 I/O 여러 개를 병렬 실행하려면 `CompletableFuture` 조합·`@Async`·WebFlux(Reactor) 필요 → 학습 곡선 가파름
- Spring (Java 21+): **가상 스레드(Virtual Threads)** 도입으로 "async/await처럼 간단하게 동시성" 표현 가능해짐. 격차 좁혀지는 중

### 디버깅·스택 트레이스
- **Java**: `NullPointerException at com.foo.Bar.method(Bar.java:42)` 같은 **구체적 라인 번호·클래스 경로**. IDE 통합 디버거로 변수 상태 관찰이 쉬움
- **Node.js/TypeScript**: 비동기 스택은 Promise chain으로 끊어짐 → 스택 트레이스가 **에러 발생 지점과 멀어** 원인 추적이 어려움. Source Map이 항상 완벽하지 않고, 트랜스파일된 JS 라인과 TS 라인 매핑이 틀어질 때도 있음
- **개선 방법**: Node.js 16+에서 `--enable-source-maps`, `@nestjs/common` 에러 로깅, `pino`의 pretty-print, 구조적 로깅(OpenTelemetry)

### 모듈 순환 참조
- Spring: `@Autowired` 시점이 지연(lazy)이라 **런타임에 우회 가능** — 단, 설계 냄새로 취급
- NestJS: 모듈 그래프가 **컴파일 타임에 해석**되므로 순환 참조가 바로 에러. `forwardRef()`로 우회 가능하지만 임시방편
- **근본 해결**: 의존 방향을 단방향으로 설계. 공유 로직은 별도 SharedModule로 추출

### 의존성 명시 비용
- Spring의 `@ComponentScan`: 패키지 아래 컴포넌트를 **자동 발견**. 새 서비스 추가 시 별도 등록 불필요
- NestJS: **모든 프로바이더를 `@Module`의 `providers`에 명시**해야 하고, 외부 공개하려면 `exports`에도 추가. 보일러플레이트 증가하지만 의존 그래프는 코드로 명시됨

### 타입 안정성 vs 컴파일 타임 보장
- Java: 컴파일러가 **타입·null 가능성·예외(Checked Exception)** 를 강하게 잡음
- TypeScript: `strict` 옵션으로 Java에 근접한 수준까지 가능. 다만 `any` 남발·런타임 외부 데이터(JSON)는 여전히 검증 필요 (→ class-validator)

### 런타임 OOM·프로파일링
- JVM: `jstack`·`jmap`·VisualVM·JFR 같은 **성숙한 진단 도구**. 힙 덤프 분석이 일상
- Node.js: `--inspect` + Chrome DevTools, `heapdump`, `clinic`, `v8-profiler`. 도구는 있으나 JVM 대비 관례·문서화 얕음

## 선택 가이드

**Spring 권장**:
- JVM 기반 팀·레거시
- 무거운 트랜잭션·엔터프라이즈 기능 (Spring Security/Batch/Data/Cloud)
- CPU-바운드 작업 비중 높음
- 팀이 Java/Kotlin 숙련

**NestJS 권장**:
- Node.js 기반 팀·풀스택 TS 환경
- I/O 중심·대규모 동시 연결 (실시간·채팅·스트리밍)
- 프론트엔드와 타입 공유 (공용 DTO)
- 빠른 부트스트랩·경량 마이크로서비스

두 프레임워크는 **"같은 것을 하는 다른 방식"**이지, 기술적 우열이 있는 관계는 아님. 팀 숙련도와 생태계 요구가 선택 기준.

## 면접 체크포인트

- NestJS의 DI가 Spring에서 영감받은 구조라는 점과 구체 차이 (모듈 명시성)
- 데코레이터 vs 어노테이션 처리 시점 차이 (런타임 메타데이터 vs 컴파일 + 런타임)
- Guard/Pipe/Interceptor/Filter의 각 역할과 Spring의 대응 컴포넌트
- NestJS에 AOP가 직접 없는 이유와 어떻게 대체하는가
- 트랜잭션 관리가 NestJS에서 복잡한 이유 (프레임워크 표준 부재)
- 두 프레임워크의 동시성 모델이 선택에 미치는 영향
- NestJS가 AWS Lambda에 적합한 이유 (cold start)
- Java 21 가상 스레드가 Spring의 동시성 표현력에 미치는 영향
- Node.js에서 스택 트레이스가 끊기는 이유와 대응 방법

## 출처
- [Techeer — NestJS 프로젝트로 살펴본 Spring과의 비교](https://blog.techeer.net/nestjs-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8%EB%A1%9C-%EC%82%B4%ED%8E%B4%EB%B3%B8-spring%EA%B3%BC%EC%9D%98-%EB%B9%84%EA%B5%90-3ff0d50ff0ee)
- [velog @shin6949 — NodeJS NestJS를 쓰며 느낀 점 vs Java Spring](https://velog.io/@shin6949/NodeJS-NestJS%EB%A5%BC-%EC%93%B0%EB%A9%B0-%EB%8A%90%EB%82%80-%EC%A0%90-vs-Java-Spring)
- [Front-IT — NestJS와 Spring Framework 비교 분석](https://front-it.tistory.com/68)
- [researchwithme — NestJS Spring 비교](https://researchwithme.tistory.com/9)

## 관련 문서
- [[NestJS|NestJS Overview]]
- [[Clean-Architecture-NestJS|NestJS Clean Architecture]]
- [[Spring|Spring Overview]]
- [[Spring-Request-Lifecycle|Spring 요청 처리 흐름]]
- [[Spring-Transactional|Spring @Transactional]]
- [[Servlet-vs-Spring-Container|Servlet vs Spring Container]]
