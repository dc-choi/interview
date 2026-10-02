---
tags: [payment, emv, nfc, qr, iso8583]
status: done
verified_at: 2026-10-02
category: "Reliability"
aliases: ["결제 입력 프로토콜"]
---

# 결제 입력 프로토콜

결제 입력은 물리적 통신, 자격 정보 표현, 거래 메시지와 승인 판단이 이어지는 과정이다. NFC를 읽었다거나 QR을 스캔했다는 사실만으로 돈이 이동하거나 승인된 것은 아니다.

## 카드 입력과 EMV

자기 띠는 저장된 데이터를 읽는 방식이고, EMV 칩은 단말과 상호 작용하며 거래별 동적 데이터를 만들 수 있다. 단말에서 보이는 카드번호가 같아도 거래 인증 방식은 다르다.

| 용어 | 역할 |
|---|---|
| ARQC | 온라인 승인 요청에 사용하는 거래 암호문 |
| ARPC | 발급사 응답을 카드가 확인하는 데 사용하는 암호문 |
| TC | 카드가 거래 승인 결과를 나타내는 암호문 |
| AAC | 카드가 거래 거절 결과를 나타내는 암호문 |
| ATC | 카드의 거래 카운터로 재사용 탐지 등에 활용 |

암호문의 의미와 생성 조건은 카드/단말 프로파일에 따른다. 거래 MAC과 공개키 전자서명은 다른 기법이므로 모든 동적 인증을 하나의 서명 알고리즘으로 설명하지 않는다.

SDA, DDA, CDA는 오프라인 데이터 인증 방식이다. 카드 데이터나 카드 진위의 확인과 발급사의 신용 한도 승인 판단은 다른 단계다. 칩 인증이 성공했다고 가맹점 지급이 보장되는 것은 아니다. 오프라인 거래 수용도 카드, 단말과 매입사의 정책을 함께 적용한다.

EMV 단말 승인에는 물리적 인터페이스, 결제 커널과 실제 처리 경로의 검증이 구분된다. 특정 인증 하나를 받았다는 이유로 국내 등록, 모든 네트워크와 지갑 지원까지 완료됐다고 판단하지 않는다.

EMV 칩의 거래별 cryptogram과 PAN 대체 토큰은 다른 기능이다. 모든 EMV 칩 거래가 PAN을 보내지 않는다거나 PIN만 사용한다고 단정하지 않는다. CVM은 PIN, 서명, 기기 인증 또는 no-CVM 등 카드/단말/네트워크 조건으로 선택될 수 있다. 위조 위험 감소도 모든 거래 위조를 불가능하게 한다는 보장은 아니다.

## NFC, MST와 지갑

NFC는 가까운 거리에서 데이터를 교환하는 통신 기술이고, EMV 비접촉 결제는 그 위의 결제 규칙이다. 모바일 지갑은 인증, 자격 정보와 토큰을 관리하는 서비스다. 단말의 NFC 하드웨어, 결제 커널, 매입사 설정과 지갑 지원이 함께 맞아야 한다.

MST는 자기 띠 리더가 읽을 수 있는 신호를 전달하는 방식이다. 지갑의 토큰화와 인증 보안은 별도 층이다. 지원 여부는 지갑, 단말 모델, 지역과 시점에 따라 달라지므로 과거의 MST/NFC 지원표를 현재 제품 정책으로 사용하지 않는다.

국내 교통카드 지원 같은 서비스 정책도 당시 조건을 붙여 읽는다. 통신 방식이 같아도 일반 매장 결제와 교통 시스템의 인증, 후불 처리와 사업자 계약은 다를 수 있다.

## QR은 자금 이동 경로를 정하지 않는다

| 방식 | 제시와 스캔 | 설계에서 확인할 것 |
|---|---|---|
| MPM | 가맹점 제시, 소비자 스캔 | 가맹점 식별, 금액 입력/고정, 위변조 |
| CPM | 소비자 제시, 가맹점 스캔 | 짧은 유효기간, 재사용과 자격 정보 보호 |
| 정적 QR | 같은 코드 반복 사용 | 주문/금액과 실제 입금의 연결 |
| 동적 QR | 거래별 코드 생성 | 만료, 중복 처리와 상태 조회 |

QR 뒤의 결제는 카드, 계좌나 선불 방식일 수 있다. EMVCo QR 규격도 QR 데이터 표현을 다루며 후속 승인 메시지 전체를 표준화하지 않는다. 일반 카메라가 모든 결제 QR을 처리한다고 가정하지 않는다.

계좌 송금용 QR의 고객 완료 화면은 가맹점 계좌 입금 확인과 다르다. 수동 확인인지 은행/사업자의 검증 결과인지 구분하고 주문별 금액과 입금 식별자를 대사한다. 동일 금액의 여러 주문을 금액만으로 매칭하면 오인할 수 있다.

QR을 표시하는 시각 기호도 역할이 다르다. EMVCo의 2018 지침에서 QR Payment Mark는 결제 수용을 나타내고, QR Scan Icon은 앱에서 스캔을 시작하는 조작을 나타낸다. Scan Icon을 매장의 결제 수용 표시로 바꾸어 쓰지 않는다. 두 기호 모두 실제 승인 결과나 데이터 규격 준수의 증거는 아니다.

해당 지침은 원형, 방향, 대비와 여백을 보존하고 문구가 기호를 가리지 않도록 요구한다. 일반 최소 높이는 7mm, 제한된 작은 매체의 예외는 5mm이며 OS 상태 표시줄은 별도 예외다. 기본 여백도 Mark는 모서리 사각형 높이, Scan Icon은 전체 높이의 25%로 다르다. 공식 artwork를 사용할 권한, 예외 사용 허가와 실제 기기의 상호 운용/성능 검증을 함께 확인한다. 2018 자료의 수치를 현재 변경 여부 확인 없이 새 제품의 최종 디자인 계약으로 확정하지 않는다.

## 승인 메시지와 ISO 8583

ISO 8583 계열 메시지는 메시지 유형, 비트맵과 데이터 요소로 금융 거래를 표현한다. 학습 예시로 `0100/0110` 승인 요청/응답, `0400/0410` reversal 요청/응답, `0800` 네트워크 관리 등이 쓰인다. 버전과 네트워크 프로파일에 따라 의미가 달라지므로 실제 VAN 명세가 정본이다.

STAN(DE11) 같은 추적 번호는 제한된 자릿수로 순환할 수 있다. 번호 하나를 전역 멱등키로 사용하지 않고 기관, 단말, 날짜와 원거래 참조를 함께 사용한다. DE90 같은 원거래 참조 필드의 구성도 연동 명세로 확인한다.

HTTP 상태와 금융 업무 응답 코드는 다른 층이다. 승인 거절과 전송 오류를 구분하며 국가, 카드 네트워크와 발급사별 응답 코드 차이를 반영한다. 특정 기관의 코드 표를 모든 사업자에게 적용하지 않는다.

## 메시지 해석과 보안 검증의 경계

ISO 8583 구현 예시의 바이트 파서는 전송 frame과 메시지 해석을 분리한다. TCP 읽기 한 번을 메시지 한 개로 간주하지 않고, 해당 host 계약의 길이 prefix, bitmap 표현, 필드별 고정/가변 길이와 BCD/ASCII 인코딩을 확인한다. LLVAR 길이의 단위도 숫자 개수, 문자 또는 바이트 중 무엇인지 명세로 정해야 한다. 블로그의 샘플 필드 표를 모든 VAN의 표준 구현으로 복사하지 않는다.

SDA는 발급사가 서명한 정적 데이터의 진위와 무결성을 확인하지만 카드별 거래의 새로움까지 입증하지 않는다. 인증 실패 시 검증을 생략하는 fallback과 CVM 선택도 보안 검토 대상이다. ETH 연구진의 2021/2023년 사례는 암호 알고리즘 자체가 아니라 인증되지 않은 프로토콜 필드와 실패 경로가 PIN 우회로 이어질 수 있음을 보여준다. 당시 대상과 전제의 연구이며 현재 모든 카드가 취약하다는 결론은 아니다. 연구 사이트는 Mastercard brand-mixup 방어가 배포됐다고 명시한다.

토스페이먼츠 기관 코드도 금융결제원의 세 자리 공식 코드와 다르다. 카드의 요청 코드와 응답 코드가 같지 않을 수 있다. 예를 들어 우리카드의 `W1`은 응답 전용이고 요청에는 `33` 등을 사용한다. 코드 길이, 발급/매입 역할과 방향을 보존하며 다른 PG/VAN의 숫자표로 대체하지 않는다.

## 칩 규격과 전체 결제 시스템의 승인 범위

2014 Chip Technology guide와 2017 Contact Chip FAQ는 EMV를 카드-단말 상호 운용의 규격으로 설명한다. 카드 내부의 발급사 위험 정책, 단말-호스트 인터페이스와 결제망의 운영/책임 규칙은 추가 계약이 필요하다. EMVCo 규격을 읽었다고 ISO 8583 호스트 전문이나 특정 네트워크 제품의 전체 구현을 확인한 것은 아니다.

EMV Level 1은 카드와 reader의 물리/통신 인터페이스, Level 2는 EMV 처리 kernel을 확인한다. 단말의 화면/프린터, 매입사 전문 조립과 전체 POS 업무는 같은 인증 범위가 아니다. 네트워크별 승인, 실제 카드/단말 조합과 예외/망취소 시험도 구분한다. 이 구분은 역사 자료의 구조 설명이며 현재 제품의 승인 유효 기간을 보장하지 않는다.

CVM, offline data authentication과 거래 승인도 독립적이다. PIN을 카드에서 확인하는 offline PIN이 온라인 승인 거래에서도 사용될 수 있으며, SDA의 정적 데이터 무결성과 매 거래의 진위/신선성은 다르다. DDA와 CDA도 단말 정책, 카드 프로파일과 발급사 처리까지 확인해야 한다. 2011 CVM downgrade 연구의 시험 결과를 모든 현재 EMV 카드의 취약성으로 일반화하지 않는다.

미국의 2015 fraud liability shift 자료는 위조 카드와 분실/도난, PIN 지원, fallback, contactless와 국경 간 거래 조건을 따로 둔다. 이를 한국 가맹점의 현재 책임 규칙이나 모든 네트워크의 동일한 liability shift로 적용하지 않는다.

## 커널의 결과와 POS의 승인 결과를 연결한다

2016년 2월 Kernel 4 v2.6은 American Express 계열을 포함한 해당 비접촉 애플리케이션의 역사 규격이다. 모든 현재 EMV 커널에 그대로 적용하지 않는다. 이 규격의 partial online은 첫 `GENERATE AC` 뒤 카드와 reader의 상호 작용을 끝내고 발급사 응답으로 거래 결과를 정한다. 두 번째 `GENERATE AC`를 보내는 full online은 지원하지 않는다. 카드 제거 안내나 `Online Request`는 최종 승인 표시와 다르다.

단말이 요청한 TC/ARQC/AAC와 카드가 실제 반환한 cryptogram도 구분한다. 카드는 자체 위험 관리로 단말의 요청을 바꿀 수 있다. 이 버전에서 ARQC를 받았어도 offline-only reader는 거절하며, 필요한 CDA 검증이 실패하면 거절한다. POS는 커널의 `Try Again`, `Try Another Interface`, `End Application`과 업무상 승인/거절을 서로 다른 결과로 처리해야 한다. 모바일 CVM 재시도도 새 결제를 무한히 시작하는 절차가 아니며, `6984`를 재시작 뒤 다시 받으면 종료하는 계약이다.

커널의 데이터 검증은 필수 데이터 누락, TLV 형식 오류와 알려지지 않은 선택 데이터의 처리가 다르다. Kernel 4는 DOL 처리 등의 예외를 제외하면 모르는 data object를 무시하지만 필수 데이터가 없으면 종료한다. 데이터 값을 잘못 읽었다는 이유로 단말이 멈추게 해서는 안 된다. 호환성을 위해 모르는 값을 무시하는 규칙을 필수 거래 데이터의 누락까지 허용하는 규칙으로 넓히지 않는다.

단말과 카드 사이의 일시적 데이터도 승인 호스트에 그대로 복사하지 않는다. 이 버전은 특정 PDOL 조건에서 `9F35`에 reader capability를 합친 modified terminal type을 카드에 보내지만, 매입사 승인/매출 전문에는 원래 terminal type을 보낸다. 비접촉 mag-stripe mode도 실물 자기 띠 읽기와 같지 않다. ATC와 AC를 확인한 뒤 생성한 pseudo track을 전송하며, 필요한 승인/청산 필드는 별도 네트워크 계약을 따른다.

## 출처

- [EMVCo, QR Payment Mark Reproduction Requirements v1.1](https://www.emvco.com/wp-content/uploads/2022/09/EMV-QR-Payment-Mark-Reproduction-Requirements-v1.1-April-2018-Final.pdf) — 2018년 4월 지침
- [EMVCo, QR Scan Icon Reproduction Guidelines v1.0](https://www.emvco.com/wp-content/uploads/2022/10/EMV%C2%AE-QR-Scan-Icon-Reproduction-Requirements-v1.0-May-2018-Final.docx.pdf) — 2018년 5월 지침의 이동된 공식 URL
- [EMVCo, Contactless Book C-4 Kernel 4 v2.6](https://web.archive.org/web/20210615151656/https://www.emvco.com/wp-content/uploads/2017/05/C-4_Kernel_4_v2.6_20160512101635327.pdf) — 2016년 2월 규격, 2/4/5/11/12장과 부록 A
- [EMVCo, A Guide to EMV Chip Technology v2.0](https://web.archive.org/web/20210216223405/https://www.emvco.com/wp-content/uploads/2017/05/A_Guide_to_EMV_Chip_Technology_v2.0_20141120122132753.pdf) — 2014 자료의 아카이브
- [EMVCo, Contact Chip and Biometrics FAQ](https://web.archive.org/web/20210615150532/https://www.emvco.com/wp-content/uploads/2017/03/EMVCo-Website-Content-2.1-Contact-Portal-plus-Biometric-FAQ_v2.pdf) — 2017 자료의 아카이브
- [EMV Migration Forum, Understanding the 2015 U.S. Fraud Liability Shifts](https://web.archive.org/web/20150919095559/http://www.emv-connection.com/downloads/2015/05/EMF-Liability-Shift-Document-FINAL5-052715.pdf) — 2015 미국 조건
- [Inverse Path, CVM Downgrade Attack](https://web.archive.org/web/20151019074927/http://dev.inversepath.com/download/emv/blackhat_df-whitepaper.txt) — 2011 시험 조건과 연구자의 미시험 추론을 구분
- [토스페이먼츠, 기관 코드](https://docs.tosspayments.com/codes/org-codes)
- [Byte-Level ISO 8583 Codec — Pratik Dhanave](https://pratikdhanave.com/blog/posts/fintech-iso-8583-codec.html) — 구현 학습 예시, 네트워크 규격의 정본 아님
- [OpenSCDP, Static Data Authentication](https://www.openscdp.org/scripts/tutorial/emv/SDA.html) — 정적 데이터 인증 학습 예시
- [ETH 연구진, EMV protocol research](https://emvrace.github.io/) — 2021/2023년 연구와 대상 조건
- [애플, 구글페이가 채택한 EMV — 바이라인네트워크](https://byline.network/2023/08/%EA%B7%B8%EA%B2%8C-%EB%AD%94%EA%B0%80%EC%9A%94-%EC%95%A0%ED%94%8C%C2%B7%EA%B5%AC%EA%B8%80%ED%8E%98%EC%9D%B4%EA%B0%80-%EC%B1%84%ED%83%9D%ED%95%9C-emv/)
- [EMVCo, Contact Chip](https://www.emvco.com/emv-technologies/emv-contact-chip/)
- [EMVCo, Contactless Chip](https://www.emvco.com/emv-technologies/emv-contactless-chip/)
- [EMV Migration Forum, Standardization of Terminology v2.0](https://www.emv-connection.com/downloads/2013/02/EMV-Standard-Terminology-V2-012814.pdf)
- [EMVCo, QR Codes](https://www.emvco.com/emv-technologies/qr-codes/)
- [Adyen, Offline payments](https://docs.adyen.com/point-of-sale/offline-payment)
- [카드가 계산을 시작하는 순간 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-08.html)
- [꽂지 않는 결제 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-09.html)
- [QR이라는 봉투 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-10.html)
- [단말기 뒤의 회사 — 결제 도메인 학습](https://mihyekang.github.io/study/payment/day-03.html)
- [ISO 8583, 전 세계 결제를 이어주는 공통 언어 — Connieya](https://connieya.github.io/understanding-iso-8583/)
- [헷갈리는 비접촉 결제 기술 용어 간단하게 훑어보기 — LYnLab](https://lynlab.co.kr/blog/contactless-payments) — NFC, EMV와 지갑을 구분하는 참고, 2023년 지원 정보는 현재 정책으로 사용하지 않음
- [이제 토스 포스로 계좌이체도 더 쉽고 간편하게! — 토스플레이스](https://tossplace.com/story/qr-transfer) — 송금 QR과 가맹점 입금 확인의 구분

## 관련 문서

- [[Payment-Participants-and-Lifecycle]]
- [[Payment-Tokenisation-and-PCI-Scope]]
- [[Payment-Unknown-Outcome-and-Reversal]]
- [[POS-Offline-and-Integration]]
