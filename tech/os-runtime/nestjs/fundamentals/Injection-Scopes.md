---
tags: [runtime, nestjs]
status: done
category: "OS & Runtime"
aliases: ["Injection Scopes"]
---

## Injection-Scopes
다른 프로그래밍 언어를 사용하는 개발자에게는 Nest에서 거의 모든 것이 수신 요청에 걸쳐 공유된다는 사실이 놀랍게 느껴질 수 있습니다.

여기에는 데이터베이스 연결 풀, 전역 상태를 가진 싱글톤 서비스 등과 같은 리소스가 포함됩니다.

Node.js는 각 요청이 별도의 스레드에서 처리되는 request/response Multi-Threaded Stateless Model을 사용하지 않는다는 점을 이해하는 것이 중요합니다.

따라서 Nest에서 싱글톤 인스턴스를 사용하는 것은 애플리케이션에 완전히 안전합니다.

하지만 컨트롤러에 요청 기반 수명을 설정해야 하는 특정 사례가 있을 수 있습니다.

예를 들어 GraphQL 애플리케이션의 요청별 캐싱, 요청 추적 또는 멀티테넌시 구현 등이 있습니다.

Injection-Scope는 원하는 Provider 수명 동작을 얻기 위한 메커니즘을 제공합니다.

### Provider Scope

| Scope     | Description                                                                                                                           |
|-----------|---------------------------------------------------------------------------------------------------------------------------------------|
| DEFAULT   | 단일 인스턴스가 전체 애플리케이션에서 공유됩니다.<br/>인스턴스 수명은 애플리케이션 수명 주기와 직접 연결됩니다.<br/>애플리케이션이 시작되면 모든 싱글톤 Provider는 인스턴스화됩니다.<br/>싱글톤 범위는 기본적으로 사용됩니다. |
| REQUEST   | 각 수신 요청에 대해 Provider의 새 인스턴스가 독점적으로 생성됩니다.<br/> 요청 처리가 완료된 후 인스턴스가 garbage-collected 됩니다.                                             |
| TRANSIENT | Transient Provider는 소비자 간에 공유되지 않습니다.<br/>Transient Provider를 삽입하는 각 소비자는 새로운 전용 인스턴스를 받게 됩니다.                                        |

대부분의 사용 사례에서는 싱글톤 범위를 사용하는 것이 좋습니다.

소비자 및 요청 간에 공급자를 공유하면 인스턴스가 캐시될 수 있고 애플리케이션 시작 시 한 번만 초기화가 이루어집니다.

### 스코프 선언과 제약

- `@Injectable({ scope: Scope.REQUEST })`, 커스텀 프로바이더는 long-hand 등록에 `scope` 프로퍼티. 컨트롤러도 `@Controller({ path: 'cats', scope: Scope.REQUEST })`로 요청마다 새 인스턴스가 된다.
- Websocket Gateway는 실제 소켓을 캡슐화해 싱글턴이어야 하므로 request-scoped 불가 — Passport strategy, Cron 컨트롤러도 같은 제약.

### 스코프 계층 — 버블링

- REQUEST 스코프는 주입 체인을 따라 위로 전파된다. `Controller ← Service(REQUEST) ← Repository`면 Service를 주입받는 Controller도 request-scoped가 되고, Service에 의존하지 않는 Repository는 싱글턴 유지.
- TRANSIENT는 전파되지 않는다. 싱글턴 서비스가 transient Logger를 주입받으면 Logger의 전용 인스턴스를 받을 뿐 서비스 자신은 싱글턴 그대로 — 서비스까지 매번 새로 원하면 서비스에도 TRANSIENT를 명시해야 한다.

### 컨텍스트 토큰 — REQUEST, CONTEXT, INQUIRER

- request-scoped 프로바이더에서 원본 요청 객체는 `@Inject(REQUEST)`(@nestjs/core)로 주입받는다. REQUEST 프로바이더는 본질적으로 request-scoped라 스코프 명시가 불필요하고, 명시해도 무시된다.
- GraphQL 앱은 REQUEST 대신 `@Inject(CONTEXT)`(@nestjs/graphql) — GraphQLModule의 context에 request를 담아 두고 꺼낸다.
- `@Inject(INQUIRER)`(@nestjs/core)는 자신이 인스턴스화된 부모 클래스를 준다 — 로깅, 메트릭 프로바이더가 호출자 클래스명을 찍는 용도로 보통 TRANSIENT와 결합.

### 성능

- request-scoped는 요청마다 인스턴스를 생성하므로 평균 응답 시간이 느려진다. 잘 설계된 앱 기준 지연 증가는 ~5% 내외라는 게 공식 가이드의 추정. 꼭 필요한 경우가 아니면 싱글턴 유지가 강력 권장.

### Durable Providers — 멀티테넌시에서 전염 차단

- 문제: 대부분의 컴포넌트가 의존하는 공용 프로바이더(테넌트별 data source 등)를 request-scoped로 만들면 의존하는 쪽 전부가 request-scoped로 전염된다 — 병렬 3만 요청이면 컨트롤러 인스턴스도 3만 개.
- 해결: 프로바이더가 요청 고유 값(요청 UUID)이 아니라 그룹핑 가능한 속성(테넌트 ID)에만 의존한다면, 요청마다 DI 트리를 재생성하는 대신 **테넌트별 DI 서브트리를 재사용**한다.
- 구성: `ContextIdStrategy#attach`에서 요청 헤더의 테넌트 ID를 서브트리 ContextId에 매핑하고, `ContextIdFactory.apply(strategy)`를 요청을 받기 전에 전역 등록, 프로바이더는 `@Injectable({ scope: Scope.REQUEST, durable: true })`. durability도 REQUEST처럼 주입 체인을 따라 버블링된다.
- attach가 payload를 반환하면 REQUEST/CONTEXT 주입값이 원본 요청 대신 그 객체(`{ tenantId }` 등)가 된다.
- 한계: 테넌트 수가 아주 많은 앱에는 부적합 (서브트리가 테넌트 수만큼 상주).

### AsyncLocalStorage — REQUEST 스코프의 또 다른 대안

Node의 `AsyncLocalStorage`(async_hooks 기반, 타 언어의 thread-local 대응)는 함수 인자로 명시 전달하지 않고 **비동기 콜체인 전체에 상태를 전파**한다. 요청 수명 어딘가(미들웨어, 가드)에서 `als.run(store, () => next())`로 나머지 처리를 감싸면, 그 콜체인 안 어디서든 `als.getStore()`로 요청 고유 상태에 접근한다 — **프로바이더는 전부 싱글턴을 유지하면서** 요청별 컨텍스트를 얻으므로 REQUEST 스코프의 전염, 인스턴스화 비용이 없다. 트랜잭션 객체처럼 시스템 일부에만 컨텍스트를 흘리는 용도로도 쓴다. Nest 내장 추상화는 없고, 커뮤니티 **nestjs-cls** 패키지가 이 패턴을 감싼다.

## 관련 문서
- [[Provider]]
- [[Controller]]
- [[Module-reference|모듈 참조 (스코프 프로바이더 resolve, DI 서브트리)]]

## 출처
- [NestJS — Injection scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
- [NestJS — Async Local Storage](https://docs.nestjs.com/recipes/async-local-storage)
