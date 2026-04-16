---
tags: [spring, exception-handling, controlleradvice, exceptionhandler, filter]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Spring Exception Handling", "Spring 예외 처리", "ControllerAdvice"]
---

# Spring 예외 처리 전략

요청 처리 파이프라인에서 **예외가 발생하는 위치**에 따라 다른 메커니즘이 동작한다. `DispatcherServlet` 내부에서 터지는 예외는 `HandlerExceptionResolver`가 가로채지만, `Filter`에서 터지는 예외는 서블릿 컨테이너 레벨까지 올라가므로 전혀 다른 처리 경로가 필요하다. 이 차이를 모르면 "글로벌 핸들러가 왜 안 잡히지?"를 만나게 된다.

## 예외 발생 지점

```
[Client] → [Filter Chain] → [DispatcherServlet] → [Interceptor] → [Controller] → [Service] → [Repository]
                │                       └─────────── @ExceptionHandler / @ControllerAdvice 관할
                └─── 서블릿 컨테이너 관할 (HandlerExceptionResolver 미적용)
```

- **DispatcherServlet 내부 예외**: Controller·Service·Repository 등 → `HandlerExceptionResolver`가 처리
- **DispatcherServlet 외부 예외**: Filter·JWT 토큰 파싱 실패 등 → 서블릿 컨테이너의 에러 페이지 매커니즘으로 위임

## 핵심 구성 요소

### 1. `@ExceptionHandler` (Controller 로컬)

특정 Controller 내부에서 발생한 예외만 처리.

```java
@RestController
public class UserController {
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handle(UserNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("USER_NOT_FOUND", e.getMessage()));
    }
}
```

- 범위가 좁아 **도메인 특화 예외**에 유리
- 우선순위: Controller `@ExceptionHandler` **> ** `@ControllerAdvice`

### 2. `@ControllerAdvice` / `@RestControllerAdvice` (글로벌)

모든 Controller에 교차 적용.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        List<String> errors = e.getBindingResult().getFieldErrors().stream()
            .map(err -> err.getField() + ": " + err.getDefaultMessage())
            .toList();
        return ResponseEntity.badRequest().body(new ErrorResponse("VALIDATION_FAILED", errors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleFallback(Exception e) {
        log.error("unhandled", e);
        return ResponseEntity.internalServerError().body(new ErrorResponse("INTERNAL", "..."));
    }
}
```

- `basePackages`·`assignableTypes`·`annotations` 속성으로 **적용 범위 제한 가능**
- `@Order`로 여러 advice 간 우선순위 조정

### 3. `ResponseEntityExceptionHandler` 확장

Spring MVC가 기본 제공하는 표준 예외(`MethodArgumentNotValidException`, `HttpMessageNotReadableException` 등)를 일관된 포맷으로 처리할 수 있는 추상 클래스. `@RestControllerAdvice`가 이를 상속하면 `handleExceptionInternal` 훅으로 응답 본문을 일관화.

### 4. Filter 예외는 별도 처리

`@ControllerAdvice`는 **DispatcherServlet 이후**에서만 작동하므로 Filter에서 던진 예외(예: JWT 파싱 실패)는 잡히지 않는다. 세 가지 대안:

- **Filter 내부 try-catch** — 잡아서 직접 응답 작성 (`response.sendError()` 또는 JSON body)
- **`HandlerExceptionResolver`를 Filter에 주입** — Resolver를 수동 호출해 Controller advice와 동일 흐름으로 위임
- **`ErrorController` 커스터마이즈** — 서블릿 컨테이너의 에러 페이지(`/error`)로 라우팅되면 Spring Boot의 `BasicErrorController`가 받음. 이를 상속·대체하여 일관된 포맷 제공

## 일관된 에러 응답 포맷

API 전역에서 같은 응답 구조를 유지해야 클라이언트·모니터링·알림 시스템이 단순해진다.

```json
{
  "code": "USER_NOT_FOUND",
  "message": "id=1 사용자를 찾을 수 없습니다",
  "traceId": "b2c1...",
  "timestamp": "2026-04-17T10:00:00Z",
  "fields": [ { "field": "email", "reason": "invalid format" } ]
}
```

- **code** — 애플리케이션 정의 에러 코드(HTTP 상태 코드와 별개)
- **message** — 사람·로그용. 클라이언트에 노출할지 여부는 도메인 판단
- **traceId** — Sleuth·OpenTelemetry로 분산 추적 연계
- **fields** — 검증 실패 시 상세 위치

## 예외 분류 전략

| 분류 | 예시 | 응답 | 로깅 |
|---|---|---|---|
| **비즈니스 예외** | `UserNotFoundException` | 4xx + code | INFO / 필요 시 WARN |
| **검증 실패** | `MethodArgumentNotValidException` | 400/422 + fields | 로깅 생략 가능 |
| **인증/인가** | `AccessDeniedException` | 401/403 | INFO |
| **외부 시스템 실패** | `ExternalApiException` | 502/503 + retryAfter | WARN + 알림 |
| **예상치 못한 예외** | `NullPointerException` 등 | 500 | ERROR + 즉시 알림 |

RuntimeException 상속 커스텀 예외 계층을 만들어 도메인별로 구분하면 `@ExceptionHandler` 매핑이 정돈된다.

## 흔한 실수

- **`try { ... } catch (Exception e) {}`** → 예외가 삼켜져 복구 불가 + 로그 누락
- **Checked Exception을 REST 계층까지 전파** → 컨트롤러 시그니처가 더러워짐. RuntimeException 계층으로 래핑
- **`ex.getMessage()`를 그대로 응답 본문에** → 내부 경로·SQL·스택 정보 유출. 코드 + 사람 친화 메시지로 매핑
- **`@ControllerAdvice`로 Filter 예외 잡으려 함** → 범위 밖. Filter 내부에서 처리
- **500 응답에도 `@ControllerAdvice`가 로깅만 하고 알림 없음** → 옵저버빌리티 공백

## 면접 체크포인트

- `@ExceptionHandler`와 `@ControllerAdvice`의 범위·우선순위
- Filter에서 발생한 예외가 `@ControllerAdvice`에 잡히지 않는 이유
- 비즈니스 예외·검증 실패·시스템 예외의 응답 설계 차이
- 에러 응답 포맷에 traceId가 있어야 하는 이유
- Filter 예외를 Resolver로 위임하는 패턴

## 출처
- [binghe819 TIL — 스프링 예외처리 개념 및 전략](https://github.com/binghe819/TIL/blob/master/Spring/%EA%B8%B0%ED%83%80/%EC%8A%A4%ED%94%84%EB%A7%81%20%EC%98%88%EC%99%B8%EC%B2%98%EB%A6%AC%20%EA%B0%9C%EB%85%90%20%EB%B0%8F%20%EC%A0%84%EB%9E%B5.md)

## 관련 문서
- [[Spring|Spring 개요 (IoC·DI·AOP)]]
- [[Servlet-vs-Spring-Container|Servlet Container vs Spring Container]]
- [[Railway-Oriented-Programming|Railway-Oriented Programming]]
- [[HTTP-Status-Code|HTTP Status Code · Header]]
