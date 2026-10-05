---
tags: [java, class, object, reference, array, "null", initialization]
status: done
verified_at: 2026-10-05
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java References and Initialization", "Java 참조와 초기화"]
---

# Java 참조와 초기화

Java 프로그램은 primitive value와 reference value를 변수에 저장한다. 참조 타입을 이해할 때 실제 주소 그림은 학습용 비유로만 쓰고, 언어 명세가 보장하는 값 복사와 객체 접근 규칙을 기준으로 삼는다.

## 개발 환경은 언어 규칙과 분리한다

강의 예제의 JDK 21과 IntelliJ 설정은 실습 환경이다. 2026-08-04 기준 최신 GA 기능 릴리스는 JDK 26이며, 실제 프로젝트에서는 build와 운영 환경이 지원하는 JDK를 선택한다. IDE, 운영체제 메뉴와 source directory layout은 Java 언어 자체의 필수 조건이 아니다.

## 클래스, 객체와 인스턴스

- class declaration은 field, method, constructor와 타입 관계를 정의한다.
- object는 class instance 또는 array처럼 runtime에 동적으로 생성된 실체다.
- instance는 특정 class와의 관계를 강조하는 object 표현이다. 객체와 인스턴스가 서로 다른 메모리 종류를 뜻하지 않는다.
- class가 선언한 field는 object가 가질 속성(attribute)이고, 각 object의 field에 실제로 든 값이 그 object의 상태(state)다. 같은 `name` field를 선언해도 object마다 다른 이름을 상태로 가질 수 있다. class는 속성과 행동을 정의한 사용자 정의 타입이고, class로 object를 만드는 일을 instantiate라고 부른다.
- `new Student()`는 object를 생성하고 constructor를 실행한 뒤 그 object를 가리키는 reference value를 결과로 낸다.
- dot operator는 reference를 통해 선택된 member에 접근한다. reference가 `null`이면 instance member 접근 중 `NullPointerException`이 발생할 수 있다.

~~~java
final class Student {
    String name;
    int age;
}

Student student = new Student();
student.name = "Kim";
student.age = 20;
~~~

## 참조값은 공개된 메모리 주소가 아니다

JLS는 reference value가 object를 가리킨다고 규정하지만 raw address의 숫자값, 크기와 표현 방법은 정하지 않는다. 따라서 reference를 C pointer와 동일시하거나 항상 4바이트 또는 8바이트라고 단정하지 않는다.

Java의 대입과 method argument 전달은 값 복사다.

~~~java
Student a = new Student();
Student b = a;
~~~

`b = a`는 object를 복제하지 않고 `a`에 든 reference value를 복사한다. 두 변수가 같은 object를 가리킬 수 있으므로 `b.name` 변경이 `a.name`을 통해서도 보인다.

반대로 참조 변수에 다른 값을 대입하면 가리키던 object가 바뀌는 것이 아니라 변수가 다른 object를 가리키게 된다.

~~~java
String a = "messi";
String b = a;
a = "ronaldo";
System.out.println(b); // messi
~~~

세 번째 줄은 `a`에 든 reference value만 바꾸고 `b`는 처음 object를 계속 가리킨다. object 상태 변경(`b.name = ...`)과 변수 재대입(`a = ...`)을 구분해야 공유로 생기는 버그를 추적할 수 있다.

method에 object를 넘겨도 reference value의 복사본이 전달된다.

~~~java
static void rename(Student target) {
    target.name = "Lee";
    target = new Student();
}
~~~

첫 대입은 caller와 공유하는 object의 상태를 바꾼다. 두 번째 대입은 local parameter만 다른 reference로 바꾸며 caller 변수 자체를 재대입하지 않는다. Java를 pass-by-reference라고 부르면 이 차이가 흐려진다.

method를 호출할 때마다 callee의 frame이 새로 생기고 argument 값은 그 frame의 parameter로 복사된다. instance method와 constructor에는 receiver reference도 숨은 첫 local variable로 전달되며 source에서는 `this`로 보인다(JVMS 2.6.1). 그래서 callee가 parameter나 `this`로 바꾼 object 상태는 frame이 사라진 뒤에도 caller가 같은 object를 통해 본다.

Python은 변수에 타입을 선언하지 않고 이름을 어떤 object에든 다시 바인딩한다. 정수까지 모든 값이 object라 이름은 항상 object를 참조하고, 인자 전달도 대입처럼 참조를 넘길 뿐 call by reference가 아니다. Java 변수는 선언한 compile-time type과 호환되는 값만 다시 담을 수 있고 primitive 변수에는 object가 아닌 값이 직접 들어간다. primitive와 참조 타입의 비용 차이는 [[Java-Standard-Library-Wrapper-Class-System-and-Random|래퍼 클래스]]에서 다룬다.

## 객체 배열

array도 object이고 array 변수는 reference value를 저장한다. `new Student[3]`은 Student object 세 개가 아니라 Student reference를 담을 slot 세 개를 만들며 각 원소의 초기값은 `null`이다.

~~~java
Student[] students = new Student[2];
students[0] = new Student();
students[1] = new Student();

for (Student current : students) {
    current.age++;
}
~~~

- array는 고정된 length와 component type을 가진다.
- reference array의 원소 대입도 reference value 복사다.
- 같은 타입의 원소를 index로 관리한다는 점은 보장되지만 물리 메모리에 연속 배치된다는 표현은 Java 언어 계약이 아니다.
- parallel array로 이름, 나이와 점수를 따로 관리하면 index 정합성이 깨지기 쉽다. 관련 값을 object로 묶고 object array로 순회하면 변경 단위가 선명해진다.

## 변수 종류와 초기화

| 변수 종류 | 초기값 규칙 |
|---|---|
| local variable와 parameter | local variable은 사용 전에 definite assignment가 증명돼야 한다. parameter는 caller가 전달한다. |
| instance field | object 생성 과정에서 타입별 default value로 먼저 초기화된다. |
| static field | class preparation에서 타입별 default value가 할당되고 class initialization에서 initializer가 실행된다. |
| array component | array 생성 시 component type의 default value로 초기화된다. |

numeric default는 0 계열, `boolean`은 `false`, reference는 `null`이다. 자동 초기화가 업무상 유효한 상태를 의미하지는 않는다. constructor와 factory에서 invariant를 명시적으로 세운다.

## null과 객체 수명

`null`은 어떤 object도 가리키지 않는 특별한 reference value다. 값 부재를 표현할 수 있지만 모든 단계에 퍼뜨리면 실패 지점이 사용 지점까지 늦어진다.

- 필수 reference는 constructor나 API boundary에서 검증한다.
- 선택 값은 domain 의미에 따라 empty collection, result type 또는 `Optional` 같은 표현을 검토한다.
- `null`에 field, instance method, array length나 element access를 적용하면 `NullPointerException`이 발생할 수 있다.
- reference가 더는 reachable하지 않으면 object는 GC 대상이 될 수 있다. 즉시 회수되거나 특정 시점에 finalize된다는 보장은 없다.

### NullPointerException 메시지 읽기

JDK 14에 들어온 JEP 358(Helpful NullPointerExceptions)은 NPE 메시지에 실패한 동작과 null이었던 식을 함께 담는다. JDK 14에서는 `-XX:+ShowCodeDetailsInExceptionMessages`로 켜야 했고 JDK 15부터 기본으로 켜져 있다.

- `bigData.data.value = 10`에서 `data` field가 null이면 `Cannot assign field "value" because "bigData.data" is null`처럼 chain의 어느 단계가 null인지 지목한다. 원인은 because 절의 식부터 읽는다.
- local variable과 parameter 이름은 class file에 local variable table이 있을 때만 나온다. javac 기본값은 line number와 source file 정보만 넣으므로 `-g` 없이 compile하거나 빌드 설정이 debug 정보를 빼면 `"<local4>.data"`처럼 slot 번호 자리표시자가 나온다.
- 메시지는 `getMessage()`를 호출할 때 계산된다. 메시지가 source 구조를 드러내는 것이 문제라면 JEP는 JVM option보다 application이 그 메시지를 출력하지 않는 쪽을 권한다.
- reference field는 자동으로 `null`이 되므로 chain 중간의 null은 constructor 초기화 누락이나 선택 값 처리 누락의 신호다. 필수 reference는 생성 경계에서 대입하고 검증한다.

## 실전 점검

- 여러 변수가 같은 mutable object를 공유하는지 확인한다.
- 복제가 필요하면 reference 대입이 아니라 의미가 명확한 copy operation을 정의한다.
- method가 object 상태를 변경하는지 이름과 contract에 드러낸다.
- array 원소의 `null` 가능성과 index 범위를 함께 검사한다.
- reference 그림을 JVM의 실제 주소와 object layout 보장으로 확대 해석하지 않는다.

## 면접 체크포인트

- class, object와 instance의 관계
- reference 대입과 object 복제의 차이
- 참조 변수 재대입과 object 상태 변경의 차이
- Java가 pass-by-value인 이유와 `this`가 frame에 전달되는 방식
- 속성과 상태의 구분, Java와 Python 변수 모델의 차이
- `Student[]` 생성 직후 들어 있는 값
- local variable과 field 초기화 규칙의 차이
- unreachable과 즉시 GC의 차이
- Helpful NPE 메시지로 null이었던 식을 찾는 방법과 `-g`의 영향

## 출처

- [Java SE 26 Language Specification, Types, Values, and Variables](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html)
- [Java SE 26 Language Specification, Arrays](https://docs.oracle.com/javase/specs/jls/se26/html/jls-10.html)
- [Java SE 26 Language Specification, Execution](https://docs.oracle.com/javase/specs/jls/se26/html/jls-12.html)
- [Oracle, JDK 26 Release Notes](https://www.oracle.com/java/technologies/javase/26all-relnotes.html)
- [OpenJDK JEP 358, Helpful NullPointerExceptions](https://openjdk.org/jeps/358)
- [OpenJDK JDK-8233014, Enable ShowCodeDetailsInExceptionMessages by default](https://bugs.openjdk.org/browse/JDK-8233014)
- [Oracle, JDK 26 javac Command](https://docs.oracle.com/en/java/javase/26/docs/specs/man/javac.html)
- [Java Virtual Machine Specification 26, Frames](https://docs.oracle.com/javase/specs/jvms/se26/html/jvms-2.html#jvms-2.6)
- [Python 3 Language Reference, Objects, values and types](https://docs.python.org/3/reference/datamodel.html#objects-values-and-types)
- [Python 3 Programming FAQ, Call by reference](https://docs.python.org/3/faq/programming.html#how-do-i-write-a-function-with-output-parameters-call-by-reference)
- 김영한 강사, [프로젝트 환경 구성](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194643)
- 김영한 강사, [클래스가 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194644)
- 김영한 강사, [클래스 도입](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194645)
- 김영한 강사, [객체 사용](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194646)
- 김영한 강사, [클래스, 객체, 인스턴스 정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194647)
- 김영한 강사, [배열 도입 - 시작](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194648)
- 김영한 강사, [배열 도입 - 리펙토링](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194649)
- 김영한 강사, [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194650)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194651)
- 김영한 강사, [기본형 vs 참조형1 - 시작](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194652)
- 김영한 강사, [기본형 vs 참조형2 - 변수 대입](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194653)
- 김영한 강사, [기본형 vs 참조형3 - 메서드 호출](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194654)
- 김영한 강사, [참조형과 메서드 호출 - 활용](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194655)
- 김영한 강사, [변수와 초기화](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194656)
- 김영한 강사, [null](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194657)
- 김영한 강사, [NullPointerException](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194658)
- 김영한 강사, [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194659)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194660)
- 쉬운코드, [객체와 클래스](https://www.youtube.com/watch?v=1pZjXnev45A)
- 쉬운코드, [변수와 값](https://www.youtube.com/watch?v=jOI2GG4hVz4)
- 쉬운코드, [변수와 객체와 메모리의 관계](https://www.youtube.com/watch?v=GIsr_r8XztQ)
- 쉬운코드, [참조형 변수와 참조형 타입 퀴즈](https://www.youtube.com/watch?v=s-OEoclGTWw)

## 관련 문서

- [[Java-Language-Syntax-and-Types|Java 문법과 타입]]
- [[Java-Language-Construction-and-Encapsulation|Java 생성과 캡슐화]]
- [[JVM-GC|JVM GC]]
