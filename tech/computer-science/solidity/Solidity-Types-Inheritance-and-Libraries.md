---
tags: [solidity, evm, types, abi, inheritance, libraries]
status: done
verified_at: 2026-11-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Solidity 타입과 코드 재사용", "Solidity Types Inheritance and Libraries"]
---

# Solidity 타입과 코드 재사용

Solidity의 타입과 코드 재사용 문법은 EVM의 실행, 저장과 외부 호출 계약에 연결된다. 클래스와 비슷한 모양만 보고 일반 프로세스의 객체 생성 비용이나 호출 방식을 그대로 적용하지 않는다.

## 정적 타입과 ABI 계약

Solidity는 정적 타입 언어다. `uint256`과 `int256`은 부호 해석이 다르며, 명시적 변환이 허용된다고 업무상 유효한 값이 되는 것은 아니다. 금액의 단위와 허용 범위는 별도 조건으로 검증한다.

외부 함수 호출의 첫 4바이트는 함수 이름과 정규화된 입력 타입 목록을 Keccak-256으로 해시한 앞부분이다. `uint`는 시그니처에서 `uint256`으로 쓴다. 반환 타입은 선택자 계산에 들어가지 않지만 ABI의 출력 스키마에는 포함된다.

따라서 입력 타입 변경은 호출 계약 변경으로 검토한다. 반환 타입만 바꾸어 선택자가 같아도 호출자의 디코딩이 맞는지는 따로 확인한다. ABI 인코딩은 자체적으로 타입을 설명하지 않으므로 호출자에게 맞는 스키마가 필요하다. 선택자는 4바이트라 충돌 가능성도 있으며 타입 전체를 보존한 증명은 아니다.

## 단위 접미사는 타입이 아니라 배율이다

숫자 리터럴의 `wei`, `gwei`, `ether`는 각각 1, `10^9`, `10^18`의 배율이다. `seconds`, `minutes`, `hours`, `days`, `weeks`도 초를 기준으로 숫자를 곱한다. 예를 들어 `1 days`는 86,400초다. 이 접미사는 금액과 시간을 구별하는 별도 타입을 만들지 않으므로 변수의 의미와 배율은 입력 계약으로 검증한다.

변수 뒤에 `amount ether`나 `duration days`처럼 붙일 수는 없다. 일수 변수는 `duration * 1 days`처럼 계산한다. `days`는 고정된 초 수이므로 윤년이나 달력상의 날짜 계산을 대신하지 않는다. `365 days`를 1년으로 정했다면 그것은 애플리케이션이 선택한 계산 기준이다.

가상의 소수 자릿수 6인 토큰에서 100개는 최소 단위로 `100 * 10^6`이다. 여기에 `100 ether`를 넣으면 `100 * 10^18`이 되어 의도보다 `10^12`배 크다. 이는 접미사의 배율에서 도출한 예이며, 특정 토큰의 자릿수나 금액 처리 구현을 검증한 결과는 아니다.

## 생성과 상속

컨트랙트 생성자는 생성 시 한 번 실행되고 배포된 런타임 코드에는 포함되지 않는다. 컨트랙트 생성과 기존 주소를 컨트랙트 타입으로 변환하는 일은 구분한다.

`storage`에 저장되는 상태 변수의 값은 트랜잭션 사이에 유지된다. 반면 `transient` 상태 변수의 값은 트랜잭션 종료 시 초기화되므로 다음 트랜잭션으로 이어지지 않는다. 상태 변수라는 이유만으로 영속성을 가정하지 않는다.

`Child is Parent`로 상속한 자식을 배포하면 부모 코드는 자식 배포물에 포함된다. 상속만으로 부모 주소가 별도로 생기지는 않는다. 부모 함수의 내부 호출과 `this.f()` 같은 외부 호출도 구분한다.

## 라이브러리의 두 호출 방식

| 호출 대상 | 배포물과 실행 문맥 |
|---|---|
| 사용하는 `internal` 라이브러리 함수 | 호출 계약의 코드에 포함되어 내부 호출 방식으로 실행된다 |
| `L.f()`로 호출하는 `public` 라이브러리 함수 | 별도 라이브러리 주소를 `DELEGATECALL`로 호출한다. 코드는 라이브러리에, 실행 문맥과 저장소는 호출 계약에 속한다 |

별도 주소를 호출하는 경우 배포한 라이브러리와 연결할 주소를 확인한다. 코드 크기와 가스 차이는 실제 컴파일러, 최적화와 호출 경로로 측정하며 단일 예제의 수치를 일반적인 비용 차이로 쓰지 않는다(설계 점검).

## 저장 접근 비용과 타입 축소의 경계

가스는 소스 줄 수만으로 비교하지 않는다. EIP-2929의 규칙에서 cold `SLOAD`는 2,100 gas, 이미 접근 집합에 있는 warm `SLOAD`는 100 gas다. 접근 집합은 트랜잭션 범위이며, 되돌린 호출 범위에서 추가한 접근 기록도 되돌아간다. 이 수치는 해당 연산의 비용이지 함수나 트랜잭션 전체 비용이 아니다.

`SSTORE` 비용은 트랜잭션 시작 시 원래 값, 현재 값과 새 값에 따라 달라진다(EIP-2200). 따라서 같은 함수와 인자라도 저장 상태가 다르면 비용이 달라질 수 있다. 정확한 비용과 환급은 대상 체인의 적용 규칙까지 확인하며, 과거 EIP의 수치표를 최신 전체 요금표로 쓰지 않는다.

작은 타입을 한 슬롯에 묶으면 함께 읽고 쓰는 값의 접근을 줄일 수 있다. 반면 슬롯 안의 값 하나만 바꾸려면 다른 값을 보존하기 위한 읽기와 결합 연산이 필요해 비용이 늘 수도 있다. 타입을 줄이거나 필드 순서를 바꾸기 전에는 값의 범위, 저장 배치와 외부 getter의 ABI 영향을 함께 검토한다. **저장 슬롯 감소가 안전한 업그레이드나 가스 절감을 자동 보장하지는 않는다.**

실무 점검에서는 초기 저장, 기존 값 갱신과 반복 접근을 나눠 측정한다. 불필요한 저장 접근과 배치를 먼저 살피되, 측정 없이 검증 로직을 제거하지 않는다. 이는 위 비용 구조에서 도출한 검토 순서다.

## 이해 확인

- 입력 타입은 유지하고 반환 타입만 바꾸면 선택자와 호출자의 디코딩에 각각 어떤 영향이 있는가?
- 상속, `internal` 라이브러리, 별도 주소의 `public` 라이브러리를 배포물과 저장소 관점에서 설명할 수 있는가?
- `ether` 접미사를 붙였는데도 토큰의 소수 자릿수를 잘못 처리할 수 있는 이유는 무엇인가?
- 같은 함수의 가스를 비교할 때 초기 저장 상태와 같은 트랜잭션 안의 접근 이력을 왜 맞춰야 하는가?

확인 범위: 공식 문서의 타입, ABI와 호출 구조를 대조했다. 2026-11-04에는 단위 접미사와 저장 배치, EIP-2200과 EIP-2929의 비용 분기를 추가 대조했다. 특정 컴파일러 바이너리로 빌드하거나 가스를 실측하지 않았다.

## 출처

- [Solidity, Units and Globally Available Variables](https://docs.soliditylang.org/en/latest/units-and-global-variables.html)
- [Solidity, Layout of State Variables in Storage and Transient Storage](https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html)
- [Ethereum Improvement Proposals, EIP-2929: Gas cost increases for state access opcodes](https://eips.ethereum.org/EIPS/eip-2929)
- [Ethereum Improvement Proposals, EIP-2200: Structured Definitions for Net Gas Metering](https://eips.ethereum.org/EIPS/eip-2200)
- [Solidity, Types](https://docs.soliditylang.org/en/latest/types.html)
- [Solidity, Contract ABI Specification](https://docs.soliditylang.org/en/latest/abi-spec.html)
- [Solidity, Contracts](https://docs.soliditylang.org/en/latest/contracts.html)
- [Solidity, Structure of a Contract: State Variables](https://docs.soliditylang.org/en/latest/structure-of-a-contract.html#state-variables)
- [Solidity, Expressions and Control Structures](https://docs.soliditylang.org/en/latest/control-structures.html)

## 관련 문서

- [[Blockchain-Replication-and-Consensus-Cost|블록체인의 복제와 합의 비용]]
- [[Yul-Language-Basics|Yul 문법과 산술 검사 경계]]
- [[Open-Source-License-Review|오픈소스 라이선스 검토]]
