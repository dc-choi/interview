---
tags: [nestjs, architecture, clean-architecture, typescript, di]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["NestJS 클린 아키텍처 디렉토리 구조와 테스트", "NestJS 얇은 컨트롤러와 흔한 실수"]
---

# Clean Architecture NestJS — 디렉토리 구조, 테스트 전략, 흔한 실수

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

- HTTP 관심사(상태 코드, 검증, 시리얼라이즈)만 Controller에
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
- **Port 인터페이스 없이 구체 Repository를 바로 주입** → Clean의 핵심 이점(교체성, 테스트성)이 사라짐
- **도메인 엔티티에 데코레이터** → 클래스가 특정 ORM을 알게 되어 교체 비용 발생

## 면접 체크포인트

- TypeORM `@Entity`와 도메인 엔티티를 분리해야 하는 이유
- `overrideProvider`를 활용한 테스트 경계 설계
