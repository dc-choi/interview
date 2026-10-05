---
tags: [business, commerce, mobile-app, app-store, google-play, solo-business]
status: done
verified_at: 2026-10-06
category: "비즈니스&제품(Business&Product)"
aliases: ["App Store Launch Checklist", "앱 스토어 첫 출시 준비", "1인 개발자 앱 출시 체크리스트"]
---

# 앱 스토어 첫 출시 준비

## 정의와 mental model

앱의 첫 출시는 코드 완성이 아니라 계정, 판매 계약, 정산 정보, 스토어 정책 문서와 국내 판매자 정보를 한 번 끝까지 통과하는 작업이다. 계정 확인, 테스트 기간과 심사처럼 개발자가 줄일 수 없는 대기 시간이 있으므로 출시일에서 거꾸로 일정을 잡는다. 아래는 2026-10-06에 Apple과 Google의 공식 도움말, 게임산업법 조문을 대조한 내용이며 스토어 정책과 법령은 출시 직전에 다시 확인한다. 수익 모델과 수수료 조건은 [[App-Monetization-Models|앱 수익 모델]]이 다룬다.

## 단계

1. **계정 유형을 정한다.**
   - Apple Developer Program은 개인(1인 사업자 포함)과 조직으로 나뉜다. Apple 안내는 1인 사업자(sole proprietor)는 개인으로 가입해야 하고 App Store 판매자명에 법적 실명이 표시된다고 적는다. 조직은 계약을 맺을 수 있는 법인이어야 하고 상호, 가공의 사업체나 지점으로는 가입할 수 없으며, D-U-N-S 번호, 계약 권한, 조직 도메인의 이메일과 공개 웹사이트를 확인받는다. 조직으로 가입하면 법인명이 판매자명이 된다. 연회비는 99달러이며 지역마다 다를 수 있고 가입 때 지역 통화로 표시된다.
   - 법인격이 없는 국내 개인사업자는 Apple에서 개인에 해당하므로, 상호를 판매자명으로 쓰려면 법인으로 조직 가입을 해야 한다는 점을 출시 전에 감안한다.
   - Google Play Console은 개인 용도(학생, 취미, 아마추어 개발자)면 개인 계정, 조직이나 사업(상업, 산업, 전문, 정부 활동)이면 조직 계정을 고르게 안내한다. 두 유형 모두 같은 기능을 쓰고 결제 프로필로 수익화할 수 있으며, 조직 계정은 D-U-N-S 번호가 필요하다(Dun & Bradstreet 발급은 무료). 금융, 일부 건강, VPN, 정부 앱은 조직 계정으로 등록하게 한다. 등록비는 1회 25달러이며 계정을 만들 때 신원 확인을 거친다. 국내 개발자가 2023-08-31 이후 만든 개인 계정은 개발자 전화번호를 인증해야 하고 그 번호가 Google Play에 표시된다.
   - 상업 활동을 하는 국내 개인사업자가 D-U-N-S 번호로 Google 조직 계정을 열 수 있는지는 도움말에 따로 적혀 있지 않으므로 등록 전에 확인한다.
2. **테스트와 심사 기간을 일정에 넣는다.** Google 도움말은 2023-11-13 이후 만든 개인 계정에 12명 이상이 14일 이상 연속으로 참여한 비공개 테스트를 요구하고, 그 뒤 프로덕션 접근을 신청하게 한다. 신청 심사는 보통 7일 이내지만 더 걸릴 수 있다([[App-Monetization-Models|앱 수익 모델의 스토어 조건]]). Apple TestFlight의 내부와 외부 테스트, Beta App Review 조건은 [[Expo-TestFlight-Distribution|TestFlight 배포]]를 따른다.
3. **유료 앱이나 인앱결제를 붙이면 판매 계약과 정산 정보를 넣는다.**
   - Apple은 유료 앱과 인앱결제 대금을 받으려면 Paid Apps Agreement에 동의하고 미국 세금 양식을 내며 은행 정보를 입력하게 한다. 미국 밖 개발자는 질문에 답하면 W-8BEN, W-8BEN-E 또는 W-8ECI 중 맞는 양식으로 안내된다. 미국 세금 정보는 제출 뒤 App Store Connect에서 고칠 수 없어 수정은 Apple에 문의한다.
   - 국내 개발자는 Apple에 한국 세금 정보로 사업자등록번호와 90일 안에 발급한 영문 사업자등록증명을 낸다(비영리 단체는 국세청 고유번호와 고유번호증). 최신 정보가 없으면 수익금 지급이 늦어지고 전자세금계산서 대신 현금영수증이 발급될 수 있다. 한국 세금 정보는 검증 대기 중이 아니면 App Store Connect에서 고칠 수 있다.
   - Google은 Play Console 결제 설정에서 결제 프로필을 만든다. 결제 프로필의 법적 상호는 고객과 영수증에 표시되고, 웹사이트, 상품 범주, 고객 지원 이메일과 카드 명세서 표시명 같은 공개 사업 정보도 넣는다. 은행 계좌는 1달러 미만의 소액 입금(처리에 최대 3영업일)으로 확인한다.
   - 국내 개발자는 Google Play에서 한국 고객의 유료 앱과 인앱 구매에 대한 부가가치세를 직접 판단하고 납부해야 한다. 결제 프로필의 South Korea tax info에 사업자등록번호를 넣지 않으면 Google이 청구하는 서비스 수수료에 10% 부가가치세를 부과해 납부한다([[VAT-for-Business|사업자의 부가가치세]]).
4. **정책 문서와 개인정보 양식을 준비한다.** 두 스토어 모두 모든 앱에 개인정보처리방침을 요구한다. Apple은 App Store Connect 메타데이터와 앱 안의 쉽게 찾을 수 있는 위치에 링크를 두게 하고, 방침에 수집 데이터와 용도, 데이터를 공유하는 제3자가 같거나 동등한 수준으로 보호한다는 확인, 보관과 삭제 정책, 동의 철회와 삭제 요청 방법을 담게 한다. Google은 Play Console의 지정 필드와 앱 안(링크나 본문)에 두게 한다. 데이터를 수집하지 않는 앱도 Google의 Data safety 양식을 작성해야 하고, Apple은 새 앱과 업데이트를 제출할 때 App Privacy 정보를 요구한다. 계정을 만들 수 있는 앱은 Apple에서 앱 안 계정 삭제를 제공해야 한다(5.1.1(v)). Google은 앱 안 삭제 경로나 웹 삭제 페이지로 가는 앱 안 링크를 두고, 계정과 데이터 삭제를 요청할 웹 링크를 Data safety 양식에 등록하게 한다. 앱 밖에서 만들고 운영하는 계정은 Google 요건의 대상이 아니다. Apple은 앱과 지원 URL에 쉽게 연락할 방법을 넣도록 요구한다. 국내 개인정보 처리 기준은 [[Privacy-Operations-for-Small-Business|소규모 사업자의 개인정보 운영]]을, 스토어 등록 정보의 언어 설정은 [[App-Store-Listing-Localization|앱스토어 등록 정보의 기본 언어와 현지화]]를 본다.
5. **로그인 수단을 정한다.** 주 계정을 Google 로그인 같은 서드파티나 소셜 로그인으로 만들게 하면 Apple은 동등한 로그인 수단을 함께 제공하게 한다. 그 수단은 수집 데이터를 이름과 이메일로 제한하고, 이메일을 숨길 수 있으며, 동의 없이 광고 목적으로 앱 사용을 수집하지 않아야 한다(App Review Guidelines 4.8). 자체 계정만 쓰는 앱, 기존 교육이나 기업 계정으로만 로그인하는 앱 등은 예외다.
6. **국내 판매자 정보를 넣는다.** Apple은 전자상거래법에 따라 한국 기반 개발자의 판매자 정보를 받아 App Store 제품 페이지에 표시한다. 개인은 이메일과 사업자등록번호, 조직은 상호, 이메일, 전화번호와 사업자등록번호이며, 사업자등록번호는 Paid Apps Agreement를 맺었으면 한국 세금 양식의 값이 자동으로 표시되고 유료 콘텐츠가 없으면 원할 때 넣는다. Google은 유료 앱이나 인앱결제를 배포하는 국내 사업자에게 사업자등록번호, 통신판매업 신고번호와 신고 기관을 받는다. 2023-08-31 전에 만든 계정은 개발자 페이지에 넣은 이 정보가 한국 사용자에게만 앱 등록 정보에 보이고, 이후 만든 계정은 About you 페이지에 넣는다. 그래서 수익을 낼 계획이면 사업자등록과 과세유형([[Business-Tax-Setup|사업자 세무 초기 설정]])을 먼저 정하고, 통신판매업 신고 대상과 면제 기준은 [[Marketplace-Seller-Launch|오픈마켓 셀러 첫 상품 출시]]로 확인한다. 신고가 면제된 경우의 입력 방법은 출시 전에 스토어에 확인한다.

## 게임을 낼 때 추가로 확인할 것

- **등급분류:** 게임물을 유통하거나 이용에 제공할 목적으로 제작, 배급하려면 그 전에 게임물관리위원회나 문화체육관광부장관이 지정한 자체등급분류사업자에게서 등급분류를 받아야 한다(게임산업법 제21조 제1항, 제21조의2). 자체등급분류사업자는 청소년이용불가 기준에 해당하는 게임물과 청소년게임제공업, 일반게임제공업에 제공되는 게임물은 등급분류할 수 없다(제21조의2 제3항). Google Play도 19세 미만에게 맞지 않는 게임은 게임물관리위원회의 등급분류 증명서가 있어야 출시할 수 있다고 안내한다. 자체등급분류사업자가 아닌 경로로 배포할 때도 위원회의 등급분류를 확인한다.
- **예외의 범위:** 영리를 목적으로 하지 않는 게임물 중 대통령령으로 정한 것은 등급분류 대상에서 빠지지만, 청소년이용불가 기준에 해당하는 내용이 있으면 예외가 적용되지 않는다(제21조 제1항 제4호). 무료로 배포한다는 사실만으로 이 예외에 해당한다고 보지 말고 시행령 요건을 확인한다. 개발 중 성능, 안전성과 이용자 만족도를 평가하는 시험용 게임물도 대통령령이 정한 대상, 기준과 절차를 따를 때만 빠지므로(제21조 제1항 제3호), 비공개 테스트 배포가 이 예외에 해당하는지 확인한다.
- **확률형 아이템:** Google Play는 국가와 관계없이 구매로 무작위 가상 아이템을 받는 장치의 확률을 공개하게 한다. 한국 법의 확률형 아이템 정보 표시 의무는 2024-03-22부터 시행됐고, 문화체육관광부 발표에 따르면 게임물을 제작, 배급 또는 제공하는 자 모두가 3년 동안 연평균 매출액 1억원 이하인 중소기업이면 표시 의무에서 빠진다. 스토어 정책과 법 의무를 나눠 확인한다.
- **게임제작업 등록:** 게임제작업이나 게임배급업을 하려면 특별자치시장, 특별자치도지사, 시장, 군수 또는 구청장에게 등록한다(제25조 제1항). 국가나 지방자치단체의 제작, 교육기관의 자체 교육용 제작, 공공기관의 홍보용 제작 등은 등록 없이 할 수 있다.

## 트레이드오프와 한계

- 개인 계정은 준비 서류가 적지만 공개되는 정보가 있다. Apple은 판매자명에 실명을 쓰고, Google 개인 계정은 법적 이름, 국가와 개발자 이메일을 표시하며 수익화하면 주소 전체를 표시한다. 국내 개발자의 신규 Google 개인 계정은 전화번호도 표시되고 테스트 기간이 붙는다.
- 조직 계정은 Apple에서 법인, D-U-N-S 번호와 웹사이트가, Google에서 D-U-N-S 번호가 필요하다. Google 조직 계정은 법적 이름, 주소, 개발자 이메일과 전화번호를, Apple 한국 조직 계정은 상호, 이메일과 전화번호를 공개한다.
- 스토어 정책, 등록비, 테스트 요건과 심사 기간은 바뀔 수 있다. 이 문서는 2026-10-06 공식 도움말 기준이다.
- 등급분류, 신고와 세금 판단은 앱의 수익 구조와 배포 경로에 따라 달라지므로 이 목록만으로 의무 여부를 확정하지 않는다.

## 적용 점검

- [ ] 개인과 조직 중 계정 유형을 정하고, 판매자명과 공개되는 연락처, 필요한 서류를 확인했는가
- [ ] Google 비공개 테스트와 프로덕션 신청 심사, Apple 심사를 출시 일정에 넣었는가
- [ ] 판매 계약, 미국과 한국 세금 정보, 은행 계좌 확인과 사업자등록번호 입력을 마쳤는가
- [ ] 개인정보처리방침, Data safety와 App Privacy, 계정 삭제 경로와 연락 수단을 준비했는가
- [ ] 소셜 로그인을 쓰면 Apple 4.8의 동등한 로그인 수단을 넣었는가
- [ ] 두 스토어에 국내 판매자 정보(사업자등록번호, 통신판매업 신고번호)를 넣었는가
- [ ] 게임이면 등급분류 경로, 시험용 배포와 확률형 아이템 표시, 게임제작업 등록 대상인지 확인했는가

## 출처

- [Apple Developer, Enrollment](https://developer.apple.com/programs/enroll/)
- [Apple Developer, Program enrollment support](https://developer.apple.com/support/enrollment/)
- [Apple Developer, Provide tax information](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information)
- [Apple Developer, Manage Korea compliance information](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-korea-compliance-information)
- [Apple Developer, App privacy details on the App Store](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple Developer, App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 1.5, 4.8, 5.1.1(i), 5.1.1(v)
- [Play Console Help, Get started with Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- [Play Console Help, Choose a developer account type](https://support.google.com/googleplay/android-developer/answer/13634885?hl=en)
- [Play Console Help, Required information to create a Play Console developer account](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en)
- [Play Console Help, App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Play Console Help, Requirements for distributing apps in specific countries/regions](https://support.google.com/googleplay/android-developer/answer/6223646?hl=en)
- [Play Console Help, Additional contact information required for Korean app developers](https://support.google.com/googleplay/android-developer/answer/3255733?hl=en)
- [Play Console Help, Create a payments profile](https://support.google.com/googleplay/android-developer/answer/7161426?hl=en)
- [Play Console Help, Verify bank account](https://support.google.com/googleplay/android-developer/answer/7161378?hl=en)
- [Play Console Help, Tax rates and value-added tax (VAT)](https://support.google.com/googleplay/android-developer/answer/138000?hl=en)
- [Play Console Help, User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
- [Play Console Help, Provide information for Google Play's Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Play Console Help, Understanding Google Play's app account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [게임 확률형 아이템 정보, 3월 22일부터 투명하게 공개된다 — 대한민국 정책브리핑](https://www.korea.kr/news/policyNewsView.do?newsId=148924297)
- [국가법령정보센터, 게임산업진흥에 관한 법률 제21조](https://www.law.go.kr/법령/게임산업진흥에관한법률/제21조)
- [국가법령정보센터, 게임산업진흥에 관한 법률 제21조의2](https://www.law.go.kr/법령/게임산업진흥에관한법률/제21조의2)
- [국가법령정보센터, 게임산업진흥에 관한 법률 제25조](https://www.law.go.kr/법령/게임산업진흥에관한법률/제25조)

## 관련 문서

- [[App-Monetization-Models|앱 수익 모델]] — 스토어 수수료와 테스트 조건
- [[In-App-Purchase|인앱결제]]
- [[Marketplace-Seller-Launch|오픈마켓 셀러 첫 상품 출시]]
- [[Privacy-Operations-for-Small-Business|소규모 사업자의 개인정보 운영]]
- [[App-Store-Listing-Localization|앱스토어 등록 정보의 기본 언어와 현지화]]
- [[Expo-TestFlight-Distribution|TestFlight 배포]]
