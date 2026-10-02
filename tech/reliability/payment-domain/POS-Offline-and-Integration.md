---
tags: [pos, offline, integration, payment]
status: done
verified_at: 2026-10-02
category: "Reliability"
aliases: ["POS 오프라인 결제와 외부 연동"]
---

# POS 오프라인 결제와 외부 연동

POS는 통신이 끊긴 동안 주문을 보관할 수 있지만, 주문 기록을 남긴 것과 카드 대금을 받을 수 있는 것은 다른 능력이다. 오프라인 결제와 외부 결제 기록 API를 각각 실제 승인 계약과 구분해야 한다.

## 오프라인 거래의 세 가지 의미

| 방식 | 판단 시점 | 위험 |
|---|---|---|
| EMV 오프라인 승인 | 카드와 단말의 설정에 따라 현장에서 판단 | 허용 카드, 한도, 이후 처리와 가맹점 책임 |
| Store-and-forward | 현장에서 저장하고 연결 복구 후 온라인 승인 | 나중에 거절되면 이미 상품을 제공했을 수 있음 |
| Force post(강제 매출) | 발급사 승인 없이 가맹점이 수용하고 정산에 제출하는 별도 계약 | 승인 없는 거래의 손실, 차지백과 네트워크 허용 조건 |

이를 전부 카드사가 이미 승인한 거래로 표시하지 않는다. 현장 접수, 전송 대기, 외부 승인과 최종 지급을 구분하고, 승인 거절이나 미전송의 손실 책임을 계약으로 확인한다.

2016년 4월 미국 통신장애 지침의 deferred authorization은 현장에서 ARQC를 얻었지만 연결 실패로 카드와 단말이 offline decline으로 마친 거래를 복구 후 발급사에 제출하는 경우도 포함한다. 그 현장 종료와 나중의 발급사 거절은 다른 결과다. 필요한 EMV 데이터와 원거래를 보존하되, 발급사가 deferred 요청을 거절한 뒤에는 같은 요청을 반복하거나 승인 거래처럼 청산하지 않는다. 당시 single-message debit은 한 번의 deferred 승인 판단과 네트워크별 예외 처리 규칙을 구분했다.

이 지침은 가맹점 쪽 통신 장애와 당시 참여 미국 네트워크에 한정된다. 발급사 host 장애, 네트워크/gateway 장애와 stand-in은 범위 밖이다. 복구 후 도착한 ATC가 현장 거래 순서와 어긋날 수 있으므로 단순 역순만으로 위조나 중복을 확정하지 않는다. 현재 국내 승인/청산과 책임 규칙은 매입사/VAN 계약으로 다시 확인한다.

2016년 Kernel 4 v2.6의 delayed authorisation은 실시간 승인이 원래 불가능한 배치 환경에서 사용하는 별도 설정이다. 성공한 offline data authentication을 전제로 현장에서 수용한 뒤 발급사에 늦게 승인 요청을 보내는 구조이며, 카드가 AAC를 반환하면 거절한다. 평소 온라인인 단말의 일시적인 통신 장애를 이 모드로 자동 전환할 수 있다는 근거로 쓰지 않는다. 이 버전의 online-only 또는 즉시 승인용 partial online에서 ARQC를 얻은 뒤 연결에 실패하면 원칙적으로 거절하고, 별도 결제망 규칙과 가맹점 설정의 예외는 따로 확인한다.

EMV 금액 한계는 비접촉 거래 자체의 허용 한계, 온라인 승인을 요청하는 floor limit, CVM을 요구하는 한계로 나뉜다. Kernel 4 v2.6의 dynamic limit 비교는 각각 `금액 >= transaction limit`, `금액 > floor limit`, `금액 >= CVM limit`이다. 경계 금액을 같은 비교 연산으로 처리하면 수용, 온라인 요청과 본인 확인이 달라진다. 카드가 제시한 dynamic limit set을 단말이 지원하지 않으면 설정된 default set을 사용하며, default가 없으면 AID의 기존 한계를 유지한다. 이 수치와 비교 규칙을 다른 커널이나 현재 국내 단말의 공통 계약으로 확대하지 않는다.

## 장애 범위와 지원 조건

매장 인터넷 장애, 단말-앱 연결 장애, VAN/PG 플랫폼 장애는 서로 다른 실패다. 로컬 통신이 필요한 기능과 클라우드에서 요청이 단말까지 도달해야 하는 기능도 다르다.

2026-10-01 공식 문서 확인 기준, Adyen의 store-and-forward는 Adyen 플랫폼 자체 장애에서 사용할 수 없다고 안내한다. Square 미국 지원 문서는 매장 인터넷 장애와 Square 서비스 장애를 구분해 설정할 수 있다. 따라서 공급자 한 곳의 기능을 보편적인 장애 대응으로 설명하지 않는다.

| 공식 문서 예 | 확인한 제약 |
|---|---|
| Adyen | 카드/단말 설정, EMV floor limit, 저장 거래 한도와 건수, 모바일 기능 차이 |
| Square 미국 | 지원 기기와 결제 유형, 업로드 만료 시간, 대기 거래 손실과 가맹점 책임 |

Square는 지원 기기의 대기 거래를 오프라인 세션 시작부터 72시간 내 업로드하도록 안내하고, 기기별 세션 조건이 다르다. 만료된 거래는 복구/재처리할 수 없다는 제약도 있다. 이 시간은 국내 VAN이나 다른 기기의 공통 규칙이 아니다. 미전송 거래가 남은 동안 앱 삭제, 로그아웃이나 초기화가 거래를 잃게 할 수 있으므로 운영 절차가 필요하다.

국내 서비스에서 오프라인 수용을 구현하려면 해당 매입사/VAN과 단말, 카드 프로파일의 허용 여부를 먼저 확인한다. 해외 제품의 기능을 참고했다는 이유로 국내 계약에서 사용할 수 있다고 보장하지 않는다.

## 연결 토폴로지와 cellular failover

셀룰러 전환은 단말의 인터넷 경로를 복구하는 기능이다. POS 앱과 단말의 로컬 연결, POS 앱의 인터넷과 공급자 플랫폼을 모두 복구하는 기능으로 이해하면 안 된다.

| 장애 | Adyen 문서의 경로 예시 |
|---|---|
| Cloud 연동, POS 앱 인터넷 정상 | 단말이 cellular로 전환하면 플랫폼에서 단말로 요청을 보낼 수 있다. |
| Cloud 연동, POS 앱도 인터넷 단절 | 단말만 cellular에 연결돼도 POS 앱이 플랫폼에 요청을 보낼 수 없다. |
| Local 연동, 단말이 LAN에서 단절 | POS에서 단말로 요청이 도착하지 않으므로 cellular만으로 해결되지 않는다. |
| Local 연동, LAN 정상/인터넷 단절 | 단말이 요청을 받은 뒤 cellular로 온라인 승인을 시도할 수 있다. |

2026-10-02 Adyen Terminal API 문서의 offline 조건은 local communications다. Local API는 단말 인증서 검증과 공유 키 기반 통신 암호화가 필요하며, 시험 환경에서 동작한 것이 운영 보안 조건 충족을 증명하지 않는다. 네트워크 분리, 단말 주소 변경, DNS/firewall과 정전 대응도 승인 복구와 별도로 검토한다.

## 복구 큐의 데이터

설계 예시로 기기/가맹점 ID, 원거래 키, 접수 시각, 금액/통화, 전송 상태와 공급자 참조를 영속 저장한다. 카드 원정보의 로컬 저장을 직접 구현하지 않고 승인된 솔루션의 보안 계약을 따른다.

Adyen 오프라인 응답에서는 플랫폼의 PSP reference가 아직 없을 수 있다. 단말 참조와 POI ID 등을 보존한 뒤 연결 복구 후 전달되는 참조로 연결한다. 외부 ID가 없다는 이유로 동일 거래를 새 거래로 생성하면 중복 처리할 수 있다.

복구에서는 큐 재전송, 외부 결과 조회, 주문 상태와 정산 대사가 모두 필요하다. 로컬 큐가 비었다는 사실만으로 대금 지급까지 끝났다고 판단하지 않는다. 재연결 뒤 거절된 거래와 장기 미전송은 관리자에게 분리해 보여준다.

## 외부 주문 API의 권한과 정본

외부 주문은 채널의 주문 ID와 POS 주문 ID를 연결하고, 가맹점별 권한과 식별자 범위를 보존한다. 표시용 주문 번호와 중복 방지용 고유 키를 혼동하지 않는다. 수락, 조리, 출고, 결제 취소의 권한을 주체별로 정한다.

토스플레이스 Open API 문서는 서버 간 연동과 승인된 앱의 쓰기 권한을 설명한다. 주문 변경에는 Open API로 생성한 주문 등 대상 제약이 있다. 모든 POS 내역을 수정할 수 있거나 전체 API가 읽기 전용이라는 설명 모두 맞지 않는다.

외부 결제 등록 API는 다른 경로에서 발생한 결제 사실을 POS에 기록하는 기능이다. 등록/취소 API 호출 자체가 실제 카드 승인/환불을 수행하지 않는다. 결제 모델에는 정산 주체 같은 정보도 있지만 해당 정보가 존재한다고 실제 송금과 대사까지 수행하는 것은 아니다.

웹훅은 중복과 순서 변경을 전제로 처리한다. 토스플레이스는 `x-toss-webhook-id`를 중복 식별에 사용할 수 있도록 안내한다. 가맹점, 객체 ID와 수정 시각/버전으로 연결하고 서명 검증 등 실제 전달 계약을 따른다. 외부 주문 상태를 수신하는 것과 POS의 자체 업무 상태를 덮어쓰는 것은 별도 판단이다.

## 웹훅 사건, 전송과 조회 창

2026-10-02 토스플레이스 계약은 at-least-once 전달이다. `x-toss-webhook-id`는 재전송에도 같은 사건 ID, `x-toss-delivery-id`는 시도마다 다른 전송 ID, `x-toss-event-id`는 추적 ID다. 전송 ID로 중복을 판정하면 같은 사건을 재처리하게 된다.

서명 검증은 webhook secret으로 `<x-toss-timestamp>.<rawRequestBody>`를 HMAC-SHA256 계산하고 hex 결과에 `v1=`을 붙인 값을 비교한다. JSON을 파싱/재직렬화한 문자열은 raw body와 다를 수 있다. 서명과 시각을 검증한 뒤 사건을 영속 저장하고 2xx 응답과 실제 업무 처리를 구분한다. 다른 공급자의 서명 조합/인코딩을 복사하지 않는다.

주문 웹훅은 요청, 수락, 준비 시작, 완료, 만료와 고객 호출을 구분한다. 고객 호출과 결제 완료를 같은 사건으로 보지 않는다. 주문 목록의 from/to와 정렬은 결제 내역 변동 시각 기준이며, 모든 주문 수정의 `updatedAt` 순으로 조회한다는 가정은 피한다. 누락 복구 조회는 API의 실제 시간 기준과 page 경계를 사용한다.

## 단말 플러그인의 결과 보존

토스플레이스 플러그인 결제 가이드는 같은 논리 결제를 식별하는 payment key와 백업 키 조회를 제공한다. 완료 결과를 저장하기 전 앱이 종료됐을 때 원거래 키로 결과를 조회하고, 저장을 마친 뒤 백업 상태를 정리하는 흐름이 중요하다.

예제의 timeout 값은 기기와 공급자의 실제 완료 시간 보장이 아니다. 플러그인 프로세스 격리도 단말 승인과 주문 저장의 원자성을 만들지 않는다. 느린 외부 작업, UI 상태와 복구 작업을 분리하되 키와 결과를 유실하지 않는 계약을 먼저 마련한다.

프론트 SDK의 현금 취소는 현금영수증 승인을 취소하는 기능이며 현금 자체를 고객에게 전달하지 않는다. 영수증을 발행하지 않은 현금 거래는 그 API의 취소 대상이 없다. `paymentKey`는 파트너가 만든 키이며, 취소에 필요한 승인 시각/번호, VAN 거래 키와 원거래 세금 구성을 함께 보존한다.

과세/면세 혼합 거래의 프론트 SDK는 `supplyValue`에 면세 금액도 포함하고 `taxExemptValue`를 따로 전달한다. 이름이 같아 보이는 PG의 `suppliedAmount`와 값의 범위를 혼동하지 않는다. 예제의 `floor(price / 11)`도 다른 PG의 반올림 계약에 적용하지 않는다.

## 모바일 결제의 세션과 장치 상태도 운영 데이터다

Adyen iOS Mobile SDK의 session은 서버의 `/auth/certificate` 요청으로 설정한다. SDK 설치의 `installationId`와 실제 card reader ID는 다른 식별자다. 매장을 바꿀 때 기존 session을 비우지 않으면 이전 매장으로 거래가 귀속될 수 있다. API key, SDK 다운로드 자격 증명과 테스트/라이브 app target도 구분한다.

거래 상태 조회는 POS 앱에서 원 `SaleID`/`ServiceID`/`POIID`를 참조한다. 조회 자체의 `Success`는 거래가 끝났다는 뜻이며 nested 원거래 결과가 성공인지 별도로 확인한다. `InProgress`에는 원 결제를 다시 시작하지 않는다. Diagnosis는 미전송 offline 건수, 보안 attestation과 SDK 만료를 보여주며 일반 지급/정산 조회를 대체하지 않는다.

모바일 기기의 passcode 제거와 보안 변경은 저장된 store-and-forward 데이터를 잃게 할 수 있다. 장애 복구 중 앱 재설치나 session/설정 변경을 일반 해결책으로 일괄 적용하지 않는다. Adyen card-reader simulator는 장치 관리 UI만 시험하며 거래는 지원하지 않는다. 테스트 카드의 금액 suffix로 유발한 오류와 운영의 실제 issuer 응답도 구분한다.

## 웹뷰 복귀와 실제 승인 결과는 별개다

NICEPAY 앱 연동은 결제 요청의 `appScheme`, 앱의 URL scheme 등록과 제휴 결제 앱 호출 설정을 함께 맞춘다. iOS의 외부 scheme 조회 목록과 Android의 package visibility/Intent 처리는 서로 다른 설정이다. 외부 앱에서 돌아오거나 웹뷰 팝업이 닫힌 것을 승인 성공으로 간주하지 않는다.

공식 Android 가이드는 캐시 우선 모드 `LOAD_CACHE_ELSE_NETWORK`가 일부 카드사 세션 오류를 만들 수 있다고 경고한다. 오래된 샘플의 전체 cleartext 허용, ATS 예외나 모든 mixed content 허용은 결제 연동의 공통 보안 권고로 옮기지 않는다. 필요한 HTTPS/도메인 경로와 현재 OS의 보안 조건을 별도로 확인한다.

NICEPAY sandbox는 임의 응답을 반환하고 부분 취소, 일부 조회와 현금영수증 취소에 지원 제한이 있다. 테스트 성공 코드나 고정 카드 정보가 운영 원천사의 승인/취소 지원을 입증하지 않는다. 환경별 API host, key와 기능 지원표를 함께 확인한다.

## 출처

- [EMV Migration Forum, Merchant Processing During Communications Disruptions v1.0](https://web.archive.org/web/20180712171248/http://www.emv-connection.com/downloads/2016/04/Merchant-Processing-during-Communication-Disruption-FINAL-April-2016.pdf) — 2016년 4월 미국 지침, 원본 PDF의 공개 아카이브
- [EMVCo, Contactless Book C-4 Kernel 4 v2.6](https://web.archive.org/web/20210615151656/https://www.emvco.com/wp-content/uploads/2017/05/C-4_Kernel_4_v2.6_20160512101635327.pdf) — 2016년 2월 규격, 2/7/10/11/12장
- [NICEPAY, iOS 앱 연동](https://github.com/nicepayments/nicepay-manual/blob/main/api/app-ios.md)
- [NICEPAY, Android 앱 연동](https://github.com/nicepayments/nicepay-manual/blob/main/api/app-android.md)
- [NICEPAY, Sandbox 제약](https://github.com/nicepayments/nicepay-manual/blob/main/common/test.md)
- [Adyen, iOS card reader solution](https://docs.adyen.com/point-of-sale/mobile-ios/build/card-reader)
- [Adyen, iOS error handling](https://docs.adyen.com/point-of-sale/mobile-ios/troubleshooting)
- [Adyen, point-of-sale test card v2](https://docs.adyen.com/point-of-sale/testing-pos-payments/test-card-v2)
- [토스플레이스, Front Payment API](https://docs.tossplace.com/reference/plugin-sdk/front/payment.html)
- [토스플레이스, 주문 웹훅](https://docs.tossplace.com/reference/open-api/order/order-events.html)
- [토스플레이스, 주문 조회](https://docs.tossplace.com/reference/open-api/order/order-methods.html)
- [토스플레이스, 웹훅](https://docs.tossplace.com/reference/open-api/webhook.html)
- [Adyen, Terminal API](https://docs.adyen.com/point-of-sale/design-your-integration/terminal-api)
- [Adyen, Building a local integration](https://docs.adyen.com/point-of-sale/design-your-integration/choose-your-architecture/local)
- [Adyen, Cellular failover](https://docs.adyen.com/point-of-sale/design-your-integration/network-and-connectivity/cellular-failover)
- [Adyen, Offline payments](https://docs.adyen.com/point-of-sale/offline-payment)
- [Square, Process card payments with offline mode](https://squareup.com/help/us/en/article/7777-process-card-payments-with-offline-mode)
- [토스플레이스, Open API 소개](https://docs.tossplace.com/reference/open-api/intro.html)
- [토스플레이스, 주문 생성](https://docs.tossplace.com/reference/open-api/order/order-create.html)
- [토스플레이스, 결제 API](https://docs.tossplace.com/reference/open-api/payment.html)
- [토스플레이스, 플러그인 결제 테스트](https://docs.tossplace.com/guide/front-integration/plugin/test/payment.html)
- [승인 없이 파는 법 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-20.html)
- [주문 위에 얹힌 결제 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-21.html)
- [포스를 확장하는 가장 빠른 방법, 포스 플러그인 — Toss Tech](https://toss.tech/article/toss-pos-plugin) — 2025년 플러그인 구조 사례

## 관련 문서

- [[Payment-Unknown-Outcome-and-Reversal]]
- [[POS-Order-and-Discount]]
- [[POS-Split-Payment-and-Refund]]
- [[Payment-Reconciliation-Worker]]
