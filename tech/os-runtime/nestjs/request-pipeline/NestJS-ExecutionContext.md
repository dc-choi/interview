---
tags: [nestjs, execution-context, reflector, metadata]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS ExecutionContext", "ArgumentsHost"]
---

# NestJS ExecutionContext — 다중 컨텍스트 추상화

`ExecutionContext`는 `ArgumentsHost`를 확장한 객체로, **현재 처리 중인 요청의 핸들러·클래스·전송 타입(http/ws/rpc) 정보**를 통합 제공. Guard·Interceptor·Custom Decorator가 동일한 코드로 HTTP/WebSocket/Microservice를 다루게 만드는 추상화.

## ArgumentsHost vs ExecutionContext

| 인터페이스 | 어디서 받음 | 추가 메서드 |
|------|---|---|
| `ArgumentsHost` | Exception Filter | `getType`, `switchToHttp/Ws/Rpc` |
| `ExecutionContext extends ArgumentsHost` | Guard, Interceptor, Param Decorator | `getHandler()`, `getClass()` |

`ExecutionContext`가 부모(`ArgumentsHost`) 기능 + 핸들러/클래스 메타데이터 접근까지 포함. Filter는 **예외만 응답으로 변환**이라 핸들러 메타데이터 필요 없음 → `ArgumentsHost`로 충분.

## 핵심 메서드

```ts
context.getType<'http' | 'ws' | 'rpc'>()   // 전송 타입
context.switchToHttp().getRequest()        // Express Request
context.switchToHttp().getResponse()       // Express Response
context.switchToWs().getClient()           // Socket.IO/WS Client
context.switchToWs().getData()             // 메시지 페이로드
context.switchToRpc().getData()            // RPC 페이로드
context.getHandler()                       // 메서드 참조 — 메타데이터 키
context.getClass()                         // 컨트롤러 클래스 참조
```

## 패턴 1: 전송 타입별 분기 처리

같은 Guard를 HTTP/WebSocket/Microservice에 재사용.

```ts
@Injectable()
export class UniversalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const contextType = context.getType<'http' | 'ws' | 'rpc'>();

    switch (contextType) {
      case 'http':
        return this.handleHttp(context);
      case 'ws':
        return this.handleWs(context);
      case 'rpc':
        return this.handleRpc(context);
      default:
        return false;
    }
  }

  private handleHttp(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return this.validateHttpRequest(request);
  }

  private handleWs(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    return this.validateWsClient(client);
  }

  private handleRpc(context: ExecutionContext): boolean {
    const data = context.switchToRpc().getData();
    return this.validateRpcCall(data);
  }
}
```

## 패턴 2: Reflector + 메타데이터 조합

`getHandler()`/`getClass()`로 메타데이터 키를 찾고 `Reflector`로 읽기.

```ts
@Injectable()
export class MetadataGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 메서드와 클래스 모두에서 메타데이터 수집·우선순위 적용
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    const permissions = this.reflector.get<string[]>('permissions', context.getClass());

    return this.validateAccess(context, requiredRoles, permissions);
  }
}
```

### Reflector API 4종

| 메서드 | 동작 |
|--------|------|
| `get(key, target)` | 단일 target에서 메타데이터 읽기 |
| `getAll(key, [targets])` | 여러 target에서 메타데이터 배열로 |
| `getAllAndOverride(key, [targets])` | 첫 번째 target 우선 — 메서드가 클래스를 override |
| `getAllAndMerge(key, [targets])` | 배열·객체 메타데이터 병합 |

**override vs merge**:
- 권한·플래그: `getAllAndOverride` (메서드가 클래스 무시)
- 태그·역할 누적: `getAllAndMerge`

## Param Decorator에서

`createParamDecorator`의 콜백도 `ExecutionContext`를 받음 — 요청 객체에서 값 추출에 활용.

```ts
export const CurrentUser = createParamDecorator(
  (field: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);

// 사용
getProfile(@CurrentUser() user: User, @CurrentUser('id') userId: string) {}
```

## Interceptor에서 응답 메타데이터 활용

```ts
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ttl = this.reflector.get<number>('cache-ttl', context.getHandler()) ?? 60;
    const request = context.switchToHttp().getRequest();
    // ...
  }
}
```

핸들러별 메타데이터로 동작 분기 → 같은 Interceptor가 메서드마다 다른 정책으로 동작.

## 멀티 트랜스포트 앱 — 같은 Provider, 다른 컨텍스트

NestJS는 한 앱에서 HTTP + WebSocket + Microservice(gRPC/Kafka)를 동시 운영 가능. ExecutionContext가 그 추상화 핵심.

```ts
// app.ts
const app = await NestFactory.create(AppModule);
app.connectMicroservice({ transport: Transport.KAFKA, options: {...} });
await app.startAllMicroservices();
await app.listen(3000);

// Guard·Interceptor·Pipe는 그대로 셋 다에 적용 가능
```

이 시점에 `getType()` 분기 처리가 진짜 의미 있어짐.

## 흔한 실수

- **Filter에서 ExecutionContext 사용**: Filter는 `ArgumentsHost`만 받음. 핸들러 메타데이터 필요하면 Filter 설계를 재고 (Interceptor에서 catchError로 처리).
- **getType 체크 없이 switchToHttp**: WebSocket 컨텍스트에서 호출하면 undefined → 에러. 멀티 트랜스포트 코드는 반드시 분기.
- **getHandler vs getClass 혼동**: 메서드 메타데이터는 `getHandler`, 클래스 메타데이터는 `getClass`. 둘 다 보려면 `getAllAndOverride([getHandler, getClass])`.
- **`get` vs `getAllAndOverride` 차이 무시**: 메서드/클래스 둘 다 메타데이터 가질 수 있는데 `get`만 쓰면 한쪽만 봄.
- **request mutation 의존**: Guard에서 `request.user = ...` → 다른 Guard/Interceptor에서 그 의존 → 순서·범위 헷갈림. Param Decorator로 명시 추출이 깔끔.

## 면접 체크포인트

- `ExecutionContext`가 `ArgumentsHost`와 다른 점 — `getHandler/getClass` 추가
- 어디서 받는지 — Guard·Interceptor·Param Decorator는 ExecutionContext, Filter는 ArgumentsHost
- `getType()`으로 http/ws/rpc 분기 — 멀티 트랜스포트 추상화의 핵심
- `Reflector` 4가지 메서드 (`get`, `getAll`, `getAllAndOverride`, `getAllAndMerge`) 차이
- 메서드 메타데이터(getHandler) vs 클래스 메타데이터(getClass) 우선순위
- Param Decorator(`createParamDecorator`)도 ExecutionContext를 받음
- `request` mutation의 트레이드오프 — 명시 추출 vs 암묵 주입

## 관련 문서

- [[NestJS|NestJS 요청 파이프라인]]
- [[NestJS-Guards|Guards (ExecutionContext 활용 가장 많은 곳)]]
- [[NestJS-AOP-Interceptor|Interceptor (Reflector + getHandler 활용)]]
- [[NestJS-Custom-Decorator|커스텀 데코레이터 · createParamDecorator]]
- [[NestJS-Exception-Filter|Exception Filter (ArgumentsHost만 받음)]]
