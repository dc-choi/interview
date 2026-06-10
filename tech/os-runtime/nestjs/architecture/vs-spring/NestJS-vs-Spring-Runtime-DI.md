---
tags: [nestjs, spring, framework, comparison]
status: done
category: "OS - Runtime - NestJS"
aliases: ["NestJS vs Spring 런타임과 DI", "NestJS Spring 모듈 구조 비교"]
---

# NestJS vs Spring: 런타임과 DI, 모듈 구조

## 언어, 런타임 베이스

| 축 | Spring (Boot) | NestJS |
|---|---|---|
| 언어 | Java / Kotlin | TypeScript |
| 런타임 | JVM (HotSpot, GraalVM) | Node.js (V8) |
| 기본 서버 | Tomcat (내장) | Express (기본) 또는 Fastify |
| 동시성 | **스레드-per-요청** (Servlet, Tomcat 스레드 풀) | **싱글 스레드 + 이벤트 루프** (libuv) |
| 확장 | JVM 스레드 수 증가, 가상 스레드(Java 21+) | 수평 확장(cluster, PM2), 워커 스레드 |

같은 "동시 요청 N개"를 처리하는 방식이 근본적으로 다르다. Spring은 CPU-바운드 작업에 유리하고, NestJS는 I/O-바운드, 대규모 동시 연결에 유리.

## DI (의존성 주입)

### Spring
- **컴포넌트 스캔 + 어노테이션 기반** (`@Component`, `@Service`, `@Repository`, `@Controller`)
- 주입 방식: **생성자 주입 권장** (`@Autowired`는 생략 가능), 필드/세터 주입도 가능하지만 비권장
- **컴파일 타임 어노테이션 처리** + 런타임 리플렉션
- 스코프: singleton(기본), prototype, request, session

### NestJS
- **`@Module` 단위 선언** — 각 모듈이 `providers`, `controllers`, `imports`, `exports`를 명시
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
