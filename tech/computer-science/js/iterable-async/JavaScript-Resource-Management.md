---
tags: [cs, javascript, resource-management, disposal]
status: done
verified_at: 2026-10-01
category: "CS - JavaScript"
---

# 명시적 리소스 해제

메모리에 도달 가능한지 판단하는 GC와 파일, 잠금, 네트워크 리소스를 제때 반환하는 일은 다르다. 명시적 리소스 해제는 소유 범위가 끝날 때 정리 코드를 실행하는 계약이다. 지원 런타임에서는 `using`, `await using`과 disposal protocol을 쓰고, 다른 환경에서는 `try/finally`로 같은 책임을 드러낸다.

## 동기와 비동기 해제

`using`에 등록한 객체는 범위를 벗어날 때 `[Symbol.dispose]()`로 정리한다. `await using`은 비동기 해제 계약을 사용하고 완료를 기다린다. 모든 객체에 자동으로 해제 동작이 생기지는 않는다.

```js
const events = [];
{
  using first = { [Symbol.dispose]() { events.push('first'); } };
  using second = { [Symbol.dispose]() { events.push('second'); } };
  events.push('body');
}
console.log(events); // ['body', 'second', 'first']
```

등록한 역순으로 해제한다. 정상 종료뿐 아니라 `return`과 `throw`로 범위를 떠날 때도 적용된다. `null`과 `undefined`는 해제할 자원이 없는 값으로 허용된다. 프로세스 강제 종료나 비정상 종료까지 cleanup 실행을 보장하는 것은 아니다.

비동기 해제는 `await`를 사용할 수 있는 실행 문맥에서 사용한다. 동기 `using`에 비동기 함수를 억지로 연결해 반환 Promise가 기다려질 것이라고 기대하지 않는다. 해제 후에도 변수가 가리키던 객체 자체가 즉시 메모리에서 없어지는 것은 아니다.

## DisposableStack으로 소유권을 모은다

여러 자원을 단계별로 얻다가 중간에 실패할 수 있으면 stack에 얻은 순서대로 등록한다. `use`는 protocol을 구현한 객체를 등록하고, `adopt`는 특정 값과 해제 callback을 연결하며, `defer`는 인자 없는 cleanup을 등록한다.

```js
const events = [];
{
  using stack = new DisposableStack();
  const resource = stack.adopt({ id: 1 }, ({ id }) => events.push(id));
  stack.defer(() => events.push('cleanup'));
  console.log(resource.id); // 1
}
console.log(events); // ['cleanup', 1]
```

`move()`는 등록한 자원을 새 stack으로 옮기고 원래 stack을 disposed 상태로 만든다. 성공적으로 구성한 자원의 소유권을 호출자에게 넘기는 경우에 유용하다. 소유권을 넘긴 뒤 원래 scope에서 자원을 계속 쓰거나 두 곳에서 별도 해제하지 않는다.

`AsyncDisposableStack`의 명시적 해제 메서드는 `disposeAsync()`다. 비동기 cleanup들을 기다려야 하므로 stack의 lifetime도 완료까지 유지한다. 일반 `DisposableStack.dispose()`와 이름과 반환 계약을 구분한다.

## 본문과 해제가 함께 실패할 때

본문에서 오류가 발생한 뒤 cleanup도 실패할 수 있다. 이때 `SuppressedError`는 새 cleanup 오류를 `error`, 앞서 발생한 오류를 `suppressed`에 보존한다. 여러 cleanup이 실패하면 이 구조가 중첩될 수 있다.

로그에서는 최상위 message 하나만 기록해 최초 실패를 잃지 않는다. 오류 사슬을 수집하되 리소스 경로와 비밀 값이 외부 응답으로 노출되지 않게 한다. cleanup 실패를 무조건 삼키거나 성공 응답으로 바꾸지 않는다.

## 소유 범위와 작업 완료

- scope 밖으로 반환할 값이 해제된 자원을 참조하지 않는지 확인한다.
- 자원을 사용하는 비동기 작업이 끝나기 전에 scope를 떠나지 않는다. 작업을 시작만 하고 반환하면 cleanup이 먼저 실행될 수 있다.
- resource API의 close/dispose 계약을 확인한다. 언어가 중복 해제의 안전성과 트랜잭션 rollback까지 만들어 주지 않는다.
- WeakRef와 FinalizationRegistry는 해제 시점 보장이 없어 필수 cleanup을 대신할 수 없다.
- 문법 지원은 실행 전에 파싱에 영향을 준다. 최종 배포 런타임과 빌드 변환을 확인한다.

## 출처

- [Explicit Resource Management — V8](https://v8.dev/features/explicit-resource-management)
- [ECMAScript, DisposableStack Objects](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-disposablestack-objects)
- [ECMAScript, AsyncDisposableStack Objects](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-asyncdisposablestack-objects)

## 관련 문서

- [[JavaScript-Keyed-Collections-and-Weak-References|약한 참조와 GC 경계]]
- [[Promise-Async|비동기 작업의 완료와 실패]]
