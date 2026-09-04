---
tags: [business, product, feedback, discovery]
status: done
category: "비즈니스&제품(Business&Product)"
aliases: ["User Feedback", "사용자 피드백", "Kano Model"]
---

# 사용자 피드백 관리

이 문서는 제품을 운영하며 들어오는 피드백을 수집하고 해석해 우선순위를 정하는 방법을 다룬다. 새로운 문제와 욕망에서 기회를 찾는 절차는 [[Solo-Product-Opportunity-Discovery|1인 제품 기회 발견]]에서 다룬다.

## Kano 모델

Noriaki Kano(1984)가 제안한 고객 만족도 분류 프레임워크이다.

| 유형 | 설명 | 없으면 | 있으면 |
|---|---|---|---|
| **Must-be (기본)** | 있어야 당연한 것 | 불만 | 만족 증가 없음 |
| **One-dimensional (비례)** | 있으면 만족, 없으면 불만 | 불만 | 비례적 만족 |
| **Attractive (매력)** | 기대하지 않았지만 감동 | 영향 없음 | 큰 만족 |
| **Indifferent (무관심)** | 있든 없든 상관없음 | — | — |
| **Reverse (역효과)** | 있으면 오히려 불만 | — | 불만 |

기대치가 바뀌면 Attractive 기능이 One-dimensional 또는 Must-be로 이동할 수 있다. 모든 기능이 같은 순서로 이동하는 것은 아니다.

## 기능 우선순위 프레임워크

### RICE
- **R**each: 영향받는 사용자 수
- **I**mpact: 개인당 영향도 (예: 3/2/1/0.5/0.25, 팀이 일관되게 정의한 상대 척도)
- **C**onfidence: 추정의 확신도 (%)
- **E**ffort: 투입 공수 (인월, 인주 등 팀이 일관되게 정한 단위)
- **점수:** (R × I × C) / E

### ICE
- **I**mpact × **C**onfidence × **E**ase
- RICE보다 단순, 빠른 판단에 적합

### MoSCoW
- **Must-have** / **Should-have** / **Could-have** / **Won't-have**
- 범위(scope) 합의에 적합, 정량적이지 않음

**실무:** RICE로 정량 점수, MoSCoW로 범위 합의, Kano로 고객 관점 확인을 조합할 수 있다. 사용 여정 전체를 얕게 가로지르는 슬라이스로 MVP 범위를 정하는 Story Mapping은 [[Product-Roadmap|프로덕트 로드맵]] 참조.

## JTBD 인터뷰 기법

Clayton Christensen과 Bob Moesta 등의 연구와 실무에서 널리 알려진 접근이다.

**핵심:** 과거의 실제 전환(switching) 경험을 타임라인으로 파헤친다.
- 최초 인식 → 수동 탐색 → 능동 탐색 → 전환 결정

**질문 예시:**
- "처음으로 '다른 방법이 필요하다'고 느낀 순간은?"
- "그 전에는 어떻게 해결하고 있었나요?"
- "다른 대안도 찾아보셨나요?"
- "최종적으로 선택한 결정적 순간은?"

**Job Statement:** "When [상황], I want to [동기], so I can [기대 결과]"

### 간접 관찰 (인터뷰가 어려울 때)

접근하기 어려운 직군, 커뮤니티는 브이로그, SNS, 온라인 커뮤니티 같은 **공개된 일상 기록**을 관찰해 페인 포인트를 도출할 수 있다. 진행 순서: 일상 관찰 → 니즈 도출과 우선순위화(필수 vs Nice to Have) → 기존 서비스 검토 → 개선, 신규 기능 제안. 직군 고유 용어(전문 일정표, 수당 체계 등)가 보이면 그 용어를 중심으로 워크플로우를 재구성하는 것이 페인 발견의 지름길이다.

## Continuous Discovery (Teresa Torres)

제품을 만드는 팀이 원하는 제품 결과를 향해 작은 연구 활동을 수행하고, 고객과 최소 주 1회 접점을 갖는 접근이다 (《Continuous Discovery Habits》, 2021). 최소 주 1회는 Teresa Torres가 제시한 정의의 기준이다. 현실 제약 때문에 더 느슨하게 운영한다면 점진적 도입 또는 로컬 적응으로 구분하고, 고객 수와 방식은 연구 질문과 위험에 맞춘다.

**Opportunity Solution Tree:**
- **Outcome** (비즈니스 목표) → **Opportunity** (고객 니즈/페인/욕망) → **Solution** (아이디어) → **Assumption Test** (가정 검증)

**핵심 습관:**
1. 제품을 만드는 팀이 고객 접점을 최소 주간 리듬으로 운영 — 매번 고객 한 명을 인터뷰한다는 뜻은 아니며 연구 질문에 맞는 방식과 표본을 명시
2. 기회(Opportunity)와 솔루션(Solution)을 분리 — 솔루션으로 바로 뛰어가지 않음
3. 가정을 식별하고 가장 위험한 것부터 테스트
4. Outcome은 기능이 아니라 비교 가능한 결과로 정의 (예: 기준선, 목표, 대상 코호트와 관찰 기간을 정한 주간 활성률 변화)

## 1인 제품 기회 발견

제품 기회는 반복되는 불편뿐 아니라 사용자가 원하는 기능적, 감정적, 사회적 진전에서도 찾는다. 경험 도메인 인벤토리부터 행동 증거와 발견 단계 종료 조건까지의 절차는 [[Solo-Product-Opportunity-Discovery|1인 제품 기회 발견]]에서 다룬다.

## 현장 적용: school-manage

- **피드백 흐름:** 수집(카톡/전화/GA4) → 기록 → 분류(사업/기능/신규/버그) → 우선순위 → SDD TARGET 등록
- **반복 요청 → 상향:** 추가 학생 정보 항목 요청이 반복돼 P1 등록
- **피드백 → 구조적 전환:** 여러 조직에서 공유 계정 혼란이 반복돼 전체 계정 모델로 전환
- **무언의 피드백:** 장기간 GA4 미활동을 재확인 후보 신호로 사용. 미활동만으로 이탈 원인이나 확정 이탈을 판정하지 않음

## 면접 포인트

Q. 사용자 피드백을 어떻게 관리하는가?
- Kano 관점: 기본 기능은 신뢰성 기준을 먼저 지키고, 매력 기능은 차별화 가설로 검증
- 반복 빈도 + RICE 점수로 우선순위화
- 직접 피드백이 없는 사용자의 미활동 신호를 GA4로 확인하되, 후속 조사 전에는 이탈 원인으로 단정하지 않음

## 출처
- [Intercom, RICE: Simple prioritization for product managers](https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/)
- [Product Talk, Continuous Discovery Habits](https://www.producttalk.org/continuous-discovery-habits-book/)
- [Product Talk, Opportunity Solution Trees](https://www.producttalk.org/opportunity-solution-trees/)
- [Nielsen Norman Group, Interviewing Users](https://www.nngroup.com/articles/interviewing-users/)
- [승무원을 위한 서비스 분석 — 쪼렙 서비스기획자 (Brunch)](https://brunch.co.kr/@b30afb04c9f54dc/60)

## 관련 문서
- [[PMF-Funnel|PMF 검증 & 전환 퍼널]]
- [[Solo-Product-Opportunity-Discovery|1인 제품 기회 발견]]
- [[Risk-Management|리스크 관리]]
- [[GTM-Strategy|GTM 전략 (니치 버티컬의 사용자 기반 확장)]]
