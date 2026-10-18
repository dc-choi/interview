---
tags: [business, ai, services, unit-economics, pricing, outsourcing]
status: done
category: "비즈니스&제품(Business&Product)"
aliases: ["AI-Native Services", "AI 네이티브 서비스", "결과를 파는 AI 서비스", "Mirage PMF", "신기루 PMF"]
---

# 결과를 파는 AI 네이티브 서비스

AI 네이티브 서비스(AI-native services)는 도구나 좌석 라이선스가 아니라 업무의 결과를 판다. 고객은 결과를 사고 그 일을 사람이 했는지 AI가 했는지에는 관심을 두지 않으므로, 제공 비용과 품질 책임은 공급자에게 남는다. 그래서 매출이 늘어도 그 성장을 사람 노동이 만들고 있다면 인력에 비례하는 서비스업 구조에서 벗어나지 못한다.

아래는 벤처캐피털 Emergence Capital이 2026년에 공개한 글 세 편(2026-10-18 확인)의 판단 틀을 정리한 것이다. 한 투자사의 관점이며 업종별 합격선이나 보편 법칙은 아니다. 기능 중심 SaaS가 받는 대체 압력과 AI로 재설계할 서비스업의 선택은 [[AI-Commoditization-Differentiation|AI 범용화와 사업 차별화]]에서 다룬다.

## 좌석 판매와 결과 판매

Emergence는 파운데이션 모델이 일을 직접 하기 시작하면서 좌석 기반 라이선스 모델이 사라지고 있다고 본다. 결과를 파는 사업에서는 사용자 수가 아니라 처리한 일의 양과 품질이 매출을 정하고, 그 일에 드는 추론 비용과 남은 사람 투입이 원가를 정한다. 같은 품질의 결과에 드는 사람 투입이 0에 가까워질수록 마진이 소프트웨어 마진에 가까워진다는 것이 이 틀의 전제다.

## 신기루 PMF를 가려내는 지표

Emergence의 2026-03 플레이북은 AI 레버리지가 아니라 사람 노동이 만든 매출 성장 때문에 생기는 제품 시장 적합성의 착시를 신기루 PMF(mirage PMF)라고 부르고, 다음 신호로 점검하라고 권한다.

| 지표 | 경고 신호 |
|---|---|
| 처리 단위당 사람 투입 | 품질을 유지하는 조건에서 줄지 않는다. 예: 법률 문서 한 건을 AI가 처리한 뒤 남는 사람 검토 시간 |
| 매출총이익률 | 매출이 늘어도 제자리이거나 떨어진다 |
| 인력 1인당 매출 | 개선되지 않거나 같은 분야의 기존 서비스 사업자보다 의미 있게 높지 않다 |
| 제공 인력과 맞춤 작업 | 고객 수에 비례해 제공 인력이 늘고 고객별 맞춤 작업이 늘어난다 |
| 북극성 제품 지표 | 개선되는 지표가 없다 |

매출총이익률을 계산할 때 추론 비용과 사람 검토 인건비는 판관비가 아니라 매출원가에 넣는다. 플레이북은 추론 비용을 판관비에 묻으면 마진이 부풀려진다고 경고한다.

## 가격은 인력 기준에서 결과 기준으로 옮긴다

같은 플레이북은 제공 효율을 배우는 동안에는 시장 관행인 인력 기준 가격으로 시작하되, AI가 성숙하고 제공이 안정되면 결과 기준 가격으로 옮길 시점을 미리 정하라고 권한다. 인력 기준 가격에 오래 머물면 자동화가 늘수록 청구액도 줄어 스스로 성장을 깎아 먹는다. 서비스 자체가 결과이므로 소프트웨어처럼 성과에 대한 기여를 나눠 증명하는 문제가 생기지 않는다는 것도 이 플레이북의 주장이다. 결과 단위 가격의 구성과 검증은 [[Pricing-Strategy|가격 정책 설계]]와 함께 본다.

## 서비스 회사 인수는 플랫폼이 선 뒤에

기존 서비스 회사나 BPO를 사서 AI로 효율화하는 경로도 순서가 중요하다. 플레이북은 플랫폼이 성숙하고 AI 레버리지가 증명되기 전의 인수가 핵심 플랫폼 구축을 방해하고, 회사를 벤처 자금을 가진 전통 서비스 회사로 만들 위험이 있다고 본다. 2026-06 글은 플랫폼이 실재하고 문화가 굳어진 뒤에야 인수가 가속 수단이 되며, 인수로 커진 회사의 문화는 사들인 조직의 가중평균이 된다고 적는다. AI 이전에 맺은 다년 계약은 인수 뒤 자동화로 더 제공한 가치를 회수하지 못하게 막을 수 있다.

## 1인 외주 사업에 적용하기

다음은 위 틀을 소규모 개발 외주와 제작 서비스에 옮긴 운영 제안이다.

- 프로젝트마다 견적 단위(페이지, 기능, 건)당 실제 사람 투입 시간과 재작업 시간을 기록한다. AI 도구를 쓴 뒤에도 이 값이 줄지 않으면 매출 증가를 사업 구조의 개선으로 보지 않는다.
- 매출총이익에는 API와 도구 비용, 외주 인건비와 함께 대표의 검수 시간도 분석용 단가로 반영한다([[Business-Model#서비스와 AI의 실제 제공 비용|서비스와 AI의 실제 제공 비용]]).
- 처음에는 투입 시간 기준으로 견적하더라도, 반복되는 납품물은 결과 단위 가격으로 바꿀 조건과 시점을 정해 둔다.
- 고객마다 맞춤 작업이 늘어나는지 보고, 반복 요청은 템플릿과 공통 모듈로 흡수한다.

## 출처

- [Why AI-Native Services, and Why Now — Emergence Capital](https://emcap.com/thoughts/why-ai-native-services-and-why-now) — 2026-03-23
- [The AI-Native Services Playbook — Emergence Capital](https://emcap.com/thoughts/the-ai-native-services-playbook) — 2026-03-30
- [Roll Up or Build? Why the Fastest Path to a Venture-Scale AINS Business Is the One Founders Keep Avoiding — Emergence Capital](https://emcap.com/thoughts/roll-up-or-build-why-the-fastest-path-to-a-venture-scale-ains-business-is-the-one-founders-keep-avoiding) — 2026-06-02

## 관련 문서

- [[Business-Model|비즈니스 모델과 수익 구조]]
- [[Pricing-Strategy|가격 정책 설계]]
- [[AI-Commoditization-Differentiation|AI 범용화와 사업 차별화]]
- [[Dev-Outsourcing-Engagement|개발 외주의 계약과 수주]]
- [[Solo-Product-Market-Validation|1인 사업의 시장과 운영 용량]]
