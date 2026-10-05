---
tags: [business, revenue, mobile-app, monetization, solo-business]
status: done
verified_at: 2026-10-02
category: "비즈니스&제품(Business&Product)"
aliases: ["App Monetization Models", "앱 수익 모델", "앱 수익화"]
---

# 앱 수익 모델

일반적인 수익 모델 유형과 구독 구조는 [[Business-Model|비즈니스 모델과 수익 구조]]가 다룬다. 이 문서는 그 유형을 모바일 앱의 조건, 즉 스토어 수수료와 심사, 광고 네트워크, 설치 단위 획득 비용과 매각 시장에 맞춰 비교한다.

## Mental model

- **같은 사용자 1만 명도 모델에 따라 가치가 다르다.** 광고는 노출 빈도와 단가, 인앱결제는 결제 전환율과 결제액, 구독은 유지 기간이 가치를 정한다. 사용자 수보다 수익 모델이 요구하는 행동이 일어나는지를 먼저 본다.
- **수익 모델이 감당할 획득 비용을 정한다.** 같은 획득 코호트의 설치당 누적 공헌이익(획득 비용 차감 전)을 설치당 획득 비용(CPI)과 비교한다. 매출에서 스토어와 결제 수수료, 환불, 사용량에 따른 API와 제공 비용을 반영해야 하며, 기대 매출이 CPI보다 크다는 사실만으로 수익성을 판단하지 않는다.
- **구현 난이도와 수익 난이도는 반대로 움직이기 쉽다.** 광고 SDK는 붙이기 쉽지만 트래픽이 적으면 수익이 거의 없고, 구독은 결제 화면과 서버 검증이 필요하지만 소수 사용자로도 매출을 만든다.

## 모델별 비교

| 모델 | 맞는 조건 | 주요 한계 | 운영 부담 |
|---|---|---|---|
| 광고 | 접속 빈도가 높은 게임, 커뮤니티, 뉴스 | 트래픽이 적으면 수익이 미미하고 과다 노출은 이탈을 부른다 | 광고 네트워크 정책, 노출 위치와 빈도 조정 |
| 인앱결제 | 소액 첫 결제를 유도할 수 있는 아이템, 기능 해제 | 스토어 수수료, 소수 고액 결제자 의존 | 상품 설계, 영수증 검증, 환불 대응 |
| 구독 | 반복 효용이 분명한 도구, 콘텐츠, AI 기능 | 결제율보다 해지율과 장기 유지율 관리가 어렵다 | 체험 기간, 갱신 고지, 해지 흐름 |
| 유료 앱 | 기능이 명확하고 검색 수요가 있는 유틸리티 | 설치 진입장벽이 높고 추가 매출이 어렵다 | 업데이트 비용이 신규 판매에만 기대게 된다 |
| 커머스 | 실물 상품이나 앱 밖에서 소비하는 서비스 | 배송, 재고, CS 운영 | 결제 대행과 정산 |
| 거래 중개 | 공급자와 수요자를 함께 모을 수 있는 영역 | 양쪽 확보, 분쟁과 정산 | 신뢰와 규칙 운영 |
| 제휴 | 추천 맥락이 자연스러운 정보성 앱 | 제휴사 정책 의존, 이탈 후 구매 추적 누락 | 링크 관리와 정산 확인 |
| B2B | 조직 단위로 반복 쓰는 업무 도구 | 직접 영업, 보안과 맞춤 요구 | 계약, 도입 지원 |
| 콘텐츠 판매 | 재고 없이 반복 판매할 수 있는 강의, 템플릿 | 좋은 콘텐츠 확보 | 저작권과 정산 |
| 앱 매각 | 운영 가능한 앱과 이전할 권리, 사업이면 수익과 트래픽 증빙 | 무매출 자산과 운영 사업의 등록 요건이 다름 | 자산 목록, 도메인, 스토어와 결제 이전 |

실물 상품이나 앱 밖에서 소비하는 서비스는 Apple 인앱결제 대상이 아니며 다른 결제 수단을 써야 한다(App Review Guidelines 3.1.3(e)). 디지털 상품의 결제 시스템과 지역별 규칙은 [[In-App-Purchase|인앱결제]]를 따른다.

## 혼합 모델

하나의 앱이 여러 모델을 조합하는 경우가 많다.

- 게임: 광고와 인앱결제. 광고 시청 보상으로 재화를 주고, 광고 제거를 판매한다.
- AI 앱: 구독과 크레딧. 기본 사용량은 구독에 포함하고 초과분은 크레딧으로 판다.
- 쇼핑 앱: 상품 판매, 광고, 제휴를 함께 쓴다.
- 중개 앱: 거래 수수료, 공급자 구독, 상단 노출 광고를 함께 쓴다.

혼합은 수익원을 늘리지만 각 모델이 요구하는 행동이 충돌할 수 있다. 광고 노출을 늘리면 구독 전환의 근거(광고 없는 경험)는 강해지지만 무료 사용자의 이탈도 늘어난다.

## 플랫폼별 분기 가설

실무에서는 안드로이드 사용자에게 광고 중심, iOS 사용자에게 구독 중심 수익화가 잘 맞는다는 경험칙이 공유된다. 이는 검증된 법칙이 아니라 가설이다. 같은 앱의 플랫폼별 결제 전환율, 광고 노출당 수익, 유지율을 직접 측정해 분기 여부를 정한다. 지표 정의는 [[Metrics-Framework|지표 설계]]를 따른다.

## 광고 수익화의 한계

광고 집행비를 회수하려면 같은 코호트의 설치당 누적 광고 공헌이익(획득 비용 차감 전)이 광고비 기준 CPI 이상이어야 한다. 광고 매출은 실제 광고 노출 수와 앱에 귀속되는 노출당 수익으로 계산한다. 광고 요청 모두가 노출되지는 않으므로 광고 충족률(fill rate)과 실제 노출, 유지 기간을 반영하고 사용자당 변동비를 뺀다. 정산 수익에 이미 반영된 광고 네트워크 수수료는 중복 차감하지 않는다. CPI에 포함하지 않은 소재 제작과 대행비 등 획득 비용, 고정비와 현금 회수 시점도 따로 확인한다([[Business-Model#같은 고객군과 비용 범위로 획득 비용을 회수하는가|코호트별 획득 비용 회수]]).

- 한 개발자의 공개 실험에서 유료 검색 광고의 설치 단가가 2달러를 넘었고, 무료 보드게임의 광고 수익으로는 이 비용을 회수할 수 없었다. 광고 노출을 늘리는 선택도 유지율과 획득 비용 회수 가능성을 함께 따져야 한다.
- 같은 실험에서 한 달 동안 앱 30개를 만들어 배포했지만 매출은 약 15달러였다. 앱 순위 상위권에 오른 경우도 있었지만 순위는 매출이 아니었다. 수치는 작성자가 공개한 사례이며 일반화할 수 있는 기준은 아니다.
- 광고는 구현이 쉬워 초기 전략으로 택하기 쉽지만, 수익을 내기 어려워 인앱 구독 중심으로 전환한 사례도 있다.

## 스토어 조건 (2026-10-02 확인)

- **Apple App Store Small Business Program:** 전년도 모든 앱의 proceeds가 100만 달러 이하인 기존 개발자와 신규 개발자가 신청할 수 있고, 유료 앱과 인앱결제에 15% 수수료가 적용된다. proceeds는 Apple 수수료와 일부 세금, 조정액을 제외한 금액으로 매출 총액과 다르다. 연관 개발자 계정의 proceeds를 합산하며, 당해 100만 달러를 넘으면 이후 판매에는 표준 수수료가 적용된다. 신청과 승인 뒤 정해진 효력 발생일에 적용된다.
- **Google Play 신규 개인 개발자 계정:** 2023-11-13 이후 만든 개인 계정은 앱마다 신청 직전 14일 이상 연속으로 참여 중인 테스터 12명 이상의 비공개 테스트를 거친 뒤 프로덕션 접근을 신청한다. 테스트와 출시 준비에 관한 답변을 Google이 심사하며, 숫자 요건 충족만으로 자동 승인되는 것은 아니다. 추가 테스트를 요구받을 수도 있다.
- **Google Play 서비스 수수료:** 새 구조가 아직 적용되지 않은 시장에서는 15% service fee tier에 가입한 개발자의 연 수익 첫 100만 달러까지 15%, 초과분 30%이며 자동 갱신 구독은 15%다. 15% tier는 결제 프로필, 연관 계정을 포함한 Account Group과 약관 동의가 필요하고 계정 그룹의 수익을 합산한다. EEA, 영국, 미국은 2026-06-30, 호주와 일본은 2026-09-30부터 서비스 수수료와 Google Play 결제 수수료를 나눈 새 구조가 적용된다. 새 구조는 설치 시점, 거래 유형과 프로그램 참여에 따라 달라지므로 기존 15%/30%를 그대로 적용하지 않는다. 한국은 2026-12-31 전환 예정이며 현재 대체결제 조건은 [[In-App-Purchase|인앱결제]]를 본다.

## 출구로서의 앱 매각

작은 앱이나 사이트도 매각 시장이 있다. 다만 앱 사용자에게서 반복해서 얻는 매출과 소유권을 넘기고 받는 일회성 매각대금은 다르다. 무매출 작동 제품을 받는 시장도 있지만 등록 가능성이 거래 성사나 가격을 보장하지 않는다.

- 매수자 관점의 시장조사로도 쓸 수 있다. 공개 호가는 실제 체결가와 구분하고, 거래 금액만으로 매출과 순이익을 추정하지 않는다.
- 처음부터 매출, 트래픽, 비용 증빙과 운영 문서를 남긴다. 개인 개발자 계정 전체를 넘길 수 있다고 가정하지 않고 앱, 도메인과 결제의 공식 이전 절차를 확인한다.
- 플랫폼별 무매출 허용 조건, 자산 양도 권한, 실사와 에스크로, 고객 데이터 이전과 후속 지원은 [[Side-Project-Asset-Sale|사이드 프로젝트와 디지털 자산 매각]]에서 다룬다.

## 트레이드오프와 한계

- 모델별 장단점은 경향이다. 카테고리, 국가, 타깃의 결제 습관에 따라 결과가 달라진다.
- 수수료 할인 프로그램은 매출 규모와 계정 구조에 조건이 있어, 여러 계정이나 법인으로 나눈 경우 합산 규칙을 확인한다.
- 매각 가능성을 전제로 한 사업 설계는 단기 지표 꾸미기로 흐를 수 있다. 매수자는 지속성과 이전 가능성을 본다.

## 적용 점검

- 같은 코호트와 관찰 기간의 설치당 공헌이익(획득 비용 차감 전)을 계산했고, CPI와 비교했는가
- 구독이라면 결제 전환율뿐 아니라 첫 갱신율과 월별 유지율을 측정하는가
- 광고라면 충족률, 실제 노출과 정산 수익, 변동비와 유지율을 함께 보는가
- 플랫폼별 분기를 경험칙이 아닌 자기 지표로 결정했는가
- 수수료 프로그램의 가입과 효력 발생일, Google Play 테스트 뒤 프로덕션 접근 심사를 출시 일정에 넣었는가
- 매출, 비용, 트래픽 증빙과 계정 이전 경로를 남기고 있는가

## 출처

2026-10-02에는 공식 자료의 스토어 수수료와 테스트 조건, 광고 지표 정의와 공헌이익 개념을 대조했다. 아래 공개 실험의 매출이나 플랫폼별 경험칙을 독립 검증한 날짜는 아니다.

- [앱 수익화 10가지 — Threads, harry.coding](https://www.threads.com/@harry.coding/post/DaoqSUwk5Se)
- [플랫폼별 수익화 분기와 지표 진단 — Threads, vibe.bizness](https://www.threads.com/@vibe.bizness/post/DdLo7C-GtLj)
- [사이드 프로젝트 매각 플랫폼 목록 — Threads, dietthatgirl](https://www.threads.com/@dietthatgirl/post/Dd035CMk8XD)
- [퇴사 후 한 달간 앱 30개 배포 실험 — Threads, limsangjin12](https://www.threads.com/@limsangjin12/post/DZ6WqOxlC-t)
- [App Store Small Business Program — Apple Developer](https://developer.apple.com/app-store/small-business-program/)
- [App Review Guidelines — Apple Developer](https://developer.apple.com/app-store/review/guidelines/)
- [App testing requirements for new personal developer accounts — Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Service fees — Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/112622?hl=en)
- [Changes to Google Play's service fee in 2021 — Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/10632485?hl=en)
- [Understanding Google Play's lower service fees — Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/16954621?hl=en)
- [Getting started FAQs — Google AdMob Help](https://support.google.com/admob/answer/6168758?hl=en)
- [Principles of Accounting, Volume 2, 3.1 Contribution Margin — OpenStax](https://openstax.org/books/principles-managerial-accounting/pages/3-1-explain-contribution-margin-and-calculate-contribution-margin-per-unit-contribution-margin-ratio-and-total-contribution-margin)
- [Acquire.com](https://acquire.com/)
- [Flippa](https://flippa.com/)
- [Fello](https://www.fello.io/products)

## 관련 문서

- [[Business-Model|비즈니스 모델과 수익 구조]] — 수익 모델 유형, 구독 모델, 공헌이익
- [[In-App-Purchase|인앱결제]] — 결제 시스템과 지역별 수수료 규칙
- [[Metrics-Framework|지표 설계]] — 전환, 유지, 수익 지표 정의
- [[Pricing-Strategy|가격 정책 설계]] — 구독 티어와 가격 심리학
- [[AI-Solo-Software-Business|AI 시대 1인 소프트웨어 사업의 유형과 순서]]
- [[Side-Project-Asset-Sale|사이드 프로젝트와 디지털 자산 매각]]
- [[App-Store-Launch-Checklist|앱 스토어 첫 출시 준비]] — 계정, 정산 정보, 정책 문서, 국내 판매자 정보와 게임 규제
