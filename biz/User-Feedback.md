---
tags: [business, product, feedback]
status: done
category: "비즈니스&제품(Business&Product)"
aliases: ["User Feedback", "사용자 피드백", "Kano Model"]
---

# 사용자 피드백 관리

## Kano 모델

Noriaki Kano(1984)가 제안한 고객 만족도 분류 프레임워크이다.

| 유형 | 설명 | 없으면 | 있으면 |
|---|---|---|---|
| **Must-be (기본)** | 있어야 당연한 것 | 불만 | 만족 증가 없음 |
| **One-dimensional (비례)** | 있으면 만족, 없으면 불만 | 불만 | 비례적 만족 |
| **Attractive (매력)** | 기대하지 않았지만 감동 | 영향 없음 | 큰 만족 |
| **Indifferent (무관심)** | 있든 없든 상관없음 | — | — |
| **Reverse (역효과)** | 있으면 오히려 불만 | — | 불만 |

시간이 지나면 Attractive → One-dimensional → Must-be로 이동한다 (기대치 상승).

## 기능 우선순위 프레임워크

### RICE
- **R**each: 영향받는 사용자 수
- **I**mpact: 개인당 영향도 (3/2/1/0.5/0.25)
- **C**onfidence: 추정의 확신도 (%)
- **E**ffort: 투입 공수 (인월)
- **점수:** (R × I × C) / E

### ICE
- **I**mpact × **C**onfidence × **E**ase
- RICE보다 단순, 빠른 판단에 적합

### MoSCoW
- **Must-have** / **Should-have** / **Could-have** / **Won't-have**
- 범위(scope) 합의에 적합, 정량적이지 않음

**실무:** RICE로 정량 점수, MoSCoW로 범위 합의, Kano로 고객 관점 확인 — 함께 사용한다.

## Marty Cagan의 4가지 제품 리스크

구현 전에 검증해야 할 4가지 리스크이다 (INSPIRED, 2018).

| 리스크 | 질문 | 담당 |
|---|---|---|
| **Value** | 고객이 사거나 쓸 것인가? | PM |
| **Usability** | 사용법을 알아낼 수 있는가? | Designer |
| **Feasibility** | 기술적으로 만들 수 있는가? | Engineer |
| **Viability** | 비즈니스적으로 성립하는가? | PM |

## JTBD 인터뷰 기법

Clayton Christensen이 체계화하고, Bob Moesta가 실용적 인터뷰로 발전시킨 기법이다.

**핵심:** 과거의 실제 전환(switching) 경험을 타임라인으로 파헤친다.
- 최초 인식 → 수동 탐색 → 능동 탐색 → 전환 결정

**질문 예시:**
- "처음으로 '다른 방법이 필요하다'고 느낀 순간은?"
- "그 전에는 어떻게 해결하고 있었나요?"
- "다른 대안도 찾아보셨나요?"
- "최종적으로 선택한 결정적 순간은?"

**Job Statement:** "When [상황], I want to [동기], so I can [기대 결과]"

## Continuous Discovery (Teresa Torres)

매주 최소 1명의 고객과 접점을 유지하며 지속적으로 기회를 발견하는 방법론이다 ("Continuous Discovery Habits", 2021).

**Opportunity Solution Tree:**
- **Outcome** (비즈니스 목표) → **Opportunity** (고객 니즈/페인) → **Solution** (아이디어) → **Experiment** (가설 검증)

**핵심 습관:**
1. 매주 최소 1명 고객과 대화 — 이벤트가 아닌 습관
2. 기회(Opportunity)와 솔루션(Solution)을 분리 — 솔루션으로 바로 뛰어가지 않음
3. 가정을 식별하고 가장 위험한 것부터 테스트
4. Outcome은 기능이 아닌 지표로 정의 (나쁜 예: "알림 구현" / 좋은 예: "주간 활성률 25%")

## 현장 적용: school-manage

- **피드백 흐름:** 수집(카톡/전화/GA4) → 기록 → 분류(사업/기능/신규/버그) → 우선순위 → SDD TARGET 등록
- **반복 요청 → 상향:** "학생 추가 필드" 2곳 반복 피드백 → P1 등록
- **피드백 → 구조적 전환:** 신당동/금호동 "공유 계정 혼란" → 전체 계정 모델 전환
- **무언의 피드백:** GA4 14일 미활동 감지 → 자동 이탈 알림

## 면접 포인트

Q. 사용자 피드백을 어떻게 관리하는가?
- Kano 관점: 기본(출석)은 완벽히, 매력(축일 카드)은 차별화로 활용
- 반복 빈도 + RICE 점수로 우선순위화
- 이탈 사용자는 피드백을 주지 않으므로 GA4로 "무언의 이탈" 감지

## 관련 문서
- [[PMF-Funnel|PMF 검증 & 전환 퍼널]]
- [[Risk-Management|리스크 관리]]
