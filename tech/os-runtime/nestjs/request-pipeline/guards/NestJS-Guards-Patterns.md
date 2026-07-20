---
tags: [nestjs, guard, authn, authz, execution-context]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Guard 패턴", "JWT Guard와 RolesGuard"]
---

# NestJS Guards — 인증/인가 패턴

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
      request['user'] = payload;   // 다음 단계(Pipe, Handler)에서 사용
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

`JwtService`는 `@nestjs/jwt`(JWT 생성, 검증 유틸 패키지) 소속 — `JwtModule.register({ global: true, secret, signOptions: { expiresIn: '60s' } })`로 등록하면 모듈마다 import할 필요가 없다. 토큰 발급은 `jwtService.signAsync({ sub: user.userId, username })`처럼 JWT 표준 sub 클레임에 사용자 식별자를 싣는 것이 공식 컨벤션.

### Passport 통합 계약 (@nestjs/passport)

- 전략은 `PassportStrategy(Strategy)` 믹스인을 상속 — 전략 옵션은 `super()`로 넘기고, Passport의 verify 콜백 자리를 **`validate()` 메서드**가 대신한다. validate의 반환값이 `request.user`로 들어가고, null/false 계열이면 Nest가 거부한다.
- 라우트 보호와 인증 개시 둘 다 **내장 `AuthGuard('전략명')` 팩토리** — 보호 라우트엔 `AuthGuard('jwt')`, 로그인 라우트엔 `AuthGuard('local')`(가드가 전략을 호출해 자격 검증과 user 부착까지 수행). 에러 처리 커스터마이징은 AuthGuard 상속 + 메서드 오버라이드.
- **전략은 request-scoped 불가** — passport가 전략을 라이브러리 전역 인스턴스에 등록하는 구조라 요청별 인스턴스화가 성립하지 않는다. 요청 의존 로직이 필요하면 전략(싱글턴) 안에서 `ModuleRef.resolve(..., contextId)`로 request-scoped 프로바이더를 꺼내는 우회를 쓴다.

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

## 인증 우회 — `@Public()` 패턴

전역 JwtAuthGuard 적용 시 로그인, 헬스체크 등 일부 라우트만 빼고 싶을 때.

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

## 패턴 4: Rate Limiting — @nestjs/throttler

브루트포스 방어의 표준 경로. 커스텀 미들웨어 구현([[NestJS-Middleware]]의 예시) 대신 **가드 기반** 공식 패키지를 쓴다.

```ts
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 3 },     // ttl은 밀리초 (seconds(1) 헬퍼도 제공)
  { name: 'long', ttl: 60000, limit: 100 },
]),
providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
```

- **다중 스로틀러 정의** — name 붙인 배열로 초당/분당 한도를 동시에 걸고, `@Throttle({ short: { limit, ttl } })`로 라우트별 오버라이드, `@SkipThrottle()`(또는 `{ short: true }`처럼 스로틀러별)로 제외. 인자 없으면 `{ default: true }`.
- **프록시 뒤에서는 trust proxy 필수** — 안 켜면 클라이언트 IP 대신 프록시 IP로 카운트되어 전체 사용자가 한 버킷에 묶인다 (`app.set('trust proxy', ...)`).
- **스토리지** — 기본은 인메모리라 단일 인스턴스 전용. 분산 환경은 `storage` 옵션에 `ThrottlerStorage` 구현체(커뮤니티 Redis 스토리지)를 꽂아 single source of truth로.
- WebSocket, GraphQL 컨텍스트도 가드 메서드 오버라이드로 지원.

## 인가 모델 스펙트럼 — RBAC, Claims, 정책 기반(CASL)

패턴 2의 Role 기반(RBAC)을 포함해 공식 문서가 제시하는 인가 모델 3단계:

1. **RBAC** — 사용자가 가진 **역할**(enum)과 라우트의 요구 역할 매칭. 위 패턴 2.
2. **Claims 기반** — 역할 대신 **퍼미션**(주체가 무엇을 할 수 있는지의 name-value 클레임)을 비교. 구조는 RBAC와 동일하고 `@RequirePermissions(Permission.CREATE_CAT)`처럼 퍼미션 enum으로 바뀔 뿐.
3. **정책 기반 (CASL)** — 역할/퍼미션 보유가 아니라 **주체가 특정 리소스 인스턴스에 특정 액션을 할 수 있는가**를 규칙으로 판정. `CaslAbilityFactory.createForUser(user)`가 유저별 Ability를 만들고(`can(Action.Update, Article, { authorId: user.id })`처럼 인스턴스 속성 조건 가능, `manage`는 모든 액션을 뜻하는 CASL 예약어), 가드는 policy handler로 `ability.can(action, resource)`를 검사한다. 소유자만 수정, 게시된 글은 삭제 불가 같은 세밀한 규칙이 역할 매칭으로는 안 될 때 넘어간다.

## 출처
- [NestJS — Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS — Authorization](https://docs.nestjs.com/security/authorization)
- [NestJS — Rate Limiting](https://docs.nestjs.com/security/rate-limiting)
- [NestJS — Passport](https://docs.nestjs.com/recipes/passport)
