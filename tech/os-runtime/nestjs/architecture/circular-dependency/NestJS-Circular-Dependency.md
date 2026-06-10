---
tags: [nestjs, circular-dependency, di, architecture]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Circular Dependency", "순환 의존성 해결", "forwardRef vs ModuleRef"]
---

# NestJS 순환 의존성 해결 전략

DI 컨테이너는 **위상 정렬 가능한 비순환 그래프(DAG)**를 전제로 인스턴스화 순서를 결정한다. 순환이 생기면 부팅 자체가 실패. NestJS는 우회용 도구(`forwardRef`, `ModuleRef`)를 제공하지만, 진짜 해법은 **그래프를 단방향으로 다시 그리는 것**.

## 왜 문제인가

- DI 컨테이너가 의존성 그래프를 위상 정렬해 순서대로 인스턴스화 → 사이클이 있으면 정렬 불가 → throw.
- forwardRef로 우회해도 **컴파일은 통과하지만 코드가 읽기 어려워지고**, 도메인 경계 흐려짐.
- 순환은 보통 **응집도 낮은 모듈 분리**의 신호. 두 클래스가 서로 호출해야 한다면 **공통 책임이 빠진 것**.

## 5가지 전략 한눈에

| 전략 | 메커니즘 | 적합 | 비용 |
|------|---------|------|------|
| **forwardRef** | DI 토큰 지연 평가 | 단순 양방향, 레거시 빠른 패치 | 가독성·디버깅·테스트 부담 |
| **ModuleRef Lazy** | 인스턴스 사후 해결 | 동적 토큰·조건부 의존 | 컴파일 타임 안전성 ↓ |
| **Event 기반** | 발행-구독으로 호출 끊기 | 사이드이펙트성 통보 | 흐름 추적 어려움 |
| **Facade** | 양쪽을 호출하는 상위 서비스 | 두 도메인을 같이 쓰는 use-case | 추상화 1단계 추가 |
| **Domain 분리** | Repository·Application 레이어 | 대규모·복잡한 도메인 | 설계 비용 큼 |

**도구 선택 우선순위**: 가능하면 Facade/Domain 분리 → 안 되면 Event → 그래도 안 되면 ModuleRef → 마지막이 forwardRef.

## 1. forwardRef — 지연 평가 우회

DI 토큰을 클래스 자체가 아닌 **`() => Class` 함수**로 등록. NestJS가 의존성 해결 시점에 함수를 평가해 실제 토큰 획득.

```ts
// 클래스 레벨
@Injectable()
export class UserService {
  constructor(@Inject(forwardRef(() => PostService)) private postService: PostService) {}
}

// 모듈 레벨도 동일
@Module({
  imports: [forwardRef(() => PostModule)],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

### 함정 — 생성자 시점 사용 금지

forwardRef로 들어온 의존성은 **constructor 종료 시점엔 미해결**일 수 있어 필드 초기화·constructor 본문에서 즉시 호출하면 `undefined`. **메서드 호출 시점**까지 미루면 안전.

## 2. ModuleRef — Lazy Loading

`ModuleRef`를 주입받아 `OnModuleInit` 시점에 직접 해결. 의존성을 컴파일 타임 그래프에서 제거.

```ts
@Injectable()
export class UserService implements OnModuleInit {
  private postService: PostService;

  constructor(private moduleRef: ModuleRef) {}

  onModuleInit() {
    this.postService = this.moduleRef.get(PostService, { strict: false });
  }
}
```

| 옵션 | 의미 |
|------|------|
| `strict: false` | 다른 모듈의 Provider도 검색 |
| `moduleRef.resolve(Token, contextId)` | REQUEST 스코프 인스턴스 해결 |

**대가**: 의존이 메타데이터에 안 잡혀 정적 분석·테스트 도움 ↓. 동적 토큰·플러그인성 의존이 진짜 필요할 때만.

## 3. 이벤트 기반 — 호출 끊기

A → B, B → A 호출 중 한쪽이 **사이드이펙트성 통보**면 직접 호출 대신 EventEmitter로 분리.

```ts
// 발행
this.events.emit('user.created', new UserCreatedEvent(user.id));

// 구독 (다른 모듈)
@OnEvent('user.created')
async handleUserCreated(e: UserCreatedEvent) {
  await this.createWelcomePost(e.userId);
}
```

### CQRS로 강화

`@nestjs/cqrs`는 Command/Event/Query를 분리해 발행자-구독자가 같은 인터페이스만 알면 충분. `@CommandHandler` 안에서 `EventBus.publish` → `@EventsHandler`가 받음. 직접 호출 0.

**한계**: 코드만 봐서는 어디서 누가 듣는지 추적 어려움 → 도메인 이벤트 카탈로그 문서화 병행. 트랜잭션 경계가 끊겨 결과적 일관성(eventual consistency) 감수.

## 4. Facade — 중간 서비스로 끌어올리기

A↔B 양방향 호출을 같이 호출하는 **상위 서비스**로 모음. A·B는 서로 모르게 됨.

```ts
@Injectable()
export class UserPostFacade {
  constructor(private userService: UserService, private postService: PostService) {}
  async getUserWithPosts(userId: string) {
    const [user, posts] = await Promise.all([
      this.userService.findById(userId),
      this.postService.getPostsByUserId(userId),
    ]);
    return { ...user, posts };
  }
}
```

**두 도메인을 함께 쓰는 use-case**가 있을 때 자연스러운 해법. Strategy 변형도 가능 — 검증·정책처럼 인터페이스 하나에 여러 구현이 있을 때 `Map<string, Strategy>`로 동적 선택해 의존을 단방향으로 정리.

## 5. Repository + Domain Layer 분리

DDD/헥사고날 계열. **도메인 엔티티는 인프라를 모름**, Repository는 도메인 인터페이스로만 노출. ApplicationService(use-case)가 두 Repository를 같이 호출.

```ts
export interface UserRepository { findById(id: string): Promise<User | null>; save(u: User): Promise<User>; }

@Injectable()
export class UserApplicationService {
  constructor(@Inject('UserRepository') private userRepo: UserRepository,
              @Inject('PostRepository') private postRepo: PostRepository) {}
  async createUserWithWelcomePost(dto: CreateUserDto) {
    const user = new User(uuid(), dto.email, dto.name);
    if (!user.canCreatePost()) throw new Error('User cannot create posts');
    await this.userRepo.save(user);
    await this.postRepo.save(new Post(uuid(), user.id, 'Welcome'));
    return user;
  }
}
```

도메인↔도메인 직접 호출이 줄어 순환이 발생할 여지가 작음. 헥사고날 매핑은 [[Clean-Architecture-NestJS]].

## Best Practices — 자동화로 막기

### 의존성 그래프 분석

`Reflect.getMetadata('design:paramtypes', class)`로 정적 그래프 추출 → DFS로 사이클 탐지. 부팅 시 자체 점검 루틴으로 돌리거나 CI에 통합.

### ESLint `import/no-cycle`

```js
// .eslintrc.js
rules: {
  'import/no-cycle': ['error', { maxDepth: 3 }],
  'no-restricted-imports': [
    'error',
    { patterns: [{ group: ['../../../*'], message: 'Too deep relative imports' }] },
  ],
}
```

소스 레벨 import 사이클을 PR 단계에서 차단. DI 사이클과는 별개지만 강한 상관.

### 아키텍처 테스트

```ts
it('domain layer must not depend on infrastructure', () => {
  const domainServices = getAllDomainServices();
  domainServices.forEach(s => {
    expect(getDependencies(s).filter(d => /Repository|External/.test(d))).toHaveLength(0);
  });
});
```

레이어 의존 방향을 테스트로 강제. ArchUnit-TS 같은 라이브러리도 옵션.

## 성능·메모리

- **forwardRef 자체 오버헤드는 작음** — 함수 평가 1회. 다만 누적되면 그래프 추적이 느려짐.
- **REQUEST 스코프 + forwardRef 조합** — 요청마다 재해결 → 비용 큼. 가능하면 DEFAULT 스코프로 유지.
- **ModuleRef.get을 핫패스에서 호출** → 호출마다 lookup. `OnModuleInit`에서 한 번 캐싱.

## 흔한 실수

| 함정 | 증상 | 대응 |
|------|------|------|
| forwardRef 생성자에서 즉시 호출 | undefined | 메서드 호출 시점에 |
| 모듈 레벨 forwardRef 누락 | "circular dependency" 부팅 실패 | 양쪽 모듈 모두 forwardRef |
| ModuleRef로 모든 의존 회피 | 정적 분석·테스트 약화 | 마지막 수단 |
| Event로 트랜잭션 통보 | 결과적 일관성 + 트랜잭션 경계 깨짐 | 같은 트랜잭션이 필요하면 Facade |
| Facade가 Goddess 클래스로 비대 | 책임 경계 흐려짐 | use-case 단위로 분리 |

## 면접 체크포인트

- 부팅 실패의 이유 — DAG 위상 정렬 불가
- 5가지 전략과 우선순위 — Domain/Facade > Event > ModuleRef > forwardRef
- forwardRef 동작 — `() => Class` 지연 평가, 생성자 시점 사용 위험
- ModuleRef Lazy의 대가 — 정적 분석·테스트 약화
- Event 기반의 한계 — 트랜잭션 경계 깨짐, 결과적 일관성
- 자동화 방어 — `import/no-cycle`·의존성 그래프 분석·아키텍처 테스트
- "처음 forwardRef → 가독성 저하 → CQRS 리팩토링" 같은 진화 스토리

## 관련 문서

- [[NestJS-Module-Dynamic|Module 시스템 (forwardRef 기본)]]
- [[NestJS-Lifecycle|Lifecycle (OnModuleInit·OnApplicationBootstrap 시점)]]
- [[Clean-Architecture-NestJS|Clean Architecture with NestJS]]
- [[NestJS-Custom-Decorator|커스텀 데코레이터·DiscoveryService]]
- [[NestJS-Plugin-System|Plugin System (DiscoveryService 확장)]]
