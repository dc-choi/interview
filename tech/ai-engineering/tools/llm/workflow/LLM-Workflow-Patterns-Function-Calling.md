---
tags: [ai, agent, function-calling, skills]
status: done
verified_at: 2026-09-04
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Workflow Patterns Function Calling", "Function Calling", "스킬 시스템"]
---

# LLM 워크플로우 패턴: Function Calling과 스킬 시스템

모델이 사용자 발화와 함수 스키마를 보고 호출할 도구와 파라미터를 정하는 능력, 그리고 특정 플랫폼 사례의 스킬 시스템과 처리 단계를 다룬다. 상위: [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]].

## Function Calling: 모델이 도구를 다루는 능력

Function Calling은 LLM이 외부 도구(함수)를 호출하는 능력이다. 모델은 **사용자 발화와 함수 스키마**를 보고, 어떤 함수를 호출할지와 어떤 파라미터를 넣을지를 생성한다. API 결과(보통 JSON)는 사람이 읽기 어려우므로, 모델이 다시 사람 친화적인 문장이나 표로 정리한다.

연결을 표준화한 프로토콜 관점은 [[MCP|MCP]](모델-도구 연결 표준)이고, Function Calling은 그 위에서 모델이 실제로 함수를 고르고 호출하는 **모델 능력** 레이어다.

### HyperCLOVA X Skill Universe 사례의 스킬 시스템

이 절의 스킬과 스킬셋은 출처 발표에서 사용한 특정 플랫폼 용어다. 특정 API 묶음을 LLM에 연결해 에이전트를 만드는 구조를 가리킨다.

- **스킬** = API 하나, **스킬셋** = 한 서비스를 위한 API 묶음
- 여행 API 묶음을 붙이면 여행 에이전트, 쇼핑 API 묶음을 붙이면 쇼핑 에이전트 — **묶음을 바꾸면 에이전트의 성격이 바뀐다**

플랫폼을 넘어 통용되는 정의로 일반화하면 안 된다. 예를 들어 2026-09-04 현재 OpenAI의 Agent Skills에서 스킬은 `SKILL.md`와 선택적 scripts, references를 담은 디렉터리이며, 하나의 API와 동의어가 아니다.

처리 3단계:

| 단계 | 역할 |
|------|------|
| **Detector** | 사용자 질문이 API로 풀 문제인지 판별 |
| **CoT** | 어떤 API를 호출하고 어떤 파라미터를 넣을지 추론 (Chain of Thought, 중간 추론으로 행동 결정) |
| **Answer** | API 결과를 사람이 이해할 문장이나 표로 정리 |

- **멀티턴**: 이전 맥락을 활용("ABC 동물병원 전화번호" → 다음에 "BB도" 하면 BB 동물병원으로 해석)
- **멀티쿼리**: 여러 API 호출이 필요한 복잡 요청을 여러 단계로 분할 실행
- **강건성**: 함수 이름이나 속성을 난독화해도 동작하도록 학습시켜 모델이 표면 명칭에 과의존하지 않게 함
- **평가**: Berkeley Function Calling Leaderboard로 형식 준수, 실행 가능성, 관련성, 멀티턴 처리를 측정. 형식, 실행 성능은 성숙했으나 **멀티턴 성능이 공통 개선 과제**

학습 데이터(질문, 생각, API 호출, 답변 형식)는 처음부터 손으로 만들 필요 없이, 기본 CoT 모델이 초안을 생성하고 잘못된 부분만 사람이 고치는 방식으로 누적한다. 답변 포맷(표, 추천 URL 위치 등)도 학습 대상이며, 수백 건이 쌓이면 거의 일정한 형식으로 생성된다.

## 면접 체크포인트

- Function Calling 3단계(Detector → CoT → Answer)와 멀티턴/멀티쿼리, 멀티턴이 공통 과제인 이유
- HyperCLOVA X Skill Universe 사례의 스킬 vs 스킬셋, 그리고 다른 플랫폼의 skill 정의와 구분

## 사례
- API 에이전트 플랫폼: 스킬셋 연결로 도메인 에이전트 생성, Detector-CoT-Answer 처리, 리트리벌 스킬(CoT+랭킹으로 RAG 확장)과 근거를 XML로 표시하는 랭킹 모델로 출처 추적.

## 출처
- [LLM 에이전트 실무 사례 (물어보세, 스마트 마이 노트, HyperCLOVA X Skill Universe) — 개발 컨퍼런스 (YouTube)](https://www.youtube.com/watch?v=wEVPnYOuAf8&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew)
- [OpenAI, Build skills](https://learn.chatgpt.com/docs/build-skills)

## 관련 문서
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴 (묶음 인덱스)]]
- [[LLM-Workflow-Patterns-Chain-vs-Agent|체인과 에이전트, 그리고 절충]]
- [[LLM-Workflow-Patterns-Text-to-SQL|Text-to-SQL과 데이터 디스커버리]]
- [[LLM-Workflow-Patterns-Data-and-Operations|데이터와 모델, 환각 통제와 운영]]
- [[Agent-From-Scratch|에이전트 직접 만들기 (도구 호출 루프 구현)]]
- [[MCP|MCP]] — 모델-도구 연결 표준 (Function Calling의 연결 레이어)
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]] — 리트리벌, 구조화 조회, 근거 추적
