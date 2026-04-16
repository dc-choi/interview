---
tags: [nestjs, architecture, clean-architecture, typescript, di]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Clean Architecture NestJS", "NestJS 클린 아키텍처"]
---

# Clean Architecture with NestJS

Clean Architecture의 4겹 동심원을 NestJS의 모듈·프로바이더·컨트롤러 구조에 매핑하는 실무 가이드. 핵심은 **의존성 방향을 안쪽으로 고정**하고, NestJS의 DI 컨테이너로 바깥 레이어의 구체 구현을 주입하여 **비즈니스 로직이 프레임워크를 모르게** 하는 것.

## 4겹 레이어 매핑

| Clean Layer | NestJS 구현체 | 책임 |
|---|---|---|
| **Entities** (핵심) | POJO 클래스 / 도메인 모델 | 업무 규칙·불변조건. 데코레이터 금지 |
| **Use Cases** | `@Injectable()` 서비스 클래스 | 애플리케이션 고유 유스케이스 오케스트레이션 |
| **Interface Adapters** | Controller · Presenter · Gateway · Repository 구현 | DTO ↔ 도메인 변환, 외부와의 번역 |
| **Frameworks & Drivers** | TypeORM/Mongoose·HTTP·Kafka 드라이버 | DB·프레임워크·라이브러리의 구체 구현 |

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

## 디렉토리 구조 예시

```
src/
  domain/
    entities/          ← 순수 엔티티 (Entities)
    ports/             ← 인터페이스 (Use Case가 바라보는 외부 계약)
  application/
    use-cases/         ← @Injectable() Use Case (Use Cases)
    dto/               ← Command/Query (내부 DTO)
  infrastructure/
    persistence/       ← TypeORM Repository 구현 (Framework)
    http/              ← REST Controller (Adapter)
    messaging/         ← Kafka Producer/Consumer (Adapter)
  shared/
    modules/           ← NestJS 모듈 정의 (DI 와이어링)
```

## Controller는 얇게

```ts
@Controller('users')
export class UserController {
  constructor(private readonly register: RegisterUserUseCase) {}

  @Post()
  async create(@Body() dto: CreateUserRequestDto) {
    const user = await this.register.execute(dto.toCommand());
    return UserResponseDto.of(user); // 도메인 → 응답 변환
  }
}
```

- HTTP 관심사(상태 코드·검증·시리얼라이즈)만 Controller에
- Use Case 호출 결과를 Response DTO로 변환 후 반환
- 비즈니스 분기는 절대 Controller에 두지 않음

## DI로 얻는 테스트 전략

| 테스트 유형 | 대상 | 주입 |
|---|---|---|
| Unit | Use Case 단위 | Port 구현을 in-memory mock으로 |
| Integration | Module 단위 | 실제 TypeORM + SQLite / Testcontainers |
| E2E | 전체 앱 | `@nestjs/testing` `Test.createTestingModule()` |

테스트에서 Module을 `overrideProvider(USER_REPOSITORY).useClass(FakeUserRepo)`로 대체 가능 → 실행 환경과 테스트 환경의 경계가 **DI 토큰 레벨**에 그어진다.

## 흔한 실수

- **Use Case가 TypeORM `@Entity`를 그대로 받음** → 도메인이 DB 스키마에 종속. 별도 도메인 엔티티로 분리 + Repository에서 매핑
- **Controller에서 `DataSource` 직접 호출** → Use Case 우회. 횡단 관심사(트랜잭션)까지 컨트롤러로 샘
- **Port 인터페이스 없이 구체 Repository를 바로 주입** → Clean의 핵심 이점(교체성·테스트성)이 사라짐
- **도메인 엔티티에 데코레이터** → 클래스가 특정 ORM을 알게 되어 교체 비용 발생

## Hexagonal과의 차이

| 구분 | Clean Architecture | Hexagonal (Ports & Adapters) |
|---|---|---|
| 초점 | 동심원 의존성 규칙 | 내부/외부 사이 포트 경계 |
| 레이어 수 | 4 | 2(Core/Adapter) + 입력/출력 포트 |
| NestJS 매핑 | Use Case 중심 | Driving/Driven Adapter 구분 |

실무에서는 두 패턴이 상당 부분 겹치므로 팀 컨벤션에 맞춰 용어를 통일하는 편이 낫다. 자세한 실전 구현은 [[Hexagonal-In-Practice|Hexagonal 실전 적용]].

## 면접 체크포인트

- Clean Architecture의 의존성 규칙 한 문장
- NestJS DI 토큰(Symbol)으로 추상/구현을 분리하는 이유
- TypeORM `@Entity`와 도메인 엔티티를 분리해야 하는 이유
- `overrideProvider`를 활용한 테스트 경계 설계
- Clean vs Hexagonal을 실무에서 어떻게 합쳐 쓰는가

## 출처
- [Better Programming — Clean Node.js Architecture With NestJS and TypeScript](https://medium.com/better-programming/clean-node-js-architecture-with-nestjs-and-typescript-34b9398d790f)

## 관련 문서
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal]]
- [[Hexagonal-In-Practice|Hexagonal 실전 적용]]
- [[DDD|DDD]]
- [[DTO-Layering|DTO 레이어 스코프 · Entity 변환 위치]]
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
