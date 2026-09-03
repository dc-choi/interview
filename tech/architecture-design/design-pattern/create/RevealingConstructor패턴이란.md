---
tags: [architecture, design-pattern]
status: done
verified_at: 2026-09-03
category: "Architecture & Design"
aliases: ["Revealing Constructor 패턴이란?"]
---

# Revealing Constructor 패턴이란?
객체 생성 시에만 내부 기능을 노출하고, 생성 이후에는 접근을 차단하는 패턴

## 왜 쓸까?

### 생성 시점에만 설정 허용
객체가 생성된 이후에는 내부 상태를 변경할 수 없어야 하는 경우에 적합하다.

### 불변성 보장
외부에서 내부 상태를 변경할 수 없도록 구조적으로 보장한다.

### Promise는 capability 전달 예시
Promise 인스턴스의 공개 메서드는 `then`, `catch`, `finally`지만, resolve와 reject는 executor 밖으로 유출하거나 `Promise.withResolvers()`로 얻을 수 있다. 따라서 생성자가 내부 기능을 전달하는 형태는 보여주지만, 생성 이후 접근을 구조적으로 차단하는 엄격한 사례는 아니다.

## 핵심 개념

### 구조
`const object = new SomeClass(function executor(revealedMembers) { ... })`

executor 함수가 생성자에 전달되고, revealedMembers는 생성 시점에만 접근 가능한 내부 기능이다. 생성 완료 후 외부에서는 공개 API만 사용 가능하다.

### Promise 예시
```typescript
const promise = new Promise((resolve, reject) => {
  // resolve와 reject를 이 클로저 안에만 두는 것은 작성자의 선택이다.
  resolve('done')
})
```

resolve와 reject는 executor의 인자로 전달되지만 바깥 변수에 저장할 수 있다. `Promise.withResolvers()`는 `promise`, `resolve`, `reject`를 함께 반환하므로, 접근 범위는 Promise가 아니라 코드를 작성한 쪽이 통제한다.

### ImmutableBuffer 예시
```typescript
class ImmutableBuffer {
  private buffer: Buffer

  constructor(size: number, executor: (buf: Buffer) => void) {
    this.buffer = Buffer.alloc(size)
    executor(this.buffer) // 생성 시에만 쓰기 가능
  }

  getContent() {
    return Buffer.from(this.buffer) // 복사본 반환 (원본 보호)
  }
}
```

생성자에서 executor를 호출하여 버퍼에 데이터를 쓸 수 있는 기회를 준다. 생성 이후에는 getContent()로 복사본만 가져올 수 있어 원본 데이터의 불변성이 보장된다.

```typescript
const buffer = new ImmutableBuffer(3, (buf) => {
  buf.write('abc') // 생성 시에만 쓰기 가능
})

buffer.getContent() // 복사본 반환, 원본은 변경 불가
```

## 실 사용 사례
1. Promise: 생성자가 resolve/reject capability를 전달하지만 외부 유출을 구조적으로 막지는 않음
2. Readable 스트림: `Readable` 하위 클래스에서 `_read(size)`를 구현하거나 생성자에 `read` 옵션을 전달
3. 불변 데이터 구조: 생성 시에만 데이터 주입

## 출처

- [ECMAScript Language Specification, Promise.withResolvers](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.withresolvers)
- [ECMAScript Language Specification, Promise.prototype.finally](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.prototype.finally)
- [Node.js, Implementing a readable stream](https://nodejs.org/api/stream.html#readable_readsize)
