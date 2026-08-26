---
tags: [business, pricing]
status: done
verified_at: 2026-08-26
category: "비즈니스&제품(Business&Product)"
aliases: ["Pricing Strategy", "가격 정책"]
---

# 가격 정책 설계

## 가격 전략 모델

| 전략 | 설명 | 적합한 상황 |
|---|---|---|
| **원가 기반 (Cost-plus)** | 원가 + 마진 | 제조업, 커머스 |
| **가치 기반 (Value-based)** | 고객이 느끼는 가치에 맞춤 | SaaS, 프리미엄 |
| **경쟁 기반 (Competitor-based)** | 경쟁사 가격 참고 | 레드오션, 커머디티 |
| **침투 (Penetration)** | 낮은 가격으로 시장 점유 | 신규 진입 |
| **스키밍 (Skimming)** | 높은 가격 후 점진 인하 | 혁신 제품, 얼리어답터 |

## Freemium 전략

핵심 기능을 무과금으로 제공하고, 부가 기능으로 유료 전환을 유도하는 모델이다.

Freemium 전환율은 활성 사용자 정의, 관찰 기간, 고객 규모, trial 포함 여부와 가격 단위에 따라 크게 달라진다. 출처와 동일한 분모가 없는 외부 숫자를 보편 benchmark로 쓰지 않고, 자사 activation cohort의 무과금→유료 전환과 기여이익을 기준선으로 삼는다.

**Feature Gating 원칙:**
- 무과금: 핵심 가치를 충분히 경험할 수 있을 만큼
- 유료: 사용량/규모가 커질수록 자연스럽게 필요해지는 기능 (팀, 통합, 자동화, 보안)
- 무과금이 너무 좋으면 전환 안 되고, 너무 제한적이면 이탈한다

## 가격 심리학

- **앵커링 (Anchoring):** 먼저 제시된 수치가 뒤의 판단에 영향을 줄 수 있지만 효과 크기는 맥락과 사용자의 지식에 따라 달라진다
- **디코이 효과 (Decoy):** 한 대안보다 명확히 열등한 선택지를 추가하면 그 대안의 선택 비율이 높아질 수 있다. 중간 요금제를 고르게 만드는 법칙은 아니다
- **지불 의향 (WTP) 조사:** Van Westendorp 가격 민감도 분석, 컨조인트 분석

## 현장 적용: school-manage

- **현재 소프트웨어 정책:** Free Core. 기존 조직과 자발적으로 유입된 신규 조직 모두 현재 핵심 기능을 무과금으로 사용
- **재직 중 운영 범위:** 현재 Free Core의 최소 운영, 장애와 보안 대응, 데이터 보호 및 프로젝트 고정비 절감만 수행. 능동적 모집, 수동 온보딩, 신규 유료 제안과 수납은 시작하지 않음
- **조건부 검증 가격:** 퇴사를 실제로 확정하고 사용자가 활성화를 명시하는 전환 gate 통과 후 정한 실험 시작일을 D+0으로 두고 90일간 10만원 유료 진단과 30만원 학기 운영지원을 검증. 선입금, 4시간 이내 납품과 노동 조정 공헌이익을 확인한 뒤에만 다른 구매자에게 60만원 연간 지원 제안
- **장기 가설:** Basic/Pro 구독은 별도 가격 문서의 후보안으로만 보존하고, 조건부 90일 검증과 SaaS 진입 gate 전까지 개발과 출시를 보류
- **구매 단위:** 개인 봉사자가 아니라 본당 예산 결정자에게 고정 범위 운영지원으로 제안

## 면접 포인트

Q. 가격 정책은 어떻게 설계했는가?
- Free Core로 핵심 기능 접근을 유지하고, 소프트웨어 구독과 운영지원 상품을 분리
- 조건부 실험을 활성화한 뒤 가격 설문이 아니라 실제 선입금과 납품 시간으로 지불 의향과 손익을 검증
- 90일 gate를 통과하기 전에는 장기 Basic/Pro 가격을 현재 정책처럼 말하지 않음

## 근거 범위

가격 전략과 Freemium 설명은 아래 자료로 대조했다. `school-manage`의 금액과 진입 gate는 2026-08-26 현재 퇴사를 실제로 확정하고 사용자가 활성화를 명시한 뒤 실행할 내부 후보 계획이며, 고정된 실행 일정이나 외부 출처가 검증하는 시장 사실이 아니다. 설문 기반 지불 의향은 실제 구매와 다를 수 있으므로 이 문서는 선입금 행동을 별도 검증으로 둔다.

## 출처

- [OpenStax, 가격 정책 수립의 5단계](https://openstax.org/books/principles-marketing/pages/12-3-the-five-step-procedure-for-establishing-pricing-policy)
- [OpenStax, 신제품 가격 전략](https://openstax.org/books/principles-marketing/pages/12-4-pricing-strategies-for-new-products)
- [Stripe, 가격 모델과 Freemium](https://stripe.com/resources/more/pricing-models-explained-types-of-pricing-models-and-when-to-use-them)
- [Judgment under Uncertainty: Heuristics and Biases — Tversky, Kahneman](https://pubmed.ncbi.nlm.nih.gov/17835457/)
- [Adding Asymmetrically Dominated Alternatives — Huber, Payne, Puto](https://doi.org/10.1086/208899)

## 관련 문서
- [[Business-Model|비즈니스 모델]]
- [[Metrics-Framework|지표 설계]]
- [[Commerce-Pricing|커머스 가격 도메인]]
