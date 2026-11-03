---
tags: [econ, amm, liquidity, defi, price-impact]
status: done
verified_at: 2026-11-04
category: "Economics - Financial Markets"
aliases: ["상수곱 AMM 가격 결정", "Constant Product AMM Pricing"]
---

# 상수곱 AMM 가격 결정

자동화된 시장조성자(AMM)는 호가 주문을 맞추는 대신 유동성 풀과 계산 규칙으로 교환량을 정한다. 여기서는 두 자산의 준비금 전체에 상수곱을 적용하는 Uniswap v2형 모델을 다룬다. 집중 유동성이나 다른 곡선을 쓰는 모든 AMM에 그대로 적용하지 않는다.

## 현재 가격과 실제 교환량

A와 B의 준비금을 각각 x, y라고 하자. 수수료가 없고 연속량으로 계산하면 교환 전후에 `x × y = k`를 유지한다. A를 Δx만큼 넣을 때 받는 B는 다음과 같다.

`Δy = y - xy / (x + Δx) = yΔx / (x + Δx)`

수수료를 제외한 순간 한계가격은 A 하나당 B `y/x`다. 실제 평균 교환비율은 `Δy/Δx`이므로 거래 전 한계가격과 다르다. 유동성에 비해 큰 주문일수록 자기 거래가 가격을 더 움직인다. 이것이 가격 영향(price impact)이다.

시장 가격과 풀 가격이 다르면 차익거래가 정렬 압력으로 작용한다. 그렇다고 준비금 비율이 외부의 공정가치를 독립적으로 증명하는 것은 아니다.

## 수수료를 반영한 계산

입력 수수료율 f에 대해 출력 계산에 쓰는 입력은 `(1-f)Δx`다. Uniswap v2의 0.3% 수수료 모델에서는 다음 식을 쓴다.

`Δy = y × 0.997Δx / (x + 0.997Δx)`

이는 토큰 전송 자체가 수량을 바꾸지 않는 단일 풀 교환의 연속량 모델이다. 실제 컨트랙트는 토큰 최소 단위의 정수로 계산한다. 다른 프로토콜의 수수료율이나 현재 특정 풀의 거래 조건까지 뜻하지 않는다.

가상의 A 1,000개와 B 1,000개인 풀에 A 100개를 넣으면 다음과 같다(위 식의 계산 예시).

| 항목 | 값 |
|---|---|
| 수수료 없는 출력 | B 약 90.9091개 |
| 0.3% 수수료 반영 출력 | B 약 90.6611개 |
| 거래 후 준비금 | A 1,100개, B 약 909.3389개 |
| 거래 후 준비금 곱 | 약 1,000,272.8017 |
| 거래 후 한계가격 | A 하나당 B 약 0.8267개 |

입력 수수료도 풀 안에 남으므로 이 교환 뒤 실제 준비금 곱은 증가한다. 상수곱이라는 이름을 수수료가 있는 거래에서도 곱이 정확히 같다는 뜻으로 읽지 않는다.

## 가격 영향과 슬리피지 허용치

내 주문의 가격 영향은 견적을 낼 때 이미 포함된다. 견적 이후 체결 전까지 다른 거래로 상태가 달라지는 위험은 별도로 남는다. 받을 최소 수량은 수수료와 자기 주문의 가격 영향을 반영한 견적을 기준으로 정한다. 위 예시에서 B 91개를 최소로 요구하면 다른 거래가 없어도 약 90.6611개라는 견적보다 높다.

최소 수량 조건은 불리한 교환을 거절하는 조건이지 체결 보장이 아니다. 허용 손실 범위는 별도로 판단한다. 실제 전송 세금이나 특수 토큰 동작이 있으면 이 단순 견적의 가정을 다시 확인한다.

## 순간 가격을 다른 계약의 평가 기준으로 쓸 때

현재 준비금 비율은 거래로 바꿀 수 있으므로 이를 그대로 담보 평가나 정산 가격으로 쓰면 조작 위험이 생긴다. Uniswap v2는 누적 가격에서 시간가중평균가격(TWAP)을 구할 수 있도록 설계됐다. 평균 구간을 늘리면 조작 비용을 높일 수 있지만 가격 반영이 늦어진다. 평균을 쓴다는 이유만으로 조작 불가능이라고 판단하지 않는다.

점검 질문: 한계가격과 평균 체결가격을 구분했는가, 거래량을 풀 규모와 비교했는가, 수수료와 토큰 단위를 맞췄는가, 견적과 체결 사이의 변화를 제한했는가?

확인 범위: 2026-11-04 Uniswap v2 백서와 공식 라이브러리의 출력량 계산을 대조하고 위 수치를 별도 계산했다. 실제 풀 거래와 투자 수익은 검증하지 않았다. 정수 반올림 구현, 토큰 자릿수와 가격 피드 검증은 아래 기술 문서를 함께 확인한다.

## 출처

- [Uniswap, How Uniswap Works](https://developers.uniswap.org/docs/get-started/concepts/how-uniswap-works)
- [Uniswap v2 Core — Uniswap](https://app.uniswap.org/whitepaper.pdf)
- [UniswapV2Library.sol — Uniswap](https://github.com/Uniswap/v2-periphery/blob/master/contracts/libraries/UniswapV2Library.sol)
- [UniswapV2Router02.sol — Uniswap](https://github.com/Uniswap/v2-periphery/blob/master/contracts/UniswapV2Router02.sol)

## 관련 문서

- [[Risk-and-Return|위험과 수익]]
- [[Solidity-Types-Inheritance-and-Libraries|Solidity 타입과 단위 배율]]
- [[Smart-Contract-Price-Feed-Validation|스마트 계약 가격 피드 검증]]
- [[금융시장(Financial Markets)|금융시장 지도]]
