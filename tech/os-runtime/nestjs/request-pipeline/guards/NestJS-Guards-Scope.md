---
tags: [nestjs, guard, authn, authz, execution-context]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Guard 적용 범위", "Guard 체인과 단락 평가"]
---

# NestJS Guards — 체인, 적용 범위, 예외 처리

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

## throw vs return false

- `return false` → NestJS가 자동으로 `ForbiddenException` (403)
- `throw new UnauthorizedException()` → 401 + 커스텀 메시지

인증 실패는 401, 인가 실패는 403으로 명시적으로 던지는 게 표준.
