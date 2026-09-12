---
tags: [architecture, design-pattern]
status: done
verified_at: 2026-09-12
category: "Architecture & Design"
aliases: ["Revealing Constructor 패턴이란?"]
---

# Revealing Constructor 패턴이란?
생성자에 전달한 executor 콜백에 일부 내부 기능을 제공하고, 객체의 공개 API에서는 그 기능을 노출하지 않는 패턴이다. 콜백이 받은 참조를 보관할 수 있으므로 생성 이후 접근까지 자동으로 차단하지는 않는다.

## 왜 쓸까?

### 초기화 기능과 공개 API 분리
초기화에 필요한 기능을 executor에 제공하면서 공개 API를 작게 유지할 때 쓴다.

### 불변성은 별도 설계
불변 객체가 필요하면 executor에 넘긴 가변 데이터와 내부 보관 데이터를 분리하고, 외부에 내보내는 값도 복사해야 한다. 패턴 자체가 참조 유출을 막아주지는 않는다.

### Promise는 capability 전달 예시
Promise 인스턴스의 공개 메서드는 `then`, `catch`, `finally`지만, resolve와 reject는 executor 밖으로 유출하거나 `Promise.withResolvers()`로 얻을 수 있다. 따라서 생성자가 내부 기능을 전달하는 형태는 보여주지만, 생성 이후 접근을 구조적으로 차단하는 엄격한 사례는 아니다.

## 핵심 개념

### 구조
`const object = new SomeClass(function executor(revealedMembers) { ... })`

생성자는 executor를 호출하면서 revealedMembers를 인자로 전달한다. executor가 참조를 저장하거나 비동기 콜백에 넘기면 생성 이후에도 사용할 수 있으므로, 접근 수명은 구현이 정한다.

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
  #buffer: Buffer

  constructor(size: number, executor: (buf: Buffer) => void) {
    const draft = Buffer.alloc(size)
    executor(draft)
    // 외부에 전달한 draft와 메모리 풀을 공유하지 않는 내부 저장소
    this.#buffer = Buffer.alloc(size)
    this.#buffer.set(draft)
  }

  getContent() {
    return Buffer.from(this.#buffer)
  }
}
```

executor가 동기적으로 초기화를 마치면 draft의 내용을 별도 내부 버퍼에 복사한다. `Buffer.alloc()`은 공유 메모리 풀을 사용하지 않고, `#buffer`는 런타임에서도 외부 접근을 막는다. 저장된 draft 참조나 `getContent()` 반환값을 수정해도 내부 바이트는 변하지 않는다. 비동기 초기화의 완료를 기다리는 예제는 아니다.

```typescript
let draftReference: Buffer | undefined
const buffer = new ImmutableBuffer(3, (buf) => {
  buf.write('abc')
  draftReference = buf
})

draftReference?.write('xyz')
buffer.getContent().toString() // 'abc'
buffer.getContent().write('123')
buffer.getContent().toString() // 'abc'
```

## 실 사용 사례
1. Promise: 생성자가 resolve/reject capability를 전달하지만 외부 유출을 구조적으로 막지는 않음
2. Readable 스트림: `Readable` 하위 클래스에서 `_read(size)`를 구현하거나 생성자에 `read` 옵션을 전달
3. 불변 데이터 구조: 초기화용 가변 데이터와 내부 저장소를 복사로 분리

## 출처

- [ECMAScript Language Specification, Promise.withResolvers](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.withresolvers)
- [ECMAScript Language Specification, Promise.prototype.finally](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.prototype.finally)
- [Node.js, Implementing a readable stream](https://nodejs.org/api/stream.html#readable_readsize)
- [Node.js, Buffer.alloc](https://nodejs.org/api/buffer.html#static-method-bufferallocsize-fill-encoding)
- [Node.js, Buffer.from(buffer)](https://nodejs.org/api/buffer.html#static-method-bufferfrombuffer)
- [TypeScript Handbook, Classes: Caveats](https://www.typescriptlang.org/docs/handbook/2/classes.html#caveats)
