---
tags: [nestjs, circular-dependency, di, architecture]
status: done
category: "OS & Runtime - NestJS"
aliases: ["Event Facade Domain 분리", "순환 의존성 구조 리팩토링"]
---

# NestJS 순환 의존성 — Event, Facade, Domain 분리

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

A↔B 양방향 호출을 같이 호출하는 **상위 서비스**로 모음. A, B는 서로 모르게 됨.

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

**두 도메인을 함께 쓰는 use-case**가 있을 때 자연스러운 해법. Strategy 변형도 가능 — 검증, 정책처럼 인터페이스 하나에 여러 구현이 있을 때 `Map<string, Strategy>`로 동적 선택해 의존을 단방향으로 정리.

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
