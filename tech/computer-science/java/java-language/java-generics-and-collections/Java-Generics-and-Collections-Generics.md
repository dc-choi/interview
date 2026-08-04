---
tags: [java, generics, type-parameter, wildcard, type-erasure, type-safety]
status: done
verified_at: 2026-08-04
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

## 제네릭은 기본적으로 invariant다

`Dog`가 `Animal`의 하위 타입이어도 `Box<Dog>`는 `Box<Animal>`의 하위 타입이 아니다. 대입을 허용하면 `Box<Dog>`에 `Cat`을 넣을 수 있어 타입 안전성이 깨지기 때문이다.

```java
Box<Dog> dogs = new Box<>();
// Box<Animal> animals = dogs; // compile error
```

다형성이 필요한 사용 지점에서는 wildcard로 허용 관계를 표현한다. raw type인 `Box`는 이전 코드와의 호환 수단이며 타입 검사를 약화하고 unchecked warning을 만들므로 새 코드에서 피한다.

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

## generic method

type parameter를 method에 선언하면 enclosing class가 generic이 아니어도 호출마다 타입을 정할 수 있다.

```java
static <T extends Comparable<? super T>> T max(T left, T right) {
    return left.compareTo(right) >= 0 ? left : right;
}
```

`<T>`는 반환 타입 앞에 선언한다. compiler가 argument와 target type에서 추론할 수 있지만 모호하면 `TypeName.<String>method(...)`처럼 명시할 수 있다. class의 `T`와 method의 `<T>`를 같은 이름으로 다시 선언하면 별도 scope의 type variable이 되어 읽기 어려우므로 이름을 구분한다.

## wildcard로 사용 지점의 범위를 표현한다

| 형태 | 안전하게 읽기 | 안전하게 쓰기 | 대표 용도 |
|---|---|---|---|
| `Box<?>` | `Object` | `null` 외에는 불가 | 원소 타입과 무관한 작업 |
| `Box<? extends Animal>` | `Animal` | `null` 외에는 불가 | Animal 생산자에서 읽기 |
| `Box<? super Dog>` | `Object` | `Dog`와 하위 타입 | Dog 소비자에 쓰기 |

PECS는 producer에는 `extends`, consumer에는 `super`를 쓰라는 기억법이다. 하나의 parameter에서 읽고 쓰기를 모두 해야 한다면 wildcard보다 정확한 type parameter가 필요할 수 있다.

generic method는 호출 관계를 새 type variable로 표현하고, wildcard는 이미 선언된 generic type의 허용 범위를 표현한다. 반환 타입과 여러 parameter 사이의 같은 타입 관계를 표현해야 하면 generic method가 더 명확하다. compiler는 wildcard capture로 일부 관계를 내부적으로 추론할 수 있으며 helper method가 필요한 경우도 있다.

## type erasure의 정확한 범위

Java는 parameterized type을 erasure 기반으로 구현한다. type variable은 unbounded이면 `Object`, bounded이면 왼쪽 끝 bound로 지워지고 compiler가 필요한 cast와 bridge method를 넣을 수 있다.

- `new T()`와 `new T[]`는 일반적으로 허용되지 않는다.
- `List<String>`과 `List<Integer>`는 같은 raw runtime class를 공유한다.
- `instanceof List<String>`은 사용할 수 없지만 reifiable type인 `List<?>` 검사는 가능하다.
- primitive는 type argument로 쓸 수 없어 wrapper가 필요하다.
- static member는 특정 parameterization의 `T`에 속하지 않으므로 class type parameter를 직접 사용할 수 없다.

erasure를 모든 generic 정보가 class file에서 사라진다는 뜻으로 확대하지 않는다. declaration의 generic signature는 reflection이 읽을 수 있는 class file metadata로 남을 수 있다. 하지만 runtime object 하나가 `List<String>`의 element type을 보존한다고 기대할 수는 없다.

unchecked cast와 raw type을 섞으면 heap pollution이 생겨 compiler가 보장한 것처럼 보이는 위치에서 뒤늦게 `ClassCastException`이 발생할 수 있다. warning을 숨기기보다 범위를 좁히고 안전성 근거를 문서화한다.

## generic array를 피하는 이유

array는 runtime component type을 검사하고 covariant지만 generic type은 invariant이며 많은 parameterized type이 non-reifiable이다. 그래서 `new List<String>[10]`은 금지된다. 내부 저장소에 `Object[]`를 사용하고 API 경계에서 type safety를 통제하거나 `List<T>` 같은 collection을 사용한다.

## 면접 체크포인트

- `Object` 기반 container와 generic container의 실패 시점 차이
- `List<Dog>`가 `List<Animal>`의 하위 타입이 아닌 이유
- type parameter bound와 wildcard bound의 역할 차이
- `? extends`와 `? super`에서 읽고 쓸 수 있는 값
- type erasure가 지우는 것과 metadata로 남을 수 있는 것
- generic array 생성이 금지되는 이유

## 출처

- [JLS 4.4-4.9, Type Variables and Generics](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html#jls-4.4)
- [JLS 5.1.10, Capture Conversion](https://docs.oracle.com/javase/specs/jls/se26/html/jls-5.html#jls-5.1.10)
- [JLS 8.4.4, Generic Methods](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html#jls-8.4.4)
- [JLS 10.5, Array Store Exception](https://docs.oracle.com/javase/specs/jls/se26/html/jls-10.html#jls-10.5)
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
- 김영한 강사, [타입 이레이저](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215949)
- 김영한 강사, [제네릭 문제와 풀이2](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215950)
- 김영한 강사, [제네릭 정리](https://www.inflearn.com/courses/lecture?courseId=333482&unitId=215951)

## 관련 문서

- [[Java-Language-Syntax-and-Types|Java 문법과 타입]]
- [[Java-Language-Inheritance-and-Polymorphism|Java 상속과 다형성]]
- [[Java-Generics-and-Collections-List-Abstraction|Java List 추상화와 성능]]
- [[TS-Generics|TypeScript Generics]]
