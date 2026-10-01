---
tags: [java, jvm, memory, static, final, class-initialization, utility-class, main-method]
status: done
verified_at: 2026-09-30
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Class Members and Memory", "Java 클래스 멤버와 메모리"]
---

# Java 클래스 멤버와 메모리 모델

`static`과 `final`은 field가 어느 object에 속하는지와 값을 다시 대입할 수 있는지를 정한다. stack, heap과 method area 그림은 이 의미를 설명하는 추상 모델이며 물리 주소와 구현 배치를 보장하지 않는다.

## JVM runtime data area를 읽는 법

| 영역 | 명세 수준의 역할 | 주의점 |
|---|---|---|
| JVM stack | thread마다 생성되고 method invocation마다 frame을 push한다. | 실제 local variable의 물리 위치와 최적화 방식까지 고정하지 않는다. |
| heap | class instance와 array를 위한 shared runtime data area다. | object가 그림처럼 연속 배치된다는 뜻은 아니다. |
| method area | class 구조, runtime constant pool, method와 constructor code 같은 per-class 구조를 저장하는 논리 영역이다. | HotSpot의 특정 구현명이나 static field의 물리 위치와 동일시하지 않는다. |
| PC register | 각 thread가 실행 중인 instruction 위치를 추적한다. | native method 실행 중 값은 정의되지 않을 수 있다. |
| native method stack | native method 지원에 사용할 수 있다. | JVM 구현은 다른 stack과 통합할 수 있다. |

JVM frame에는 local variable array, operand stack과 현재 method 수행 정보가 있다. Java source의 local variable은 이 모델로 설명할 수 있지만 JIT가 observable behavior를 유지하며 register allocation이나 escape analysis를 적용할 수 있다.

## 변수 종류별 수명과 object 수명

| 변수 | 속한 곳 | 수명 |
|---|---|---|
| local variable과 parameter | method invocation의 frame | method가 끝나 frame이 사라지면 함께 사라진다 |
| instance field | object | object가 도달 불가능해져 GC가 회수할 때까지 남는다 |
| static field | class 또는 interface | class preparation에서 생기고 class가 unload될 때까지 남는다 |

- frame이 사라져도 그 frame에서 만든 object가 함께 사라지지는 않는다. reference를 반환하거나 field와 collection에 저장하면 frame이 끝난 뒤에도 그 경로로 계속 쓴다.
- object의 수명은 만든 frame이 아니라 live thread에서 도달 가능한지가 정한다. 마지막 경로가 끊기면 GC 대상이 될 수 있고, heap 안에서 서로만 참조하는 object 묶음도 밖에서 도달할 수 없으면 회수 대상이다. JLS는 더 쓰지 않는 local variable을 일찍 비워 frame이 끝나기 전에 회수 가능하게 만드는 최적화도 허용한다.
- class는 defining class loader가 회수될 수 있을 때만 unload되고 bootstrap loader의 class는 unload되지 않는다. 일반 애플리케이션 class path의 class는 사실상 process가 끝날 때까지 남으므로 static collection에 계속 추가한 object는 누수 경로가 된다([[JVM-GC-Memory-Leak|JVM 메모리 누수]]).
- main이 반환돼도 JVM이 끝난다는 보장은 없다. thread마다 JVM stack이 따로 있고, program은 모든 non-daemon thread가 끝나거나 `System.exit`, `Runtime.exit`, `Runtime.halt`가 호출되거나 JVM이 OS signal 같은 종료 요청을 처리할 때 끝난다. halt가 아니면 시작된 shutdown hook이 끝날 때까지 기다린다([[Java-Threads-Lifecycle-and-Cancellation|thread lifecycle과 취소]]).

## 자료구조 stack과 JVM stack을 구분한다

- stack 자료구조는 LIFO로 마지막에 넣은 값을 먼저 꺼낸다.
- queue는 FIFO 처리 순서를 모델링한다.
- JVM stack은 method invocation frame을 LIFO로 관리하기 때문에 stack 자료구조의 성질을 사용한다.
- application collection이 필요할 때 legacy `Stack`보다 `Deque`와 `ArrayDeque`를 우선 검토한다.

자료구조 이름이 같다고 application stack object가 JVM stack 영역에 저장된다는 뜻은 아니다.

## instance member와 static member

instance field는 object마다 별도 상태를 갖고 instance method는 receiver인 `this`를 통해 동작한다. static member는 특정 instance가 아니라 class 또는 interface에 연결된다.

~~~java
final class Counter {
    private static int total;
    private int own;

    void increase() {
        own++;
        total++;
    }

    static int total() {
        return total;
    }
}
~~~

- static method에는 `this`가 없으므로 receiver 없이 instance member에 직접 접근할 수 없다.
- object reference가 있으면 static method 안에서도 그 object의 instance member를 호출할 수 있다.
- static member를 instance expression으로 접근해도 compile되지만 그 expression은 평가만 되고 결과는 버려진다. 값이 `null`이어도 `NullPointerException`이 나지 않고, 선택되는 member도 runtime object가 아니라 expression의 compile-time type이 정한다. instance member처럼 오해하게 만들므로 class 이름으로 접근하고 javac `-Xlint:static` 경고를 활용한다.
- class loader가 다르면 같은 binary name도 서로 다른 class identity가 될 수 있어 static 상태가 process 전체에 하나라는 가정은 맞지 않을 수 있다.

### 상태 없는 utility class

parameter만으로 결과를 계산하고 instance 상태가 필요 없는 기능은 static method로 두고 `Math.max(a, b)`처럼 class 이름으로 호출한다.

~~~java
public final class ArrayStats {
    private ArrayStats() { }

    public static int sum(int[] values) {
        return Arrays.stream(values).sum();
    }
}
~~~

- constructor를 하나도 선언하지 않으면 compiler가 class와 같은 access의 default constructor를 만든다. public utility class는 누구나 `new`할 수 있으므로 인자 없는 private constructor를 선언하고 다른 constructor는 두지 않는다. JLS의 `Math` 선언도 이 형태다.
- 생성을 막으려고 `abstract`를 쓰지 않는다. abstract는 subclass가 구현을 완성한다는 뜻이고 subclass를 만들면 instance도 생긴다.
- static method는 static mutable state 없이 입력만으로 결과를 낸다. 호출부가 구현을 바꾸거나 test에서 대체해야 하는 행동이면 interface 뒤의 instance로 두고 constructor로 주입한다.
- 호출이 잦으면 static import로 class 이름을 생략할 수 있지만 출처가 흐려지는 비용이 있다([[Java-Language-Construction-and-Encapsulation-Packages-and-Imports|Java package와 import]]).

### main 진입점과 static

- `public static void main(String[] args)`는 static이라 instance 없이 program을 시작한다. static method에는 `this`가 없으므로 static main에서 같은 class의 method를 receiver 없이 부르려면 그 method도 static이어야 한다.
- JDK 25에서 정식 기능이 된 JEP 512부터 main은 static이나 public이 아니어도 되고(private은 불가) `String[]` parameter를 생략할 수 있다. launcher는 `String[]` parameter가 있는 main을 먼저 고르고 없으면 parameter 없는 main을 고른다. 고른 main이 instance method면 private이 아닌 no-arg constructor로 instance를 만든 뒤 호출하므로 같은 class의 instance method를 바로 부를 수 있다.
- 기존 `public static void main(String[] args)`는 그대로 선택되므로 기존 code의 의미는 바뀌지 않는다. 같은 JEP의 compact source file은 class 선언 없이 method와 field만 두는 학습과 작은 program용 형식이다. 운영 code의 진입점 형식은 project의 JDK 기준선과 팀 규칙을 따른다.

## class initialization은 프로그램 시작과 같지 않다

class 또는 interface initialization은 instance 생성, 그 type이 선언한 static method 호출, non-constant static field 사용과 같은 active use 직전에 일어난다. static field가 프로그램 시작에 모두 생성되어 JVM 종료까지 유지된다는 설명은 일반 규칙이 아니다.

- preparation 단계에서 static field는 default value를 먼저 가진다.
- initialization 단계에서 static field initializer와 static initializer가 source 순서대로 실행된다.
- superclass가 먼저 초기화되며 interface 초기화 규칙은 class와 다르다.
- class와 defining class loader가 unload 가능 상태가 되면 JVM 구현이 class unloading을 수행할 수 있다.

static mutable state는 모든 instance가 공유할 수 있지만 thread safety를 자동으로 얻지 않는다. request별 데이터, test state와 교체 가능한 dependency는 instance와 DI container의 lifecycle로 관리하는 편이 낫다.

### 공유 counter를 어디에 둘까

생성된 object 수를 세는 counter로 세 설계를 비교할 수 있다.

| 설계 | 공유 범위 | 비용과 위험 |
|---|---|---|
| instance field | object마다 따로 생긴다 | 각 object가 자기 count만 1로 올려 생성 수를 셀 수 없다 |
| constructor로 주입한 공유 object | 주입한 범위 | 협력 object와 parameter가 늘지만 요청, tenant, test별로 범위를 나누고 교체할 수 있다 |
| static field | class당 하나(class loader 기준) | 선언만으로 공유되지만 전역 mutable state다 |

static `count++`는 읽기, 증가, 쓰기의 복합 연산이라 여러 thread가 동시에 생성하면 증가가 유실될 수 있다. 필요하면 `AtomicInteger`, `LongAdder`나 lock을 쓴다([[Java-Atomic-and-Concurrent-Collections|원자적 연산과 동시성 컬렉션]]). static counter는 test 사이에 초기화하기도 어렵다. 범위가 정말 class 전체인 값(상수, class 단위 통계)은 static, 호출 맥락별로 나누거나 test에서 바꿔야 하는 값은 주입한 object가 맞다. 주입 방식은 DI container의 생성자 주입과 같은 구조다.

## final의 정확한 경계

`final` variable은 규칙이 허용하는 초기화 뒤 다시 대입할 수 없다.

- initialized final은 initializer에서 값을 받는다.
- instance blank final field는 instance initializer나 모든 constructor 경로에서, static blank final field는 static initializer에서 정확히 초기화돼야 한다.
- final parameter는 invocation으로 값을 받지만 method body에서 다시 대입할 수 없다.
- final reference는 다른 object를 가리키도록 재대입할 수 없을 뿐 referenced object를 deep immutable로 만들지 않는다.
- `final` method는 subclass가 override하거나 hide할 수 없고, `final` class는 subclass를 가질 수 없어 `extends`하면 compile error다.

~~~java
final List<String> names = new ArrayList<>();
names.add("Kim");
// names = List.of();
~~~

final instance field의 초기화 위치는 값의 성격으로 고른다. 고객 ID처럼 instance마다 다른 불변 값은 constructor에서 한 번 받는다. 모든 instance가 같은 값을 가지는 final instance field는 선언부에서 초기화해도 object마다 field가 따로 생겨 같은 값을 중복 보관하므로 `static final`로 올려 class에 하나만 둔다. 바뀌면 안 되는 값에 final을 붙이면 잘못된 재대입이 실행 전에 compile error로 드러나고 읽는 사람에게도 변경 금지 의도가 전달된다.

상수 convention으로 `UPPER_SNAKE_CASE`를 쓰는 대상은 보통 `static final` field다. 그러나 모든 `static final`이 compile-time constant variable은 아니다. JLS의 constant variable은 primitive 또는 `String` 타입의 final variable이 constant expression으로 초기화된 경우다. 이 값은 client bytecode에 inline될 수 있어 공개 상수 변경 시 client 재컴파일 문제도 고려한다.

상수를 `public static final` field로 직접 공개하는 관례는 field를 감추고 method로 노출한다는 캡슐화 기본값의 예외다. 재대입할 수 없어 직접 접근해도 변조되지 않는다는 근거는 값이 primitive, `String` 또는 immutable object일 때만 성립한다. `public static final int[]`나 가변 `List`는 참조 재대입만 막을 뿐 누구나 원소를 바꿀 수 있으므로 `List.of` 같은 unmodifiable collection이나 복사본을 반환하는 accessor로 공개한다. unmodifiable collection도 원소 object가 가변이면 그 상태는 바뀔 수 있다. 값을 상수로 한곳에 모으는 이유는 [[Avoid-Hard-Coding|하드코딩 피하기]]에서 다룬다.

## 면접 체크포인트

- JVM stack frame과 heap object의 관계, frame이 끝난 뒤에도 object가 살아남는 조건
- method area를 특정 JVM의 물리 영역으로 단정하면 안 되는 이유
- instance member와 static member의 receiver 차이
- utility class의 생성을 private constructor로 막는 이유
- JDK 25 instance main 이후의 main과 static 규칙
- class initialization이 발생하는 active use
- 여러 class loader에서 static state가 하나가 아닐 수 있는 이유
- static counter와 주입한 counter의 선택 기준
- final reference와 immutable object의 차이
- `static final`과 compile-time constant variable의 차이
- 가변 object를 `public static final`로 공개하면 생기는 문제

## 출처

- [Java Virtual Machine Specification 26, Runtime Data Areas](https://docs.oracle.com/javase/specs/jvms/se26/html/jvms-2.html)
- [Java Virtual Machine Specification 26, Loading, Linking, and Initializing](https://docs.oracle.com/javase/specs/jvms/se26/html/jvms-5.html)
- [Java SE 26 Language Specification, Variables](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html)
- [Java SE 26 Language Specification, Classes](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html)
- [Java SE 26 Language Specification, Initialization](https://docs.oracle.com/javase/specs/jls/se26/html/jls-12.html)
- [Java SE 26 Language Specification, Binary Compatibility](https://docs.oracle.com/javase/specs/jls/se26/html/jls-13.html)
- [Java SE 26 Language Specification, Expressions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html)
- [OpenJDK JEP 512, Compact Source Files and Instance Main Methods](https://openjdk.org/jeps/512)
- [Java SE 26 API, List](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/List.html)
- 김영한 강사, [참조형과 메서드 호출 - 활용](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194655)
- 김영한 강사, [변수와 초기화](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194656)
- 김영한 강사, [null](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194657)
- 김영한 강사, [기본 생성자](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194671)
- 김영한 강사, [자바 메모리 구조](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194688)
- 김영한 강사, [스택과 큐 자료 구조](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194689)
- 김영한 강사, [스택 영역](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194690)
- 김영한 강사, [스택 영역과 힙 영역](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194691)
- 김영한 강사, [static 변수1](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194692)
- 김영한 강사, [static 변수2](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194693)
- 김영한 강사, [static 변수3](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194694)
- 김영한 강사, [static 메서드1](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194695)
- 김영한 강사, [static 메서드2](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194696)
- 김영한 강사, [static 메서드3](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194697)
- 김영한 강사, [문제와 풀이](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194698)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194699)
- 김영한 강사, [final 변수와 상수1](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194700)
- 김영한 강사, [final 변수와 상수2](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194701)
- 김영한 강사, [final 변수와 참조](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194702)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194703)
- 김영한 강사, [정리](https://www.inflearn.com/courses/lecture?courseId=332506&unitId=194713)

## 관련 문서

- [[JVM-Architecture|JVM 아키텍처]]
- [[JVM-GC|JVM GC]]
- [[JVM-GC-Memory-Leak|JVM 메모리 누수]]
- [[Java-Concurrency-Primitives|Java 동시성 프리미티브]]
- [[Java-Language-Object-Model|Java 객체 모델]]
