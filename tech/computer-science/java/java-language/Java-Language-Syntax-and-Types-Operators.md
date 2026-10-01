---
tags: [java, operator, numeric-promotion, type-conversion, overflow, compound-assignment]
status: done
verified_at: 2026-09-30
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Operators and Numeric Promotion", "Java 연산자와 숫자 연산"]
---

# Java 연산자와 숫자 연산

Java 산술의 결과 타입은 피연산자 타입이 정하고, 결과를 담을 변수의 타입은 계산에 관여하지 않는다. 정수 나눗셈의 소수부 손실, `long` 변수에 담았는데도 생기는 오버플로, 복합 대입의 조용한 축소 변환이 모두 이 규칙에서 나온다. 기본 타입의 범위와 표현은 [[Java-Language-Syntax-and-Types|Java 문법과 타입]]에서 다룬다.

## 타입 변환

- 확대 기본 변환은 보통 더 넓은 범위로 이동하며 암시적으로 허용되지만, `int`에서 `float`처럼 정밀도가 일부 손실될 수도 있다.
- 축소 기본 변환은 보통 명시적 캐스트가 필요하며 값이 잘리거나 반올림될 수 있다. 다만 대입 문맥에서 대상이 `byte`, `short`, `char` 또는 대응 wrapper이고 우변이 해당 타입으로 표현 가능한 constant expression이면 캐스트 없이 허용된다. 예를 들어 `byte theAnswer = 42;`는 유효하다.
- 형변환 가능 여부는 메모리 크기 비교가 아니라 Java 언어의 변환 규칙으로 판단한다.

```java
long widened = 42;       // int → long
int narrowed = (int) 3L; // long → int
```

## 연산자와 평가

- 산술 연산자는 `+`, `-`, `*`, `/`, `%`다. 정수 나눗셈은 소수부를 버리고, 정수를 0으로 나누면 `ArithmeticException`이 발생한다.
- `+=`, `-=`, `*=`, `/=` 같은 복합 대입은 계산과 대입을 결합하며 결과를 왼쪽 변수 타입으로 암시적 캐스트한다. `==`, `!=`, `<`, `<=`, `>`, `>=`는 비교 결과로 boolean을 만든다.
- `++x`는 증가한 값을, `x++`는 증가 전 값을 식의 결과로 낸다. 부수 효과가 섞인 복잡한 식보다 별도 문장이 읽기 쉽다.
- `&&`, `||`는 단락 평가를 하고 `&`, `|`, `^`는 정수의 비트 연산에도 쓰인다.
- 조건 연산자 `condition ? whenTrue : whenFalse`는 두 값 중 하나를 선택한다. 중첩하면 읽기 어려우므로 단순한 식에만 쓴다.
- `==`는 기본 타입 값 또는 참조 동일성을 비교한다. 객체의 논리적 동등성은 보통 `equals`로 비교한다.
- 정수 오버플로는 자동으로 예외를 내지 않고 정해진 비트 폭에서 wraparound한다. 검사가 필요하면 `Math.addExact` 같은 API를 쓴다.

## 이항 숫자 승격과 결과 타입

산술, 비교와 정수 비트 연산의 두 피연산자는 계산 전에 같은 타입으로 승격된다. 한쪽이 `double`이면 `double`, 아니면 `float`, 아니면 `long`, 그 밖에는 둘 다 `int`다(JLS 5.6).

- `byte + byte`와 `char + int`의 결과는 `int`다. 그래서 `byte c = a + b;`는 `possible lossy conversion from int to byte`로 컴파일되지 않는다.
- 결과를 담을 변수의 타입은 연산 타입을 바꾸지 않는다. 계산은 피연산자 타입으로 끝나고, 그 결과가 대입될 때 확대될 뿐이다.

```java
int sum = 7, count = 2;
double a = sum / count;            // 3.0: int 나눗셈 결과 3을 확대
double b = (double) sum / count;   // 3.5: 캐스트가 / 보다 먼저 적용
double c = (double) (sum / count); // 3.0: 이미 잘린 3을 변환
double d = sum / 2.0;              // 3.5: 리터럴 하나를 double로

long microsPerDay = 24 * 60 * 60 * 1000 * 1000; // 500654080: int 곱셈에서 넘친 뒤 확대
long fixed = 24L * 60 * 60 * 1000 * 1000;       // 86400000000
```

`int` 최댓값은 2,147,483,647(약 21억)이다. 넘친 `microsPerDay`를 같은 방식으로 구한 하루의 millisecond 수 86,400,000으로 나누면 1000이 아니라 5가 나오고 예외도 없다. epoch millisecond(2026년 기준 약 1.8조), 2GiB를 넘는 byte 크기, 누적 금액, 64비트 ID처럼 범위를 넘을 수 있는 값은 첫 피연산자부터 `long`으로 계산하고, 넘침 자체를 실패로 다뤄야 하면 `Math.multiplyExact`, `Math.addExact`를 쓴다. 대부분의 수가 `int`로 충분하다는 판단은 값의 상한을 확인한 뒤에만 성립한다.

## 정수 나눗셈과 나머지의 부호

- 정수 나눗셈은 0 쪽으로 버린다(JLS 15.17.2). `-7 / 2`는 `-3`이고, 음의 무한대 쪽 내림이 필요하면 `Math.floorDiv`를 쓴다(결과 `-4`).
- 정수 `%`의 결과는 0이 아니면 피제수의 부호를 따른다(JLS 15.17.3). `-7 % 2`는 `-1`이라 `n % 2 == 1`로 홀수를 판정하면 음수 홀수를 놓친다. 홀수 판정은 `n % 2 != 0`으로 하고, 원형 버퍼 인덱스처럼 0 이상인 나머지가 필요하면 `Math.floorMod`를 쓴다(`floorMod(-7, 2)`는 1).

## 복합 대입과 증감 연산자의 암시적 축소

`E1 op= E2`는 `E1 = (T) ((E1) op (E2))`와 같고, `T`는 `E1`의 타입이며 `E1`은 한 번만 평가된다(JLS 15.26.2). 그래서 `x += 10`은 `x = x + 10`의 단순 축약이 아니다.

| 코드 | 결과 | 이유 |
|---|---|---|
| `byte c = 10; c += 5;` | 컴파일되고 15 | 숨은 `(byte)` 캐스트 |
| `byte c = 10; c = c + 5;` | 컴파일 오류 | `c + 5`의 타입이 `int` |
| `int i = 10; i += 2.7;` | 12 | `double` 결과 12.7을 `int`로 조용히 축소 |
| `byte b = 127; b++;` | -128 | `++`, `--`도 승격 뒤 변수 타입으로 축소해 저장(JLS 15.14.2) |
| `arr[i++] += 5;` (`i`는 0) | `arr[0]`만 5 증가, `i`는 1 | 왼쪽 식을 한 번만 평가 |

복합 대입은 일반 대입이 잡아 주는 `possible lossy conversion` 오류를 우회한다. `int` 누적 변수에 `long`이나 `double`을 더하면 wraparound나 소수 손실이 경고 없이 생기므로 누적 변수의 타입을 가장 넓은 피연산자 타입에 맞춘다. JDK 20부터 `javac -Xlint:lossy-conversions`가 이런 복합 대입을 경고하지만 기본으로 켜져 있지는 않다. 위 결과는 JDK 21.0.3 실행으로 확인했다.

## 면접 체크포인트

- 확대와 축소 변환에서 정보 손실 가능성
- `long` 변수에 담았는데도 `int` 오버플로가 나는 이유
- `(double) a / b`와 `(double) (a / b)`의 차이
- `x += y`와 `x = x + y`가 다른 경우
- 음수 나머지의 부호와 `Math.floorMod`
- `==`와 `equals`, 단락 평가, 정수 오버플로

## 출처

- [JLS 5.2, Assignment Contexts](https://docs.oracle.com/javase/specs/jls/se26/html/jls-5.html#jls-5.2)
- [JLS 5.6, Numeric Contexts](https://docs.oracle.com/javase/specs/jls/se26/html/jls-5.html#jls-5.6)
- [JLS 15.14.2, Postfix Increment Operator ++](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.14.2)
- [JLS 15.17, Multiplicative Operators](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.17)
- [JLS 15.26.2, Compound Assignment Operators](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.26.2)
- [Math, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Math.html)
- [javac, Java SE 26 Tool Specifications](https://docs.oracle.com/en/java/javase/26/docs/specs/man/javac.html)
- [JDK-8244681, Add a warning for possibly lossy conversion in compound assignments — OpenJDK](https://bugs.openjdk.org/browse/JDK-8244681)
- 인프런, [기본자료형](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13680)
- 인프런, [연산자](https://www.inflearn.com/courses/lecture?courseId=182835&unitId=13682)

## 관련 문서

- [[Java-Language-Syntax-and-Types|Java 문법과 타입]]
- [[Java-Language-References-and-Initialization|Java 참조와 초기화]]
- [[Java-Standard-Library-Wrapper-Class-System-and-Random|Java 래퍼, Class, System과 난수]]
