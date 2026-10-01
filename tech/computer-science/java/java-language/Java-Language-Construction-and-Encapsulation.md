---
tags: [java, constructor, package, import, access-control, encapsulation, static-factory]
status: done
verified_at: 2026-09-30
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Construction and Encapsulation", "Java 생성과 캡슐화"]
---

# Java 생성과 캡슐화

constructor는 object를 유효한 초기 상태로 만들고, package와 access control은 그 상태를 변경할 수 있는 코드의 범위를 제한한다. 세 기능은 문법 항목이 아니라 invariant를 보호하는 하나의 설계 축이다.

## constructor는 method가 아니다

constructor declaration은 class와 같은 이름을 사용하고 return type을 쓰지 않지만 method declaration의 한 종류는 아니다. constructor는 상속되지 않으며 `static`, `final`, `abstract`로 선언할 수 없다.

~~~java
final class Member {
    private final String name;
    private final int age;

    Member(String name, int age) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException();
        if (age < 0) throw new IllegalArgumentException();
        this.name = name;
        this.age = age;
    }
}
~~~

필수 값을 constructor parameter로 받으면 초기화 method 호출 누락을 compile time에 줄이고, 생성 완료 뒤 object가 지킬 invariant를 한곳에 모을 수 있다.

## default constructor와 no-arg constructor

- normal class에 constructor declaration이 하나도 없을 때 compiler가 조건에 맞는 default constructor를 암시적으로 선언한다.
- parameter가 없는 constructor를 개발자가 직접 선언하면 no-arg constructor지만 default constructor는 아니다.
- constructor를 하나라도 직접 선언하면 normal class의 default constructor는 제공되지 않는다.
- default constructor는 direct superclass의 no-arg constructor를 호출해야 하므로 접근 가능한 대상이 없으면 compile error가 날 수 있다.

용어를 구분하면 framework가 요구하는 no-arg constructor와 compiler가 만들어 주는 default constructor를 혼동하지 않는다.

## overload, this와 constructor 위임

constructor도 parameter 목록을 달리해 overload할 수 있다. 공통 초기화는 `this(...)`로 같은 class의 다른 constructor에 위임하되 직접 또는 간접 순환 호출은 허용되지 않는다.

`this.field`는 현재 object의 field를 선택한다. parameter와 field 이름이 같을 때만 쓰는 문법이 아니라 현재 receiver를 명시하는 표현이다.

이름은 가까운 scope부터 찾으므로 parameter와 local variable이 같은 이름의 field를 가린다(shadowing). `this`를 빠뜨린 `name = name;`은 parameter에 자기 자신을 대입할 뿐이라 compile error도 javac 경고도 없이 field를 default value로 남긴다. 가려진 field는 `this.name`, 가려진 static field는 `ClassName.name`으로 접근한다. constructor나 setter 뒤에 field가 default value로 남으면 자기 대입부터 확인하고 IDE나 정적 분석의 self-assignment 검사를 켠다. 필수 field를 blank `final`로 두면 대입이 빠진 constructor가 compile error가 되어 이 실수가 실행 전에 드러난다. 이름이 겹치지 않을 때도 `this`를 붙일지는 팀 규칙을 따른다.

`this(...)`는 같은 object의 초기화를 다른 constructor에 위임할 뿐 object를 하나 더 만들지 않는다.

Java SE 26에서는 명시적 `this(...)` 또는 `super(...)` 앞에 제한된 prologue statement를 둘 수 있다. 따라서 constructor invocation은 무조건 첫 문장이어야 한다는 규칙은 현재 명세와 맞지 않는다. 다만 early construction context에서는 아직 생성 중인 `this`, instance field와 instance method 사용이 제한된다. 명시적 호출이 없으면 `Object`를 제외한 constructor에 `super()`가 암시적으로 들어간다.

## static factory method

static factory method는 constructor 대신 instance를 반환하는 static method다. constructor를 private으로 두면 생성 경로가 factory로 모인다.

~~~java
final class Money {
    private static final Money ZERO = new Money(0);
    private final long amount;

    private Money(long amount) {
        this.amount = amount;
    }

    static Money of(long amount) {
        if (amount < 0) throw new IllegalArgumentException();
        return amount == 0 ? ZERO : new Money(amount);
    }
}
~~~

- 이름으로 생성 의도를 드러낸다. constructor는 class 이름만 쓸 수 있어 같은 parameter 목록으로 다른 의미의 object를 만들 수 없지만 factory는 `normal(name)`, `vip(name)`처럼 구분할 수 있다.
- 매번 새 object를 만들지 않아도 된다. `Integer.valueOf(int)`는 -128부터 127까지의 값을 항상 cache하고 그 밖의 값도 cache할 수 있다. 같은 값이 같은 instance일 수 있으므로 identity 비교에 의존하지 않는다([[Java-Backend-Fundamentals-Value-and-Design|값과 타입 설계]]).
- 선언한 반환 타입의 하위 타입을 돌려줄 수 있어 `List.of`처럼 구현 class를 숨길 수 있다.
- 비용은 이름을 짓고 찾는 부담과, constructor가 모두 private이면 외부에서 상속할 수 없다는 점이다. 생성이 단순하면 constructor를, 검증, cache, 하위 타입 선택 같은 생성 로직이 필요하면 static factory를 택한다.
- GoF의 Factory Method 패턴(하위 class가 생성 hook을 override)과는 다른 개념이다([[Factory패턴이란|Factory와 Factory Method]]). DTO 변환의 `of()` 사례는 [[DTO-Layering]]에 있다.

## package와 import

package 선언과 import의 이름 해석, 이름 충돌, class path의 FQCN 충돌, 하위 package의 접근 경계와 static import는 [[Java-Language-Construction-and-Encapsulation-Packages-and-Imports|Java package와 import]]에서 다룬다.

## access control

| 선언 | 접근 범위의 핵심 |
|---|---|
| `private` | declaring top-level class의 nest 내부 |
| modifier 없음 | 같은 package |
| `protected` | 같은 package, 그리고 다른 package에서는 subclass code에 추가 규칙과 함께 허용 |
| `public` | 접근 가능한 모든 code, module export 같은 상위 경계의 영향은 남음 |

modifier가 없는 접근을 package access 또는 package-private라고 부른다. `default`라는 keyword를 쓰는 access modifier는 없다.

`protected`는 단순히 같은 package와 모든 자식에서 자유롭게 접근으로 외우면 부족하다. 다른 package의 subclass에서는 접근이 subclass 구현을 통해 이루어져야 하고 qualifying reference type에도 제한이 있다. 외부에 넓게 열 목적이면 `public` contract가 맞는지, 하위 확장점이면 `protected`가 필요한지 구분한다.

top-level class와 interface의 source-level access는 `public` 또는 package access다. member class와 nested type에는 `private`, package access, `protected`, `public`을 적용할 수 있다.

JLS는 file system 기반 host가 public top-level type을 `TypeName.java` file에 두도록 강제할 수 있게 하고, javac는 이를 compile error로 처리한다(`class Right is public, should be declared in a file named Right.java`). 그래서 file 하나에 public top-level type은 하나다. package access top-level class는 한 file에 여러 개 둘 수 있지만, 다른 file에서 그 class를 쓰면 사용하는 file만 compile할 때 compiler가 class 이름과 같은 source file을 찾지 못해 실패할 수 있다. javac `-Xlint:auxiliaryclass`가 이런 auxiliary class 사용을 경고한다. top-level type은 file마다 하나를 기본으로 하고 한 class에서만 쓰는 보조 type은 private nested class로 둔다([[Java-Standard-Library-Nested-and-Local-Classes|중첩 클래스]]).

## 캡슐화는 setter 개수가 아니다

모든 field를 `private`로 바꾼 뒤 getter와 setter를 그대로 열면 표현만 우회했을 뿐 invariant가 보호되지 않을 수 있다.

~~~java
final class Volume {
    private int level;

    void increase() {
        if (level < 100) level++;
    }
}
~~~

- data와 그 data를 다루는 behavior를 같은 책임에 둔다.
- 무제한 setter 대신 업무 의도를 드러내는 operation을 공개한다.
- validation은 생성과 상태 전이 경계에서 수행한다.
- 내부 mutable collection은 그대로 반환하지 않고 immutable view나 defensive copy를 검토한다.
- 공개 범위를 최소화하되 test 편의를 위해 production contract를 불필요하게 넓히지 않는다.

## 면접 체크포인트

- constructor가 method와 다른 점
- default constructor와 직접 선언한 no-arg constructor의 차이
- Java SE 26 constructor prologue와 early construction restriction
- `name = name` 자기 대입이 field를 바꾸지 못하는 이유
- constructor 대신 static factory method를 택하는 조건
- package access와 `protected`의 차이
- public top-level type과 file 이름 규칙
- field를 private로 만드는 것만으로 캡슐화가 끝나지 않는 이유

## 출처

- [Java SE 26 Language Specification, Names and Access Control](https://docs.oracle.com/javase/specs/jls/se26/html/jls-6.html)
- [Java SE 26 Language Specification, Packages and Modules](https://docs.oracle.com/javase/specs/jls/se26/html/jls-7.html)
- [Java SE 26 Language Specification, Classes](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html)
- [Java SE 26 API, Integer](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Integer.html)
- [Oracle, JDK 26 javac Command](https://docs.oracle.com/en/java/javase/26/docs/specs/man/javac.html)
- 김영한 강사, [생성자 - 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194668)
- 김영한 강사, [this](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194669)
- 김영한 강사, [생성자 - 도입](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194670)
- 김영한 강사, [기본 생성자](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194671)
- 김영한 강사, [생성자 - 오버로딩과 this()](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194672)
- 김영한 강사, [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194673)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194674)
- 김영한 강사, [패키지 - 시작](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194675)
- 김영한 강사, [패키지 - import](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194676)
- 김영한 강사, [패키지 규칙](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194677)
- 김영한 강사, [패키지 활용](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194678)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194679)
- 김영한 강사, [접근 제어자 이해1](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194680)
- 김영한 강사, [접근 제어자 이해2](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194681)
- 김영한 강사, [접근 제어자 종류](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194682)
- 김영한 강사, [접근 제어자 사용 - 필드, 메서드](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194683)
- 김영한 강사, [접근 제어자 사용 - 클래스 레벨](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194684)
- 김영한 강사, [캡슐화](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194685)
- 김영한 강사, [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194686)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194687)
- 김영한 강사, [스트림 만들기2](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275358)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=336672&unitId=275361)

## 관련 문서

- [[Java-Language-Construction-and-Encapsulation-Packages-and-Imports|Java package와 import]]
- [[Java-Language-References-and-Initialization|Java 참조와 초기화]]
- [[Java-Language-Object-Model|Java 객체 모델]]
- [[Cohesion-Coupling|응집도와 결합도]]
