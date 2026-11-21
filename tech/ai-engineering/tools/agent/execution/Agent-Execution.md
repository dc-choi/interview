---
tags: [ai, agent, orchestration, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Execution", "에이전트 실행 구조"]
---

# 에이전트 실행 구조

에이전트가 도는 구조를 설계하는 문서 묶음 — 에이전트의 정의와 구성 요소, 도구 호출 루프와 계획 검증, 컨텍스트 예산, 바깥 루프와 정지 조건, 실행 그래프, 설정으로 정의하는 런타임, 상시 실행 에이전트의 주변 구조, 관리형 호스팅 런타임과 상주 에이전트 사례. 상위: [[agent|에이전트 심화]].

## 목차

- [[AI-Agent-Anatomy-and-Lineage|AI 에이전트의 정의, 계보와 구성 요소]]: 약한 에이전트 개념과 지각, 행동 정의, 액터 모델에서 AutoGPT까지의 계보, LLM 코어, 계획과 추론, 기억, 도구, 환경과 CoALA의 내부와 외부 행동, 시스템, 데이터, 평가 층으로 나누는 문제 진단, 구성 요소별 실패 지점
- [[Bedrock-Agents-Action-Execution|Bedrock Agents 작업 실행]]: Agents Classic의 제공 범위, 작업 정의, Lambda와 RETURN_CONTROL, 사용자 확인과 멱등성
- [[Agent-From-Scratch|에이전트 직접 만들기]]: 모델, 오케스트레이션, 도구 계층, 도구 호출 루프와 병렬 호출, 도구 정의, 계획 검증과 saveAs/inputFrom 데이터 흐름, 메모리 세 종류, 실패별 패치로 키우는 학습 경로(Harness Engineering 101)
- [[Agent-Context-Budget|에이전트 컨텍스트 예산]]: 경계 밖 설계 — 파일 Lazy Loading, 목록 Hybrid, 스킬 Catalog-First, Compaction 대신 사전 통제, hard cap, nac의 실행 컨텍스트를 버리는 thread와 episode 인계, 추론 노력과 속도 모드의 비교(발표 기준)
- [[Agent-Loop-Engineering|루프 엔지니어링]]: 정지 조건이 본질, ralph 흡수 계보, 4중 루프 아키텍처 축과 공식 4분류 위임 축, 목표 상태의 전이 권한, 3종 가드, 하네스의 한 층 위
- [[Agent-Graph-Engineering|그래프 엔지니어링]]: 노드, 엣지, 상태와 조건, 코드와 모델과 사람의 판정 분담, 실패 노드로의 복귀와 재시도 한도, 사람 승인 노드의 재개 경계
- [[Autonomous-Graph-Driven-Development|자율 그래프 주도 개발]]: 예약 실행되는 멱등 노드와 스펙 원장, 질문 이슈로 사람을 부르는 흐름, 강등과 재확정, 턴 한도와 draft PR 이어받기, 동시 작업 한도, 결정 대기로 수렴하는 리드타임
- [[Agent-Declarative-Runtime|선언형 에이전트 런타임]]: Docker Agent의 YAML 정의, 실행과 API, MCP, A2A 노출, OCI 배포, 세 가지 위임, 권한 경계와 Docker Agent의 A2A 인증 제약, 루프 가드와 예산
- [[Hermes-Agent|Hermes Agent]]: 게이트웨이 상주 에이전트, 스킬과 메모리 파일로 남는 학습 루프, 프로필별 홈과 게이트웨이, Kanban 작업 보드, 허용 목록과 명령 승인, 에이전트 작성 스킬 검토
- [[ChatGPT-Dots|ChatGPT dots]]: 자기 클라우드 컴퓨터를 가진 상시 실행 에이전트, 고정 예약과 자율 후속 확인, 읽기 전용 선제적 리서치와 사용자 정의 규칙, 비공개 양식 로그인과 제어권 인계, 클라우드 컴퓨터와 연결 컴퓨터 선택, 위임 계약, Codex 클라우드 환경의 구성과 Linux 한계, 한 문장 위임과 대리 답장 사례
- [[Always-On-Agent-Architecture|상시 실행 에이전트의 구조]]: 실행과 세션의 순환, 이벤트 수신함(빠른 응답, 진실의 원천, 단일 작업자, 묶음 처리), 후속 확인과 일정 타이머, 다시 조회할 수 없는 것만 남기는 메모리, 자격 증명 프록시와 미룬 도구 호출, 발신함과 발송량 평가, 모델 비용 수치의 조건

- [[Agent-Runtime-Deployment|에이전트 런타임과 배포]] — 정의, 영속 상태와 배포 경계, 팀이 기대는 업무 자동화의 workflow와 런타임 책임, Cursor Agent SDK의 코드 정의와 eval/replay, Agents API 베타와 검토 화면이 부르는 원격 에이전트(발표 기준)
- [[Bedrock-AgentCore-Runtime|Bedrock AgentCore Runtime 실행 계약]]: microVM과 Instances, 세션 수명 타이머, 버전과 엔드포인트, 프로토콜별 포트와 오류, /ping, 인바운드와 아웃바운드 인증, platform version V2
- [[Bedrock-AgentCore-Harness|Bedrock AgentCore Harness]]: 설정으로 정의하는 관리형 에이전트, 코드 에이전트와의 루프 소유 차이, 모델 제공자와 API 형식, 상한, 생성 자원과 비용, 코드 내보내기, CLI 생성, 개발, 배포 흐름

## 함께 볼 문서

- [[agent|에이전트 심화]]
