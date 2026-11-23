---
tags: [security, ai, agent-security, owasp, agentic-ai, least-agency]
status: done
verified_at: 2026-11-23
category: "보안(Security)"
aliases: ["OWASP Top 10 for Agentic Applications", "OWASP Agentic Top 10", "에이전틱 애플리케이션 10대 위험", "Agent Goal Hijack", "Least Agency", "최소 자율성"]
---

# OWASP Top 10 for Agentic Applications (2026판)

OWASP GenAI Security Project의 Agentic Security Initiative가 2025-12-09 공개한 에이전트 애플리케이션의 10대 위험 목록이다. 문서 표기는 Version 2026(December 2025)이고, 100명이 넘는 업계 전문가, 연구자와 실무자의 협업으로 만들었다고 밝힌다. 모델이 도구를 호출하고, 세션을 넘어 기억을 이어 가고, 다른 에이전트에게 일을 맡기는 순간 생기는 위험을 다룬다. 에이전트 앱도 LLM 앱 위에 서므로 [[LLM-Application-Security|LLM 애플리케이션 보안 (OWASP LLM Top 10)]]을 대체하지 않고 함께 본다. 항목들은 LLM Top 10, 비인간 신원(NHI) Top 10, CycloneDX 표준, 점수와 우선순위를 위한 AI 취약점 점수 체계(AIVSS)를 참조한다.

2026-11-23 OWASP 공개 문서(PDF)와 공지 글을 대조했다.

## 최소 자율성(Least Agency)

OWASP는 최소 권한과 과도한 위임(Excessive Agency)의 개념을 넓혀 Least Agency를 내세운다. 필요 없는 곳에 자율성을 주지 말라는 권고다. 에이전트 동작이 필요 없는 곳에 넣으면 가치는 더하지 못하고 공격 표면만 넓힌다.

같은 이유로 관측 가능성(observability)을 타협할 수 없는 조건으로 둔다. 에이전트가 무엇을 왜 하고 어떤 도구를 부르는지 보이지 않으면, 불필요한 자율성이 조용히 공격 표면을 넓히고 작은 문제가 시스템 전체의 실패로 커진다.

## 10대 위험

| ID | 위험 | 무엇이 일어나는가 | 대표 완화 |
|---|---|---|---|
| ASI01 | 에이전트 목표 탈취(Agent Goal Hijack) | 에이전트와 모델은 자연어 지시와 함께 들어온 콘텐츠를 안정적으로 구분하지 못한다. 프롬프트, 속이는 도구 출력, 악성 산출물, 위조된 에이전트 간 메시지, 오염된 외부 데이터로 목표, 작업 선택과 결정 경로가 바뀐다 | 모든 자연어 입력을 비신뢰로 보고 LLM01 방어를 거친 뒤에야 목표와 도구 호출에 닿게 한다. 도구 최소 권한, 목표를 바꾸는 고영향 행동에 사람 승인, 시스템 프롬프트의 목표와 허용 행동을 고정하고 변경은 형상 관리와 승인으로 |
| ASI02 | 도구 오용과 악용(Tool Misuse and Exploitation) | 허가된 권한 안에서 정당한 도구를 위험하게 쓴다. 중요한 데이터 삭제, 비싼 API의 과다 호출, 정보 유출이 예다 | 도구별 최소 권한 프로필(범위, 최대 호출률, egress 허용 목록). DB는 읽기 전용, 요약 도구에는 발송과 삭제 권한 없음. 가능하면 도구마다 IAM이나 인가 정책으로 표현 |
| ASI03 | 신원과 권한 남용(Identity and Privilege Abuse) | 위임 체인, 역할 상속, 캐시된 자격 증명과 대화 이력 같은 맥락을 조작해 권한을 올린다. 신원은 에이전트의 페르소나와 그 인증 수단을 모두 뜻한다 | 작업 범위와 시간이 정해진 권한(작업마다 짧게 사는 토큰, 에이전트별 신원, mTLS 인증서), 세션별 샌드박스와 작업 사이 상태 삭제 |
| ASI04 | 에이전트 공급망 취약점(Agentic Supply Chain Vulnerabilities) | 모델과 가중치, 도구, 플러그인, 데이터셋, 다른 에이전트, MCP와 A2A 인터페이스, 레지스트리, 업데이트 경로가 악성이거나 변조돼 안전하지 않은 코드나 숨은 지시가 실행 체인에 들어온다. 실행 중 동적으로 받는 구성요소도 포함한다 | 매니페스트, 프롬프트와 도구 정의에 서명과 증명. SBOM과 AIBOM, AI 구성요소 목록. 허용 목록과 버전 고정, 타이포스쿼팅 검사, 서명이나 검증이 없으면 거부 |
| ASI05 | 예상하지 못한 코드 실행(Unexpected Code Execution) | 코드 생성과 실행 기능, 내장 도구 접근이 원격 코드 실행, 로컬 오용과 내부 시스템 악용으로 번진다. 실시간으로 생성한 코드는 기존 통제를 우회하기 쉽다 | LLM05 출력 처리 완화, 운영 시스템에 직접 반영하지 않고 사전 검사, 운영 에이전트에서 eval 금지, root 금지와 네트워크를 제한한 샌드박스 |
| ASI06 | 메모리와 맥락 오염(Memory and Context Poisoning) | 요약, 임베딩, RAG 저장소처럼 에이전트가 보존하고 재사용하는 맥락을 오염시켜 이후의 추론, 계획과 도구 사용을 비틀거나 유출을 돕게 한다. 일회성 입력 프롬프트는 LLM01이 다룬다 | 메모리 쓰기 전 검사, 사용자 세션과 도메인별 분리, 인증된 출처만 받기, 민감도별 보존 최소화, 출처 표시와 이상 갱신 탐지 |
| ASI07 | 안전하지 않은 에이전트 간 통신(Insecure Inter-Agent Communication) | API, 메시지 버스, 공유 메모리로 오가는 통신에 인증, 무결성, 기밀성, 인가가 부족해 가로채기, 조작, 위장, 차단이 일어난다 | 에이전트별 자격 증명과 상호 인증, 종단 간 암호화, 메시지 서명과 숨은 지시 검사, nonce와 타임스탬프로 재전송 방지, 프로토콜 버전 고정, 타입이 있는 메시지 스키마 |
| ASI08 | 연쇄 실패(Cascading Failures) | 환각, 악성 입력, 오염된 도구나 메모리 같은 결함 하나가 자율 에이전트들 사이로 퍼져 시스템 전체의 피해로 커진다. 최초 결함이 아니라 전파와 증폭을 다룬다 | 구성요소 장애를 가정한 설계, 샌드박스와 망 분할로 전파 차단, 실행마다 짧게 사는 일회성 자격 증명, 고영향 도구 호출마다 실행 전 policy-as-code 검사 |
| ASI09 | 사람과 에이전트 간 신뢰 악용(Human-Agent Trust Exploitation) | 유창함과 전문가처럼 보이는 설명으로 쌓인 신뢰를 이용해 사람이 독립 검증 없이 위험한 행동을 승인하게 만든다 | 민감 데이터 접근과 위험 행동에 다단계 확인, 변조할 수 없는 기록, 모델이 만든 근거가 아닌 평이한 위험 요약과 의심 신고 수단 |
| ASI10 | 이탈 에이전트(Rogue Agents) | 의도한 기능이나 허가 범위를 벗어나 해롭거나 기만적으로 움직이는 악성 또는 침해된 에이전트. 행동 하나하나는 정상처럼 보여도 전체 행동이 해롭다. 최초 침입이 아니라 이탈이 시작된 뒤의 행동 무결성과 통제 상실을 다룬다 | 서명된 변경 불가 감사 기록, 신뢰 구역과 구역 간 통신 규칙, 감시 에이전트로 동료의 행동과 출력 검증, 공모 패턴 탐지 |

## 경계가 겹칠 때 어디로 분류하는가

- ASI02는 허가된 권한 안에서 도구를 잘못 쓰는 경우다. 오용에 권한 상승이나 자격 증명 상속이 끼면 ASI03, 임의 코드나 주입된 코드 실행으로 이어지면 ASI05로 분류한다. MCP 서버로 들어오는 도구 정의는 ASI04와 겹친다.
- ASI02는 LLM06(과도한 위임)의 완화를 다단계 워크플로와 도구 오케스트레이션으로 넓힌다. ASI05는 LLM05(부적절한 출력 처리)의 완화를 따르되 코드 실행 경로에 집중한다.
- ASI08과 ASI10은 원인보다 그 뒤를 다룬다. 시작이 프롬프트 인젝션(LLM01), 목표 탈취(ASI01)나 공급망 변조(ASI04)여도 결함이 번지는 방식은 ASI08, 이탈한 뒤의 통제는 ASI10에서 본다.
- 공지 글은 2025년 사례를 항목에 대응시켰다. 숨은 프롬프트로 코파일럿이 조용한 유출 통로가 된 EchoLeak은 ASI01, 정당한 도구가 파괴적 결과를 낸 Amazon Q는 ASI02, GitHub MCP 악용은 ASI04, AutoGPT RCE는 ASI05, Gemini 메모리 공격은 ASI06, Replit 사고는 ASI10의 예다.

## 통제 지점으로 묶어 보기

2026년 9월 테이텀 시큐리티의 발표 자료는 열 항목을 세 계층으로 묶었다. OWASP 문서 자체의 분류는 아니며, 점검 담당을 나눌 때 쓸 수 있다(해석).

| 계층 | 항목 | 먼저 볼 통제 | 이어 볼 문서 |
|---|---|---|---|
| 행동과 실행 | ASI01, ASI02, ASI05 | 입력의 신뢰 경계, 도구 권한 프로필, 실행 격리 | [[Agent-Execution-Isolation|에이전트 실행 격리]], [[LLM-Application-Security#LLM01 프롬프트 인젝션|LLM01 프롬프트 인젝션]] |
| 신원, 데이터, 공급망 | ASI03, ASI04, ASI06 | 작업 단위 신원과 짧은 자격 증명, 구성요소 서명과 목록, 메모리 쓰기 검사 | [[LLM-Application-Security#에이전트 신원과 일시적인 권한을 분리한다|에이전트 신원과 일시적인 권한]], [[MCP-Security-Boundaries|MCP 보안 경계]], [[Malicious-Agent-Skills|악성 에이전트 스킬]] |
| 시스템과 신뢰 | ASI07, ASI08, ASI09, ASI10 | 에이전트 간 인증과 서명, 전파 차단, 승인 화면 설계, 변경 불가 감사 기록 | [[Agent-Swarm-Containment|에이전트 군집 격리]], [[Harness-Gate-Placement#사람 승인과 실질적인 검토를 구분한다|사람 승인과 실질적인 검토]], [[Agent-Governance-Controls|에이전트 거버넌스 통제]] |

## 점검 질문

- 이 작업에 에이전트의 자율성이 정말 필요한가? 고정된 워크플로로 충분하지 않은가?
- 도구마다 범위, 호출률, egress를 정한 권한 프로필이 프롬프트가 아니라 정책으로 붙어 있는가?
- 에이전트 신원이 작업 단위로 짧게 발급되고 위임 체인이 기록되는가?
- 메모리와 RAG에 쓰기 전에 내용과 출처를 검사하는가?
- 에이전트 간 메시지가 인증, 서명되고 재전송이 막히는가?
- 고영향 도구 호출이 실행 직전에 결정적인 정책 검사를 거치는가?
- 승인 화면이 모델이 만든 설명이 아니라 위험 요약을 보여 주는가?
- 에이전트의 행동, 도구 호출과 에이전트 간 통신이 변경할 수 없는 기록으로 남는가?

## 출처

- [OWASP, OWASP Top 10 for Agentic Applications for 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) — 2025-12-09 공개, Version 2026(December 2025) PDF. 서문의 Least-Agency와 관측 가능성, ASI01~ASI10의 설명과 완화, ASI02의 분류 경계
- [OWASP Top 10 for Agentic Applications – The Benchmark for Agentic Security in the Age of Autonomous AI — OWASP GenAI Security Project](https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/) — 2025-12-09. 항목별 2025년 사례 대응
- [클라우드에서 AI까지 보안 트렌드 총정리 — 삼성SDS REAL Summit 2026 발표 자료, 테이텀 시큐리티](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/Track%203-2%20%ED%85%8C%EC%9D%B4%ED%85%80%20%EC%8B%9C%ED%81%90%EB%A6%AC%ED%8B%B0_%EC%96%91%ED%98%81%EC%9E%AC%20%EB%8C%80%ED%91%9C_%ED%81%B4%EB%9D%BC%EC%9A%B0%EB%93%9C%EC%97%90%EC%84%9C%20AI%EA%B9%8C%EC%A7%80%20%EB%B3%B4%EC%95%88%20%ED%8A%B8%EB%A0%8C%EB%93%9C%20%EC%B4%9D%EC%A0%95%EB%A6%AC_20260909_vF_%EB%B0%B0%ED%8F%AC%EC%9A%A9.pdf) — 2026년 9월 발표. 열 항목을 세 계층으로 묶는 방식

## 관련 문서

- [[LLM-Application-Security|LLM 애플리케이션 보안 (OWASP LLM Top 10)]]
- [[Cloud-Security-Posture-and-AI-Assets|클라우드 보안 태세와 AI 자산 (AI 자산 목록, 공격 경로, 에이전트 신원)]]
- [[Agent-Execution-Isolation|에이전트 실행 격리]]
- [[Agent-Governance-Controls|에이전트 거버넌스 통제]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[Malicious-Agent-Skills|악성 에이전트 스킬]]
- [[Agent-Swarm-Containment|에이전트 군집 격리]]
- [[AI-Accelerated-Threat-Defense|악용 시간 단축과 AI 공격에 대비하는 방어]]
- [[보안(Security)|보안 인덱스]]
