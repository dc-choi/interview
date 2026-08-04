---
tags: [java, oop, polymorphism, open-closed-principle, strategy, null-object]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java OOP Design and OCP", "Java 객체 협력과 OCP"]
---

# Java 객체 협력과 OCP

객체 지향 설계는 data와 method를 class에 넣는 문법에서 끝나지 않는다. object가 자기 invariant를 지키고, client가 안정적인 역할에 의존하며, 변경되는 구현을 교체할 수 있게 만드는 것이 핵심이다.

## 절차와 객체는 대립어가 아니다

procedure 중심 코드는 data와 처리 순서를 별도 함수가 조정한다. object 중심 코드는 관련 data와 behavior를 책임 단위로 묶고 object끼리 message를 주고받게 한다.

- 작은 계산이나 명확한 pipeline은 절차적 표현이 더 단순할 수 있다.
- field만 모은 data class와 외부 utility method만 늘리면 behavior와 invariant가 다시 분리된다.
- method extraction은 중복 제거와 이름 부여에 유용하지만 그 method를 어느 책임에 둘지는 별도 설계 판단이다.
- class 수보다 변경 이유, data ownership과 invariant가 응집돼 있는지를 본다.

## 책임을 object 안으로 이동한다

~~~java
final class Account {
    private long balance;

    void withdraw(long amount) {
        if (amount <= 0 || balance < amount) throw new IllegalArgumentException();
        balance -= amount;
    }
}
~~~

client가 balance를 읽고 계산한 뒤 다시 쓰는 대신 `withdraw`를 요청하면 검증과 상태 전이가 한 경계에 남는다. object는 자기 data를 가장 잘 아는 단위지만 모든 orchestration을 한 object에 몰아야 한다는 뜻은 아니다. 여러 object의 workflow와 transaction은 application service가 조정할 수 있다.

## 역할과 구현을 분리한다

interface나 abstract type은 client가 기대하는 역할을 표현하고 concrete class는 구현을 제공한다.

~~~java
interface PayMethod {
    boolean pay(long amount);
}

final class PaymentService {
    private final PayMethod payMethod;

    PaymentService(PayMethod payMethod) {
        this.payMethod = payMethod;
    }

    boolean pay(long amount) {
        return payMethod.pay(amount);
    }
}
~~~

`PaymentService`는 concrete payment type을 알지 않으므로 implementation을 constructor에서 교체할 수 있다. interface를 만들었다는 사실보다 client가 interface에만 의존하고 구현 선택 책임이 composition root로 이동했는지가 중요하다.

## OCP를 변경 금지로 해석하지 않는다

OCP는 예상한 variation point에서 새 구현을 추가할 때 안정적인 client의 수정을 피하도록 설계하라는 원칙이다. 어떤 요구 변경에도 기존 code를 한 줄도 바꾸지 않는다는 약속은 아니다.

- open for extension은 새로운 implementation과 policy를 추가할 수 있다는 뜻이다.
- closed for modification은 보호하려는 stable client와 core policy를 불필요하게 고치지 않는다는 뜻이다.
- object 생성, dependency wiring, registry와 configuration 같은 composition code는 새 구현을 선택하기 위해 바뀔 수 있다.
- 모든 가능성을 미리 interface로 만들면 복잡성과 간접 호출만 늘 수 있다. 실제로 변하는 축에 abstraction을 둔다.
- client가 interface를 받은 뒤 concrete type별 `instanceof` 분기를 반복하면 OCP의 이점이 약해진다.

## Strategy와 Null Object

Strategy는 바뀌는 algorithm이나 policy를 공통 역할 뒤에 두고 runtime 또는 구성 시점에 교체한다. payment, discount와 message sender처럼 동일한 목적을 여러 방식으로 수행하는 경우에 적합하다.

Null Object는 역할을 구현하는 no-op 또는 명시적 실패 object로 `null` 분기를 줄인다. 다만 다음 조건을 확인한다.

- 값 부재가 정상 domain state인지
- 실패를 조용히 숨기지 않는지
- 관측과 오류 원인이 사라지지 않는지
- default behavior가 보안이나 금액 처리에서 fail-open이 되지 않는지

존재하지 않는 payment method를 failure result로 표현하는 것은 가능하지만 설정 오류라면 빠르게 예외를 내는 편이 더 안전할 수 있다.

## 변경에 강한 협력 체크리스트

- client가 concrete class가 아니라 필요한 최소 역할에 의존하는가
- 새 구현 추가 시 수정되는 곳이 composition boundary에 모이는가
- object가 자신의 상태 전이 규칙을 지키는가
- interface가 client 관점의 behavior를 표현하는가
- 상속 없이 composition으로도 같은 재사용을 얻을 수 있는가
- null, default와 failure semantics가 명시적인가
- abstraction이 실제 변경 빈도와 test seam을 개선하는가

## 면접 체크포인트

- 절차적 코드와 객체 지향 코드의 선택 기준
- data와 behavior를 묶는 것이 invariant 보호로 이어지는 과정
- 역할과 구현 분리가 polymorphism을 만드는 방식
- OCP가 모든 code의 무수정을 뜻하지 않는 이유
- Strategy를 적용할 variation point
- Null Object가 오류를 숨길 수 있는 조건

## 출처

- [Java SE 26 Language Specification, Classes](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html)
- [Java SE 26 Language Specification, Interfaces](https://docs.oracle.com/javase/specs/jls/se26/html/jls-9.html)
- [Java SE 26 Language Specification, Method Invocation](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html)
- 김영한 강사, [강의 소개](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194628)
- 김영한 강사, [수업 자료](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194629)
- 김영한 강사, [절차 지향 프로그래밍1 - 시작](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194661)
- 김영한 강사, [절차 지향 프로그래밍2 - 데이터 묶음](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194662)
- 김영한 강사, [절차 지향 프로그래밍3 - 메서드 추출](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194663)
- 김영한 강사, [클래스와 메서드](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194664)
- 김영한 강사, [객체 지향 프로그래밍](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194665)
- 김영한 강사, [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194666)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194667)
- 김영한 강사, [좋은 객체 지향 프로그래밍이란?](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194730)
- 김영한 강사, [다형성 - 역할과 구현 예제1](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194731)
- 김영한 강사, [다형성 - 역할과 구현 예제2](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194732)
- 김영한 강사, [다형성 - 역할과 구현 예제3](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194733)
- 김영한 강사, [OCP(Open-Closed Principle) 원칙](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194734)
- 김영한 강사, [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194735)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194736)
- 김영한 강사, [다음으로](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194738)

## 관련 문서

- [[Java-Language-Inheritance-and-Polymorphism|Java 상속과 다형성]]
- [[OOP|객체 지향 프로그래밍]]
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
- [[Strategy패턴이란|Strategy 패턴]]
- [[Cohesion-Coupling|응집도와 결합도]]
