---
tags: [architecture, design-pattern, creational, singleton]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Singleton Pattern", "싱글턴 패턴"]
---

# Singleton 패턴이란?

Singleton은 정해진 범위에서 클래스의 인스턴스 생성을 하나로 제한하고 그 인스턴스에 접근하는 방법을 제공하는 생성 패턴이다. 하나라는 범위가 프로세스, 모듈 그래프 또는 DI 애플리케이션 컨텍스트 중 무엇인지 먼저 정의해야 한다.

## TypeScript 구현

```typescript
class ProcessRegistry {
  private static instance?: ProcessRegistry

  private constructor() {}

  static getInstance(): ProcessRegistry {
    return ProcessRegistry.instance ??= new ProcessRegistry()
  }
}
```

이 구현은 현재 JavaScript Realm과 로드된 클래스 사본 안에서만 하나다. Worker, Cluster 프로세스, 컨테이너와 Pod가 여러 개면 각각 별도 인스턴스가 생긴다. 중복 모듈 경로도 별도 캐시 항목이 될 수 있다.

`private constructor`가 막는 범위는 TypeScript 타입 검사다. 컴파일된 JavaScript를 쓰는 호출자, `as unknown as new () => ProcessRegistry` 같은 단언을 거친 코드와 인스턴스의 `constructor` 속성은 두 번째 인스턴스를 만들 수 있다. JavaScript에는 비공개 생성자가 없고 `#constructor`는 문법 오류이므로, 실행 시점에도 막아야 하면 비공개 static 플래그를 두고 `getInstance()` 밖에서 호출된 생성자가 `TypeError`를 던지게 한다. 접근 제어자의 보호 시점은 [[TS-Class-Type-System|TypeScript 클래스 타입 시스템]]에서 다룬다.

`private constructor`는 상속도 막는다. 하위 클래스로 Singleton을 바꿀 여지를 두려면 `protected constructor`를 쓰고, 하위 클래스별 인스턴스를 어디에 보관할지(예제 코드 `singleton.mts`의 `SingletonRegistry` 같은 레지스트리)를 따로 정한다.

정적 메서드의 `this`는 호출 형태로 정해진다. `const { getInstance } = ProcessRegistry`처럼 떼어 내 호출하거나, `thisArg` 없는 `Array.prototype.map`이나 Promise `then`처럼 `this` 없이 호출하는 콜백으로 넘기면 클래스 본문이 strict mode라서 `this`가 `undefined`가 되고, `this.instance`로 쓴 구현은 `TypeError`를 던진다. EventEmitter 리스너나 타이머 콜백처럼 호출하는 쪽이 `this`를 정하면 오류 없이 그 객체(EventEmitter 인스턴스, 브라우저의 전역 객체, Node.js 26.7.0 기준 `Timeout` 객체)에 인스턴스를 새로 만들어 저장하므로 Singleton이 조용히 깨진다. 위 코드가 `this` 대신 클래스 이름을 쓰는 이유다.

## 생성 시점: 미리 생성과 지연 생성

위 `getInstance()`는 첫 호출에서 인스턴스를 만드는 지연 생성이다. 클래스나 모듈을 평가할 때 미리 만들 수도 있다.

- 미리 생성: `static readonly instance = new ProcessRegistry()` 같은 static 필드 초기화식은 클래스 정의가 평가될 때 실행된다. 클래스는 export하지 않고 모듈 최상위에서 `export const registry = new Registry()`로 만든 값은 모듈이 평가될 때 만들어진다. 이 방식은 생성자가 공개된 클래스를 전제하므로, 위 `ProcessRegistry`처럼 `private constructor`를 둔 클래스는 static 필드 초기화식으로 미리 만든다. 쓰지 않아도 생성 비용을 치르고, 생성자가 던진 예외는 그 모듈을 import하는 쪽의 실패로 나타난다. ESM 모듈 레코드는 평가 오류를 기록해 두므로 같은 모듈을 다시 import해도 생성을 재시도하지 않고 같은 오류를 던진다. 반면 CommonJS 모듈을 `require`로 불러오다 평가 중 예외가 나면 그 모듈이 `require` 캐시에서 빠지므로 다음 `require`가 모듈을 다시 평가해 생성을 재시도한다(Node.js 26.7.0 기준).
- 지연 생성: 생성 비용과 실패가 첫 `getInstance()` 호출로 미뤄진다. 생성자가 예외를 던지면 `??=` 대입이 일어나지 않으므로 다음 호출이 생성을 다시 시도한다.

생성 과정에 `await`가 없으면 지연 생성의 확인과 대입 사이에 다른 작업이 끼어들지 않는다. JavaScript는 작업 하나를 끝까지 실행한 뒤 다음 작업을 처리하고 실행 중인 함수는 선점되지 않으므로, 런타임이 실행 중인 스레드를 아무 지점에서나 선점해 다른 스레드의 코드를 끼워 넣을 수 있는 언어처럼 잠금을 둘 필요가 없다.

생성 과정에 `await`가 끼면 이 보장이 사라진다. `await` 뒤에 완성된 인스턴스를 필드에 저장하면 첫 호출이 기다리는 동안 들어온 호출도 빈 필드를 보고 생성을 한 번 더 시작한다. 완성된 인스턴스 대신 생성 중인 Promise를 먼저 보관하면 동시 호출자가 같은 Promise를 기다리고, 실패하면 보관한 Promise를 비워 다음 호출이 다시 시도한다. 동시 호출을 진행 중인 Promise 하나로 합치는 부분은 [[Cache-Stampede|Single-Flight]]와 같다. Single-Flight는 완료 뒤 진행 중 항목을 지우지만, 여기서는 성공한 Promise를 지우지 않고 인스턴스 캐시로 계속 쓰며 실패했을 때만 비운다.

```typescript
interface Settings {
  readonly region: string
}

declare const fetchSettings: () => Promise<Settings>

class SettingsStore {
  private static pending?: Promise<SettingsStore>

  private constructor(readonly settings: Settings) {}

  /**
   * 첫 호출에서 설정을 읽고, 완료 전의 동시 호출에도 같은 Promise를 반환한다.
   * @returns 현재 Realm에서 공유되는 SettingsStore
   */
  static getInstance(): Promise<SettingsStore> {
    SettingsStore.pending ??= fetchSettings()
      .then((settings) => new SettingsStore(settings))
      .catch((error: unknown) => {
        // 실패한 Promise를 비워 다음 호출이 다시 시도하게 한다
        SettingsStore.pending = undefined
        throw error
      })
    return SettingsStore.pending
  }
}
```

## NestJS에서는 Provider 수명으로 관리한다

NestJS Provider의 기본 Scope는 애플리케이션 전체에서 공유되는 `DEFAULT`다. 대부분은 정적 `getInstance()`보다 Provider를 생성자 주입해 수명과 대체 가능성을 컨테이너에 맡기는 편이 낫다.

```typescript
@Injectable()
class CurrencyTable {}
```

이 역시 Nest 애플리케이션 컨텍스트마다 하나다. 같은 클래스나 토큰을 서로 다른 컨텍스트에서 만들거나 여러 프로세스를 실행하면 전역 단일 인스턴스가 아니다.

모듈 그래프에 정적으로 등록된 기본 Scope Provider는 애플리케이션 부트스트랩이 끝나면 인스턴스화돼 있으므로 미리 생성에 해당한다(`LazyModuleLoader`로 나중에 불러오는 모듈의 Provider는 불러올 때 만들어진다). 비동기 초기화가 필요하면 Promise를 반환하는 `useFactory`로 async provider를 등록한다. Nest는 그 Promise가 이행된 뒤에 이를 주입받는 클래스를 만든다. 부팅 지연과 지연 로딩의 선택은 [[NestJS-Cold-Start-Optimization|NestJS 콜드 스타트 최적화]]를 참고한다.

## 언제 경계해야 하는가

- 사용자별 인증 정보나 요청 상태를 공유 인스턴스의 가변 필드에 저장하면 데이터가 섞인다.
- 전역 접근점은 의존성을 숨겨 테스트 순서 의존과 초기화 경쟁을 만든다.
- DB 연결은 인스턴스 하나가 아니라 제한된 여러 연결을 관리하는 Pool인 경우가 일반적이다.
- 캐시와 이벤트 버스가 프로세스마다 분리돼도 되는지 운영 토폴로지에서 확인한다.

프로세스 간 하나의 소유권이 필요하면 DB의 유일성 제약, 분산 Lock, Leader Election 같은 분산 조정 문제로 다뤄야 한다. Singleton 객체만으로 해결되지 않는다.

## 출처

- 얄팍한 코딩사전, [Singleton 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=242682)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 9. Singleton](https://www.youtube.com/watch?v=70zEzNF1NHU)
- [NestJS 공식 문서, Injection scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
- [NestJS 공식 문서, Asynchronous providers](https://docs.nestjs.com/fundamentals/async-providers)
- [NestJS 공식 문서, Lazy-loading modules](https://docs.nestjs.com/fundamentals/lazy-loading-modules)
- [Node.js 공식 문서, CommonJS module caching](https://nodejs.org/api/modules.html#caching)
- [Node.js v26.7.0 CommonJS 로더 소스 — nodejs/node](https://github.com/nodejs/node/blob/v26.7.0/lib/internal/modules/cjs/loader.js#L1446-L1452)
- [Node.js 공식 문서, Events](https://nodejs.org/api/events.html#passing-arguments-and-this-to-listeners)
- [WHATWG HTML 표준, Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
- [TypeScript 공식 문서, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript 2.0 릴리스 노트 — TypeScript 공식 문서](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html)
- [MDN, Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)
- [MDN, Private elements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements)
- [MDN, JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [ECMAScript 명세, InnerModuleEvaluation](https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-innermoduleevaluation)
- yongsoocho, [TypeScript로 구현하는 Singleton](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=149243)

## 관련 문서

- [[Connection-Pool|Connection Pool]]
- [[Object-Design-Principles|객체 설계 원칙과 리팩터링]]
- [[Flyweight패턴이란|Flyweight 패턴]]
