---
tags: [nestjs, exception-filter, error-handling, http-exception]
status: done
category: "OS & Runtime - NestJS"
aliases: ["Exception Filter 적용 범위와 우선순위", "Exception Filter 흔한 실수"]
---

# NestJS Exception Filter — 적용 범위, 우선순위, 흔한 실수

## 적용 범위

```ts
// 전역 (DI 안 됨)
app.useGlobalFilters(new AllExceptionsFilter());

// 전역 (DI 됨)
{ provide: APP_FILTER, useClass: AllExceptionsFilter }

// 컨트롤러
@UseFilters(SomeFilter)
@Controller()

// 메서드
@UseFilters(SomeFilter)
@Post()
```

DI가 필요한 Filter(Logger, ConfigService 주입)는 `APP_FILTER` 토큰.

## 우선순위 — 적용 범위와 타입 구체성

여러 Filter가 적용된 경우:
1. **타입이 더 구체적인 Filter 우선** — `@Catch(ValidationException)`이 `@Catch()`보다 먼저.
2. **적용 범위가 좁은 것이 우선** — 메서드 > 컨트롤러 > 전역.
3. **여러 Filter가 같은 예외를 잡으면 처음 매칭된 것이 처리**.

## Pipe 검증 실패와의 관계

`ValidationPipe` throw → `BadRequestException` (400). Filter에서 응답 포맷만 통일하면 됨. 별도로 검증 결과 가공이 필요하면 `exceptionFactory` 옵션으로:

```ts
new ValidationPipe({
  exceptionFactory: (errors) =>
    new BadRequestException({
      message: 'Validation failed',
      errors: errors.map(e => ({ field: e.property, constraints: e.constraints })),
    }),
})
```

## 흔한 실수

- **모든 에러를 200으로**: "에러도 success: false 필드로 통일"하려다 200 + body의 status 코드만 다르게. HTTP 시멘틱 깨짐 — 캐싱, 모니터링, 재시도 정책이 망가짐.
- **운영에서 stack trace 노출**: 내부 구조 누출. `NODE_ENV` 분기 필수.
- **`@Catch()` 하나로 다 잡고 instanceof 분기**: 가능하지만 타입별 Filter가 가독성, 테스트성 좋음.
- **`useGlobalFilters(new ...)`로 DI 시도**: 안 됨. `APP_FILTER` 토큰 등록 필요.
- **HttpException 외 예외 무시**: TypeORM, 외부 SDK 예외가 그대로 5xx로 → 클라이언트가 디버깅 불가. catch-all에서 명시적 매핑 필요.
- **Filter에서 비즈니스 로직**: 응답 포맷, 로깅 외 작업 금지 — 트랜잭션 롤백 등은 Filter에 들어오기 전에 끝났어야.

## 면접 체크포인트

- Exception Filter가 요청 파이프라인 어디에 위치하는지
- `@Catch()` 데코레이터 — 타입별 vs catch-all
- `ArgumentsHost` vs `ExecutionContext` 차이 (전자가 부모)
- 내장 HttpException 서브클래스의 자동 매핑 (별도 Filter 없이도 동작)
- 적용 우선순위 — 타입 구체성 + 적용 범위
- `APP_FILTER` 토큰 등록 vs `useGlobalFilters` (DI 가능/불가)
- 운영/개발 환경 분기 — stack trace 노출 통제
- `ValidationPipe`의 `exceptionFactory`로 검증 실패 응답 커스터마이징
