---
tags: [nestjs, testing, jest, integration-test, mock]
status: done
verified_at: 2026-09-12
category: "테스트&품질(Testing&Quality)"
aliases: ["NestJS Testing", "TestingModule", "Test.createTestingModule"]
---

# NestJS Testing: E2E와 테스트 범위

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

실제 HTTP 입구부터 응답까지 태운다. 단 `createNestApplication`이 재현하는 것은 **모듈에 등록한 미들웨어와 `APP_GUARD`, `APP_PIPE`, `APP_FILTER` 같은 프로바이더로 등록한 enhancer**까지다. `main.ts`에서 `useGlobalPipes`, `useGlobalFilters`, `setGlobalPrefix`로만 붙인 전역 설정은 `TestingModule`이 자동으로 재현하지 않아, 프로덕션에서만 걸리는 검증이나 prefix를 테스트가 놓친다. 프로덕션과 테스트가 같은 HTTP 설정 함수를 호출하게 하는 패턴은 [[HTTP-API-Integration-Testing|HTTP API 통합 테스트]] 참조.

## Request-scoped Provider 테스트

request-scoped 인스턴스는 요청마다 생성되고 응답 후 GC라, 테스트 코드가 해당 요청의 DI 서브트리에 접근할 수 없다. contextId를 미리 만들어 **모든 요청이 그 서브트리를 쓰도록 고정**한다.

```ts
const contextId = ContextIdFactory.create();
jest.spyOn(ContextIdFactory, 'getByRequest').mockImplementation(() => contextId);

// 이후 요청이 만든 request-scoped 인스턴스에 접근 가능
catsService = await moduleRef.resolve(CatsService, contextId);
```

## 동적 모듈 중복 인스턴스 스텁 (v11)

v11부터 동적 모듈이 딥 해시로 중복 제거되지 않아(객체 참조 동일성), `forFeature([User])` 같은 호출을 여러 모듈에서 하면 TestingModule 안에 **같은 의존성 인스턴스가 여러 개** 생긴다. 스텁했는데 실제 코드가 다른 인스턴스를 쓰면 안 먹는다. 대응 4가지:

- 프로덕션 코드에서 동적 모듈을 변수로 공유해 중복 자체를 제거
- `module.select(TargetModule).get(Target, { strict: true })` — Target을 직접 등록한 모듈에서 조회. `get()`의 기본값은 `strict: false`이므로 `select()`만 호출하면 전역 조회가 유지된다. 동적 모듈이면 등록할 때 사용한 동일한 동적 모듈 객체를 `select()`에 전달한다.
- `module.get(Target, { each: true })` — 모든 인스턴스를 배열로 받아 전부 스텁
- `Test.createTestingModule({...}, { moduleIdGeneratorAlgorithm: 'deep-hash' })` — 그 테스트만 구(v10) 알고리즘으로 회귀

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

- [[HTTP-API-Integration-Testing|HTTP API 통합 테스트]]
- [[NestJS|NestJS 개요]]
- [[Module-reference|Module Reference (resolve, ContextIdFactory)]]
- [[Test-Pyramid|테스트 피라미드]]
- [[Mock-Testing-Strategy|Mock 전략]]
- [[Service-Layer-Testing|서비스 레이어 테스팅]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[Transactional-Test-Antipattern|@Transactional 테스트 안티패턴]]

## 출처
- [NestJS — Testing](https://docs.nestjs.com/fundamentals/testing)
- [Suites — TestBed (sociable)](https://suites.dev/docs/api-reference/testbed-sociable/)
- [TypeORM, Transactions](https://typeorm.io/docs/transactions/)
- [NestJS — NestApplicationContextOptions](https://github.com/nestjs/nest/blob/master/packages/common/interfaces/nest-application-context-options.interface.ts)
- [SQLite, Release History](https://sqlite.org/changes.html)
