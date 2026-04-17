---
tags: [cs, functional, java, javascript, lambda, stream]
status: done
category: "CS - 함수형 프로그래밍"
aliases: ["Lambda", "Functional Interface", "람다", "자바 함수형", "FP in Java"]
---

# 람다 · Functional Interface — Java·JavaScript 실전 FP

함수형 프로그래밍의 수학적 기반([[Category-Theory-For-Programmers|Category Theory]]·[[Functors|Functor]]·[[Monads-In-TypeScript|Monad]])을 **언어 문법 수준에서 실무에 쓰는 방법**. Java 8+의 Functional Interface·Stream API, JavaScript의 Arrow Function·`map`/`filter`/`reduce`가 중심.

## 실무에서 원하는 것

- **동작을 값으로** — 함수를 인자로 전달해 **중복 제거**
- **선언형 스타일** — `for` 루프 대신 "무엇을 하는지"만 표현
- **합성 가능성** — 작은 함수를 조합해 복잡한 변환을 구성
- **순수·불변성** — 같은 입력에 같은 출력, 부수효과 최소화로 테스트·동시성 용이

## Java — Functional Interface

### 정의

**추상 메서드가 정확히 하나**인 인터페이스. `@FunctionalInterface` 어노테이션으로 강제할 수 있다.

```
@FunctionalInterface
interface Predicate<T> {
    boolean test(T t);
}
```

이 단일 추상 메서드 덕에 **람다 표현식**이 대신 구현할 수 있다. 이전 Java의 익명 내부 클래스를 한 줄로 압축.

### 표준 Functional Interface (`java.util.function`)

| 인터페이스 | 시그니처 | 용도 |
|---|---|---|
| `Predicate<T>` | `T → boolean` | 조건 검사 |
| `Function<T, R>` | `T → R` | 변환 |
| `Consumer<T>` | `T → void` | 소비(출력·로깅) |
| `Supplier<T>` | `() → T` | 값 공급(지연 생성) |
| `BiFunction<T, U, R>` | `(T, U) → R` | 두 인자 변환 |
| `UnaryOperator<T>` | `T → T` | 동일 타입 변환 |
| `BinaryOperator<T>` | `(T, T) → T` | 두 동일 타입 변환(reduce) |

### 람다가 제거하는 중복

상품 필터링 예.

```
// 색상 필터
List<Apple> greens = filter(apples, a -> a.getColor().equals("green"));
// 무게 필터
List<Apple> heavy = filter(apples, a -> a.getWeight() > 150);

static <T> List<T> filter(List<T> items, Predicate<T> p) {
    return items.stream().filter(p::test).toList();
}
```

조건 하나마다 메서드를 쓰던 것(`filterGreenApples`·`filterHeavyApples`)이 람다로 대체된다.

### 메서드 참조

람다가 기존 메서드를 그대로 호출할 때 더 간결하게:

- `String::length` ≡ `s -> s.length()`
- `System.out::println` ≡ `x -> System.out.println(x)`
- `Person::new` ≡ `() -> new Person()` (생성자 참조)

### Stream API — 파이프라인 DSL

컬렉션에 대해 filter·map·reduce·collect를 체이닝.

```
double avg = apples.stream()
    .filter(a -> a.getWeight() > 150)
    .mapToDouble(Apple::getWeight)
    .average()
    .orElse(0.0);
```

- **중간 연산**(`filter`·`map`·`sorted`): Stream을 반환, **지연 평가**
- **최종 연산**(`collect`·`reduce`·`forEach`): 실제 실행을 트리거
- **병렬 스트림** `parallelStream()` — 내부적으로 ForkJoinPool 활용 (주의: 순서·상태 공유 고려)

### Optional — null 제거

`Optional<T>`은 "없을 수 있음"을 타입으로 표현하는 Monad-ish 컨테이너.

```
Optional<User> maybeUser = repo.findById(id);
String name = maybeUser
    .map(User::getName)
    .orElse("anonymous");
```

`null` 반환 대신 명시적 `Optional`을 사용하면 호출자가 부재 처리를 강제한다.

## JavaScript — Arrow Function과 내장 고차함수

### Arrow Function

```
const double = x => x * 2;
const add = (a, b) => a + b;
const greet = name => ({ greeting: `Hi, ${name}` });  // 객체 반환은 괄호
```

- 익명 함수 단축, `this` 바인딩이 둘러싼 스코프를 **렉시컬하게 캡처** — 콜백에서 `this` 문제 해결
- `new` 불가, `arguments` 없음 (생성자·가변 인자는 일반 함수)

### 내장 고차함수

```
const evens  = [1,2,3,4].filter(n => n % 2 === 0);
const doubled = [1,2,3].map(n => n * 2);
const sum    = [1,2,3].reduce((acc, n) => acc + n, 0);
const every  = [1,2,3].every(n => n > 0);       // 전부 만족?
const some   = [1,2,3].some(n => n > 2);        // 하나라도?
const flat   = [[1,2],[3]].flatMap(xs => xs);   // [1,2,3]
```

이들은 **새 배열을 반환**하고 원본을 변경하지 않아 불변성이 유지된다. `forEach`는 부수효과 전용이라 `map`·`filter`·`reduce`와 용도가 다름.

### 함수 합성

```
const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);
const process = pipe(trim, toLowerCase, slugify);
process('  Hello World  ');   // 'hello-world'
```

작은 함수의 조합으로 복잡한 파이프라인 구성.

### Closure

함수가 정의된 스코프의 변수를 기억하는 성질. 상태를 함수 내부에 숨겨 캡슐화.

```
const counter = () => {
    let n = 0;
    return () => ++n;
};
const c = counter();
c(); c(); // 2
```

클래스 없이 프라이빗 상태 보존. 모듈 패턴·메모이제이션·부분 적용에 활용.

## 순수 함수의 3조건 — 실무 기준

1. **같은 입력 → 같은 출력** (결정성·멱등성)
2. **부수효과 없음** (파일·DB·네트워크·공유 변수 변경 금지)
3. **모든 의존성이 인자로 명시** (전역·`now()`·난수 배제)

완벽히 순수하지 않아도 **가능한 경계 안쪽으로 순수성을 집중**시키는 전략("Functional Core, Imperative Shell")이 현실적.

## OOP와의 관계 — 배타적이지 않음

현대 언어(Java·Kotlin·Scala·C#·TypeScript)는 둘을 섞어 쓴다.

- **객체**로 도메인 경계·상태·정체성을 표현
- **함수**로 변환·규칙·조합을 표현
- 전략 패턴·Visitor 같은 OOP 패턴은 람다로 대체되는 경우가 많음
- 도메인 메서드 안에서 순수 함수로 규칙을 표현하면 테스트·추론이 쉬워짐

## 한계·트레이드오프

- **디버깅 난이도**: 깊은 스트림 체이닝은 스택 트레이스가 해석하기 어려움 → 중간 단계에 변수 할당으로 쪼개기
- **성능 오해**: 람다·Stream이 항상 빠르지 않음. 짧은 컬렉션에는 일반 for 루프가 더 빠를 수 있음 — JIT 최적화·박싱(`int` → `Integer`) 비용 고려
- **가독성**: 과도한 합성·Point-free는 읽기 어려움 — 팀 컨벤션 필요
- **예외 처리**: Checked Exception은 Functional Interface와 잘 어울리지 않음 — `Either`·`Result` 타입 또는 unchecked 래핑 필요
- **병렬 스트림의 함정**: 부수효과·순서 의존·Thread Pool 공유 이슈

## 면접 체크포인트

- **Functional Interface** 정의와 `@FunctionalInterface` 어노테이션의 역할
- `Predicate`·`Function`·`Consumer`·`Supplier` **표준 인터페이스 4종**의 쓰임
- **고차 함수**가 제거하는 중복의 예 (filter 하나로 여러 조건)
- **Stream API 중간 연산 vs 최종 연산**·지연 평가
- **Optional**이 null보다 안전한 이유
- Arrow Function의 **`this` 렉시컬 바인딩** 차이
- **순수 함수 3조건**과 함수형 핵심(Imperative Shell) 전략
- **병렬 스트림이 항상 빠르지 않은** 이유

## 출처
- [SK DEVOCEAN — 함수형 프로그래밍 (Java·JavaScript)](https://devocean.sk.com/blog/techBoardDetail.do?ID=165705)

## 관련 문서
- [[Category-Theory-For-Programmers|Category Theory 기초]]
- [[Types-And-Functions-As-Category|타입·순수함수 카테고리]]
- [[Function-Types-And-Currying|Currying · CCC]]
- [[Monads-In-TypeScript|Monad in TypeScript]]
- [[Railway-Oriented-Programming|Railway-Oriented (Result 모나드)]]
- [[Declarative-Programming|Declarative Programming]]
