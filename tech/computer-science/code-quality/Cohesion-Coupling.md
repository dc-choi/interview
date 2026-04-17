---
tags: [cs, code-quality, design, oop]
status: done
category: "CS - 코드 품질"
aliases: ["Cohesion Coupling", "응집도 결합도"]
---

# 응집도(Cohesion)와 결합도(Coupling)

소프트웨어 설계 품질을 재는 두 축. **"모듈 안은 강하게, 모듈 사이는 느슨하게"**(High Cohesion, Low Coupling)가 경험칙. SOLID 원칙도 이 둘을 이루는 세부 전략.

## 정의

**응집도(Cohesion)**: 모듈 내부 요소들이 **얼마나 밀접하게 관련되어 있는가**. 높을수록 모듈 하나가 한 가지 책임에 집중.

**결합도(Coupling)**: 모듈 간 **의존의 정도·수·깊이**. 낮을수록 한 모듈의 변경이 다른 모듈로 전파되지 않음.

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
| **기능적 (Functional)** | **최상** | 단일 목적에 집중 |

실무 목표: **기능적 응집도**. 한 모듈·클래스·함수는 **"하나의 일"** 에 집중.

## 결합도 수준 (낮음 → 높음)

| 수준 | 결합도 | 설명 |
|---|---|---|
| **데이터 (Data)** | **최상 (낮음)** | 파라미터로 기본 데이터만 전달 |
| 스탬프 (Stamp) | 낮음 | 전체 자료구조 전달 (일부만 사용) |
| 제어 (Control) | 중 | 제어 플래그를 전달해 내부 분기 |
| 외부 (External) | 중 | 외부 표준·형식에 의존 |
| 공통 (Common) | 높음 | 전역 변수 공유 |
| **내용 (Content)** | **최악 (높음)** | 다른 모듈 내부 직접 조작 |

실무 목표: **데이터 결합**. 필요한 값만 주고 받는 순수 함수에 가까운 형태.

## 좋은 설계 = 응집도 ↑ + 결합도 ↓

### 응집도 높이는 방법
- **단일 책임 원칙 (SRP)**: 한 클래스·함수는 한 이유로만 바뀌어야 함
- **도메인 기반 묶음**: 기술이 아니라 **비즈니스 개념**으로 모듈 나누기
- **Feature-based 구조**: `src/users/`·`src/orders/` (기술 레이어별 `controllers/`·`services/` 대신)

### 결합도 낮추는 방법
- **의존성 역전 (DIP)**: 구체 구현이 아니라 **추상(인터페이스)**에 의존
- **캡슐화**: 내부 상태를 감추고 **메시지**로만 소통
- **이벤트 기반**: 직접 호출 대신 이벤트로 느슨한 연결
- **DI (Dependency Injection)**: 의존을 외부에서 주입

## 캡슐화의 역할

캡슐화는 두 축에 **동시에** 영향:
- **응집도 ↑**: 관련된 상태·행위를 한 객체에 모음 → 기능적 응집
- **결합도 ↓**: 외부는 인터페이스만 알고 내부 구현 몰라도 됨

**Tell, Don't Ask** 원칙:
- ❌ `if (user.getRole() === 'admin') user.setPermissions(...)`  (결합도 높음)
- ✅ `user.promoteToAdmin()`  (응집도 높음, 결합도 낮음)

## Anemic vs Rich 도메인 모델 연결

([[OOP-vs-Procedural-In-Practice]] 참고)

- **Anemic**: 데이터와 로직 분리 → 같은 도메인 규칙이 여러 Service에 흩어짐 (낮은 응집) → Service끼리 데이터 주고받음 (높은 결합)
- **Rich**: 도메인 규칙이 엔티티 안에 → 응집도 최고, 결합도 최소

## 측정 지표

완벽한 측정은 어렵지만 간접 지표:
- **LCOM (Lack of Cohesion of Methods)**: 클래스 내 메서드 간 필드 공유 비율
- **Afferent / Efferent Coupling**: 모듈로 들어오는/나가는 의존 개수
- **Instability**: `Ce / (Ca + Ce)` — 변경 영향 범위
- 정적 분석 도구: SonarQube·JDepend·NDepend

## 실무 예시

### 좋은 예 — 높은 응집·낮은 결합
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

### 나쁜 예 — 낮은 응집·높은 결합
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

- 응집도·결합도의 정의와 차이
- 기능적 응집이 왜 최상인가
- 데이터 결합이 최상이고 내용 결합이 최악인 이유
- 캡슐화가 두 지표에 동시에 영향을 주는 메커니즘
- "Tell, Don't Ask" 원칙이 응집·결합에 기여하는 방식
- SOLID 원칙이 두 지표 중 무엇을 다루는가 (SRP=응집, DIP=결합 중심)

## 출처
- [매일메일 — 응집도와 결합도](https://www.maeil-mail.kr/question/139)

## 관련 문서
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
- [[Code-Quality-Criteria|코드 품질의 기준]]
- [[OOP-vs-Procedural-In-Practice|OOP vs 절차지향 실무]]
- [[Elegant-OOP-Design|우아한 객체지향]]
