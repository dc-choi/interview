---
tags: [nestjs, pipe, validation, class-validator, transform]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Pipes", "ValidationPipe", "PipeTransform"]
verified_at: 2026-07-21
---

# NestJS Pipes: 기본 동작

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

## 출처
- [NestJS — Pipes](https://docs.nestjs.com/pipes), [Validation](https://docs.nestjs.com/techniques/validation)
