---
tags: [nestjs, module, dynamic-module]
status: done
verified_at: 2026-08-26
category: "OS & Runtime - NestJS"
aliases: ["NestJS Dynamic Module", "Global Module", "register registerAsync"]
---

# NestJS Dynamic Module: 구성 패턴

## 순환 참조와 `forwardRef()`

A → B, B → A 양방향 의존이 발생할 때 NestJS가 모듈/Provider 등록 순서를 결정 못 함. `forwardRef()`로 lazy 참조.

```ts
@Module({
  imports: [forwardRef(() => UserModule)],
})
export class AuthModule {}

@Injectable()
export class AuthService {
  constructor(@Inject(forwardRef(() => UserService)) private userService: UserService) {}
}
```

근본 해결은 **단방향 의존**으로 모듈 경계 재설계. `forwardRef`는 구조가 정말 어쩔 수 없을 때만. 5가지 해결 전략(forwardRef, ModuleRef, Event, Facade, Domain) 비교, 트레이드오프, 자동화 방어는 [[NestJS-Circular-Dependency|순환 의존성 해결 전략]].

### 이벤트 기반 대안

순환의 근본 원인이 "A가 B를 호출해 알리고, B도 A에 알려야" 같은 상호 통보인 경우, **EventEmitter/Pub-Sub로 연결을 끊는 것**이 정공법.

```ts
// Before: AService → BService, BService → AService (순환)
// After: 둘 다 EventEmitter만 의존
@Injectable()
export class AService {
  constructor(private events: EventEmitter2) {}
  doWork() {
    this.events.emit('a.done', { id: 1 });
  }
}

@Injectable()
export class BService implements OnModuleInit {
  constructor(private events: EventEmitter2) {}
  onModuleInit() {
    this.events.on('a.done', payload => this.handleA(payload));
  }
}
```

호출 → 통보 → 응답 패턴이 **느슨하게 결합**되며, 새 구독자가 늘어도 발행자 수정 불필요. 단점은 호출 흐름이 코드만 봐서는 안 보여 디버깅 추적성이 떨어짐 → 도메인 이벤트 카탈로그 문서화 병행.

## ConfigurableModuleBuilder — 보일러플레이트 자동 생성

[[NestJS-Module-Dynamic-Imports-and-Registration|등록 예제의 register/registerAsync]]와 옵션 토큰을 손으로 짜는 대신, `new ConfigurableModuleBuilder<ModuleOptions>().build()`가 내놓는 `ConfigurableModuleClass`를 모듈이 상속하면 register()와 registerAsync()(useFactory, useClass, useExisting 지원)가 자동 생성된다. 옵션은 함께 생성되는 `MODULE_OPTIONS_TOKEN`으로 서비스에 주입받는다.

- 메서드 이름은 `.setClassMethodName('forRoot')`로 바꾼다 — forRoot와 forRootAsync 쌍으로 생성.
- `isGlobal`처럼 서비스는 몰라도 되는 모듈 동작 플래그는 `.setExtras()`로 옵션 토큰과 분리해 모듈 정의에만 반영한다.

## exports 규칙

- export하지 않은 Provider는 **모듈 외부에서 주입 불가**.
- export 토큰은 `provide` 토큰과 동일해야 함 — 클래스 토큰이면 클래스, 문자열/Symbol 토큰이면 그대로.
- 다른 모듈을 그대로 re-export 가능: `exports: [UserService, OtherModule]`.

## 흔한 실수

- **Global 남용**: 모든 인프라성 Provider를 Global로 → 의존 관계 추적 불가, 테스트 격리 어려움.
- **register vs forRoot 혼용**: 의도가 같은 모듈에 두 메서드 정의 → 사용처마다 호출이 달라 일관성 깨짐.
- **forwardRef로 순환 회피만**: 근본 원인은 모듈 경계 설계 — `forwardRef`를 쓰는 순간 리팩토링 검토 시그널.
- **registerAsync에서 inject 누락**: 옵션 팩토리가 `ConfigService` 받는데 `inject: []` → 런타임에 `undefined`.

## 면접 체크포인트

- Static Module vs Dynamic Module 차이 — 옵션 인자로 모듈 구성을 결정하느냐
- `@Global()`을 언제 쓰고 언제 피해야 하는지
- `forRoot` / `forFeature` / `register` 컨벤션의 의미
- `registerAsync` 패턴 — `useFactory` + `inject`로 다른 Provider에 의존하는 옵션 만들기
- 순환 참조 발생 시 `forwardRef`로 임시 해결, 근본은 모듈 단방향화
- export하지 않은 Provider는 외부 주입 불가

## 관련 문서

- [[NestJS|NestJS 개요, DI, 모듈 기본]]
- [[NestJS-Lifecycle|NestJS Lifecycle (Bootstrap 단계, 생명주기 훅)]]
- [[NestJS-vs-Spring|NestJS vs Spring (DI 모듈 비교)]]

## 출처
- [NestJS — Dynamic modules](https://docs.nestjs.com/fundamentals/dynamic-modules)
- [NestJS — Migration guide (v11)](https://docs.nestjs.com/v11/migration-guide)
