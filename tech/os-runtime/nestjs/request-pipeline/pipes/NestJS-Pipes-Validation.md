---
tags: [nestjs, pipe, validation, class-validator, transform]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Pipes", "ValidationPipe", "PipeTransform"]
verified_at: 2026-07-21
---

# NestJS Pipes: ValidationPipe

## 스키마 기반 검증 대안 (Zod)

class-validator 데코레이터 대신 Zod 같은 스키마 라이브러리로 검증하는 경로도 표준으로 제시된다 — 스키마 객체를 받는 커스텀 파이프(ZodValidationPipe)를 만들어 `schema.parse(value)` 실패 시 BadRequestException을 던진다. DTO 데코레이터 방식(아래)과 스키마 방식은 병렬 선택지다.

## ValidationPipe + class-validator

`class-validator` + `class-transformer`와 결합해 DTO 검증의 표준이 됨.

```ts
// main.ts
app.useGlobalPipes(new ValidationPipe({
  transform: true,            // 평문 객체 → DTO 인스턴스 변환
  whitelist: true,            // 검증 데코레이터 없는 필드 자동 제거
  forbidNonWhitelisted: true, // 모르는 필드 들어오면 throw
}));
```

| 옵션 | 효과 |
|------|------|
| `transform: true` | request body를 DTO 클래스 인스턴스로 변환 (메서드 사용 가능) |
| `whitelist: true` | 검증 데코레이터가 없는 필드 자동 제거. DTO에 선언돼 있어도 validator가 없으면 제거되며 유지하려면 `@Allow()` 사용 |
| `forbidNonWhitelisted` | whitelist 위반 시 400 throw |
| `disableErrorMessages` | 운영 환경에서 검증 메시지 노출 차단 |

## class-validator DTO 패턴

```ts
export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'letters/numbers/_ only' })
  username: string;

  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => TagDto)
  tags?: TagDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileDto)
  profile?: ProfileDto;
}
```

핵심:
- `@ValidateNested({ each: true }) + @Type()` — 중첩 객체/배열 검증. `@Type` 없으면 plain object로 들어와 검증 안 됨.
- `@Transform` — 정규화(lowercase, trim) 같은 사전 변환.
- `@IsOptional` — 값이 `undefined` 또는 `null`이면 같은 프로퍼티의 다른 validator를 건너뛴다. `null`을 금지해야 하면 별도 조건이나 validator를 둔다.

## 커스텀 검증 데코레이터

라이브러리에 없는 검증은 `registerDecorator`로 직접 만들 수 있음(예: `IsUniqueEmail`). 단 DB 의존 검증을 DTO에 두는 건 책임 경계 논쟁 — **DTO 응집도 vs 책임 분리** 트레이드오프. Pipe, Service 레벨로 빼는 게 깔끔하다는 의견도 많음.

## 파일 업로드 검증

크기, MIME 타입 검증은 커스텀 Pipe로 구현 가능하지만, Nest 9+에서는 **`ParseFilePipe` + `FileTypeValidator`/`MaxFileSizeValidator`**가 표준. 직접 구현보다 내장 사용 우선.

## 출처
- [NestJS — Pipes](https://docs.nestjs.com/pipes), [Validation](https://docs.nestjs.com/techniques/validation)
- [class-validator — `@IsOptional()`](https://github.com/typestack/class-validator#validation-decorators)
