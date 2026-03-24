---
tags: [cs, javascript, async]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Promise와 Async", "JS"]
---

# Promise와Async

## Promise

비동기 처리 시 사용되는 객체이며 실행 순서를 보장하지만 실행 완료 순서는 보장하지 않는다.

### 3가지상태

| 상태 | 설명 |
|------|------|
| Pending(대기) | 비동기 처리 로직이 아직 완료되지 않은 상태 |
| Fulfilled(이행) | 비동기 처리가 완료되어 결과 값을 반환한 상태 |
| Rejected(실패) | 비동기 처리가 실패하거나 오류가 발생한 상태 |

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
