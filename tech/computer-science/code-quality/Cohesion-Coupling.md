---
tags: [cs, code-quality, design, oop]
status: done
category: "CS - 코드 품질"
aliases: ["Cohesion Coupling", "응집도 결합도"]
---

# 응집도(Cohesion)와 결합도(Coupling)

소프트웨어 설계를 바라보는 두 축이다. 모듈 안은 관련된 책임으로 모으고 모듈 사이는 필요한 만큼만 의존하는 것이 기본 방향이며, SOLID도 이를 구체화하는 판단 기준을 제공한다.

## 정의

**응집도(Cohesion)**: 모듈 내부 요소들이 얼마나 밀접하게 관련되는가. 변경 관점에서는 같은 이유로 함께 바뀌는 상태와 행동이 한곳에 모인 정도로 볼 수 있다.

**결합도(Coupling)**: 모듈 사이 의존의 수, 방향, 깊이와 안정성. 의존 대상이 바뀔 때 함께 수정될 가능성이 클수록 변경 결합도가 높다.

둘은 서로 영향:
- 응집도가 낮으면 책임이 여러 모듈에 퍼져 → 결합도 증가
- 결합도가 높으면 변경이 전파 → 모듈 내 응집도 해체

## 변경 관점으로 다시 본 두 축

### 응집도: 함께 바뀌는 정도

전통적 정의는 모듈 내부 요소가 하나의 기능에 집중하는 정도, 또는 데이터와 메서드가 서로 관련된 정도다. 변경 관점에서는 모듈 안의 요소들이 함께 바뀌는 정도로 보고, 모든 요소가 같은 이유로 함께 바뀌면 응집도가 높다. 변경의 이유는 변경의 시점과 속도로 판단한다. 같은 시점에 같은 속도로 바뀌면 같은 이유다.

기능에 집중한 것처럼 보여도 응집도가 낮을 수 있다. 영화 예매의 절차적 `ReservationService`는 모든 로직이 예매에 집중하지만, `calculateDiscount`는 할인 정책이 추가되거나 계산 방식이 바뀔 때, `findDiscountCondition`은 할인 조건이 추가되거나 판단 방식이 바뀔 때 수정된다. 서로 다른 시점과 이유로 바뀌는 두 메서드가 한 클래스에 있다. 객체지향 설계에서는 `DiscountPolicy`(할인 계산 흐름), `AmountDiscountPolicy`와 `PercentDiscountPolicy`(정책별 계산 방식), `SequenceCondition`과 `PeriodCondition`(조건별 판단 방식)이 각각 하나의 이유로만 바뀐다([[Responsibility-Driven-Design|책임 주도 설계]]).

- 단일 책임 원칙(SRP)은 클래스마다 변경 이유를 하나만 두라는 원칙이며, 서로 다른 이유로 바뀌는 코드를 분리하라는 뜻이다.
- 클래스의 크기는 줄 수나 메서드 개수가 아니라 변경의 이유로 정한다. 변경 이유가 다르면 한 줄짜리 메서드 하나라도 분리하는 편이 낫다.
- 응집도가 낮다는 신호와 분리 기준
  1. 클래스 전체가 아니라 일부 메서드와 속성만 바뀐다면 바뀌는 부분을 분리한다.
  2. 특정 메서드 그룹이 특정 속성 그룹만 쓴다면 함께 쓰이는 묶음을 분리한다.
  3. 객체를 생성할 때 일부 속성을 null로 두는 경우가 있다면 함께 초기화되는 속성 그룹을 기준으로 분리한다.

### 결합도: 함께 바뀌는 빈도

전통적 정의는 외부 모듈에 대해 아는 지식의 양이다. 그런데 절차적 `ReservationService`도, 객체지향 `Movie`도 `DiscountPolicy`의 클래스 이름과 메서드 시그니처를 알아서 지식의 양만으로는 두 설계의 차이를 설명하기 어렵다. 변경 관점에서 결합도는 의존 대상이 바뀔 때 함께 바뀌는 빈도다. 의존성은 함께 바뀔 가능성이 있는지(유무)를, 결합도는 얼마나 자주 함께 바뀌는지(상대적 정도)를 나타낸다. B가 10번 바뀔 때 A가 7번 함께 바뀌면 3번 바뀌는 경우보다 결합도가 높다.

- 결합도를 낮추려면 자주 바뀌는 구현이 아니라 잘 바뀌지 않는 추상화에 의존하게 한다. 협력 문맥에서 이 추상화를 인터페이스라 부르고, 구현이 바뀌어도 여파가 인터페이스 경계를 넘지 않게 나누는 것이 인터페이스와 구현의 분리 원칙이다.
- 공개돼 있어도 구현일 수 있다. 절차적 `DiscountPolicy`의 getter와 setter는 외부에서 부를 수 있어 인터페이스처럼 보이지만, 필드 타입을 바꾸면 시그니처가 함께 바뀌어 `ReservationService`를 고쳐야 한다. 내부 표현을 바꿀 때 함께 바뀌는 공개 멤버는 인터페이스가 아니라 구현이다. 객체지향 `DiscountPolicy`는 `conditions` 필드를 숨기고 `calculateDiscount`만 공개하므로 필드 타입이 바뀌어도 메서드 안만 고치고 `Movie`는 그대로다. `PercentDiscountPolicy`의 내부가 바뀌어도 `Movie`와 `PercentDiscountPolicy`가 모두 `DiscountPolicy` 추상화에 의존하므로 변경이 추상화에서 멈춘다.
- 객체지향 설계의 결합도가 낮은 이유는 협력에 필요한 행동(메시지)을 먼저 정하고 그 행동에 맞는 객체와 데이터를 나중에 정하기 때문이다. getter가 전혀 없다는 뜻은 아니다. 비율 할인 정책이 정가를 알아야 해서 `Screening.getFixedPrice`와 `Movie.getFee`가 생기듯, 차이는 모든 필드에 getter와 setter를 추측으로 여는지, 협력이 요구한 메서드만 여는지에 있다.

## 응집도 수준 (낮음 → 높음)

전통적 7단계 분류:

| 수준 | 응집도 | 설명 |
|---|---|---|
| 우연적 (Coincidental) | **최악** | 모듈 요소가 아무 관련 없이 묶임 |
| 논리적 (Logical) | 낮음 | 논리적으로 비슷하다고 묶음 (예: "모든 I/O 유틸") |
| 시간적 (Temporal) | 낮음 | 같은 시점에 실행돼서 묶음 (예: "초기화 모음") |
| 절차적 (Procedural) | 중 | 순서에 따라 실행되는 절차 묶음 |
| 통신적 (Communicational) | 중 | 같은 데이터를 다루는 절차 |
| 순차적 (Sequential) | 높음 | 한 작업의 출력이 다음 작업의 입력 |
| **기능적 (Functional)** | 높음 | 단일 목적에 집중 |

이 분류는 절차적 모듈을 설명해 온 전통적 어휘다. 모든 클래스를 한 칸에 기계적으로 채점하기보다, 서로 다른 변경 이유가 섞였는지 찾는 보조 도구로 쓴다.

## 결합도 수준 (낮음 → 높음)

| 수준 | 결합도 | 설명 |
|---|---|---|
| **데이터 (Data)** | 낮음 | 파라미터로 필요한 데이터 전달 |
| 스탬프 (Stamp) | 낮음 | 전체 자료구조 전달 (일부만 사용) |
| 제어 (Control) | 중 | 제어 플래그를 전달해 내부 분기 |
| 외부 (External) | 중 | 외부 표준, 형식에 의존 |
| 공통 (Common) | 높음 | 전역 변수 공유 |
| **내용 (Content)** | 매우 높음 | 다른 모듈 내부 직접 조작 |

데이터 결합이 항상 최선은 아니다. 도메인 객체의 행동을 호출하는 편이 원시 값 여러 개를 꺼내 외부에서 판단하는 것보다 캡슐화를 잘 지킬 수 있다. 협력에 필요한 최소 계약만 알고 내부 표현에는 의존하지 않는 게 중요하다.

## 좋은 설계의 방향

높은 응집도와 낮은 결합도는 절대 점수가 아니라 서로 충돌할 수 있는 경향이다. 책임을 분리하면 한 클래스의 응집도는 높아져도 객체 사이 협력은 늘 수 있으므로 실제 변경 비용으로 평가한다.

### 응집도 높이는 방법
- **단일 책임 원칙 (SRP)**: 한 클래스, 함수는 한 이유로만 바뀌어야 함
- **도메인 기반 묶음**: 기술이 아니라 **비즈니스 개념**으로 모듈 나누기
- **Feature-based 구조**: `src/users/`, `src/orders/` (기술 레이어별 `controllers/`, `services/` 대신)

### 결합도 낮추는 방법
- **의존성 역전 (DIP)**: 구체 구현이 아니라 **추상(인터페이스)**에 의존
- **캡슐화**: 내부 상태를 감추고 **메시지**로만 소통
- **이벤트 기반**: 직접 호출 대신 이벤트로 느슨한 연결
- **DI (Dependency Injection)**: 의존을 외부에서 주입

## 캡슐화의 역할

캡슐화는 두 축에 **동시에** 영향:
- **응집도 ↑**: 관련된 상태, 행위를 한 객체에 모음 → 기능적 응집
- **결합도 ↓**: 외부는 인터페이스만 알고 내부 구현 몰라도 됨

**Tell, Don't Ask** 원칙:
- 나쁜 예: `if (user.getRole() === 'admin') user.setPermissions(...)`  (결합도 높음)
- 좋은 예: `user.promoteToAdmin()`  (응집도 높음, 결합도 낮음)

## Anemic vs Rich 도메인 모델 연결

([[OOP-vs-Procedural-In-Practice]] 참고)

- **Anemic**: 데이터와 로직을 분리한 뒤 같은 도메인 규칙이 여러 Service에 흩어지면 응집도가 낮아지고 변경 결합도가 높아질 수 있다.
- **Rich**: 관련 도메인 규칙을 객체와 함께 두면 응집도와 캡슐화를 높일 수 있다. 다만 모든 규칙을 한 엔티티에 몰면 god object와 높은 결합도를 만들 수 있다.

## 측정 지표

완벽한 측정은 어렵다. 아래 지표는 비교를 돕지만 설계 품질을 단독으로 판정하지 않는다.
- **LCOM (Lack of Cohesion of Methods)**: 클래스 내 메서드 간 필드 공유 비율
- **Afferent / Efferent Coupling**: 모듈로 들어오는/나가는 의존 개수
- **Instability**: `Ce / (Ca + Ce)` — 변경 영향 범위
- 정적 분석 도구: SonarQube, JDepend, NDepend

## 실무 예시

### 좋은 예 — 높은 응집, 낮은 결합
```
class Order {
  private items: OrderItem[];
  private status: OrderStatus;

  confirm() { ... }        // 주문 도메인의 행위
  cancel() { ... }
  totalAmount() { ... }
}

class OrderService {
  constructor(
    private repo: OrderRepository,       // 추상
    private payment: PaymentPort,         // 추상
  ) {}

  placeOrder(cmd) {
    const order = new Order(cmd.items);
    order.confirm();
    this.repo.save(order);
    this.payment.charge(order.totalAmount());
  }
}
```

### 나쁜 예 — 낮은 응집, 높은 결합
```
class UtilService {
  sendEmail() {}
  calculateTax() {}
  renderPdf() {}
  validateOrder() {}    // ← 서로 관련 없는 기능 모음 (논리적 응집)
}

// + 직접 구체 클래스 new → 교체 불가, 테스트 어려움
class OrderService {
  constructor() {
    this.util = new UtilService();       // 구체 의존
    this.db = new MySQLConnection();     // 구체 의존
  }
}
```

## 면접 체크포인트

- 응집도, 결합도의 정의와 차이
- 변경 관점에서 의존성과 결합도의 차이, 공개 getter가 구현일 수 있는 이유
- 기능적 응집이 왜 최상인가
- 데이터 결합이 최상이고 내용 결합이 최악인 이유
- 캡슐화가 두 지표에 동시에 영향을 주는 메커니즘
- "Tell, Don't Ask" 원칙이 응집, 결합에 기여하는 방식
- SOLID 원칙이 두 지표 중 무엇을 다루는가 (SRP=응집, DIP=결합 중심)

## 출처
- [매일메일 — 응집도와 결합도](https://www.maeil-mail.kr/question/139)
- 조영호 강사, [응집도](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234588)
- 조영호 강사, [결합도](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234589)
- 조영호 강사, [객체 구현하기](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234580)

## 관련 문서
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
- [[Code-Quality-Criteria|코드 품질의 기준]]
- [[OOP-vs-Procedural-In-Practice|OOP vs 절차지향 실무]]
- [[Elegant-OOP-Design|우아한 객체지향]]
- [[Responsibility-Driven-Design|책임 주도 설계]]
