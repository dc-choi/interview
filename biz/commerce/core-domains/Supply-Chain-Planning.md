---
tags: [business, commerce, supply-chain, demand-planning, inventory]
status: done
category: "비즈니스&제품(Business&Product)"
aliases: ["Supply Chain Planning", "공급망 계획", "수요 계획과 공급 계획"]
---

# 공급망 계획과 예외 대응

공급망 계획은 예상 수요를 재고, 조달과 생산의 제약 안에서 실행 가능한 계획으로 바꾸는 일이다. 예측값을 만드는 일, 관계자의 판단을 합의하는 일, 발주나 재고 이동을 실행하는 일을 구분한다.

## 예측에서 실행까지

| 단계 | 결정할 내용 |
|---|---|
| 수요 예측 | 상품, 거점과 기간별 예상 수요 |
| 수요 계획 | 예측에 영업 약속, 프로모션과 현장 정보를 반영한 합의 |
| 공급 계획 | 생산 능력, 창고 공간, 리드타임과 자재 가용성을 고려한 공급량 |
| 예외 대응 | 계획과 실제의 차이에 대한 원인, 우선순위와 조치 |
| 실행과 재평가 | 승인된 발주와 이동의 실행, 결과와 예측 오차 확인 |

품절 방지와 운전자본 절감은 함께 검토한다. 재고를 늘리는 대응은 서비스 수준을 지키는 데 도움이 될 수 있지만 재고에 묶이는 자금도 바뀐다.

## 입력 데이터와 판단의 근거

기초 데이터는 판매 또는 수요 이력, 재고 상태, 상품과 거점 정보다. 여기에 판촉 일정, 공급자 리드타임, 생산 제약과 안전재고 정책을 연결한다. 데이터 연결 성공과 실제 의사결정에 쓸 수 있는 품질은 별도로 확인한다.

신상품은 판매 이력이 부족하다. 비교 가능한 상품과 판매 계획을 입력으로 삼더라도 예측 정확도가 보장되지는 않는다. 예측의 근거와 조정 이유를 남기고 실제 수요와 비교한다.

## 알림을 조치로 바꾸기

관련 알림을 공통 조치별로 묶고 영향, 긴급성, 고객 서비스 수준과 운전자본을 기준으로 우선순위를 정한다. 알림 개수보다 어떤 결정을 언제 해야 하는지가 중요하다.

가상 예시: 공급이 늦어지면 긴급 운송과 다른 창고의 재고 이동을 비교한다. 이동비가 싸더라도 출발 창고의 안전재고를 침해하면 별도 판단이 필요하다. 예외를 허용할 때는 승인 이유와 적용 범위를 남기는 것을 운영 기준으로 삼는다.

## AI 보조 계획의 적용 경계

2026-10-16 공식 제품 설명과 FAQ 확인 기준, Amazon Connect Decisions는 수요 신호 통합, 공급 예외 탐지와 승인된 조치 실행을 제공하는 사례다. **공급 계획(supply planning)은 FAQ에 preview로 표기되어 있으므로 전체 서비스의 출시 상태와 구분한다.**

제품 도입 검토에서는 다음을 확인한다.

- 과거 데이터로 기존 방식과 예측 오차를 비교했는가.
- 추천의 데이터, 제약 위반과 예상 영향을 사람이 확인할 수 있는가.
- 추천 승인과 실제 발주, 재고 이동 결과를 구분해 확인했는가.
- 예외 판단을 다음 계획에 적용할 범위를 정했는가.

판단 기록을 활용하는 기능이 있다는 사실만으로 정확도가 계속 향상된다고 보장하지 않는다. 데모의 처리 시간과 비용 수치는 자신의 운영 성과로 옮기지 않는다. 이 문서는 제품을 직접 실행하거나 효과를 측정한 기록이 아니다.

## 출처

- [Amazon Connect Decisions: Agentic supply chain planning and intelligence — AWS](https://aws.amazon.com/products/connect/decisions/)
- [Amazon Connect Decisions FAQs — AWS](https://aws.amazon.com/products/connect/decisions/faqs/)
- [Amazon Connect Decisions: Supply Chain Planning and Intelligence — Amazon Web Services](https://www.youtube.com/watch?v=DA3EdVUmzT0)

## 관련 문서

- [[Commerce-Product|상품, 재고와 물류]]
- [[Commerce-Order|주문과 클레임]]
- [[Commerce-Revenue-Formula|매출과 공헌이익]]
