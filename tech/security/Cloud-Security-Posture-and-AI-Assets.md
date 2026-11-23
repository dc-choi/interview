---
tags: [security, cloud-security, cspm, ciem, cwpp, cnapp, ai-spm, attack-path, shadow-ai, non-human-identity]
status: done
verified_at: 2026-11-23
category: "보안(Security)"
aliases: ["Cloud Security Posture and AI Assets", "CSPM", "CIEM", "CWPP", "CNAPP", "AI-SPM", "AI Security Posture Management", "Attack Path Analysis", "공격 경로 분석", "Shadow AI", "섀도 AI"]
---

# 클라우드 보안 태세와 AI 자산 보호

클라우드 보안의 기본 질문은 셋이다. 설정이 안전한가, 권한이 필요한 만큼인가, 워크로드가 안전한가. CSPM, CIEM, CWPP가 각각을 맡고 CNAPP이 코드 단계까지 한 흐름으로 묶는다. AI 모델의 학습과 추론, 학습 데이터와 벡터 DB, AI가 닿으려는 데이터와 권한, 권한을 갖고 움직이는 에이전트 런타임이 대부분 클라우드에 있으므로, 클라우드 보안은 AI 보안의 전부는 아니어도 최소 요건이다(발표 자료의 관점).

제품 범주의 정의와 기능 예는 2026-11-23 Microsoft Defender for Cloud 문서로 대조했다. 이름이 같아도 제품마다 범위가 다르므로 범주 이름이 아니라 실제로 보는 대상을 확인한다(해석).

## 네 축

| 범주 | 묻는 질문 | 보는 대상 | 예 |
|---|---|---|---|
| CSPM(Cloud Security Posture Management) | 설정이 안전한가 | 클라우드 리소스의 설정과 규정 준수 | 공개된 스토리지, 꺼진 로깅, 기준 위반 |
| CIEM(Cloud Infrastructure Entitlement Management) | 권한이 필요한 만큼인가 | 사용자, 그룹, 서비스 주체, 관리 ID, 서비스 계정 같은 사람과 비인간 신원의 과도하거나 쓰지 않거나 잘못된 권한 | 쓰지 않는 권한 회수, 최소 권한 |
| CWPP(Cloud Workload Protection Platform) | 워크로드가 안전한가 | VM, 컨테이너, 스토리지, DB, 서버리스 함수의 취약점과 위협 | 이미지 취약점, 런타임 위협 탐지 |
| CNAPP(Cloud Native Application Protection Platform) | 위를 한 흐름으로 보는가 | 개발 파이프라인의 코드 보안(DevSecOps)부터 운영 리소스까지 | 코드에서 클라우드까지의 수명주기 보호 |

Microsoft 문서는 CNAPP을 여러 클라우드 보안 도구를 묶어 애플리케이션을 수명주기 전체에서 보호하는 통합 솔루션으로 설명하고 CSPM, DevSecOps, CWPP를 세 핵심 구성요소로 둔다. CIEM은 CSPM 플랜 안의 기능으로 들어 있다. AWS에서 같은 역할을 하는 Security Hub CSPM과 노출 분석은 [[Security-Hub-Exposure-Analysis|Security Hub 노출 분석]]에 있다.

## AI가 놓이는 자리: AI 자산 목록부터 만든다

AI는 한곳에 있지 않다. 아래 지도는 기업 안에서 AI가 쓰이는 지점이다(발표 자료). AI 자산 목록(AI-BOM)의 점검 범위로 쓸 수 있다.

| 위치 | 예 | 연결 |
|---|---|---|
| 사용자 단말 | 로컬 코딩 에이전트, 브라우저에서의 직접 사용 | 모델 API, SaaS |
| 사내 앱과 워크로드 | 서비스 워크로드, 내부 에이전트, 자동화 작업 | 추론 라우팅, MCP 연결 |
| 자체 호스팅 | 온프레미스 GPU, 오픈소스 모델, 내부 MCP, 사내 DB | 사내망 |
| 경계 밖 | 모델 제공사 API, CSP 관리형 AI(자사 테넌시), SaaS 에이전트와 MCP | 인터넷 |

Microsoft Defender for Cloud의 AI 보안 태세 관리(AI-SPM)는 이 가운데 관리형 영역을 다음처럼 다룬다(2026-11-23 문서 기준).

- 코드부터 클라우드까지의 애플리케이션 구성요소, 데이터와 AI 산출물을 생성형 AI 자산 목록(AI BOM)으로 찾는다. 자동 발견 대상은 Azure OpenAI, Azure AI Foundry, Azure Machine Learning, Amazon Bedrock, Google Vertex AI다.
- 신원, 데이터 보안, 인터넷 노출에 대한 권고를 내고, 외부에서 닿는 AI 엔드포인트를 따로 표시해 강한 인증과 최소 권한을 적용하게 한다.
- IaC 단계에서 AI 서비스의 private endpoint, 관리 ID와 신원 기반 인증 같은 설정을 검사한다.

목록이 필요한 근거도 있다. Microsoft Work Trend Index(2024-05-08)에서 지식 노동자의 75%가 업무에 AI를 쓰고, AI 사용자의 78%가 자기 AI 도구를 직접 들고 온다(BYOAI)고 답했다. Zscaler ThreatLabz 2026 AI 보안 보고서 발표(2026-01-27)는 많은 조직이 AI 모델과 내장 AI 기능의 기본 목록조차 없다고 지적했다. 같은 발표에서 자사 레드팀이 시험한 기업 AI 시스템 전부에서 치명 결함이 나왔고, 첫 치명 실패까지의 중앙값이 16분, 90%가 90분 안에 뚫렸다고 밝혔다. 둘 다 회사가 자체 집계한 값이다.

## 보이는 영역과 사각지대

| 구분 | 대상 | 상태 | 메우는 통제(운영 제안) |
|---|---|---|---|
| CSP 관리형 영역 | IaaS와 PaaS 리소스, 관리형 AI 서비스(Bedrock, Vertex AI, Azure OpenAI) | CNAPP과 AI-SPM으로 가시성과 통제 확보 | 커넥터 범위와 계정 목록 대조 |
| 연동하지 않은 환경 | 온프레미스, 연동하지 않은 클라우드 계정 | 기존 통제 미적용 | 계정과 리전 목록을 실제 활성화 상태와 대조([[AWS-Security-Response-Automation|AWS 보안 대응 자동화]]의 집계 점검) |
| 자체 호스팅 모델 | 오픈소스 LLM, GPU 서버 | 기존 통제 미적용 | 모델 레지스트리의 스캔과 서명, 호스트 단위 워크로드 보호 |
| 외부 SaaS와 API | 섀도 AI 사용 | 가시성 부재 | egress 가시화, AI 게이트웨이 경유 강제, 단말과 브라우저 통제 |

구분은 발표 자료의 것이고 오른쪽 열은 사각지대를 메울 수단을 정리한 해석이다. 섀도 AI까지 덮는 전체 구조는 AI 통합 게이트웨이(AI DLP, egress 정책, 키 관리, MCP 정책, 가드레일 엔진)를 가운데 두고, 자체 호스팅 앞에 모델 레지스트리의 스캔과 서명을 두며, 모델 제공사 API는 게이트웨이를 거치게 하고 SaaS와 MCP는 egress를 가시화한다(발표 자료). 외부 AI로 나가는 데이터의 등급 통제는 [[Agent-Governance-Controls#데이터 등급이 외부 AI 허용 범위를 정한다|데이터 등급과 외부 AI 허용 범위]], 게이트웨이의 구조는 [[LLM-Gateway|LLM 게이트웨이]], 단말과 브라우저는 [[Enterprise-Browser-Control|기업용 브라우저 통제]]와 [[Host-Outbound-Firewall|호스트의 앱별 아웃바운드 통제]]에 있다.

## 발견의 홍수를 공격 경로로 줄인다

AI 기반 점검과 보안 에이전트가 분기마다 보고서를 내는 대신 커밋과 배포마다 돌면 발견이 쏟아진다. 그때의 질문은 무엇을 먼저 고치는가다.

- **발견 하나로는 심각도를 모른다**: 프롬프트 인젝션에 취약한 에이전트를 찾았다는 사실만으로는 위험의 크기를 정할 수 없다. 그 에이전트가 어떤 IAM 권한을 가졌는가, 어떤 데이터에 닿는가, 외부에 노출된 엔드포인트인가의 세 질문을 붙이면 세 답이 모두 클라우드에 있으므로, AI 취약점 하나와 클라우드 권한 하나를 발견 두 개가 아니라 공격 경로 하나로 본다(발표 자료).
- **공격 경로의 정의**: Microsoft 문서는 공격 경로를 공격자가 외부 진입점(인터넷에 노출된 취약 리소스)에서 시작해 연결된 신원의 권한 같은 측면 이동을 따라 민감 데이터가 있는 DB 같은 핵심 대상까지 가는 단계의 연속으로 설명한다. 자산 목록, 연결, 측면 이동 가능성, 인터넷 노출, 권한, 네트워크 연결과 취약점을 모은 클라우드 보안 그래프에서 경로를 계산하고, 설정 데이터와 능동 도달성 스캔으로 외부에서 실제로 닿는지 확인해 외부에서 시작되고 악용할 수 있는 위협을 앞세운다. 분석 대상에는 AI 에이전트도 들어간다. 다만 AI-SPM 문서 기준으로 AI 에이전트 발견은 미리보기이고, 2026-07-01부터 Microsoft Foundry 에이전트와 서드파티 클라우드 에이전트의 발견과 보안 태세 같은 에이전트 단위 기능에는 Defender CSPM 플랜이 아니라 Microsoft Agent 365 라이선스가 필요하다.
- **세 계층을 한 그래프에서**: 코드의 취약점이 어디서 왔고 실제로 도달 가능한가(AppSec), 그 워크로드가 어떤 권한을 갖고 어디에 노출됐는가(클라우드), 그 워크로드에 접근하는 AI가 무엇이고 어떤 관문을 지나는가(AI 런타임)가 한 그래프에서 만나야 고칠 순서가 나온다. 취약점 3,000개가 고칠 공격 경로 3개로 줄어드는 그림은 측정 조건이 없는 예시다(발표 자료).
- **그래프가 모르는 것(해석)**: 그래프는 수집한 계정과 리소스만 안다. 사각지대의 AI는 경로 계산에서 빠지므로 경로가 없다는 결과를 위험이 없다는 뜻으로 읽지 않는다. 우선순위의 다른 축(CVSS, EPSS, KEV)은 [[Dependency-Vulnerability-Scanning#우선순위 — CVSS 점수만으로 줄 세우면 실패한다|취약점 우선순위]]에 있다.

## 에이전트의 신원과 권한

AI 에이전트 보안의 핵심은 권한 관리이며, 통합 IAM을 비인간 신원(NHI) 거버넌스로 넓혀 식별, 권한 관리, 수명주기 자동화를 갖추고 에이전트 호출 관제와 정책 집행은 AI 게이트웨이에 둔다(발표 자료). 아래는 이를 적용 순서로 다시 늘어놓은 것이다(해석).

1. **식별**: 에이전트 워크로드와 서비스 계정을 비인간 신원으로 찾아 목록을 만든다.
2. **권한**: 최소 권한과 필요할 때만 주는 JIT 접근을 적용한다. 사람과 비인간 신원의 쓰지 않는 권한을 찾는 도구가 CIEM이다.
3. **호출 관제**: 에이전트 호출을 게이트웨이에서 보고 정책을 집행한다.
4. **수명주기**: 발급, 교체, 회수를 자동화한다.

OWASP Agentic Top 10의 ASI03(신원과 권한 남용)이 권하는 작업 범위와 시간이 정해진 권한, 에이전트별 신원과 같은 방향이다([[OWASP-Agentic-Top-10|OWASP Agentic Top 10]], [[LLM-Application-Security#에이전트 신원과 일시적인 권한을 분리한다|에이전트 신원과 일시적인 권한]]). 에이전트 신원 모델의 비교와 등록부터 승인까지의 절차는 [[Agent-Identity-and-Execution-Authority|에이전트 신원과 실행 권한]]에 있다.

## 사례: 테이텀 시큐리티 발표 (2026년 9월)

- 클라우드 보안의 세 문제를 CSPM, CWPP, CIEM 모듈로 다루는 국내 클라우드 보안 기업의 발표다. 고객사 목록과 국내 유일이라는 표현은 회사 주장이라 옮기지 않았다.
- 공격 속도의 근거로 Mandiant M-Trends 2026, CrowdStrike, Zscaler의 수치를 인용했다. 원문으로 확인하면 22초는 2025년에 최초 접근에서 다른 위협 그룹으로 넘기기까지의 중앙값이고, 16분은 실제 침해가 아니라 Zscaler 레드팀 시험에서 첫 치명 실패까지의 중앙값이다. 확인한 값은 [[AI-Accelerated-Threat-Defense#먼저 갖출 것 2: 대응 경로를 미리 정해 둔다|탐지에서 대응까지의 시간]]과 위 AI 자산 절에 있다.
- OWASP LLM Top 10(2025)을 입력과 프롬프트, 데이터와 모델, 출력과 운영의 세 계층으로 나눠 AI 사용 지점에 대응시키고, 모델 자체와 프롬프트 인젝션을 빼면 데이터 유출 중심의 기존 보안과 같다고 정리했다.

## 점검 질문

- 계정, 리전, 온프레미스와 자체 호스팅까지 포함한 AI 자산 목록이 있는가? CNAPP 커넥터가 그중 어디까지 보는가?
- 외부 모델 API와 SaaS로 나가는 AI 트래픽이 게이트웨이나 egress 통제를 반드시 지나는가?
- AI 발견마다 권한, 닿는 데이터, 외부 노출의 세 답을 붙여 공격 경로 단위로 우선순위를 정하는가?
- 경로가 계산되지 않은 영역을 위험 없음이 아니라 미관측으로 표시하는가?
- 에이전트와 서비스 계정 같은 비인간 신원의 목록, 최소 권한, 교체와 회수 주기가 있는가?

## 출처

- [클라우드에서 AI까지 보안 트렌드 총정리 — 삼성SDS REAL Summit 2026 발표 자료, 테이텀 시큐리티](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/Track%203-2%20%ED%85%8C%EC%9D%B4%ED%85%80%20%EC%8B%9C%ED%81%90%EB%A6%AC%ED%8B%B0_%EC%96%91%ED%98%81%EC%9E%AC%20%EB%8C%80%ED%91%9C_%ED%81%B4%EB%9D%BC%EC%9A%B0%EB%93%9C%EC%97%90%EC%84%9C%20AI%EA%B9%8C%EC%A7%80%20%EB%B3%B4%EC%95%88%20%ED%8A%B8%EB%A0%8C%EB%93%9C%20%EC%B4%9D%EC%A0%95%EB%A6%AC_20260909_vF_%EB%B0%B0%ED%8F%AC%EC%9A%A9.pdf) — 2026년 9월 발표. AI 사용 지점 지도, 관리형 영역과 사각지대, 클라우드 맥락의 세 질문, 세 계층 그래프, NHI 거버넌스 구성
- [Microsoft Learn, Microsoft Defender for Cloud Overview](https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-cloud-introduction) — 2026-08-10 갱신본. CNAPP 정의와 CSPM, DevSecOps, CWPP
- [Microsoft Learn, Cloud infrastructure entitlement management (CIEM)](https://learn.microsoft.com/en-us/azure/defender-for-cloud/permissions-management) — 사람과 비인간 신원의 과도하거나 쓰지 않거나 잘못된 권한 분석
- [Microsoft Learn, Overview: AI security posture management](https://learn.microsoft.com/en-us/azure/defender-for-cloud/ai-security-posture) — AI BOM, 자동 발견 대상 서비스, 권고와 IaC 검사, 외부에서 닿는 AI 엔드포인트, AI 에이전트 발견의 미리보기와 2026-07-01 Agent 365 라이선스 전환
- [Microsoft Learn, Security explorer and attack paths in Microsoft Defender for Cloud](https://learn.microsoft.com/en-us/azure/defender-for-cloud/concept-attack-path) — 클라우드 보안 그래프의 수집 대상, 공격 경로 정의, 능동 도달성 스캔
- [AI at Work Is Here. Now Comes the Hard Part — Microsoft WorkLab](https://www.microsoft.com/en-us/worklab/work-trend-index/ai-at-work-is-here-now-comes-the-hard-part) — 2024-05-08. 업무 AI 사용 75%와 BYOAI 78%
- [Zscaler 2026 AI Threat Report: 83% Year-over-Year Surge in AI Activity Creates Growing Oversight Gap for Global Enterprises — Zscaler](https://www.zscaler.com/press/zscaler-2026-ai-threat-report-91-year-over-year-surge-ai-activity-creates-growing-oversight) — 2026-01-27. AI 목록 부재, 레드팀 시험의 16분과 90분. 주소에는 91%, 2026-11-23 확인한 본문 제목에는 83%가 적혀 있다

## 관련 문서

- [[OWASP-Agentic-Top-10|OWASP Top 10 for Agentic Applications]]
- [[LLM-Application-Security|LLM 애플리케이션 보안]]
- [[Security-Hub-Exposure-Analysis|Security Hub 노출 분석 (AWS의 CSPM과 노출 finding)]]
- [[AWS-Security-Response-Automation|AWS 보안 대응 자동화 (계정과 리전 집계)]]
- [[Agent-Governance-Controls|에이전트 거버넌스 통제]]
- [[LLM-Gateway|LLM 게이트웨이]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캐닝 (우선순위)]]
- [[AI-Accelerated-Threat-Defense|악용 시간 단축과 AI 공격에 대비하는 방어]]
- [[IAM-Best-Practices|IAM 모범 사례 (최소 권한)]]
- [[보안(Security)|보안 인덱스]]
