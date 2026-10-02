---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Invoice, receipt와 환불"]
---

# Invoice, receipt와 환불

## 청구서 읽기

Receipts에서 기간의 날짜를 선택하면 Stripe의 invoice/receipt PDF를 내려받을 수 있다. Owner/Admin 권한이 필요하다. Invoice에는 다음 기간 구독료, 이전 기간 실제 사용료, 사용량에 적용한 credit이 함께 나타날 수 있다. 각 line의 기간을 맞춰 비교한다.

예를 들어 build 사용량260달러와 credit225달러면 build 초과액35달러다. 여기에 구독료와 해당 세금/다른 서비스 사용량이 별도로 더해질 수 있다. 공식 과거 invoice 예시의 단가를 최신 견적으로 재사용하지 않는다.

## 환불과 잘못 선택한 계정

Receipts의 Request Refund로 근거를 제출하면 담당자가 검토한다. 신청이 승인이라는 뜻은 아니며 승인 후 원래 payment method에 반영되는 데 통상5~10영업일이 걸린다.

잘못된 account를 구독했다면 실제 필요한 account의 plan과 잘못 결제한 account의 환불 절차를 각각 처리한다. 구독이 자동 이전된다고 가정하지 않는다. 결제 확인용 개인정보와 실제 invoice는 공개 지식 문서에 저장하지 않는다.

## 출처

- [Expo Documentation, View payment history, invoices, and receipts](https://docs.expo.dev/billing/invoices-and-receipts)

## 관련 문서

- [[Expo-EAS-Billing]]

- [[Expo]]
