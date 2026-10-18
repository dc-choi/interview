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

## 요청을 다 반영하면 안 되는 이유

사용자 요청은 해결책의 형태로 들어오지만 그 뒤의 문제는 따로 있다. 요청을 다루는 방식은 세 단계로 나눌 수 있다.

| 방식 | 하는 일 | 한계 |
|---|---|---|
| Output-driven | 들어온 요청을 모두 만든다 | 기능은 늘지만 핵심 지표가 움직이지 않을 수 있다 |
| Prioritization-driven | 요청 일부만 골라 만든다 | 효율은 좋아도 근본 원인은 남는다 |
| Problem-driven | 문제를 재정의하고 흐름을 다시 짠다 | 문제 정의가 틀리면 전체가 빗나가므로 행동 데이터로 확인해야 한다 |

온보딩 예시: 툴팁, 버튼 색, 진행 표시줄, 환영 모달 요청을 모두 반영해도 활성화가 거의 오르지 않는다면, 문제를 사용자가 가치를 이해하기 전에 이탈한다로 재정의한다. 그러면 해결책은 가입 전에 결과를 먼저 보여주기, 첫 1분 안에 핵심 기능을 쓰게 하기처럼 흐름 자체를 바꾸는 쪽으로 나온다.

- 자잘한 요청 여러 개가 하나의 문제를 가리킬 수 있으므로 요청을 모아 공통 패턴을 찾는다. [[#JTBD 인터뷰 기법|JTBD]]로 요청 뒤의 진전을 묻는다.
- 결제 제안의 타이밍도 같은 문제 안에 있다. 가치를 경험하기 전의 결제 요구는 이탈 원인이 될 수 있다.
- 기회와 해결책을 분리하는 [[#Continuous Discovery (Teresa Torres)|Continuous Discovery]]의 기회 해결 트리와 같은 원리다.

## SaaS 전환에서는 고객군별 사용 차이를 조사한다

구축형 제품을 SaaS로 바꿀 때 기존 고객의 요구를 새 고객군에도 그대로 적용하지 않는다. 사용자와 구매자의 역할, 업무 수행 환경과 도입 기대를 구분하고 대상 고객의 자료로 가정을 다시 확인한다. 온보딩은 계정을 만드는 단계뿐 아니라 고객이 가치를 얻기까지 필요한 업무와 운영 준비도 포함한다.

다음은 고객 조사와 온보딩 원칙을 적용한 점검 제안이다.

- 같은 기능을 잘 쓰는 고객과 거의 쓰지 않는 고객을 나누어 최근의 실제 업무를 묻는다. 사용량 차이만으로 원인을 확정하지 않는다.
- 담당자, 입력 자료, 업무 절차가 준비되어 있는지 확인한다. 기능 부족, 사용성 문제와 고객의 업무 준비 부족을 서로 다른 가설로 둔다.
- 구매자의 도입 결정과 실사용자의 반복 사용을 따로 확인한다. 계약 고객 수를 사용 정착의 증거로 대신하지 않는다.
- 첫 가치 경험까지 걸린 시간과 그 전에 막힌 단계를 기록한다. 공통 문제는 제품 개선 후보로, 특정 고객만의 요구는 별도 검토 대상으로 분류한다.
- 개선 후 같은 고객군에서 실제 과업 완료와 재사용이 달라졌는지 본다. 대상 고객군을 바꾸면 이전 결과를 새 집단에 그대로 일반화하지 않는다.

이 점검은 모든 저사용 고객을 포기하거나 고객별 기능을 추가하라는 기준이 아니다. 관찰과 인터뷰로 병목을 좁힌 뒤 기능, 온보딩 또는 목표 고객군 중 무엇을 바꿀지 결정한다.

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

### 연구 참여자 모집과 고객 획득을 구분한다

인터뷰 참여자를 모았다는 사실은 실제 고객을 반복해서 획득할 수 있다는 증거와 다르다. 연구 질문에 맞춰 최근의 실제 문제, 수행한 행동과 역할을 모집 기준으로 정한다.

| 모집 조건 | 결과를 해석할 때 확인할 한계 |
|---|---|
| 해당 주제에 관심 많은 커뮤니티 | 이미 문제를 알고 탐색하는 사람에게 편중될 수 있음 |
| 창업자의 지인 | 관계가 참여와 긍정적 반응에 영향을 줄 수 있음 |
| 연구 보상을 받은 참여자 | 시간과 참여에 대한 보상이며 자발적 구매 행동과 구분해야 함 |
| 기존 사용자 | 현재 사용 경험은 관찰할 수 있지만 처음 발견하는 과정은 별도 확인 필요 |

이 표본도 사용성 문제와 실제 업무를 이해하는 데 쓸 수 있다. 결과 전체를 무효로 보거나, 반대로 전체 시장을 대표한다고 보지 않는다. 모집 경로와 대상 조건, 연구 보상 여부를 해석에 함께 남긴다.

적합한 참여자를 구하지 못했다면 접근 채널, 모집 메시지, 참여 부담과 문제 발생 빈도를 나누어 확인한다. 모집 실패만으로 수요가 없다고 단정하지 않는다. 반대로 문제를 이미 아는 사람에게 해결책을 보여준 실험으로 무인지 고객의 발견 경로까지 검증했다고 주장하지 않는다.

이 구분은 초기 정보 서비스의 실험 설계에서 얻은 점검 방법이다. 보상 없이 실제로 찾아와 가치를 경험하고 구매하는 경로의 반복성은 [[Solo-Product-Market-Validation|시장 검증]]과 [[GTM-Strategy|획득 채널]]에서 별도로 확인한다.

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

### 부분 지표의 개선과 최종 성과를 분리한다

피드백을 제품 변경으로 옮겼다면 어느 단계의 행동이 달라졌는지와 제품 전체의 목표가 달라졌는지를 함께 확인한다. 다음은 전체 평가 지표, 기능 진단 지표와 악화를 막을 보호 지표를 구분해 적용하는 예다.

| 관찰한 변화 | 추가로 확인할 결과 |
| --- | --- |
| 추천 목록 앞쪽의 클릭 증가 | 뒤쪽 클릭 감소를 포함한 전체 반응과 사용자의 과업 완료 |
| 입력 단계의 이탈 감소 | 다음 단계 이탈과 최종 제출 완료율 |
| 알림을 보낸 시각 부근의 접속 집중 | 기존 발송 정책의 영향과 새 발송 정책의 효과를 구분할 비교 조건 |

앞 단계의 개선이 다음 단계의 이탈로 상쇄될 수 있다. 과거 행동도 기존 제품 정책 아래에서 수집된 것이므로 사용자의 고정된 선호라고 단정하지 않는다. 개선이 보이지 않으면 원인을 확정하기보다 다음 조사와 실험의 가설로 남긴다.

실험 전 대상 집단, 지표의 분모, 관찰 기간과 보호 지표를 정하고 계측 누락과 집단 배분 이상도 확인한다. 중간 수치를 반복해서 본 뒤 유리한 시점에 성공을 선언하지 않는다. 조기 판단에는 반복 관측에 맞는 통계 처리가 필요하다.

## 고객 관계와 개별 접점의 평가를 나눈다

특정 상담이 편했는지와 그 회사를 계속 선택하고 싶은지는 다른 질문이다. 전체 관계 지표가 좋아졌다는 이유로 모든 접점이 개선됐다고 보거나, 한 접점의 점수로 브랜드 전체의 성장 원인을 확정하지 않는다. Kantar의 ExperienceEvaluator도 고객 관계와 전체 경험의 지표를 접점별 성과 및 영향 요인과 구분한다(2026-10-16 공식 안내 확인).

다음은 작은 제품에 적용할 조사 설계 예다.

| 질문 | 함께 확인할 자료 |
|---|---|
| 이번 과업을 끝내기 쉬웠는가 | 과업 완료, 오류, 소요 시간과 직후의 자유 응답 |
| 다른 대안보다 이 제품을 선택할 이유가 있는가 | 최근 선택과 전환 경험, 실제 재사용과 이탈 |
| 어느 부분을 바꿔야 하는가 | 같은 과업의 행동 로그, 인터뷰와 직접 관찰 |

탐색이 어렵다는 응답만으로 메뉴 구조를 고치지 않는다. 사용자가 어떤 정보를 찾았고 어디에서 막혔는지 관찰해 메뉴, 본문과 검색 결과 중 원인을 좁힌다. 설정 화면을 자주 열지 않아도 설정한 알림이 계속 가치를 줄 수 있으므로, 클릭 빈도만으로 기능의 필요성을 판단하지 않는다. 이는 조사 가설을 만드는 예이며 개별 기능의 유지 결정을 대신하지 않는다.

GOV.UK의 사용자 연구 지침은 분석과 검색 로그 같은 기존 자료를 인터뷰 및 실제 사용자 관찰과 함께 확인하도록 안내한다. 정량 자료로 변화의 위치를 찾고 정성 자료로 가능한 이유를 좁힌 뒤, 변경의 효과는 별도 비교로 확인한다.

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
- [Kantar Marketplace, What are the key metrics evaluated? | ExperienceEvaluator](https://marketplacesupport.kantar.com/support/solutions/articles/77000585004-what-are-the-key-metrics-evaluated-experienceevaluator) — 고객 관계와 접점별 평가의 구분
- [GOV.UK, Learning about users and their needs](https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs) — 로그, 인터뷰와 관찰의 결합
- [How to Build a Differentiated Customer Experience with Kantar — Amazon Web Services](https://www.youtube.com/watch?v=YIXRcoeBn88) — 2025년 발표 09:46~15:30, 23:47~29:52의 측정 범위와 기능 사용 해석 사례
- [Microsoft Research, Patterns of Trustworthy Experimentation: During-Experiment Stage](https://www.microsoft.com/en-us/research/articles/patterns-of-trustworthy-experimentation-during-experiment-stage/) — 전체 평가, 기능 진단, 보호 지표와 반복 관측의 해석
- [당근 팀, 흩어진 동네 소식을 모아 매일 아침 배달하기까지](https://www.youtube.com/watch?v=iCeOA-y_nP4) — 알림 시각과 지면 순서 실험의 공개 실무 사례
- [당근 팀, 부채에 발목 잡히지 않고 J-Curve를 밟아 나가기](https://www.youtube.com/watch?v=tVn1DB9fKwY) — 입력 단계 이탈과 최종 게시 성과를 구분한 공개 실무 사례
- [AWS SaaS Journey Framework, Key Activities — Product Strategy](https://docs.aws.amazon.com/whitepapers/latest/saas-journey-framework/key-activities-1.html) — 사용자와 구매자, 고객 자료 수집, 온보딩과 첫 가치 경험
- [GOV.UK, Finding participants for user research](https://www.gov.uk/service-manual/user-research/find-user-research-participants) — 연구 목적에 맞춘 모집, 경로별 편향과 참여 보상
- [Intercom, RICE: Simple prioritization for product managers](https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/)
- [Product Talk, Continuous Discovery Habits](https://www.producttalk.org/continuous-discovery-habits-book/)
- [Product Talk, Opportunity Solution Trees](https://www.producttalk.org/opportunity-solution-trees/)
- [Nielsen Norman Group, Interviewing Users](https://www.nngroup.com/articles/interviewing-users/)
- [승무원을 위한 서비스 분석 — 쪼렙 서비스기획자 (Brunch)](https://brunch.co.kr/@b30afb04c9f54dc/60)

## 관련 문서
- [[Product-Owner-Role|PO(Product Owner)의 역할과 책임]]
- [[PMF-Funnel|PMF 검증 & 전환 퍼널]]
- [[Solo-Product-Opportunity-Discovery|1인 제품 기회 발견]]
- [[Risk-Management|리스크 관리]]
- [[GTM-Strategy|GTM 전략 (니치 버티컬의 사용자 기반 확장)]]
