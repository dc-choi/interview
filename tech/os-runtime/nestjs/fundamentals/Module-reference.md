---
tags: [runtime, nestjs]
status: done
verified_at: 2026-10-02
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
- 스크립트가 끝나면 `app.close()`를 호출해 리소스를 정리한다. 열린 핸들이 있으면 호출하지 않을 때 프로세스 종료가 지연될 수 있다 ([[NestJS-Lifecycle|app.close() 시맨틱]]).
- 같은 축의 디버깅 도구로 **REPL 모드**가 있다 — `repl(AppModule)`(@nestjs/core)로 띄우면 터미널에서 의존성 그래프를 검사하고 프로바이더/컨트롤러 메서드를 직접 호출한다 (`get()`, scoped용 `resolve()`, 메서드 목록 `methods()`, 전체 모듈 트리 `debug()`).
- 본격 CLI 앱은 **nest-commander**(서드파티)가 공식 추천 경로 — `@Command()` 클래스 구조로 커맨드를 정의하고 `CommandFactory.run(AppModule)`이 createApplicationContext 자리를 대신한다.

provider/controller를 `app.get()`/REPL로 꺼내 직접 호출하면 HTTP의 guard, pipe, interceptor와 filter pipeline을 통과하지 않는다. DI가 준비됐다는 사실과 endpoint의 인증/validation을 시험한 사실을 구분한다. dynamic module을 strict select할 때는 imports에 넘긴 것과 **같은 DynamicModule 객체**를 사용한다.

REPL history는 watch 재시작 사이에 저장할 수 있으므로 token이나 개인정보를 직접 명령에 넣지 않는다. `get()`은 singleton 조회, `resolve()`는 scoped instance 조회다. `nest-commander`의 `CommandRunner.run(params, options)`은 Promise<void> 계약이고 option parser의 반환값이 options에 들어간다. `CommandFactory`는 기본 종료를 관리하지만 남은 background handle의 수명도 정리한다.

## 여러 등록과 strict 조회의 계약

`INestApplicationContext.get/resolve`의 `each: true`는 같은 토큰으로 등록된 인스턴스를 배열로 반환한다. 같은 이름의 provider가 여러 module에 존재하면 단일 `get()`으로 임의의 한 등록을 골라 전체 등록을 시험했다고 판단하지 않는다. `select(module).get(token, { strict: true })`로 소유 module을 한정하거나 `each: true`로 실제 등록을 모두 확인한다.

정적 class를 선택하는 것과 `register()`가 반환한 dynamic module 객체를 선택하는 것은 다르다. 등록 때의 객체를 변수로 보존해 imports와 select에서 재사용한다. 공식 standalone sample도 이 객체를 공유하며, 컨테이너를 닫아 열린 resource를 정리한다. `resolve(token, contextId, { each: true })`에서도 같은 contextId를 유지해야 같은 요청의 DI 상태를 비교할 수 있다.

## 관련 문서

- [[Injection-Scopes|Injection Scopes (스코프 3종, 버블링, durable providers)]]
- [[NestJS-Circular-Dependency-ForwardRef-ModuleRef|순환 의존성에서 ModuleRef 우회 활용]]
- [[Custom-Provider|Custom Provider (토큰, useFactory)]]

## 출처
- [NestJS — Module reference](https://docs.nestjs.com/fundamentals/module-ref)
- [NestJS — Standalone applications](https://docs.nestjs.com/standalone-applications)
- [NestJS — REPL](https://docs.nestjs.com/recipes/repl)
- [NestJS — Nest Commander](https://docs.nestjs.com/recipes/nest-commander)
- [NestJS API, INestApplicationContext](https://api-references-nestjs.netlify.app/api/common/INestApplicationContext)
- [NestJS sample, application context](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/18-context/src/main.ts)
