---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["구독 변경과 결제 정보"]
---

# 구독 변경과 결제 정보

## 변경이 적용되는 시점

Billing의 Current Plan에서 계정을 확인하고 plan을 변경한다. Upgrade checkout에서 결제한 account를 확인한다. Starter로 downgrade하거나 유료 plan을 취소하면 현재 billing period 종료 뒤 적용된다. 취소 전 발생한 사용량 청구는 남는다.

Upcoming Plan에서 예정 변경을 확인한다. Paid credit을 소진한 직후 Free quota로 갈아타는 방식으로 즉시 비용을 회피할 수는 없다. SSO 사용 조직은 plan 종료 전에 non-SSO Owner와 SSO 중단 절차를 확인한다.

## Billing 정보

Manage billing은 Stripe portal로 연결되며 이름/이메일/주소/tax ID/payment method를 수정한다. 변경 정보는 다음 invoice부터 반영되고 이미 발행한 invoice를 소급 수정하지 않는다. Expo account 로그인 이메일과 invoice 연락처를 혼동하지 않는다.

Enterprise annual contract와 ACH 결제는 별도 문의 대상이다. 일반 monthly plan에 annual/계좌이체가 자동 제공되는 것으로 안내하지 않는다. Expo는 카드 정보를 직접 저장하지 않고 Stripe가 결제를 처리한다.

## 출처

- [Expo Documentation, Manage plans and billing](https://docs.expo.dev/billing/manage)

## 관련 문서

- [[Expo-EAS-Billing]]

- [[Expo]]
