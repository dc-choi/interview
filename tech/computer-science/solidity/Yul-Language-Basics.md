---
tags: [solidity, yul, evm, assembly]
status: done
verified_at: 2026-11-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Yul 문법 기초", "Yul Language Basics"]
---

# Yul 문법과 산술 검사 경계

Solidity의 `assembly { ... }` 안에서는 Yul을 사용한다. Yul은 중간 언어이며 EVM 방언은 기본 256비트 워드를 사용한다. 이를 모든 타입 개념이 없는 언어라고 일반화하지 않는다. Solidity의 여러 안전 검사를 우회하므로 필요한 검증을 따로 확인한다.

## 문법과 값의 해석

| 요소 | 표현과 의미 |
|---|---|
| 변수와 대입 | `let x := 1`, `x := add(x, 1)` |
| 연산 | `add(x, y)`, `lt(x, y)`처럼 함수 형태로 쓴다 |
| 조건 | `if`에는 `else`가 없다. 여러 갈래는 `switch`, `case`, `default`로 표현한다 |
| 반복 | `for { 초기화 } 조건 { 후처리 } { 본문 }`, `break`, `continue` |
| 함수 종료 | `leave`는 현재 Yul 함수를 끝낸다 |

`lt`는 부호 없는 비교, `slt`는 2의 보수로 해석한 부호 있는 비교다. `lt(not(0), 1)`은 0, `slt(not(0), 1)`은 1이 된다. 같은 워드의 해석이 연산에 따라 달라진다.

Yul 함수는 함수 밖의 Yul 지역 변수를 캡처하지 않는다. 별개의 inline assembly 블록끼리도 Yul 변수와 함수의 이름 공간을 공유하지 않는다. `DUP`, `SWAP`, `JUMP`를 직접 쓰는 대신 변수와 제어 흐름의 변환은 컴파일러가 맡는다.

## Solidity 산술과의 차이

| 계산 | Solidity 0.8 이상 기본 산술 | `unchecked` | EVM Yul |
|---|---|---|---|
| `uint256` 최댓값에 1 더하기 | overflow로 되돌림 | 0으로 wrap | `add(not(0), 1)`은 0 |
| 7을 0으로 나누기 | 되돌림 | 되돌림 | `div(7, 0)`은 0 |

`unchecked`도 0으로 나누기 검사를 끄지 않는다. Yul의 `div`와 같은 동작으로 이해하면 안 된다.

검토 제안: assembly 블록마다 산술 범위, 메모리 접근, 저장소 쓰기와 외부 호출을 확인한다. 가스가 줄었다는 사실만으로 안전성이나 전체 동작 동등성을 판단하지 않는다.

## 이해 확인

- `lt`와 `slt`의 결과가 다른 이유를 같은 256비트 값으로 설명한다.
- `unchecked`를 Yul로 바꿀 때 0으로 나누기의 실패 방식이 유지되는지 확인한다.

공식 명세를 대조한 문서다. 컴파일과 실행 시험은 수행하지 않았다.

## 출처

- [Solidity, Yul](https://docs.soliditylang.org/en/latest/yul.html)
- [Solidity, Inline Assembly](https://docs.soliditylang.org/en/latest/assembly.html)
- [Solidity, Expressions and Control Structures](https://docs.soliditylang.org/en/latest/control-structures.html)

## 관련 문서

- [[Solidity-Types-Inheritance-and-Libraries|Solidity 타입과 코드 재사용]]
- [[Smart-Contract-Reentrancy|스마트 컨트랙트 재진입과 상태 일관성]]
