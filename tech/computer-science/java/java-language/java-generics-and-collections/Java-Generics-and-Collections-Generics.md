---
tags: [java, generics, type-parameter, wildcard, type-erasure, type-safety]
status: done
verified_at: 2026-09-30
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Generics", "Java 제네릭"]
---

# Java 제네릭, 제한과 와일드카드

제네릭은 클래스, 인터페이스와 메서드가 사용할 타입을 매개변수화한다. 같은 구현을 여러 타입에 재사용하면서 잘못된 타입 조합을 컴파일 단계에서 막고, 호출자에게 필요한 cast를 줄이는 것이 핵심이다.

## Object 기반 재사용의 한계

```java
final class ObjectBox {
    private Object value;

    void set(Object value) {
        this.value = value;
    }

    Object get() {
        return value;
    }
}
```

`Object`는 어떤 참조 타입도 담을 수 있지만 저장할 때 타입 제한이 없고 꺼낼 때 cast가 필요하다. 잘못된 값이 들어간 지점과 `ClassCastException`이 발생하는 지점이 멀어질 수 있다.

```java
final class Box<T> {
    private T value;

    void set(T value) {
        this.value = value;
    }

    T get() {
        return value;
    }
}
```

`T`는 type parameter이고 `Box<String>`의 `String`은 type argument다. `Box<String>`과 `Box<Integer>`는 같은 generic declaration을 사용하지만 서로 대입할 수 없는 별도 parameterized type이다. 생성 시 `new Box<>()`처럼 diamond로 type argument 추론을 요청할 수 있다.

## 용어와 관례

- method parameter가 필요한 값의 결정을 호출 시점의 argument로 미루듯, type parameter는 사용할 타입의 결정을 생성이나 호출 시점의 type argument로 미룬다. 값은 매개변수, 타입은 제네릭, 구현은 의존관계 주입으로 결정을 사용 시점에 미뤄 재사용성을 얻는다는 점에서 [[Java-Generics-and-Collections-List-Abstraction|List 추상화]]의 구현 주입과 같은 원리다.
- type parameter 이름은 용도를 드러내는 한 글자 대문자가 관례다. E(Element), K(Key), N(Number), T(Type), V(Value)를 쓰고 두 번째 이후 타입에는 S, U, V 등을 쓴다(Java Tutorial). 문법상 다른 이름도 되지만 관례를 따르면 `List<E>`, `Map<K, V>` 같은 API를 바로 읽는다. `Pair<K, V>`처럼 여러 개를 함께 선언할 수 있다.
- 원소 수준의 다형성과 container의 불변성을 구분한다. `Box<Animal>`에는 `Dog`, `Cat` instance를 넣을 수 있고 꺼낸 값은 `Animal`이라 하위 타입 기능에는 downcast가 필요하다. 반면 `Box<Dog>` 자체를 `Box<Animal>` 변수에 대입할 수는 없다(다음 절).

## 제네릭은 기본적으로 invariant다

`Dog`가 `Animal`의 하위 타입이어도 `Box<Dog>`는 `Box<Animal>`의 하위 타입이 아니다. 대입을 허용하면 `Box<Dog>`에 `Cat`을 넣을 수 있어 타입 안전성이 깨지기 때문이다.

```java
Box<Dog> dogs = new Box<>();
// Box<Animal> animals = dogs; // compile error
```

다형성이 필요한 사용 지점에서는 wildcard로 허용 관계를 표현한다. raw type인 `Box`는 이전 코드와의 호환 수단이며 타입 검사를 약화하고 unchecked warning을 만들므로 새 코드에서 피한다. 대신 무엇을 쓸지는 의도로 정한다. 정말 아무 객체나 담으려면 `Box<Object>`처럼 type argument로 `Object`를 명시하고, 어떤 parameterization이든 받기만 하는 매개변수라면 `Box<?>`를 쓴다. `Box<Object>`는 `Box<String>`의 상위 타입이 아니기 때문이다.

## type parameter 제한

```java
final class Hospital<T extends Animal> {
    private T patient;

    void checkup() {
        patient.checkSound();
    }
}
```

unbounded `T`의 멤버는 사실상 `Object` 계약만 사용할 수 있다. `T extends Animal`처럼 upper bound를 두면 허용 타입을 제한하고 bound의 멤버를 generic body에서 사용할 수 있다. interface 제한도 `extends`를 쓴다.

여러 bound는 `T extends Animal & Comparable<T>`처럼 쓰며 class bound가 있다면 첫 번째여야 한다. erasure는 첫 번째 bound를 기준으로 정해지므로 순서는 문법 이상의 의미가 있다.

type parameter 선언의 bound는 `extends`뿐이다(JLS 4.4 TypeBound). `class Box<T super Animal>`은 문법 오류이고 JDK 21 javac는 `> expected`로 거부한다. 하한은 wildcard의 `? super`에만 있다.

## generic method

type parameter를 method에 선언하면 enclosing class가 generic이 아니어도 호출마다 타입을 정할 수 있다.

```java
static <T extends Comparable<? super T>> T max(T left, T right) {
    return left.compareTo(right) >= 0 ? left : right;
}
```

`<T>`는 반환 타입 앞에 선언한다. compiler가 argument와 target type에서 추론할 수 있지만 모호하면 `TypeName.<String>method(...)`처럼 명시할 수 있다. class의 `T`와 method의 `<T>`를 같은 이름으로 다시 선언하면 별도 scope의 type variable이 되어 읽기 어려우므로 이름을 구분한다.

추론에는 argument뿐 아니라 대입 대상도 참여한다. `static <T extends Animal> T bigger(T a, T b)`에 `dog`와 `cat`을 섞어 넘기면 `Animal a = bigger(dog, cat)`은 `T`를 `Animal`로 추론해 컴파일되지만, `Dog d = bigger(dog, cat)`은 `inference variable T has incompatible bounds`(upper bounds: Dog, Animal, lower bounds: Cat, Dog) 오류다(JDK 21 javac). 섞어 넘기면 무조건 실패하는 것이 아니라 대상 타입이 좁을 때 실패한다.

## wildcard로 사용 지점의 범위를 표현한다

| 형태 | 안전하게 읽기 | 안전하게 쓰기 | 대표 용도 |
|---|---|---|---|
| `Box<?>` | `Object` | `null` 외에는 불가 | 원소 타입과 무관한 작업 |
| `Box<? extends Animal>` | `Animal` | `null` 외에는 불가 | Animal 생산자에서 읽기 |
| `Box<? super Dog>` | `Object` | `Dog`와 하위 타입 | Dog 소비자에 쓰기 |

PECS는 producer에는 `extends`, consumer에는 `super`를 쓰라는 기억법이다. 하나의 parameter에서 읽고 쓰기를 모두 해야 한다면 wildcard보다 정확한 type parameter가 필요할 수 있다.

### wildcard와 generic method 중 고르기

generic method는 호출 관계를 새 type variable로 표현하고, wildcard는 이미 선언된 generic type을 받아 쓰면서 허용 범위만 표현한다.

```java
static <T extends Animal> T pickGeneric(Box<T> box) { return box.get(); }   // Box<Dog>면 Dog 반환
static Animal pickWildcard(Box<? extends Animal> box) { return box.get(); } // 항상 Animal 반환
```

- type parameter가 한 번만 쓰이고 반환 타입이나 다른 매개변수와 관계가 없다면 그 역할은 여러 인자 타입을 받는 다형성뿐이므로 더 단순한 wildcard를 쓴다(Java Tutorial의 generic method 지침). JLS 4.5.1은 wildcard에는 type inference가 필요 없고, 그래서 하한 `? super B`를 선언할 수 있다고 설명한다.
- 입력의 구체 타입을 그대로 반환해야 하거나(`Box<Dog>`에서 `Dog`) 여러 매개변수와 반환 사이에 같은 타입을 강제해야 하면 generic method가 필요하다. `Collections.copy(List<? super T> dest, List<? extends T> src)`처럼 둘을 함께 쓸 수도 있다.
- compiler는 wildcard capture로 일부 관계를 내부적으로 추론할 수 있으며 helper method가 필요한 경우도 있다.

## type erasure와 generic array

Java는 parameterized type을 erasure 기반으로 구현한다. erasure를 택한 이유, 컴파일 전후의 동작 모델, `new T()`와 `instanceof T`가 금지되는 원리, heap pollution과 generic array 금지는 [[Java-Generics-and-Collections-Generics-Erasure|type erasure와 generic array]]로 분리했다.

## 면접 체크포인트

- `Object` 기반 container와 generic container의 실패 시점 차이
- `List<Dog>`가 `List<Animal>`의 하위 타입이 아닌 이유
- type parameter bound와 wildcard bound의 역할 차이
- `? extends`와 `? super`에서 읽고 쓸 수 있는 값
- wildcard로 충분한 경우와 generic method가 필요한 경우
- type parameter에는 없고 wildcard에만 있는 하한
- raw type 대신 `Box<Object>`와 `Box<?>`를 고르는 기준

## 출처

- [JLS 4.4-4.9, Type Variables and Generics](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html#jls-4.4)
- [JLS 4.5.1, Type Arguments of Parameterized Types](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html#jls-4.5.1)
- [JLS 5.1.10, Capture Conversion](https://docs.oracle.com/javase/specs/jls/se26/html/jls-5.html#jls-5.1.10)
- [JLS 8.4.4, Generic Methods](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html#jls-8.4.4)
- [The Java Tutorials, Generic Types](https://docs.oracle.com/javase/tutorial/java/generics/types.html)
- [The Java Tutorials, Generic Methods](https://docs.oracle.com/javase/tutorial/extra/generics/methods.html)
- 김영한 강사, [프로젝트 환경 구성](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215933)
- 김영한 강사, [제네릭이 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215934)
- 김영한 강사, [다형성을 통한 중복 해결 시도](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215935)
- 김영한 강사, [제네릭 적용](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215936)
- 김영한 강사, [제네릭 용어와 관례](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215937)
- 김영한 강사, [제네릭 활용 예제](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215938)
- 김영한 강사, [제네릭 문제와 풀이1](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215939)
- 김영한 강사, [타입 매개변수 제한1 - 시작](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215941)
- 김영한 강사, [타입 매개변수 제한2 - 다형성 시도](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215942)
- 김영한 강사, [타입 매개변수 제한3 - 제네릭 도입과 실패](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215943)
- 김영한 강사, [타입 매개변수 제한4 - 타입 매개변수 제한](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215944)
- 김영한 강사, [제네릭 메서드](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215945)
- 김영한 강사, [제네릭 메서드 활용](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215946)
- 김영한 강사, [와일드카드1](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215947)
- 김영한 강사, [와일드카드2](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215948)
- 김영한 강사, [제네릭 문제와 풀이2](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215950)
- 김영한 강사, [제네릭 정리](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215951)

## 관련 문서

- [[Java-Generics-and-Collections-Generics-Erasure|type erasure와 generic array]]
- [[Java-Language-Syntax-and-Types|Java 문법과 타입]]
- [[Java-Language-Inheritance-and-Polymorphism|Java 상속과 다형성]]
- [[Java-Generics-and-Collections-List-Abstraction|Java List 추상화와 성능]]
- [[TS-Generics|TypeScript Generics]]
