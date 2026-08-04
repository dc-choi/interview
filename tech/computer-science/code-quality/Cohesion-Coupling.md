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

데이터 결합이 항상 최선은 아니다. 도메인 객체의 행동을 호출하는 편이 원시 값 여러 개를 꺼내 외부에서 판단하는 것보다 캡슐화를 잘 지킬 수 있다. 핵심은 협력에 필요한 최소 계약만 알고 내부 표현에는 의존하지 않는 것이다.

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
- ❌ `if (user.getRole() === 'admin') user.setPermissions(...)`  (결합도 높음)
- ✅ `user.promoteToAdmin()`  (응집도 높음, 결합도 낮음)

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
- 기능적 응집이 왜 최상인가
- 데이터 결합이 최상이고 내용 결합이 최악인 이유
- 캡슐화가 두 지표에 동시에 영향을 주는 메커니즘
- "Tell, Don't Ask" 원칙이 응집, 결합에 기여하는 방식
- SOLID 원칙이 두 지표 중 무엇을 다루는가 (SRP=응집, DIP=결합 중심)

## 출처
- [매일메일 — 응집도와 결합도](https://www.maeil-mail.kr/question/139)
- 조영호 강사, [응집도](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234588)
- 조영호 강사, [결합도](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234589)

## 관련 문서
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
- [[Code-Quality-Criteria|코드 품질의 기준]]
- [[OOP-vs-Procedural-In-Practice|OOP vs 절차지향 실무]]
- [[Elegant-OOP-Design|우아한 객체지향]]
