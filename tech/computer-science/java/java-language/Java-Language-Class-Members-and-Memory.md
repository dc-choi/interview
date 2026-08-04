---
tags: [java, jvm, memory, static, final, class-initialization]
status: done
verified_at: 2026-08-04
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
- static member를 instance expression으로 접근하는 문법이 허용되는 경우가 있어도 class 이름으로 접근하는 편이 소유권을 명확히 한다.
- class loader가 다르면 같은 binary name도 서로 다른 class identity가 될 수 있어 static 상태가 process 전체에 하나라는 가정은 맞지 않을 수 있다.

## class initialization은 프로그램 시작과 같지 않다

class 또는 interface initialization은 instance 생성, 그 type이 선언한 static method 호출, non-constant static field 사용과 같은 active use 직전에 일어난다. static field가 프로그램 시작에 모두 생성되어 JVM 종료까지 유지된다는 설명은 일반 규칙이 아니다.

- preparation 단계에서 static field는 default value를 먼저 가진다.
- initialization 단계에서 static field initializer와 static initializer가 source 순서대로 실행된다.
- superclass가 먼저 초기화되며 interface 초기화 규칙은 class와 다르다.
- class와 defining class loader가 unload 가능 상태가 되면 JVM 구현이 class unloading을 수행할 수 있다.

static mutable state는 모든 instance가 공유할 수 있지만 thread safety를 자동으로 얻지 않는다. request별 데이터, test state와 교체 가능한 dependency는 instance와 DI container의 lifecycle로 관리하는 편이 낫다.

## final의 정확한 경계

`final` variable은 규칙이 허용하는 초기화 뒤 다시 대입할 수 없다.

- initialized final은 initializer에서 값을 받는다.
- instance blank final field는 instance initializer나 모든 constructor 경로에서, static blank final field는 static initializer에서 정확히 초기화돼야 한다.
- final parameter는 invocation으로 값을 받지만 method body에서 다시 대입할 수 없다.
- final reference는 다른 object를 가리키도록 재대입할 수 없을 뿐 referenced object를 deep immutable로 만들지 않는다.

~~~java
final List<String> names = new ArrayList<>();
names.add("Kim");
// names = List.of();
~~~

상수 convention으로 `UPPER_SNAKE_CASE`를 쓰는 대상은 보통 `static final` field다. 그러나 모든 `static final`이 compile-time constant variable은 아니다. JLS의 constant variable은 primitive 또는 `String` 타입의 final variable이 constant expression으로 초기화된 경우다. 이 값은 client bytecode에 inline될 수 있어 공개 상수 변경 시 client 재컴파일 문제도 고려한다.

## 면접 체크포인트

- JVM stack frame과 heap object의 관계
- method area를 특정 JVM의 물리 영역으로 단정하면 안 되는 이유
- instance member와 static member의 receiver 차이
- class initialization이 발생하는 active use
- 여러 class loader에서 static state가 하나가 아닐 수 있는 이유
- final reference와 immutable object의 차이
- `static final`과 compile-time constant variable의 차이

## 출처

- [Java Virtual Machine Specification 26, Runtime Data Areas](https://docs.oracle.com/javase/specs/jvms/se26/html/jvms-2.html)
- [Java Virtual Machine Specification 26, Loading, Linking, and Initializing](https://docs.oracle.com/javase/specs/jvms/se26/html/jvms-5.html)
- [Java SE 26 Language Specification, Variables](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html)
- [Java SE 26 Language Specification, Classes](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html)
- [Java SE 26 Language Specification, Initialization](https://docs.oracle.com/javase/specs/jls/se26/html/jls-12.html)
- [Java SE 26 Language Specification, Binary Compatibility](https://docs.oracle.com/javase/specs/jls/se26/html/jls-13.html)
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

## 관련 문서

- [[JVM-Architecture|JVM 아키텍처]]
- [[JVM-GC|JVM GC]]
- [[Java-Concurrency-Primitives|Java 동시성 프리미티브]]
- [[Java-Language-Object-Model|Java 객체 모델]]
