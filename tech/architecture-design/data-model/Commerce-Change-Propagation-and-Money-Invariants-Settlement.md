---
tags: [architecture, ecommerce, data-model, settlement, batch, fee]
status: done
category: "Architecture - Data Model"
aliases: ["Commerce Settlement", "정산 배치와 금액 기준", "커머스 정산 불변식"]
---

# 정산 배치와 금액 기준

정산은 결제와 취소 ledger에서 가맹점에 줄 돈을 만드는 배치다. 이 문서는 [[Commerce-Change-Propagation-and-Money-Invariants|커머스 변경 전파와 금액 불변식]]의 정산 절을 떼어 내, 배치 단계, 정산 기준 금액, 구간별 수수료와 정책 변경 경합을 다룬다.

## 정산은 원천 거래를 재구성할 수 있어야 한다

정산은 현재 payment row의 최종 상태만 읽기보다 승인, 환불과 조정 ledger에서 대상 금액을 만든다. 각 settlement target은 원천 transaction, merchant, order line, gross/discount/refund/fee와 policy version을 추적할 수 있어야 한다.

- 집계 window의 timezone, inclusive/exclusive 경계와 cutoff를 명시한다.
- 최근 매출 기준 수수료라면 거래일, 정산 실행일 중 어느 기준인지 정한다.
- 가맹점별 N일 주기는 대상 적재 범위와 이체 시점이 같은 N일을 의미하는지 분리한다.
- batch 재실행은 같은 target/transfer를 중복 생성하지 않도록 unique key와 checkpoint를 둔다.
- PG, order/refund ledger와 실제 이체 결과를 주기적으로 reconciliation한다.

결제건을 정산해 달라는 한 줄 요구에는 정산 기준 시점(결제일 기준인지 D-N 기준인지), 가맹점 지급 시점, 취소 반영과 수수료 구성(가맹점, PG, 카드사 수수료와 구간별 요율)이 빠져 있다. 완성된 정책서를 요구하고 정산 운영 담당자, 기획자와 함께 정책을 확장 가능한 코드로 옮긴다.

## 적재, 계산, 이체 3단계

```text
1. 대상 적재: Payment와 Cancel을 날짜 범위로 읽어 order line 단위 SettlementTarget을 만든다
   결제는 양수, 취소는 음수 금액으로 쌓는다
2. 계산: merchantId, settlementDate로 SUM해 Settlement(READY)를 만든다. 결제와 취소가 여기서 상계된다
3. 이체: 가맹점별 READY를 모두 합산한다. 합계가 0보다 크면 이체 후 SENT, 0 이하면 이체하지 않는다
```

- 이미 지급한 결제가 뒤늦게 취소되면 가맹점에 돈을 돌려 달라고 하기 어렵다. 다음 정산 금액에서 빼고 보낸다(상계). 결제 양수, 취소 음수라는 부호 규칙이 이 상계를 집계 한 번으로 만든다.
- 이체하지 않은 READY는 다음 실행에서 새 금액과 다시 합산된다. 음수 순액이 오래 해소되지 않는 가맹점은 이월 한도, 별도 청구나 보증금 상계 같은 회수 정책을 계약으로 정한다.
- Settlement는 결제와 취소를 직접 모르고 SettlementTarget에만 의존한다. 원천이 늘거나 바뀌어도 계산 영역은 순수하게 유지된다. 반대로 target을 잘못 쌓으면 이후 단계가 전부 틀어지므로 적재 단계의 검증을 가장 두껍게 둔다.
- 시간 기준이 아니어도 절차별로 배치를 나누면 어느 단계에서 틀렸는지 찾기 쉽다. cron이 API를 호출할지 batch framework([[Spring-Batch-Essentials|Spring Batch]])를 쓸지는 규모와 복구 요구의 선택이지 정합성 보장이 아니다.
- 이체 성공 뒤 SENT 반영이 실패하면 재실행이 같은 금액을 다시 보낼 수 있다. 이체 시도를 먼저 기록하고(이체 ID, 포함한 settlement 목록, 이체 API가 지원하면 idempotency key) 재시도 전에 이체 결과를 조회해 대사한다. 이체에 포함한 READY row를 그 이체 ID로 묶어 실행 중 새로 생긴 row가 섞이거나 빠지지 않게 한다.

## 정산 기준 금액

가맹점 정산 기준액을 고객 실결제액으로 잡으면 플랫폼이 부담한 할인과 point만큼 가맹점이 덜 받는다. 기준식은 할인 재원에 따라 갈린다.

- 플랫폼이 부담한 coupon과 point는 가맹점 정산액을 줄이지 않는다. 이때 기준은 판매가 원금(order line 총액)이다.
- 판매자가 부담한 할인은 정산액에서 뺀다. 분담형이면 분담 비율만큼 뺀다.
- target에 gross, 재원별 할인, 환불과 수수료를 분리해 남기고 기준식을 정책으로 고정한다.
- 부분 취소는 기획도 놓치기 쉬운 숨은 요구사항이다. 대상 적재가 부분 취소 line을 음수로 반영하는지, 취소 금액도 같은 기준식으로 계산하는지 확인한다.

할인 부담 주체와 회계 구분은 [[Commerce-Pricing|가격과 할인 정책]]과 [[Commerce-Overview|커머스 개요]]의 할인 부담 비교를 따른다.

## 구간별(슬라이딩) 수수료

정산 기준 금액의 구간에 따라 수수료율을 달리한다. 예: 1,000만 원 초과 8%, 1억 원 초과 5%. 기획에 확인할 것은 다음과 같다.

- 모든 가맹점에 적용하는가, 일부 가맹점만인가. 구간 기준을 운영에서 바꿀 수 있는가.
- 구간을 가르는 금액이 판매 금액인가 정산 금액인가. 정산 금액이라면 수수료를 뗀 금액인가 원금인가.
- 어떤 정산 상태의 금액을 집계에 넣는가. 취소를 차감하는가.
- 구간에 도달하면 전체 금액에 새 요율을 적용하는가, 초과분에만 적용하는가(누진형).

**기준 시점 함정**: 정산일 기준 최근 한 달 매출로 구간을 정하는데 대상 적재와 계산을 매일 하면, 계산 시점의 누적 매출이 부족해 구간 혜택을 받아야 할 거래가 받지 못할 수 있다. 설계 선택지는 다음과 같다.

| 선택지 | 장점 | 대가 |
|---|---|---|
| 지난 기간 실적으로 이번 기간 요율을 미리 정한다 | 계산 시점에 요율이 확정되어 단순하다 | 실적이 한 기간 늦게 반영된다 |
| 매일 잠정 요율로 계산하고 기간 마감 때 차액을 조정 row로 정산한다 | 지급 주기를 유지한다 | 조정 row의 재실행과 대사가 복잡해진다 |
| 기간 마감 뒤에 수수료를 확정한다 | 계산이 정확하다 | 지급이 늦어진다 |

배치 흐름 중 어느 단계에 구간 계산을 둘지는 최소 변경으로 효과를 내는 위치를 고른다. 대상마다 최근 매출을 반복 조회하지 말고 집계 기간의 가맹점별 매출을 한 번에 구한다. 정산에서 가장 중요한 것은 정확도이고, 그것이 곧 가맹점의 신뢰다.

## 정책 변경과 가맹점별 주기

- **정책 변경과 배치 경합**: 운영자가 구간 기준을 정산 배치 도중 바꾸면 같은 차수 안에서 금액이 갈린다. 배치 시간대 변경 금지나 다음 날 적용(effective date)을 정하고, 차수마다 적용한 수수료 규칙과 주기를 target과 transfer에 snapshot해 재실행과 대사에서 같은 결과를 재현한다.
- **가맹점별 주기**: 3일, 7일, 10일처럼 가맹점마다 주기를 둘 때는 최대 주기, 기획 의도와 가맹점의 필요를 확인한다. 가맹점이 직접 바꿀 수 있다면 배치 시간대 수정 금지, 다음 날 적용 같은 기준을 정하고 가맹점 어드민에 안내한다.
- **최소 변경 전략**: 대상 적재와 계산은 기존 일 단위 흐름 그대로 매일 돌리고, 이체 단계만 주기가 도래한 가맹점의 누적 READY 전체를 보내도록 바꾼다. 이체는 기준 날짜를 parameter로 받는다.
- **흔한 오류**: 어제 데이터만 읽는 job에 N일 주기 이체 조건만 붙이면 가맹점은 N일치를 기대하는데 하루치만 받는다. 기존 배치의 parameter 의미를 모르는 구현자는 사람이든 에이전트든 이 오류를 만들기 쉽다. schedule을 바꾸기 전에 source window, calculation과 transfer 세 단계를 따로 검증하고 배치 흐름과 parameter 의미를 명세에 적는다.

## 출처

- [제미니 강사, 정산 window와 주기](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392808)
- [제미니 강사, 슬라이딩 정산과 가맹점별 주기 요구사항](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392806)
- [제미니 강사, 정산 코드와 구간 기준 시점](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392809)
- [제미니 강사, 정산 요구사항과 상계](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354109)
- [제미니 강사, 정산 3단계 배치](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354110)
- [제미니 강사, 정산 target 격벽](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354131)

## 관련 문서

- [[Commerce-Change-Propagation-and-Money-Invariants|커머스 변경 전파와 금액 불변식]]
- [[Commerce-Change-Propagation-and-Money-Invariants-Partial-Cancel|부분 취소와 환불 ledger]]
- [[Ecommerce-Shopping-Mall-ERD|이커머스 도메인 모델링]]
- [[Temporal-Modeling|시간 모델링 (반개구간과 기간)]]
- [[Payment-Reconciliation-Worker|결제 대사 worker]]
