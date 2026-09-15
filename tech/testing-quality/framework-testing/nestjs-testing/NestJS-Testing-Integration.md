---
tags: [nestjs, testing, jest, integration-test, mock]
status: done
verified_at: 2026-09-12
category: "테스트&품질(Testing&Quality)"
aliases: ["NestJS Testing", "TestingModule", "Test.createTestingModule"]
---

# NestJS Testing: 통합 테스트

## 통합 테스트 — in-memory DB

```ts
beforeAll(async () => {
  app = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'sqlite',
        database: ':memory:',
        entities: [User, Profile],
        synchronize: true,
      }),
      TypeOrmModule.forFeature([User]),
    ],
    providers: [UserService],
  }).compile();
});
```

대안:
- **Testcontainers** — 실제 PostgreSQL/MySQL/Redis 컨테이너를 테스트 시작 시 띄움. 운영 DB와 동일한 동작.
- **트랜잭션 롤백** — 테스트마다 트랜잭션 시작 → 끝나면 롤백. fixture 누적 방지. 단, 테스트 대상 코드까지 하나의 트랜잭션으로 감싸므로 **커밋 시점 제약, 트랜잭션 전파를 실제로 검증하지 못한다**. 단순 Repository 격리에는 유효하지만, Service 레이어 통합 테스트에서는 마스킹 위험이 있어 TRUNCATE 기반 정리를 권장 (→ [[Transactional-Test-Antipattern|@Transactional 테스트 안티패턴]]).
- **DB 클린업** — `beforeEach`에서 truncate.

SQLite in-memory는 빠르지만 운영 DB와 SQL 방언 차이가 있어 **PostgreSQL/MySQL 특정 기능**(JSONB, 격리수준) 테스트엔 부적합하다. SQLite도 3.8.3부터 CTE를 지원하므로 CTE 자체를 미지원 예로 들지는 않는다.

## 트랜잭션 롤백 검증

아래 예제는 서비스가 같은 트랜잭션의 manager로 User를 저장한 뒤 `profileWriter.create(manager, user)`를 호출하는 구조다. 테스트 전에 두 테이블을 비우고, `userRepo`와 `profileRepo`는 서비스 트랜잭션 밖에서 조회한다.

```ts
it('rolls back a saved user when profile creation fails', async () => {
  const writeProfile = jest.spyOn(profileWriter, 'create').mockImplementationOnce(async (manager, user) => {
    expect(await manager.count(User, { where: { id: user.id } })).toBe(1);
    throw new Error('profile write failed');
  });
  await expect(userService.createUserWithProfile(validData)).rejects.toThrow('profile write failed');
  expect(writeProfile).toHaveBeenCalledTimes(1);
  expect(await Promise.all([userRepo.count(), profileRepo.count()])).toEqual([0, 0]);
});
```

첫 저장이 실제로 반영된 것을 트랜잭션 안에서 확인한 뒤 후속 작업에 지정한 오류를 발생시켜 롤백을 검증한다. 잘못된 입력으로 첫 저장 전에 실패하는 테스트는 트랜잭션 없이도 통과할 수 있다. 서비스의 모든 DB 작업은 전달받은 transactional manager로 실행하고, 테스트 자체를 별도 롤백 트랜잭션으로 감싸지 않는다. 스파이는 `afterEach`에서 `jest.restoreAllMocks()`로 복구한다.

## 외부 서비스 모킹, 스파이

```ts
it('handles email failure gracefully', async () => {
  const emailService = app.get(EmailService);
  jest.spyOn(emailService, 'sendWelcomeEmail').mockRejectedValue(new Error('SMTP'));

  const user = await userService.createUser(validData);
  expect(user).toBeDefined();
  expect(emailService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
});
```

`spyOn`은 실제 인스턴스 메서드를 가로챔 → 호출 횟수, 인자 추적 가능. 외부 의존성 실패 케이스를 안전하게 시뮬레이션.

## Guard/Interceptor/Filter 교체

```ts
const module = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideGuard(JwtAuthGuard)
  .useValue({ canActivate: () => true })
  .overrideProvider(ConfigService)
  .useValue({ get: jest.fn().mockReturnValue('test-value') })
  .compile();
```

전역 Guard를 모든 테스트에서 통과시키거나 — 도메인 로직만 테스트하려는 의도.

**APP_GUARD로 등록한 전역 enhancer는 useExisting 트릭 필요**: `{ provide: APP_GUARD, useClass: JwtAuthGuard }`로 등록하면 테스트에서 교체가 안 된다. `{ provide: APP_GUARD, useExisting: JwtAuthGuard }`로 바꾸고 `JwtAuthGuard`를 일반 프로바이더로도 등록해 두면 Nest에 보이는 일반 프로바이더가 되어 `overrideProvider(JwtAuthGuard).useClass(MockAuthGuard)`로 교체된다. pipe, interceptor, filter의 APP_* 토큰도 동일.

## 출처
- [NestJS — Testing](https://docs.nestjs.com/fundamentals/testing)
- [TypeORM, Transactions](https://typeorm.io/docs/transactions/)
- [SQLite, Release History](https://sqlite.org/changes.html)
