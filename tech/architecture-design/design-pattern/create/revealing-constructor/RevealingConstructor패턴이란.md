---
tags: [architecture, design-pattern]
status: done
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

### Promise가 대표적 예시
executor 함수에서만 resolve/reject를 호출할 수 있고, 외부에서는 .then()과 .catch()만 사용할 수 있다.

## 핵심 개념

### 구조
`const object = new SomeClass(function executor(revealedMembers) { ... })`

executor 함수가 생성자에 전달되고, revealedMembers는 생성 시점에만 접근 가능한 내부 기능이다. 생성 완료 후 외부에서는 공개 API만 사용 가능하다.

### Promise 예시
```typescript
const promise = new Promise((resolve, reject) => {
  // resolve와 reject는 여기서만 접근 가능
  // 외부에서는 .then()과 .catch()만 사용
  resolve('done')
})
```

resolve와 reject는 executor 함수의 인자로만 전달된다. Promise 객체가 생성된 후에는 이 함수들에 접근할 방법이 없다.

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
1. Promise: executor에서만 resolve/reject 가능
2. Readable 스트림: 생성자에서만 _read 구현 가능
3. 불변 데이터 구조: 생성 시에만 데이터 주입
