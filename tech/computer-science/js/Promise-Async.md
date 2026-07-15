---
tags: [cs, javascript, async]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Promise와 Async"]
---

# Promise와Async

## Promise

비동기 처리 시 사용되는 객체이며 실행 순서를 보장하지만 실행 완료 순서는 보장하지 않는다.

### 3가지 상태 + Settled

| 상태 | 설명 |
|------|------|
| **Pending (대기)** | 비동기 처리 로직이 아직 완료되지 않은 상태 (초기) |
| **Fulfilled (이행)** | 비동기 처리가 성공적으로 완료된 상태 |
| **Rejected (실패)** | 비동기 처리가 실패, 오류 발생한 상태 |
| **Settled (정착)** | Fulfilled 또는 Rejected — "더 이상 Pending이 아닌" 모든 상태 |

### resolve() vs fulfilled — 자주 혼동

- **`resolve()`**: Promise를 어떤 값이나 thenable의 결과로 **해결하려는 함수 호출** → 동작
- **`fulfilled`**: Promise가 성공 값으로 정착한 **상태** → 결과

보통 `resolve(value)`를 호출하면 `pending` → `fulfilled`로 전환된다. 다만 `resolve(rejectedPromise)`나 rejected thenable을 넘기면 최종 상태는 `rejected`가 될 수 있다. **실패로 끝내려면 보통 `reject()`** 호출 → 상태 `rejected`.

```
new Promise((resolve, reject) => {
  // 성공 조건이면
  resolve('ok');       // → fulfilled 상태, value = 'ok'
  // 실패 조건이면
  reject(new Error()); // → rejected 상태
});
```

`then()`은 fulfilled에 호출, `catch()`는 rejected에 호출. `finally()`는 **settled** 시점에 호출 (성공/실패 무관).

### 상태 전이는 1회뿐
한 번 `fulfilled` 또는 `rejected`가 되면 **다시 못 돌아감**. `resolve()` 여러 번 호출해도 첫 번째만 유효. 이 불변성이 Promise 안전성의 핵심.

## async&await

- 프로미스 객체를 가독성 있게 사용하기 위한 문법
- async 함수는 항상 Promise를 반환
- async 함수 내에서 await 키워드로 비동기 작업 완료를 대기
- 남발할 경우 성능 문제 발생 가능 (순차 실행으로 인한 병목)

## Promise.all()vsPromise.allSettled()

| 메서드 | 동작 | 사용시점 |
|--------|------|---------|
| Promise.all() | 모든 프로미스 실행, **하나라도 실패하면 전체 실패** | 모두 성공해야 하는 경우 |
| Promise.allSettled() | 모든 프로미스 실행, **각각의 상태를 개별 관리** | 각각 독립적으로 처리해도 되는 경우 |


## `return await` 생략은 항상 정답인가

과거 ESLint `no-return-await` 규칙은 `return await fn()`의 `await`를 불필요한 성능 비용으로 봤다. 하지만 최신 ESLint에서는 이 규칙이 deprecated 되었고, 최신 엔진에서는 추가 마이크로태스크가 생긴다는 설명도 맞지 않는다. 여전히 중요한 차이는 **스택 트레이스 가독성**과 `try/catch` 동작이다.

### 예시
```ts
async function bizLogic() {
  return await api.call();     // (A) await 있음
  // return api.call();         // (B) await 생략
}
```

- **(A) await 있음**: `bizLogic`이 `await`에서 일시 정지 → 에러 스택에 **`bizLogic` 프레임이 남음**
- **(B) await 생략**: `bizLogic`이 Promise를 즉시 반환, 종료 → 에러 스택에서 **`bizLogic` 증발**, `api.call` 이하만 남음

프로덕션에서 에러 역추적할 때 **어느 비즈니스 로직에서 터졌는지** 보이느냐의 차이가 난다. 성능상 이득을 기대하기보다 디버깅, 에러 처리 맥락을 기준으로 판단한다.

### 권장 판단

- **백엔드**: 대부분 DB, 외부 API 호출이 수 ms~수백 ms. **`return await` 유지가 디버깅 이득이 큰 경우가 많음**
- **초고빈도 핫 루프**: 트리, 리스트 재귀 같은 경우라면 생략 의미 있을 수 있음. 측정 필수
- **`try-catch`로 감싸는 경우**: `return await` 안 쓰면 함수 밖에서 reject → 내 `catch`가 못 잡음. **반드시 `return await`**

### 결론

`no-return-await` 계열 조언은 과거 엔진 최적화 전제의 영향이 크다. 오늘날 대부분 코드에서는 **스택 트레이스, 에러 처리**가 우선. **ESLint 규칙을 맹신하지 말고 맥락에 맞게** 적용.

## 출처
- [매일메일 — Promise](https://www.maeil-mail.kr/question/65)
- [매일메일 — resolve와 fulfilled 차이](https://www.maeil-mail.kr/question/73)
- [매일메일 — JS 비동기 처리](https://www.maeil-mail.kr/question/57)
- [jojoldu — no-return-await는 항상 정답일까](https://jojoldu.tistory.com/699)

## 관련 문서
- [[Event-Loop|Node.js Event Loop]]
- [[Async-Internals|비동기 내부 동작]]
- [[JS-Function-Forms|JS 함수 형태]]
- [[Monads-In-TypeScript|Monads (Promise는 진짜 모나드인가)]]
