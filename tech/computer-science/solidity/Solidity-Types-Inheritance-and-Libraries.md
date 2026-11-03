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

## 이해 확인

- 입력 타입은 유지하고 반환 타입만 바꾸면 선택자와 호출자의 디코딩에 각각 어떤 영향이 있는가?
- 상속, `internal` 라이브러리, 별도 주소의 `public` 라이브러리를 배포물과 저장소 관점에서 설명할 수 있는가?

확인 범위: 공식 문서의 타입, ABI와 호출 구조를 대조했다. 특정 컴파일러 바이너리로 빌드하거나 가스를 실측하지 않았다.

## 출처

- [Solidity, Types](https://docs.soliditylang.org/en/latest/types.html)
- [Solidity, Contract ABI Specification](https://docs.soliditylang.org/en/latest/abi-spec.html)
- [Solidity, Contracts](https://docs.soliditylang.org/en/latest/contracts.html)
- [Solidity, Structure of a Contract: State Variables](https://docs.soliditylang.org/en/latest/structure-of-a-contract.html#state-variables)
- [Solidity, Expressions and Control Structures](https://docs.soliditylang.org/en/latest/control-structures.html)

## 관련 문서

- [[Blockchain-Replication-and-Consensus-Cost|블록체인의 복제와 합의 비용]]
- [[Yul-Language-Basics|Yul 문법과 산술 검사 경계]]
- [[Open-Source-License-Review|오픈소스 라이선스 검토]]
