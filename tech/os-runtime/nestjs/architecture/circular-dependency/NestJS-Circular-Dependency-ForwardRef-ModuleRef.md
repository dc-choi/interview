---
tags: [nestjs, circular-dependency, di, architecture]
status: done
category: "OS & Runtime - NestJS"
aliases: ["forwardRef 지연 평가", "ModuleRef Lazy Loading"]
---

# NestJS 순환 의존성 — forwardRef와 ModuleRef 우회

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

forwardRef로 들어온 의존성은 **constructor 종료 시점엔 미해결**일 수 있어 필드 초기화, constructor 본문에서 즉시 호출하면 `undefined`. **메서드 호출 시점**까지 미루면 안전.

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

**대가**: 의존이 메타데이터에 안 잡혀 정적 분석, 테스트 도움 ↓. 동적 토큰, 플러그인성 의존이 진짜 필요할 때만.
