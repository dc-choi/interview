---
tags: [java, generics, type-erasure, reifiable-type, heap-pollution]
status: done
verified_at: 2026-09-30
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Type Erasure", "Java 타입 이레이저"]
---

# Java type erasure와 generic array

Java 제네릭의 타입 검사는 컴파일 시점에 끝나고, 실행되는 class file은 대부분 제네릭 이전 코드처럼 동작한다. [[Java-Generics-and-Collections-Generics|제네릭, 제한과 와일드카드]]에서 분리한 이 문서는 erasure 규칙과 그 결과로 생기는 제약을 다룬다.

## erasure를 택한 이유

JLS 4.7은 모든 generic type을 reifiable로 만들지 않은 결정의 가장 중요한 동기를 기존 코드와의 호환성으로 설명한다. Java 5에서 제네릭을 도입할 때 collection library를 새로 만들면 독립적으로 개발된 library와 client가 한꺼번에 옮겨 가야 한다. 그래서 각 코드가 따로 제네릭으로 옮겨 갈 수 있도록(migration compatibility) 제네릭 정보는 컴파일러가 검사에 쓰고, 실행 코드는 이전과 같은 class를 쓰게 했다.

- parameterized type마다 새 class가 생기지 않으므로 제네릭이 실행 시 부담을 더하지 않는다. 호출부에 들어가는 cast는 제네릭 이전 코드가 직접 쓰던 cast와 같다.
- 대가로 타입 안전성은 컴파일 시점에만 보장된다. 실행 중에 `T`를 알아야 하는 타입 검사, instance와 배열 생성은 직접 쓸 수 없다.
- raw type은 이 호환을 위해 남긴 수단이다. JLS 4.8은 제네릭 도입 이후에 작성한 코드의 raw type 사용을 강하게 말린다.

## 컴파일 전후의 동작 모델

아래는 정확한 bytecode가 아니라 동작 모델이다.

```java
// 컴파일 전
class GenericBox<T> {
    private T value;
    void set(T value) { this.value = value; }
    T get() { return value; }
}
GenericBox<Integer> box = new GenericBox<>();
box.set(10);
Integer result = box.get();

// erasure 뒤
class GenericBox {
    private Object value;
    void set(Object value) { this.value = value; }
    Object get() { return value; }
}
Integer result = (Integer) box.get(); // 컴파일러가 호출부에 cast 삽입
```

- type variable은 unbounded이면 `Object`, bounded이면 왼쪽 끝 bound로 지워진다. `T extends Animal`의 `T animal`은 `Animal animal`이 되어 generic body에서 `Animal`의 method를 호출할 수 있고, `T`를 반환하는 method의 호출부에는 `(Dog)` 같은 cast가 들어간다. 여러 bound의 순서가 중요한 이유다.
- 삽입된 cast가 실패하지 않는 근거는 입구 검사다. 컴파일러가 `set(T)`에 `T`만 들어오게 막았으므로 꺼낼 때의 cast가 안전하다. raw type이나 unchecked cast로 입구를 우회하면 이 근거가 사라진다(아래 heap pollution).
- 같은 이유로 generic dynamic array는 내부 저장소를 `Object[]`로 두고 꺼낼 때 `(E)`로 cast하며, `add(E)`로 입구를 막는 것이 불변식의 핵심이다([[Java-Generics-and-Collections-Array-and-Linked-List#generic array의 제약|generic array의 제약]]).
- overriding 관계를 유지해야 하면 compiler가 bridge method를 생성할 수 있다.

## erasure가 만드는 제약

- `new T()`와 `new T[]`는 허용되지 않는다. erasure 뒤에는 `Object`를 만드는 코드가 되어 작성자가 뜻한 타입과 다른 객체가 생기기 때문이다. JDK 21 javac는 `new T()`를 `unexpected type`(required: class, found: type parameter T), `new T[10]`을 `generic array creation`으로 거부한다. 실행 중에 타입이 필요하면 `Class<T>` type token이나 `Supplier<T>`를 받아 생성 책임을 호출자에게 넘긴다.
- `Object`를 받는 `param instanceof T`도 컴파일 오류다. erasure 뒤에는 null이 아니면 항상 참인 `param instanceof Object`와 같아져 검사가 의미를 잃는다. JDK 21 javac는 `Object cannot be safely cast to T`로 거부한다.
- `List<String>`과 `List<Integer>`는 같은 raw runtime class를 공유한다.
- Java SE 16부터 `instanceof` 우변이 reifiable type이어야 한다는 제약은 제거됐다. 피연산자의 정적 타입과 checked cast compatible하면 `List<Integer> x`에 대한 `x instanceof ArrayList<Integer>`처럼 wildcard가 아닌 type argument도 검사할 수 있다. 반면 `Object o`에 대한 `o instanceof List<String>`은 여전히 컴파일 오류이며, 근거는 reifiability가 아니라 JLS 5.5의 checked cast compatible 요건이다.
- primitive는 type argument로 쓸 수 없어 wrapper가 필요하다.
- static member는 특정 parameterization의 `T`에 속하지 않으므로 class type parameter를 직접 사용할 수 없다.

erasure를 모든 generic 정보가 class file에서 사라진다는 뜻으로 확대하지 않는다. declaration의 generic signature는 reflection이 읽을 수 있는 class file metadata로 남을 수 있다. 하지만 runtime object 하나가 `List<String>`의 element type을 보존한다고 기대할 수는 없다.

unchecked cast와 raw type을 섞으면 heap pollution이 생겨 compiler가 보장한 것처럼 보이는 위치에서 뒤늦게 `ClassCastException`이 발생할 수 있다. warning을 숨기기보다 범위를 좁히고 안전성 근거를 문서화한다.

## generic array를 피하는 이유

array는 runtime component type을 검사하고 covariant지만 generic type은 invariant이며 많은 parameterized type이 non-reifiable이다. 원소 타입이 reifiable이 아니면 JVM이 배열 저장 검사(`ArrayStoreException`)를 할 수 없으므로 JLS는 non-reifiable 원소 타입의 배열 생성을 금지한다. 그래서 `new List<String>[10]`은 금지된다. 내부 저장소에 `Object[]`를 사용하고 API 경계에서 type safety를 통제하거나 `List<T>` 같은 collection을 사용한다.

## 면접 체크포인트

- Java가 reified generic 대신 erasure를 택한 이유와 그 대가
- 컴파일러가 호출부에 넣은 cast가 안전한 근거와 그 근거가 깨지는 경우
- `new T()`와 `instanceof T`가 금지되는 이유
- type erasure가 지우는 것과 metadata로 남을 수 있는 것
- generic array 생성이 금지되는 이유

## 출처

- [JLS 4.6, Type Erasure](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html#jls-4.6)
- [JLS 4.7, Reifiable Types](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html#jls-4.7)
- [JLS 4.8, Raw Types](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html#jls-4.8)
- [JLS 4.12.2, Variables of Reference Type](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html#jls-4.12.2)
- [JLS 5.5, Casting Contexts](https://docs.oracle.com/javase/specs/jls/se26/html/jls-5.html#jls-5.5)
- [JLS 6.5.5.1, Simple Type Names](https://docs.oracle.com/javase/specs/jls/se26/html/jls-6.html#jls-6.5.5.1)
- [JLS 10.5, Array Store Exception](https://docs.oracle.com/javase/specs/jls/se26/html/jls-10.html#jls-10.5)
- [JLS 15.10.1, Array Creation Expressions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.10.1)
- [JLS 15.20.2, Type Comparison Operator instanceof](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.20.2)
- [JVMS 4.7.9, The Signature Attribute](https://docs.oracle.com/javase/specs/jvms/se26/html/jvms-4.html#jvms-4.7.9)
- [The Java Tutorials, Type Erasure](https://docs.oracle.com/javase/tutorial/java/generics/erasure.html)
- [The Java Tutorials, Restrictions on Generics](https://docs.oracle.com/javase/tutorial/java/generics/restrictions.html)
- 김영한 강사, [타입 이레이저](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215949)

## 관련 문서

- [[Java-Generics-and-Collections-Generics|제네릭, 제한과 와일드카드]]
- [[Java-Generics-and-Collections-Array-and-Linked-List|배열 리스트와 연결 리스트]]
- [[TS-Generics|TypeScript Generics]]
