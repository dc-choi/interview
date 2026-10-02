---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS 구독과 비용 범위"]
---

# EAS 구독과 비용 범위

## 비용을 나누어 본다

Expo SDK의 로컬 개발과 EAS cloud 구독은 별개다. Billing/Receipts는 계정 Owner/Admin이 조회한다. 여러 조직에 속하면 현재 선택한 계정과 프로젝트 소유 계정을 확인한다. 개인 구독이 다른 Organization 비용을 대신 부담하는 것으로 가정하지 않는다.

Free는 제한된 low-priority build와 update quota를 제공하고 초과 요금을 청구하지 않는다. Paid는 Build credit과 Update MAU/bandwidth allowance를 제공하며 초과 사용량을 청구한다. 구독은 기본 monthly, pre-tax 금액이다.

## Plan 선택

2026-10-01 문서 기준 Starter는 월19달러, Build credit45달러다. Production은 더 큰 credit/Update allowance와 운영 기능, Enterprise는 더 큰 한도와 계약/지원 선택지를 제공한다. Enterprise Support add-on은 신규 Enterprise와 가용성 조건을 가진 별도 상품이다.

고정 가격표 전체를 영구 기준으로 두지 않는다. 예상 build 플랫폼/resource class/횟수, update installation 수와 전송량, Workflow/Hosting/Observe 기능을 현재 pricing과 비교한다. Store developer account 비용과 결제 수수료는 EAS 구독과 별개다.

## 사용량 한도

Free quota는 달력 월1일, paid는 구독 billing period 기준으로 갱신한다. Free build quota를 쓰면 다음 reset까지 cloud build가 제한된다. 로컬 build 또는 plan 변경을 선택할 수 있다. Paid credit을 소진한 뒤 취소해도 즉시 Free quota를 추가로 받지 않는다.

Paid credit은 기간 끝에 소멸하며 다음 달로 이월되지 않는다. 사용하지 않은 Free quota도 paid credit으로 전환되지 않는다.

## 출처

- [Expo Documentation, Billing: Overview](https://docs.expo.dev/billing/overview)
- [Expo Documentation, Subscriptions, plans, and add-ons](https://docs.expo.dev/billing/plans)

## 관련 문서

- [[Expo-EAS-Billing]]

- [[Expo]]
