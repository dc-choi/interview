---
tags: [java, inheritance, polymorphism, casting, abstract-class, interface]
status: done
verified_at: 2026-09-30
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

class 다중 상속을 막는 핵심 이유는 상태와 구현의 충돌이다. 두 superclass가 같은 field나 같은 signature의 구현을 물려주면 어느 constructor가 field를 초기화하고 어느 구현을 실행할지 모호해진다(diamond problem). Java는 타입의 다중 상속을 interface로 허용하고, Java 8 default method로 구현의 다중 상속을 제한적으로 들였다. 같은 signature의 abstract method만 겹치면 구현이 하나뿐이라 모호성이 없다. default method 충돌은 아래 interface 절의 규칙으로 풀고, 구현 class가 override한 뒤 `InterfaceA.super.method()`로 한쪽 구현을 고를 수 있다. 선언은 `class Bird extends Animal implements Fly, Swim`처럼 `extends`를 먼저 쓴다.

## override, hiding과 field access

instance method override는 runtime class를 기준으로 가장 구체적인 구현을 선택한다.

- `@Override`는 signature 실수를 compile time에 잡는다.
- return type은 covariant할 수 있고 access를 더 좁힐 수 없다.
- static method는 override되지 않고 hide된다.
- field access는 polymorphic dispatch 대상이 아니며 expression의 compile-time type에 따라 선택된다.
- `private`와 `final` method는 override할 수 없다.
- `throws`는 checked exception만 제한한다. overriding이나 hiding method가 선언한 각 checked exception은 상위 method `throws`의 type이거나 그 하위 type이어야 하고, 상위에 checked exception 선언이 없으면 하위도 선언할 수 없다. 선언을 줄이거나 좁히는 것과 unchecked exception 선언은 자유롭고 interface method 구현에도 같은 규칙이 적용된다.
- overload 후보와 선택은 compile time type과 argument 규칙으로 결정된다.

`super.member`는 direct superclass 관점의 field나 method implementation을 명시적으로 선택한다. 일반 instance call과 달리 overriding dispatch를 우회하려는 의도가 드러난다.

throws 규칙의 이유는 대체 가능성이다. `Parent p = new Child()`로 호출하는 client는 compile time에 `Parent`의 선언만 보고 checked exception 처리를 강제받으므로, 하위 구현이 더 넓은 checked exception을 던지면 그 예외가 강제된 처리 밖으로 샌다. 그래서 `Runnable.run()` 구현은 `Thread.sleep()`의 `InterruptedException`을 선언해 밖으로 던질 수 없어 내부에서 처리하거나 unchecked로 감싸야 하고, checked 실패를 전달해야 하는 task는 `Callable.call()`을 쓴다. `InterruptedException`을 감쌀 때는 interrupt status를 복원해 취소 신호를 잃지 않는다([[Java-Threads-Lifecycle-and-Cancellation|thread lifecycle과 취소]]). 실패 계약을 checked로 둘지는 [[Java-Exception-Record-Collection-Checked-Unchecked|checked와 unchecked 선택]]에서 다룬다.

## constructor chain

subclass instance 생성 과정은 superclass constructor를 먼저 완료한 뒤 subclass 초기화를 이어 간다. 명시적 superclass constructor invocation이 없으면 접근 가능한 no-arg `super()` 호출이 암시된다.

- 부모가 parameter 있는 constructor만 선언하면 default constructor가 만들어지지 않는다. 자식 constructor가 `super(10)`처럼 부모 constructor를 명시적으로 호출하지 않으면 암시된 `super()`가 호출할 no-arg constructor가 없어 compile error다.
- `this(...)`로 위임해도 위임 사슬 끝의 constructor가 superclass constructor를 정확히 한 번 호출한다. 위임이 자기 자신으로 돌아오면 compile error다.
- `C extends B`, `B extends A` 계층에서 `new C()`는 C의 constructor에서 시작하지만 각 constructor가 먼저 상위 constructor를 호출하므로 body는 A, B, C 순서로 완료된다. 자식이 부모가 초기화한 상태를 쓸 수 있게 하는 순서다.
- 자식은 부모의 private field를 직접 대입하지 않고 `super(name, price)`로 부모가 초기화하게 한다. override한 method에서는 `super.print()`로 공통 동작을 먼저 실행한 뒤 자기 부분을 덧붙일 수 있다.

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

downcast는 reference의 static type을 좁히며 runtime check가 필요하다. 실제 object가 target type의 instance가 아니면 `ClassCastException`이 발생하므로 type test 뒤에 cast한다. test와 cast를 묶는 pattern matching `instanceof`, pattern variable의 flow scoping과 field shadowing 함정은 [[Java-Language-Inheritance-and-Polymorphism-Pattern-Matching|downcast와 instanceof 패턴 매칭]]에서 다룬다.

## abstract class

abstract class는 직접 instance화할 수 없으며 abstract method와 concrete method, instance field와 constructor를 함께 가질 수 있다.

- abstract method가 하나라도 있는 class는 abstract여야 한다.
- abstract class가 abstract method를 반드시 가져야 하는 것은 아니다.
- concrete subclass는 남은 abstract method를 구현하거나 자신도 abstract여야 한다.
- 공통 state와 protected extension point가 실제로 필요한 관련 타입 계층에 사용한다.

abstract는 두 실수를 compile error로 바꾼다. 추상 개념인 부모를 직접 `new`하는 실수와, 새 subclass가 핵심 method override를 빠뜨려 부모의 기본 구현이 조용히 실행되는 실수다. 의미 없는 기본 구현 대신 abstract method를 두면 구현 누락이 compile 단계에서 드러난다. `@Override`와 `final`도 같은 방향의 제약이다. interface의 abstract method도 구현을 강제하지만 default method는 구현을 제공하므로 override 누락을 막지 않는다. 반대로 잘못된 downcast는 compile을 통과하고 실행 중 `ClassCastException`으로 드러나 수정과 재배포 비용이 크다. 실수는 가능하면 compile time 제약으로 옮기고 피할 수 없는 downcast는 type test 뒤에 수행한다.

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
- Java가 class 다중 상속을 막고 interface 다중 구현을 허용하는 이유
- compile-time member selection과 runtime overriding dispatch
- override, overload와 static hiding의 차이
- override 시 checked exception 선언 규칙과 그 이유
- 부모에 no-arg constructor가 없을 때 자식 constructor가 해야 할 일
- upcast와 downcast의 runtime check 차이
- abstract method가 override 누락을 compile error로 바꾸는 방식
- abstract class와 현대 interface의 상태와 구현 차이
- interface default method 충돌 해결 필요성
- 상속보다 composition이 나은 조건

## 출처

- [Java SE 26 Language Specification, Conversions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-5.html)
- [Java SE 26 Language Specification, Classes](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html)
- [Java SE 26 Language Specification, Interfaces](https://docs.oracle.com/javase/specs/jls/se26/html/jls-9.html)
- [Java SE 26 Language Specification, Expressions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html)
- [Oracle Java Tutorials, Multiple Inheritance of State, Implementation, and Type](https://docs.oracle.com/javase/tutorial/java/IandI/multipleinheritance.html)
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
- 김영한 강사, [데몬 스레드](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232321)
- 김영한 강사, [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232326)
- 김영한 강사, [체크 예외 재정의](https://www.inflearn.com/courses/lecture?courseId=334352&unitId=232332)

## 관련 문서

- [[Java-Language-Object-Model|Java 객체 모델]]
- [[Java-Language-Inheritance-and-Polymorphism-Pattern-Matching|Java downcast와 instanceof 패턴 매칭]]
- [[Java-Language-OOP-Design-and-OCP|Java 객체 협력과 OCP]]
- [[OOP|객체 지향 프로그래밍]]
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
