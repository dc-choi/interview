---
tags: [security, smart-contract, oracle, chainlink, price-feed]
status: done
verified_at: 2026-11-04
category: "보안(Security)"
aliases: ["스마트 컨트랙트 가격 피드 검증", "Smart Contract Price Feed Validation"]
---

# 스마트 컨트랙트 가격 피드 검증

가격 조회가 정상 반환됐다는 사실과 업무 계산에 사용할 수 있다는 사실은 다르다. 아래는 EVM의 Chainlink `AggregatorV3Interface`를 사용하는 가격 소비자의 검토 기준이다. 피드 종류, 대상 자산과 네트워크가 달라지면 조건을 다시 정한다.

## 값, 단위와 시각을 함께 읽는다

`latestRoundData()`는 `roundId`, 부호 있는 `int256 answer`, `startedAt`, `updatedAt`, `answeredInRound`를 반환한다. `decimals()`는 응답값의 소수 자릿수이며 토큰 수량의 decimals와 별개다. `answeredInRound`는 API 문서에서 deprecated로 표시된다.

통합에는 보통 proxy 주소와 인터페이스를 사용한다. 같은 API 모양이어도 피드의 실제 자산, 기준 통화, 네트워크와 구현을 확인해야 한다. 모든 `answer`가 가격을 뜻하는 것도 아니다.

| 경계 | 소비자에서 확인할 조건 |
|---|---|
| 부호 | 양의 담보 가격을 요구하는 시스템이라면 `answer <= 0`을 거부한 뒤 unsigned로 변환한다 |
| 단위 | 피드 decimals, 토큰 decimals와 기준 통화를 구분한다 |
| 시각 | `updatedAt`으로 데이터 나이를 확인한다. 0이나 미래 시각의 처리도 명시한다 |
| 범위 | 허용 가격과 변동 범위, 오류 시 중단할 기능을 정한다 |

위 표는 API 필드에서 도출한 설계 점검이다. 0 이하 거부는 양의 가격을 요구하는 업무의 조건이며 모든 종류의 데이터 피드에 적용할 규칙은 아니다. Solidity에서 음수 정수를 unsigned로 명시 변환하면 큰 양수로 해석될 수 있으므로 변환 후 양수 검사로 대체하지 않는다.

계산 예: `answer=100000000`, 피드 decimals가 8이면 값은 1이다. 이를 18자리 고정소수점으로 표현하면 `10^18`이다. 배율을 바꾸는 구현은 중간 곱셈의 overflow, 나눗셈의 절삭과 지원할 decimals 범위를 별도로 검증한다.

## 최신성과 시장 위험

Data Feed는 실시간 스트림이 아니다. 가격 편차 조건이나 heartbeat가 갱신을 유발하며 체인에 반영되기까지 지연이 생길 수 있다. 허용 데이터 나이는 대상 피드의 설정과 업무 요구로 정하고, 오래된 응답에는 일시 중단이나 대체 동작을 설계한다.

업데이트 간격은 같은 자산도 네트워크마다 다를 수 있다. 고정된 한 시간 같은 예제 값을 모든 피드에 적용하지 않는다. 갱신 시각과 값의 범위를 검사해도 원천 시장의 유동성 부족, 잘못된 입력과 공급자 장애까지 제거되지는 않는다.

따라서 외부 가격 피드를 사용한다는 이유만으로 같은 블록에서 값이 절대 바뀌지 않는다거나 조작이 불가능하다고 보장하지 않는다. 데이터 출처, 업데이트와 거래 실행의 관계를 따로 검토한다.

## 누적값 인터페이스와 실제 평균은 다르다

수학적 점검 예: 현재 가격을 `p`라 하고 누적값처럼 보이는 응답을 `C(t)=p*t`로 만들면, 같은 `p`로 계산한 `(C(t)-C(t-T))/T`는 `p`다. 과거 가격을 관측하거나 보존하지 않았으므로 실제 시간가중평균(TWAP)을 얻은 것이 아니다.

가격 출처를 교체할 때는 함수 시그니처뿐 아니라 순간값, 누적값과 평균 창의 의미가 유지되는지 확인한다. 과거 라운드를 이용하더라도 유효한 round ID가 연속한다고 가정해 하나씩 감소시키지 않는다. Chainlink의 과거 데이터 안내는 모든 round ID가 유효하지는 않다고 명시한다.

## 장애와 검증 사례

다음은 애플리케이션 검증 제안이며 실제 배포의 안전성을 확인한 결과가 아니다.

- 0과 음수, 오래되거나 비정상인 시각, 다른 decimals, 조회 실패를 각각 넣어 거부 경로를 확인한다.
- 차입, 청산과 상환처럼 가격 의존성이 다른 작업의 중단 범위를 나눈다. 상환을 계속 허용할지는 실제 불변조건으로 판단한다.
- 지원되는 L2에서 sequencer uptime feed를 쓴다면 상태와 복구 후 유예 시간을 가격 최신성과 별도로 확인한다. 공식 예제의 유예 시간은 애플리케이션의 확정 운영값이 아니다.

## 출처

- [Chainlink, Data Feeds API Reference](https://docs.chain.link/data-feeds/api-reference)
- [Chainlink, What are Chainlink Data Feeds?](https://docs.chain.link/data-feeds/overview)
- [Chainlink, Selecting Quality Data Feeds](https://docs.chain.link/data-feeds/selecting-data-feeds)
- [Chainlink, Getting Historical Data](https://docs.chain.link/data-feeds/historical-data)
- [Chainlink, L2 Sequencer Uptime Feeds](https://docs.chain.link/data-feeds/l2-sequencer-feeds)
- [Solidity, Types](https://docs.soliditylang.org/en/latest/types.html)

## 관련 문서

- [[Blockchain-Replication-and-Consensus-Cost|블록체인의 결정성과 외부 데이터]]
- [[Solidity-Types-Inheritance-and-Libraries|Solidity 타입과 코드 재사용]]
- [[Smart-Contract-Reentrancy|스마트 컨트랙트 재진입과 상태 일관성]]
