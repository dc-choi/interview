---
tags: [senior, ai, ax, organization, transformation, leadership]
status: done
verified_at: 2026-08-31
category: "시니어역량(SeniorEngineer)"
aliases: ["AX Transformation", "AI Transformation", "AX 조직 전환", "AI 조직 전환"]
---

# AX(AI Transformation) — 조직 전환

AI 도구를 설치하는 것과 조직을 **AI 시대에 맞게 재설계**하는 것은 다른 문제다. 도구는 수 주 안에 배포되지만, 역할, 파이프라인, KPI, 거버넌스, 리소스 구조를 함께 움직여야 비로소 AX(AI Transformation)라 부를 수 있다. AX를 이해하지 못하면 도구만 잔뜩 산 기능 조직이 된다.

## 핵심 명제

이 문서는 AI 도입을 다음 세 단계로 구분한다. 단계와 시간 범위는 표준 분류가 아니라 조직 변화의 범위를 설명하기 위한 휴리스틱이다.

| 단계 | 주체 | 변화 대상 | 시간 |
|---|---|---|---|
| **1. AI 사용 (Usage)** | 개인 | 업무 도구 (ChatGPT, Claude) | 즉시 |
| **2. AI 도입 (Enablement)** | 조직 (IT 부서) | 라이선스, 배포, 교육, MCP | 수 주 |
| **3. AX 전환 (Transformation)** | 경영진, CEO | 조직도, 역할, 평가, 거버넌스 | 수 년 |

이 모델은 도구 배포와 교육을 마친 2단계를 조직 구조와 평가까지 바꾸는 3단계로 오인하지 말라고 경고한다.

## 5가지 변혁 축

AX 진단은 다음 다섯 축을 함께 본다. 한 축만 움직이면 국소 최적화에 그치고 조직 전체 처리 속도가 개선되지 않을 수 있다.

### 1. 역할 (Role) — 산출자 → 판단자

- **기존**: 직무별 생산자 (코드 작성, 기획서, 디자인 산출)
- **AX**: 감독자, 리뷰어, 의사결정자. AI가 산출하고 사람이 판단
- 사례: Shopify CEO는 성과 및 동료 평가 설문에 AI 사용 관련 질문을 추가하고, 추가 인력이나 자원 요청 전에 AI로 해결할 수 없는 이유를 팀이 보여야 한다고 밝혔다.

### 2. 파이프라인 (Pipeline) — 직렬 → 인간-AI 혼합

- **기존**: 부서 간 순차 핸드오프 (PM → 디자인 → 프론트 → 백엔드 → QA)
- **AX**: 에이전트와 인간의 병렬 협업. 핸드오프 최소화
- 사례: Uber는 에이전트 세션을 네 계층으로 분류하고, 특화 계층에서 Minion(의도에서 PR 생성)과 uReview(PR 코드 리뷰)를 운용한다.

### 3. KPI — 산출량 → 최종 성과

- **기존**: 배포 건수, 캠페인 수, 응답 시간
- **AX**: 전체 처리 시간, 고객 성과, 의사결정 지연, 임팩트
- 주의 사례: Klarna는 2024년 AI 상담원이 700명 이상의 풀타임 상담원에 해당하는 업무량을 처리했다고 추정했다. 2025년 CEO는 비용 절감 추구가 지나쳤다며 고객이 사람과 상담할 선택지를 위한 채용 파일럿을 밝혔다. 이를 700명을 해고한 뒤 다시 채용한 사례로 단정할 수는 없다.
- J&J 사례: 약 900개의 개별 사용 사례를 검토한 뒤 영향도와 확장성이 높은 GenAI 사례에 집중했다.

### 4. 거버넌스 (Governance) — 부서별 → 중앙 통합

- **기존**: 각 부서가 독립적으로 AI 도입 → **고속 사일로화**
- **AX**: 중앙 데이터 접근, 모델 권한, 감사 추적, 보안, 컴플라이언스
- 사례: BBVA는 CEO와 회장을 포함한 주요 임원 250명을 교육하고, 초기 도입에서 위험 평가, 법무 검토와 GDPR 준수 절차를 정리했다.

### 5. 리소스 (Resource) — 라이선스 비용 → 운영 개혁 비용

- **기존**: AI SaaS 라이선스 구매로 예산 집행 완료
- **AX**: 업무 재설계, 변화 관리, 교육, 평가 개편이 진짜 투자 대상
- 사례: Atlassian은 2026년 3월 약 10% 감원을 발표하며 AI와 엔터프라이즈 영업 투자 재원을 마련하고, System of Work를 중심으로 재조직하겠다고 밝혔다.

## 문화와 시스템이 AI 효과를 좌우하는 조건

AI는 조직의 병목을 자동으로 없애기보다 현재 일하는 방식을 증폭한다. DORA 2025는 전 세계 기술 종사자 약 5,000명의 설문과 100시간 이상의 정성 자료에서 AI 도입이 전달 처리량, 제품 성과와는 양의 관계를, 전달 안정성과는 음의 관계를 보였다고 보고했다. 내부 플랫폼, 명확한 업무 흐름, 팀 정렬과 빠른 피드백 같은 주변 조건이 효과를 좌우했다. 이는 관찰 연구의 관계이지 특정 도구나 문화가 성과를 만든다는 인과 증명은 아니다.

| 기존 조건 | AI가 키울 수 있는 결과 | 운영 대응 |
|---|---|---|
| 책임과 우선순위가 불명확함 | 중요하지 않은 산출물과 재작업 증가 | 사용자 문제, 기대 결과, 결정권자와 완료 기준 명시 |
| 승인 대기와 결합도가 큼 | 국소 산출 속도만 오르고 하류 대기와 불안정성 증가 | 가치 흐름의 대기 제거, 작은 배치, 테스트와 빠른 피드백 |
| 반대 의견과 실패 공유가 안전하지 않음 | 한계 은폐, 형식적 사용과 학습 단절 | [[Trust-Respect-Teamwork|안전한 이견 제기]], 실패와 검토 비용 공유 |
| 맥락과 품질 기준이 공유됨 | AI 산출물의 검토, 수정과 재사용 가속 | 공용 문서, 자동 검증, 관측과 롤백 유지 |

리더십은 해결할 문제, AI 사용 원칙, 데이터와 보안 경계 및 성공 기준을 명확히 하고, 현장 팀은 그 범위에서 작은 실험을 설계해 성공과 실패를 공유한다. 특정 도구를 일괄 강제하는 것과 기준 없는 자율 사용 중 하나를 고르는 문제가 아니다. 공통 경계와 현장 학습을 함께 설계해야 한다.

AI 사용률, 호출 수와 생성 코드량은 채택 활동의 보조 신호이지 생산성 KPI가 아니다. 도입 전 기준선, 목표, 영향 대상, 기대 인과, 관측 기간과 관측 뒤 결정을 정하고 리드 타임, 리뷰와 재작업, 안정성 및 고객 결과를 함께 본다. 인력 대체나 개인 사용량 평가 중심의 메시지는 고용과 평가 불안, 숫자 맞추기를 유도할 수 있으므로 도구 실험의 목적과 분리한다.

조직문화가 AI보다 더 큰 생산성 향상을 만든다는 비교 우위는 경험 기반 견해이며 이를 직접 측정한 연구 결과가 아니다. 문화와 시스템이 AI 효과를 증폭한다는 모델은 도입 전 진단과 실험 설계에 쓰고, 실제 효과는 조직의 업무 흐름에서 검증한다.

## Maker → Closer — 커리어 재정의

| 구분 | Maker (기존) | Closer (AX) |
|---|---|---|
| 책임 범위 | 내 산출물까지 | 비즈니스 KPI 달성까지 |
| 전문성 | 코드, 문서, 디자인 생산 | 방향 결정, 리뷰, 임팩트 검증 |
| AI 시대 리스크 | **산출 자체가 AI로 대체** | AI를 활용한 판단 역량으로 확장 |

**π형 인재**: 두 개 이상의 전문 분야 + 엔드투엔드 운영 능력. AI가 산출을 대신하므로 **한 사람의 책임 커버리지가 확대됨**.

주니어, 시니어의 경계가 코딩 숙련도에서 판단과 통합 책임으로 이동.

## 기능 조직의 구조적 한계

### 고속 사일로화

각 부서가 **자기 AI를 따로 최적화**하면서 부서별 AI 섬이 생긴다. 마케팅은 마케팅용 AI, 개발은 개발용 AI로 고착. 부서 안 생산성은 올라가지만 **부서 사이 병목(승인, 핸드오프)** 은 그대로다.

### 진짜 병목은 부서 사이

기능 조직의 지체 원인은 부서 안이 아니라 **부서 간 핸드오프와 우선순위 충돌**. 타 부서의 중요 프로젝트가 우선순위에 밀려 수주 지연 → CEO 개입 → 기존 작업 중단 → 시장 기회 상실이 반복된다.

### Before / After 비교

아래 수치와 흐름은 측정 결과가 아니라 핸드오프 병목을 설명하기 위한 예시다.

기능 조직의 신규 기능 출시:
- PM → 디자인 → 프론트 → 백엔드 → QA → 배포 → 분석
- 실제 작업 2일, 대기와 핸드오프 28일로 가정

AX 조직의 신규 기능 출시:
- 목적 단위 팀(엔지니어+디자이너+그로스+CS+분석가)
- AI가 데이터 분석 → 방향 제시 → 팀이 AI 초안 리뷰 → 결정 → 배포 → 실시간 성과 추적
- 핸드오프와 대기를 줄이고 전체 처리 시간을 측정

## 지역 일반화 대신 조직별로 확인한다

국내 기업 전체의 AX 성숙도나 AI 관련 고용 변화를 이 문서의 근거만으로 일반화할 수는 없다. 다음 항목을 각 조직의 실제 제도와 가치 흐름에서 확인한다.

- 역할과 평가가 산출량보다 고객 결과를 중심으로 바뀌었는가
- 결정 권한과 부서 간 핸드오프 대기가 줄었는가
- 학습과 실험 시간이 업무로 인정되는가
- 경영진이 데이터, 보안과 운영 책임까지 포함한 전환을 주도하는가

## 체감 vs 실측의 간극

METR의 2025년 RCT(무작위 대조 실험)에 따르면 숙련 개발자들이 AI 도구 사용 후 **실제로는 19% 느려졌지만 체감으로는 20% 빨라졌다**고 보고했다. 대상은 자기가 평균 5년 다뤄 익숙한 성숙한 오픈소스 저장소에서 작업한 개발자 16명, 246개 태스크였고 주로 Cursor Pro와 Claude 3.5/3.7 Sonnet을 사용했다. 낯선 코드나 보일러플레이트 작업에 그대로 일반화할 수 없는 early-2025 도구의 역사적 스냅샷이다.

METR은 2026년 후속 글에서 최신 도구의 속도 향상이 더 클 가능성은 높다고 봤지만, AI를 쓰고 싶은 태스크가 실험에서 빠지는 선택 편향과 병렬 에이전트의 시간 측정 문제 때문에 향상 폭을 신뢰성 있게 추정할 수 없다고 밝혔다. 핵심은 특정 시점의 19% 수치를 현재 도구에 적용하는 것이 아니라 체감과 실측을 분리하고 조건별로 다시 측정하는 것이다.

시사점: 도구 도입만으로 생산성 상승을 가정하지 않는다. 업무 흐름, 품질, 안정성과 고객 결과를 함께 측정한다.

## 시니어가 던져야 할 질문

조직이 AX에 어느 단계에 있는지 진단:

- 우리 조직의 **KPI가 산출량인가 임팩트인가?**
- 팀이 **목적 단위로 묶여 있는가 기능 단위로 묶여 있는가?**
- 핸드오프에 걸리는 시간이 **실제 작업 시간보다 긴가?**
- 평가 제도가 **AI 사용량이 아니라 결과, 품질과 학습을 반영하는가?**
- 구성원이 AI의 한계, 실패와 반대 의견을 **불이익 우려 없이 공유할 수 있는가?**
- 각 부서의 AI 도입이 **중앙 거버넌스 없이** 독립 진행되는가?
- CEO, 경영진이 **구조 개편 리더십**을 발휘하는가?

이 질문은 진단 대화를 여는 휴리스틱이다. 우려 답변 개수만으로 성숙도를 판정하지 말고 실제 가치 흐름과 결과 지표로 확인한다.

## 검토할 가설

- AI 도입이 기존 역할, 승인 구조와 사일로를 강화할 수 있다.
- AI Native 조직은 업무 재설계까지 이뤘을 때 속도 우위를 만들 수 있다.
- 채용 보수화에는 경기, 비용과 수요 외에도 미래 역할 구조에 대한 불확실성이 영향을 줄 수 있다.

## 면접 체크포인트

- **AI Usage / Enablement / Transformation 3단계** 차이
- **5가지 변혁 축** (역할, 파이프라인, KPI, 거버넌스, 리소스)
- **Maker vs Closer** 차이와 AI 시대 커리어 의미
- 기능 조직의 **고속 사일로화** 현상
- "핸드오프가 진짜 병목"이라는 관점
- 문화와 시스템이 AI 효과를 증폭한다는 모델과 근거의 경계
- **METR 체감 vs 실측 간극** 연구의 시사점
- 조직 AX 성숙도 자가 진단 질문

## 출처
- [flowkater.io — 조직에 Claude Code를 설치한다고 AX가 되지 않는다 (Tony Cho)](https://flowkater.io/posts/2026-03-15-ax-organization-transformation/)
- [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity — METR (2025)](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
- [Good Culture is the Biggest Productivity Hack, Not AI — Engineering Leadership, Gregor Ojstersek](https://newsletter.eng-leadership.com/p/good-culture-is-the-biggest-productivity)
- [Announcing the 2025 DORA Report: State of AI-Assisted Software Development — Google Cloud, DORA](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report)
- [Shopify AI usage memo — Tobi Lütke](https://x.com/tobi/status/1909251946235437514)
- [Running a Software Factory Efficiently at Uber Scale — Uber Engineering](https://www.uber.com/us/en/blog/efficient-software-factory/)
- [Klarna 2025 Form 20-F — U.S. SEC](https://www.sec.gov/Archives/edgar/data/2003292/000200329226000007/klar-20251231.htm)
- [Klarna Rethinks AI Cost-Cutting Plan With Call for Real People — Bloomberg Law](https://news.bloomberglaw.com/artificial-intelligence/klarna-rethinks-ai-cost-cutting-plan-with-call-for-real-people?item=headline&login=blaw&region=digest&source=newsletter)
- [Gen AI, Present and Future: A Conversation with Jim Swanson, CIO at Johnson & Johnson — Greylock](https://greylock.com/blog/gen-ai-present-and-future-a-conversation-with-jim-swanson-cio-at-johnson-johnson/)
- [Harvard Business Review Recognizes BBVA as a Benchmark for Corporate AI Adoption — BBVA](https://www.bbva.com/en/innovation/harvard-business-review-recognizes-bbva-as-a-benchmark-for-corporate-ai-adoption/)
- [An important update on our team — Atlassian](https://www.atlassian.com/blog/announcements/atlassian-team-update-march-2026)
- [We are Changing our Developer Productivity Experiment Design — METR](https://metr.org/blog/2026-02-24-uplift-update/)

## 관련 문서
- [[Harness-Engineering|하네스 엔지니어링]]
- [[Tech-Decision|기술 의사결정]]
- [[Architecture-Decision-Making|아키텍처 의사결정]]
- [[Software-Productivity-Measurement|소프트웨어 생산성 측정의 함정]]
- [[Software-Engineering-Paradoxes|소프트웨어 공학의 4가지 역설]]
- [[Team-Contribution-Culture|엔지니어링 팀 기여 문화]]
- [[Trust-Respect-Teamwork|신뢰와 존중의 팀워크]]
- [[AI-Leverage-Small-Teams|AI 시대 작은 팀의 구조적 레버리지]]
- [[Toxic-Org-Detection|독성 조직 판별 프레임]]
- [[IT-Downturn-Career-Strategy-Market-Shift|AI 패러다임과 시장 구조 변화]]
