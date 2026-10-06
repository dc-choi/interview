---
tags: [payment, card, pg, van]
status: done
verified_at: 2026-10-02
category: "비즈니스&제품(Business&Product)"
aliases: ["결제 참여자와 생명주기"]
---

# 결제 참여자와 생명주기

결제는 구매자가 지불 의사를 전달하고, 지급 권한을 확인하고, 거래 자료와 자금을 처리하는 과정이다. 앱 이름이나 카드에 표시된 브랜드만으로 돈을 지급할 주체를 알 수는 없다.

## 역할을 먼저 구분한다

| 역할 | 책임과 확인할 계약 |
|---|---|
| 발급사(issuer) | 카드 발급, 고객 한도와 계좌, 거래 승인 판단 |
| 매입사(acquirer) | 가맹점 거래의 매입과 가맹점 대금 지급 |
| 카드 네트워크 | 참여 기관 사이의 규칙, 상호 운용과 거래 전달 체계 |
| VAN | 단말 연결, 승인 메시지 전달, 매출 자료 전송 등 계약된 처리 |
| PG | 온라인 결제 연동, 가맹점 계약과 대금 정산 등 계약된 업무 |
| 간편결제 서비스 | 인증과 결제 진입 경험, 카드/계좌/선불 수단의 연결 |

Visa와 Mastercard 같은 네트워크 브랜드를 국내 카드 발급사와 같은 역할로 설명하면 승인 주체와 계약 상대방을 잘못 찾게 된다. 한 회사가 여러 역할을 수행할 수 있으므로 역할별로 그려야 한다. BC카드도 발급, 매입, 회원사 처리 등 거래별 관계를 확인한다.

국내 카드사는 발급과 매입을 함께 수행하는 구조가 흔하지만 해외 거래, 제휴 카드, 대행 처리에서는 경로가 달라질 수 있다. 발급사와 매입사가 다르다는 사실만으로 국제 네트워크를 거친다고 단정하지 않는다. 같은 기관 안에서 처리하는 on-us 거래도 고객 승인과 가맹점 지급의 책임을 구분할 필요가 있다.

## 승인, 매입, 정산은 다른 사건이다

| 사건 | 확인되는 것 | 아직 확정되지 않은 것 |
|---|---|---|
| 승인(authorization) | 거래를 허용했다는 응답과 승인 식별자 | 매출 자료의 매입, 가맹점 입금 |
| 매입(capture/clearing) | 확정 거래 자료를 대금 청구 과정에 반영 | 계약에 따른 실제 지급 완료 |
| 정산(settlement/payout) | 수수료, 취소, 보류 등을 반영한 자금 지급 | 이후 분쟁, 환불과 상계 가능성 |

영어 용어의 범위는 네트워크와 사업자별로 다르다. API의 `capture`와 국내 카드사의 매입 업무를 용어 하나만으로 동일시하지 않는다.

신용카드는 승인 시 이용 가능 한도가 줄고, 체크카드는 승인 시 계좌에서 돈이 빠질 수 있다. 따라서 승인 시 돈은 전혀 움직이지 않는다는 설명은 신용카드의 가맹점 정산과 구매자의 계좌 변동을 혼동한다. 가맹점에 입금될 때까지 걸리는 시간은 별도 계약으로 확인한다.

## 사전 승인과 최종 청구를 구분한다

숙박, 렌탈과 팁처럼 최종 금액이 나중에 확정되는 거래는 사전 승인, 금액 조정과 capture를 분리할 수 있다. Adyen의 pre-authorization은 금액 조정을 허용하는 요청 유형이며 기본 final authorization과 다르다. 모든 카드, MCC와 발급사가 조정을 허용하지 않으며 자동 만료와 네트워크의 유효기간도 따로 존재한다.

비동기 조정은 첫 승인 PSP reference를 계속 참조하고 webhook으로 최종 승인 금액을 확인한다. 동기 조정은 최신 `adjustAuthorisationData`를 이어 보내며, 중간에 누락하면 비동기 흐름으로 내려간다. Capture 접수는 완료가 아니므로 `CAPTURE`/`CAPTURE_FAILED`도 확인한다.

Adyen의 기본 28일 만료를 모든 카드의 보장된 승인 기간으로 사용하지 않는다. 네트워크 유효기간이 더 짧을 수 있고 만료 뒤 capture는 실패, 추가 수수료와 분쟁 위험을 가진다. 최종 조정 이후 capture를 시작했다면 아직 화면에 잔액이 보인다는 이유로 다시 조정하지 않는다.

## VAN과 PG가 함께 존재하는 이유

오프라인 단말에서 VAN을 거쳐 카드사에 승인 요청을 보내는 구조와, 온라인에서 PG를 통해 결제를 처리하는 구조가 대표적이다. PG가 VAN의 전송 경로를 이용할 수도 있다. VAN은 통신, 단말, 매출 자료 처리의 축이고 PG는 가맹점 연동과 정산 계약의 축이므로 단순한 온라인/오프라인 양자택일이 아니다.

PG를 이용하면 개별 결제 기관의 연동과 계약을 묶을 수 있지만, 정산 자금과 가맹점 정보의 책임이 중간 사업자에게 추가된다. 직접 연동 가능 여부는 카드사, 결제 수단, 보안 인증과 가맹점 계약에 달려 있다. 모든 온라인 결제가 법적으로 PG를 반드시 거쳐야 한다고 일반화하지 않는다.

VAN 경로에 카드사 부담 비용이 포함될 수 있고, 가맹점에는 단말 임대료, 통신료나 운영 계약 비용이 붙을 수 있다. 구매자에게 별도 VAN 수수료가 표시되지 않는 것과 VAN 서비스 원가가 없는 것은 다르다.

## 결제 수단과 서비스 이름을 분리한다

간편결제 화면에서 같은 버튼을 눌러도 뒤에서는 카드 승인, 계좌 출금, 선불 잔액 차감이 일어날 수 있다. 인증 수단, 자금 출처, 환불 방식, 세무 증빙을 각각 기록해야 한다. 가상계좌 발급은 결제 완료가 아니며 입금 확인 사건이 필요하다.

해외 거래에서는 거래 통화, 카드 청구 통화, 네트워크 환율과 해외 이용 수수료를 구분한다. DCC는 가맹점 측에서 카드 소지자의 통화로 변환하는 선택지이며, 최종 비용은 해당 카드와 가맹점의 조건으로 비교한다.

## 고객의 결제 자산과 가맹점의 정산 자산을 나눈다

스테이블코인으로 결제받는 구조에서도 가맹점이 같은 코인을 직접 보유할 필요는 없다. 코인 수취, 법정화폐 전환과 가맹점 지급을 서로 다른 사업자가 맡을 수 있다.

2026-09-28 발표된 Citi와 Coinbase 협력은 Spring by Citi에서 스테이블코인을 수취하고 Coinbase Payments를 통해 법정화폐로 자동 전환한 뒤 Citi가 정산하는 구조를 제시했다. 이는 해당 협력의 발표 범위이며 모든 가맹점의 도입 완료나 국내 서비스 제공을 뜻하지 않는다(2026-10-07 원문 확인).

계약 검토에서는 고객이 보낸 자산, 가맹점이 받을 통화, 전환과 지급의 책임 주체를 나눠 기록한다. 블록체인 거래 확인을 가맹점 계좌 입금 완료와 동일시하지 않고, 전환 비용, 지급 시점과 환불 책임을 별도로 확인한다. 이 구분은 중개기관이 사라진다는 예측보다 실제 자금 경로를 설명하는 데 유용하다.

## 운영에서 확인할 것

- 승인 실패, 승인 후 취소, 정산 후 환불의 책임 기관과 식별자가 각각 존재하는가?
- 고객 청구 금액과 가맹점 지급 금액을 같은 데이터로 취급하지 않는가?
- 중간 사업자 장애 시 조회와 취소를 어느 경로로 수행하는가?
- 계약상 자금 보유 주체, 지급 기한과 분쟁 시 공제 권한을 확인했는가?

## 출처

- [Citi and Coinbase Expand Collaboration to Connect Digital and Fiat Payments for Corporations and Consumers — Citi](https://www.citigroup.com/global/news/press-release/2026/citi-coinbase-expand-collaboration-connect-digital-fiat-payments-corporations-consumers) — 스테이블코인 수취와 법정화폐 정산의 분리만 부분 대조
- [Adyen, Pre-authorization and authorization adjustment](https://docs.adyen.com/point-of-sale/pre-authorisation/)
- [토스페이먼츠, 카드 결제](https://docs.tosspayments.com/resources/glossary/card-payment)
- [토스페이먼츠, 결제 흐름](https://docs.tosspayments.com/guides/v2/get-started/payment-flow)
- [토스페이먼츠, 결제 수단](https://docs.tosspayments.com/guides/v2/get-started/payment-methods)
- [BC카드, 매입업무](https://www.bccard.com/card/html/company/kr/company/service/pur/service02.jsp)
- [토스페이, 오프라인 결제 소개](https://docs-pay.toss.im/offline/introduce/tosspay)
- [승인과 매입 사이 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-01.html)
- [카드사의 두 얼굴 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-02.html)
- [단말기 뒤의 회사 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-03.html)
- [대표가맹점이라는 우산 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-04.html)
- [결제 한 건의 일생 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-07.html)
- [결제 이야기 #8: 카드 발급사 / 매입사 — Brunch](https://brunch.co.kr/@monami-7777/17)
- [PG / VAN 이란? — 엄범](https://umbum.dev/990/)

## 관련 문서

- [[Payment-Service]]
- [[Payment-Settlement-and-Advance]]
- [[Payment-Fee-Economics]]
- [[Payment-Entry-Protocols]]
