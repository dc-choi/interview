---
tags: [nestjs, guard, authn, authz, execution-context]
status: done
verified_at: 2026-09-30
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
    if (!token) throw new UnauthorizedException();

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request['user'] = payload;   // 다음 단계(Pipe, Handler)에서 사용
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

`canActivate()`가 `false`를 반환하면 Nest가 기본으로 403을 던진다. 누락되거나 유효하지 않은 자격 증명에는 위처럼 `UnauthorizedException`으로 401을 명시한다.

`request.user` 주입 → 핸들러에서 `@CurrentUser()` 같은 Param Decorator로 추출.

`JwtService`는 `@nestjs/jwt`(JWT 생성, 검증 유틸 패키지) 소속 — `JwtModule.register({ global: true, secret, signOptions: { expiresIn: '60s' } })`로 등록하면 모듈마다 import할 필요가 없다. 토큰 발급은 `jwtService.signAsync({ sub: user.userId, username })`처럼 JWT 표준 sub 클레임에 사용자 식별자를 싣는 것이 공식 컨벤션.

### Passport 통합 계약 (@nestjs/passport)

- 전략은 `PassportStrategy(Strategy)` 믹스인을 상속 — 전략 옵션은 `super()`로 넘기고, Passport의 verify 콜백 자리를 **`validate()` 메서드**가 대신한다. validate의 반환값이 `request.user`로 들어가고, null/false 계열이면 Nest가 거부한다.
- 라우트 보호와 인증 개시 둘 다 **내장 `AuthGuard('전략명')` 팩토리** — 보호 라우트엔 `AuthGuard('jwt')`, 로그인 라우트엔 `AuthGuard('local')`(가드가 전략을 호출해 자격 검증과 user 부착까지 수행). 에러 처리 커스터마이징은 AuthGuard 상속 + 메서드 오버라이드.
- **전략은 request-scoped 불가** — passport가 전략을 라이브러리 전역 인스턴스에 등록하는 구조라 요청별 인스턴스화가 성립하지 않는다. 요청 의존 로직이 필요하면 전략(싱글턴) 안에서 `ModuleRef.resolve(..., contextId)`로 request-scoped 프로바이더를 꺼내는 우회를 쓴다.

### 패턴 1-1: JWT를 HttpOnly 쿠키로 운반할 때

Authorization 헤더 대신 HttpOnly 쿠키로 JWT를 주고받으면 발급, 추출, 폐기가 서로 다른 계층에 놓인다.

**발급(로그인)**: 서비스는 자격 증명 검증과 서명을 하고 `{ jwt, user }` 같은 값만 반환한다. 두 책임을 함께 한다면 이름에 드러낸다(`verifyUserAndSignJwt(dto)`). 쿠키 설정은 controller가 맡는다. 서비스가 response 객체를 직접 다루면 단위 테스트가 response를 흉내 내야 하고 결과를 값으로 검증하기 어렵다. controller는 `@Res({ passthrough: true }) res`로 받아 `res.cookie('jwt', jwt, { httpOnly: true, secure: true, sameSite: 'lax' })`를 호출하고 user를 반환한다. passthrough 없이 `@Res()`만 쓰면 Nest의 표준 응답 처리가 꺼진다([[NestJS-Middleware]]). 로그인 POST는 리소스를 만들지 않으므로 `@HttpCode(200)`을 붙이고(POST 기본값은 201), 응답 user의 password는 `@Exclude()`와 `ClassSerializerInterceptor`로 뺀다([[NestJS-Serialization]]). E2E 검증 순서는 [[NestJS-Testing-E2E-and-Scope#쿠키 인증 흐름 E2E|쿠키 인증 흐름 E2E]]에 있다.

**추출(보호 라우트)**:

```ts
const cookieExtractor = (req: Request): string | null => req?.cookies?.jwt ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly users: UsersRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string }) {
    return this.users.findOne(payload.sub); // null이면 Nest가 401로 거부
  }
}
```

- `jwtFromRequest`는 요청에서 토큰 문자열이나 `null`을 돌려주는 함수다. `fromExtractors`는 배열 순서대로 시도해 처음 나온 토큰을 쓴다. 서명 키는 발급 쪽과 같은 소스에서 읽는다([[NestJS-Configuration#process.env 직접 참조가 실패하는 두 가지 이유|설정 평가 시점]]).
- `req.cookies`는 cookie-parser가 먼저 실행돼야 채워진다. 등록이 빠지면 쿠키가 있어도 추출 결과가 `null`이라 401이 난다.
- 로그인 사용자만 통과시키는 차단은 Guard(`AuthGuard('jwt')`나 커스텀 Guard)가 맡는다. Interceptor로 차단하는 구현도 보이지만 인증 실패는 Guard 단계에서 끊는 편이 요청 수명주기와 맞는다.

**폐기(로그아웃)**: controller에서 `res.clearCookie('jwt', options)`로 지운다. 브라우저는 option이 `res.cookie()` 때와 같아야 쿠키를 지우므로 path와 domain을 발급 때와 맞춘다(Express 5 문서 기준 `expires`와 `maxAge`는 무시된다). 쿠키 삭제는 브라우저 사본만 지울 뿐 이미 서명된 JWT는 만료 전까지 유효하다. 강제 폐기가 필요하면 [[JWT]]의 `jti` denylist나 token version 정책을 연결한다.

쿠키는 자동 전송되므로 [[CSRF]] 방어와 `Secure`, `SameSite`를 함께 둔다. `SameSite` 값은 프런트엔드가 API와 같은 site인지에 따라 정한다. 프런트엔드가 다른 origin이면 [[CORS]]의 credentials 조건(구체 origin, `Access-Control-Allow-Credentials: true`)이 필요하다.

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
- **getAll**: 핸들러와 클래스의 메타데이터 값을 배열로 반환. 배열이나 객체를 병합하려면 `getAllAndMerge`를 사용.

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
- **프록시 뒤에서는 HTTP 어댑터의 trust proxy 설정 확인** — 원본 IP를 쓰려면 Express는 `app.set('trust proxy', ...)`, Fastify는 해당 어댑터 옵션을 설정한다.
- **스토리지** — 기본 인메모리 storage는 인스턴스별로 따로 계산한다. 여러 인스턴스가 하나의 전역 한도를 공유해야 하면 `storage` 옵션에 공유 `ThrottlerStorage` 구현체를 연결한다.
- WebSocket은 `ThrottlerGuard`를 확장해 `handleRequest()`를 재정의하며, `APP_GUARD`나 `app.useGlobalGuards()`로 등록할 수 없다. GraphQL은 `getRequestResponse()`를 재정의해 요청과 응답을 추출한다.

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
- [NestJS — Controllers](https://docs.nestjs.com/controllers) (POST 기본 201과 `@HttpCode`, `@Res({ passthrough: true })`)
- [passport-jwt — README](https://github.com/mikenicholson/passport-jwt) (`jwtFromRequest`, `fromExtractors`, cookie extractor)
- [Express 5.x API — res.clearCookie](https://expressjs.com/en/5x/api/response/)
- [인프런, 윤상석, 보일러플레이트 코드 리뷰 및 테스팅 소개](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=95951)
- [인프런, 윤상석, 보일러플레이트 코드 업데이트 보충](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=96478)
- [인프런, 윤상석, TDD 소개 및 통합 테스팅](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=95952)
