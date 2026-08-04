---
tags: [java, nested-class, inner-class, local-class, anonymous-class, capture]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Nested and Local Classes", "Java 중첩 클래스와 지역 클래스"]
---

# Java 중첩 클래스와 지역 클래스

다른 클래스 본문 안에 선언된 nested class는 관련 구현을 가까이 두고 외부 공개 범위를 줄인다. nested class 전체를 inner class라고 부르면 static nested class와 enclosing instance를 가진 inner class의 차이가 흐려진다.

## 용어와 종류

| 종류 | 선언 위치 | enclosing instance |
|---|---|---|
| static member nested class | 클래스나 인터페이스의 멤버 | 없음 |
| non-static member inner class | 클래스의 인스턴스 멤버 | 있음 |
| local class | block 안의 local class declaration | static 문맥이 아니면 있을 수 있음 |
| anonymous class | class instance creation expression 안의 body | inner class이므로 문맥에 따라 있음 |

JLS에서 nested class는 다른 클래스나 인터페이스 선언 본문 안에 선언된 member, local, anonymous class를 포괄한다. inner class는 명시적 또는 암시적으로 `static`이 아닌 nested class다. nested enum과 record, interface의 member class는 암시적으로 static이다.

## static nested class

```java
final class Order {
    private final Pricing pricing;

    static final class Pricing {
        private final int rate;

        Pricing(int rate) {
            this.rate = rate;
        }
    }
}
```

static nested class에는 바로 둘러싼 `Order` 인스턴스가 없다. 따라서 바깥 인스턴스 필드와 메서드에 자동으로 접근할 수 없다. 바깥 타입의 private 멤버에는 Java의 nestmate 접근 규칙에 따라 접근할 수 있지만, 대상 인스턴스가 필요하면 명시적으로 받아야 한다.

다음 상황에 유용하다.

- 특정 바깥 타입에서만 쓰는 helper나 value type을 함께 배치한다.
- builder, node, result처럼 이름과 생명주기가 바깥 타입에 종속된다.
- 외부 API에 top-level 타입을 늘리지 않고 구현 세부사항을 감춘다.

## non-static member inner class

inner class 인스턴스는 enclosing instance와 연결된다.

```java
class Network {
    private String prefix = "net";

    class Printer {
        String label() {
            return Network.this.prefix;
        }
    }
}
```

바깥 인스턴스와 강하게 결합된 행동에는 간결하지만, inner object가 오래 살아남으면 바깥 객체도 함께 도달 가능한 상태로 남을 수 있다. callback, listener와 cache에 넣을 때 생명주기와 메모리 보유를 검토한다. 바깥 상태가 필요하지 않으면 static nested class가 결합을 줄인다.

현대 Java의 inner class는 static member와 static initializer를 선언할 수 있다. 예전의 상수 변수만 가능하다는 제한을 현재 규칙으로 일반화하지 않는다. 그렇더라도 static member는 enclosing instance 없이 동작한다.

## 같은 이름의 변수에 접근하기

가까운 scope의 이름이 바깥 이름을 가릴 수 있다.

```java
class Outer {
    private int value = 1;

    class Inner {
        private int value = 2;

        void print(int value) {
            System.out.println(value);            // parameter
            System.out.println(this.value);       // Inner field
            System.out.println(Outer.this.value); // Outer field
        }
    }
}
```

qualified `Outer.this`는 정확한 enclosing instance를 가리킨다. 이름 가리기가 많다면 한정 표현으로 버티기보다 역할과 이름을 단순화할지 검토한다.

## local class와 변수 capture

local class는 method, constructor 또는 block 안에 선언한다. 주변 local variable, parameter나 exception parameter를 사용하려면 그 변수는 `final` 또는 effectively final이어야 하고 사용 전에 definite assignment되어야 한다.

```java
Runnable task(String message) {
    int repeat = 2;

    class Printer implements Runnable {
        public void run() {
            System.out.println(message.repeat(repeat));
        }
    }
    return new Printer();
}
```

capture는 실행 중 stack local variable 자체를 계속 공유하는 의미가 아니다. captured value가 객체의 상태처럼 보존될 수 있으므로, 원래 local 변수를 이후 재대입하도록 허용하면 두 상태의 의미가 갈라진다. 그래서 effectively final 규칙이 적용된다. 참조가 final이어도 그 참조가 가리키는 가변 객체의 내부는 바뀔 수 있다는 점은 별개다.

## anonymous class

anonymous class는 이름 선언 없이 한 번의 객체 생성 식에서 superclass 하나를 확장하거나 interface 하나를 구현한다.

```java
Processor processor = new Processor() {
    @Override
    public void process() {
        System.out.println("done");
    }
};
```

- 명시적인 constructor를 선언할 수 없지만 instance initializer는 사용할 수 있다.
- 자체 `this`, field와 method를 가진 실제 클래스 인스턴스다.
- 여러 번 재사용하거나 구현이 길어지면 이름 있는 class가 의도와 테스트 지점을 더 잘 드러낸다.
- lambda는 functional interface를 대상으로 하고 자체 `this`를 만들지 않는다. anonymous class를 문법만 짧아진 lambda로 동일시하지 않는다.

## 선택 기준

1. 바깥 인스턴스가 필요 없고 전용 helper인가: static nested class.
2. 바깥 인스턴스 상태와 생명주기가 정말 결합되는가: member inner class.
3. 한 block에서 이름 있는 타입과 여러 method가 필요한가: local class.
4. 한 번 쓰는 짧은 class body가 필요한가: anonymous class.
5. functional interface의 한 동작만 전달하는가: lambda 또는 method reference.

private nested type도 책임이 커지면 별도 top-level type으로 분리한다. 위치는 캡슐화 수단이지 큰 클래스를 정당화하는 수단이 아니다.

## 면접 체크포인트

- nested class와 inner class의 포함 관계
- static nested class에 enclosing instance가 없는 의미
- inner instance가 바깥 객체 수명에 영향을 줄 수 있는 이유
- local class가 effectively final 변수만 capture하는 이유
- `this`와 `Outer.this`의 차이
- anonymous class와 lambda의 `this` 차이

## 출처

- [JLS 8.1.3, Inner Classes and Enclosing Instances](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html#jls-8.1.3)
- [JLS 14.3, Local Class and Interface Declarations](https://docs.oracle.com/javase/specs/jls/se26/html/jls-14.html#jls-14.3)
- [JLS 15.9.5, Anonymous Class Declarations](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.9.5)
- [JLS 15.27, Lambda Expressions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.27)
- 김영한 강사, [중첩 클래스, 내부 클래스란?](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212258)
- 김영한 강사, [정적 중첩 클래스](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212259)
- 김영한 강사, [정적 중첩 클래스의 활용](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212260)
- 김영한 강사, [내부 클래스](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212261)
- 김영한 강사, [내부 클래스의 활용](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212262)
- 김영한 강사, [같은 이름의 바깥 변수 접근](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212263)
- 김영한 강사, [지역 클래스 - 시작](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212265)
- 김영한 강사, [지역 클래스 - 지역 변수 캡처1](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212266)
- 김영한 강사, [지역 클래스 - 지역 변수 캡처2](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212267)
- 김영한 강사, [지역 클래스 - 지역 변수 캡처3](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212268)
- 김영한 강사, [익명 클래스 - 시작](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212269)
- 김영한 강사, [익명 클래스 활용1](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212270)
- 김영한 강사, [익명 클래스 활용2](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212271)
- 김영한 강사, [익명 클래스 활용3](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212272)
- 김영한 강사, [중첩 클래스 문제와 풀이1](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212273)
- 김영한 강사, [중첩 클래스 문제와 풀이2](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212274)
- 김영한 강사, [중첩 클래스 정리](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212275)

## 관련 문서

- [[Java-Language-Object-Model|Java 객체 모델]]
- [[Java-Standard-Library-Immutability-and-String|Java 불변 객체와 String]]
- [[Java-Language-OOP-Design-and-OCP|Java 객체 협력과 OCP]]
