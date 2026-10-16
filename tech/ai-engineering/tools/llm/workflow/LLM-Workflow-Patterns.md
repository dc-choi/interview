---
tags: [ai, agent, workflow, function-calling, text-to-sql, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Workflow Patterns", "LLM 워크플로우 패턴"]
---

# LLM 워크플로우 패턴 (체인 vs 에이전트, Function Calling)

LLM 서비스의 중심축은 "질문하면 답하는 챗봇"에서 **업무 흐름 안에서 실제 행동을 수행하는 에이전트**로 이동한다. "이번 분기 성과 정리해줘" 한마디에 AI가 Jira, 문서, OKR, 평가 기준을 찾아 초안을 만드는 식이다. 다만 모든 문제를 에이전트로 풀 필요는 없고, 문제 성격에 맞는 워크플로우 구조를 고르는 것이 설계의 핵심이다. 에이전트 위임의 신뢰 설계 자체는 [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]]를 참고.

## 목차

- [[LLM-Workflow-Patterns-Chain-vs-Agent|체인과 에이전트, 그리고 절충]]: 업무의 예측 가능성에 따른 선택, 현장 제어와 대화 지원의 지연 예산, 그래프 워크플로우, Plan-and-Execute, 되돌릴 수 없는 행동 직전 승인, 콘텐츠 초안과 승인 대기열, n8n 오류 처리와 자동 실행 검증
- [[LLM-Workflow-Patterns-Function-Calling|Function Calling과 스킬 시스템]]: 함수 스키마와 호출 결정, MCP와의 계층 구분, HyperCLOVA X Skill Universe의 Detector-CoT-Answer, 멀티턴과 평가, 다른 플랫폼의 skill 정의와 구분
- [[LLM-Workflow-Patterns-Text-to-SQL|Text-to-SQL과 데이터 디스커버리]]: 스키마, 업무 정의와 예시 SQL의 맥락 구성, 메타데이터 정본과 검색용 사본, 생성, 검증과 실행의 경계, 결과 집합 비교, 오류별 복구 지점
- [[LLM-Workflow-Patterns-Data-and-Operations|데이터와 모델, 환각 통제와 운영]]: 도메인 특화 서비스의 데이터 우선, 근거 기반 답변과 영역 선택, 빠른 피드백 루프, 시작 전략, 내부 지식 봇의 효과 검증
- [[LLM-Workflow-Expressions|워크플로 표현식과 실행 경계]]: JSONata의 표현력, 계산 제한, 호스트 함수와 도구 권한

## 함께 볼 문서

- [[llm|LLM 원리와 운영]]
