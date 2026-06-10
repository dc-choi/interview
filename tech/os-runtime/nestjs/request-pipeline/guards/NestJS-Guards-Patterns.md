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
