---
tags: [security, smart-contract, solidity, reentrancy]
status: done
verified_at: 2026-10-20
category: "보안(Security)"
aliases: ["스마트 컨트랙트 재진입", "Smart Contract Reentrancy"]
---

# 스마트 컨트랙트 재진입과 상태 일관성

## 외부 호출은 제어권을 넘긴다

재진입은 외부 컨트랙트로 넘어간 실행이 원래 호출의 완료 전에 다시 들어오는 것이다. 취약점은 그 시점에 관찰하거나 변경할 수 있는 상태가 업무 불변조건을 만족하지 않을 때 생긴다.

예를 들어 출금 함수가 잔액을 확인한 뒤 송금하고 마지막에 잔액을 차감한다면, 수신 컨트랙트의 콜백이 차감 전 잔액으로 다시 출금할 수 있다. 반복 가능 횟수는 가스와 잔액 등 실행 조건에 제한되므로 무한 출금을 보장하는 설명은 부정확하다.

Ether 송금뿐 아니라 다른 컨트랙트의 함수 호출도 확인한다. 같은 출금 함수만 보지 않고 공유 상태를 읽거나 바꾸는 다른 진입점과 의존 컨트랙트까지 추적한다.

## 검증, 상태 변경, 외부 호출의 순서

Checks-Effects-Interactions는 외부로 제어권을 넘기기 전에 내부 상태를 일관되게 만드는 패턴이다.

1. 호출자 권한, 입력과 잔액을 검증한다.
2. 출금 가능 잔액을 차감하는 등 내부 상태를 먼저 변경한다.
3. 외부 컨트랙트를 호출하고 반환값과 실패를 처리한다.

Solidity 공식 예제는 잔액을 먼저 0으로 바꾸고 `call`의 성공 여부를 확인해 실패하면 revert한다. 적용 시에는 실패 처리에서 상태와 자금 흐름이 함께 보존되는지 확인한다.

이 순서만 적었다고 검증이 끝나는 것은 아니다. 외부 호출이 다른 컨트랙트의 상태를 바꾸고, 그 상태를 다시 참조하는 경로도 검토한다.

## 재진입 가드의 보호 범위

OpenZeppelin Contracts 5.x의 `ReentrancyGuard`는 `nonReentrant`를 적용한 함수로의 중첩 진입을 막는다. 같은 가드를 공유하는 `nonReentrant` 함수끼리는 직접 호출할 수 없으므로 외부 진입점과 내부 작업 함수를 나누는 구성을 검토한다.

가드가 없는 다른 진입점과 일관되지 않은 상태를 읽는 경로까지 자동으로 안전해지는 것은 아니다. 권한 검증이나 회계 불변조건을 대신하는 장치로 사용하지 않는다.

2026-10-20 공식 5.x 문서는 저장소 기반 가드의 deprecated 상태와 v6.0 교체 계획을 안내한다. `ReentrancyGuardTransient`는 배포할 체인의 EIP-1153 지원이 필요하다. 패키지 버전과 체인 지원을 함께 확인하며, 교체 계획을 이미 배포된 v6.0의 사실로 해석하지 않는다.

## 산술 오류와 권한 오류는 따로 본다

Solidity 0.8.0부터 산술 연산의 overflow와 underflow는 기본적으로 revert한다. `unchecked` 블록은 이전의 wrapping 동작을 허용한다. 과거 정수 overflow 사례를 모든 버전의 기본 동작으로 설명하지 않고 컴파일러 버전과 `unchecked` 사용 범위를 확인한다.

관리자 권한, 서명 키와 업그레이드 권한의 보호는 재진입 방지와 별도다. 코드 감사도 모든 버그를 보장해서 제거하지 못하므로 테스트, 접근 제어와 운영 대응을 함께 설계한다. 특정 브리지 사고를 재진입 사례로 분류하려면 해당 사고의 원인 근거를 별도로 확인한다.

## 검토할 조건

다음은 구현에 적용할 점검 제안이며 실행한 테스트 결과가 아니다.

- 외부 호출 직전에 잔액과 총부채 등 관련 불변조건이 성립하는가
- 콜백이 같은 함수 또는 공유 상태를 쓰는 다른 함수로 들어오면 어떻게 되는가
- 외부 호출이 실패할 때 상태와 자금 흐름이 함께 보존되는가
- 가드 적용 범위, 컴파일러 버전과 체인 기능이 실제 배포 조건에 맞는가
- 권한 없는 호출과 서명 키 침해를 재진입 방어와 별개로 다루는가

공식 문서의 동작 설명을 대조했으며 예제 컴파일, 공격 재현과 실제 배포는 수행하지 않았다.

## 출처

- [Solidity, Security Considerations](https://docs.soliditylang.org/en/latest/security-considerations.html) — 재진입, 외부 호출과 Checks-Effects-Interactions
- [Solidity, Solidity v0.8.0 Breaking Changes](https://docs.soliditylang.org/en/latest/080-breaking-changes.html) — 산술 연산과 unchecked
- [OpenZeppelin, Contracts 5.x Utils](https://docs.openzeppelin.com/contracts/5.x/api/utils) — ReentrancyGuard와 ReentrancyGuardTransient의 계약
- [Ethereum, Smart contract security](https://ethereum.org/developers/docs/smart-contracts/security/) — 접근 제어, 테스트와 감사의 한계

## 관련 문서

- [[Application-Security|애플리케이션 보안]]
- [[Access-Control-Models|접근 제어 모델]]
- [[Secret-Management|시크릿 관리]]
