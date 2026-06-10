---
tags: [nestjs, guard, authn, authz, execution-context]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Guards", "CanActivate"]
---

# NestJS Guards — 인증/인가 계층

`CanActivate` 인터페이스를 구현하는 Provider. **요청이 핸들러에 도달하기 전 단계**에서 `true`를 반환해야 통과, `false` 또는 throw 시 즉시 단락(short-circuit)되어 핸들러는 실행되지 않음.

## 위치 — 요청 파이프라인에서

```
Request → Middleware → Guard → Interceptor(pre) → Pipe → Handler → Interceptor(post) → Response
                        ↑
                   여기서 false → 403 즉시
```

- **Middleware보다 뒤**: NestJS 컨텍스트(`ExecutionContext`)에 접근 가능.
- **Pipe보다 앞**: 인가 실패 시 검증·변환을 진행할 필요 없음.

## CanActivate 시그니처

```ts
canActivate(
  context: ExecutionContext,
): boolean | Promise<boolean> | Observable<boolean>
```

비동기·Observable 반환 가능 — JWT 검증, DB 조회, 외부 IDP 호출 등.

## ExecutionContext 활용

요청 타입(http/ws/rpc)에 따라 분기. 같은 Guard를 HTTP/WebSocket에 재사용 가능.

```ts
const contextType = context.getType<'http' | 'ws' | 'rpc'>();
if (contextType === 'http') {
  const request = context.switchToHttp().getRequest();
  // ...
}
```

## 패턴 1: JWT 인증 Guard

```ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) return false;

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request['user'] = payload;   // 다음 단계(Pipe·Handler)에서 사용
      return true;
    } catch {
      return false;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

`request.user` 주입 → 핸들러에서 `@CurrentUser()` 같은 Param Decorator로 추출.

## 패턴 2: Role 기반 인가 + Reflector

`@SetMetadata`로 메서드/클래스에 메타데이터 부착 → Guard가 `Reflector`로 읽어 검증.

```ts
// 1. 데코레이터
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// 2. Guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),  // 메서드 메타데이터 우선
      context.getClass(),    // 없으면 클래스 메타데이터
    ]);
    if (!requiredRoles) return true;   // 메타데이터 없으면 통과

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}

// 3. 사용
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Post('users')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  createUser(@Body() dto: CreateUserDto) {}
}
```

`getAllAndOverride` vs `getAll`:
- **getAllAndOverride**: 핸들러 메타데이터가 있으면 클래스 메타데이터 무시 (override).
- **getAll**: 핸들러 + 클래스 메타데이터 모두 배열로 반환 (병합).

## Guard 체인 — 적용 순서와 단락 평가

```ts
@Controller()
@UseGuards(AuthGuard, RoleGuard, PermissionGuard)  // 클래스 레벨 — 순차 실행
export class MyController {
  @Get()
  @UseGuards(SpecificGuard)  // 메서드 레벨 — 클래스 Guard 다음에 실행
  getData() {}
}
```

- **클래스 → 메서드 순**으로 실행.
- **하나라도 false 또는 throw → 즉시 단락**, 다음 Guard 실행 안 됨, Handler도 실행 안 됨.
- 비용 큰 검증(DB 조회)은 가벼운 검증(JWT 서명) 뒤에 둘 것.

## 적용 범위 — 전역 vs 모듈 vs 컨트롤러 vs 메서드

```ts
// 전역 (main.ts)
app.useGlobalGuards(new JwtAuthGuard());

// 모듈
@Module({
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
// → DI 컨테이너 통과 → 다른 Provider 주입 가능

// 컨트롤러
@UseGuards(JwtAuthGuard)
@Controller()

// 메서드
@UseGuards(JwtAuthGuard)
@Get()
```

전역 Guard에 DI가 필요하면 `APP_GUARD` 토큰으로 모듈 등록. `app.useGlobalGuards(new ...)`는 인스턴스 직접 생성이라 DI 안 됨.

## 인증 우회 — `@Public()` 패턴

전역 JwtAuthGuard 적용 시 로그인·헬스체크 등 일부 라우트만 빼고 싶을 때.

```ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    // ... 기존 JWT 검증
  }
}

// 사용
@Public()
@Get('health')
health() {}
```

## throw vs return false

- `return false` → NestJS가 자동으로 `ForbiddenException` (403)
- `throw new UnauthorizedException()` → 401 + 커스텀 메시지

인증 실패는 401, 인가 실패는 403으로 명시적으로 던지는 게 표준.

## 흔한 실수

- **Pipe로 인가 검증**: Pipe는 변환·검증 계층 — 인가는 Guard. 책임 경계 흐려짐.
- **request 객체에 mutate 후 의존**: Guard가 `request.user`를 주입하는 건 표준이지만, 너무 많은 mutation은 추적 어려움. Param Decorator로 명시적 추출이 깔끔.
- **getAllAndOverride 대신 get**: 메서드 데코레이터로 클래스 데코레이터를 덮어쓰려는 의도면 `getAllAndOverride` 필수.
- **APP_GUARD 없이 useGlobalGuards로 DI 시도**: DI 안 됨 — `APP_GUARD` 토큰으로 등록해야 ConfigService·JwtService 같은 Provider 주입 가능.
- **무거운 검증을 Guard 앞쪽에**: DB·외부 호출 Guard를 가벼운 JWT Guard보다 앞에 두면 단락 효과 사라짐.

## 면접 체크포인트

- Guard가 요청 파이프라인 어디에 위치하는지, Middleware와의 차이
- `ExecutionContext`로 http/ws/rpc 분기 처리
- `Reflector` + `SetMetadata`로 메서드/클래스 메타데이터 읽기 (`getAllAndOverride` vs `getAll`)
- Guard 체인 단락 평가 — 순서가 비용 효율에 미치는 영향
- `APP_GUARD` 토큰 등록 vs `useGlobalGuards` 차이 (DI 가능/불가)
- 401 vs 403 — 인증 실패와 인가 실패 구분
- `@Public()` 패턴으로 전역 Guard 우회

## 관련 문서

- [[NestJS|NestJS 요청 파이프라인]]
- [[NestJS-ExecutionContext|ExecutionContext 심화]]
- [[NestJS-Custom-Decorator|커스텀 데코레이터 (SetMetadata·Reflector)]]
- [[NestJS-Pipes|Pipes (Guard 다음 단계)]]
