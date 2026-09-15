---
tags: [nestjs, pipe, validation, class-validator, transform]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Pipes", "ValidationPipe", "PipeTransform"]
verified_at: 2026-07-21
---

# NestJS Pipes: 적용 범위와 주의점

## 적용 범위

```ts
// 전역
app.useGlobalPipes(new ValidationPipe());

// 모듈 (DI 가능)
{ provide: APP_PIPE, useClass: ValidationPipe }

// 컨트롤러
@UsePipes(new ValidationPipe())
@Controller()

// 메서드
@UsePipes(new ValidationPipe())
@Post()

// 파라미터
@Body(new ValidationPipe()) dto: CreateUserDto
```

전역 ValidationPipe + DTO 클래스 조합이 표준.

## 흔한 실수

- **`transform: false`로 두고 DTO 메서드 사용 시도** → DTO는 plain object라 메서드 없음. `transform: true` 필수.
- **`@ValidateNested` 없이 중첩 객체 검증 기대** → 안 됨. `@ValidateNested` + `@Type()` 둘 다 필요.
- **Pipe에서 인가 검증** → Guard의 책임. Pipe는 값에만 집중.
- **검증 실패 메시지를 운영에 그대로 노출** → 스키마 누출. `disableErrorMessages: true` 또는 ExceptionFilter에서 마스킹.
- **`whitelist: true` 없이** → 클라이언트가 모르는 필드를 던져도 통과 → 보안, 일관성 깨짐.

## 면접 체크포인트

- Pipe의 두 책임 — 변환과 검증
- ValidationPipe 옵션 (`transform`, `whitelist`, `forbidNonWhitelisted`)의 효과
- `@ValidateNested` + `@Type()` 조합이 필요한 이유 — 중첩 검증
- 동기 vs 비동기 Pipe — DB 의존 검증을 Pipe에 두는 트레이드오프
- 적용 범위 (전역, 컨트롤러, 메서드, 파라미터) — 어디까지 좁게 적용할지
- Guard와의 책임 경계 — 인가는 Guard, 값 검증은 Pipe
- `class-transformer`의 역할 — plain object를 DTO 인스턴스로

## 관련 문서

- [[NestJS|NestJS 요청 파이프라인]]
- [[NestJS-Guards|Guards (Pipe 앞 단계)]]
- [[NestJS-Exception-Filter|Pipe 검증 실패 → Exception Filter]]
- [[NestJS-Custom-Decorator|커스텀 데코레이터]]

## 출처
- [NestJS — Pipes](https://docs.nestjs.com/pipes), [Validation](https://docs.nestjs.com/techniques/validation)
- [class-validator — `@IsOptional()`](https://github.com/typestack/class-validator#validation-decorators)
