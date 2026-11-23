---
tags: [observability, ai, governance, llm, agent, evaluation, audit, finops]
status: done
verified_at: 2026-11-23
category: "관측가능성(Observability)"
aliases: ["AI Governance Observability", "관측 신호로 집행하는 AI 거버넌스", "AI 거버넌스 관측", "SEE GROUND PROVE ENFORCE SUSTAIN", "AI 거버넌스 프레임워크 비교"]
---

# 관측 신호로 집행하는 AI 거버넌스

AI 거버넌스 정책은 런타임 신호가 있어야 집행된다. 어떤 AI가 어디서 얼마를 쓰는지 보이지 않으면 등록하지 않은 사용을 막을 수 없고, 답이 맞았는지 재는 점수가 없으면 배포를 멈출 기준이 없으며, 사고 뒤 변경 이력이 남지 않으면 다음 판단의 근거가 없다. 이 문서는 거버넌스의 각 단계가 요구하는 관측 신호와 통제 지점을 짝짓는다. 에이전트 한 건의 행동을 묶는 신원, 승인, 복구와 감사 통제는 [[Agent-Governance-Controls|에이전트 거버넌스 통제]]가, 실행 권한 모델은 [[Agent-Identity-and-Execution-Authority|에이전트 신원과 실행 권한]]이 다룬다.

관측 범위는 모델 호출 하나가 아니라 사용자, AI 애플리케이션, AI 게이트웨이, 기반 모델, 사내 지식의 계층 전체다. 접근 권한(RBAC), 감사 추적과 민감정보 검사도 이 계층마다 건다(설계 판단).

## 프레임워크는 성격이 다르다

| 프레임워크 | 성격 | 운영 환경에 요구하는 것(해석) |
|---|---|---|
| NIST AI RMF 1.0 | 자율 적용하는 위험관리 프레임워크(2023-01-26 공개, 현재 개정 진행). 핵심은 Govern, Map, Measure, Manage 네 기능 | 위험을 찾고(Map) 재고(Measure) 다루는(Manage) 반복 루프와 그 책임 체계(Govern)의 기록 |
| ISO/IEC 42001:2023 | AI 경영시스템(AIMS)의 수립, 실행, 유지와 지속 개선 요구사항 표준 | 정책, 책임과 심사 증적이 남는 관리체계 |
| Gartner AI TRiSM | AI의 신뢰, 위험, 보안 관리 프레임워크이자 기술 역량. 정적 정책에만 기대지 않고 지속 모니터링, 검증과 런타임 집행 역량을 더한다 | 실행 중 검사와 차단 |
| OWASP Top 10 for LLM, for Agentic Applications 2026 | 보안 위험 목록([[LLM-Application-Security\|LLM Top 10]], [[OWASP-Agentic-Top-10\|Agentic Top 10]]). Agentic판은 2025-12-09 공개 | 공격 유형별 시험과 방어 점검 |
| EU AI Act | 법적 구속력이 있는 위험 기반 규제. 고위험 시스템은 제15조에 따라 수명주기 내내 적절한 정확성, 견고성, 사이버보안을 유지하고 정확성 수준과 지표를 사용 설명서에 밝혀야 한다 | 정확성 지표와 그 유지의 증거 |

다섯 가지를 하나의 체크리스트로 합치지 않는다. 관리 루프와 관리체계는 조직의 절차를, 위험 목록은 시험할 공격을, 런타임 통제는 실행 경로의 차단을, 법은 증명할 의무를 정한다. 공통으로 필요한 것은 운영 환경의 검사, 감사와 차단 기록이다(해석). AI TRiSM을 네 계층으로 나누는 설명은 Gartner의 공개 페이지에서 확인하지 못했고 공급사 해설마다 계층 이름이 달라 쓰지 않는다. EU AI Act 고위험 의무의 적용 시점 연기는 [[Agent-Ready-Data#추적 — agentic lineage|에이전트용 데이터 준비]]에, 한국 AI 기본법의 고영향 AI 의무는 [[AI-Basic-Act-Scope-and-Obligations|AI 기본법]]에 있다.

## 다섯 단계의 신호와 통제 지점

| 단계 | 묻는 것 | 런타임 신호 | 통제 지점 |
|---|---|---|---|
| SEE | 무엇이 어디서 얼마에 도는가 | AI 자산, 호출, 토큰 | 등록하지 않은 사용 차단 |
| GROUND | 근거 데이터를 믿을 수 있는가 | 신선도, 결측, 계보 | 검증 실패 시 정지 |
| PROVE | 답이 맞았는지 아는가 | 트레이스, 평가 점수 | 기준 미달 시 배포 관문 |
| ENFORCE | 위험한 행동을 멈추는가 | 프롬프트, 도구 호출, 민감정보 | 실행 직전 차단 |
| SUSTAIN | 사고 뒤에 무엇이 남는가 | 인시던트와 변경 이력 | 재평가와 증빙 보관 |

### SEE: 목록과 결과 단위 비용

- 공급사와 모델별 지출을 한곳에 모으고, 쓰는 주체(팀, 사용자, 에이전트)와 쓰는 영역을 나눠 본다. 대화의 의도를 분류하면(제품 학습, 설정 작업, 데이터 탐색, 장애 조사 등) 업무 영역별로 정책을 달리할 근거가 생긴다.
- 지출을 결과 단위로 나눈다. 코딩 에이전트라면 병합된 PR당 비용, 엔지니어당 지출, 병합까지 걸린 시간을 지출과 같은 축에서 본다. AI 지출이 늘어도 성과가 같은 속도로 늘지 않을 수 있어서다. 토큰은 활동량이지 생산성이 아니다([[AI-Coding-Agent-Usage-Telemetry|코딩 에이전트 사용량 텔레메트리]], [[Cloud-Unit-Cost#분모를 서비스 결과에 연결한다|결과 단위 분모]]).
- 모델 API 청구서 밖의 비용(GPU, 네트워크, 스토리지)도 같은 기준으로 합친다. AI 비용 항목만 보면 총비용이 가려진다.
- 트레이스와 외부 호출에서 AI 서비스 호출을 찾아 등록 목록과 대조하고, 인가되지 않은 호출과 보호 장치가 붙지 않은 서비스를 나눠 어디부터 손댈지 정한다. 의존성 그래프로 어느 서비스가 어느 모델 공급사에 닿는지 본다([[Security-Hub-AI-Inventory|AI 자산 발견]]).

### GROUND: 근거 데이터의 상태

챗봇이 어제 값으로 답하고 있는지 알려면 참조 테이블의 신선도와 계보, 배치 지연을 검사하고 민감정보가 섞였는지 표시해야 한다. 검증에 실패한 데이터는 에이전트에 넘기지 않고, 멈추거나 모른다고 답하게 한다([[Agent-Ready-Data#신뢰 — 계약 검증 게이트와 격리|계약 검증 게이트]]). 답변을 설명할 근거는 모델이 아니라 이 데이터 기록에서 나온다.

### PROVE: 트레이스와 평가 점수

- 요청 하나를 하나의 흐름으로 묶어 에이전트 사이의 위임과 도구 호출까지 추적하면, 응답 하나의 원인이 어느 단계에서 생겼는지 실행 기록으로 설명할 수 있다([[OpenTelemetry|OpenTelemetry]]).
- 운영 트레이스를 평가해 반복되는 실패 패턴을 찾는다. 상위 에이전트가 이미 넘긴 사용자 정보를 하위 에이전트가 다시 조회하는 도구 호출 반복, 프롬프트 규칙 위반이 예다. 업무 정책의 준수(예: 투자 실행 전에 예산 승인이 끝났는가)도 평가 항목으로 만들면, 자동화가 빨라지면서 승인 단계를 건너뛰었는지 운영 중에 확인할 수 있다.
- 평가 통과 기준을 릴리스 관문으로 쓴다([[Eval-Golden-Set-and-Deploy-Gates#배포로 가는 세 관문|배포로 가는 세 관문]], [[Eval-LLM-Judge|LLM 판정기]]).

### ENFORCE: 실행 경로 안의 차단

- 사후 탐지는 첫 시도를 막지 못하므로 위험한 요청은 실행 경로 안에서 멈춘다. 영수증 이미지에 숨긴 지시로 재무 데이터를 외부 메일로 보내게 하는 간접 주입처럼 텍스트가 아닌 입력도 대상이다([[LLM-Application-Security#LLM01 프롬프트 인젝션|프롬프트 인젝션]]).
- 검사를 탐지 모드로 시작했다면 차단을 따로 켜기 전까지 위험 판정을 받은 요청도 통과한다. 판정 결과와 실제 차단 여부를 나눠 기록한다(운영 제안).
- AI 계층만 지켜서는 부족하다. 에이전트가 쓰는 권한과 시크릿, 에이전트를 실행하는 코드와 인프라의 취약점은 AI 계층 밖에서 정해진다. 코드 분석(SAST, SCA), IaC와 시크릿 검사, 클라우드 설정과 권한 위험 점검까지 통제 범위에 넣고 실제로 악용할 수 있는 것부터 고친다.

### SUSTAIN: 사고를 다음 판단의 근거로

사고는 케이스로 기록하고 누가 무엇을 언제 바꿨는지(프롬프트 변경 이력)를 감사 추적에 남긴다. 평가 점수의 회귀(예: 근거 충실도 점수 하락)가 탐지되면 최근 프롬프트 변경을 확인하고, 평가를 다시 돌려 회귀 범위를 정하고, 이전 프롬프트 버전으로 되돌릴지 결정한다. 평가 결과, 변경 기록과 관련 규제 요건을 케이스에 붙여 두면 담당자가 바뀌어도 판단 근거가 남는다([[Audit-Log|감사 로그]], [[Incident-Runbook|인시던트 런북]]). 일반 서비스의 케이스에 EU AI Act 제15조를 근거로 붙이는 것은 내부 기준으로 빌려 쓰는 것이며, 그 서비스가 고위험 시스템이 아니면 법적 의무는 아니다(해석).

## 플랫폼 자체는 누가 감사하는가

클라우드의 생성형 AI 플랫폼을 거버넌스의 축으로 삼으면 사용 기록과 가드레일이 한곳에 모인다. 그러나 플랫폼의 설정 변경, 로그 수집 범위와 가드레일 정책 자체도 감사 대상이다. 플랫폼이 스스로 낸 기록만으로 플랫폼을 증명하지 않도록 설정 변경 이력과 로그 수집 여부를 별도 경로로 확인한다(해석). 관리형 가드레일이 검사하지 않는 범위는 [[LLM-Application-Security#관리형 가드레일의 검사 범위 — Amazon Bedrock Guardrails 사례|관리형 가드레일의 검사 범위]], 기록이 실제로 켜져 있는지의 확인은 [[Agent-Operations-Integration-Cost-Security#포렌식 기록이 실제로 켜져 있는지 확인한다|포렌식 기록]]을 본다.

## 사례

- Datadog의 State of AI Engineering 2026(2026-04-21 공개)은 1천 곳이 넘는 Datadog 고객의 LLM 텔레메트리를 분석했다. 에이전트 프레임워크를 쓰는 조직은 2025년 초 9% 남짓에서 2026년 초 18% 가까이로 늘었다(APM 계측 서비스의 의존성 기준). 3개 이상 모델을 쓰는 조직은 보고서 본문에서 70% 이상, 보도자료에서 69%로 표기가 다르다. Datadog 고객 표본이라 시장 전체 비율로 옮기지 않는다.
- Gartner는 2025-06-25 에이전틱 AI 프로젝트의 40% 이상이 비용 증가, 불분명한 사업 가치나 부족한 위험 통제 때문에 2027년 말까지 취소될 것으로 전망했다.
- Datadog은 2026년 9월 발표에서 다섯 단계를 자사 제품(에이전트 비용과 사용 콘솔, AI 서비스 발견과 실행 경로 차단, 데이터 관측, 평가, 케이스 관리와 감사 추적)에 대응시켰다. 일부는 미리보기로 표시됐고, 화면의 수치는 데모 애플리케이션의 값이라 측정 결과로 쓰지 않는다.

## 점검

- 조직이 쓰는 모델, AI 도구와 에이전트를 사용 주체와 결과 단위 비용까지 한곳에서 보는가?
- 등록 목록과 실제 호출에서 발견한 AI 사용을 대조하는가?
- 에이전트가 참조하는 데이터의 신선도와 계보를 검사하고 실패하면 멈추는가?
- 평가 점수에 배포를 막는 기준이 있고, 업무 정책의 준수도 평가 항목에 있는가?
- 위험한 요청을 실행 경로 안에서 막는가, 탐지 모드로 알리기만 하는가?
- 에이전트의 권한, 시크릿과 코드 취약점까지 통제 범위에 있는가?
- 사고 케이스에 변경 이력과 평가 결과가 붙어 담당자가 바뀌어도 남는가?

## 출처

- [AI Governance 어디서부터 시작할까 — 삼성SDS REAL Summit 2026 발표 자료, Datadog](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/Track%205-2%20Datadog_%EC%9D%B4%EA%B8%B0%EB%B0%B1%20%EB%A7%A4%EB%8B%88%EC%A0%80_AI%20Governance%20%EC%96%B4%EB%94%94%EC%84%9C%EB%B6%80%ED%84%B0%20%EC%8B%9C%EC%9E%91%ED%95%A0%EA%B9%8C_20260909_%EB%B0%B0%ED%8F%AC%EB%B3%B8_F.pdf) — 2026년 9월 발표. 다섯 단계의 질문, 신호와 통제 지점, 프레임워크 비교, 결과 단위 비용, AI 계층 밖의 통제, 플랫폼 감사 질문과 케이스 기록을 반영했다. 제품 기능과 화면 수치는 발표 기준이다.
- [NIST, AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) — 2026-11-23 자율 적용, 2023-01-26 공개와 개정 진행 대조
- [NIST AIRC, AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) — 2026-11-23 네 기능 대조
- [ISO, ISO/IEC 42001:2023 Information technology — Artificial intelligence — Management system](https://www.iso.org/standard/42001) — 2026-11-23 AIMS 요구사항 범위와 2023-12 발행 대조
- [AI Governance Requires More Than Policies — Gartner](https://www.gartner.com/en/articles/ai-governance-trism) — 2026-11-23 AI TRiSM의 정의와 지속 모니터링, 검증, 런타임 집행 대조
- [OWASP GenAI Security Project, OWASP Top 10 for Agentic Applications for 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) — 2026-11-23 공개일과 위험 목록이라는 성격 대조
- [EU AI Act Service Desk, Article 15: Accuracy, robustness and cybersecurity](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-15) — 2026-11-23 대조, 2026-07-27 통합본 기준
- [State of AI Engineering — Datadog](https://www.datadoghq.com/state-of-ai-engineering/) — 2026-11-23 표본, 프레임워크 채택률, 다중 모델 비율과 방법론 대조
- [Datadog State of AI Engineering Report 2026 — Datadog](https://www.datadoghq.com/newsroom/press-releases/datadog-state-of-ai-engineering-report-2026/) — 2026-04-21 보도자료, 69% 표기 대조
- [Gartner Predicts Over 40% of Agentic AI Projects Will Be Canceled by End of 2027 — Gartner](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027) — 2025-06-25 게재, 2026-11-23 대조

## 관련 문서

- [[Agent-Governance-Controls|에이전트 거버넌스 통제]]
- [[Agent-Identity-and-Execution-Authority|에이전트 신원과 실행 권한]]
- [[Datadog-Operations#LLM 호출은 응답 품질과 실행 상태를 나눠 본다|Datadog의 LLM 관측]]
- [[Langfuse-Self-Hosting|Langfuse 자체 호스팅]]
- [[Bedrock-Observability|Bedrock 관측]]
- [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문]]
- [[LLM-Cost-Optimization|LLM 비용 최적화]]
- [[Responsible-AI-Lens|Responsible AI Lens]]
- [[AI-Basic-Act-Scope-and-Obligations|AI 기본법]]
