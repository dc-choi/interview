---
tags: [runtime, nestjs]
status: done
category: "OS & Runtime"
aliases: ["Module reference", "ModuleRef"]
---

# Module Reference — ModuleRef

`ModuleRef`(@nestjs/core)는 DI 컨테이너의 프로바이더 목록을 탐색해 **주입 토큰으로 인스턴스를 조회**하고, 정적/스코프 프로바이더를 **동적으로 인스턴스화**하는 클래스다. 일반 프로바이더처럼 생성자로 주입받는다.

## get() — 정적 프로바이더 조회

```ts
onModuleInit() {
  this.service = this.moduleRef.get(Service);
}
```

- **현재 모듈**에 등록되고 이미 인스턴스화된 프로바이더, 컨트롤러, injectable(가드, 인터셉터 등)을 토큰으로 반환. 없으면 예외.
- 다른 모듈에 있는 프로바이더는 `{ strict: false }` 옵션으로 전역 컨텍스트에서 검색.
- **transient, request-scoped 프로바이더는 get() 불가** — resolve()를 써야 한다.

## resolve() — 스코프 프로바이더와 DI 서브트리

```ts
const a = await this.moduleRef.resolve(TransientService);
const b = await this.moduleRef.resolve(TransientService);
// a !== b — 호출마다 별도 DI 서브트리에서 유니크 인스턴스
```

- resolve()는 전용 **DI 컨테이너 서브트리**에서 인스턴스를 생성하며, 서브트리마다 고유 **context identifier**를 갖는다. 그래서 반복 호출하면 매번 다른 인스턴스.
- 여러 resolve() 호출이 **같은 인스턴스**를 공유하려면 `ContextIdFactory.create()`로 만든 contextId를 각 호출에 넘겨 같은 서브트리를 쓰게 한다.
- 수동 생성한 contextId의 서브트리는 Nest DI가 관리하지 않으므로 **REQUEST 프로바이더가 undefined** — 필요하면 `moduleRef.registerRequestByContextId(requestObj, contextId)`로 커스텀 REQUEST 객체를 등록한다.

## 요청 컨텍스트 안에서 resolve — getByRequest

요청 처리 중에 request-scoped 프로바이더를 resolve할 때 새 contextId를 만들면 **현재 요청과 다른 서브트리**가 생긴다. 같은 요청의 서브트리를 공유하려면 현재 식별자를 얻어야 한다.

```ts
constructor(@Inject(REQUEST) private request: Record<string, unknown>) {}

async some() {
  const contextId = ContextIdFactory.getByRequest(this.request);
  const repo = await this.moduleRef.resolve(CatsRepository, contextId);
}
```

## create() — 미등록 클래스 인스턴스화

```ts
this.catsFactory = await this.moduleRef.create(CatsFactory);
```

프로바이더로 **등록된 적 없는 클래스**를 동적으로 인스턴스화한다 — 프레임워크 컨테이너 밖에서 조건부로 다른 클래스를 골라 만들 때.

## 스탠드얼론 앱 — createApplicationContext

`NestFactory.createApplicationContext(AppModule)`은 **네트워크 리스너 없는 IoC 컨테이너 래퍼** — CRON 스크립트, CLI를 Nest DI 위에 세운다.

- `app.get(Token)`은 등록된 **모든 모듈을 검색**하는 쿼리. 엄격한 컨텍스트 체크는 `app.select(TasksModule).get(TasksService, { strict: true })`로 특정 모듈 서브그래프에서만 조회.
- 스크립트가 끝나면 **`app.close()`를 반드시 호출** — 안 하면 프로세스가 종료되지 않는다 ([[NestJS-Lifecycle|app.close() 시맨틱]]).
- 같은 축의 디버깅 도구로 **REPL 모드**가 있다 — `repl(AppModule)`(@nestjs/core)로 띄우면 터미널에서 의존성 그래프를 검사하고 프로바이더/컨트롤러 메서드를 직접 호출한다 (`get()`, scoped용 `resolve()`, 메서드 목록 `methods()`, 전체 모듈 트리 `debug()`).
- 본격 CLI 앱은 **nest-commander**(서드파티)가 공식 추천 경로 — `@Command()` 클래스 구조로 커맨드를 정의하고 `CommandFactory.run(AppModule)`이 createApplicationContext 자리를 대신한다.

## 관련 문서

- [[Injection-Scopes|Injection Scopes (스코프 3종, 버블링, durable providers)]]
- [[NestJS-Circular-Dependency-ForwardRef-ModuleRef|순환 의존성에서 ModuleRef 우회 활용]]
- [[Custom-Provider|Custom Provider (토큰, useFactory)]]

## 출처
- [NestJS — Module reference](https://docs.nestjs.com/fundamentals/module-ref)
- [NestJS — Standalone applications](https://docs.nestjs.com/standalone-applications)
- [NestJS — REPL](https://docs.nestjs.com/recipes/repl)
- [NestJS — Nest Commander](https://docs.nestjs.com/recipes/nest-commander)
