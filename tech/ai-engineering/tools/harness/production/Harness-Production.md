---
tags: [ai, harness, agent, architecture, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["Harness Production", "프로덕션 에이전트 운영과 격리"]
---

# 프로덕션 에이전트 운영과 격리

에이전트에게 일을 위임해 프로덕션에서 돌릴 때의 아키텍처, 관리형 런타임의 책임 경계와 여러 에이전트의 격리. 상위: [[Harness-Systems|하네스 시스템]].

## 목차

- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]]: 분업, Lazy Load, Defense in Depth, 프롬프트 3계층과 루프 가드레일, Metric Registry, Eval, 고가용성, Closure-loop 위임 경계
  - [[Production-Agent-Architecture-Orchestration|분업과 오케스트레이션]]: 컴포넌트 분업, 환경을 넘는 위임, 핵심 엔진, Lazy Load
- [[Multi-Agent-Coordination-Cost|멀티 에이전트의 조정 비용과 증설 판단]]: Amdahl 상한과 통신 경로, 작업 구조별 효과 측정, 네 가지 실패 패턴, 구조 선택과 단계적 증설
  - [[Production-Agent-Architecture-Guardrails|다층 안전망과 루프 가드레일]]: Defense in Depth, 프롬프트 3계층, 루프 가드레일, 사용량 제한
  - [[Production-Agent-Architecture-Knowledge|지식 체계]]: Metric Registry, 조회 우선순위, Auto Memory 비활성화
  - [[Production-Agent-Architecture-Eval-and-Operations|Eval, 운영 루프와 고가용성]]: 검증 4축, 운영 루프, 처리 시간 계측, 워커 풀
  - [[Production-Agent-Architecture-Delegation|Closure-loop 위임 경계와 자율권]]: 승인과 실행 권한, 감사 기록, 자율권의 확대와 축소, 위임 결정의 사고 도구(성공 작업당 원가, 오류 누적, 자율성 다이얼과 문 유형)
  - [[Production-Agent-Architecture-Cases-and-Interview|사례와 면접 포인트]]: Meta Muse, 마이리얼트립 데이터 에이전트, LY SRELens, Salesforce 에이전트 스택(Agentforce, Data 360, Headless 360)
- [[Bedrock-AgentCore-Operations|Bedrock AgentCore 운영 경계]]: 세션 격리와 사용자 매핑, 상태 영속화, 도구 인증과 인가, 관측과 업무 성공의 구분
- [[Agent-Operations-Foundations|에이전트 운영 기반]]: AI for Operations와 Operations for AI, 여섯 운영 영역, 운영 로그 분류와 보존 상속, Guardrails와 Policy의 통제 범위, 문맥 편향 시험, 변경의 릴리스 관리와 장애 대비
  - [[Agent-Operations-Integration-Cost-Security|에이전트 운영의 통합, 비용과 보안]]: 공유 MCP 연결과 자격 증명 범위, OBO 토큰 교환, 토폴로지와 A2A, 비용 귀속과 토큰 상한, 캐싱과 모델 선택, 비율 기준선, 수집 데이터 인젝션과 포렌식 기록, 에이전트 신원 3계층, 조직 준비
- [[Agent-Governance-Controls|에이전트 거버넌스 통제]]: 판단은 확률, 통제는 결정론. 신원과 권한(위임 단계의 요청자 권한, 단일 관문), 조건부 승인, 보상 동작과 되돌리기, 추적과 감사, 탐지에서 차단까지의 루프, 조직이 정할 다섯 영역(데이터 등급과 외부 AI 허용 범위, 모델 등급과 한도, 자산 등록과 검증된 공유, 영역별 성숙도)
  - [[Agent-Identity-and-Execution-Authority|에이전트 신원과 실행 권한]]: 사람 중심에서 에이전트 대행으로 바뀐 IAM의 질문, 에이전트 신원과 위임 신원과 디지털 권한증, RFC 8693 위임 대응, 접근 통제의 다섯 질문, 계정 탈취와 프롬프트 주입과 섀도 에이전트, 등록에서 승인까지, IAM 운영 자동화, 레드팀과 블루팀
- [[Enterprise-Code-Agent-Operations|기업 개발 조직의 코드 에이전트 운영 설계]]: 코드 생성 뒤 남는 병목, 정보 민감도별 모델 환경, 실행 가능한 작업 맥락, 기업 시스템 접근 계층, 금융 코드 변경 통제와 검증 패키지, 흐름 운영, 반복 판단의 자산화
- [[Agent-Swarm-Containment|에이전트 군집 격리]]: 공유 자원과 비인가 통신, 평가 환경의 권한 경계, 기록 무결성과 사고 조사 한계
- [[Tool-Call-Inspection-Proxy|도구 호출 검사 프록시]]: 에이전트와 모델 사이에서 도구 호출을 실행 전에 검사하는 safeagents의 세 단계 검사, 간접 주입이 대화 기반 허용 목록을 통과하는 경로, 직접 규칙과 무인 실행 배치

## 함께 볼 문서

- [[Harness-Systems|하네스 시스템]]
- [[AI-Governance-Observability|관측 신호로 집행하는 AI 거버넌스]] — 거버넌스 단계별 런타임 신호와 통제 지점
