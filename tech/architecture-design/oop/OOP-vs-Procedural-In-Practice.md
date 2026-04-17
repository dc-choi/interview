---
tags: [architecture, oop, domain-driven-design, procedural]
status: done
category: "Architecture - OOP"
aliases: ["OOP vs Procedural", "Anemic Domain Model"]
---

# OOP vs 절차지향 — 실무의 실제

"OOP 언어(Java·Kotlin·TS) 쓰니까 OOP 코드"라는 착각이 흔하다. 클래스·객체를 써도 **절차지향적**으로 작성할 수 있고, 실제로 그런 코드가 훨씬 많다. 이 문서는 "왜 그런가"와 "언제 OOP가 필요하고 언제는 아닌가"를 정리.

## Anemic Domain Model (빈약한 도메인 모델)

전형적 안티패턴. Martin Fowler가 명명.

```
class User {
  id: string;
  name: string;
  age: number;
  // getter/setter만 있음
}

class UserService {
  // 모든 비즈니스 로직이 여기
  isAdult(user: User) { return user.age >= 19; }
  changeName(user: User, newName: string) {
    if (newName.length < 2) throw ...;
    user.name = newName;
  }
}
```

**"객체"는 있지만 실질은 절차지향** — User는 데이터 그릇, Service는 함수 모음. 객체 간 메시지 교환 없음, 책임 분산 없음.

### 왜 이게 "나쁜 OOP"인가
- User는 자기 상태를 **스스로 보호하지 못함** — 누구나 `user.name = ''` 가능
- 동일 도메인 규칙(`age >= 19`)이 여러 Service에 **중복 등장** 위험
- 테스트 시 User 단독 테스트 의미 없음 → Service에만 테스트 집중
- 도메인 전문성이 **코드에 드러나지 않음**

## Rich Domain Model (풍부한 도메인 모델)

```
class User {
  private _name: string;
  private _age: number;

  changeName(newName: string) {
    if (newName.length < 2) throw ...;
    this._name = newName;
  }

  isAdult(): boolean {
    return this._age >= 19;
  }
}
```

- 도메인 규칙이 **자신과 함께** 살아 있음
- 불변조건 자가 보호
- 테스트가 User 단위로 의미 있음
- 도메인 전문가가 코드를 **읽을 수 있음**

## 왜 실무는 Anemic이 많은가 — 역사적 맥락

### 1. GUI 시대의 OOP 부상
Smalltalk·Object Pascal·Visual Basic. **GUI 컴포넌트**가 명백히 객체적 (Button·Window·Form 간 메시지 교환). OOP가 자연스러운 자리.

### 2. 웹·엔터프라이즈 시대의 절차지향 회귀
1990~2000년대 웹·EJB 시대. 관심사가 **"DB 데이터를 HTML로 뿌리기"**·**트랜잭션·동시성·분산**으로 이동. 도메인 모델링보다 **기술 이슈가 압도**.

EJB의 **Entity Bean과 Session Bean 분리** — 데이터(Entity)와 처리(Session)를 구조적으로 나눴고, 이게 Anemic 패턴을 제도화.

### 3. 트랜잭션 스크립트 관성
Spring + JPA 조합이 OOP를 지원해도 **관습**은 이어졌음:
- 기존 코드가 Anemic이라 후임도 그렇게 씀
- Service 계층에 트랜잭션 경계 + 비즈니스 로직 → 자연스럽게 절차지향
- ORM `@Entity`를 직접 쓰면 DB 스키마 종속 → 도메인 모델 구성이 제약

## DDD와 OOP는 다른 축

혼동되지만 **독립 개념**:
- **OOP**: 프로그램 전반의 설계 원칙 (책임 분산·캡슐화·메시지)
- **DDD**: 도메인 복잡도가 높을 때 쓰는 **전략적·전술적 패턴** (Aggregate·Bounded Context·Value Object 등)

모든 OOP가 DDD는 아니고, 모든 프로젝트에 DDD가 필요한 것도 아니다.

## 어디에 OOP가 필요한가 (현실 비율)

대략적 감각:
- **도메인 복잡도 높음** (결제·보험·병원·에너지·법무): DDD + Rich OOP가 보상
- **데이터 중심** (CRUD·리포트·간단 비즈니스 로직): Anemic + Service 패턴이 과하지 않음
- **빠른 피드 서비스·임시 기획**: 절차지향이 오히려 가독성·속도 이점
- **작은 팀(3~4명)**: 도메인 복잡도 자체가 낮음 → OOP 오버헤드 피하기

**"95%의 프로젝트가 데이터 중심"**이라는 주장도 있을 만큼, Rich OOP가 늘 정답은 아님. 다만 데이터 중심이어도 **코드 품질이 절차지향이어야 한다는 뜻은 아니다** — 계층 분리·책임 분배는 여전히 유효.

## 언제 Rich OOP로 가야 하는가

판단 기준:
1. **비즈니스 규칙이 코드보다 빠르게 바뀜** — 캡슐화 안 되면 변경 영향이 전파
2. **같은 도메인 규칙을 여러 Service가 참조** — 코드 중복, 실수 여지
3. **도메인 전문가와 긴밀한 협업** — 코드가 도메인 언어를 반영해야 소통 가능
4. **Bounded Context가 분명** — 팀 간 경계가 명확해야 Aggregate가 의미
5. **장기 유지보수 필요** — 단기 프로젝트엔 과함

반대 신호:
- 3~6개월 안에 쓰이고 말 기능
- 요구사항이 매우 불확실 (먼저 절차지향으로 검증)
- 팀원이 OOP·DDD 학습 곡선을 감당 못 함
- 데이터 파이프라인·배치 성격

## 절차지향이 "나쁜 선택"은 아니다

데이터 중심·CRUD·단순 처리에서 **잘 쓰인 절차지향**이 **못 쓰인 OOP**보다 낫다. "객체를 만들었다"는 이유로 Rich OOP를 흉내 내면 오히려:
- 불필요한 추상화
- 과도한 클래스 계층
- 의미 없는 인터페이스
- 읽기 어려운 코드

핵심: **도구는 문제에 맞춰서**. 절차지향·함수형·OOP는 선택이지 이념이 아님.

## 리팩토링 전략 (Anemic → Rich)

하루아침에 다 못 바꿈. 점진적:

1. **Value Object부터 추출** — Email·Money·DateRange 같은 자기 검증 가능한 작은 타입
2. **Entity 불변조건을 생성자·메서드에 이동** — `new User(name)` 시 name 검증
3. **Service에서 비즈니스 규칙을 Entity로** — 규칙이 데이터와 같은 곳에
4. **Aggregate 경계 설정** — 관련된 Entity·VO를 하나의 루트로
5. **Domain Event** — 상태 변경을 이벤트로 표현

전면 개편 대신 **새 기능부터 Rich 스타일**로 작성 + 기존 코드는 손댈 때마다 조금씩 개선.

## 면접 체크포인트

- Anemic Domain Model의 정의와 문제점
- "OOP 언어 + OOP 코드" 가 항상 일치하지 않는 이유
- DDD와 OOP가 독립 개념인 이유
- 웹·엔터프라이즈 시대에 절차지향이 굳어진 역사적 맥락 (EJB·트랜잭션 스크립트)
- Rich OOP가 필요한 판단 기준
- 데이터 중심 도메인에서 절차지향이 정당화되는 경우
- Anemic → Rich 점진적 리팩토링 순서

## 출처
- [Inflearn 커뮤니티 — 실제로 객체지향 설계를 많이 하나요?](https://www.inflearn.com/community/questions/1356972)
- [Inflearn 커뮤니티 — 왜 선배 개발자들은 절차지향이었을까](https://www.inflearn.com/community/questions/1385602)

## 관련 문서
- [[OOP|OOP / SOLID]]
- [[App-Architecture-OOP|애플리케이션 아키텍처와 객체지향]]
- [[Elegant-OOP-Design|우아한 객체지향 설계]]
- [[DDD|DDD (Aggregate·Bounded Context)]]
- [[DDD-Hexagonal-In-Production|DDD + Hexagonal 실무 경험]]
