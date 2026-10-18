---
tags: [palantir, foundry, contour]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 비결정성, 시간대와 주차 계산 검증

동일한 입력과 path라도 window 정렬 동률이나 분산 double 집계의 연산 순서 때문에 값이 달라질 수 있다. Mean/sum/variance 등 double 집계를 정확히 같은 값으로 필터하거나 join key로 쓰면 미세한 오차가 행 수를 바꾼다. 허용 오차와 안정적인 key를 정한다.

Bucketing timezone은 board별 고정 시간대로 집계 경계를 정한다. Visualization timezone은 analysis 전체의 표시 방식으로 사용자 local을 선택할 수 있다. 같은 bucket이 다른 시각으로 보이는 것과 서로 다른 데이터를 집계한 것은 다르다. 구형 분석은 표시 timezone 미설정으로 board마다 다르게 보일 수 있다. 원문의 EDT/UTC 예시 시각은 방향 설명과 맞지 않으므로 숫자 예제를 그대로 복제하지 않는다.

Mesa DateTime은 UTC timestamp와 원래 timezone 문자열 두 컬럼으로 바뀐다. CURRENT_DATE/TIMESTAMP는 화면을 다시 보는 시점이 아닌 path update 시점의 값이다.

## 상대 주차 예제의 반례

공식 relative-dates 예제는 `year * 100 + ISO week` 형태의 정수에서 9를 빼 최근 8주를 고른다. 이 계산은 연도 경계를 넘어 실제 8주를 표현하지 못하며 ISO week-year와 calendar year도 다를 수 있다. 마지막 label 예제는 앞서 만든 departure_week 대신 calendar_week를 참조한다.

원천 데이터의 최대 주를 현재 주로 보는 가정도 지연 데이터에서 성립하지 않는다. 재사용 시 주 시작 날짜와 명시적인 기준 시각으로 기간을 비교하고 연말/연초, 53주, 누락된 주, 데이터 지연을 검증한다. 원문 설명을 학습했지만 해당 예제를 실행 검증 완료로 취급하지 않는다.

## 출처

- [Palantir, correctness-non-determinism](https://www.palantir.com/docs/foundry/contour/correctness-non-determinism)
- [Palantir, correctness-timezones](https://www.palantir.com/docs/foundry/contour/correctness-timezones)
- [Palantir, expressions-relative-dates](https://www.palantir.com/docs/foundry/contour/expressions-relative-dates)

## 관련 문서

- [[Palantir-Contour]]
- [[Palantir-Pipeline-Builder]]
