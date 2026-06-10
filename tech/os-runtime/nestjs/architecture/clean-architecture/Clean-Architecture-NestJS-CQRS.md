---
tags: [nestjs, architecture, clean-architecture, typescript, di]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["NestJS CQRS와 Event Handler 확장", "Clean vs Hexagonal NestJS"]
---

# Clean Architecture NestJS — CQRS 확장과 Hexagonal 비교

## CQRS, Event Handler 확장

단순 Use Case 하나가 아닌, **Command, Query, Event 세 축으로 분리**하는 패턴이 Clean Architecture와 자주 결합된다. NestJS는 `@nestjs/cqrs` 모듈로 공식 지원.

```
Command Handler  ← 상태 변경 (CreateUserCommand)
Query Handler    ← 조회 전용 (GetUserByIdQuery, 읽기 전용)
Event Handler    ← 부수 효과 (UserCreatedEvent → 이메일 발송, 알림)
```

- **Command**: 의도적 상태 변경. Aggregate에 커밋되는 트랜잭션 단위
- **Query**: 읽기 전용. 별도 Read Model, DTO 직행 가능 → 도메인 모델 우회로 성능 최적화
- **Event**: 변경 결과를 다른 바운디드 컨텍스트, 부수 효과로 전파. 비동기 처리 가능

### Factory 패턴으로 엔티티 생성 + 이벤트 발행
```ts
@Injectable()
export class UserFactory {
  create(name: string, email: string): User {
    const user = new User(ulid(), name, email);
    user.apply(new UserCreatedEvent(user.id));  // 도메인 이벤트 생성
    return user;
  }
}
```
- `apply()`는 AggregateRoot 베이스 클래스가 제공 — 트랜잭션 커밋 시점에 이벤트 디스패치
- Factory는 Use Case와 별개로 두어 **복잡한 엔티티 생성 로직**을 한 곳에
- `@nestjs/cqrs`의 `EventBus`가 등록된 `EventHandler`로 전달

### 왜 굳이 분리하나
- **읽기, 쓰기 최적화 축을 따로** — Query는 denormalized view, Command는 정규화된 도메인
- **부수 효과를 도메인 로직에서 분리** — User 생성이 "이메일도 보내야 함"을 몰라야 함. EventHandler가 책임
- **확장성** — Event Handler를 늘려도 Command Handler는 변하지 않음 (OCP)

단, 작은 CRUD 위주 서비스에 CQRS, Event Handler까지 도입하면 **보일러플레이트 과다**. 바운디드 컨텍스트가 복잡할 때만.

## Hexagonal과의 차이

| 구분 | Clean Architecture | Hexagonal (Ports & Adapters) |
|---|---|---|
| 초점 | 동심원 의존성 규칙 | 내부/외부 사이 포트 경계 |
| 레이어 수 | 4 | 2(Core/Adapter) + 입력/출력 포트 |
| NestJS 매핑 | Use Case 중심 | Driving/Driven Adapter 구분 |

실무에서는 두 패턴이 상당 부분 겹치므로 팀 컨벤션에 맞춰 용어를 통일하는 편이 낫다. 자세한 실전 구현은 [[Hexagonal-In-Practice|Hexagonal 실전 적용]].

## 면접 체크포인트

- CQRS(Command/Query/Event) 분리가 주는 이점과 도입 임계점
- Factory 패턴으로 도메인 이벤트를 생성하는 이유
- Clean vs Hexagonal을 실무에서 어떻게 합쳐 쓰는가
