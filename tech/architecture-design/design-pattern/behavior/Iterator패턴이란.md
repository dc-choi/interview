---
tags: [architecture, design-pattern, behavioral, iterator]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Iterator Pattern", "반복자 패턴"]
---

# Iterator 패턴이란?

Iterator는 컬렉션의 내부 표현을 노출하지 않고 요소를 차례로 방문하는 인터페이스를 제공하는 행동 패턴이다. 순회 위치는 Iterator가 관리하므로 같은 컬렉션에도 여러 독립 순회와 DFS, BFS 같은 다른 순서를 제공할 수 있다.

## 참여자와 JavaScript 대응

| 역할 | 책임 | JavaScript와 TypeScript 대응 |
|---|---|---|
| Iterator | 요소 접근과 순회 연산을 정의한다 | `Iterator<T>`의 `next()` |
| ConcreteIterator | Iterator를 구현하고 현재 순회 위치를 기억한다 | generator 객체, 직접 만든 iterator 객체 |
| Aggregate | Iterator를 만드는 연산을 정의한다 | `Iterable<T>`의 `[Symbol.iterator]()` |
| ConcreteAggregate | 자기 구조에 맞는 ConcreteIterator를 만들어 반환한다 | `[Symbol.iterator]()`를 구현한 컬렉션 클래스 |

다형적 순회는 Aggregate의 생성 연산을 [[Factory패턴이란|Factory Method]]로 쓴다. 배열, 연결 리스트와 트리가 각자 구조에 맞는 ConcreteIterator를 돌려주므로 클라이언트는 Iterator 계약만 알면 된다. 같은 컬렉션을 여러 번 또는 동시에 순회하려면 이 연산이 호출마다 처음부터 시작하는 새 Iterator를 돌려줘야 한다. 자기 자신을 돌려주는 iterator와 재사용 가능한 iterable의 차이는 [[JavaScript-Iterator-and-Generator-Protocol|Iterator와 Generator protocol]]에서 다룬다.

## JavaScript와 TypeScript 프로토콜

- Iterable은 `[Symbol.iterator]()`로 Iterator를 만든다.
- Iterator의 `next()`는 `{ value, done }` 형태의 결과를 반환한다.
- `for...of`는 Iterable에서 Iterator를 얻어 순회한다.
- 비동기 데이터는 `[Symbol.asyncIterator]()`와 `for await...of`를 사용할 수 있다.

```typescript
class Range implements Iterable<number> {
  constructor(
    private readonly start: number,
    private readonly end: number,
  ) {}

  *[Symbol.iterator](): Iterator<number> {
    for (let value = this.start; value <= this.end; value += 1) {
      yield value
    }
  }
}

for (const value of new Range(1, 3)) {
  console.log(value)
}
```

Generator는 Iterator를 편리하게 만드는 언어 기능이다. Iterator 자체가 지연 생성이나 메모리 절약을 보장하지는 않는다. 이미 모든 요소를 메모리에 가진 배열도 Iterator를 제공하며, 구현이 미리 전체 결과를 계산할 수도 있다.

## 비동기 페이지 순회

```typescript
async function* listOrders(client: OrdersClient) {
  let cursor: string | undefined
  do {
    const page = await client.list({ cursor })
    yield* page.items
    cursor = page.nextCursor
  } while (cursor)
}
```

이 구현은 소비 속도에 맞춰 다음 페이지를 요청한다. 실패 재시도, 취소, 페이지 사이 데이터 변경과 중복 처리는 별도 계약이다. TypeORM 결과를 스트리밍할 때도 드라이버의 커서와 트랜잭션 수명, 연결 반환 시점을 확인해야 한다.

## 직접 구현할 때

### 커서형 인터페이스

GoF의 최소 Iterator 인터페이스는 `First`, `Next`, `IsDone`, `CurrentItem`이고, `First()`로 첫 요소에 위치한 뒤 읽으며 `IsDone()`이 참이면 `CurrentItem`을 읽을 수 없다. .NET `IEnumerator`는 첫 요소 앞에서 시작하므로 첫 `MoveNext()` 전과 `MoveNext()`가 `false`를 반환한 뒤에 `Current`가 정의되지 않는다. 위치를 -1에서 시작하는 배열 구현이 이런 무효 위치에서 `items[index]`를 그대로 반환하면 TypeScript는 `--strict`에서도 반환 타입을 `T`로 보지만 실제 값은 `undefined`다. `noUncheckedIndexedAccess`를 켜야 인덱스 접근이 `T | undefined`로 잡힌다. 커서형을 유지하려면 잘못된 위치의 읽기에서 예외를 던지거나 반환 타입을 `T | undefined`로 둔다.

JavaScript의 `next()`는 전진과 읽기를 한 번에 하고, TypeScript의 `IteratorResult<T>`는 `done`으로 구분되는 유니언이라 값과 종료가 섞이지 않는다. 결과 타입을 직접 `{ value: T | undefined; done: boolean }`처럼 두면 `done`으로 좁혀도 `value`가 `T`가 되지 않는다. 이를 `value !== undefined` 같은 필터로 우회하면 실제 `undefined` 원소가 빠진다. 새 컬렉션은 `[Symbol.iterator]()`를 구현해 `for...of`, spread, `Array.from` 같은 표준 소비자에 맞추는 편이 호출 순서 실수를 줄인다.

### ConcreteIterator의 접근 권한

ConcreteIterator는 Aggregate의 내부를 읽어야 해서 둘은 강하게 결합된다. C++에서는 Iterator를 Aggregate의 `friend`로 두어 순회만을 위한 공개 연산을 피할 수 있지만, TypeScript에는 특정 클래스에만 비공개 멤버를 여는 접근 제어자가 없다. Aggregate 본문 밖에 선언한 클래스에서 점 표기로 `private` 멤버를 읽으면 타입 검사 오류가 되지만 대괄호 표기는 통과하는 soft private이고, `#` 필드는 클래스 본문 밖에서 참조할 수 없다. 그래서 우회 없이 Aggregate 본문 밖의 ConcreteIterator 클래스에 Aggregate 자신을 넘기면 `getItem(index)`, `count` 같은 인덱스 API를 공개하게 되고, 모든 클라이언트가 그 내부 표현에 기댈 수 있다. 반대로 `private` 검사와 `#` 이름은 클래스 본문의 렉시컬 범위를 따르므로, `static readonly #Cursor = class { ... }`처럼 Aggregate 본문 안에 선언한 ConcreteIterator는 Aggregate 자신을 받아도 공개 API 없이 `#` 필드를 읽을 수 있어 `friend`와 비슷한 효과를 낸다.

공개 API를 늘리지 않으려면 export하지 않은 ConcreteIterator의 생성자에 내부 배열이나 노드 같은 순회 상태만 넘기거나, ConcreteIterator를 Aggregate 본문 안에 두거나, 아래처럼 Aggregate의 generator 메서드가 `#` 필드를 직접 읽게 한다. 소비자는 배열과 연결 리스트를 같은 `Iterable<number>`로 받는다.

```typescript
interface ListNode<T> {
  readonly value: T
  readonly next: ListNode<T> | undefined
}

class LinkedList<T> implements Iterable<T> {
  readonly #head: ListNode<T> | undefined

  constructor(values: readonly T[]) {
    this.#head = values.reduceRight<ListNode<T> | undefined>(
      (next, value) => ({ value, next }),
      undefined,
    )
  }

  /** 호출마다 head에서 시작하는 새 순회를 만든다. */
  *[Symbol.iterator](): Generator<T, void, undefined> {
    for (let node = this.#head; node !== undefined; node = node.next) {
      yield node.value
    }
  }
}

/**
 * 컬렉션의 내부 구조와 무관하게 합계를 구한다.
 * @param values 순회할 숫자 컬렉션
 * @returns 합계
 */
const total = (values: Iterable<number>): number => {
  return [...values].reduce((sum, value) => sum + value, 0)
}

total([1000, 2000]) // 3000
total(new LinkedList([1000, 2000])) // 3000
```

## 적용 경계

- 컬렉션 구조와 순회 알고리즘을 분리하고 싶다.
- 같은 데이터에 여러 순회 방식이나 독립 커서가 필요하다.
- 소비자가 컬렉션의 인덱스, 트리 링크나 페이지 토큰을 몰라야 한다.

단순 배열 순회라면 내장 반복 프로토콜로 충분하다. 직접 구현할 때는 순회 중 컬렉션 변경, Iterator 재사용 가능 여부와 종료 후 동작을 정한다.

## 출처

- 얄팍한 코딩사전, [Iterator 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=247068)
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 3. Iterator](https://www.youtube.com/watch?v=4BdFu4PaUJc)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [TypeScript 공식 문서, Iterators and Generators](https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html)
- [ECMAScript 명세, Iterator Interface](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-iterator-interface)
- [ECMAScript 명세, PrivateEnvironment Records](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-privateenvironment-records)
- [MDN, Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)
- [TypeScript 공식 문서, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript 공식 문서, noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html)
- [Microsoft Learn, IEnumerator Interface](https://learn.microsoft.com/en-us/dotnet/api/system.collections.ienumerator)

## 관련 문서

- [[Composite패턴이란|Composite 패턴]]
- [[JavaScript-Iterator-and-Generator-Protocol|JavaScript Iterator와 Generator protocol]]
- [[File-System|Node.js 파일 시스템]]
