---
tags: [nestjs, testing, jest, integration-test, mock]
status: done
verified_at: 2026-09-12
category: "테스트&품질(Testing&Quality)"
aliases: ["NestJS Testing", "TestingModule", "Test.createTestingModule"]
---

# NestJS Testing: TestingModule과 단위 테스트

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

**useMocker — 미지정 의존성 자동 mock**: 의존이 많으면 `.useMocker(token => ...)`를 체인해 providers에 안 넣은 의존성 전부에 mock 팩토리를 적용한다 (jest-mock의 ModuleMocker나 @golevelup/ts-jest의 createMock을 팩토리로). 만들어진 mock도 `moduleRef.get(Token)`으로 꺼낸다. 단 REQUEST, INQUIRER 프로바이더는 컨텍스트에 사전 정의돼 auto-mock 불가 — `overrideProvider`로 교체한다.

**Suites — 컨테이너 없는 자동 mock 단위 테스트**: 오픈소스 Suites(구 Automock)는 TestingModule 없이 클래스 생성자 메타데이터를 읽어 **타입 있는 mock을 전 의존성에 자동 생성**한다 — `TestBed.solitary(UserService).compile()`이면 전부 mock(격리), `TestBed.sociable(UserService).expose(UserValidator).compile()`이면 테스트 대상은 UserService이고 UserValidator 의존성은 실제 구현으로 유지한다. DI 컨테이너를 안 띄우므로 useMocker 방식보다 셋업이 가볍고, 집중 단위 테스트에 적합하다.

## 출처
- [NestJS — Testing](https://docs.nestjs.com/fundamentals/testing)
- [Suites — TestBed (sociable)](https://suites.dev/docs/api-reference/testbed-sociable/)
