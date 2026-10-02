---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS 요금 운영 판단"]
---

# EAS 요금 운영 판단

## 자주 혼동하는 조건

Free는 초과 요금을 발생시키지 않으며 quota 소진 시 서비스별 제한을 받는다. Paid는 초과 사용을 계속하고 요금을 청구한다. Build credit을 모두 썼다고 실행이 자동 중단되는 것은 아니다.

구독 취소는 기간 말에 적용되므로 현재 사용량 청구를 없애지 않는다. Billing estimate와 이메일 알림은 지연될 수 있다. App MAU와 EAS Update의 update 다운로드 installation MAU도 구분한다.

## 조회와 문의 경로

Build 비용은 Usage에서 platform/resource class별로, Update 비용은 MAU/bandwidth로 확인한다. Invoice/receipt는 Owner/Admin이 직접 download한다. 세금 정보 수정은 다음 invoice부터 적용된다. W-9나 계약 서류는 공식 support로 요청한다.

Paid plan에서는 추가 build concurrency를 구매할 수 있다. 기본 포함량은 plan별로 다르며 추가5개를 넘으면 문의한다. Concurrency 증가는 개별 build를 더 빠른 머신에서 실행하는 resource class 변경과 다르다.

Enterprise annual/ACH와 support add-on은 계약 조건을 확인한다. 요금 문서의 사례와 계정에 실제 적용된 계약이 다르면 계정 계약/현재 pricing을 우선 확인한다.

## 출처

- [Expo Documentation, Plans, billing, and payment FAQs](https://docs.expo.dev/billing/faq)

## 관련 문서

- [[Expo-EAS-Billing]]

- [[Expo]]
