---
tags: [ai, agent, function-calling, skills]
status: done
verified_at: 2026-10-26
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Workflow Patterns Function Calling", "Function Calling", "스킬 시스템"]
---

# LLM 워크플로우 패턴: Function Calling과 스킬 시스템

모델이 사용자 발화와 함수 스키마를 보고 호출할 도구와 파라미터를 정하는 능력, 특정 플랫폼 사례의 스킬 시스템과 처리 단계, 도구 정의의 설명, 예시와 호출 강제 설정을 다룬다. 상위: [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]].

## Function Calling: 모델이 도구를 다루는 능력

Function Calling은 LLM이 외부 도구(함수)를 호출하는 능력이다. 모델은 **사용자 발화와 함수 스키마**를 보고, 어떤 함수를 호출할지와 어떤 파라미터를 넣을지를 생성한다. API 결과(보통 JSON)는 사람이 읽기 어려우므로, 모델이 다시 사람 친화적인 문장이나 표로 정리한다.

연결을 표준화한 프로토콜 관점은 [[MCP|MCP]](모델-도구 연결 표준)이고, Function Calling은 그 위에서 모델이 실제로 함수를 고르고 호출하는 **모델 능력** 레이어다.

### HyperCLOVA X Skill Universe 사례의 스킬 시스템

이 절의 스킬과 스킬셋은 출처 발표에서 사용한 특정 플랫폼 용어다. 특정 API 묶음을 LLM에 연결해 에이전트를 만드는 구조를 가리킨다.

- **스킬** = API 하나, **스킬셋** = 한 서비스를 위한 API 묶음
- 여행 API 묶음을 붙이면 여행 에이전트, 쇼핑 API 묶음을 붙이면 쇼핑 에이전트 — **묶음을 바꾸면 에이전트의 성격이 바뀐다**

플랫폼을 넘어 통용되는 정의로 일반화하면 안 된다. 예를 들어 2026-10-26 현재 OpenAI의 Agent Skills에서 스킬은 `SKILL.md`와 선택적 scripts, references를 담은 디렉터리이며, 하나의 API와 동의어가 아니다.

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

## 도구 정의는 설명이 선택을 좌우한다

모델은 도구 이름, 설명과 입력 스키마를 보고 호출할 도구와 인자를 고르므로 정의의 품질이 호출 정확도를 좌우한다. 2026-10-26 Anthropic 도구 정의 문서는 매우 자세한 설명을 도구 성능에 가장 큰 영향을 주는 요소로 꼽는다.

- **설명**: 도구가 하는 일, 써야 할 때와 쓰지 말아야 할 때, 매개변수마다의 의미와 동작에 주는 영향, 돌려주지 않는 정보 같은 한계를 적는다. 도구마다 최소 3~4문장을 권하고 복잡한 도구는 더 쓴다. 주가 조회 도구라면 어느 거래소의 티커를 받는지, 최근 거래가를 어떤 통화로 돌려주는지, 가격 외에 그 종목이나 회사에 관한 다른 정보는 주지 않는다는 점까지 적는 식이다.
- **입력 예시**: 중첩 객체, 선택 매개변수, 형식에 민감한 입력이 있는 도구는 `input_examples`로 스키마에 맞는 예시를 줄 수 있다. 스키마에 맞지 않는 예시는 400이고, 서버 도구와 computer use, browser use 도구 묶음에는 쓸 수 없다. 단순 예시는 약 20~50토큰, 복잡한 중첩 객체는 약 100~200토큰을 프롬프트에 더하며 설명을 대신하지 않는다.
- **도구 수와 이름**: 동작마다 도구를 따로 만들기보다 관련 동작을 `action` 매개변수를 가진 도구 하나로 묶으면 선택의 모호성이 줄어든다. 여러 서비스에 걸치면 `github_list_prs`처럼 서비스 접두사를 붙인다.
- **결과**: 다음 판단에 필요한 필드와 슬러그, UUID 같은 의미 있고 안정적인 식별자만 돌려준다. 불필요하게 큰 결과는 컨텍스트를 낭비하고 중요한 정보를 찾기 어렵게 만든다.
- **추론 대신 설명**: 호출 이유를 받는 매개변수에는 짧은 설명이나 근거를 요구한다. 모델의 사고나 단계별 추론을 요구하면 `reasoning_extraction` 거절이 날 수 있다([[LLM-Failure-Handling-Response-Validation#200 응답은 stop_reason부터 확인한다|거절 처리]]).
- **호출 강제**: `tool_choice`는 `auto`(도구를 주면 기본값), `any`, `tool`, `none`이다. `any`와 `tool`은 자연어 설명 없이 바로 `tool_use`를 내고 사고도 건너뛴다. 수동 extended thinking 설정에서는 `any`와 `tool`이 오류이므로 `auto`나 `none`을 쓴다. Claude Opus 5.5, Sonnet 5.5, Fable 5.1, Mythos 5.1은 사고 설정과 관계없이 둘을 400으로 거부하므로, `auto`에 strict tool use를 붙여 입력 스키마를 보장하거나 고정 JSON이 필요하면 구조화 출력을 쓴다([[LLM-Failure-Handling-Recovery|폴백 모델의 기능 차이]]).

사용자 정의 도구와 bash, text editor 같은 클라이언트 도구는 애플리케이션이 실행해 `tool_result`로 결과를 돌려주고, web search 같은 서버 도구는 Anthropic 인프라에서 실행된다. 애플리케이션이 실행하는 루프와 권한 검사는 [[LLM-Generation-Mechanics-Context-and-Agent#모델이 에이전트가 되는 지점|모델이 에이전트가 되는 지점]]을 따른다. 지시, 예시와 출력 형식 같은 프롬프트 기법 전반은 [[LLM-Prompt-Engineering|프롬프트 엔지니어링]]에서 다룬다.

## 면접 체크포인트

- Function Calling 3단계(Detector → CoT → Answer)와 멀티턴/멀티쿼리, 멀티턴이 공통 과제인 이유
- HyperCLOVA X Skill Universe 사례의 스킬 vs 스킬셋, 그리고 다른 플랫폼의 skill 정의와 구분
- 도구 설명에 넣을 네 가지(하는 일, 쓸 때와 쓰지 않을 때, 매개변수 의미, 한계)와 `input_examples`가 설명을 대신하지 못하는 이유

## 사례
- API 에이전트 플랫폼: 스킬셋 연결로 도메인 에이전트 생성, Detector-CoT-Answer 처리, 리트리벌 스킬(CoT+랭킹으로 RAG 확장)과 근거를 XML로 표시하는 랭킹 모델로 출처 추적.

## 출처
- [LLM 에이전트 실무 사례 (물어보세, 스마트 마이 노트, HyperCLOVA X Skill Universe) — 개발 컨퍼런스 (YouTube)](https://www.youtube.com/watch?v=wEVPnYOuAf8&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew)
- [OpenAI, Build skills](https://learn.chatgpt.com/docs/build-skills) — 2026-10-26 스킬 디렉터리 정의를 다시 대조했다.
- [Claude Platform Docs, Tool use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) — 2026-10-26 클라이언트 도구와 서버 도구의 실행 위치를 대조했다.
- [Claude Platform Docs, Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) — 2026-10-26 설명 작성, `input_examples` 제약, 도구 묶기와 이름, 결과 설계, `tool_choice` 제약을 대조했다.
- [Amazon Bedrock을 활용한 프롬프트 엔지니어링 모범사례 — Amazon Web Services Korea (YouTube)](https://www.youtube.com/watch?v=84462rNBg1k) — 2024-09-12 공개. 도구 설명과 예시를 다룬 음성 전사를 계기로 삼았고, 본문에는 2026-10-26 공식 문서로 대조한 내용만 넣었다.

## 관련 문서
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴 (묶음 인덱스)]]
- [[LLM-Workflow-Patterns-Chain-vs-Agent|체인과 에이전트, 그리고 절충]]
- [[LLM-Workflow-Patterns-Text-to-SQL|Text-to-SQL과 데이터 디스커버리]]
- [[LLM-Workflow-Patterns-Data-and-Operations|데이터와 모델, 환각 통제와 운영]]
- [[Agent-From-Scratch|에이전트 직접 만들기 (도구 호출 루프 구현)]]
- [[MCP|MCP]] — 모델-도구 연결 표준 (Function Calling의 연결 레이어)
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]] — 리트리벌, 구조화 조회, 근거 추적
- [[LLM-Prompt-Engineering|프롬프트 엔지니어링 (기법별 현재 계약, 프리필 대체)]]
