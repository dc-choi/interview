---
tags: [nestjs, pipe, validation, class-validator, transform]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Pipes", "ValidationPipe", "PipeTransform"]
verified_at: 2026-09-30
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

### 파이프 체인의 순서

한 파라미터에 나열한 파이프는 왼쪽부터 차례로 실행되고, 앞 파이프의 반환값이 다음 파이프의 입력이 된다. 전역, controller, method에 건 파이프가 먼저 돌고 파라미터 파이프가 그 뒤에 이어진다. 중간 파이프가 예외를 던지면 뒤 파이프와 handler는 실행되지 않고 exception filter로 간다. 위 `findAll`에서 `DefaultValuePipe`가 앞에 있어야 값이 없을 때 `false`가 채워지고, 순서를 바꾸면 `ParseBoolPipe`가 `undefined`를 받아 400을 던진다.

### ParseIntPipe는 정수 문자열만 받는다

2026-09-30 확인한 NestJS master 소스의 `ParseIntPipe`는 값이 `/^-?\d+$/`와 `isFinite` 검사를 통과할 때만 `parseInt(String(value), 10)`으로 바꾼다. `2.2`, `-2.2`, `12abc`는 `Validation failed (numeric string is expected)` 400이 된다.

- 이 정규식 검사는 NestJS 8.0.8에서 들어왔다. 그 전 구현은 `parseFloat`로 숫자인지만 확인한 뒤 `parseInt`로 바꿔 `-2.2`를 `-2`로 조용히 잘랐다. 오래된 예제의 절삭 동작을 현재 동작으로 옮기지 않는다.
- 안전 정수 범위 밖의 긴 정수 문자열은 아직 거부되지 않는다. `9007199254740993`은 `9007199254740992`로 바뀐다. 안전 정수 검사로 바꾸는 수정은 다음 major를 기다리는 PR 상태이므로, 큰 ID는 숫자로 바꾸지 않고 문자열로 받는다.

## 커스텀 파이프 — 단순 변환, 검증

변환은 내장 `ParseIntPipe`에 맡기고, 업무 규칙 검사는 뒤에 이어지는 파이프로 나눈다.

```ts
@Injectable()
export class PositiveIntPipe implements PipeTransform<number, number> {
  transform(value: number, metadata: ArgumentMetadata): number {
    if (value <= 0) throw new BadRequestException('value must be positive');
    return value;
  }
}

@Get(':id')
findOne(@Param('id', ParseIntPipe, PositiveIntPipe) id: number) {}
```

변환까지 직접 구현한다면 `parseInt` 결과만 확인하지 말고 정수 문자열인지 먼저 검사한다. `parseInt('2.9', 10)`은 2, `parseInt('12abc', 10)`은 12를 돌려주므로 `isNaN` 검사만으로는 잘못된 입력이 조용히 다른 값으로 통과한다.

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
- [parse-int.pipe.ts — NestJS GitHub](https://github.com/nestjs/nest/blob/master/packages/common/pipes/parse-int.pipe.ts)
- [fix(common): catch number encoding in ParseIntPipe — NestJS GitHub](https://github.com/nestjs/nest/commit/d9b88811bd5999559844e5cda7088ff39aecbc5b)
- [ParseIntPipe silently rounds integers outside the safe integer range — NestJS GitHub issue #17873](https://github.com/nestjs/nest/issues/17873), [PR #17874](https://github.com/nestjs/nest/pull/17874)
- [pipes-consumer.ts — NestJS GitHub](https://github.com/nestjs/nest/blob/master/packages/core/pipes/pipes-consumer.ts)
- [인프런, 윤상석, Pipe 패턴에 대하여 보충](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=86680)
- [인프런, 윤상석, Exception filter & Pipes](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83825)
