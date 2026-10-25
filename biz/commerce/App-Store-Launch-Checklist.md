---
tags: [business, commerce, mobile-app, app-store, google-play, solo-business]
status: done
verified_at: 2026-10-25
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
   - Google Play Console은 개인 용도(학생, 취미, 아마추어 개발자)면 개인 계정, 조직이나 사업(상업, 산업, 전문, 정부 활동)이면 조직 계정을 고르게 안내한다. 두 유형 모두 같은 기능을 쓰고 결제 프로필로 수익화할 수 있으며, 조직 계정은 D-U-N-S 번호가 필요하다(Dun & Bradstreet 발급은 무료). 금융, 일부 건강, VPN, 정부 앱은 조직 계정으로 등록하게 한다. 등록비는 1회 25달러이며 계정을 만들 때 신원 확인을 거친다. 국내 개발자가 2023-08-31 이후 만든 개인 계정은 개발자 전화번호를 인증해야 하고 그 번호가 Google Play에 표시된다. 2024년 초부터 새 개인 계정은 앱을 공개하기 전에 Play Console 모바일 앱으로 실제 Android 기기 접근도 확인해야 한다. 루팅하지 않은 Android 10 이상의 실물 Android 모바일 기기면 되고, 같은 기기로 여러 계정을 확인할 수 있으며, 나중에 다시 확인을 요청받아도 같은 기기일 필요는 없다.
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

## Apple 개인 멤버십에서 조직 멤버십으로 전환

2026-10-22 공식 가입 및 계정 정보 변경 도움말을 대조한 범위다. 개인사업자 등록이나 D-U-N-S 번호 보유만으로 조직 전환 자격이 확정되지는 않는다. 조직은 Apple과 계약할 수 있는 법적 실체여야 하며, 개인 및 sole proprietor는 개인 법적 이름이 판매자로 표시된다는 가입 기준을 함께 적용한다.

- 전환은 공식 요청 절차로 신청한다. 신청자는 조직의 창업자 또는 공동창업자여야 하고 조직의 D-U-N-S 번호 등 정보를 제공하며, 조직 확인용 사업 서류를 추가로 요구받을 수 있다.
- 개인 Apple Account의 이름을 고치는 것과 멤버십 또는 App Store 판매자명을 바꾸는 것은 다르다. 개인 계정 이름 변경만으로 판매자명이 바뀌지 않는다.
- 멤버십의 이름과 주소 변경은 계약 정보이므로 검증과 승인이 필요하다. 특정 신청자의 승인 경험이나 지원팀 응답 기간을 모든 개인사업자에게 적용되는 예외 또는 처리 기한으로 사용하지 않는다.

## Google 개발자 공개 정보와 결제 프로필 변경

2026-10-18에 Google 공식 도움말의 공개 항목과 신원 정보 변경 절차만 대조했다. 기존 세금, 심사와 빌드 요건 전체의 재검증은 아니다. 등록 때 결제 프로필 선택, 결제 프로필의 주소 요건, 공개 정보 확인 위치, 주소지 증빙 서류와 미인증 조치는 2026-10-25에 대조했다.

- **공개 정보와 Google 연락용 정보를 구분한다.** 개인 계정은 법적 이름, 국가와 개발자 이메일을 공개하며 수익화하면 전체 주소를 공개한다. 지역별 추가 공개 요건도 확인한다. 조직 계정은 법적 이름, 주소, 개발자 이메일과 개발자 전화번호를 공개한다. Google이 계정 운영 연락에 사용하는 이메일과 전화번호는 별도 항목으로, 그 연락용 정보 자체는 사용자에게 공개하지 않는다.
- **신원 확인용 프로필을 찾는다.** 개발자 신원의 이름과 주소는 연결된 Google 결제 프로필에서 가져온다. 수익을 받는 판매자 계정의 결제 프로필과 같을 수도, 다를 수도 있으므로 정산 프로필만 고쳐 해결됐다고 판단하지 않는다.
- **같은 국가 안의 이름과 주소 변경:** 계정 소유자가 Play Console의 `Developer account > About you`에서 정보 변경을 시작하고 연결된 Google Payments Center에서 수정한다. 신분 증빙 업로드가 추가로 필요할 수 있다.
- **국가나 D-U-N-S 번호 변경:** 기존 결제 프로필에서 직접 바꾸지 않고 새 프로필을 구성하고 필요한 검증을 마친 뒤 개발자 계정에 연결하는 절차를 따른다. 새 결제 프로필과 새 개발자 계정은 다른 대상이다.
- **등록 때 연결할 결제 프로필을 고른다.** 등록 과정에서 기존 결제 프로필을 고르거나 새 프로필을 만들 수 있고, 프로필 유형은 만들 개발자 계정 유형(개인 또는 조직)을 따른다. 앱 판매를 관리하는 결제 프로필의 생성 안내는 공식 서류에 나온 법적 사업장 주소를 넣게 하며, 유효한 실제 주소가 있어야 하고 사서함 주소는 쓸 수 없다. Play Console 요구사항 인증을 마친 계정은 Google Play에 공개될 수 있는 정보 전체를 개발자 프로필 페이지에서 확인한다.
- **대한민국 개인 계정의 주소지 증빙:** 국가별 필수 서류 안내는 개인에게 이동통신사를 통한 본인 인증과 주소지 증빙 서류를 요구한다. 인정 서류는 주소가 기재된 사진 부착 정부 발급 신분증, 공공요금 청구서(전기, 수도, 가스, 인터넷, 케이블 TV), 보험 명세서, 신용카드 또는 은행 명세서이며, 성명과 전체 주소가 결제 프로필과 정확히 일치하고 최근 90일 안에 발급된 것이어야 한다. 같은 안내에서 사업자등록증은 조직의 등록 서류로 나오고 개인의 주소지 증빙 목록에는 없다. 2023-08-31 이후 만든 새 계정 대상 FAQ는 주소지 증빙이 지역마다 다르다며 임대 또는 주택담보대출 계약서도 예로 들고, 결제 센터는 받은 인증 요청 안의 링크에서 허용 서류 유형을 확인하게 한다.
- **공유 오피스나 비상주 사무실 주소:** 쓸 수 있는지는 2026-10-25에 대조한 도움말에 따로 적혀 있지 않다. 집이 아닌 주소를 넣으려면 그 주소와 이름이 결제 프로필과 정확히 같은 허용 유형의 서류를 낼 수 있는지 먼저 확인하고, 그 주소를 사업장으로 볼 수 있는지는 [[Business-Tax-Setup#사업장 주소와 온라인 표시 정보|사업장 주소와 온라인 표시 정보]]로 따로 판단한다.
- **미인증 조치와 추가 시간:** Google이 개발자 정보나 연락처 정보를 확인하지 못하면 개발자 정보와 앱이 Google Play에서 삭제될 수 있고, 정보를 인증할 때까지 앱을 다시 게시할 수 없다. 2023-08-31 이후 만든 새 계정 대상 도움말은 시간이 더 필요하면 Play Console에서 이의신청을 낼 수 있고, 삭제되면 사용자가 Google Play에서 그 앱을 내려받을 수 없으며, 개발자 정보를 다시 인증하면 앱을 복구할 수 있다고 안내한다. 지원되지 않는 서류 제출이 인증 실패의 주된 원인이고, 수정되거나 가짜인 서류를 내면 계정과 앱이 즉시 삭제될 수 있다.

주소 공개가 부담스럽다면 계정 생성과 수익화 전에 공개될 정보와 증빙 가능한 주소를 확인한다. 특정 증명서 한 장의 승인 경험을 모든 국가와 계정에 통하는 해결책으로 사용하지 않는다. 허용 서류와 계정별 검증 요구는 실제 안내로 확인하며, 주소 수정만을 위해 새 개발자 계정이 반드시 필요하다고 가정하지 않는다.

## Apple 심사 전 로그인, 광고와 완성도 점검

아래는 2026-10-16에 App Review Guidelines와 User Privacy and Data Use를 대조한 범위다. 기존 계정, 세금, 빌드 요건 전체의 재검증 날짜는 아니다.

- **로그인의 필요성:** 중요한 계정 기반 기능이 없다면 로그인 없이 사용할 수 있게 한다. 계정 생성을 지원하면 앱 안에서 계정 삭제를 제공한다(5.1.1(v)). 로그인 자체를 금지하는 규칙으로 해석하지 않는다.
- **광고와 ATT:** 광고가 있다는 이유만으로 ATT 동의를 요구하는 것은 아니다. iOS/iPadOS/tvOS 14.5 이상에서는 추적하거나 기기의 광고 식별자에 접근하기 전에 ATT 허락이 필요하다. 추적에는 광고 타기팅이나 광고 측정을 위해 앱의 사용자/기기 데이터를 다른 회사의 앱, 웹사이트나 오프라인 데이터와 결합하는 행위, 데이터 브로커와 공유하는 행위가 포함되며 공식 문서의 제한된 예외를 함께 확인한다. 광고 SDK와 분석 SDK가 실제로 수집하고 결합하는 데이터까지 점검한다. ATT를 거절한 사용자에게 해시 이메일 등 다른 식별자를 써서 추적을 우회할 수 없다.
- **문의 경로:** 앱과 Support URL에 쉽게 연락할 방법이 있어야 한다(1.5). 문의 페이지가 열리는지만 보지 말고 안내된 연락 경로가 실제로 작동하는지 확인한다.
- **제출 완성도:** 임시 문구와 빈 웹사이트를 제거하고 URL, 메타데이터와 기기 동작을 점검한다(2.1). 로그인 기능이 있으면 심사용 계정 정보와 접근 가능한 백엔드를 준비한다. 법적 또는 보안상 계정 제공이 어렵다면 Apple 사전 승인을 받아 기능을 보여 주는 데모 모드를 제공할 수 있다. 이 심사용 모드와 미완성 데모 앱은 다르며, 데모/베타/체험판 앱의 배포는 TestFlight를 사용한다(2.2). 결함을 숨기는 표현 변경은 완성도 검증을 대신하지 않는다.

## 빌드 환경과 출시 뒤 유지 요건

출시 뒤에도 스토어 요건 때문에 기능 변경 없이 다시 빌드하고 제출해야 할 때가 있다. 아래는 2026-10-11에 확인한 기준이다.

- **Apple 빌드 환경:** 2026-04-28부터 App Store Connect에 올리는 iOS, iPadOS, tvOS, visionOS, watchOS 앱은 Xcode 26 이상과 각 플랫폼의 26 SDK로 빌드해야 하고, 2026-09-09부터 올리는 iOS와 iPadOS 앱은 iOS 13 이상을 대상으로 해야 한다. Xcode는 macOS에서만 실행된다. 업로드는 Transporter 명령줄 도구(macOS, Windows 11, Red Hat Enterprise Linux. Windows와 Linux에서는 Xcode에서 내보낸 AppStoreInfo.plist가 필요하다)나 App Store Connect API로도 할 수 있지만, 올리는 바이너리는 위 빌드 요건을 충족해야 한다. Apple의 Xcode Cloud도 첫 workflow는 Xcode에서 설정한다. Apple은 iPad의 Swift Playground로 SwiftUI 앱을 제출할 수 있다고 안내한다. macOS 빌드를 대신 돌려 주는 서비스의 예는 [[Expo-EAS-Build-Overview|EAS Build]]와 [[Expo-EAS-Submit-iOS|EAS iOS 제출]]을 본다.
- **Google 대상 API 수준:** 2026-08-31부터 새 앱과 업데이트는 Android 16(API 36) 이상을 대상으로 해야 제출할 수 있다. Wear OS와 Android Automotive OS는 API 35, Android TV와 Android XR은 API 34가 기준이다. 이 폼 팩터들을 뺀 기존 앱은 API 35 이상을 대상으로 해야 앱의 대상 API보다 높은 Android 버전을 쓰는 새 사용자에게 계속 제공되며, 폼 팩터별 기존 앱 기준은 더 낮다. 기존 설치 사용자에게는 영향이 없다. Play Console 정책 상태 페이지에서 기한을 2026-11-01까지 늘리는 연장을 신청할 수 있다.
- **방치된 앱과 계정:** Apple은 3년 동안 업데이트하지 않았고 최근 12개월 다운로드가 최소 기준에 못 미치는 앱에 90일 안에 업데이트를 요구하며, 기한을 넘기면 업데이트가 승인될 때까지 App Store에서 내린다. 실행 즉시 종료되는 앱은 바로 내린다. 멤버십이 만료되면 앱을 내려받을 수 없고 새 앱과 업데이트도 제출할 수 없지만, 이미 설치한 사용자의 앱은 계속 동작한다. Google은 만든 지 1년이 넘은 계정 중 앱을 심사에 제출한 적이 없거나, 누적 설치 1,000 미만이면서 연락처를 인증하지 않고 180일 동안 Play Console을 쓰지 않은 계정을 폐쇄하며 등록비는 환불하지 않는다. 안내된 기한까지 연락처를 인증하고 앱이나 업데이트를 게시하면 피할 수 있다.

외주로 앱을 만든다면 출시 이후 이런 요건 대응을 누가, 언제, 어떤 비용으로 맡는지 계약에 정해 두기를 제안한다. 새 기능이 없어도 Google 대상 API 기준에 못 미치면 최신 Android 기기의 새 사용자에게 제공되지 않고, 두 스토어 모두 다음 업데이트를 올릴 때 그 시점의 빌드 기준을 맞춰야 하기 때문이다.

## 게임을 낼 때 추가로 확인할 것

- **등급분류:** 게임물을 유통하거나 이용에 제공할 목적으로 제작, 배급하려면 그 전에 게임물관리위원회나 문화체육관광부장관이 지정한 자체등급분류사업자에게서 등급분류를 받아야 한다(게임산업법 제21조 제1항, 제21조의2). 자체등급분류사업자는 청소년이용불가 기준에 해당하는 게임물과 청소년게임제공업, 일반게임제공업에 제공되는 게임물은 등급분류할 수 없다(제21조의2 제3항). Google Play도 19세 미만에게 맞지 않는 게임은 게임물관리위원회의 등급분류 증명서가 있어야 출시할 수 있다고 안내한다. 자체등급분류사업자가 아닌 경로로 배포할 때도 위원회의 등급분류를 확인한다.
- **예외의 범위:** 영리를 목적으로 하지 않는 게임물 중 대통령령으로 정한 것은 등급분류 대상에서 빠지지만, 청소년이용불가 기준에 해당하는 내용이 있으면 예외가 적용되지 않는다(제21조 제1항 제4호). 무료로 배포한다는 사실만으로 이 예외에 해당한다고 보지 말고 시행령 요건을 확인한다. 개발 중 성능, 안전성과 이용자 만족도를 평가하는 시험용 게임물도 대통령령이 정한 대상, 기준과 절차를 따를 때만 빠지므로(제21조 제1항 제3호), 비공개 테스트 배포가 이 예외에 해당하는지 확인한다.
- **확률형 아이템:** Google Play는 국가와 관계없이 구매로 무작위 가상 아이템을 받는 장치의 확률을 공개하게 한다. 한국 법의 확률형 아이템 정보 표시 의무는 2024-03-22부터 시행됐고, 문화체육관광부 발표에 따르면 게임물을 제작, 배급 또는 제공하는 자 모두가 3년 동안 연평균 매출액 1억원 이하인 중소기업이면 표시 의무에서 빠진다. 스토어 정책과 법 의무를 나눠 확인한다.
- **게임제작업 등록:** 게임제작업이나 게임배급업을 하려면 특별자치시장, 특별자치도지사, 시장, 군수 또는 구청장에게 등록한다(제25조 제1항). 국가나 지방자치단체의 제작, 교육기관의 자체 교육용 제작, 공공기관의 홍보용 제작 등은 등록 없이 할 수 있다.

## 트레이드오프와 한계

- 개인 계정은 준비 서류가 적지만 공개되는 정보가 있다. Apple은 판매자명에 실명을 쓰고, Google 개인 계정은 법적 이름, 국가와 개발자 이메일을 표시하며 수익화하면 주소 전체를 표시한다. 국내 개발자의 신규 Google 개인 계정은 전화번호도 표시되고 테스트 기간이 붙는다.
- 조직 계정은 Apple에서 법인, D-U-N-S 번호와 웹사이트가, Google에서 D-U-N-S 번호가 필요하다. Google 조직 계정은 법적 이름, 주소, 개발자 이메일과 전화번호를, Apple 한국 조직 계정은 상호, 이메일과 전화번호를 공개한다.
- 스토어 정책, 등록비, 테스트 요건과 심사 기간은 바뀔 수 있다. 이 문서는 2026-10-06 공식 도움말 기준이며, 기기 확인, 빌드 환경과 출시 뒤 유지 요건은 2026-10-11에 새로 확인했고 등록비와 테스트 요건은 같은 날 다시 확인했다.
- 등급분류, 신고와 세금 판단은 앱의 수익 구조와 배포 경로에 따라 달라지므로 이 목록만으로 의무 여부를 확정하지 않는다.

## 적용 점검

- [ ] 개인과 조직 중 계정 유형을 정하고, 판매자명과 공개되는 연락처, 필요한 서류를 확인했는가
- [ ] Google 비공개 테스트와 프로덕션 신청 심사, Apple 심사를 출시 일정에 넣었는가
- [ ] Apple이 요구하는 현재 Xcode와 SDK(2026-10-11 기준 Xcode 26) 빌드 환경과 Google 개인 계정의 Android 기기 확인을 준비했는가
- [ ] Google 대상 API 수준, Apple 빌드 SDK와 최소 지원 iOS 기준 상향에 따른 업데이트와 그 책임자를 정했는가
- [ ] 판매 계약, 미국과 한국 세금 정보, 은행 계좌 확인과 사업자등록번호 입력을 마쳤는가
- [ ] 개인정보처리방침, Data safety와 App Privacy, 계정 삭제 경로와 연락 수단을 준비했는가
- [ ] 소셜 로그인을 쓰면 Apple 4.8의 동등한 로그인 수단을 넣었는가
- [ ] 두 스토어에 국내 판매자 정보(사업자등록번호, 통신판매업 신고번호)를 넣었는가
- [ ] 게임이면 등급분류 경로, 시험용 배포와 확률형 아이템 표시, 게임제작업 등록 대상인지 확인했는가

## 출처

- [Apple Developer, Enrollment](https://developer.apple.com/programs/enroll/)
- [Apple Developer, Program enrollment support](https://developer.apple.com/support/enrollment/)
- [Apple Developer, Updating your account information](https://developer.apple.com/help/account/membership/updating-your-account-information/)
- [Apple Developer, Provide tax information](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information)
- [Apple Developer, Manage Korea compliance information](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-korea-compliance-information)
- [Apple Developer, App privacy details on the App Store](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple Developer, App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 1.5, 4.8, 5.1.1(i), 5.1.1(v). 2026-10-16에는 1.5, 2.1, 2.2, 5.1.1(v)를 부분 대조
- [Apple Developer, User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/) — 2026-10-16, ATT 적용 조건, SDK 책임과 대체 식별자 추적 제한
- [Play Console Help, Get started with Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- [Play Console Help, Choose a developer account type](https://support.google.com/googleplay/android-developer/answer/13634885?hl=en)
- [Play Console Help, Required information to create a Play Console developer account](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en)
- [Play Console Help, Update developer identity details managed by a Google payments profile](https://support.google.com/googleplay/android-developer/answer/16260648?hl=en) — 2026-10-18, 신원 확인과 판매자 프로필 구분, 동일 국가 내 이름/주소 변경과 새 결제 프로필 연결
- [Play Console Help, Verify your developer identity information](https://support.google.com/googleplay/android-developer/answer/10841920?hl=en) — 2026-10-25, 등록 때 결제 프로필 선택과 생성, 미인증 시 삭제와 재게시 제한
- [Play Console Help, Google Play Developer Verification: Required documents by country and region - South Korea](https://support.google.com/googleplay/android-developer/answer/15633622?hl=en&co=GENIE.CountryCode%3DKR) — 2026-10-25, 개인의 이동통신사 본인 인증과 주소지 증빙 서류, 일치와 발급일 조건, 조직 등록 서류, 지원되지 않는 서류와 위조 서류
- [Play Console Help, Keeping your developer account information up to date](https://support.google.com/googleplay/android-developer/answer/13634888?hl=en) — 2026-10-25, 2023-08-31 이후 만든 새 계정에만 적용. 주소지 증빙 FAQ, 추가 시간 이의신청, 삭제의 의미와 재인증 복구
- [Play Console Help, View and manage your developer account information (for Play Console Requirements-verified accounts)](https://support.google.com/googleplay/android-developer/answer/13634081?hl=en) — 2026-10-25, 공개될 수 있는 정보를 보는 개발자 프로필 페이지
- [Google Payments Center Help, Verify your identity or payment info](https://support.google.com/paymentscenter/answer/7644078?hl=en) — 2026-10-25, 인증 요청 안의 허용 서류 유형 링크
- [Play Console Help, App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Play Console Help, Requirements for distributing apps in specific countries/regions](https://support.google.com/googleplay/android-developer/answer/6223646?hl=en)
- [Play Console Help, Additional contact information required for Korean app developers](https://support.google.com/googleplay/android-developer/answer/3255733?hl=en)
- [Play Console Help, Create a payments profile](https://support.google.com/googleplay/android-developer/answer/7161426?hl=en) — 2026-10-25에는 앱 판매 관리 용도, 법적 사업장 주소, 실제 주소 요건과 사서함 주소 불허만 부분 대조
- [Play Console Help, Verify bank account](https://support.google.com/googleplay/android-developer/answer/7161378?hl=en)
- [Play Console Help, Tax rates and value-added tax (VAT)](https://support.google.com/googleplay/android-developer/answer/138000?hl=en)
- [Play Console Help, User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
- [Play Console Help, Provide information for Google Play's Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Play Console Help, Understanding Google Play's app account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [게임 확률형 아이템 정보, 3월 22일부터 투명하게 공개된다 — 대한민국 정책브리핑](https://www.korea.kr/news/policyNewsView.do?newsId=148924297)
- [Play Console Help, Device verification requirements for new developer accounts](https://support.google.com/googleplay/android-developer/answer/14316361?hl=en)
- [Play Console Help, Target API level requirements for Google Play apps](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Android Developers, Meet Google Play's target API level requirement](https://developer.android.com/google/play/requirements/target-sdk)
- [Play Console Help, Closure of inactive developer accounts](https://support.google.com/googleplay/android-developer/answer/11605267?hl=en)
- [Apple Developer, Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)
- [Apple Developer, SDKs and system requirements](https://developer.apple.com/xcode/system-requirements/)
- [Apple Developer, Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds)
- [Apple Developer, Transporter User Guide 4.2](https://help.apple.com/itc/transporteruserguide/en.lproj/static.html)
- [Apple Developer, Configuring your first Xcode Cloud workflow](https://developer.apple.com/documentation/xcode/configuring-your-first-xcode-cloud-workflow)
- [Apple Developer, Swift Playground](https://developer.apple.com/swift-playground/)
- [Apple Developer, App Store Improvements](https://developer.apple.com/support/app-store-improvements/)
- [Apple Developer, Program Renewal](https://developer.apple.com/help/account/membership/renewal/)
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
- [[Expo-EAS-Build-Overview|EAS Build 시작과 산출물]]
- [[Expo-EAS-Submit-iOS|iOS 제출과 App Store Connect]]
