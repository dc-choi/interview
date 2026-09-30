---
tags: [business, analytics, measurement, ga4, firebase, app, event-tracking]
status: done
verified_at: 2026-09-29
category: "비즈니스&제품(Business&Product)"
aliases: ["App Analytics Event Tracking", "앱 분석과 이벤트 설계", "GA4 Firebase 앱 분석"]
---

# 앱 분석과 이벤트 설계 (GA4와 Firebase)

앱을 출시한 뒤 설치한 사람이 어디까지 써 보고 떠나는지 알려면 사용자 행동을 이벤트로 기록하고 퍼널과 코호트로 봐야 한다. Google Analytics 4(GA4)는 웹 분석 도구로 많이 쓰지만 Firebase SDK를 연결하면 iOS와 Android 앱의 행동도 같은 속성에서 볼 수 있다. 도구는 답을 주지 않고, 다음에 무엇을 고칠지에 대한 더 좋은 질문을 준다.

## 설정과 자동 수집

1. Firebase 프로젝트를 만들고 Google Analytics를 연결한다.
2. 앱에 Firebase Analytics SDK를 설치한다.

SDK만 넣어도 자동 수집 이벤트가 쌓인다. 설치 뒤 첫 실행(`first_open`), 세션 시작(`session_start`), 앱이 전면에 있는 참여(`user_engagement`), 화면 전환(`screen_view`), 앱 업데이트(`app_update`), 스토어 인앱 결제(`in_app_purchase`) 등이다. 국가, 기기, 앱 버전 같은 기본 속성도 함께 붙는다.

## 이벤트 설계

자동 수집만으로는 사용자가 앱 안에서 무엇을 했는지 알 수 없다. 핵심 행동이 일어날 때 이벤트를 직접 보낸다.

| 이벤트 예시 (운동 앱) | 의미 | 구분 |
|---|---|---|
| `sign_up` | 회원가입 완료 | GA4 권장 이벤트 |
| `tutorial_begin`, `tutorial_complete` | 온보딩 시작과 완료 | GA4 권장 이벤트 |
| `workout_start`, `workout_complete` | 핵심 행동 시작과 완료 | 맞춤 이벤트 |
| `purchase` | 결제 완료 | GA4 권장 이벤트 |

- GA4가 정한 권장 이벤트 이름이 있으면 그 이름과 매개변수를 쓴다. 게임이라면 `level_start`, `level_end`도 권장 이벤트다. 표준 이름을 쓰면 보고서와 연동 기능을 그대로 쓸 수 있다.
- 이벤트를 고르기 전에 세 가지를 먼저 답한다. 이 앱의 핵심 가치는 무엇인가, 사용자가 그 가치를 경험했다는 행동은 무엇인가, 그 행동까지 가는 과정에서 어디서 이탈하는가.
- 일단 다 모으는 방식은 피한다. 볼 계획이 없는 이벤트는 이름 관리와 해석 비용만 늘리고 중요한 신호를 묻는다. AI로 계측 코드를 쉽게 심을 수 있게 된 만큼 무엇을 심을지 고르는 판단이 더 중요해졌다.

## 처음에 볼 네 가지

| 질문 | 보는 곳 | 연결 지표 |
|---|---|---|
| 사용자 수: 활성과 신규 사용자가 늘고 있는가 | GA4 홈과 기본 보고서 | Acquisition |
| 활성화: 신규 사용자가 가입, 온보딩, 첫 핵심 행동까지 가는가 | 탐색의 유입경로(퍼널) 템플릿 | Activation |
| 리텐션: 다음 날, 다음 주에도 돌아오는가 | 탐색의 코호트 템플릿 (기간을 바꿔 D1, D7 확인) | Retention |
| 핵심 행동: 운동 완료, 주문, 결제 같은 핵심 기능이 실제로 쓰이는가 | 이벤트 보고서, 퍼널 | North Star 후보 |

- 퍼널은 단계별로 어디서 크게 빠지는지를 보여 준다. 예를 들어 설치 뒤 첫 단계에 진입하지 않고 떠나는 사용자가 많다면 첫 화면과 온보딩부터 의심한다. 특정 단계를 넘긴 사용자 대부분이 끝까지 간다면 그 단계가 활성화 기준 후보다.
- 숫자 하나보다 사용자 그룹과 기간을 나눠 비교한다. 앱 버전, 국가, 유입 경로에 따라 결과가 크게 달라진다. 지표 정의와 허수지표 구분은 [[Metrics-Framework|지표 설계]]를 따른다.

## 테스트 데이터 오염

사용자가 적은 출시 초기에는 개발자 테스트, 스토어 심사자의 사용, 내부 지인의 설치가 전체 수치를 크게 왜곡한다.

- GA4의 데이터 필터로 디버그 모드에서 보낸 개발자 트래픽을 제외할 수 있다. IP 기반 내부 트래픽 규칙은 웹 데이터 스트림에만 정의되고, 공식 도움말은 앱 사용자의 내부 트래픽은 이 방식으로 거를 수 없다고 안내한다. 필터는 만든 시점부터 적용되고 과거 데이터에는 적용되지 않으며, 제외된 데이터는 되돌릴 수 없다. 영구 제외가 부담스러우면 보고서 필터로 가린다.
- 앱의 내부 설치, 심사자, 테스트 빌드처럼 디버그 모드로 구분하기 어려운 경우는 설치 경로나 빌드 종류를 사용자 속성(맞춤 측정기준)으로 보내고 분석할 때 그 값으로 거른다.
- 이런 구분은 첫 배포 전에 심어야 한다. 이미 쌓인 데이터는 나중에 나눌 수 없다.

## 트레이드오프

- GA4는 무료로 시작하기 쉽지만 원본 이벤트 수준의 자유로운 분석은 BigQuery 내보내기나 전용 제품 분석 도구가 더 편하다. 초기에는 GA4로 시작하고 질문이 도구의 한계를 넘을 때 옮긴다.
- 운영 지표(DB 기준 가입, 결제)와 행동 지표(GA4 이벤트)는 분모와 누락 조건이 다르다. 둘을 섞어 전환율을 계산하지 않는다.
- 이벤트 이름은 나중에 바꾸면 과거와 이어지지 않는다. 처음에 이름 규칙(동사와 대상, 시작과 완료 짝)을 정한다.

## 적용 점검

- 핵심 가치를 경험한 행동 하나가 이벤트로 정의돼 있는가.
- 설치부터 그 행동까지의 퍼널을 만들 수 있는가.
- 첫 주 코호트의 다음 주 재방문을 볼 수 있는가.
- 테스트와 심사 트래픽을 구분할 수단을 첫 배포 전에 넣었는가.

## 출처

- [Google Analytics Help, Automatically collected events](https://support.google.com/analytics/answer/9234069)
- [Google Analytics Help, Recommended events](https://support.google.com/analytics/answer/9267735)
- [Google Analytics Help, Data filters](https://support.google.com/analytics/answer/10108813)
- [Google Analytics Help, Define internal traffic](https://support.google.com/analytics/answer/10104470)
- [앱 출시 후 GA 데이터 분석 기본 — Threads, whitep.life](https://www.threads.com/@whitep.life/post/Dd1gUilmpYL)

## 관련 문서

- [[Metrics-Framework|지표 설계와 North Star Metric]]
- [[PMF-Funnel|PMF 신호와 전환 퍼널]]
- [[Live-Ops-Service-Model|라이브옵스와 서비스형 제품 모델]]
- [[App-Store-Listing-Localization|앱스토어 등록 정보의 기본 언어와 현지화]]
