---
tags: [econ, investing, bitcoin, cryptocurrency, custody]
status: done
verified_at: 2026-11-17
category: "Economics"
aliases: ["Bitcoin Halving and Holding Routes", "비트코인 반감기와 보유 경로", "비트코인 보관 방식"]
---

# 비트코인의 반감기와 보유 경로

비트코인을 장기 보유 후보로 검토할 때는 공급 규칙, 가격 주기에 관한 주장, 보유 경로의 위험을 나누어 본다. 공급 규칙은 프로토콜 코드로 확인할 수 있는 사실이고, 가격 주기는 과거 관찰에서 나온 가설이며, 보유 경로는 투자자가 고르는 위험의 종류다.

## 공급 규칙: 반감기

- 블록 하나를 만든 채굴자는 새로 발행되는 비트코인(block subsidy)과 거래 수수료를 보상으로 받는다.
- Bitcoin Core의 메인넷 설정은 반감 간격을 210,000블록으로 두고, 보조금은 50 BTC에서 시작해 이 간격마다 절반이 된다. 코드 주석은 이 간격이 약 4년이라고 적는다.
- 그래서 블록 840,000부터 보조금은 50 BTC를 2⁴로 나눈 3.125 BTC다. bitcoin.org는 이 네 번째 반감기를 2024-04-20으로 기록한다. 다음 반감기는 블록 1,050,000이며, 날짜는 블록 생성 속도에 따라 정해지므로 2028년 무렵이라는 것은 추정이다.
- bitcoin.org는 총공급이 2,100만 개를 넘지 않고 보조금은 2140년 무렵 0이 된다고 설명한다. 그 뒤 채굴 보상은 거래 수수료만 남는다.

공급 규칙은 정해져 있지만 가격은 수요가 함께 정한다. 반감기 전후로 오르고 1~2년 뒤 크게 하락한다는 4년 주기설은 과거 몇 번의 관찰에서 나온 가설이다. 독립된 주기가 몇 번밖에 없어 통계적 근거가 약하고, 현물 ETP 같은 새 수요 경로가 생기면 과거 패턴이 그대로 반복된다는 보장도 없다. 주기를 매매 시점의 근거로 쓰기 전에 [[Backtesting-Pitfalls|백테스트의 함정]]의 표본 문제를 먼저 점검한다.

## 보유 경로 세 가지

| 경로 | 투자자가 가진 것 | 주된 위험 | 맞는 경우 |
|---|---|---|---|
| 거래소 위탁 | 거래소 장부상의 잔고 | 거래소 해킹, 운영 중단, 출금 제한 | 자주 사고팔거나 소액을 시험할 때 |
| 자기 보관(지갑) | 비트코인을 옮길 수 있는 키 | 키와 복구 문구 분실, 도난, 상속 실패 | 제3자 의존을 줄이고 관리 절차를 감당할 수 있을 때 |
| 현물 ETP | 상품의 지분 | 운용보수, 상품의 수탁 구조, 거래 가능 시간과 시장 | 증권 계좌 안에서 다른 자산과 함께 관리할 때 |

- **거래소 해킹과 블록체인 해킹은 다르다.** 거래소 지갑에서 자산이 빠져나간 사고는 보관자의 키와 출고 통제가 뚫린 것이지 비트코인 장부 자체가 위조된 것이 아니다. 다만 위탁한 투자자에게는 보상이 이뤄지기 전까지 결과가 같다. 국내 사업자의 콜드월렛 보관과 사고 대비 재원 의무는 [[Virtual-Asset-Exchange-Registration|가상자산사업자 신고와 이용자 보호]]에서 본다.
- **자기 보관은 책임도 옮긴다.** bitcoin.org는 제3자가 키를 통제하면 그 보안과 정직성에 전적으로 의존한다고 설명하는 한편, 비밀번호를 잊으면 자금을 영구히 잃을 수 있고 은행과 달리 복구 수단이 매우 제한적이라고 경고한다. 가족이 접근할 백업 계획이 없으면 상속 단계에서 잃을 수 있다는 점도 함께 든다. 하드웨어 지갑의 물리적 신뢰 문제는 [[Hardware-Wallet-Physical-Trust|하드웨어 지갑의 물리적 신뢰]]에 있다.
- **현물 ETP는 보관을 상품에 맡긴다.** SEC는 2024-01-10 비트코인 하나만 보유하는 현물 ETP 여러 종목의 상장과 거래를 승인했다. 같은 날 SEC 위원장 성명은 이 승인이 비트코인을 승인하거나 보증한 것이 아니고, 공시된 수탁 구조 같은 상품 구성을 보증하지도 않는다고 밝혔다. 국내 투자자가 해외 현물 ETP를 국내 증권사로 살 수 있는지는 시점마다 금융당국의 입장을 따로 확인한다.

## 판단 순서(적용 제안)

1. 보유 목적과 기간을 정한다. 단기 등락으로 사고파는 계획이면 시점 예측의 어려움([[Investment-Strategies|투자 전략]]의 마켓타이밍)부터 본다.
2. 전체 자산에서 손실을 감당할 비중을 정한다. 변동성이 큰 자산의 비중은 [[Asset-Allocation-Diversification|자산배분과 분산투자]]의 위험 감수 기준으로 정한다.
3. 경로를 고른다. 한 경로에 모두 두지 않고 거래용 소액은 거래소에, 장기 보유분은 ETP나 자기 보관에 나누는 방식도 있다.
4. 실패 경험이 없다는 사실을 실력의 증거로 쓰지 않는다. 확신이 커질수록 비중과 매매 빈도를 키우는 행동은 [[Behavioral-Biases-Risk|행동 편향과 리스크 관리]]의 과신 항목으로 점검한다.

## 점검 질문

- 반감기의 블록 간격과 보조금 계산을 코드 기준으로 설명할 수 있는가.
- 4년 주기를 확인된 규칙이 아니라 표본이 적은 가설로 다루는가.
- 내가 가진 것이 장부상 잔고인지, 키인지, 지분인지 구분하는가.
- 자기 보관이라면 복구 문구의 백업과 상속 계획이 있는가.

## 출처

- [Bitcoin Core, src/kernel/chainparams.cpp (master)](https://github.com/bitcoin/bitcoin/blob/master/src/kernel/chainparams.cpp) — 2026-11-17 메인넷 `nSubsidyHalvingInterval = 210000`과 제네시스 블록 보조금 50 BTC 확인
- [Bitcoin Core, src/validation.cpp (master)](https://github.com/bitcoin/bitcoin/blob/master/src/validation.cpp) — 2026-11-17 `GetBlockSubsidy`의 반감 계산과 약 4년 주석 확인
- [bitcoin.org, Bitcoin Halving](https://bitcoin.org/en/halving) — 2026-11-17 2,100만 개 상한, 2140년 무렵 보조금 0, 네 번째 반감기 2024-04-20 확인
- [bitcoin.org, Securing your wallet](https://bitcoin.org/en/secure-your-wallet) — 2026-11-17 제3자 키 통제, 비밀번호 분실, 복구 제한과 백업 계획 확인
- [Statement on the Approval of Spot Bitcoin Exchange-Traded Products — U.S. SEC, Gary Gensler](https://www.sec.gov/newsroom/speeches-statements/gensler-statement-spot-bitcoin-011023) — 2024-01-10 성명, 2026-11-17 확인
- [반토막 난 비트코인, 지금 사도 되는 사람은 따로 있습니다 — YouTube, 이효석아카데미](https://www.youtube.com/watch?v=IiF4GBLcxdA) — 2026-11-08 업로드. 정리의 계기이며 가격 전망, 2026년 규제와 선거 전망, 하락률은 검증하지 않아 쓰지 않았다

## 관련 문서

- [[Virtual-Asset-Exchange-Registration|가상자산사업자 신고와 이용자 보호]]
- [[Hardware-Wallet-Physical-Trust|하드웨어 지갑의 물리적 신뢰]]
- [[HSM-Key-Custody|HSM과 서명 키 관리]]
- [[Stablecoin-Value-and-Redemption|스테이블코인의 가치와 상환]]
- [[Investment-Strategies|투자 전략]]
- [[Behavioral-Biases-Risk|행동 편향과 리스크 관리]]
