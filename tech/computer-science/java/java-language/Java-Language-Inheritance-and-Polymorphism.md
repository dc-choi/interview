---
tags: [java, inheritance, polymorphism, casting, abstract-class, interface]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Inheritance and Polymorphism", "Java 상속과 다형성"]
---

# Java 상속과 다형성

상속은 subtype 관계를 만들고 다형성은 상위 타입의 client가 여러 하위 구현과 협력하게 한다. memory 그림보다 compile-time type selection과 runtime method dispatch를 구분해야 정확하게 설명할 수 있다.

## 상속 관계

~~~java
class Vehicle {
    void move() {}
}

final class ElectricCar extends Vehicle {
    @Override
    void move() {}
}
~~~

- normal class는 하나의 direct superclass만 가질 수 있고 여러 interface를 구현할 수 있다.
- constructor는 상속되지 않는다. private member도 subclass의 inherited member가 아니지만 생성된 object에는 superclass가 정의한 state가 포함될 수 있다.
- 상속 object를 parent object와 child object 두 개로 나누거나 실제 heap layout을 확정해 설명하지 않는다. 하나의 object가 superclass contract와 subclass contract를 함께 만족한다고 이해한다.
- code reuse만을 위해 상속하면 강한 결합과 fragile base class 문제가 생길 수 있다. 대체 가능한 is-a 관계가 아니면 composition과 delegation을 검토한다.

## override, hiding과 field access

instance method override는 runtime class를 기준으로 가장 구체적인 구현을 선택한다.

- `@Override`는 signature 실수를 compile time에 잡는다.
- return type은 covariant할 수 있고 access를 더 좁힐 수 없다.
- static method는 override되지 않고 hide된다.
- field access는 polymorphic dispatch 대상이 아니며 expression의 compile-time type에 따라 선택된다.
- `private`와 `final` method는 override할 수 없다.
- overload 후보와 선택은 compile time type과 argument 규칙으로 결정된다.

`super.member`는 direct superclass 관점의 field나 method implementation을 명시적으로 선택한다. 일반 instance call과 달리 overriding dispatch를 우회하려는 의도가 드러난다.

## constructor chain

subclass instance 생성 과정은 superclass constructor를 먼저 완료한 뒤 subclass 초기화를 이어 간다. 명시적 superclass constructor invocation이 없으면 접근 가능한 no-arg `super()` 호출이 암시된다.

Java SE 26에서는 `super(...)` 앞에 제한된 prologue statement를 둘 수 있지만 early construction context에서 생성 중인 instance 접근은 제한된다. 자세한 규칙은 [[Java-Language-Construction-and-Encapsulation|Java 생성과 캡슐화]]에서 다룬다.

## polymorphic reference와 dispatch

~~~java
Vehicle vehicle = new ElectricCar();
vehicle.move();
~~~

- assignment의 widening reference conversion은 안전하며 별도 cast가 필요 없다.
- compile-time type인 `Vehicle`가 접근 가능한 member 집합을 정한다.
- selected instance method가 override됐다면 runtime class인 `ElectricCar`의 구현이 실행된다.
- variable type을 바꿔도 object 자체가 다른 object로 변환되지는 않는다.

다형성은 상위 타입 parameter, collection과 loop를 통해 구현별 분기를 줄인다. client가 subtype마다 `instanceof`와 switch를 반복하면 abstraction이 behavior를 충분히 담지 못했는지 확인한다.

## downcast와 instanceof

downcast는 reference의 static type을 좁히며 runtime check가 필요하다. 실제 object가 target type의 instance가 아니면 `ClassCastException`이 발생한다.

~~~java
if (vehicle instanceof ElectricCar electricCar) {
    electricCar.move();
}
~~~

pattern matching `instanceof`는 test가 성공한 범위에서 cast된 variable을 제공한다. `null instanceof SomeType`은 `false`다. type test가 필요한 boundary도 있지만 구현별 behavior를 호출하려는 목적이라면 virtual method로 옮길 수 있는지 먼저 본다.

## abstract class

abstract class는 직접 instance화할 수 없으며 abstract method와 concrete method, instance field와 constructor를 함께 가질 수 있다.

- abstract method가 하나라도 있는 class는 abstract여야 한다.
- abstract class가 abstract method를 반드시 가져야 하는 것은 아니다.
- concrete subclass는 남은 abstract method를 구현하거나 자신도 abstract여야 한다.
- 공통 state와 protected extension point가 실제로 필요한 관련 타입 계층에 사용한다.

## 현대 Java interface

interface를 abstract method만 있는 타입으로 설명하면 현재 Java와 맞지 않는다.

| member | interface에서의 규칙 |
|---|---|
| field | 암시적으로 `public static final` |
| abstract method | 일반적으로 `public abstract` |
| default method | instance implementation을 제공하며 override 가능 |
| static method | interface 자체에 속함 |
| private method | interface 내부 구현 공유에 사용 |

class는 여러 interface를 구현할 수 있다. 여러 interface의 default method가 충돌하면 class method 우선, 더 구체적인 interface 우선 같은 규칙이 적용되고 해결되지 않는 모호성은 구현 class가 명시적으로 override해야 한다. 다중 구현이 가능한 이유를 interface에 구현이 없기 때문이라고만 설명할 수 없다.

interface에는 instance field와 constructor가 없고 직접 instance화할 수 없다. 역할 계약을 조합하는 데 적합하지만 versioning 중 default method 추가가 모든 semantic 충돌을 없애 주지는 않는다.

## 면접 체크포인트

- 상속 object를 두 object로 설명하면 안 되는 이유
- compile-time member selection과 runtime overriding dispatch
- override, overload와 static hiding의 차이
- upcast와 downcast의 runtime check 차이
- pattern matching `instanceof`의 scope
- abstract class와 현대 interface의 상태와 구현 차이
- interface default method 충돌 해결 필요성
- 상속보다 composition이 나은 조건

## 출처

- [Java SE 26 Language Specification, Conversions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-5.html)
- [Java SE 26 Language Specification, Classes](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html)
- [Java SE 26 Language Specification, Interfaces](https://docs.oracle.com/javase/specs/jls/se26/html/jls-9.html)
- [Java SE 26 Language Specification, Expressions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html)
- [OpenJDK JEP 394, Pattern Matching for instanceof](https://openjdk.org/jeps/394)
- 김영한 강사, [상속 - 시작](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194704)
- 김영한 강사, [상속 관계](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194705)
- 김영한 강사, [상속과 메모리 구조](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194706)
- 김영한 강사, [상속과 기능 추가](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194707)
- 김영한 강사, [상속과 메서드 오버라이딩](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194708)
- 김영한 강사, [상속과 접근 제어](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194709)
- 김영한 강사, [super - 부모 참조](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194710)
- 김영한 강사, [super - 생성자](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194711)
- 김영한 강사, [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194712)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194713)
- 김영한 강사, [다형성 시작](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194714)
- 김영한 강사, [다형성과 캐스팅](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194715)
- 김영한 강사, [캐스팅의 종류](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194716)
- 김영한 강사, [다운캐스팅과 주의점](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194717)
- 김영한 강사, [instanceof](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194718)
- 김영한 강사, [다형성과 메서드 오버라이딩](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194719)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194720)
- 김영한 강사, [다형성 활용1](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194721)
- 김영한 강사, [다형성 활용2](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194722)
- 김영한 강사, [다형성 활용3](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194723)
- 김영한 강사, [추상 클래스1](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194724)
- 김영한 강사, [추상 클래스2](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194725)
- 김영한 강사, [인터페이스](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194726)
- 김영한 강사, [인터페이스 - 다중 구현](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194727)
- 김영한 강사, [클래스와 인터페이스 활용](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194728)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194729)

## 관련 문서

- [[Java-Language-Object-Model|Java 객체 모델]]
- [[Java-Language-OOP-Design-and-OCP|Java 객체 협력과 OCP]]
- [[OOP|객체 지향 프로그래밍]]
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
