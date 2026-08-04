---
tags: [architecture, design]
status: done
category: "Architecture & Design"
aliases: ["OOP"]
---

# OOP

객체지향 프로그래밍은 기능을 객체들의 협력으로 구성하는 설계 방식이다. 객체는 상태만 담는 데이터 그릇이 아니라 메시지를 받아 책임을 수행하고 자신의 상태를 스스로 관리한다. 클래스를 사용했다고 자동으로 객체지향 설계가 되는 것은 아니다.

## 기본 어휘

- 책임: 객체가 아는 것과 수행해야 하는 것
- 메시지: 협력자가 수신 객체에게 원하는 행동
- 메서드: 수신 객체가 메시지를 처리하는 구체적인 구현
- 역할: 여러 객체가 협력 안에서 대체하며 수행할 수 있는 책임의 집합
- 협력: 객체들이 메시지를 주고받아 사용 사례를 완성하는 관계

메시지와 메서드를 분리하면 송신자는 수행 방법을 몰라도 된다. 같은 메시지를 서로 다른 객체가 처리하는 다형성은 이 분리에서 나온다.

```typescript
interface PaymentMethod {
  pay(amount: Money): Promise<PaymentResult>
}

class Checkout {
  constructor(private readonly payment: PaymentMethod) {}

  complete(total: Money): Promise<PaymentResult> {
    return this.payment.pay(total)
  }
}
```

`Checkout`은 카드나 계좌 SDK가 아니라 `pay`라는 역할에 의존한다. 구현 교체가 실제로 안전하려면 모든 구현이 성공, 실패, 취소와 부수효과에 관한 같은 행동 계약을 지켜야 한다.

## 주요 설계 개념

### 추상화

특정 맥락에서 중요한 책임과 계약을 드러내고 불필요한 세부를 감춘다. 공통 필드를 뽑아 상위 클래스를 만드는 일만 추상화는 아니다. 함수, 객체, API와 안정된 도메인 개념도 추상화가 될 수 있다.

### 캡슐화

단순히 필드를 `private`로 만드는 것이 아니라 변경 가능성이 높은 상태와 판단 규칙을 한 경계 안에 숨긴다. 호출자가 getter로 상태를 꺼내 대신 판단한다면 문법상 접근 제한이 있어도 캡슐화가 약하다.

### 다형성

클라이언트가 구체 타입을 검사하지 않고 같은 메시지로 여러 구현과 협력하게 한다. 조건문을 없애는 것이 목적이 아니라 변화하는 행동을 안정된 역할 뒤로 보내는 것이 목적이다.

### 상속과 합성

상속은 코드 복사 제거보다 의미 있는 하위 타입 관계와 대체 가능성이 먼저다. 부모의 내부 구현에 강하게 결합하고 독립적인 변경 축을 한 계층에 섞을 수 있으므로, 기능 재사용만 필요할 때는 객체 합성을 먼저 검토한다.

TypeScript는 구조적 타입 시스템을 사용한다. `implements`를 명시하지 않아도 모양이 맞으면 대입할 수 있지만, 컴파일러가 도메인의 사전조건, 사후조건과 부수효과까지 검증해 주는 것은 아니다.

## 절차적인 코드와 비교

| 관점 | 절차적 설계 | 객체지향 설계 |
|---|---|---|
| 제어 | 중앙 함수나 서비스가 흐름을 통제 | 객체들이 메시지로 책임을 분담 |
| 데이터 | 외부 절차가 읽고 갱신 | 객체가 상태와 규칙을 함께 보호 |
| 변화 | 조건문과 중앙 절차에 퍼지기 쉬움 | 예상한 변화 축을 역할 뒤에 캡슐화 |
| 적합성 | 단순 CRUD, 선형 변환에 명확할 수 있음 | 복잡하고 함께 변하는 도메인 규칙에 유리 |

둘은 선악 구분이 아니다. 객체로 나누면서 협력 비용만 커지는 단순 작업은 명확한 절차나 함수가 더 낫다.

## SOLID를 정확히 읽기

| 원칙 | 핵심 |
|---|---|
| SRP | 모듈은 하나의 변경 이유를 갖도록 함께 변하는 책임을 모은다. |
| OCP | 관찰된 변화 축에서 안정된 코드를 수정하기보다 구현을 추가해 확장한다. |
| LSP | 하위 타입은 상위 타입의 행동 계약과 불변조건을 보존해 대체 가능해야 한다. |
| ISP | 클라이언트가 사용하지 않는 연산과 그 변경에 의존하지 않도록 역할을 나눈다. |
| DIP | 정책을 담은 상위 수준 코드와 세부 구현 모두 안정된 추상화에 의존한다. |

SOLID를 클래스 수를 늘리는 체크리스트로 쓰면 과설계가 된다. 실제 변경이 발생했을 때 책임과 의존성의 방향을 평가하고 리팩터링하는 기준으로 사용한다. DI 컨테이너는 구현을 조립하는 도구일 뿐, 나쁜 책임 배치를 자동으로 고치지 않는다.

## 설계 순서

1. 사용 사례에서 시스템 책임과 메시지를 찾는다.
2. 필요한 정보를 알고 있거나 생성 관계가 자연스러운 객체에 책임을 할당한다.
3. 타입별 행동 차이는 역할과 다형성 후보로 본다.
4. 상태와 메서드를 구현하고 테스트로 행동 계약을 고정한다.
5. 변경 후 응집도, 결합도, 대체 가능성과 인터페이스 크기를 다시 평가한다.

## 출처

- 얄팍한 코딩사전, [객체지향 프로그래밍](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=236068)
- 조영호 강사, [객체지향 설계 원칙](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234570)
- 조영호 강사, [메시지와 메서드의 분리](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234582)
- 조영호 강사, [리스코프 치환 원칙](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283700)
- [TypeScript 공식 문서, Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility)
- yongsoocho, [추상화](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137146)
- yongsoocho, [캡슐화](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=139051)
- yongsoocho, [상속](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=139590)
- yongsoocho, [다형성](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137144)
- yongsoocho, [단일 책임 원칙](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137160)
- yongsoocho, [개방 폐쇄 원칙](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138067)
- yongsoocho, [리스코프 치환 원칙](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138854)
- yongsoocho, [인터페이스 분리 원칙](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=137143)
- yongsoocho, [의존 역전 원칙](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=139594)

## 관련 문서

- [[Responsibility-Driven-Design|책임 주도 설계와 GRASP]]
- [[Object-Design-Principles|객체 설계 원칙과 리팩터링]]
- [[Generalization-vs-Abstraction|일반화와 추상화]]
- [[OOP-vs-Procedural-In-Practice|OOP와 절차지향 실무]]
- [[VO-DTO|VO와 DTO]]
