---
tags: [business, marketing, web-analytics, advertising]
status: done
verified_at: 2026-10-24
category: "비즈니스&제품(Business&Product)"
aliases: ["웹사이트 트래픽과 광고 수익", "Website Traffic and Ad Revenue"]
---

# 웹사이트 트래픽과 광고 수익

무료 도구 사이트의 방문 규모는 수요를 조사할 단서다. 외부 서비스가 추정한 트래픽, 운영자가 측정한 이용량과 광고 수익을 구분해야 수익성을 과대평가하지 않는다.

## 방문자, 방문과 페이지뷰를 구분한다

Similarweb의 Total Visits는 방문(session)의 합계다. 한 번의 방문에 여러 페이지뷰가 포함될 수 있다. 따라서 방문 횟수를 고유 방문자 수나 사람 수로 바꾸어 읽지 않는다.

`페이지뷰 = 방문 수 × 방문당 페이지뷰`는 같은 기간, 기기와 지역 범위의 지표를 사용한다는 조건에서 적용하는 계산이다. 고유 방문자 수에 방문당 페이지뷰를 곱하면 분모가 맞지 않는다. 외부 추정값으로 계산한 결과도 실측값으로 바뀌지는 않는다.

## Page RPM으로 계산해도 수익은 가정에 의존한다

Google AdSense의 정의는 `Page RPM = 예상 수입 ÷ 페이지뷰 × 1,000`이다. 같은 보고 범위의 값을 사용하면 `예상 수입 = 페이지뷰 ÷ 1,000 × Page RPM`으로 정리할 수 있다. 외부 서비스의 전체 페이지뷰 추정치를 AdSense 보고서의 페이지뷰와 같다고 가정하지 않는다.

계산 예로, **가정한** 페이지뷰가 100만이고 Page RPM이 2달러라면 예상 수입은 2,000달러다. 이는 특정 사이트의 수익이나 일반적인 RPM을 뜻하지 않는다. RPM을 모르면 트래픽만으로 실제 광고 수입을 확정할 수 없다. 수입에서 호스팅, 제작과 유지보수 비용을 빼는 사업성 판단도 별도로 필요하다.

## 외부 사이트 사례를 검토하는 순서

다음은 지표 정의에서 도출한 조사 절차다.

1. 대상 도메인, 조회 기간, 지역, 기기와 지표 이름을 확인한다.
2. 고유 방문자, 방문, 페이지뷰와 방문당 페이지뷰를 나누고 실제 보고서와 추정 서비스를 구분한다.
3. 수익 자료가 없으면 RPM을 여러 가정으로 두어 시나리오만 계산한다.
4. 자체 실험에서는 이용량과 광고 보고서, 비용을 함께 비교한다. 다른 사이트의 트래픽을 새 사이트의 예상 성과로 옮기지 않는다.

2026-10-18 공개된 무료 바코드 사이트 소개 영상은 외부 추정 기준 월 약 50만 방문자와 1인당 2페이지 이상을 언급한다. 확보한 전사문만으로는 대상 도메인, 측정 기간과 실제 지표명이 확인되지 않는다. 월 100만 페이지뷰와 온라인 자산 가치는 검증된 사실로 사용하지 않으며, 설명란에 연결된 전체 영상에서 측정 화면과 조건을 추가로 확인해야 한다.

## 반복 작업의 불편을 기능 가설로 바꾼다

무료 도구의 출발점은 기존 서비스의 매출 추정만이 아니라 사용자가 반복하는 작업일 수 있다. 예를 들어 바코드를 하나씩 입력하고 생성하는 작업은 여러 값을 한 번에 처리하는 기능의 후보가 된다. 다만 자신이 겪은 불편 하나가 충분한 시장 수요나 광고 수익을 입증하지는 않는다.

다음은 도구 사이트에 적용할 검증 제안이다.

1. 기존 작업에서 반복 입력과 결과 저장에 드는 시간을 관찰한다.
2. 일괄 처리처럼 불편을 줄일 기능 하나를 만들어 같은 작업의 완료 시간과 오류를 비교한다.
3. 기능을 쓴 사람이 다시 사용하는지 확인하고, 광고 승인과 유입 및 수입은 별도로 측정한다.

Google의 AdSense 준비 안내는 방문자에게 관련 있는 독자적 콘텐츠와 좋은 사용 경험을 요구한다. 2026-10-26 해당 안내를 대조했으며, 위의 기능 실험은 이를 도구 사이트에 적용한 제안이다. 기능 개선만으로 승인이나 수익이 보장된다는 뜻은 아니다.

## 광고 심사와 수익 예측을 분리한다

2026-10-24 Google 공식 안내 대조: 검색에서 AI 콘텐츠를 다루는 기준과 AdSense 광고 게재 정책은 적용 대상이 다르다. Google Search는 순위 조작이 목적이 아닌 적절한 AI 활용을 허용하지만, 그 설명을 광고 승인 보장으로 옮기지 않는다. 게시자 정책은 콘텐츠가 없거나 가치가 낮은 화면, 공사 중인 화면의 광고를 금지하고, 사람의 검토나 선별을 거치지 않은 자동 생성 콘텐츠에도 광고를 두지 않도록 안내한다.

신청 전에는 방문자에게 필요한 독자적인 내용과 사용하기 쉬운 탐색 구조를 점검한다. 외부 자료를 이용할 때는 전문 지식, 개선 아이디어나 실제 후기처럼 자체 내용을 보탠다. 메뉴의 정렬, 글자 가독성과 기능도 확인한다. 확인한 준비 안내에는 글 개수나 글자 수로 승인 여부를 정하는 합격선이 없다.

사이트의 승인 상태와 `ads.txt` 상태도 별개다. `Needs attention`은 해결할 문제가 있다는 뜻이고, `Getting ready`는 확인 중인 상태다. `Ready`는 광고를 게재할 준비가 됐다는 뜻이며 계속 정책을 준수해야 한다. `ads.txt`의 `Authorized`는 게시자 ID를 찾았다는 뜻이므로 콘텐츠 심사 통과와 같다고 보지 않는다.

적용 제안: 도구 사이트에는 실제 동작, 사용법과 한계를 검토하고 빈 페이지와 작동하지 않는 메뉴를 먼저 고친다. 경험을 지어내거나 페이지 수만 늘리는 방식으로 빈틈을 채우지 않는다. 심사 통과, 실제 유입, 광고 수입과 비용을 뺀 이익을 서로 다른 단계로 기록한다.

## 출처

- [Google Search's guidance about AI-generated content — Google Search Central](https://developers.google.com/search/blog/2023/02/google-search-and-ai-content)
- [Google Publisher Policies, Google-served ads on screens without publisher-content](https://support.google.com/publisherpolicies/answer/11112688?hl=en)
- [Google AdSense Help, Make sure your site's pages are ready for AdSense](https://support.google.com/adsense/answer/7299563?hl=en)
- [Google AdSense Help, Check the status of your AdSense sites](https://support.google.com/adsense/answer/12170222?hl=en)

- [Similarweb, Total Visits](https://support.similarweb.com/hc/en-us/articles/212999769-Total-Visits) — 2026-10-24 방문과 페이지뷰의 구분 확인.
- [Google AdSense Help, Page RPM](https://support.google.com/adsense/answer/112030?hl=en) — 2026-10-24 산식 확인.
- [무료 바코드 사이트 하나에 한 달 몇 명이 들어올까 — YouTube, AI, AX 업무 자동화 타니](https://www.youtube.com/watch?v=TLK7OLNUieI) — 2026-10-18 공개 영상. 조사 계기로만 사용하며 트래픽과 수익을 입증하는 자료로 사용하지 않았다.
- [애드센스 사이트를 만들게 된 의외의 계기 — YouTube, AI, AX 업무 자동화 타니](https://www.youtube.com/watch?v=bVT2hcJ_PeY) — 2026-10-20 공개된 제작자의 경험 설명. 반복 입력을 줄이는 기능 가설의 계기이며 수요와 수익의 검증 자료는 아니다.

## 관련 문서

- [[Metrics-Framework|지표 설계]]
- [[Content-Marketing|콘텐츠 마케팅]]
- [[Lead-Magnet-and-Entry-Offer|리드 마그넷과 진입 제안]]
