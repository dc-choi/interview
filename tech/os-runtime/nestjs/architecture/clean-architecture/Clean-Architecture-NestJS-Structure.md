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

Controller를 얇게 두는 이유는 테스트 용이성만이 아니다. 역할이 나뉘어 있으면 장애 범위를 빨리 좁힌다.

1. Controller 진입점에 로그나 breakpoint를 두고 요청을 보낸다. 도달하지 않으면 애플리케이션 연산이 아니라 그 앞단, 즉 네트워크, proxy, 라우팅이나 요청 pipeline 문제다. NestJS에서는 Middleware, Guard, Pipe가 거절한 요청도 handler에 도달하지 않으므로 단계별 거절 로그로 위치를 가른다([[Request-Lifecycle]]).
2. 도달했는데 결과가 틀리면 Use Case와 Service의 연산, 그 입력, DB query를 본다. HTTP 관심사만 가진 Controller는 원인 후보에서 빠진다. 로직이 역할 없이 퍼져 있을수록 매번 전체를 읽어야 한다.

값이 하나뿐인 요청 body도 요청 DTO로 받는다. 필드가 늘 때 DTO 한 곳만 바꾸면 되고 DTO 타입으로 사용처를 찾을 수 있다. `number` 같은 원시 타입으로 받아 Service와 Repository까지 흘리면 변경 때 여러 계층의 시그니처를 함께 고쳐야 한다. 다만 요청 DTO를 내부 계층까지 그대로 넘기면 HTTP 계약이 도메인에 새므로 위 예시처럼 Command로 바꿔 넘긴다([[DTO-Layering#변환 위치 3안 비교|DTO 변환 위치]]). 이 규칙은 HTTP 요청 계약에 대한 것이고, 내부 함수의 단일 인자까지 객체로 감싸라는 뜻은 아니다.

## DI로 얻는 테스트 전략

| 테스트 유형 | 대상 | 주입 |
|---|---|---|
| Unit | Use Case 단위 | Port 구현을 in-memory mock으로 |
| Integration | Module 단위 | 실제 TypeORM + SQLite / Testcontainers |
| E2E | 전체 앱 | `@nestjs/testing` `Test.createTestingModule()` |

테스트에서 Module을 `overrideProvider(USER_REPOSITORY).useClass(FakeUserRepo)`로 대체 가능 → 실행 환경과 테스트 환경의 경계가 **DI 토큰 레벨**에 그어진다.

## Repository 계층을 둘지 판단

Service가 ORM의 Model이나 `Repository<T>`를 직접 주입받는 구조로 시작할 수도 있다. 비즈니스 로직과 query가 섞여 테스트가 어려워지고 같은 query가 반복되면 의미 있는 method 이름(`existsByEmail`, `findByEmail`)을 가진 Repository로 query를 모은다. 다음 중 하나라도 해당하면 도입을 검토한다.

| 판단 질문 | 해당할 때 얻는 것 |
|---|---|
| 같은 query가 여러 Service에서 반복되는가 | query 재사용과 한 곳의 수정 |
| Service 단위 테스트에서 저장소 대역이 필요한가 | ORM 없이 Use Case를 검증 |
| 데이터 소스나 ORM 교체가 현실적인가 | Service가 같은 method 계약을 유지 |
| 도메인을 영속 기술에서 격리해야 하는가 | 스키마 변경이 도메인 모델로 번지지 않음 |

해당하는 것이 없으면 ORM 저장소를 직접 주입해 시작하고 반복이 생길 때 추출한다. 구현이 하나이고 교체 계획이 불확실한데 Port와 구현을 미리 나누면 파일과 wiring만 늘어난다([[Hexagonal-In-Practice#트레이드오프|Hexagonal 도입 비용]]). 아래 흔한 실수의 Port 없는 구체 Repository 주입은 이미 Clean Architecture를 택한 코드베이스 기준이다.

Repository가 Mongoose Document, TypeORM Entity나 `select`, `populate`, `relations` 같은 query 옵션을 그대로 노출하면 교체성은 이름뿐이다. 교체를 목표로 한다면 반환 타입을 도메인 타입이나 plain object로 제한하고 query 세부 사항은 Repository 안에 둔다.

## 흔한 실수

- **Use Case가 TypeORM `@Entity`를 그대로 받음** → 도메인이 DB 스키마에 종속. 별도 도메인 엔티티로 분리 + Repository에서 매핑
- **Controller에서 `DataSource` 직접 호출** → Use Case 우회. 횡단 관심사(트랜잭션)까지 컨트롤러로 샘
- **Port 인터페이스 없이 구체 Repository를 바로 주입** → Clean의 핵심 이점(교체성, 테스트성)이 사라짐
- **도메인 엔티티에 데코레이터** → 클래스가 특정 ORM을 알게 되어 교체 비용 발생

## 면접 체크포인트

- TypeORM `@Entity`와 도메인 엔티티를 분리해야 하는 이유
- `overrideProvider`를 활용한 테스트 경계 설계
- Repository 계층을 도입할 조건과 ORM 저장소를 직접 주입해도 되는 경우
- 얇은 Controller가 장애 위치를 좁히는 순서

## 출처

- [인프런, 김빌, 비관적락을 이용한 동시성 제어(with Prisma) 구현해보자](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273681)
- [인프런, 김빌, controller & service정리](https://www.inflearn.com/courses/lecture?courseId=336546&unitId=273673)
- [인프런, 윤상석, Repository 패턴과 레이어 분리](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83831)
