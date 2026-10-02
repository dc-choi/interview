---
tags: [payment, idempotency, reversal, reliability]
status: done
verified_at: 2026-10-02
category: "Reliability"
aliases: ["결제 결과 미확인과 망취소"]
---

# 결제 결과 미확인과 망취소

결제 요청의 응답을 받지 못한 것은 승인 거절과 다르다. 외부에서는 승인됐지만 상점이 결과를 저장하지 못했을 수 있으므로 결과 미확인 상태를 별도로 둔다.

## 상태와 증거를 분리한다

| 관측 결과 | 내부 판단 | 후속 처리 |
|---|---|---|
| 명시적 승인과 거래 식별자 | 성공 확인 | 승인 정보 저장, 주문 반영 |
| 명시적 업무 거절 | 실패 확인 | 거절 사유에 맞는 안내와 새 시도 정책 |
| 타임아웃/연결 종료 | 결과 미확인 | 원거래 조회, 공급자 계약에 따른 복구 |
| 요청 처리 중 응답 | 아직 진행 중 | 동일 논리 요청 식별자 유지, 지연 조회 |

HTTP 200만으로 승인 성공을 판정하지 않고 업무 상태와 코드도 읽는다. 반대로 5xx나 네트워크 타임아웃만으로 미승인이라고 확정하지 않는다. 오류 코드 이름보다 해당 API의 공식 의미가 우선한다.

## 한 논리 동작에 하나의 키

승인, 첫 번째 부분 환불, 두 번째 부분 환불은 서로 다른 논리 동작이다. 각 동작의 재전송은 같은 키와 같은 의미의 요청을 사용하고, 다른 동작에 키를 재사용하지 않는다.

토스페이먼츠 문서 확인 기준으로 POST 요청의 `Idempotency-Key`는 최대 300자, 보존 기간 15일이며 API 키, 엔드포인트, 메서드와 키의 조합으로 구분된다. `409 IDEMPOTENT_REQUEST_PROCESSING`은 요청 처리 중을 뜻한다. 이 조건은 다른 PG나 VAN에 적용되는 공통 규칙이 아니다.

키의 보존 기간이 지났다는 것은 재청구가 허용됐다는 뜻이 아니다. 원거래 조회, 내부 중복 방지와 거래 이력을 함께 사용한다. 재시도 횟수를 키에 넣어 매번 새 요청으로 만드는 방식은 중복 승인 위험을 키운다.

## 인증 성공과 승인 완료

토스페이먼츠의 결제 성공 리다이렉트는 인증 결과로 `paymentKey`, `orderId`, `amount`를 전달한다. 서버는 내부 주문의 금액과 식별자를 확인하고 승인 API를 호출해야 한다. 브라우저가 보내온 금액을 최종 가격의 정본으로 삼지 않는다.

승인 API 성공 이후 주문 갱신이 실패할 수 있다. 외부 결제와 내부 DB 트랜잭션을 하나의 원자적 작업으로 만들 수 있다고 가정하지 않고, 승인 결과를 다시 조회해 내부 반영을 복구할 수 있어야 한다.

## 망취소와 일반 취소

망취소는 통신 문제 등으로 원거래 결과가 불명확할 때 공급자가 정한 원거래 참조로 되돌림을 요청하는 기능이다. 취소 API 이름만 같다고 같은 시점, 식별자와 허용 조건을 갖는 것은 아니다.

NICEPAY의 망취소와 KICC VAN 취소 명세처럼 제공자별 필드와 경로가 따로 존재한다. 승인 번호를 못 받았을 때 필요한 식별자가 무엇인지 요청 전에 보존한다. 타임아웃 직후 모든 제공자에 일반 취소를 일괄 호출하거나, 승인 요청을 새 키로 보내는 복구 규칙을 만들지 않는다.

업무 거절, 일시 전송 장애와 한도 초과의 재시도 정책도 다르다. 제한된 재시도, backoff와 jitter를 쓰되 실제 승인 상태 확인보다 횟수 정책을 앞세우지 않는다. 응답 코드는 국가, 발급사와 네트워크에 따라 다르고 추가 조언 코드가 재시도 판단에 영향을 줄 수 있다.

## 타임아웃과 웹훅은 공급자별 계약이다

KICC 간편결제 VAN의 망취소 가이드는 read timeout, 연결 오류와 응답 parsing 오류에 원승인 요청 데이터를 그대로 사용하도록 요구한다. 권장 30초는 그 경로의 예시다. 반면 Adyen local integration은 동기 연결과 상태 조회의 120/150초 조건을 안내한다. 단일 timeout 값을 모든 결제 경로에 적용하지 않는다.

Adyen Terminal API의 `ServiceID`는 해당 `POIID`에서 최근 48시간 동안 고유해야 하는 요청 ID다. 상점의 영구 거래 ID나 다른 공급자의 멱등키와 같지 않다. Cloud async 경로의 초기 `ok`는 접수 결과이고 최종 MessageHeader/response body는 event notification에서 확인한다.

토스페이먼츠에서는 창 닫기가 상태 변경을 만들지 않으면 웹훅도 오지 않으며, 자동결제/키인 결제의 승인 완료에도 일반 결제 웹훅이 발송되지 않는 조건이 있다. 가상계좌 상태 이벤트 두 종류를 함께 구독하면 같은 변동에 알림을 두 번 받을 수 있다. 이벤트를 구독했다는 이유로 모든 승인과 사용자 이탈을 탐지했다고 판단하지 않는다.

2026-10-02 웹훅 가이드의 수신 계약은 10초 안에 200 응답이며 실패 시 최대 7회 재전송이다. 장기 업무를 응답 전에 완료하려 하지 말고 수신 기록을 영속 저장한 뒤 처리한다. 토스페이먼츠의 signature header는 지급대행 `payout.changed`/`seller.changed`에 한정되며, 가상계좌 callback은 승인 응답의 `secret` 대조 계약을 사용한다. 모든 결제 웹훅에 동일 HMAC header가 존재한다고 가정하지 않는다.

API 버전을 고정해도 호환 변경으로 새 필드, ENUM/에러 코드와 이벤트가 추가될 수 있다. Unknown 값을 성공으로 간주하지 않되 parser가 알려진 사실과 원문을 보존할 수 있어야 한다. 테스트 MID와 라이브 MID의 버전도 따로 확인한다.

## 단말 캐시와 현재 거래 상태를 구분한다

토스 프론트 SDK의 `getPayment`/`getPaymentCancel`은 요청한 단말의 성공 결과를 복구하는 로컬 캐시 조회다. 공식 문서의 보존 조건은 각각 14일, 최대 1,000건이며 TIMEOUT, 취소나 승인 실패는 캐시하지 않는다. `PAYMENT_NOT_FOUND`는 캐시 부재이고 외부 미승인의 증거가 아니다.

승인과 취소 캐시는 독립적이다. 취소 성공 후에도 `getPayment`가 이전 승인 성공을 반환할 수 있으므로 그것을 현재 미취소 상태로 덮어쓰지 않는다. 서버/VAN의 거래 상태, 취소 결과와 대사 자료를 별도로 반영한다.

## 자동 재시도도 별도의 생명주기다

Adyen Auto Rescue는 계약된 shopper-not-present 카드 청구의 거절 후 재시도 기능이다. 결과 미확인 요청을 새 키로 재전송하는 복구와 구분한다. 재시도마다 PSP reference가 새로 생기므로 청구 주기의 `merchantOrderReference`로 묶고, `AUTHORISATION`과 `AUTORESCUE` 사건을 함께 읽는다.

고객의 구독 해지나 결제수단 변경 때 기존 rescue도 취소해야 새 청구와 겹치지 않는다. `rescueReference`를 참조한 취소 접수와 `CANCEL_AUTORESCUE` 결과는 다른 사건이다. 수동 capture를 쓰면 rescue 승인 성공 후 capture도 필요하다.

## 콜백 검증과 접수 응답을 분리한다

NICEPAY Server 승인 모델은 인증 콜백의 주문번호, 금액과 signature를 내부 주문에 대조한 뒤 승인 API를 호출한다. Client 승인 모델은 브라우저 경로에서 이미 승인이 처리될 수 있으므로 승인 후 금액 검증이 필요하다. `/check-amount/{tid}`의 `resultCode=0000`은 검증 API 처리 성공이고, `isValid=false`는 승인 금액 불일치다. 두 값을 합쳐 성공으로 판정하지 않는다.

NICEPAY 웹훅 수신은 200 상태만으로 끝나지 않는다. 공식 계약은 `Content-Type: text/html`과 본문의 `OK` 문자열을 요구한다. signature와 금액을 검증하고 수신을 영속 기록한 뒤 해당 응답 계약을 충족한다. 재전송은 새로운 주문/승인으로 만들지 않는다. 거래 조회의 `tid`와 `orderId` 경로도 구분하며 주문번호 조회에는 주문일자 조건이 있다.

## 샘플의 승인 호출과 운영 완료를 구분한다

토스페이먼츠 샘플의 2026-10-02 확인 snapshot은 API 호출 흐름을 보여준다. 프론트 주석은 주문번호/금액의 서버 사전 저장을 요구하지만 Express 승인 서버는 요청의 `orderId`와 `amount`를 전달하고 주문 완료 업무를 TODO로 남긴다. success URL의 값과 화면 표시를 내부 주문의 승인 근거로 삼지 않고, 인증된 구매자와 서버의 주문 금액을 대조한 뒤 외부 결과를 영속 반영한다.

샘플 서버의 HTTP 결과도 공급자의 처리 결과와 다를 수 있다. 해당 Go/PHP 샘플은 upstream HTTP 상태를 그대로 전달하지 않으므로 자체 서버의 200만으로 승인됐다고 판단하지 않는다. 가상계좌 웹훅 샘플도 수신한 `secret`, `status`, `orderId`를 출력하는 예시이며, 저장된 secret 대조와 중복 반영 방지를 구현한 운영 수신기가 아니다. 샘플이 제공하지 않는 `BILLING_DELETED` 수신, 네트워크 실패와 내부 저장 실패의 복구까지 별도로 구현해야 한다. 이는 읽은 소스의 범위 설명이며 실제 승인 시험 결과는 아니다.

## 복구는 두 방향으로 필요하다

- 외부 승인 성공, 내부 저장 실패: 조회와 대사로 승인 기록을 복구한다.
- 내부 주문 변경 성공, 외부 취소 실패: 취소 대기 상태와 재처리 작업을 보존한다.
- 같은 웹훅 중복 도착: 외부 사건 ID와 내부 상태 전이로 중복 효과를 막는다.
- 웹훅이 오지 않음: 조회 작업과 정산 대사로 누락을 찾는다.

환불은 새로운 외부 거래다. 내부 DB를 되돌리는 것과 외부 자금 거래를 보상하는 것을 구분하고, 복구 중 고객에게 재결제나 중복 환불을 유도하지 않는다. 상세 불변조건과 대사 설계는 기존 결제 원칙 문서를 따른다.

## 출처

- [토스페이먼츠, Express 승인 샘플](https://github.com/tosspayments/tosspayments-sample/blob/8d0df11d14dadfe355050bdc9ba38618f6a9c028/express-react/server.js)
- [토스페이먼츠, Go 승인 요청 예시](https://github.com/tosspayments/tosspayments-sample/blob/8d0df11d14dadfe355050bdc9ba38618f6a9c028/go-react/backend/main.go)
- [토스페이먼츠, PHP 승인 요청 예시](https://github.com/tosspayments/tosspayments-sample/blob/8d0df11d14dadfe355050bdc9ba38618f6a9c028/php-javascript/index.php)
- [토스페이먼츠, 가상계좌 웹훅 샘플](https://github.com/tosspayments/tosspayments-sample/blob/8d0df11d14dadfe355050bdc9ba38618f6a9c028/php-javascript/virtual_account_webhook.php)
- [토스페이먼츠, 샘플의 지원/구현 범위](https://github.com/tosspayments/tosspayments-sample/blob/8d0df11d14dadfe355050bdc9ba38618f6a9c028/express-react/README.md)
- [NICEPAY, Server 승인 모델](https://github.com/nicepayments/nicepay-manual/blob/main/api/payment-window-server.md)
- [NICEPAY, Client 승인 금액 검증](https://github.com/nicepayments/nicepay-manual/blob/main/api/payment-window-client.md)
- [NICEPAY, 웹훅](https://github.com/nicepayments/nicepay-manual/blob/main/api/hook.md)
- [NICEPAY, 거래 조회](https://github.com/nicepayments/nicepay-manual/blob/main/api/status-transaction.md)
- [토스플레이스, 프론트 SDK Payment API](https://docs.tossplace.com/reference/plugin-sdk/front/payment.html)
- [Adyen, Auto Rescue](https://docs.adyen.com/online-payments/auto-rescue/cards)
- [토스페이먼츠, API 버전 정책](https://docs.tosspayments.com/reference/versioning)
- [토스페이먼츠, 웹훅 연결](https://docs.tosspayments.com/guides/v2/webhook)
- [토스페이먼츠, 웹훅 이벤트](https://docs.tosspayments.com/reference/using-api/webhook-events)
- [Adyen, Terminal API](https://docs.adyen.com/point-of-sale/design-your-integration/terminal-api)
- [Adyen, Building a local integration](https://docs.adyen.com/point-of-sale/design-your-integration/choose-your-architecture/local)
- [KICC, 망취소](https://docs.kicc.co.kr/docs/van-payment/simple/net-cancel)
- [토스페이먼츠, 멱등키 사용](https://docs.tosspayments.com/reference/using-api/idempotency-key)
- [토스페이먼츠, 결제 흐름](https://docs.tosspayments.com/guides/v2/get-started/payment-flow)
- [토스페이먼츠, 에러 코드](https://docs.tosspayments.com/reference/error-codes)
- [NICEPAY, 취소와 망취소 API](https://github.com/nicepayments/nicepay-manual/blob/main/api/cancel.md)
- [KICC, 간편결제 취소](https://docs.kicc.co.kr/docs/van-payment/simple/cancel/)
- [무응답이라는 세 번째 답 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-13.html)
- [EBANX, ISO 8583 Response Codes](https://docs.ebanx.com/docs/pay-in/dev-tools/response-codes/iso8583-codes)
- [망취소 환경 구축 — TAES-K](https://taes-k.github.io/2022/09/23/net-cancel/) — 2022년 구현 사례, 시간값은 해당 사례의 조건

## 관련 문서

- [[Payment-System-Principles]]
- [[Payment-Reconciliation-Worker]]
- [[POS-Split-Payment-and-Refund]]
