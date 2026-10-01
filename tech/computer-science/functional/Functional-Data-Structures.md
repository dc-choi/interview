---
tags: [functional, data-structure, immutability, persistent-data-structure, closure, typescript]
status: done
category: "CS - 함수형 프로그래밍"
aliases: ["Functional Data Structures", "함수형 자료구조", "Persistent Data Structure", "영속 자료구조", "Cons List"]
---

# 함수형 자료구조

학교에서 배우는 배열, 연결 리스트, 트리는 대부분 값을 제자리에서 바꾸는 절차적 설계다. 상태 변경이 없는 순수 함수형 환경에서는 이 방식을 그대로 쓸 수 없으므로, 변경하는 대신 새 버전을 만들고 이전 버전도 그대로 남는 자료구조가 필요하다. 이를 순수 함수형 자료구조, 이전 버전이 계속 유효하다는 성질에 주목하면 영속(persistent) 자료구조라고 부른다.

실무의 멀티 패러다임 언어에서는 이런 자료구조를 직접 구현할 일이 드물다. 그래도 불변 상태 관리, 구조 공유, 재귀적 사고를 이해하는 데 좋은 연습이 된다. 패러다임 사이에 우열은 없고 상황에 맞춰 고른다. 함수형 사고의 전반은 [[Declarative-Programming]]과 [[Lambda-Functional-Interface]]에 있다.

## 함수만으로 데이터를 담는다

클로저는 생성 시점의 값을 기억한다. 두 값을 받아 그 값을 꺼내 쓸 함수를 기다리는 함수를 만들면 구조체 없이 쌍을 표현할 수 있다.

```ts
type Pair<A, B> = <R>(select: (left: A, right: B) => R) => R;

const pair = <A, B>(left: A, right: B): Pair<A, B> => (select) => select(left, right);

const p = pair(1, 2);
p((left, right) => left + right); // 3
```

데이터를 값이 아니라 그 데이터를 소비하는 방법으로 표현하는 이 방식을 람다 계산에서는 처치 인코딩(Church encoding) 계열이라고 부른다. 리스트처럼 여러 경우(빈 리스트, 원소가 있는 리스트)가 있는 구조는 경우마다 처리 함수를 받는 형태(Scott 인코딩)로 확장한다.

```ts
type List<T> = <R>(onNil: () => R, onCons: (head: T, tail: List<T>) => R) => R;

const nil = <T>(): List<T> => (onNil) => onNil();
const cons = <T>(head: T, tail: List<T>): List<T> => (_onNil, onCons) => onCons(head, tail);
const toArray = <T>(list: List<T>): readonly T[] => list(() => [], (head, tail) => [head, ...toArray(tail)]);

toArray(cons(1, cons(2, cons(3, nil<number>())))); // [1, 2, 3]
```

리스트의 원소를 Cons, 빈 리스트를 Nil이라 부르는 관례는 Lisp에서 왔다. 리스트는 머리(head) 하나와 나머지 리스트(tail)로 분해되고, 연산은 이 분해를 재귀로 반복한다.

## 재귀 타입

`List<T>`는 정의 안에서 자기 자신을 참조한다. 연결 리스트의 노드가 다음 노드를 가리키는 것처럼 재귀적인 자료형 자체는 거의 모든 언어가 클래스로 표현할 수 있다. 차이는 타입 별칭 수준의 재귀다. TypeScript는 함수 타입이나 객체 타입 별칭이 자기 자신을 참조하는 것을 허용하지만, Kotlin의 `typealias`처럼 자기 참조가 금지된 언어에서는 같은 표현을 클래스나 `sealed interface`로 한 번 감싸야 한다.

## 실무형 표현: 판별 유니온과 구조 공유

클로저 인코딩은 원리를 보여 주지만 디버거에서 내용을 볼 수 없고 읽기도 어렵다. 실무에서 불변 리스트를 쓴다면 판별 유니온 같은 대수적 자료형으로 표현한다. [[Algebraic-Data-Types]]

```ts
type ConsList<T> =
  | { readonly kind: 'nil' }
  | { readonly kind: 'cons'; readonly head: T; readonly tail: ConsList<T> };

const Nil: ConsList<never> = { kind: 'nil' };
const prepend = <T>(head: T, tail: ConsList<T>): ConsList<T> => ({ kind: 'cons', head, tail });
const append = <T>(value: T, list: ConsList<T>): ConsList<T> =>
  list.kind === 'nil' ? prepend(value, Nil) : prepend(list.head, append(value, list.tail));
```

영속 자료구조가 매번 전체를 복사하지 않는 비결은 구조 공유다.

- `prepend(1, base)`와 `prepend(9, base)`는 새 노드 하나씩만 만들고 `base`를 꼬리로 함께 쓴다. 앞에 붙이기는 O(1)이고 이전 버전은 그대로다.
- `append`는 끝까지 가는 경로의 노드를 모두 새로 만들어야 하므로 O(n)이고 공유가 없다. 인덱스 접근도 O(n)이다.
- 그래서 함수형 언어의 기본 리스트는 앞쪽 연산에 맞춰 쓰고, 임의 접근과 뒤쪽 추가가 잦으면 트리 기반 영속 벡터나 두 리스트로 만든 큐 같은 다른 구조를 쓴다.
- 재귀 구현은 긴 리스트에서 호출 스택을 넘칠 수 있다. JavaScript 엔진은 꼬리 호출 최적화를 일반적으로 보장하지 않으므로 긴 입력은 반복문이나 누적 변수로 바꾼다.

## 조작 함수의 합성

`get`, `append`, `shift`, `update` 같은 연산을 모두 새 리스트를 돌려주는 순수 함수로 만들면, 함수 합성으로 여러 변경을 이어 붙여도 원본은 바뀌지 않는다. 인자가 여러 개인 함수는 커링으로 한 인자 함수로 바꿔 파이프라인에 넣는다. 합성과 커링의 구현, `fn.length`에 의존하는 범용 `curry`가 기본값이나 나머지 매개변수에서 틀어지는 점, 타입을 잃지 않는 `pipe` 오버로드는 [[JavaScript-Function-Composition-and-Currying]]에 있다.

## JavaScript에서 불변성을 쓰는 방법

- 배열은 원본을 바꾸지 않고 새 배열을 돌려주는 `toSorted`, `toReversed`, `toSpliced`, `with`와 스프레드 복사를 쓴다. [[JavaScript-Array-Mutation-Iteration-and-Sorting]]
- 큰 컬렉션을 자주 바꾸면서 이전 버전을 유지해야 하면 구조 공유를 구현한 불변 컬렉션 라이브러리를 검토한다. 매 변경마다 전체를 얕은 복사하면 크기에 비례한 비용이 든다.
- 불변성은 공유 상태의 경쟁을 줄이고 변경 추적과 되돌리기를 쉽게 하지만, 할당이 늘어난다. 객체 그래프 전체 복사와 구조 공유, copy-on-write 범위는 [[Java-Functional-Programming-Principles]]에서도 같은 기준으로 다룬다.

## 체크포인트

- 영속 자료구조의 정의와 이전 버전이 유효하다는 성질의 쓸모
- 클로저만으로 쌍과 리스트를 표현하는 원리
- 구조 공유로 앞에 붙이기는 O(1)이고 뒤에 붙이기는 O(n)인 이유
- 재귀 자료형과 재귀 타입 별칭의 차이
- 불변 자료구조를 실무 JavaScript와 TypeScript에서 쓰는 방법과 비용

## 출처

- [함수형 자료구조 — kciter.so, kciter](https://kciter.so/posts/functional-data-structure/)
- [Purely Functional Data Structures — Cambridge University Press, Chris Okasaki](https://www.cambridge.org/core/books/purely-functional-data-structures/0409255DA1B48FA731859AC72E34D494)

## 관련 문서

- [[Algebraic-Data-Types|Algebraic Data Types]]
- [[JavaScript-Function-Composition-and-Currying|JavaScript 함수 합성과 커링]]
- [[Declarative-Programming|Declarative Programming]]
- [[Linear-Data-Structures|선형 자료구조]]
- [[Type-Driven-Development|타입 주도 개발]]
