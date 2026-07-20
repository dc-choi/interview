---
tags: [nestjs, performance, cold-start, dependency, serverless]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Cold Start", "콜드 스타트 최적화"]
---

# NestJS Cold Start 최적화

NestJS 앱의 **부팅 시간**은 의존성 그래프 구조에 크게 좌우된다. 서버리스(Lambda), 컨테이너 재시작, 오토스케일링 환경에서 Cold Start가 사용자 첫 응답 지연으로 이어지므로, **모듈, 의존성 설계를 성능 관점에서 재고**할 필요가 있다.

## Cold Start가 문제인 이유

- **서버리스 (AWS Lambda, Cloud Functions)**: 컨테이너가 죽어 있다 새로 뜰 때마다 부팅. 드문 호출일수록 빈번 → 첫 응답 수백 ms~수 초 지연
- **오토스케일링**: 트래픽 폭증 시 새 Pod, 인스턴스 기동 지연 = 장애 회복 속도 저하
- **배포 시 롤링 업데이트**: 재배포마다 모든 인스턴스가 새 부팅

NestJS는 Express, Fastify 자체 부팅 + **DI 컨테이너 구성** + 모듈별 `onModuleInit` 훅 실행 → 프레임워크 없는 Node.js보다 Cold Start가 큼.

## 주 원인: 의존성 그래프 과도한 결합

모듈, 컨트롤러, 프로바이더가 **직렬로 의존**하면 NestJS가 순차 해석 → 부팅 느림.

전형적 안티패턴:
- 하나의 거대 Controller가 **모든 도메인** Use Case를 주입 (User, Post, Comment, Follow 다)
- 유틸, 라이브러리 모듈을 **모든 곳에 `imports`** → 중복 인스턴스, 순차 로딩
- Global Module 남발 → 암묵적 의존 추적 어려움

## 측정 방법

### 1. Bootstrap 시간 로깅
```ts
const start = Date.now();
const app = await NestFactory.create(AppModule);
await app.listen(3000);
console.log(`Bootstrap: ${Date.now() - start}ms`);
```

### 2. 모듈별 초기화 시간
`Logger.verbose` 레벨 켜고 NestJS 기본 로그에서 모듈, 의존성 해석 시간 관찰:
```
[Nest] InstanceLoader  UserModule dependencies initialized +15ms
[Nest] InstanceLoader  PostModule dependencies initialized +8ms
```

### 3. APM, 프로파일러
- `clinic.js`, `0x`로 flame graph 생성
- `node --prof`, `--cpu-prof`로 CPU 분석
- 반복되는 `require()` 비용 측정 (`require.cache`)

### 4. Nest Devtools Bootstrap performance
`NestFactory.create(..., { snapshot: true })`로 그래프 메타데이터를 수집하면 Devtools의 Bootstrap performance 페이지에서 **클래스 노드(컨트롤러, 프로바이더, 인핸서)별 인스턴스화 시간**을 나열해 부팅에서 느린 지점을 짚을 수 있다 (DevtoolsModule은 개발 환경 전용).

## 최적화 전략

### 1. 도메인 단위 Controller 분리
한 Controller에 Use Case 5개 이상 주입되면 분리 신호.

```ts
// ❌ 과도한 의존
@Controller('users')
export class UserController {
  constructor(
    private userUseCase: UserUseCase,
    private postUseCase: PostUseCase,      // ← 별개 도메인
    private followUseCase: FollowUseCase,
    private commentUseCase: CommentUseCase,
  ) {}
}

// ✅ 분리
@Controller('users')   export class UserController { ... }
@Controller('posts')   export class PostController { ... }
@Controller('follows') export class FollowController { ... }
```

효과: 각 Controller가 자기 의존만 해석 → 모듈 간 **병렬 초기화** 가능.

### 2. imports 최소화
Module의 `imports` 배열에 **실제로 쓰는 모듈만**. 안 쓰는 모듈이 Import되면 전체 의존 트리 확산.

### 3. Lazy Module
드물게 쓰는 기능은 `LazyModuleLoader`로 지연 로딩:
```ts
constructor(private lazyModuleLoader: LazyModuleLoader) {}

async rarelyUsedFeature() {
  const { SomeModule } = await import('./some.module');
  const moduleRef = await this.lazyModuleLoader.load(() => SomeModule);
  // 이 시점에 SomeModule 초기화
}
```

관리자 전용, 외부 연동 같은 희소 기능에 적합. 평상시 부팅 시간 감축. 입력(라우트, 날짜, 쿼리)에 따라 다른 로직을 태우는 worker, cron, lambda, webhook이 대표 케이스고, 부팅 시간이 덜 중요한 모놀리스엔 실익이 적다.

제약 (공식):
- **생명주기 훅 미호출** — lazy 로드된 모듈과 서비스에서는 lifecycle hook이 호출되지 않는다.
- **컨트롤러, 리졸버, 게이트웨이는 lazy 불가** — 라우트/토픽 집합이라 런타임 등록이 안 된다. Fastify는 listen 후 라우트 추가 불가, 마이크로서비스 전송층(Kafka, gRPC, RabbitMQ)은 연결 수립 전에 구독해야 하며, GraphQL code first는 스키마 생성에 전체 클래스 선로드가 필요. `MiddlewareConsumer` 미들웨어도 on-demand 등록 불가.
- **Global 등록 불가** — 정적 모듈이 모두 인스턴스화된 뒤에야 등록되므로 lazy 모듈의 global 등록은 의미가 없고, global enhancer(가드, 인터셉터)도 제대로 동작하지 않는다.
- **첫 load() 후 캐시** — 같은 모듈 재로드는 캐시된 인스턴스를 반환해 매우 빠르며, lazy 모듈도 eager 모듈과 같은 모듈 그래프를 공유한다. `load()`가 반환하는 module reference에서 `moduleRef.get(LazyService)`로 프로바이더를 꺼낸다.

### 4. 가벼운 대안 프로바이더
- 무거운 초기화가 필요한 프로바이더는 **`useFactory` + 지연 생성**
- 외부 SDK(Firebase, GraphQL client)는 첫 사용 시 초기화로 지연

### 5. Tree-Shaking과 번들 크기
- `@nestjs/cli` 빌드 대신 **esbuild, webpack**으로 번들링
- CLI 안에서 해결하려면 **SWC 빌더**가 공식 권장 — 기본 tsc 컴파일러보다 10배 빠르다는 공식 수치. nest build는 tsc/swc(standard 모드) 또는 webpack+ts-loader(monorepo 모드)의 얇은 래퍼로, **tsconfig-paths 처리 외엔 컴파일 단계를 추가하지 않는다** — 표준 TS 빌드 파이프라인이라 외부 도구로 통째로 대체해도 무방하다는 공식 입장.
- SWC 전환 시 함정 3가지: (1) **SWC는 타입 체크를 안 한다** — `--type-check`(또는 nest-cli.json `typeCheck: true`)가 tsc를 noEmit으로 병행 실행해 비동기 체크. (2) **GraphQL/Swagger CLI 플러그인은 --type-check가 있어야 실행**되고(직렬화 메타데이터 파일 생성 → 런타임 로드), 모노레포의 swc-loader에선 자동 로드가 안 돼 수동 generator 파일이 필요. (3) **순환 import에 약하다** — TypeORM 엔티티 상호 참조는 `Relation<Profile>` 래퍼 타입으로 감싸 리플렉션 메타데이터에 타입 저장을 막는 워크어라운드가 공식 가이드.
- 서버리스라면 단일 JS 파일로 최소화
- 불필요한 polyfill, legacy API 제거

### 6. 의존성 버전 관리
- 큰 라이브러리 중복 버전(예: rxjs 6, 7 공존) 제거
- `npm ls <package>`로 중복 확인
- peer dependency 정리

## 실측 예시

한 프로젝트에서 Controller 분리만으로:
- **before**: 단일 UserController가 4개 도메인 의존 → 235ms
- **after**: 4개 Controller로 분리 → 197ms
- **16% 개선**

모듈 그래프가 깊어질수록 효과 커짐.

## 서버리스 특화 팁

### 공식 부팅 벤치마크 — 번들링이 결정 변수

같은 스타터 앱 기준 (공식 문서 측정, MacBook Pro 2014):

| 구성 | 미번들 | webpack 단일 번들(node_modules 포함) |
|------|--------|-------------------------------------|
| Nest + platform-express | ~197ms | ~81.5ms |
| Nest standalone (리스너 없음) | ~112ms | ~32ms |
| raw Node 스크립트 | ~7ms | ~7ms |

- **컴파일과 번들 방식이 부팅 시간의 결정 변수** — 번들만으로 절반 이하. 10개 리소스 규모 앱은 번들 후에도 ~130ms로, 앱이 클수록 부팅이 늘어난다 (모놀리스를 통째로 서버리스에 올리는 것 자체가 비권장인 이유).
- 번들 시 Nest 내부의 옵션 모듈(microservices, websockets)의 lazy import는 webpack `IgnorePlugin`으로 무시 처리해야 깨지지 않는다.
- **warm invocation 캐시**: 부팅 결과(server 핸들러)를 핸들러 함수 밖 변수에 담아 재사용 — cold start에만 bootstrap이 돌게 하는 표준 패턴.

### Provisioned Concurrency
- AWS Lambda Provisioned Concurrency: 미리 N개 인스턴스 워밍
- 비용 들지만 Cold Start 거의 0

### SnapStart (Java 중심, Node는 제한적)
- AWS Lambda SnapStart로 초기화 상태 스냅샷
- Java는 공식 지원, Node.js는 2025 기준 제한적

### 앱 분할
- 거대 NestJS 앱을 **기능별 Lambda**로 쪼개기
- 각 Lambda는 해당 도메인만 로딩 → Cold Start 감소
- 대신 공유 코드 관리, 배포 복잡도 증가

## 흔한 실수

- **모든 공용 모듈을 Global로** → 의존 추적 불가, 최적화 여지 증발
- **순환 의존** (`forwardRef()` 남발) → 부팅 단계 복잡화
- **onModuleInit에 무거운 작업** (외부 API 호출, DB 풀 warmup) → 필요하면 `onApplicationBootstrap` 또는 첫 요청 시점으로 지연
- **Cold Start 측정 없이 "빠를 거다" 가정** → 실측 기반 의사결정 필수

## 면접 체크포인트

- Cold Start가 서버리스, 오토스케일링에서 사용자 경험에 미치는 영향
- NestJS에서 의존성 그래프가 부팅 시간에 영향을 주는 메커니즘
- 거대 Controller를 분리해 얻는 병렬 초기화 효과
- Lazy Module이 적합한 상황
- Global Module 남발의 함정
- Provisioned Concurrency vs 앱 분할 트레이드오프

## 출처
- [velog @miinhho — NestJS 의존성 최적화를 통한 Cold Start 성능 개선](https://velog.io/@miinhho/NestJS-%EC%9D%98%EC%A1%B4%EC%84%B1-%EC%B5%9C%EC%A0%81%ED%99%94%EB%A5%BC-%ED%86%B5%ED%95%9C-Cold-Start-%EC%84%B1%EB%8A%A5-%EA%B0%9C%EC%84%A0)
- [NestJS — Lazy loading modules](https://docs.nestjs.com/fundamentals/lazy-loading-modules)
- [NestJS — CLI overview](https://docs.nestjs.com/cli/overview)
- [NestJS — CLI and scripts](https://docs.nestjs.com/cli/scripts)
- [NestJS — SWC](https://docs.nestjs.com/recipes/swc)
- [NestJS — Serverless (FAQ)](https://docs.nestjs.com/faq/serverless)
- [NestJS — Devtools overview](https://docs.nestjs.com/devtools/overview)

## 관련 문서
- [[Module-reference|Module Reference (load()가 반환하는 ModuleRef)]]
- [[NestJS|NestJS 개요]]
- [[NestJS-vs-Spring|NestJS vs Spring (Cold Start 비교)]]
- [[Clean-Architecture-NestJS|Clean Architecture with NestJS]]
- [[AWS-Lambda|AWS Lambda, Cold Start]]
- [[Nodejs-Production-Readiness|Node.js 프로덕션 체크리스트]]
