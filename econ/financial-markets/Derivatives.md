---
tags: [econ, finance]
status: done
category: "Economics"
aliases: ["파생상품", "Derivatives"]
verified_at: 2026-10-12
---

# 파생상품

> 한 줄 요약: 파생상품은 기초자산이나 기준 변수에서 가치가 파생되는 계약이다. 기존 위험을 줄이거나 새로운 위험을 질 수 있으며, 목적과 전체 포지션, 레버리지와 결제 조건을 함께 봐야 한다.

## 1. 파생상품이란 무엇인가

파생상품은 **기초자산, 금리, 지수 같은 기준 변수에서 가치가 파생되는 계약**이다. 옵션 프리미엄처럼 파생상품 계약 자체도 현재 시장가치를 가진다. 미래 현금흐름이나 가격 위험을 이전, 관리하거나 시장 전망을 표현하는 데 사용한다.

## 2. 기본형 — 선도, 선물, 옵션, 스왑

- **선도(forward)**: 미래의 거래 가격, 수량과 시점 등을 당사자가 맞춤 합의하는 장외(OTC) 계약. 농부가 구매자와 수확물 가격을 미리 정하거나 수출 기업이 은행과 선물환을 계약하는 예가 여기에 해당한다. 양쪽에 이행 의무가 있다.
- **선물(futures)**: 거래소가 수량, 만기 등 조건을 표준화한 미래 매매 계약. 양쪽에 이행 의무가 있고 청산기관이 결제를 관리한다. 선도와 선물은 목적이 비슷해도 거래 구조와 현금흐름이 다르다.
- **옵션(option)**: 매수자가 프리미엄을 부담하고 정해진 가격에 살(콜) 또는 팔(풋) **권리**를 얻는 계약. 매수자에게 행사 의무는 없지만, 매도자는 행사와 배정에 따라 결제나 인도 의무를 진다. 행사 가능 시점과 자동행사 조건은 계약별로 다르다.
- **스왑(swap)**: 두 당사자가 미래의 현금흐름을 맞교환하는 계약. 변동금리 이자를 고정금리로 바꾸는 금리스왑이 대표적이다.

선물은 일일정산으로 손익을 주고받고, 계약에 따라 최종적으로 현금결제하거나 실물을 인도한다. 인도 의무가 생기기 전 상쇄거래로 포지션을 닫을 수도 있지만 체결이 보장되지는 않는다. 거래 장소와 청산 여부는 별개이며, 일부 장외 선도도 중앙청산과 담보를 사용한다.

## 3. 무엇에 쓰나 — 헤지, 투기, 차익거래

같은 도구가 목적에 따라 정반대 성격을 띤다.

- **헤지(위험 관리)**: 기존 또는 예상 거래의 위험을 상쇄하려는 포지션이다. 수출 기업이 예상 외화 수입을 선물환으로 고정하면 환율 변동 노출을 줄일 수 있다. 실제 수입의 금액과 시점 불일치, 헤지 대상과 수단의 가격 관계가 예상과 달라지는 **베이시스 위험(basis risk)**, 거래상대방과 유동성 위험은 남을 수 있다.
- **투기**: 가격 방향에 베팅해 수익을 노린다. 위험을 줄이는 게 아니라 새로 진다.
- **차익거래**: 이론적으로 같은 현금흐름의 가격 차이를 상쇄 포지션으로 포착한다. 실제 거래에는 실행, 자금조달, 거래상대방과 모델 위험이 있어 완전한 무위험 이익이 아닐 수 있다.

헤지인지 투기인지는 파생상품만 떼어 보지 않고 기존 자산, 부채와 예상 거래를 합쳐 판단한다. 헤지 목적이라도 과도한 수량이나 잘못 맞춘 만기는 새로운 위험을 만들 수 있다.

## 4. 레버리지, 증거금과 유동성

선물 등은 적은 증거금으로 큰 계약 규모에 노출될 수 있어 **레버리지**가 생긴다. 가격 변화에 따른 손익이 투입 자금 대비 커질 수 있다. 옵션 매수도 프리미엄 대비 큰 가격 노출을 가질 수 있지만, 모든 파생상품 포지션의 위험이나 손실 한도가 같은 것은 아니다.

**선물 증거금은 계약 이행을 위한 담보이며 매매대금의 일부나 최대 손실액이 아니다.** 일일정산 손실이나 증거금 요건 상승으로 추가 자금이 필요할 수 있다. 이를 충족하지 못하면 포지션이 강제 청산될 수 있고, 청산 뒤에도 계좌의 부족액을 갚아야 할 수 있다.

- **시장 유동성 위험**: 거래 상대 주문 부족이나 거래 제한으로 원하는 때와 가격에 상쇄거래를 체결하지 못할 수 있다.
- **자금 유동성 위험**: 최종적으로 헤지 효과가 있어도 증거금 납부가 먼저 필요하면 그 시점의 현금 부족으로 포지션을 유지하지 못할 수 있다.
- **거래상대방 위험**: 계약 상대가 의무를 이행하지 못할 위험이다. 중앙청산과 담보는 이를 관리하지만 시장 손실이나 모든 이행 위험을 없애지는 않는다.

## 5. 시스템 리스크

파생상품 거래로 기관들이 연결되면 한 곳의 부실이 다른 기관으로 번질 수 있다. 2008년 금융위기 때 AIG는 주택 관련 증권의 손실과 신용부도스왑(CDS)의 담보 요구로 유동성 압박을 받았다. AIG의 부실은 거래상대방의 손실과 금융시스템 불안으로 이어질 위험이 있었다. CDS는 부도 지급뿐 아니라 부도 전의 평가손실과 담보 납부도 부담이 될 수 있음을 보여준다 → [[Business-Cycle|경기순환]].

## 6. 핵심 개념

- **선도, 선물, 옵션, 스왑**: 계약 구조와 권리, 의무를 구분
- **헤지 vs 투기**: 기존 노출을 포함한 전체 포지션으로 판단
- **레버리지**: 수익과 손실을 함께 증폭
- **증거금과 결제**: 담보와 최대 손실을 구분하고 납부, 인도 의무를 확인
- **시스템 리스크**: 연결이 만드는 전염
- **이벤트 계약**: 가격을 확률의 근사로 읽되 판정 주체와 적용 법을 함께 확인

## 7. 흔한 오해

- **파생상품은 모두 도박이다** → 위험 이전과 가격 노출에 쓰이는 계약이다. 헤지인지 투기인지는 사용 목적과 실제 노출에 달려 있으며, 헤지에도 비용과 잔여 위험이 있다.
- **옵션 매수와 매도의 손실 한도는 같다** → 옵션만 단독 매수한 포지션의 손실은 프리미엄으로 한정된다(거래비용 제외). 행사나 자동행사로 생긴 주식 또는 선물 포지션에는 별도의 손실과 자금 의무가 생길 수 있다. 기초자산 가격 상한이 없고 보유 자산이나 상쇄 포지션으로 보호되지 않은 **uncovered short call**은 이론상 손실 상한이 없다. 증거금을 납부해도 이 손실 상한이 생기지는 않는다. 기초가격 하한이 0인 주식 등의 short put은 만기 기준 `행사가 × 계약 수 × 계약 승수 - 총 수취 프리미엄`이 최대 손실이다(비용 제외). 음수 가격이 가능한 선물 옵션에는 이 하한을 적용할 수 없다. covered option이나 spread는 보유 자산과 다른 leg까지 함께 봐야 한다.
- **헤지하면 모든 불확실성이 사라지고 상승 여력도 포기한다** → 헤지는 특정 위험 노출을 줄이는 것이며 basis, 수량과 시점 불일치 때문에 잔여 위험이 남을 수 있다. 선도나 선물로 가격을 고정한 범위에서는 유리한 움직임도 상쇄하지만, 보호적 옵션은 프리미엄을 내고 유리한 방향의 상승 여력을 유지할 수 있다.

예를 들어 행사가 10, 만기 기초선물 가격 -20이면 풋의 단위당 내재가치는 30으로, 기초가격 0일 때의 10을 넘는다. 실제 손익에는 계약 승수와 수취 프리미엄도 반영한다. CME는 2020년 에너지 선물의 음수 가격에 대응하는 옵션 가격모형을 공지했으며, 계약별 가격과 결제 조건을 확인해야 한다.

## 규제 발표는 절차와 적용 범위를 나눠 읽는다

레버리지 거래 규제의 발표를 읽을 때는 검토 중인 방안과 이미 적용되는 의무를 구분한다. 미국 CFTC의 일반적인 규칙 제정 절차에서 **ANPRM**은 쟁점과 가능한 접근법에 관한 예비 의견수렴이고, **NPRM**은 구체적인 규칙안을 제시하는 단계다. 최종 규칙은 의견을 검토한 뒤 별도로 채택될 수 있으며, 관보에 적힌 효력 발생일과 단계별 준수 기한을 확인해야 한다. 모든 규칙 제정에 ANPRM이 필수인 것은 아니다.

2026-10-05 CFTC의 CTX와 CAM 발표는 이 구분을 적용할 사례다. CEA 2(c)(2)(D)의 암호자산 소매상품거래에 관한 규칙과 지정계약시장 등록의 하위 범주를 검토하는 ANPRM이었다. 이 발표 자체를 모든 암호자산 현물 거래소에 새 등록 의무가 시행됐다는 근거로 쓰지 않는다. 기존 법에 따른 의무가 없다는 뜻도 아니다.

실무적으로는 발표일, 적용 대상 거래와 참여자, 현재 절차, 최종 규칙과 시행일을 따로 기록한다. 이는 규제 자료를 읽는 기준이며 특정 거래의 법적 분류나 준법 판단을 대신하지 않는다. 이 절은 2026-10-09 CFTC의 절차 설명과 해당 발표를 대조했다.

## 이벤트 계약은 지급 구조와 판정 주체, 적용 법을 함께 본다

**이벤트 계약**은 선거, 날씨, 경기 같은 사건의 결과에 지급이 걸린 계약이고, 예측시장은 이를 거래하는 시장이다. 2026-10-12 확인한 CFTC 안내에 따르면 흔한 형태는 예와 아니오 두 결과에 고정 지급액(보통 1달러)과 만기를 둔다. 1달러짜리 계약의 예 포지션을 70센트에 샀다면 사건이 일어날 때 결제에서 30센트를 번다. 여러 계약을 묶거나 결과 구간별로 일부만 지급하는 구조도 있다.

- **가격과 확률**: CFTC 안내는 계약 가격이 사건 결과에 대한 거래자들의 인지 확률을 반영한다고 설명한다. 다만 수수료와 호가 차이, 결제까지 묶이는 자금의 기회비용, 아래의 판정 위험도 가격에 섞일 수 있어 가격은 확률의 근사로 읽는다. 이 보정 요인은 지급 구조에서 끌어낸 추론이다.
- **참여자끼리의 손익**: CFTC 안내는 규제받는 거래소와 중개인이 거래의 한쪽을 맡지 않는다고 설명한다. 계약 지급만 보면 같은 계약의 예와 아니오 쪽 손익을 더해 수수료 전에 0이고, 수수료만큼 참여자 전체의 손익 합이 음수가 된다. 이는 고정 지급 구조에서 계산한 결과이며, 플랫폼이 자기 비용으로 미결 포지션이나 예치금에 주는 보유 보상과 이자는 이 계산에 들어 있지 않다. 세금도 개인 수익률을 바꿀 수 있다.

**결론 판정 자체가 위험이다.** 지급은 사건 그 자체가 아니라 판정 규칙과 판정 주체가 확정한 결과를 따른다. 2026-10-12 확인한 Polymarket 문서는 예측 시장은 UMA로, 가격 등락(up-down) 시장은 Chainlink TWAP로 판정한다고 구분한다. UMA 판정에서는 누구나 보증금(보통 750 pUSD)을 걸고 결과를 제안하고, 2시간 안에 같은 금액을 건 이의가 없으면 확정된다. 이의가 붙으면 새 제안 라운드가 열리고, 두 번째 제안도 이의를 받으면 24~48시간의 토론 뒤 약 48시간의 UMA DVM 토큰 보유자 투표로 넘어간다. 문서는 이의가 붙은 판정에 전체 4~6일이 걸린다고 안내한다. 틀리거나 이른 제안은 보증금 전액을 잃고, 드물게 50/50으로 판정되면 토큰당 0.5달러가 지급된다. 문서는 시장 제목은 질문을 설명할 뿐이고 판정 방식은 규칙이 정한다고 적으며, 거래 시작 뒤 추가 설명을 붙여도 질문의 근본 의도는 바꿀 수 없다고 한다.

UMA 문서는 DVM 2.0을 UMA를 스테이킹한 보유자가 48시간 주기의 커밋-공개(commit-reveal) 방식으로 투표하는 셸링 포인트(서로 예상할 만한 답에 표가 모이는 초점) 메커니즘으로 설명한다. 틀리거나 불참한 투표 한 건마다 스테이크의 0.1%가 삭감돼 맞게 투표한 스테이커에게 재분배되며, 문서는 이 값을 이후 바꿀 수 있다고 적는다. 기본 배출 보상은 스테이킹 지분에 비례해 투표 성과와 무관하게 지급되지만, 삭감과 그 재분배는 사실 자체가 아니라 투표로 합의된 결과와의 일치 여부에 붙는다. 그래서 규칙 문구가 모호하거나 투표 지분이 몰리면 판정이 시장 참여자의 예상과 어긋날 수 있다. 이는 문서의 보상 구조에서 나온 추론이다 → [[Game-Theory|게임이론]].

**미국 규제(CFTC 발표일 기준)**:

- 2026-02-25 집행부서 자문은 KalshiEX를 지정계약시장(DCM)으로 지칭하며, 미공개 정보를 유용한 거래가 CEA 6(c)(1)과 규정 180.1의 내부자 거래 금지에 걸릴 수 있고 CFTC가 모든 DCM의 불법 거래를 단속할 권한을 가진다고 밝혔다.
- 2026-02-04 CFTC는 2024-06-10 게시한 이벤트 계약 규칙안과 2025-09-30 스포츠 이벤트 계약 관련 직원 자문(Staff Letter 25-36)을 철회하고 새 규칙 제정을 예고했다. 이후 규칙 제정은 2026-03-12 예측시장 ANPRM, 2026-06-10 테러, 암살, 전쟁, 게이밍(gaming), 연방법이나 주법상 위법한 행위가 걸린 이벤트 계약을 90일 심사와 계약별 공익 요소로 판단하는 NPRM, 2026-10-09 스포츠, 정치, 문화, 날씨 관련 계약을 포함한 일정 이벤트 계약을 스왑 정의에 넣는 NPRM 순으로 나왔다. 앞 절의 구분대로 NPRM은 최종 규칙이 아니다.
- 2026-07-31 CFTC는 결과를 스스로 정할 수 있는 당사자가 국정연설 참석 여부에 관한 중대한 허위 표시와 누락으로 참석 계약의 가격을 움직인 행위를 시장 조작으로 보고 제재 명령을 냈다.
- 2026-08-11 CFTC는 9개 주를 제소했다고 밝혔다. 뉴욕주 검찰총장이 2026-07-31 주 법원에 KalshiEX의 모든 이벤트 계약 제공을 전국에서 막는 임시금지명령과 360억 달러가 넘는 손해배상을 구하고 KalshiEX가 시장 비상을 통보하자, CFTC는 비상 권한으로 거래소가 상품거래법(CEA)의 핵심 원칙에 따라 운영을 이어 가도록 명령했다. 2026-10-12 확인한 CFTC 안내는 예측시장이 연방 규제를 받으며 연방법상 50개 주 전체에서 운영될 수 있다고 적지만, 주 게이밍법 적용을 둘러싼 다툼은 이어지고 있었다.

**한국의 법적 경계(조문은 2026-10-02 시행본 기준)**: 형법 제246조는 도박한 사람을(일시오락 정도에 불과하면 예외), 제247조는 영리 목적으로 도박하는 장소나 공간을 개설한 사람을 처벌하고, 제3조는 대한민국 영역 밖에서 죄를 범한 내국인에게도 형법을 적용한다. 국내에서 해외 사이트에 접속한 행위는 영역 내 범죄를 정한 제2조의 문제일 수 있으며 이 구분은 판례로 확인하지 않은 추론이다. 사행산업통합감독위원회는 사행행위가 규제 대상이지만 법령으로 허가받으면 예외적으로 허용된다고 설명하며, 감독하는 사행산업으로 카지노업, 경마, 경륜과 경정, 복권, 체육진흥투표권, 소싸움경기를 든다. 자본시장법 제10조 제2항은 금융투자업자가 금융투자업을 영위하는 경우 형법 제246조를 적용하지 않는다고 정한다.

대법원 2013-11-28 선고 2012도14725 판결은 실제 선물 시세가 실시간 연동되는 사설 선물거래 사이트의 거래가 미래의 우연한 결과로 손익이 정해져 그 자체에 사행성이 있다는 원심의 도박개장 판단을 정당하다고 봤다. 반면 회원들이 실제로 한국거래소의 코스피 200 선물을 거래한 것이 아니고 운영자가 매매의 상대방이 됐다고도 볼 수 없어, 이를 무인가 금융투자업으로 처벌하는 것은 죄형법정주의에 반한다며 원심판결을 파기환송했다. 이 조문과 판례를 겹쳐 보면 국내에서 파생상품과 도박의 경계는 지급 구조만이 아니라 인가를 받거나 등록한 금융투자업자를 통한 거래인지에도 걸려 있다고 추론할 수 있다. 이벤트 계약을 국내에서 허용하는 별도 근거는 이번 확인 범위에서 찾지 못했다.

이용 전에는 세 가지를 확인한다.

1. **실제로 보유하는 것**: 등록 거래소의 계약인지 블록체인 토큰인지, 어느 법인의 어떤 규칙집을 따르는지 본다. 같은 플랫폼에서도 시장 유형에 따라 판정 방식이 다를 수 있다.
2. **결과를 정하는 주체**: 제목이 아니라 규칙 문구, 판정 출처, 이의 절차와 50/50 같은 예외 판정을 읽는다. CFTC 안내도 정산 판단을 누가 어떻게 내리는지에 관한 정보를 받을 권리를 짚는다. 결과를 좌우하거나 미리 알 수 있는 참여자가 있는 시장에는 위 사례처럼 조작과 내부자 거래 위험이 있다.
3. **나에게 적용되는 법**: 미국 연방 규제 여부가 한국 형법상 판단을 대신하지 않는다. CFTC 안내는 미국 밖 미등록 업체와 거래하면 보호를 거의 받지 못할 수 있다고 경고한다. 개별 거래의 위법성은 법률 자문으로 확인할 영역이다.

이 절은 2026-10-12 CFTC 안내와 발표, Polymarket과 UMA 문서, 국가법령정보센터의 조문과 판례, 사행산업통합감독위원회 누리집을 대조했다. 특정 플랫폼 이용의 적법성 판단을 대신하지 않는다.

## 출처

검증 범위(2026-10-03): 선도와 선물의 거래 구조, 옵션 권리와 의무, 손실 한도, 증거금과 결제, 헤지의 잔여 위험을 대조했다. AIG와 음수 가격은 역사적 사례이며, 현재 계약별 증거금률과 만기, 인도, 자동행사 세부 규칙을 확인한 날짜는 아니다.

- [Commission Rulemaking Explained — CFTC](https://www.cftc.gov/LawRegulation/CommissionRulemakingExplained/index.htm) — ANPRM, NPRM, 최종 규칙과 준수 기한의 구분
- [CFTC Seeks Public Comment on Advanced Notice of Proposed Rulemaking Relating to Regulation Crypto Asset Transactions and Regulation Crypto Asset Markets — CFTC](https://www.cftc.gov/PressRoom/PressReleases/9307-26) — 2026-10-05 의견수렴 발표의 대상과 절차
- [CFTC Glossary, basis risk](https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/CFTCGlossary/index.htm) — 베이시스, 헤지, 거래상대방 위험과 자동행사
- [Economic Purpose of Futures Markets and How They Work — CFTC](https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/economicpurpose.html) — 헤지와 일일정산의 현금흐름, 청산기관의 역할
- [CME Group, Futures Contracts Compared to Forwards](https://www.cmegroup.com/education/courses/introduction-to-futures/futures-contracts-compared-to-forwards) — 표준화와 거래소, 맞춤형과 장외 거래의 차이
- [CME Group, Understanding Futures Expiration & Contract Roll](https://www.cmegroup.com/education/courses/introduction-to-futures/understanding-futures-expiration-contract-roll) — 상쇄거래와 현금결제, 실물 인도
- [CME Group, Margin: Know What's Needed](https://www.cmegroup.com/education/courses/introduction-to-futures/margin-know-what-is-needed) — 증거금의 성격과 추가 납부, 청산
- [CME Group, Cleared Only OTC London Gold Forwards & OTC London Silver Forwards](https://www.cmegroup.com/trading/metals/files/cleared-only-gold-and-silver-forwards.pdf) — 중앙청산과 담보를 사용하는 장외 선도의 구조 예시
- [CME Group, 101 Overview: Delivery](https://www.cmegroup.com/articles/brochures-and-handbooks/101-overview-delivery.html) — 인도 의무와 이행 실패 위험
- [Cboe, Risk Disclosure Statement for Futures and Options on Futures](https://cdn.cboe.com/resources/general/Combined_Risk_Disclosure_Statement_for_Futures_and_Options.pdf) — 증거금을 넘는 손실, 청산 뒤 부족액, 옵션 행사와 유동성 위험
- [FINRA, Options](https://www.finra.org/investors/investing/investment-products/options) — 옵션 매수자와 매도자의 권리, 의무와 uncovered call의 손실 위험
- [Cboe, Equity Options – Short Put – American Style, Key Information Document](https://cdn.cboe.com/resources/participant_resources/kid/EN/Equity_Option_Short_Put_KID.pdf) — 주식 풋 매도의 만기 손익과 최대 손실
- [CME Group, protective put example](https://www.cmegroup.com/education/articles-and-reports/trading-micro-e-mini-options)
- [CME Group, Clearing Advisory 20-171 — Negative Futures Prices and Options Pricing Model](https://www.cmegroup.com/content/dam/cmegroup/notices/clearing/2020/04/Chadv20-171.pdf)
- [Interconnectedness and Systemic Risk — Federal Reserve, Janet L. Yellen](https://www.federalreserve.gov/newsevents/speech/yellen20130104a.htm) — AIG의 CDS 담보 요구와 유동성 압박
- [American International Group — Federal Reserve, Ben S. Bernanke](https://www.federalreserve.gov/newsevents/testimony/bernanke20090324a.htm) — AIG의 손실과 부실 시 거래상대방, 금융시스템 위험
- [Understanding Prediction Markets and Event Contracts — CFTC](https://www.cftc.gov/LearnandProtect/PredictionMarkets) — 예와 아니오 구조, 고정 지급과 가격의 확률 해석, 중개기관의 역할, 정산 정보, 미등록 해외 업체 경고, 50개 주 운영에 관한 연방법 해석
- [CFTC Withdraws Event Contracts Rule Proposal and Staff Sports Event Contracts Advisory — CFTC](https://www.cftc.gov/PressRoom/PressReleases/9179-26) — 2026-02-04 2024년 규칙안과 직원 자문 철회
- [CFTC Enforcement Division Issues Prediction Markets Advisory — CFTC](https://www.cftc.gov/PressRoom/PressReleases/9185-26) — 2026-02-25 KalshiEX의 DCM 지위와 미공개 정보 유용 거래
- [CFTC Seeks Public Comment on Advanced Notice of Proposed Rulemaking Relating to Prediction Markets — CFTC](https://www.cftc.gov/PressRoom/PressReleases/9194-26) — 2026-03-12 예측시장 ANPRM
- [CFTC Seeks Public Comment on Notice of Proposed Rulemaking Concerning Event Contracts Involving Enumerated Activities — CFTC](https://www.cftc.gov/PressRoom/PressReleases/9249-26) — 2026-06-10 열거 활동 관련 이벤트 계약 NPRM
- [CFTC Seeks Public Comment on Notice of Proposed Rulemaking Concerning the Inclusion of Certain Event Contracts in the Definition of Swap — CFTC](https://www.cftc.gov/PressRoom/PressReleases/9310-26) — 2026-10-09 이벤트 계약의 스왑 정의 포함 NPRM
- [CFTC Orders George Santos to Pay $35,000 for Manipulative Trading of State-of-the-Union Event Contract — CFTC](https://www.cftc.gov/PressRoom/PressReleases/9276-26) — 2026-07-31 결과를 정할 수 있는 당사자의 시장 조작 제재
- [CFTC Exercises Emergency Authority to Ensure Market Stability — CFTC](https://www.cftc.gov/PressRoom/PressReleases/9281-26) — 2026-08-11 비상 권한 행사, 뉴욕주 소송과 9개 주 제소
- [Polymarket, Resolution](https://docs.polymarket.com/concepts/resolution) — UMA 제안과 이의, 토론과 투표 기간, 보증금, 50/50 판정, 제목과 규칙의 관계
- [UMA, DVM 2.0](https://docs.uma.xyz/protocol-overview/dvm-2.0) — 스테이킹 투표, 48시간 커밋-공개 주기, 투표 성과와 무관한 기본 보상, 0.1% 삭감과 재분배
- [국가법령정보센터, 형법 제246조(도박, 상습도박)](https://www.law.go.kr/lsLinkProc.do?lsClsCd=L&lsNm=%ED%98%95%EB%B2%95&joNo=024600000&mode=11) — 2026-10-12 도박죄와 일시오락 예외 대조(법률 제22007호, 2026-10-02 시행)
- [국가법령정보센터, 형법 제247조(도박장소 등 개설)](https://www.law.go.kr/lsLinkProc.do?lsClsCd=L&lsNm=%ED%98%95%EB%B2%95&joNo=024700000&mode=11) — 2026-10-12 도박장소 개설죄 대조(같은 시행본)
- [국가법령정보센터, 형법 제3조(내국인의 국외범)](https://www.law.go.kr/lsLinkProc.do?lsClsCd=L&lsNm=%ED%98%95%EB%B2%95&joNo=000300000&mode=11) — 2026-10-12 국외에서 죄를 범한 내국인에 대한 적용 대조(같은 시행본)
- [국가법령정보센터, 자본시장과 금융투자업에 관한 법률 제10조(다른 법률과의 관계)](https://www.law.go.kr/lsLinkProc.do?lsClsCd=L&lsNm=%EC%9E%90%EB%B3%B8%EC%8B%9C%EC%9E%A5%EA%B3%BC%EA%B8%88%EC%9C%B5%ED%88%AC%EC%9E%90%EC%97%85%EC%97%90%EA%B4%80%ED%95%9C%EB%B2%95%EB%A5%A0&joNo=001000000&mode=11) — 2026-10-12 금융투자업자의 형법 제246조 적용 배제 대조(법률 제21857호, 2026-10-02 시행)
- [국가법령정보센터, 대법원 2013. 11. 28. 선고 2012도14725 판결](https://www.law.go.kr/LSW/precInfoP.do?precSeq=209170) — 사설 선물거래 사이트의 사행성과 도박개장죄, 무인가 금융투자업 처벌의 한계
- [사행산업통합감독위원회, 자주묻는 질문](https://ngcc.go.kr/police/faq.do) — 감독 대상 사행산업과 허가에 따른 예외적 허용

## 관련 문서

- [[Risk-and-Return|위험과 수익]] — 파생상품이 옮기고 키우는 대상
- [[Financial-System-Overview|금융시스템 개관]] — 위험 이전이라는 시장 기능
- [[금융시장(Financial Markets)]] — 지도
