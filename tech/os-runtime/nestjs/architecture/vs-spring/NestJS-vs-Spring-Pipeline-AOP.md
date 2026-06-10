---
tags: [nestjs, spring, framework, comparison]
status: done
category: "OS - Runtime - NestJS"
aliases: ["NestJS vs Spring 요청 파이프라인", "NestJS Spring AOP 트랜잭션 비교"]
---

# NestJS vs Spring: 요청 파이프라인과 AOP, 트랜잭션

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
| 인증, 인가 | Spring Security Filter | **Guard** |
| 요청 검증, 변환 | `@Valid` + `Argument Resolver` | **Pipe** (`ValidationPipe`) |
| 횡단 로직 | Interceptor + AOP Aspect | **Interceptor** |
| 예외 변환 | `@ControllerAdvice` + `@ExceptionHandler` | **Exception Filter** (`@Catch`) |

NestJS는 AOP의 여러 역할을 **Guard, Pipe, Interceptor, Filter로 쪼개** 명시적 표시. Spring은 AOP가 더 범용이라 같은 일을 다양하게 할 수 있지만 선택지가 많아 팀 컨벤션이 중요.

## AOP vs 횡단 관심사

### Spring AOP
- Spring AOP는 **런타임 프록시 기반** (JDK Dynamic Proxy 또는 CGLIB)
- AspectJ 연동 시 컴파일 타임 위빙도 가능
- `@Aspect` + `@Before`/`@After`/`@Around` + PointCut 표현식
- 트랜잭션, 보안, 캐시, 로깅의 대표 구현

### NestJS
- **AOP 개념이 직접 있지 않고** Guard/Pipe/Interceptor/Filter로 대체
- Interceptor의 `intercept()` = Spring의 `@Around`와 유사 (before + after + 반환값 변환)
- 트랜잭션은 **ORM(Prisma, TypeORM) 레벨**에서 처리하거나 `cls-hooked` 기반 AsyncLocalStorage로 구현

AOP의 "코드 분리" 가치는 NestJS에서도 **데코레이터 기반 가로채기**로 달성. 표현식 포인트컷이 없어서 **어디에 적용할지는 데코레이터로 명시**해야 함(예: `@UseGuards(AuthGuard)`).

## 트랜잭션

- **Spring**: `@Transactional` 애노테이션. 프록시 기반 AOP로 메서드 진입/종료 시 트랜잭션 시작, 커밋/롤백. **자기 호출 함정** 유명 ([[Spring-Transactional]])
- **NestJS**: 프레임워크 표준 없음. ORM별로 다름:
  - TypeORM: `QueryRunner` 수동 또는 `@Transaction` (deprecated)
  - Prisma: `$transaction` API
  - typeorm-transactional (AsyncLocalStorage 기반 데코레이터 라이브러리)로 Spring-like 경험 가능

Spring의 `@Transactional`이 워낙 강력해서 **NestJS 도입 시 트랜잭션 관리가 가장 먼저 느끼는 갭**.

## 검증 (Validation)

- **Spring**: Bean Validation API (JSR 380) + Hibernate Validator. `@Valid` + `@NotNull`, `@Size` 등
- **NestJS**: `class-validator` + `class-transformer` + `ValidationPipe`. DTO 클래스에 `@IsEmail`, `@Min` 등 데코레이터

설계 철학 동일. Spring은 표준 API라서 교체 구현체가 많고, NestJS는 `class-validator` 사실상 표준.

## 예외 처리

- **Spring**: `@ControllerAdvice` + `@ExceptionHandler(Class)`로 전역 예외 매핑
- **NestJS**: `@Catch(ExceptionClass)` + `ExceptionFilter` 구현. 전역 적용은 `app.useGlobalFilters()` 또는 `APP_FILTER` 프로바이더
