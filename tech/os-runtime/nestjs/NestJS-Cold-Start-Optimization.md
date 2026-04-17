---
tags: [nestjs, performance, cold-start, dependency, serverless]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Cold Start", "콜드 스타트 최적화"]
---

# NestJS Cold Start 최적화

NestJS 앱의 **부팅 시간**은 의존성 그래프 구조에 크게 좌우된다. 서버리스(Lambda)·컨테이너 재시작·오토스케일링 환경에서 Cold Start가 사용자 첫 응답 지연으로 이어지므로, **모듈·의존성 설계를 성능 관점에서 재고**할 필요가 있다.

## Cold Start가 문제인 이유

- **서버리스 (AWS Lambda·Cloud Functions)**: 컨테이너가 죽어 있다 새로 뜰 때마다 부팅. 드문 호출일수록 빈번 → 첫 응답 수백 ms~수 초 지연
- **오토스케일링**: 트래픽 폭증 시 새 Pod·인스턴스 기동 지연 = 장애 회복 속도 저하
- **배포 시 롤링 업데이트**: 재배포마다 모든 인스턴스가 새 부팅

NestJS는 Express·Fastify 자체 부팅 + **DI 컨테이너 구성** + 모듈별 `onModuleInit` 훅 실행 → 프레임워크 없는 Node.js보다 Cold Start가 큼.

## 주 원인: 의존성 그래프 과도한 결합

모듈·컨트롤러·프로바이더가 **직렬로 의존**하면 NestJS가 순차 해석 → 부팅 느림.

전형적 안티패턴:
- 하나의 거대 Controller가 **모든 도메인** Use Case를 주입 (User·Post·Comment·Follow 다)
- 유틸·라이브러리 모듈을 **모든 곳에 `imports`** → 중복 인스턴스·순차 로딩
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
`Logger.verbose` 레벨 켜고 NestJS 기본 로그에서 모듈·의존성 해석 시간 관찰:
```
[Nest] InstanceLoader  UserModule dependencies initialized +15ms
[Nest] InstanceLoader  PostModule dependencies initialized +8ms
```

### 3. APM·프로파일러
- `clinic.js`, `0x`로 flame graph 생성
- `node --prof`·`--cpu-prof`로 CPU 분석
- 반복되는 `require()` 비용 측정 (`require.cache`)

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

관리자 전용·외부 연동 같은 희소 기능에 적합. 평상시 부팅 시간 감축.

### 4. 가벼운 대안 프로바이더
- 무거운 초기화가 필요한 프로바이더는 **`useFactory` + 지연 생성**
- 외부 SDK(Firebase·GraphQL client)는 첫 사용 시 초기화로 지연

### 5. Tree-Shaking과 번들 크기
- `@nestjs/cli` 빌드 대신 **esbuild·webpack**으로 번들링
- 서버리스라면 단일 JS 파일로 최소화
- 불필요한 polyfill·legacy API 제거

### 6. 의존성 버전 관리
- 큰 라이브러리 중복 버전(예: rxjs 6·7 공존) 제거
- `npm ls <package>`로 중복 확인
- peer dependency 정리

## 실측 예시

한 프로젝트에서 Controller 분리만으로:
- **before**: 단일 UserController가 4개 도메인 의존 → 235ms
- **after**: 4개 Controller로 분리 → 197ms
- **16% 개선**

모듈 그래프가 깊어질수록 효과 커짐.

## 서버리스 특화 팁

### Provisioned Concurrency
- AWS Lambda Provisioned Concurrency: 미리 N개 인스턴스 워밍
- 비용 들지만 Cold Start 거의 0

### SnapStart (Java 중심, Node는 제한적)
- AWS Lambda SnapStart로 초기화 상태 스냅샷
- Java는 공식 지원, Node.js는 2025 기준 제한적

### 앱 분할
- 거대 NestJS 앱을 **기능별 Lambda**로 쪼개기
- 각 Lambda는 해당 도메인만 로딩 → Cold Start 감소
- 대신 공유 코드 관리·배포 복잡도 증가

## 흔한 실수

- **모든 공용 모듈을 Global로** → 의존 추적 불가·최적화 여지 증발
- **순환 의존** (`forwardRef()` 남발) → 부팅 단계 복잡화
- **onModuleInit에 무거운 작업** (외부 API 호출·DB 풀 warmup) → 필요하면 `onApplicationBootstrap` 또는 첫 요청 시점으로 지연
- **Cold Start 측정 없이 "빠를 거다" 가정** → 실측 기반 의사결정 필수

## 면접 체크포인트

- Cold Start가 서버리스·오토스케일링에서 사용자 경험에 미치는 영향
- NestJS에서 의존성 그래프가 부팅 시간에 영향을 주는 메커니즘
- 거대 Controller를 분리해 얻는 병렬 초기화 효과
- Lazy Module이 적합한 상황
- Global Module 남발의 함정
- Provisioned Concurrency vs 앱 분할 트레이드오프

## 출처
- [velog @miinhho — NestJS 의존성 최적화를 통한 Cold Start 성능 개선](https://velog.io/@miinhho/NestJS-%EC%9D%98%EC%A1%B4%EC%84%B1-%EC%B5%9C%EC%A0%81%ED%99%94%EB%A5%BC-%ED%86%B5%ED%95%9C-Cold-Start-%EC%84%B1%EB%8A%A5-%EA%B0%9C%EC%84%A0)

## 관련 문서
- [[NestJS|NestJS 개요]]
- [[NestJS-vs-Spring|NestJS vs Spring (Cold Start 비교)]]
- [[Clean-Architecture-NestJS|Clean Architecture with NestJS]]
- [[AWS-Lambda|AWS Lambda · Cold Start]]
- [[Nodejs-Production-Readiness|Node.js 프로덕션 체크리스트]]
