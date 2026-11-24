---
tags: [ai, agent, integration, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Integration", "에이전트와 업무 시스템 연결"]
---

# 에이전트와 업무 시스템 연결

에이전트가 업무 시스템의 API, 데이터, 메일 채널과 보고서 흐름에 연결될 때의 계약과 경계 — 친화 API 설계, 데이터 준비, 이메일 인터페이스, 데이터 분석과 보고서. 상위: [[agent|에이전트 심화]].

## 목차

- [[Agent-Ready-API-Design|에이전트 친화 API 설계]]: 사람+AI 공용 인터페이스, 명령 발견과 실패 계약(OpenAI CLI의 기본 텍스트 출력과 신뢰하지 않는 stdin 포함), 상품 ID 반환과 화면 조립 분리, 출력 밀도, Vibe Test 공정성
- [[Agent-Ready-Data|에이전트용 데이터 준비]]: 5속성 Trusted/Contextual/Traceable/Governed/Operational, 계약 검증 게이트와 격리, agentic lineage, 위임 접근과 JIT 자격증명, 지표 정의를 코드로, 능력 선언과 가역성 3등급, 단계적 자율성 4단계와 승격 증거
- [[Agent-Email-Interface|이메일 에이전트 인터페이스]]: 비동기 궁합, 주소=라우팅 키, 엔티티별 DO 격리, HITL 발신 게이트, 단일 신뢰 경계 명시, MCP vs CLI vs 스킬
- [[Public-Data-API-Grounding|공공 데이터 API로 에이전트 답변의 근거 연결]]: 공시, 통계, 법령, 사업자 상태, 실거래가, 학술 문헌의 공식 Open API, 원천과 집계 서비스의 차이, 실시간과 최신의 차이, 원천 식별 체계 입력, 키 보관, 0건과 실패 구분, 기준 시점 표기
- [[Agent-Data-Analysis-Workflow|에이전트 데이터 분석과 보고서]] — 계획, 계산과 보고서 검산, 데이터 에이전트 pass@1과 질문별 프롬프트, 시맨틱 레이어와 권한
- [[Data-Agent-Analysis-Scenarios|데이터 분석 에이전트의 단계와 분석 시나리오]]: 조회, 원인 분석, 조치 제안별 자산, 차이 분해의 순서와 검산, 검토 가능한 분석 시나리오 그래프, 문서 인과 관계의 후보 처리와 원인 추적, 과제 선정(발표 기준)
- [[Agent-Browser-Task-Boundaries|브라우저 에이전트의 작업과 권한 경계]]: 파일과 계정 권한, 정기 실행과 기억, 로컬 보관과 모델 전송, 공유 컴퓨터의 봇 격리 경계(Rakazo), 화면 공유의 조작 동의와 AI 조작 승인(Petal), 쓰던 브라우저를 빌려줄 때의 탭 소유, 인계와 가드레일의 한계(OpenCode Browse), 컴퓨터 사용의 경로 구분과 활동 기록 기억의 통제
- [[Agent-Desktop-Accessibility-CLI|접근성 트리 기반 데스크톱 조작]]: agent-desktop의 snapshot과 ref, headless 기본값과 fail-closed, 다중 에이전트의 입력 독점, 출력의 개인 정보와 비밀 값 전달, 스크린샷에 접근성 트리 텍스트를 붙이는 캡처(발표 기준)
- [[Siri-AI-App-Intents|Siri AI와 App Intents 앱 연동]]: 2026-11 Developer Preview의 공개 범위와 일정, 선언형 연동과 화면 조작의 차이, 상태 변경 동작의 멱등성과 확인
- [[Logistics-Operations-Agents|물류 운영 AI 에이전트]]: 메일 오더 접수의 판단, 기록, 확정 역할과 값의 출처, 운임 정산 대사와 사람 매핑, 예외 우선 브리핑, 결과와 이유를 남기는 데이터 층
- [[Meeting-Participant-Agent|회의 참석 AI 에이전트]]: 기록 도구와의 차이, 존재 알림과 전사 동의, 외부 참석자 정책, 말한 사람 기준의 도구 권한, 답의 공개 범위와 파생 기록, Claude Meetings 베타의 기본값과 비용(2026-11-25 도움말 기준)
- [[Contact-Center-AI-Agent|고객상담 AI 에이전트]]: 고객, IT 담당자, 상담 관리자의 요구, 셀프서비스 해결률과 이탈률의 구분, 상담 지표 정의, 단계적 도입, 사고 접수 뒤 아웃바운드의 본인 확인과 실패 경로, AI 판정의 참고값 지위

## 함께 볼 문서

- [[agent|에이전트 심화]]
