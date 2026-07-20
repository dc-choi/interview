---
tags: [nestjs, pipe, validation, class-validator, transform]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Pipes", "ValidationPipe", "PipeTransform"]
---

# NestJS Pipes — 변환과 유효성 검사

`PipeTransform<Input, Output>`을 구현하는 Provider. 핸들러 파라미터에 도달하기 직전 **값을 변환하거나 검증**. 검증 실패 시 throw → ExceptionFilter가 처리.

## 위치 — 요청 파이프라인에서

```
Request → Middleware → Guard → Interceptor(pre) → Pipe → Handler
                                                   ↑
                                          여기서 변환, 검증
```

Guard 통과 후 Pipe 실행 — 인가는 끝났고, 입력값을 다듬는 단계.

## 두 가지 책임

| 책임 | 예시 |
|------|------|
| **Transformation** | `'42'` (string) → `42` (number), 평문 → trim/lowercase |
| **Validation** | DTO 필드 제약 검증, DB 존재 여부 확인 |

`ValidationPipe` 같은 표준 파이프는 둘 다 한다.

## 내장 파이프

`ParseIntPipe`, `ParseFloatPipe`, `ParseBoolPipe`, `ParseArrayPipe`, `ParseUUIDPipe`, `ParseEnumPipe`, `ParseDatePipe`, `ParseFilePipe`, `ValidationPipe`, `DefaultValuePipe`.

```ts
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {}

@Get()
findAll(@Query('active', new DefaultValuePipe(false), ParseBoolPipe) active: boolean) {}
```

## 커스텀 파이프 — 단순 변환, 검증

```ts
@Injectable()
export class ParsePositiveIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) throw new BadRequestException('numeric string expected');
    if (val <= 0) throw new BadRequestException('value must be positive');
    return val;
  }
}
```

`ArgumentMetadata`:
- `type`: `'body' | 'query' | 'param' | 'custom'`
- `metatype`: 파라미터 타입 (DTO 클래스 등)
- `data`: `@Param('id')`의 `'id'`

## 비동기 파이프 — DB 검증

```ts
@Injectable()
export class UserExistsPipe implements PipeTransform {
  constructor(private userService: UserService) {}

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (metadata.type === 'param' && metadata.data === 'id') {
      const user = await this.userService.findOne(value);
      if (!user) throw new NotFoundException('User not found');
    }
    return value;
  }
}
```

DI 받는 Pipe는 `@Injectable()` + `new` 대신 클래스 토큰으로 등록.

## 스키마 기반 검증 대안 (Zod)

class-validator 데코레이터 대신 Zod 같은 스키마 라이브러리로 검증하는 경로도 표준으로 제시된다 — 스키마 객체를 받는 커스텀 파이프(ZodValidationPipe)를 만들어 `schema.parse(value)` 실패 시 BadRequestException을 던진다. DTO 데코레이터 방식(아래)과 스키마 방식은 병렬 선택지다.

## ValidationPipe + class-validator

`class-validator` + `class-transformer`와 결합해 DTO 검증의 표준이 됨.

```ts
// main.ts
app.useGlobalPipes(new ValidationPipe({
  transform: true,            // 평문 객체 → DTO 인스턴스 변환
  whitelist: true,            // DTO에 없는 필드 자동 제거
  forbidNonWhitelisted: true, // 모르는 필드 들어오면 throw
}));
```

| 옵션 | 효과 |
|------|------|
| `transform: true` | request body를 DTO 클래스 인스턴스로 변환 (메서드 사용 가능) |
| `whitelist: true` | DTO에 정의되지 않은 필드 자동 제거 |
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
- `@IsOptional` — undefined 허용. `@IsString()` 같은 다른 검증은 값이 있을 때만 적용.

## 커스텀 검증 데코레이터

라이브러리에 없는 검증은 `registerDecorator`로 직접 만들 수 있음(예: `IsUniqueEmail`). 단 DB 의존 검증을 DTO에 두는 건 책임 경계 논쟁 — **DTO 응집도 vs 책임 분리** 트레이드오프. Pipe, Service 레벨로 빼는 게 깔끔하다는 의견도 많음.

## 파일 업로드 검증

크기, MIME 타입 검증은 커스텀 Pipe로 구현 가능하지만, Nest 9+에서는 **`ParseFilePipe` + `FileTypeValidator`/`MaxFileSizeValidator`**가 표준. 직접 구현보다 내장 사용 우선.

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

- [NestJS — Pipes](https://docs.nestjs.com/pipes)
