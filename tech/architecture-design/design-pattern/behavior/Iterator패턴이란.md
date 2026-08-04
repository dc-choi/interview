---
tags: [architecture, design-pattern, behavioral, iterator]
status: done
verified_at: 2026-08-04
category: "Architecture & Design"
aliases: ["Iterator Pattern", "반복자 패턴"]
---

# Iterator 패턴이란?

Iterator는 컬렉션의 내부 표현을 노출하지 않고 요소를 차례로 방문하는 인터페이스를 제공하는 행동 패턴이다. 순회 위치는 Iterator가 관리하므로 같은 컬렉션에도 여러 독립 순회와 DFS, BFS 같은 다른 순서를 제공할 수 있다.

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

## 적용 경계

- 컬렉션 구조와 순회 알고리즘을 분리하고 싶다.
- 같은 데이터에 여러 순회 방식이나 독립 커서가 필요하다.
- 소비자가 컬렉션의 인덱스, 트리 링크나 페이지 토큰을 몰라야 한다.

단순 배열 순회라면 내장 반복 프로토콜로 충분하다. 직접 구현할 때는 순회 중 컬렉션 변경, Iterator 재사용 가능 여부와 종료 후 동작을 정한다.

## 출처

- 얄팍한 코딩사전, [Iterator 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=247068)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [TypeScript 공식 문서, Iterators and Generators](https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html)
- [ECMAScript 명세, Iterator Interface](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-iterator-interface)

## 관련 문서

- [[Composite패턴이란|Composite 패턴]]
- [[File-System|Node.js 파일 시스템]]
