---
tags: [nestjs, testing, jest, integration-test, mock]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["NestJS Testing", "TestingModule", "Test.createTestingModule"]
---

# NestJS Testing

`@nestjs/testing`은 실제 모듈과 동일한 DI 컨테이너 위에서 격리된 테스트 환경을 만든다. **단위 테스트(Provider 단독)부터 통합 테스트(전체 모듈 트리 + 실제 DB)까지** 같은 API로 처리.

## TestingModule — 핵심 빌더

```ts
const module = await Test.createTestingModule({
  imports: [TypeOrmModule.forRoot({...}), TypeOrmModule.forFeature([User])],
  providers: [UserService],
}).compile();

const userService = module.get<UserService>(UserService);
const userRepo = module.get<Repository<User>>(getRepositoryToken(User));
```

`Test.createTestingModule` 인자는 실제 `@Module()`과 동일한 구조. 차이는 **override 메서드**로 Provider/Guard/Interceptor 교체 가능.

## 테스트 레벨

| 레벨 | 의도 | DB | 외부 호출 |
|------|------|-----|----------|
| **단위** | Provider 1개 동작 | 모킹 | 모킹 |
| **통합** | 모듈 트리 + 트랜잭션, SQL | 실제 (in-memory or testcontainers) | 모킹 |
| **E2E** | HTTP 입구부터 응답까지 | 실제 | 일부 실제 |

## 단위 테스트 — Provider 모킹

```ts
const module = await Test.createTestingModule({
  providers: [
    UserService,
    { provide: getRepositoryToken(User), useValue: { findOne: jest.fn(), save: jest.fn() } },
    { provide: EmailService, useValue: { sendWelcome: jest.fn() } },
  ],
}).compile();
```

핵심: 의존 Provider 모두를 **`useValue`로 mock 객체**로 교체. 실제 클래스 인스턴스화 없이 메서드 시그니처만 만족.

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
- **트랜잭션 롤백** — 테스트마다 트랜잭션 시작 → 끝나면 롤백. fixture 누적 방지.
- **DB 클린업** — `beforeEach`에서 truncate.

SQLite in-memory는 빠르지만 운영 DB와 SQL 방언 차이가 있어 **PostgreSQL/MySQL 특정 기능**(JSONB, CTE, 격리수준) 테스트엔 부적합.

## 트랜잭션 롤백 검증

```ts
it('rolls back on validation failure', async () => {
  await expect(userService.createUserWithProfile(invalidData)).rejects.toThrow();
  expect(await userRepo.count()).toBe(0);
});
```

서비스가 `@Transactional` 데코레이터 또는 `EntityManager.transaction(...)`을 제대로 썼는지 검증. 트랜잭션 안 걸어두면 부분 commit으로 count > 0이 되어 실패.

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

## E2E — Supertest

```ts
const app = module.createNestApplication();
await app.init();

await request(app.getHttpServer())
  .post('/users')
  .send(validData)
  .expect(201)
  .expect(res => expect(res.body.email).toBe(validData.email));
```

실제 HTTP 입구부터 응답까지. 미들웨어, Guard, Pipe, Filter 모두 통과.

## 흔한 실수

- **Mock으로만 테스트 + 통합 테스트 부재**: mock이 실제와 다르게 동작해 운영에서 깨짐. 핵심 시나리오는 통합 테스트로 검증.
- **SQLite로 PG/MySQL 특화 기능 테스트**: SQL 방언 차이로 false negative/positive. Testcontainers 권장.
- **테스트 간 상태 공유**: `beforeAll`로 한 번만 setup → 한 테스트가 다음 테스트 깨뜨림. `beforeEach` 격리 또는 트랜잭션 롤백.
- **시간 의존 테스트에 `Date.now()` 그대로 사용**: 불안정. `jest.useFakeTimers()` 또는 시간 주입.
- **`spyOn`만 쓰고 `mockRestore` 안 함**: 다음 테스트에 spy가 남아 영향. `afterEach`에서 `jest.restoreAllMocks()`.
- **Guard 모킹 후 인가 깨진 코드를 못 잡음**: 인가 흐름은 별도로 정상 Guard로 테스트.

## 면접 체크포인트

- TestingModule이 실제 모듈과 같은 DI를 사용하는 의미 — 단위와 통합이 같은 API
- 단위 vs 통합 vs E2E 트레이드오프 — 속도, 격리도, 신뢰도
- in-memory SQLite의 한계 — 운영 DB 방언 차이
- 트랜잭션 롤백 검증 — 부분 commit 발견 패턴
- `overrideGuard` / `overrideProvider`로 인프라 교체
- `spyOn` + `mockRestore`로 사이드이펙트 격리
- `getRepositoryToken(Entity)`로 Repository 주입 받기

## 관련 문서

- [[NestJS|NestJS 개요]]
- [[Test-Pyramid|테스트 피라미드]]
- [[Mock-Testing-Strategy|Mock 전략]]
- [[Service-Layer-Testing|서비스 레이어 테스팅]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[Transactional-Test-Antipattern|@Transactional 테스트 안티패턴]]
