---
tags: [architecture, recommendation-system, personalization, feedback, eligibility, i18n]
status: done
verified_at: 2026-11-09
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Personalization Failure Modes", "개인화 실패 유형", "추천 실패 진단"]
---

# 개인화 실패 유형과 사용자 맥락 계약

데이터를 많이 모은 서비스도 개인화가 자주 틀린다. 원인은 데이터의 양보다 이미 가진 신호를 어떻게 해석하고, 어떤 신호가 우선하며, 무엇을 후보에서 빼는지 정한 계약이 비어 있는 경우가 많다. 사용자가 체감하는 증상에서 출발해 어느 계약이 빠졌는지 거꾸로 찾는다.

## 증상에서 빠진 계약을 찾는다

아래 표는 공개된 사용자 사례와 공식 문서의 제어 방식을 대응시킨 진단 제안이다. 특정 회사의 내부 원인을 확인한 결과가 아니다.

| 증상 | 잘못 해석한 신호 | 빠진 계약 | 먼저 볼 곳 |
|---|---|---|---|
| 방금 산 상품과 같은 종류를 계속 광고 | 구매를 관심 증가로만 반영 | 구매 완료 뒤 제외, 재구매 주기 | 후보 필터와 보유 상태 정본 |
| 설치 방법 영상을 한 번 본 뒤 홈이 같은 제품군으로 채워짐 | 일회성 과업을 지속 관심으로 취급 | 세션 의도와 장기 관심의 분리 | 후보 생성 특징과 정보 보류 |
| 수년간 같은 유형을 건너뛰어도 계속 추천 | 반복된 부정 신호를 아이템 단위로만 기억 | 부정 신호의 속성 단위 집계와 우선순위 | 피드백 데이터와 학습 label |
| 영어로 설정했는데 위치에 따라 다른 언어 화면 | 위치를 언어 선호로 추정 | 명시 설정이 추정 맥락보다 우선 | 요청 맥락과 locale 결정 |
| 배송하지 않는 지역의 광고, 이해할 자막이 없는 작품 추천 | 관심만 보고 소비 가능성을 무시 | 지역, 언어와 접근 가능성의 자격 조건 | Eligibility |
| 이미 가입한 상품을 다시 권유 | 보유와 계약 상태가 추천기에 연결되지 않음 | 고객 정본과의 동기화 | 사용자 상태 계약 |
| 해당하지 않는 생애 단계의 할인 안내 | 추정 속성을 사실처럼 사용 | 추정 속성의 신뢰도와 수정 경로 | 사용자 프로필 |

## 완료된 목적과 지속 관심을 나눈다

구매, 설치와 예약처럼 과업이 끝나는 행동은 같은 범주의 추천을 늘리는 신호가 아닐 수 있다. 내구재는 구매 뒤 같은 범주를 줄이고, 소모품처럼 재구매 주기가 있는 상품만 주기에 맞춰 다시 노출하는 규칙을 둔다.

관리형 추천 서비스에서도 제외 규칙은 명시해야 한다. 2026-11-09 Amazon Personalize 문서 기준, filter로 사용자가 이미 구매한 항목을 추천에서 뺄 수 있다. PutEvents로 기록한 구매는 수 초 안에 필터에 반영되고, 일괄 또는 개별 import 데이터는 마지막 import 뒤 20분 안에 반영된다. 상호작용 필터는 사용자별, 이벤트 유형별로 최근 100개까지만 본다(조정 가능한 quota). 3개월간 사용자의 상호작용을 import하지 않으면 필터가 과거 이력을 고려하지 않는다. 따라서 오래된 구매가 필터 창 밖으로 밀려 다시 추천될 수 있으므로, 영구적인 보유 상태는 행동 로그와 별도인 정본에서 판정한다.

최근 검색 하나가 홈을 지배하는 문제도 같은 축이다. YouTube의 2016년 후보 생성 논문은 사용자가 방금 검색한 질의의 결과 페이지를 홈 추천으로 그대로 재현하면 성능이 매우 나빴다고 보고했다. 그래서 검색어의 순서 정보를 버리고 순서 없는 토큰 묶음으로 표현해, 분류기가 정답 label이 어디서 왔는지 직접 알지 못하게 했다. 모델이 사이트 구조를 이용해 대리 문제에 과적합하지 않도록 일부 정보를 일부러 보류하는 설계다.

다음은 이를 서비스에 옮긴 제안이다.

- 과업형 질의(설치, 수리, 환불 방법)와 탐색형 질의를 구분하는 특징을 둔다.
- 세션 안의 짧은 의도와 여러 세션에 걸친 관심을 다른 특징이나 다른 후보 source로 둔다. 하나의 사용자 벡터가 여러 관심을 섞는 문제는 [[Recommendation-System-Multi-Interest-Modeling|다중 관심 사용자 표현]]에서 다룬다.
- 최근 행동의 가중치에는 감쇠를 두고, 과업 완료 신호(구매, 설치 완료)가 오면 해당 의도를 닫는다.

## 반복된 부정 신호를 속성 단위로 모은다

2026-10-23 갱신된 Spotify 안내는 검색, 청취, 건너뛰기와 보관함 저장이 취향 해석에 영향을 준다고 밝힌다. 취향 프로필에서 제외한 콘텐츠는 이후 추천에 미치는 영향이 줄고, Premium 사용자는 곡을 30일 동안 snooze할 수 있으며, not interested와 thumbs down은 비슷한 제안을 줄인다. YouTube도 Not interested의 이유를 이미 본 영상과 마음에 들지 않는 영상으로 나누고, 시청 기록과 검색 기록을 일시 중지하는 제어를 둔다.

건너뛰기 한 번은 곡 자체, 상황과 기분이 섞인 모호한 신호이므로 확정적인 dislike로 저장하지 않는다([[Recommendation-System-Feedback-Data#미관측과 부정 신호를 구분한다|미관측과 부정 신호]]). 반대로 같은 속성(예: 보컬이 있는 전자음악)에 대한 반복된 건너뛰기는 아이템 단위로 흩어 두면 패턴이 보이지 않는다. 장르, 보컬 유무와 분위기 같은 속성으로 집계하고, 명시적 부정 신호가 행동량 기반 점수에 묻히지 않도록 우선순위를 정한다.

반영 여부는 전체 평균 지표로는 드러나기 어렵다. 다음과 같은 사용자 단위 guardrail을 제안한다.

- not interested 또는 제외 뒤 같은 항목과 같은 속성의 재노출률
- 반복 건너뛰기 속성의 추천 비중 변화
- 명시 피드백이 학습 label과 후보 필터 양쪽에 반영되기까지의 지연

## 명시 설정은 추정 맥락보다 우선한다

Google Search Central은 사용자가 쓰는 것으로 추정한 언어에 따라 다른 언어 버전으로 자동 이동시키지 말라고 권한다. 사용자와 검색 엔진이 다른 버전을 볼 수 없게 될 수 있기 때문이다. 또 IP 위치 분석은 어렵고 대체로 신뢰하기 어려우므로 IP 분석으로 콘텐츠를 바꾸지 말고 `hreflang`, 별도 URL과 명시적 링크를 쓰라고 안내한다. W3C 국제화 문서도 `Accept-Language` 헤더만으로 사용자의 locale을 정하지 말고, 사용자가 언어를 바꿀 수 있게 하며 그 선택을 다음 방문을 위해 저장하라고 권한다.

이를 개인화 요청 맥락에 옮기면 다음 우선순위를 검토할 수 있다(설계 제안).

1. 사용자가 직접 바꾼 언어와 지역 설정
2. 계정에 저장된 언어
3. 브라우저나 기기의 언어 선호
4. 위치 추정

위치는 배송 가능성, 법적 제공 범위와 통화처럼 위치가 실제로 결정하는 조건에 쓴다. 여행 중인 현재 위치와 거주지를 다른 필드로 두면 일시적인 이동이 언어와 장기 관심을 덮어쓰지 않는다.

## 관심과 소비 가능성을 분리한다

관심 점수가 높아도 배송할 수 없는 지역, 사용자가 이해할 자막이나 음성이 없는 작품, 이미 보유한 계약은 랭킹 이전 또는 최종 재검사에서 걸러야 한다. 무엇을 모든 화면에서 막고 무엇을 화면별로 완화할지는 [[Recommendation-System-Eligibility-Availability|추천 자격 조건과 가용성]]의 보편 제약과 surface 제약으로 나눈다.

자녀 유무, 생애 단계처럼 행동에서 추정한 속성은 확률 값이다. 사용 범위, 신뢰도 기준과 사용자가 고칠 수 있는 경로를 함께 정한다. 민감한 속성은 정당한 목적과 접근 통제가 있을 때만 다룬다.

## 더 수집하기 전에 확인할 것

- 이미 가진 구매와 보유 상태, 언어 설정, 명시 부정 피드백이 서빙 경로까지 연결되는가
- 이벤트에 과업 완료를 나타내는 신호가 있는가
- 같은 사용자의 여러 서비스나 화면이 서로 다른 언어 결정 규칙을 쓰지 않는가
- 관리형 추천 서비스의 필터 창, 반영 지연과 이력 보존 조건을 알고 있는가
- 실패 증상별 노출률(보유 상품 재노출, 언어 불일치, 배송 불가 노출)을 실험의 guardrail로 두는가

## 사례: 한 사용자가 기록한 개인화 실패

2026-11-03 한 개발자 블로그 글은 핀란드에 사는 저자가 겪은 사례를 모았다. 방금 산 게임패드와 다른 게임패드 광고, 수년간 보컬이 있는 전자음악을 건너뛰어도 Spotify와 YouTube Music이 패턴을 반영하지 못한 경험, 영어 설정인데 핀란드어 도움말로 이동한 경험, 독일 여행 중 독일어로 바뀐 서비스, 핀란드로 배송하지 않는 회사의 광고, 오븐 설치 영상을 본 뒤 오븐과 스토브 영상으로 채워진 홈 화면, 이미 가입한 보험의 재권유, 자녀가 없는데 받은 아동 상품 할인, 영어 자막이 없는 외국 작품 추천이 포함된다. 저자는 더 많은 수집이 아니라 이미 수집한 데이터를 쓰라고 요청한다.

개인의 관찰이며 각 서비스의 내부 원인은 확인되지 않았다. 위 진단표의 증상 예로만 사용한다.

## 확인 범위

2026-11-09 Amazon Personalize의 filter 문서, Google Search Central의 다국어 사이트 안내, W3C 국제화 문서, YouTube 고객센터와 Spotify의 추천 안내를 대조했다. YouTube 논문은 3.3절과 3.4절의 검색 기록 표현과 label 선택 설명을 원문으로 확인했다. 실제 서비스에서 실패율을 측정하거나 제안한 우선순위와 guardrail을 실험한 기록은 아니다.

## 출처

- [I wish tech companies knew more about me — Rakhim's blog](https://rakhim.exotext.com/i-wish-tech-companies-knew-more-about-me) — 2026-11-03 게시, 사례 목록만 사용
- [Deep Neural Networks for YouTube Recommendations — Covington, Adams, Sargin (RecSys 2016)](https://research.google.com/pubs/archive/45530.pdf) — 3.3절 검색 기록과 지역, 3.4절 마지막 검색 결과 재현의 실패와 정보 보류
- [Amazon Personalize, Filtering recommendations and user segments](https://docs.aws.amazon.com/personalize/latest/dg/filter.html) — 구매 항목 제외 예와 필터 반영 지연
- [Amazon Personalize, Filter expressions](https://docs.aws.amazon.com/personalize/latest/dg/filter-expressions.html) — 이벤트 유형별 최근 100개, 3개월 미import 시 과거 이력 미고려
- [Google Search Central, Managing multi-regional and multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) — 추정 언어 기반 자동 이동과 IP 분석 지양
- [W3C, Accept-Language used for locale setting](https://www.w3.org/International/questions/qa-accept-lang-locales) — 언어 변경 허용과 선택 저장
- [YouTube Help, Manage your recommendations & search results](https://support.google.com/youtube/answer/6342839?hl=en)
- [Spotify, Understanding recommendations on Spotify](https://www.spotify.com/us/safetyandprivacy/understanding-recommendations) — 2026-10-23 갱신 기준

## 관련 문서

- [[Recommendation-System-Feedback-Data|추천 시스템 피드백 데이터]] — explicit와 implicit 신호, 미관측과 부정 신호
- [[Recommendation-System-Eligibility-Availability|추천 자격 조건과 가용성]] — 보편 제약과 surface 제약
- [[Recommendation-System-Candidate-Generation|후보 생성]]
- [[Recommendation-System-Multi-Interest-Modeling|다중 관심 사용자 표현]]
- [[Recommendation-System-Online-Experimentation-Statistics|온라인 실험 통계]] — guardrail 지표 설계
- [[Personalization-Recommendation|개인화와 추천의 비즈니스 관점]]
- [[Recommendation-System-Contracts|추천 시스템 데이터와 서빙 계약]]
