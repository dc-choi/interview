---
tags: [nestjs, decorator, metadata, aop]
status: done
category: "OS & Runtime - NestJS"
aliases: ["커스텀 데코레이터 활용 패턴", "createParamDecorator와 applyDecorators"]
---

# NestJS 커스텀 데코레이터 — 활용 패턴

## Parameter Decorator (요청 파라미터 추출)

메서드 파라미터에 붙어 값을 주입하는 패턴.

```ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// 사용
@Get('me')
getMe(@CurrentUser() user: User) { ... }
```

`createParamDecorator`는 NestJS가 제공하는 팩토리. 파라미터 값을 ExecutionContext에서 뽑아 주입.

용도:
- `@CurrentUser` — JWT에서 추출된 사용자
- `@TraceId` — 요청 추적 ID
- `@ClientIp` — X-Forwarded-For 해석된 IP

## Method Decorator + Guard/Interceptor 조합

데코레이터 하나가 여러 NestJS 기본 데코레이터를 묶는 **`applyDecorators`** 패턴:

```ts
export const AdminOnly = () =>
  applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    SetMetadata('roles', ['admin']),
    ApiBearerAuth(),
  );

// 사용
@AdminOnly()
@Delete(':id')
delete(@Param('id') id: string) { ... }
```

반복되는 3줄이 한 줄로 정리. 팀 컨벤션 강제도 쉬워짐.

## 플러그인 시스템 — 클래스 단위 확장

3단계 패턴(마킹, 탐색, 실행)을 **클래스 단위로 확장**해 외부 코드가 핵심 코드를 건드리지 않고 기능을 끼워 넣는 시스템을 만들 수 있다. `DiscoveryService` + `OnModuleInit`으로 부팅 시 일괄 초기화하는 패턴.

자세한 구조, 동적 모듈 결합, 트레이드오프: [[NestJS-Plugin-System|NestJS Plugin System]].

## 관련 문서
- [[NestJS-Custom-Decorator|NestJS 커스텀 데코레이터 (TOC)]]
- [[NestJS-Custom-Decorator-Pipeline|커스텀 데코레이터 3단계 구조]]
- [[NestJS-Custom-Decorator-Pitfalls|@toss/nestjs-aop과 흔한 실수]]
