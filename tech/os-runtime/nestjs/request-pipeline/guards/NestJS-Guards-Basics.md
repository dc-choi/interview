---
tags: [nestjs, guard, authn, authz, execution-context]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Guards 기본", "CanActivate 시그니처"]
---

# NestJS Guards — 위치와 CanActivate 기본

## 위치 — 요청 파이프라인에서

```
Request → Middleware → Guard → Interceptor(pre) → Pipe → Handler → Interceptor(post) → Response
                        ↑
                   여기서 false → 403 즉시
```

- **Middleware보다 뒤**: NestJS 컨텍스트(`ExecutionContext`)에 접근 가능.
- **Pipe보다 앞**: 인가 실패 시 검증, 변환을 진행할 필요 없음.

## CanActivate 시그니처

```ts
canActivate(
  context: ExecutionContext,
): boolean | Promise<boolean> | Observable<boolean>
```

비동기, Observable 반환 가능 — JWT 검증, DB 조회, 외부 IDP 호출 등.

## ExecutionContext 활용

요청 타입(http/ws/rpc)에 따라 분기. 같은 Guard를 HTTP/WebSocket에 재사용 가능.

```ts
const contextType = context.getType<'http' | 'ws' | 'rpc'>();
if (contextType === 'http') {
  const request = context.switchToHttp().getRequest();
  // ...
}
```

## 출처

- [NestJS — Guards](https://docs.nestjs.com/guards)
