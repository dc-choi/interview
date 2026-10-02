---
tags: [payment, tokenisation, pci, security]
status: done
verified_at: 2026-10-02
category: "Reliability"
aliases: ["결제 토큰화와 PCI 범위"]
---

# 결제 토큰화와 PCI 범위

토큰화는 PAN 같은 원 자격 정보를 대체 값으로 표현하는 방법이다. 토큰의 발급 주체, 사용 범위와 복원 경로를 알아야 보안 효과와 연동 가능성을 판단할 수 있다.

## 서로 다른 토큰을 구분한다

| 종류 | 사용 계약 |
|---|---|
| EMV 결제 토큰 | 카드 네트워크와 TSP 체계에서 PAN을 대체하며 기기, 가맹점이나 시나리오의 사용 범위를 제한할 수 있음 |
| PG 보관소 토큰/빌링키 | 해당 PG가 보관한 결제 수단을 호출하는 식별자, 발급과 사용 API에 종속 |
| 일회성 인증/결제 토큰 | 특정 요청이나 짧은 기간의 인증 결과를 전달 |
| PAR | PAN과 연결된 토큰들을 참조하는 계정 식별자, 자체 결제 자격 정보가 아님 |

TSP는 토큰 발급과 생명주기를 관리하고, token requestor는 토큰을 요청해 사용하는 주체다. 토큰 사용 영역을 제한하면 특정 기기나 가맹점에서 유출된 값의 다른 영역 사용을 줄일 수 있다. 모든 PG 토큰이 네트워크 토큰이거나 모든 토큰에 같은 제한이 있는 것은 아니다.

PAR은 부정 사용 탐지, 교통이나 멤버십에서 동일 결제 계정의 참조를 연결하는 데 활용할 수 있다. 토큰 값이 바뀌어도 계정 연결이 필요할 수 있다는 의미이며, PAR만으로 고객 개인정보나 다른 사업자의 거래를 조회할 수 있다는 뜻은 아니다.

## 역할과 거래별 사용 계약

2023년 use-case guide에서 등록된 Token Requestor는 발급을 요청하고, Token User는 다른 요청자가 제공한 토큰으로 거래한다. 가맹점 직접 요청, 지갑/제3자의 요청과 Aggregator 중개를 구분하고 요청자 ID의 주체를 보존한다.

발급, 배포, 제시와 승인 처리는 별개다. 발급 때의 Token Assurance가 이후 승인을 보장하지 않는다. 같은 토큰의 현장/in-app 사용도 각각 기기, 가맹점과 제시 모드의 제한을 적용한다. Token Cryptogram을 사용하면 거래별 값을 요구하지만 모든 사례의 필수 조건은 아니다.

Guest 토큰은 한 번의 고객 시작 거래(CIT)와 그에 따른 후속 가맹점 시작 거래(MIT)에 제한될 수 있다. MIT 예시는 선행 CIT와 자격 정보 저장/사용 동의를 전제하고, 고객의 새 제시 없이 승인 처리를 시작한다. 보관된 토큰이 임의 청구의 권한은 아니다.

Token Reference ID는 중개자가 실제 토큰을 찾는 참조이며 그 자체를 결제망 토큰으로 전송하지 않는다. PAR은 자격 정보를 연결하지만 개인을 보편적으로 식별하지 않는다. 토큰 검증, 3DS 본인 인증과 발급사 승인은 별도 판단이며 cryptogram이 본인 인증을 대신하지 않는다.

## 토큰은 운영 생명주기를 가진다

카드 재발급, 분실, 기기 변경과 사용 범위 변경은 토큰의 갱신이나 정지를 만들 수 있다. 네트워크 갱신 서비스의 제공 여부와 PG 빌링키 처리 방식은 공급자 계약으로 확인한다. PG를 옮길 때 기존 토큰을 그대로 사용할 수 있다고 가정하지 않는다.

토스페이먼츠의 자동결제 가이드는 발급된 빌링키를 상점이 저장해 사용하도록 안내하며, 분실한 빌링키를 조회 API로 복구하는 방식은 제공하지 않는다. 재발급 상황과 결제 수단별 지원 범위를 따로 확인한다. 결제 스케줄을 실행하는 책임도 상점에 있으므로 자동결제 등록 자체가 정기 청구 전체를 수행하는 것은 아니다.

토큰도 결제 권한을 행사하는 데 쓰일 수 있다. 원 카드번호가 없다는 이유로 로그, 오류 추적과 분석 시스템에 제한 없이 기록하지 않는다. 비밀키와 함께 노출되는 경우의 위험, 권한 분리, 삭제와 보관 기간을 설계한다.

EMVCo의 2024년 quick guide는 Token Domain Restriction Controls를 토큰의 사용 기기, 가맹점과 시나리오를 제한하는 핵심으로 설명한다. PAN 변경과 토큰 변경이 반드시 함께 일어나는 것은 아니다. 분실 기기 토큰을 교체하며 PAN을 유지하거나, 카드 재발급 후 기존 가맹점 토큰을 새 PAN에 연결할 수 있다. 실제 지원은 TSP/공급자 계약을 확인한다.

2023년 생명주기 예시는 변경 요청, TSP 갱신과 알림/확인을 구분한다. 계정 종료 후 다른 서비스나 거래에도 보관할 필요가 없어 토큰을 삭제하는 경우 TSP의 삭제 확인을 연결한다. PAN 교체 시 표시용 마지막 네 자리도 갱신한다. 가맹점 직접 요청자 예시를 PG 빌링키 API로 확대하지 않는다. 분실 기기의 원격 삭제 확인은 통신 가능을 전제하므로 TSP의 상태 변경과 구분한다.

## 빌링 등록과 정기 청구의 경계

토스페이먼츠의 카드 빌링은 등록 인증의 `authKey`를 교환해 빌링키를 받고, 서버에 구매자의 `customerKey`와 연결해 보관한다. 이후 승인에도 같은 customerKey를 사용한다. 등록 성공은 잔액/한도와 미래 청구 성공을 보장하지 않는다. 카드 재발급/만료 시 재등록, 구독 해지 시 미래 schedule 중단과 불필요한 키 삭제를 별도로 처리한다.

카드 정보를 직접 받는 API 방식은 구매자 인증과 데이터 보호를 상점이 직접 구현해야 한다. 등록창 방식도 해당 MID의 계약과 테스트/라이브 지원 조건을 확인한다. 샘플 카드로 시험 등록이 성공한 것을 운영의 전체 카드번호/본인인증 검증과 같은 결과로 보지 않는다.

2026-10-02 공식 연동 문서에는 퀵계좌이체 빌링도 있다. 카드만 지원한다는 일반 glossary 설명을 모든 자동결제의 현재 범위로 일반화하지 않는다. 퀵계좌이체는 별도 계약, `TRANSFER` 등록, 빌링키 승인과 `BILLING_DELETED` 알림을 가진다. 퀵계좌이체 탈퇴로 키가 무효화되는 상황을 청구 scheduler가 반영해야 한다.

## API 자격 증명은 토큰과 다른 권한이다

빌링키/고객 키와 결제 서버의 secret key를 분리한다. 토스페이먼츠 Basic 인증은 secret key 뒤의 콜론을 포함해 Base64 인코딩하는 형식이며 Base64는 암호화가 아니다. 키는 앱 bundle, URL, 요청 header 로그나 crash report에 노출하지 않는다.

IP 접근 정책은 secret key를 사용하는 서버의 outbound 공인 IP에 적용한다. 고객 브라우저 SDK, webhook inbound나 관리자 로그인에는 적용되지 않는다. NAT/외부 연동 솔루션의 실제 호출 IP와 테스트/라이브 설정을 구분한다. 키 유출 시 소스 삭제만으로 회수되지 않으므로 새 키 배포, 이전 키 폐기와 호출 이력 확인이 필요하다.

## PCI 범위는 실제 데이터 흐름으로 판단한다

PCI SSC FAQ 1326은 EMV 규격에 따라 정의되고 사용되는 결제 토큰이 TSP 토큰 데이터 환경 밖에 있을 때의 범위 제외를 설명한다. PAN을 함께 처리하거나 카드 데이터 환경에 연결된 시스템까지 모두 범위에서 빠진다는 뜻은 아니다. 단말의 EMV 지원 여부만으로 결제 토큰 사용 여부도 알 수 없다.

PCI SSC FAQ 1301은 PTS 승인 단말의 SRED 암호화 기능이 자동으로 사용된다고 보장하지 않는다고 설명한다. 실제 결제 애플리케이션과 연결 설정을 확인해야 한다. PCI 목록에 등재된 P2PE 솔루션은 범위 감소의 근거가 될 수 있지만 단말 제품 승인만으로 같은 결론을 낼 수 없다.

다음 경계를 그린 뒤 적용 범위를 판단한다.

1. PAN, 민감 인증 데이터와 토큰이 생성되는 위치.
2. 단말, 앱, 서버, 로그와 분석 도구를 통과하는 값.
3. 복호화하거나 원 자격 정보로 매핑할 수 있는 주체.
4. 카드 데이터 환경과 연결되는 시스템 및 관리 경로.
5. 실제 사용 솔루션의 인증 범위와 가맹점의 검증 의무.

토큰화, 암호화와 접근 통제는 함께 사용된다. 한 기술을 도입한 것만으로 모든 PCI 요구사항이 충족됐다고 선언하지 않는다.

## 외부 결제 UI도 가맹점 책임을 없애지 않는다

PCI SSC FAQ 1604(2026-06)는 결제 처리를 외부에 맡긴 SAQ A 전자상거래 페이지에도 ASV 외부 취약점 스캔 요구가 적용된다고 설명한다. Redirect와 iframe 모두 이 범위에 포함된다. 반면 FAQ 1588의 script 공격 관련 SAQ A 자격 조건은 외부 결제 form을 embedding하는 페이지에 적용되고, 단순 redirect와 전체 외주 결제의 조건은 다르다. 결제 UI 형태를 기준으로 확인할 항목을 분리한다.

SAQ는 준수 결과를 보고하는 도구이지 모든 구현의 요구사항을 임의로 제외하는 표가 아니다. FAQ 1331(2026-08)에 따라 매입사 등 compliance-accepting entity와 실제 검증/보고 범위를 확인한다. P2PE 목록도 특정 버전의 평가이며 전체 상점의 PCI 준수를 보장하지 않는다.

## 저장 가능한 정보의 이름만으로 판단하지 않는다

CVC/CVV, PIN/PIN block과 전체 track에 해당하는 민감 인증 데이터는 승인 이후 암호화해도 보관하지 않는다는 규칙이 있다. PAN이 없거나 고객이 저장에 동의했어도 가맹점의 구독/자동완성용 CVC 보관이 허용되지는 않는다. 반면 3DS 인증 값은 PCI DSS의 SAD와 동일 분류가 아니다. 3DS 제공자는 해당 역할의 PCI 3DS 보안 기준도 별도로 확인한다.

Masking은 화면에 감추는 것이고 truncation은 일부 자릿수를 영구 제거하는 것이다. 허용 truncation 형식은 카드 브랜드와 PAN 길이에 따라 다르며, 서로 다른 형태의 잘린 PAN을 결합해 복원할 수 있으면 범위 감소 근거가 약해진다. 원 PAN을 자르는 시스템과 연결된 경로는 별도로 검토한다.

토스페이먼츠의 최소 TLS 1.2 지원 조건과 PCI의 strong cryptography 판단도 다르다. PCI FAQ 1491(2026-07)은 특정 TLS 버전 하나를 보증하지 않고 알고리즘, cipher suite, 설정과 알려진 취약점을 함께 검토하도록 설명한다.

2024년 시크릿 키 글의 재발급 설명을 현재 정책으로 고정하지 않는다. 토스페이먼츠 2026-06 릴리즈는 셀프 재발급 시 기존 키가 만료 예정으로 표시되고 7일 안에 교체할 수 있다고 안내한다. 사고 대응에서는 허용 유예가 곧 유출 키 유지 필요라는 뜻이 아니므로 실제 재발급 화면과 폐기 시점을 확인한다. 보안 키 교체는 지급대행 본문 암호화와 webhook 검증에도 반영하고, 일반 서버뿐 아니라 취소/정산 배치와 외부 연동 경로까지 이전 키 사용이 없는지 확인한다.

## 카드 갱신과 지갑 인증 결과의 생명주기

Card Account Updater는 저장 카드의 PAN/유효기간 갱신을 받는 서비스이며 결제 승인이나 네트워크 토큰 발급과는 다르다. Evervault API는 PAN 기준으로 등록을 중복 처리하고, 갱신된 카드는 `replacement` 참조로 이어 준다. `closed`나 `invalid`에는 교체 카드가 없을 수 있으므로 갱신 알림만으로 청구를 계속하지 않는다. 카드 갱신 알림, 구독 청구와 고객 해지 상태를 따로 반영한다.

지갑의 인증 완료도 PSP 승인 완료를 대신하지 않는다. Evervault Apple Pay의 `process` callback은 암호화된 네트워크 토큰과 cryptogram 등을 서버에 전달해 PSP 처리를 완료하는 지점이다. SDK의 화면 상태, 지급수단 인증과 서버 승인 결과를 연결하고, BIN 추론의 funding과 사용자가 지갑에서 선택한 `paymentMethodType`이 다를 수 있음을 고려한다.

Evervault의 availability 값에서 `unavailable`은 브라우저가 사용 가능한 카드를 확인하지 못한 상태이고, `unsupported`와 다르다. 도메인 검증 파일은 최초 등록 후에도 제공해야 한다. Sandbox도 앱 생성 시점에 따라 실제 네트워크 토큰과 대체 테스트 카드 동작이 다르므로, 시험 응답을 현재 모든 앱의 동일한 계약으로 일반화하지 않는다.

## 샘플의 고객 식별과 빌링키 저장은 운영 계약이 아니다

토스페이먼츠 Express 샘플은 브랜드페이 access-token 발급 전에 요청 주체와 `customerKey`가 같은 고객인지 검증하라는 주석을 둔다. `customerKey`를 알고 있거나 브라우저에서 전달했다는 사실은 호출 권한의 증명이 아니다. 운영에서는 인증된 내부 고객, 공급자 고객 키와 빌링키의 연결을 서버에서 검증한다.

샘플의 Express `Map`, Django 전역 dict와 Spring `HashMap`은 빌링키의 영속 저장을 제공하지 않는다. PHP 샘플의 빈 배열도 요청마다 새로 만들어지므로 다음 청구 요청까지 보관하지 못한다. 고객 식별자를 빌링키 대신 승인 URL에 넣거나 발급 응답을 화면에 표시하는 예시를 운영 저장 설계로 복사하지 않는다. 서버 시크릿과 클라이언트 키를 분리하고, 저장/폐기, 구독 해지와 키 유실의 복구는 실제 시스템에 구현한다. 샘플을 읽은 것은 그런 운영 조건이나 실제 청구 성공을 검증한 것이 아니다.

## 출처

- [EMVCo, Payment Tokenisation A Guide to Use Cases v2.2.1](https://www.emvco.com/wp-content/uploads/2023/03/EMVCo-Payment-Tokenisation-A-Guide-To-Use-Cases-v2.2.1.pdf) — 2023년 1월 지침 2~12장, 현재 v2.3 가이드의 검증을 대신하지 않음
- [토스페이먼츠, 고객 검증과 빌링키 Map 샘플](https://github.com/tosspayments/tosspayments-sample/blob/8d0df11d14dadfe355050bdc9ba38618f6a9c028/express-react/server.js)
- [토스페이먼츠, PHP 빌링키 저장 샘플](https://github.com/tosspayments/tosspayments-sample/blob/8d0df11d14dadfe355050bdc9ba38618f6a9c028/php-javascript/index.php)
- [토스페이먼츠, Django 빌링키 저장 샘플](https://github.com/tosspayments/tosspayments-sample/blob/8d0df11d14dadfe355050bdc9ba38618f6a9c028/django-javascript/payments/views.py)
- [토스페이먼츠, Spring 빌링키 저장 샘플](https://github.com/tosspayments/tosspayments-sample/blob/8d0df11d14dadfe355050bdc9ba38618f6a9c028/spring-javascript/src/main/java/com/example/demo/controller/PaymentController.java)
- [Evervault, Card Account Updater](https://docs.evervault.com/cards/card-account-updater)
- [Evervault, Apple Pay](https://docs.evervault.com/payments/apple-pay) — 해당 중계 SDK 계약
- [토스페이먼츠, API 키와 재발급](https://docs.tosspayments.com/reference/using-api/api-keys)
- [PCI SSC, FAQ 1604: SAQ A ASV scans](https://www.pcisecuritystandards.org/faqs/1604/)
- [PCI SSC, FAQ 1588: SAQ A scripts](https://www.pcisecuritystandards.org/faqs/1588/)
- [PCI SSC, FAQ 1331: SAQ applicability](https://www.pcisecuritystandards.org/faqs/1331/)
- [PCI SSC, FAQ 1533: SAD without PAN](https://www.pcisecuritystandards.org/faqs/1533/)
- [PCI SSC, FAQ 1574: consumer-device CVC storage](https://www.pcisecuritystandards.org/faqs/1574/)
- [PCI SSC, FAQ 1603: 3DS authentication values](https://www.pcisecuritystandards.org/faqs/1603/)
- [PCI SSC, FAQ 1091: PAN truncation](https://www.pcisecuritystandards.org/faqs/1091/)
- [PCI SSC, FAQ 1117: truncated PAN scope](https://www.pcisecuritystandards.org/faqs/1117/)
- [PCI SSC, FAQ 1491: TLS](https://www.pcisecuritystandards.org/faqs/1491/)
- [토스페이먼츠, 보안](https://docs.tosspayments.com/reference/using-api/security)
- [토스페이먼츠, 릴리즈 노트](https://docs.tosspayments.com/resources/release-note)
- [EMVCo, Payment Tokenisation Quick Resource Guide (2024)](https://www.emvco.com/wp-content/uploads/2024/10/FINAL_TOKENISATION-QRG-1.pdf)
- [토스페이먼츠, API 키 접근 정책](https://docs.tosspayments.com/reference/using-api/api-key-access-policy)
- [토스페이먼츠, 인증과 헤더](https://docs.tosspayments.com/reference/using-api/authorization)
- [토스페이먼츠, 퀵계좌이체 자동결제](https://docs.tosspayments.com/guides/v2/billing/integration-quick)
- [토스페이먼츠, 자동결제 API 연동](https://docs.tosspayments.com/guides/v2/billing/integration-api)
- [토스페이먼츠, 카드 자동결제 등록창](https://docs.tosspayments.com/guides/v2/billing/integration)
- [EMVCo, Payment Tokenisation](https://www.emvco.com/emv-technologies/payment-tokenisation/)
- [PCI SSC, FAQ 1326: EMV payment tokens and PCI DSS](https://www.pcisecuritystandards.org/faqs/1326/)
- [PCI SSC, FAQ 1301: SRED and scope reduction](https://www.pcisecuritystandards.org/faqs/1301/)
- [토스페이먼츠, 자동결제 연동](https://docs.tosspayments.com/guides/v2/billing)
- [카드번호가 사라지는 자리 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-12.html)
- [What are Network Tokens and how do they work? — Evervault](https://evervault.com/blog/what-are-network-tokens-and-how-do-they-work)

## 관련 문서

- [[Payment-Service]]
- [[Payment-System-Principles]]
- [[Payment-Entry-Protocols]]
