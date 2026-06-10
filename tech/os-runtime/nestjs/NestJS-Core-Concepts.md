---
tags: [runtime, nestjs, di, module, pipeline]
status: done
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

### Provider 종류 (5가지)

| 종류 | 등록 방식 | 용도 |
|------|----------|------|
| **Class** | `UserService` (단축) / `{ provide: UserService, useClass: ... }` | 기본 — 클래스 인스턴스 |
| **Value** | `{ provide: 'API_KEY', useValue: process.env.KEY }` | 상수, 설정, 외부 객체 |
| **Factory** | `{ provide: TOKEN, useFactory: (deps) => ..., inject: [...] }` | 런타임에 생성 결정, 다른 Provider 의존 |
| **Existing (Alias)** | `{ provide: 'USER_SERVICE', useExisting: UserService }` | 같은 인스턴스에 다른 토큰 별칭 |
| **Async** | `useFactory: async () => ...` | 외부 호출, 비동기 초기화 (DB 연결, 원격 설정) |

문자열, Symbol 토큰 Provider는 `@Inject(TOKEN)`으로 명시적 주입. 클래스 토큰은 타입만으로 자동 해결. 딥다이브: [[Custom-Provider|Custom Provider, DI Deep Dive]]

### DI 컨테이너 내부 동작

```
1. 컴파일 타임 — TypeScript가 reflect-metadata로 파라미터 타입 메타데이터 생성
   (Reflect.getMetadata('design:paramtypes', SomeService) → [UserService, 'CUSTOM_TOKEN', ...])
2. 런타임 — NestFactory가 모듈 트리 스캔 → @Injectable 마커 + 메타데이터 수집
3. 의존성 그래프 구축 — Provider 토큰별 노드 + 주입 엣지
4. 순환 참조 검사 — 그래프에 사이클 있으면 forwardRef 없이는 throw
5. 위상 정렬 → 순서대로 인스턴스화 (의존받는 쪽이 먼저)
6. constructor 호출 시 그래프에서 해결된 인스턴스 주입
```

`tsconfig`의 `emitDecoratorMetadata: true` + `reflect-metadata` 폴리필이 1단계의 전제. 둘 중 하나라도 빠지면 자동 주입 안 됨 → 모든 Provider에 명시 토큰 필요. 클래스 토큰을 타입만으로 자동 해결할 수 있는 것은 컴파일러가 파라미터 타입을 메타데이터로 emit해주기 때문.

### Provider Scope

| Scope | 생명주기 | 사용 시점 |
|-------|---------|----------|
| **DEFAULT** | 싱글톤 (앱 전체에서 1개) | 대부분의 경우. 상태를 갖지 않는 서비스 |
| **REQUEST** | 요청마다 새 인스턴스 | 테넌트별 컨텍스트, 요청별 상태가 필요할 때 |
| **TRANSIENT** | 주입마다 새 인스턴스 | 주입받는 곳마다 독립 인스턴스가 필요할 때 |

- REQUEST/TRANSIENT scope는 **성능 비용**이 있으므로 필요한 경우에만 사용
- REQUEST scope Provider를 주입받으면 주입하는 쪽도 REQUEST scope가 됨 (scope 전파)
- 상세: [[Injection-Scopes|Injection Scopes]]

## 모듈 시스템

- `@Module()` 데코레이터로 관련 Provider/Controller를 논리적 단위로 묶음
- `imports`: 다른 모듈의 exported Provider를 가져옴
- `exports`: 이 모듈의 Provider를 외부에 공개
- `providers`: 이 모듈 내부에서 사용할 Provider
- `controllers`: 이 모듈의 HTTP 엔드포인트
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
      → Repository Interface → Prisma Client (External Infrastructure)
```

- UseCase별로 사용자 의도를 분리 (JSON 응답용 vs 엑셀 다운로드용)
- 핵심 비즈니스 로직이 변경되어도 UseCase별 영향 최소화
- 고객사별 커스텀 요구를 UseCase 레벨에서만 분기해서 해결

자세한 NestJS 매핑(포트 인터페이스, Symbol 토큰, 테스트 교체 전략): [[Clean-Architecture-NestJS|NestJS Clean Architecture 실전]]

## Spring과의 비교

NestJS는 Spring, Angular의 설계를 TypeScript/Node.js로 옮긴 계보. DI, 모듈, 데코레이터 구조는 1:1에 가깝게 매핑되지만, 런타임 모델(이벤트 루프 vs 스레드), 트랜잭션 표준 부재, 생태계 성숙도에서 차이가 있다.

상세 비교: [[NestJS-vs-Spring|NestJS vs Spring (DI, 모듈, 데코레이터, AOP vs Guard/Pipe/Interceptor, 트랜잭션, 생태계)]]
