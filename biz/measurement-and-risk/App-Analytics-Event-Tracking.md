---
tags: [business, analytics, measurement, ga4, firebase, app, event-tracking]
status: done
verified_at: 2026-10-03
category: "비즈니스&제품(Business&Product)"
aliases: ["App Analytics Event Tracking", "앱 분석과 이벤트 설계", "GA4 Firebase 앱 분석"]
---

# 앱 분석과 이벤트 설계 (GA4와 Firebase)

앱을 출시한 뒤 설치한 사람이 어디까지 써 보고 떠나는지 알려면 사용자 행동을 이벤트로 기록하고 퍼널과 코호트로 봐야 한다. Google Analytics 4(GA4)는 웹 분석 도구로 많이 쓰지만 Firebase SDK를 연결하면 iOS와 Android 앱의 행동도 같은 속성에서 볼 수 있다. 도구는 답을 주지 않고, 다음에 무엇을 고칠지에 대한 더 좋은 질문을 준다.

검증 범위는 공식 문서의 자동 수집 조건, 개발자 필터, 코호트와 수집 제어, PII 정책이다. 실제 앱의 SDK 버전, 설정, 이벤트 전달과 법적 처리 근거는 확인하지 않았다. 아래 적용 점검은 사용자 서비스의 도입 완료 기록이 아니다.

2026-10-07에는 사용자 속성의 보고 조건과 개발자 필터의 대상을 추가 대조했다. 나머지 제품 동작은 재검증하지 않아 frontmatter 검증일은 유지한다.

## 설정과 자동 수집

1. Firebase 프로젝트를 만들고 Google Analytics를 연결한다.
2. 앱에 Firebase Analytics SDK를 구성하고 초기화한다.

수집이 활성화된 SDK는 세션 시작(`session_start`), 앱이 전면에 최소 1초 있는 참여(`user_engagement`), 업데이트 후 재실행(`app_update`) 등 일부 이벤트를 자동으로 기록한다. 국가, 기기, 앱 버전 같은 기본 측정기준도 제공하지만 모든 행동이 자동으로 잡히지는 않는다.

- **첫 실행:** `first_open`은 설치 또는 재설치 후 처음 실행했을 때의 이벤트다. 다운로드 수나 신규 회원 수가 아니며, 다운로드 후 실행하지 않은 설치는 이 이벤트로 관측되지 않는다.
- **화면:** 자동 `screen_view`는 `UIViewController`나 `Activity` 등의 전환과 화면 수집 설정에 의존한다. 여러 화면을 하나의 컨트롤러나 Activity에서 표현하거나 SwiftUI를 쓰면 필요한 화면을 수동으로 기록해야 한다. SDK 설치만으로 앱의 모든 논리적 화면이 식별된다고 가정하지 않는다.
- **스토어 결제:** `in_app_purchase`의 수집은 SDK 버전과 스토어 연동에 의존한다. Android는 Google Play 연결을 확인하고, Apple은 StoreKit 1 자동 수집과 StoreKit 2의 검증된 거래 기록 절차를 구분한다. 같은 구매를 자동 수집과 수동 기록 양쪽에서 보내면 중복될 수 있다. 유료 앱 구입과 환불이 이 이벤트로 모두 자동 집계되는 것은 아니다.

## 이벤트 설계

자동 수집만으로는 사용자가 앱 안에서 무엇을 했는지 알 수 없다. 핵심 행동이 일어날 때 이벤트를 직접 보낸다.

| 이벤트 예시 (운동 앱) | 의미 | 구분 |
|---|---|---|
| `sign_up` | 회원가입 완료 | GA4 권장 이벤트 |
| `tutorial_begin`, `tutorial_complete` | 온보딩 시작과 완료 | GA4 권장 이벤트 |
| `workout_start`, `workout_complete` | 핵심 행동 시작과 완료 | 맞춤 이벤트 |
| `purchase` | 결제 완료 | GA4 권장 이벤트 |

- GA4가 정한 권장 이벤트 이름이 있으면 그 이름과 정해진 매개변수를 함께 쓴다. 게임이라면 `level_start`, `level_end`도 권장 이벤트다. 이름만 맞추는 것으로 보고서에 필요한 문맥이 채워지지는 않는다. `purchase`와 스토어의 `in_app_purchase`를 같은 거래에 함께 쓰려면 집계에서 중복되지 않는지 확인한다.
- 이벤트를 고르기 전에 세 가지를 먼저 답한다. 이 앱의 핵심 가치는 무엇인가, 사용자가 그 가치를 경험했다는 행동은 무엇인가, 그 행동까지 가는 과정에서 어디서 이탈하는가.
- 일단 다 모으는 방식은 피한다. 볼 계획이 없는 이벤트는 이름 관리와 해석 비용만 늘리고 중요한 신호를 묻는다. AI로 계측 코드를 쉽게 심을 수 있게 된 만큼 무엇을 심을지 고르는 판단이 더 중요해졌다.

## 처음에 볼 네 가지

| 질문 | 보는 곳 | 연결 지표 |
|---|---|---|
| 사용자 수: 활성과 신규 사용자가 늘고 있는가 | GA4 홈과 기본 보고서 | Acquisition |
| 활성화: 신규 사용자가 가입, 온보딩, 첫 핵심 행동까지 가는가 | 탐색의 유입경로(퍼널) 템플릿 | Activation |
| 리텐션: 다음 날, 다음 주에도 돌아오는가 | 탐색의 코호트 템플릿 (포함 조건, 재방문 조건과 기간 정의) | Retention |
| 핵심 행동: 운동 완료, 주문, 결제 같은 핵심 기능이 실제로 쓰이는가 | 이벤트 보고서, 퍼널 | North Star 후보 |

- 퍼널은 계측된 단계별 이탈을 보여 준다. `first_open` 뒤 첫 행동이 없다면 첫 화면과 온보딩, 이벤트 누락을 함께 확인한다. 특정 단계를 넘긴 사용자 대부분이 끝까지 간다면 그 단계가 활성화 기준 후보다.
- 숫자 하나보다 사용자 그룹과 기간을 나눠 비교한다. 앱 버전, 국가, 유입 경로에 따라 결과가 크게 달라진다. 지표 정의와 허수지표 구분은 [[Metrics-Framework|지표 설계]]를 따른다.

### 코호트와 관찰 기간

- GA4의 **코호트 탐색은 기기 데이터를 기준으로 하고 User-ID를 사용하지 않는다.** 로그인 회원이나 여러 기기의 같은 사람을 합친 리텐션이라고 해석하지 않는다. 회원, 단체나 계정 단위 분석이 필요하면 그 식별 단위로 별도 산출한다.
- 포함 조건과 재방문 조건을 먼저 정한다. 첫 실행 후 아무 이벤트를 보낸 비율과 회원가입 후 핵심 행동을 다시 한 비율은 다른 지표다. 사용자 수와 이벤트 횟수도 구분한다.
- 일별 코호트는 속성 시간대의 자정 기준이다. D1은 다음 달력 날짜이며 첫 실행 후 정확히 24시간이 아니다. 주별은 일요일부터 토요일까지로, 임의의 연속 7일과 다르다. 재방문 사용자 수를 볼 때 Standard는 해당 기간의 재방문, Rolling은 해당 기간과 이전 모든 기간의 연속 재방문, Cumulative는 해당 기간까지 한 번이라도 재방문한 사용자를 집계한다.
- D7을 비교할 때는 7일 뒤를 관찰할 수 있는 코호트인지 확인한다. 아직 해당 날짜가 오지 않은 신규 코호트를 0% 리텐션으로 넣지 않는다. 수집 비활성화, 이벤트 기록 오류, 필터와 업로드 지연에 따른 미관측을 실제 미사용으로 단정하지 않는다.

## 테스트 데이터 오염

사용자가 적은 출시 초기에는 개발자 테스트, 스토어 심사자의 사용, 내부 지인의 설치가 전체 수치를 크게 왜곡한다.

- GA4의 개발자 트래픽 데이터 필터는 디버그 모드 활동을 대상으로 한다. **Testing은 해당 데이터를 표시해 검증하고, Active는 수신 데이터를 영구 제외하며, Inactive는 평가하지 않는다.** 필터 생성만으로 제외가 시작됐다고 판단하지 않는다. 과거 데이터에는 소급 적용되지 않으며, 제외된 데이터는 Analytics와 BigQuery에서 되찾을 수 없다. 영구 제외가 부담스러우면 보고서 필터로 가린다.
- DebugView에서 개발자 이벤트를 확인하면서 일반 보고서에서는 제외할 수 있다. 디버그 모드 자체를 영구 제외 설정으로 간주하지 않는다. 현행 Firebase 문서는 디버그 이벤트가 일일 BigQuery 내보내기에 기본 포함되므로 개발자 필터를 구성하라고 안내한다.
- IP 기반 내부 트래픽 규칙은 웹 데이터 스트림에만 정의되고, 공식 도움말은 앱 사용자의 내부 트래픽을 이 방식으로 거를 수 없다고 안내한다. 앱에서는 확인된 테스트 계정이나 빌드 종류를 사용자 속성으로 보내고 맞춤 측정기준을 등록해 분석에서 구분할 수 있다. 이 값이 모든 심사자나 내부 사용자를 자동 식별한다는 뜻은 아니다.
- 구분값은 첫 배포 전에 설계한다. 수집하지 않은 과거의 테스트 여부를 새 속성이 자동 복원하지는 않는다. 이미 남아 있는 앱 버전 등으로 일부를 구분할 수 있어도, 식별할 수 없는 트래픽은 미분류로 남긴다.

사용자 속성으로 테스트 여부를 구분한다면 앱에서 값을 전송하고 실제 수집을 확인한 뒤 사용자 범위의 맞춤 측정기준을 등록한다. 관리 화면에 이름만 만드는 것으로 테스트 사용자가 식별되지는 않는다. 설치 경로를 뜻하는 값과 테스트 여부는 별개이므로, 특정 스토어 경로만 남겼다는 이유로 심사자와 내부 사용자가 모두 제외됐다고 해석하지 않는다. 이는 구분값의 의미를 점검하는 설계 원칙이며 특정 앱에서 검증된 분류 방법은 아니다.

## 수집 제어와 개인정보

- iOS와 Android SDK의 Analytics 수집은 기본 활성 상태다. 수집 전 동의 등으로 보류해야 하는 조건이 있으면 초기 설정부터 비활성화하고 필요한 시점에 활성화한다. 나중에 보여 주는 동의 화면이나 이벤트 필터가 최초 수집을 막았다고 가정하지 않는다. 처리 근거와 위탁, 국외 이전 등은 [[Privacy-Operations-for-Small-Business|대표의 개인정보 운영]]에서 별도로 검토한다.
- 광고 개인화 비활성화와 Analytics 측정 수집 중단은 별개다. SDK의 수집 제어와 consent 설정은 기술적 수단이며, 적용 법령의 요건을 자동 충족한다는 증거가 아니다.
- Google Analytics 정책상 Google이 개인을 식별할 수 있는 PII를 전송하면 안 된다. 이름, 이메일, 전화번호나 이를 포함한 자유 입력값을 이벤트, 화면 이름과 사용자 속성에 넣지 않는다. User-ID에도 식별 가능한 개인정보를 넣지 않는다. Google의 PII 정의와 개인정보 관련 법령의 정의는 같지 않으므로 무작위 내부 식별자를 쓴다는 이유로 법적 개인정보 검토를 생략하지 않는다.

## 트레이드오프

- Firebase Analytics는 사용료 없이 시작할 수 있지만 BigQuery의 저장, 쿼리와 스트리밍에는 별도 사용량 비용이나 무료 한도가 적용된다. 원본 이벤트 수준의 분석에 BigQuery 내보내기나 전용 제품 분석 도구를 검토하되, 기존 도구로 답할 수 없는 질문과 비용을 먼저 확인한다.
- 운영 지표(DB 기준 가입, 결제)와 행동 지표(GA4 이벤트)는 분모와 누락 조건이 다르다. 둘을 섞어 전환율을 계산하지 않는다.
- 이벤트 이름을 바꾸면 기존 기록이 새 이름으로 자동 합쳐지지 않는다. 처음에 이름 규칙(동사와 대상, 시작과 완료 짝)을 정하고, 변경 시점과 구명칭의 대응을 남긴다.

## 적용 점검

- 핵심 가치를 경험한 행동 하나가 이벤트로 정의돼 있는가.
- 첫 실행부터 그 행동까지 같은 측정 단위의 퍼널을 만들 수 있는가.
- 첫 주 코호트의 다음 주 재방문을 볼 수 있는가.
- 테스트 트래픽 구분값과 필터 상태를 확인했고, 미분류 심사 트래픽의 한계를 알고 있는가.
- 수집 전 제어와 PII 전송 금지를 확인했는가.

## 출처

- [Google Analytics Help, Automatically collected events](https://support.google.com/analytics/answer/9234069)
- [Google Analytics Help, Predefined user dimensions](https://support.google.com/analytics/answer/9268042)
- [Google Analytics Help, Create user-scoped custom dimensions](https://support.google.com/analytics/answer/14239618)
- [Google Analytics Help, Recommended events](https://support.google.com/analytics/answer/9267735)
- [Google Analytics Help, Data filters](https://support.google.com/analytics/answer/10108813)
- [Google Analytics Help, Filter out developer traffic](https://support.google.com/analytics/answer/13296662)
- [Google Analytics Help, Define internal traffic](https://support.google.com/analytics/answer/10104470)
- [Google Analytics Help, Cohort exploration](https://support.google.com/analytics/answer/9670133)
- [Google Analytics Help, Best practices to avoid sending PII](https://support.google.com/analytics/answer/6366371)
- [Google Analytics Help, Understanding PII in Google's contracts and policies](https://support.google.com/analytics/answer/7686480)
- [Firebase Documentation, Measure screenviews](https://firebase.google.com/docs/analytics/screenviews)
- [Firebase Documentation, Measure in-app purchases (Apple)](https://firebase.google.com/docs/analytics/ios/measure-in-app-purchases)
- [Firebase Documentation, Measure in-app purchases (Android)](https://firebase.google.com/docs/analytics/android/measure-in-app-purchases)
- [Firebase Documentation, DebugView](https://firebase.google.com/docs/analytics/debugview)
- [Firebase Documentation, Configure Analytics data collection and usage](https://firebase.google.com/docs/analytics/configure-data-collection)
- [Firebase Swift Reference, Analytics](https://firebase.google.com/docs/reference/swift/firebaseanalytics/api/reference/Classes/Analytics)
- [Firebase Android Reference, FirebaseAnalytics](https://firebase.google.com/docs/reference/android/com/google/firebase/analytics/FirebaseAnalytics)
- [Firebase, Google Analytics pricing](https://firebase.google.com/products/analytics/)
- [Firebase Help, Link BigQuery to Firebase](https://support.google.com/firebase/answer/6318765)

## 관련 문서

- [[Metrics-Framework|지표 설계와 North Star Metric]]
- [[Privacy-Operations-for-Small-Business|대표의 개인정보 운영]]
- [[PMF-Funnel|PMF 신호와 전환 퍼널]]
- [[Live-Ops-Service-Model|라이브옵스와 서비스형 제품 모델]]
- [[App-Store-Listing-Localization|앱스토어 등록 정보의 기본 언어와 현지화]]
