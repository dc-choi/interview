---
tags: [nestjs, spring, framework, comparison]
status: done
category: "OS - Runtime - NestJS"
aliases: ["NestJS vs Spring 런타임과 DI", "NestJS Spring 모듈 구조 비교"]
verified_at: 2026-09-30
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

같은 시점의 동시 요청 N개를 처리하는 방식이 근본적으로 다르다. 서블릿 컨테이너는 요청 처리 중 블로킹을 흡수하려고 큰 스레드 풀을 두는 반면(Spring 공식 문서), Node.js는 적은 수의 스레드로 다수 클라이언트를 받기 때문에 콜백 하나가 이벤트 루프를 오래 점유하면 대기 중인 다른 요청이 밀린다(Node.js 공식 문서). 여기서 나오는 일반 경향은 긴 CPU 연산이 섞이면 스레드 풀 모델이 덜 취약하고, 지연이 큰 네트워크 I/O와 대규모 동시 연결에서는 이벤트 루프 모델이 적은 스레드로 확장하기 유리하다는 정도다. 다만 Spring 공식 문서도 논블로킹이 곧 더 빠름을 뜻하지는 않으며 이점은 지연이 있는 구간에서 드러난다고 밝히고 있고, Node.js는 worker thread, Spring은 WebFlux와 가상 스레드로 각자 반대편을 보완할 수 있다. 워크로드 구성과 실측 없이 어느 쪽이 CPU 바운드에 유리하다고 단정할 수는 없다.

## 논블로킹은 DB 드라이버까지 이어져야 한다

이벤트 루프 모델의 이점은 요청 경로의 모든 I/O 호출이 논블로킹일 때 온전히 나온다. 웹 계층만 이벤트 루프로 바꾸고 DB 호출이 blocking API로 남으면 이벤트 루프 스레드가 묶이거나, blocking 호출을 별도 스레드로 옮기는 설계를 다시 해야 한다. Spring Framework 7.0 문서도 JPA, JDBC 같은 blocking persistence API를 써야 하면 일반적인 구조에서는 Spring MVC가 최선이고, Reactor나 RxJava로 별도 스레드에서 blocking 호출을 할 수는 있지만 논블로킹 웹 스택을 제대로 활용하지 못한다고 설명한다. `publishOn`은 blocking 라이브러리를 위한 탈출구일 뿐 blocking API는 이 동시성 모델에 잘 맞지 않는다.

| 조합 | 동작 | 비용과 조건 |
|---|---|---|
| Spring MVC + JDBC/JPA | thread-per-request | 스레드 풀과 커넥션 풀이 동시성 상한. 기존 생태계를 그대로 쓴다 |
| Spring WebFlux + R2DBC | 요청 경로 전체가 논블로킹 | Spring Data R2DBC는 JPA 구현이 아니어서 영속성 컨텍스트, 변경 감지, 지연 로딩을 전제로 한 코드는 데이터 접근 방식부터 바뀐다 |
| WebFlux + JDBC를 `publishOn` 등으로 격리 | 동작한다 | 이점이 줄고 격리용 스레드 풀 크기를 다시 설계해야 한다 |
| Spring MVC + 가상 스레드(Java 21+) | blocking 스타일 유지 | 지원되는 I/O 대기 중 carrier thread를 비운다([[NestJS-vs-Spring-Ecosystem-Practice#비동기 처리 표현력|가상 스레드]]) |
| NestJS + `pg`, `mysql2` 같은 Promise 기반 드라이버 | 드라이버가 처음부터 비동기 | 전환 비용은 없지만 CPU 연산과 동기 API가 이벤트 루프를 막는 문제는 남는다 |

Node.js에서 DB 호출이 논블로킹이라는 말은 응답을 기다리는 동안 이벤트 루프가 다른 요청을 처리한다는 뜻이지 DB 처리량이 늘어난다는 뜻이 아니다. 동시 query 수는 커넥션 풀 크기와 DB 용량에 묶이고, 같은 row의 lock 대기(`SELECT ... FOR UPDATE` 재고 차감 등)는 런타임 모델과 무관하게 직렬화된다([[Lock-Wait-Convoy]]). `fs`, `dns.lookup`, 일부 `crypto`처럼 libuv 스레드 풀로 위임되는 작업은 그 풀 크기가 별도 상한이다([[libuv-Threading]]).

## DI (의존성 주입)

### Spring
- **컴포넌트 스캔 + 어노테이션 기반** (`@Component`, `@Service`, `@Repository`, `@Controller`)
- 주입 방식: **생성자 주입 권장** (`@Autowired`는 생략 가능), 필드/세터 주입도 가능하지만 비권장
- **컴파일 타임 어노테이션 처리** + 런타임 리플렉션
- 스코프: singleton(기본), prototype, request, session

### NestJS
- **`@Module` 단위 선언** — 각 모듈이 `providers`, `controllers`, `imports`, `exports`를 명시
- 주입 방식: **constructor token** 기반. 클래스 타입 주입은 자동 생성된 설계 타입 메타데이터를 읽고, 문자열이나 심벌 같은 사용자 정의 token은 `@Inject()`로 명시
- `@Injectable()`은 클래스를 Nest IoC 컨테이너가 관리할 수 있다는 메타데이터를 붙인다. 실제 provider 등록은 `@Module({ providers: [...] })`가 담당
- 기존 TypeScript 데코레이터 모드에서 constructor 타입을 자동 추론하려면 `emitDecoratorMetadata`와 `reflect-metadata`가 필요하다. 명시적 token 주입은 자동 타입 추론과 구분한다
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
| 처리 시점 | 컴파일 처리와 런타임 리플렉션 | transpile된 데코레이터 함수가 클래스 정의 시 실행 |
| 메타데이터 접근 | `Reflection API` 표준 | Nest의 기존 모드는 `reflect-metadata` 사용 |
| 표준 지위 | JLS 표준 | Nest가 쓰는 기존 TypeScript 데코레이터와 TypeScript 5.0 이후 표준 데코레이터는 의미론이 다름 |
| 타겟 | 클래스, 메서드, 필드, 파라미터 등 | 기존 TypeScript 모드에서 클래스, 메서드, 접근자, 속성, 파라미터 |

NestJS의 일반적인 TypeScript 설정은 기존 `experimentalDecorators` 모드를 사용한다. `emitDecoratorMetadata`는 장식된 선언의 설계 타입 정보를 추가로 내보내 constructor 타입 기반 주입에 쓰인다. 반면 `@SetMetadata()` 같은 데코레이터는 지정한 key/value를 직접 기록하므로 그 명시적 메타데이터 자체가 자동 설계 타입 생성에 의존하지 않는다.

## 출처

- [Node.js — Don't block the event loop (or the worker pool)](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop)
- [Spring Framework — Spring WebFlux Overview (Applicability, Concurrency Model, Performance)](https://docs.spring.io/spring-framework/reference/web/webflux/new-framework.html)
- [Spring Data Relational — R2DBC](https://docs.spring.io/spring-data/relational/reference/r2dbc.html)
- [인프런, 김빌, Node, NestJS 주요 특징](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273667)
- [NestJS, Providers](https://docs.nestjs.com/providers)
- [NestJS, Custom decorators](https://docs.nestjs.com/custom-decorators)
- [TypeScript, Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
- [TypeScript, emitDecoratorMetadata](https://www.typescriptlang.org/tsconfig/emitDecoratorMetadata.html)
