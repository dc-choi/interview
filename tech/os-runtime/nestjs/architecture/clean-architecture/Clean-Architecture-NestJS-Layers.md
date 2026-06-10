---
tags: [nestjs, architecture, clean-architecture, typescript, di]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["NestJS 클린 아키텍처 레이어 매핑", "NestJS 의존성 역전 인터페이스 경계"]
---

# Clean Architecture NestJS — 레이어 매핑과 의존성 역전

## 4겹 레이어 매핑

| Clean Layer | NestJS 구현체 | 책임 |
|---|---|---|
| **Entities** (핵심) | POJO 클래스 / 도메인 모델 | 업무 규칙, 불변조건. 데코레이터 금지 |
| **Use Cases** | `@Injectable()` 서비스 클래스 | 애플리케이션 고유 유스케이스 오케스트레이션 |
| **Interface Adapters** | Controller, Presenter, Gateway, Repository 구현 | DTO ↔ 도메인 변환, 외부와의 번역 |
| **Frameworks & Drivers** | TypeORM/Mongoose, HTTP, Kafka 드라이버 | DB, 프레임워크, 라이브러리의 구체 구현 |

의존성 규칙: **Framework → Adapter → Use Case → Entity**. 역방향(안→밖) 의존 금지.

## 의존성 역전의 실체: 인터페이스 경계

Use Case는 구체 구현이 아닌 **추상(인터페이스/토큰)에만 의존**한다.

```ts
// domain/ports/user-repository.ts
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

// use-cases/register-user.ts
@Injectable()
export class RegisterUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: IUserRepository) {}
  async execute(cmd: RegisterCommand) { ... }
}

// adapters/typeorm-user.repository.ts  (infrastructure)
@Injectable()
export class TypeormUserRepository implements IUserRepository { ... }

// user.module.ts
@Module({
  providers: [
    RegisterUserUseCase,
    { provide: USER_REPOSITORY, useClass: TypeormUserRepository },
  ],
})
export class UserModule {}
```

- Symbol 토큰으로 추상과 구현 분리 → 인터페이스는 런타임 타입이 없으므로 `@Inject(USER_REPOSITORY)`로 바인딩
- 테스트에서는 `useClass`를 in-memory mock으로 교체 → 실제 DB 없이 유스케이스 검증

### 대안: 추상 클래스를 토큰 대신 쓰기

Interface는 **컴파일 후 사라져서** 런타임 DI에 쓸 수 없다. TS에서의 두 가지 우회:

**방식 A — Symbol 토큰 (위 예시)**: `interface IUserRepository` + `Symbol('USER_REPOSITORY')`로 바인딩. 전형적.

**방식 B — 추상 클래스를 인터페이스처럼 쓰기**:
```ts
// domain/ports/user-repository.ts
export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract save(user: User): Promise<void>;
}

// use-cases/register-user.ts
@Injectable()
export class RegisterUserUseCase {
  constructor(private readonly repo: UserRepository) {}  // ← 토큰 없이
}

// user.module.ts
providers: [
  RegisterUserUseCase,
  { provide: UserRepository, useClass: TypeormUserRepository },
]
```

추상 클래스는 **런타임 값**이라 `@Inject()` 데코레이터, Symbol 토큰 불필요. 구체 클래스는 `implements UserRepository`로 계약 명시 (extends보다 `implements`가 의도 명확).

**선택 가이드**:
- **Symbol 토큰**: 순수 interface 철학 유지, TypeScript 스타일 선호
- **추상 클래스**: 보일러플레이트 감소, Spring의 `@Autowired` 감각, 타입과 토큰이 하나

현업 경험상 추상 클래스 패턴도 **장기 운영에 문제 없음**. 팀 컨벤션 통일이 더 중요.

## 면접 체크포인트

- Clean Architecture의 의존성 규칙 한 문장
- NestJS DI 토큰(Symbol)으로 추상/구현을 분리하는 이유
