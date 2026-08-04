---
tags: [runtime, nestjs, di, module, pipeline]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["NestJS Core Concepts", "NestJS 핵심 개념"]
---

# NestJS 핵심 개념 (DI, 모듈, 파이프라인, 클린 아키텍처)

[[NestJS|NestJS Overview]]에서 분리한 핵심 개념 요약. 각 주제의 딥다이브는 본문 링크와 하위 폴더 인덱스 참조.

## DI (Dependency Injection)

### IoC 컨테이너
- NestJS가 Provider의 **생성, 주입, 생명주기**를 관리
- `@Injectable()` 데코레이터로 Provider 등록 → constructor에서 **타입 기반 자동 주입**
- 개발자는 의존성을 직접 생성하지 않고, 컨테이너에 무엇이 필요한지만 선언

### Provider 등록 방식

| 종류 | 등록 방식 | 용도 |
|------|----------|------|
| **Class** | `UserService` (단축) / `{ provide: UserService, useClass: ... }` | 기본 — 클래스 인스턴스 |
| **Value** | `{ provide: 'API_KEY', useValue: process.env.KEY }` | 상수, 설정, 외부 객체 |
| **Factory** | `{ provide: TOKEN, useFactory: (deps) => ..., inject: [...] }` | 런타임에 생성 결정, 다른 Provider 의존 |
| **Existing (Alias)** | `{ provide: 'USER_SERVICE', useExisting: UserService }` | 같은 인스턴스에 다른 토큰 별칭 |

비동기 초기화는 별도 provider 종류가 아니라 Promise를 반환하는 factory로 표현한다. Nest는 dependent provider를 만들기 전에 그 Promise가 완료되기를 기다린다.

문자열, Symbol 토큰 Provider는 `@Inject(TOKEN)`으로 명시적 주입. 클래스 토큰은 타입만으로 자동 해결. 딥다이브: [[Custom-Provider|Custom Provider, DI Deep Dive]]

### DI 컨테이너 내부 동작

```text
1. TypeScript가 legacy decorator와 함께 constructor parameter의 제한된 design metadata를 emit한다.
2. 부트스트랩에서 Nest가 module metadata와 provider token을 수집한다.
3. container가 module visibility를 지키며 token을 해석하고 instance를 생성한다.
4. constructor에 해석된 dependency를 주입하고 scope에 맞춰 instance를 보관한다.
```

`emitDecoratorMetadata: true`, legacy decorators와 `reflect-metadata`가 class token 추론의 기반이다. metadata에는 runtime constructor가 남는 class만 표현할 수 있다. interface, type alias와 generic type argument는 emit에서 사라지므로 string/Symbol token과 `@Inject(TOKEN)`을 사용한다. custom token이 `design:paramtypes`에 문자열로 들어간다고 이해하면 안 된다.

### Provider Scope

| Scope | 생명주기 | 사용 시점 |
|-------|---------|----------|
| **DEFAULT** | 싱글톤 (앱 전체에서 1개) | 대부분의 경우. 상태를 갖지 않는 서비스 |
| **REQUEST** | 요청마다 새 인스턴스 | 테넌트별 컨텍스트, 요청별 상태가 필요할 때 |
| **TRANSIENT** | 주입마다 새 인스턴스 | 주입받는 곳마다 독립 인스턴스가 필요할 때 |

- REQUEST/TRANSIENT scope는 **성능 비용**이 있으므로 필요한 경우에만 사용
- REQUEST scope Provider를 주입받으면 주입하는 쪽도 REQUEST scope가 됨 (scope 전파)
- 상세: [[Injection-Scopes|Injection Scopes]]

## Controller, route와 DTO

`@Controller()`와 method decorator는 HTTP method와 path metadata를 class/method에 붙이고 platform adapter가 이를 runtime route로 등록한다. TypeScript return type이나 parameter type만으로 요청 payload가 검증되지는 않는다.

DTO는 runtime에서 class constructor가 남도록 class로 선언한다. interface와 type alias는 소거되므로 `ValidationPipe`가 검사할 metadata가 없다. `class-validator` decorator를 사용한다면 application bootstrap에서 pipe를 실제로 활성화해야 한다.

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  transform: true,
}));
```

`whitelist`는 validation decorator가 없는 property를 제거하고, 거부가 필요하면 `forbidNonWhitelisted`를 함께 검토한다. `transform`은 payload를 DTO class instance나 primitive parameter type으로 변환할 수 있지만 business invariant 검증을 대신하지 않는다.

## 모듈 시스템

- `@Module()` 데코레이터로 관련 Provider/Controller를 논리적 단위로 묶음
- `imports`: 다른 모듈의 exported Provider를 가져옴
- `exports`: 이 모듈의 Provider를 외부에 공개
- `providers`: 이 모듈 내부에서 사용할 Provider
- `controllers`: 이 모듈의 HTTP 엔드포인트
- **캡슐화가 기본**: 현재 모듈의 Provider이거나 import한 모듈이 export한 Provider만 주입할 수 있다. exports 배열이 곧 모듈의 공개 인터페이스다.
- **모듈은 기본 싱글턴**: export된 Provider는 import하는 모든 모듈이 같은 인스턴스를 공유한다. 같은 Service를 모듈마다 providers에 중복 등록하면 모듈별로 인스턴스가 분리돼 메모리가 늘고 내부 상태가 어긋난다 — 공유는 재등록이 아니라 export와 import로 한다.
- **re-export**: import한 모듈을 exports에 그대로 실어 묶음으로 재공개할 수 있다(공통 모듈 번들).
- **@Global()**: 모듈을 전역 스코프로 만들어 import 없이 어디서나 주입되게 한다(루트나 코어 모듈에서 한 번만 등록). DB 연결, 헬퍼처럼 정말 전역인 것에 한정하고, 기본은 imports의 명시적 공개가 결합을 통제해 구조와 유지보수에 낫다.
- 모듈 클래스 자체도 Provider를 주입받을 수 있지만(설정 용도), 모듈 클래스를 Provider로 주입할 수는 없다(순환 의존).
- **순환 참조**: `forwardRef()`로 해결 가능하지만, 근본적으로는 모듈 의존 방향을 **단방향**으로 설계하는 것이 중요 — 상세: [[NestJS-Circular-Dependency|순환 의존성 해결 전략]]

## 요청 처리 파이프라인

```
Request → Middleware → Guard → Interceptor(pre) → Pipe → Handler → Interceptor(post) → Response
```

| 계층 | 역할 | 반환 |
|------|------|------|
| **Middleware** | 요청 전처리 (Express 호환, 로깅, CORS) | `next()` 호출 |
| **Guard** | 인가/인증 체크 | `true/false` (false면 403) |
| **Interceptor** | 요청, 응답 양쪽 변환 (로깅, 캐싱, 응답 포맷) | `Observable` |
| **Pipe** | 데이터 변환/유효성 검증 | 변환된 값 or 예외 |
| **ExceptionFilter** | 예외를 HTTP 응답으로 변환 | 에러 응답 |

단계별 상세는 [[request-pipeline|요청 파이프라인 인덱스]] 참조.

## 클린 아키텍처 적용

```
Controller (Interface Adapters)
  → UseCase (Application Core)
    → DomainService (핵심 비즈니스)
      → Repository Port → TypeORM Repository adapter (External Infrastructure)
```

- UseCase별로 사용자 의도를 분리 (JSON 응답용 vs 엑셀 다운로드용)
- 핵심 비즈니스 로직이 변경되어도 UseCase별 영향 최소화
- 고객사별 커스텀 요구를 UseCase 레벨에서만 분기해서 해결
- Prisma 예제는 generated client와 CLI 동작을 구분하고 현재 TypeORM 기준으로 번역 — [[ORM|ORM과 NestJS 영속성 선택]]

자세한 NestJS 매핑(포트 인터페이스, Symbol 토큰, 테스트 교체 전략): [[Clean-Architecture-NestJS|NestJS Clean Architecture 실전]]

## Spring과의 비교

NestJS는 Spring, Angular의 설계를 TypeScript/Node.js로 옮긴 계보. DI, 모듈, 데코레이터 구조는 1:1에 가깝게 매핑되지만, 런타임 모델(이벤트 루프 vs 스레드), 트랜잭션 표준 부재, 생태계 성숙도에서 차이가 있다.

상세 비교: [[NestJS-vs-Spring|NestJS vs Spring (DI, 모듈, 데코레이터, AOP vs Guard/Pipe/Interceptor, 트랜잭션, 생태계)]]

## 출처
- [NestJS — Controllers](https://docs.nestjs.com/controllers)
- [NestJS — Providers](https://docs.nestjs.com/providers)
- [NestJS — Modules](https://docs.nestjs.com/modules)
- [NestJS — Validation](https://docs.nestjs.com/techniques/validation)
- [NestJS — Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)
- yongsoocho, [NestJS 프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137159)
- yongsoocho, [Module과 Container](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=140851)
- yongsoocho, [Decorator route mapping](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=140849)
- yongsoocho, [의존성 주입](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=140858)
- yongsoocho, [Decorator와 DTO](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=140860)
- 김빌 강사, [Node와 NestJS 특징](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273667), [NestJS 기본 구조](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273668), [Controller와 Service](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273673), [예상 아키텍처](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273688)
