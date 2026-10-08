---
tags: [business, commerce, ai, customer-journey]
status: done
category: "비즈니스&제품(Business&Product)"
aliases: ["Agentic Commerce", "대화형 쇼핑과 구매 대행"]
---

# 대화형 쇼핑과 구매 대행의 책임 경계

대화형 쇼핑은 사용 목적과 제약을 질문으로 좁혀 상품 탐색과 비교를 돕는다. 구매 대행은 고객을 대신해 주문까지 실행한다. 같은 채팅 화면에 있어도 상품 추천, 주문 승인과 구매 후 지원의 책임은 나눠 설계한다.

## 고객 여정별로 풀 문제를 고른다

| 고객의 문제 | 도울 수 있는 기능 | 확인할 결과 |
|---|---|---|
| 어떤 제품군이 필요한지 모름 | 사용 상황과 예산을 묻고 후보 제안 | 적합한 후보를 찾았는가 |
| 여러 상품의 차이를 모르겠음 | 사양, 리뷰와 제약 비교 | 선택 근거가 실제 상품과 맞는가 |
| 선택했지만 구매 절차가 번거로움 | 장바구니 구성과 주문 대행 | 승인한 품목과 최종 거래가 일치하는가 |
| 구매 후 문제가 생김 | 주문 상태 조회와 지원 경로 안내 | 실제 판매자의 처리 경로에 연결됐는가 |

상품 사양, 가격, 재고와 반품 조건은 대화의 유창함으로 보완할 수 없다. 먼저 상품과 거래 데이터의 정확성, 지원 주체를 확보한다. 상품 ID와 화면 조립의 기술적 분리는 [[Agent-Ready-API-Design|에이전트 친화 API 설계]]를 참고한다.

## 탐색 화면과 판매 책임은 다를 수 있다

2026-10-07에 확인한 Amazon 공식 안내는 외부 판매자 상품의 두 경로를 구분한다. Shop Direct는 판매자 사이트로 이동하고, Buy for Me는 고객을 대신해 그 사이트에서 구매한다.

Buy for Me에서는 고객이 Amazon 화면에서 배송지, 세금과 배송비, 결제수단 등 주문 내용을 확인한다. 이후 브랜드 판매자의 확인 메일을 받고 Amazon 앱에서도 주문을 추적할 수 있다. 하지만 **배송, 반품과 교환, 고객 지원은 브랜드 판매자가 담당한다.** 구매 화면과 주문 추적이 통합돼 있다는 사실을 판매와 사후 지원 책임까지 통합됐다는 뜻으로 해석하지 않는다.

이 사례는 모든 국가와 상품에서 같은 기능이 제공된다는 보장이 아니다. 실제 도입 시 해당 시장의 제공 범위와 판매자 정책을 확인한다.

## AI 채널 참여와 주문 완료를 나눠 확인한다

상품이 AI 검색에 노출되는 것, 구매자가 결제 화면으로 이동하는 것과 에이전트가 주문을 실행하는 것은 서로 다른 단계다. 판매 채널을 검토할 때는 지원되는 구매 경로, 판매자의 참여 설정과 고객의 최종 확인 지점을 따로 확인한다.

2026-10-09 Shopify 공식 안내 기준, 판매자는 관리자 화면에서 판매할 AI 채널을 관리한다. 채널마다 구매 경로가 다르고, 일부 채널의 내부 결제는 direct checkout 활성화 여부에 달려 있다. AI 채널에서 발생한 주문도 판매자가 고객 관계와 구매 후 경험을 맡으며, 관리자에는 채널 또는 유입 경로의 attribution이 표시된다.

브라우저 에이전트를 지원하는 결제 경로에서도 고객 확인은 남는다. Shopify의 Checkout WebMCP 안내는 현재 열린 결제를 읽고 수정하되, 주문은 구매자가 확인한 뒤 실행하는 흐름을 명시한다. 이를 모든 쇼핑몰이 외부 에이전트의 접근이나 자동 구매를 허용한다는 뜻으로 확대하지 않는다.

운영 점검 제안: 상품 노출 수, 결제 화면 도달과 주문 완료를 구분해 집계한다. 채널별 지원 범위와 주문 확인 절차를 시험하고, 유입 경로가 기록된 주문의 취소, 반품과 문의 비용까지 연결한다. 추천 화면의 등장만으로 매출 효과를 판정하지 않는다.

## 사업 적용 시 측정할 것

다음은 고객 여정과 책임 구분을 바탕으로 한 측정 제안이다.

- 대화 횟수나 추천 질문 클릭보다 적합한 상품 발견, 구매 완료와 이탈을 함께 본다. 대화가 길어진 것은 탐색의 어려움일 수도 있다.
- 전환율은 같은 적격 대상과 기간으로 비교한다. 도우미를 스스로 사용한 고객의 높은 구매율만으로 기능의 인과 효과를 단정하지 않는다.
- 취소, 반품과 문의 처리 비용, 추론 비용을 포함해 거래당 공헌이익을 본다.
- 상품, 옵션, 수량과 최종 금액이 바뀌었을 때 확인하는 경로와 주문 결과가 불명확할 때 중복 구매를 막는 절차를 정한다.

작게 시작하려면 검색과 비교의 실패 한 가지를 고른다. 구매 대행을 더할 때는 판매자 연결과 사후 지원까지 검증 범위를 넓힌다.

## 출처

- [Shopify Help Center, Shopify agentic storefronts](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts)
- [Shopify, Carts and checkout for agents](https://shopify.dev/docs/agents/carts-and-checkout)
- [Amazon’s next-gen AI assistant for shopping is now even smarter, more capable, and more helpful — Amazon](https://www.aboutamazon.com/news/retail/amazon-rufus-ai-assistant-personalized-shopping-features)
- [Buy for Me button on Amazon Shopping app: Purchase items Amazon doesn’t sell — Amazon](https://www.aboutamazon.com/news/retail/amazon-shopping-app-buy-for-me-brands)

## 관련 문서

- [[Commerce-Revenue-Formula|커머스 수익 공식]]
- [[Metrics-Framework|지표 설계와 실험 해석]]
- [[Agent-Ready-API-Design|에이전트 친화 API 설계]]
