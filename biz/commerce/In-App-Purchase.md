---
tags: [business, commerce, payment, platform, regulation]
status: done
category: "비즈니스&제품(Business&Product)"
aliases: ["In-App Purchase", "인앱결제", "IAP", "앱마켓 수수료"]
verified_at: 2026-07-21
---

# 인앱결제 (In-App Purchase)

앱 안에서 디지털 콘텐츠(게임 아이템, 웹툰, 구독)를 결제하는 방식. 논점은 결제 행위 자체가 아니라 **누구의 결제시스템을 거치는가**다.

## 결제수단 vs 결제시스템

- **결제수단** — 신용카드, 간편결제 등. 사용자가 자유롭게 선택한다.
- **결제시스템** — 결제를 처리하는 인프라. 디지털 상품에 어떤 시스템을 써야 하는지와 수수료는 플랫폼, storefront, 사업자 프로그램, 거래 유형과 시점에 따라 다르다.

Apple App Store는 앱 안에서 소비하는 디지털 기능과 콘텐츠에 원칙적으로 In-App Purchase를 요구하지만 예외와 entitlement가 있다. 미국 storefront에서는 현재 외부 구매 버튼과 링크에 별도 규칙이 적용되고, EU에서는 DMA와 Apple의 대체 사업 조건 때문에 배포와 결제 선택지가 달라진다. 한 지역의 규칙을 전 세계 공통으로 일반화하지 않는다.

## 수수료의 가격 전가: 채널별 가격 차이

같은 구독 상품의 앱과 웹 가격이 다를 때 앱마켓 수수료와 정책이 원인 중 하나일 수 있다. 사업자는 허용된 범위에서 가격, 결제 채널과 안내 방식을 설계한다. 앱 안 외부 결제 링크 허용 여부와 수수료율은 storefront와 프로그램별로 달라지므로 출시 시점의 공식 정책을 확인한다. 같은 상품의 채널별 가격 차이는 세금, 환율, 번들 구성 등 다른 요인도 있어 수수료 하나로 단정하지 않는다.

## 플랫폼 독점 논쟁

| 입장 | 논리 |
|---|---|
| 앱마켓 | 단일 결제 생태계가 소비자 보호에 유리 — 자체 결제 시스템의 구독 사기, 환불 민원을 차단 |
| 입점 사업자 | 지배적 플랫폼의 결제시스템 강제와 수수료는 경쟁 제한과 협상력 불균형을 만들 수 있음. 생태계 형성 뒤의 규칙 변경은 예측 가능성 문제도 낳음 |

사례: 대형 게임사가 자체 결제(20% 할인 다이렉트 페이)를 도입하자 앱스토어에서 즉시 퇴출됐고, 반독점 소송으로 비화했다 (2020).

## 규제와 우회

- **한국 법률:** 2021년 전기통신사업법 개정으로 앱마켓 사업자가 특정 결제방식을 강제하는 행위가 금지됐다. 실제 선택지와 비용은 플랫폼별 프로그램을 따로 본다.
- **Apple 한국 storefront:** 2026-07-21 현재 StoreKit External Purchase Entitlement를 받은 한국 전용 별도 앱은 승인된 외부 PSP를 사용할 수 있고, Apple은 이용자 결제액의 부가세 포함 금액에 26% commission을 부과한다. 한국 전용 binary, entitlement, 보고와 지원 의무가 따른다.
- **Google Play 한국:** 2026-07-21 현재 대체결제 거래의 service fee는 개발자에게 적용되던 표준 수수료에서 4%p 낮아진다. Google은 한국에 새 fee model을 2026-12-31 적용할 예정이라고 공지했으므로 출시 시점 정책을 다시 확인한다.

## 면접 체크포인트

- 중개 플랫폼의 독과점 → 수수료 인상 부작용([[Business-Model|비즈니스 모델]])의 대표 사례로 쓸 수 있다.
- 디지털 콘텐츠 가격 설계 질문에 채널별 수수료 구조를 기본 변수로 — 결제 플로우 설계(웹 결제 유도, 결제 채널 분기)가 수수료 구조의 함수라는 관점.
- 규제 우회 패턴 — 플랫폼 정책 리스크를 평가할 때 법 통과 여부가 아니라 실효(수수료율 변화)를 본다.

## 관련 문서
- [[Business-Model|비즈니스 모델 & 수익 구조]] — 중개 모델의 독과점 부작용
- [[Payment-Service|결제 서비스]] — PG, VAN, 간편결제의 인프라 구조
- [[Commerce-Pricing|커머스 가격 도메인]]
- [[Commerce-Overview|커머스 도메인 개요]] — 수수료 구조
- [[Category-Expansion|카테고리 확장]] — 본업 규제 리스크 평가

## 출처
- [Apple — App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple — Distributing apps using a third-party payment provider in South Korea](https://developer.apple.com/support/storekit-external-entitlement-kr/)
- [Google Play — Changes to billing requirements for users in South Korea](https://support.google.com/googleplay/android-developer/answer/11222040?hl=en)
- [Google Play — Understanding lower service fees and rollout timeline](https://support.google.com/googleplay/android-developer/answer/16954621?hl=en)
- [European Commission — Apple and Meta breach the Digital Markets Act](https://digital-strategy.ec.europa.eu/en/news/commission-finds-apple-and-meta-breach-digital-markets-act)
