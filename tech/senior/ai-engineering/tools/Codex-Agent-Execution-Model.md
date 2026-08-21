---
tags: [senior, ai, codex, llm, agent, tool-calling]
status: done
verified_at: 2026-08-21
category: "Senior - AI 엔지니어링"
aliases: ["Codex Agent Execution Model", "Codex 동작 원리", "코덱스 에이전트 동작 원리"]
---

# Codex 동작 원리: 키워드로 이해하기

## 결론부터

**ChatGPT에서 채팅하는 것과 Codex에게 문서를 고쳐 달라고 하는 것은 뼈대가 같다.** 둘 다 입력을 토큰으로 바꾸고, 컨텍스트를 참고해 모델이 다음 출력을 생성한다.

갈림길은 모델이 무엇을 출력하느냐다.

| 모델의 출력 | 그다음 일어나는 일 |
|---|---|
| `Final Answer` | 화면에 답변을 표시하고 작업을 끝낸다. |
| `Tool Call` | 실행기가 파일 읽기나 수정 같은 행동을 하고, 결과를 모델에 돌려준다. |

ChatGPT의 파일 기능도 관찰 가능한 역할만 놓고 보면 두 번째 흐름으로 이해할 수 있다. 다만 공개 문서는 파일 생성과 수정 능력만 확인하며, 내부 구현이 Codex와 동일하다고 밝히지는 않는다. Codex의 특징은 실행 환경이 실제 작업 디렉터리, 셸, Git과 연결된다는 점이다.

## 다섯 키워드로 먼저 외우기

```text
Tokenizer → Context → Model → Tool → Verification
   쪼갠다      모은다     판단한다   실행한다    확인한다
```

조금 더 펼치면 다음 구조다.

```text
사용자 문장
  ↓ Tokenizer
Token과 Token ID
  ↓ Context Builder
지침 + 대화 + 파일 내용 + 도구 설명
  ↓ Model
  ├─ Final Answer ─────────────→ 채팅 화면
  └─ Tool Call → Runtime → 파일/셸
                    ↓
                Tool Result
                    └──────────→ Model로 되돌아감
```

가장 중요한 구분은 **모델은 행동을 요청하고, Runtime이 실제 행동을 수행한다**는 것이다.

## 1. 입력을 쪼개는 키워드

### Tokenizer

텍스트를 모델이 처리할 수 있는 토큰과 숫자 ID의 열로 바꾸고, 출력 ID를 다시 텍스트로 바꾸는 구성요소다. 단어 사전처럼 보이지만 한 단어가 여러 토큰으로 나뉠 수도 있고, 자주 쓰는 문자열 묶음이 한 토큰이 될 수도 있다.

### Token

모델이 읽고 생성하는 기본 단위다. 사용자 문장, 지침, 파일 내용, 도구 결과와 최종 답변이 모두 토큰 공간을 사용한다. 토큰 수는 컨텍스트 한도, 처리 시간과 API 비용에도 영향을 준다.

```text
문자열 → Tokenizer → Token ID들 → Model
```

## 2. 모델 안에서 판단하는 키워드

| 키워드 | 머릿속에 남길 뜻 |
|---|---|
| **Embedding** | 각 Token ID를 모델 계산에 쓸 숫자 벡터로 바꾼 표현 |
| **Transformer** | 여러 층을 통과하며 토큰 관계를 계산하는 모델 구조 |
| **Attention** | 현재 출력을 만들 때 컨텍스트의 어느 토큰 관계를 얼마나 참고할지 계산하는 장치 |
| **Logit** | 다음 후보 토큰마다 모델이 계산한 선택 점수 |
| **Decoding과 Sampling** | Logit을 바탕으로 다음 토큰을 고르는 과정, Sampling은 그 방법 중 하나 |
| **Autoregressive** | 방금 고른 토큰을 입력에 붙이고 다음 토큰 생성을 반복하는 방식 |

이를 한 줄로 단순화하면 다음과 같다.

```text
P(다음 Token | 지금까지의 Token들)
```

자연어 답변도, 코드도, 구조화된 Tool Call도 이 반복 생성의 결과다.

### Training, Inference와 Reasoning Token

- **Training**은 데이터에서 패턴을 학습해 가중치를 만드는 과정이고, **Inference**는 그 가중치와 현재 Context로 지금의 출력을 계산하는 과정이다. 현재 대화는 재학습이 아니라 이번 Inference의 입력이다.
- **Reasoning Token**은 Reasoning 모델이 최종 답변 전에 문제 풀이와 도구 선택에 사용하는 내부 계산용 토큰이다. 원시 내용은 공개되지 않으며, 지원되는 설정의 reasoning summary도 원시 추론 기록 자체는 아니다.

## 3. 판단 재료를 모으는 키워드

| 키워드 | 머릿속에 남길 뜻 |
|---|---|
| **Prompt** | 모델에 전달되는 요청과 지침 |
| **Context** | 모델이 이번 판단에서 참고하도록 조립된 전체 입력 |
| **Context Builder** | 지침, 대화, 파일과 도구 결과를 Context로 모으는 개념적 호스트 구성요소 |
| **Context Window** | 한 번의 처리에서 입력, 출력과 reasoning token이 사용할 수 있는 최대 범위 |
| **Instruction Hierarchy** | 상위 안전 규칙부터 사용자 요청까지 적용되는 지침 우선순위 |

```text
상위 지침
+ 사용자 요청
+ AGENTS.md
+ 대화 기록
+ 읽어 온 파일
+ 사용 가능한 도구 명세
+ 이전 Tool Result
= 현재 Context
```

대화가 길어지면 오래된 내용을 압축하거나 필요한 파일을 다시 읽을 수 있다. 따라서 Context는 장기 기억과 같지 않다. Codex는 일반적으로 프로젝트 루트부터 현재 작업 디렉터리까지 `AGENTS.md`를 찾는다. 이 vault처럼 저장소 규칙이 대상 경로의 지침을 추가로 읽도록 요구할 수도 있다.

## 4. 실제 행동으로 이어지는 키워드

| 키워드 | 머릿속에 남길 뜻 |
|---|---|
| **Tool Calling** | 모델이 도구 이름과 인자를 담아 보내는 구조화된 실행 요청 |
| **Runtime 또는 Host** | 권한을 검사한 뒤 파일, 셸, 웹과 Git에서 실제 행동을 수행하는 프로그램 |
| **Tool Result** | 실행 뒤 모델에 돌아오는 파일 내용, 명령 출력, 검색 결과 또는 오류 |
| **Agent Loop** | `판단 → 도구 호출 → 실행 → 결과 관찰 → 재판단`을 완료까지 반복하는 구조 |

```text
Model → Tool Call → Runtime → Tool Result → Model → ... → Final Answer
```

작업 중 보이는 진행 메시지는 루프가 끝났다는 뜻이 아니다. 최종 답변을 반환하면 루프가 종료된다.

## 5. 행동을 통제하고 확장하는 키워드

| 키워드 | 역할 |
|---|---|
| **Sandbox** | 파일 읽기, 쓰기와 네트워크 접근의 기술적 범위를 제한한다. |
| **Approval** | 허용 범위를 넘는 행동 전에 사용자 확인을 받게 한다. |
| **AGENTS.md** | 저장소에서 지킬 규칙과 완료 조건을 모델에 알려 준다. 보안 장치 자체는 아니다. |
| **Skill** | 특정 작업을 반복하는 절차, 자료와 템플릿을 제공한다. |
| **MCP** | 외부 데이터나 서비스를 도구로 연결하는 표준 경계다. |
| **Memory** | 이전 작업의 유용한 맥락을 이후 대화에 다시 제공하는 선택적 기능이다. |
| **Subagent** | 독립적인 탐색, 구현이나 검토를 별도 컨텍스트에 위임한다. |
| **Verification** | 테스트, 출처와 diff로 결과가 실제로 맞는지 확인한다. |

`AGENTS.md`가 하지 말라고 적는 것은 지침이고, Sandbox가 접근을 차단하는 것은 기술적 강제다. 반드시 막아야 하는 조건은 권한, 훅, 서버 검증과 테스트로 집행해야 한다.

이 vault는 Claude Code auto memory를 비활성화한다. Codex local memory는 별도 호스트 설정을 사용하는 선택적 기능이다. 지속 규칙은 `AGENTS.md`, 반복 절차는 Skill, 기술 지식은 문서에 둔다.

## ChatGPT 채팅과 Codex 문서 수정 비교

| 단계 | 일반 채팅 | 문서 수정 |
|---|---|---|
| 입력 처리 | Tokenizer가 문장을 Token으로 바꿈 | 같다. |
| 판단 재료 | 지침과 대화가 Context에 들어감 | 여기에 파일 내용과 저장소 규칙이 더해짐 |
| 모델 처리 | 다음 출력을 생성 | 같다. |
| 출력 분기 | 주로 Final Answer | 파일 도구가 필요하면 Tool Call |
| 실제 행동 | 화면에 답변 표시 | Runtime이 작업 디렉터리의 파일을 수정 |
| 반복 | 다음 사용자 메시지를 기다림 | Tool Result를 받아 스스로 다음 호출을 이어 갈 수 있음 |

그러므로 **ChatGPT와 Codex는 완전히 다른 원리가 아니라, 같은 계열의 생성 원리에 서로 다른 실행 환경을 붙인 경우**로 이해하면 된다. 실제 모델 종류는 제품과 설정에 따라 다를 수 있다. ChatGPT 파일 기능은 관찰 가능한 역할만 이 흐름에 대응시킬 수 있으며, 내부 오케스트레이션이 같다고 확인된 것은 아니다.

## 지금 이 문서를 고치는 실제 흐름

1. 사용자의 문장이 Tokenizer를 거쳐 토큰이 된다.
2. 요청, 저장소 지침과 도구 설명이 Context로 조립된다.
3. 모델이 기존 문서를 읽기 위한 Tool Call을 만든다.
4. Runtime이 파일을 읽고, 그 내용이 Tool Result를 통해 Context에 들어온다.
5. 모델이 키워드 중심 개정안을 만들고 수정 Tool Call을 보낸다.
6. Runtime이 파일을 수정한다.
7. 모델이 줄 수, 링크, 금지 문자와 diff를 검사하는 도구를 호출한다.
8. 검증 결과가 통과하면 Final Answer를 보낸다.

즉, 한 번에 문서 전체를 마음속으로 고친 것이 아니라 짧은 판단과 도구 실행이 여러 번 왕복한 결과다.

## 자주 헷갈리는 것

- **모델은 파일 시스템을 직접 만지지 않는다.** Runtime이 Tool Call을 실행한다.
- **Context는 영구 기억이 아니다.** 현재 판단에 들어온 작업 메모리에 가깝다.
- **Reasoning Token은 공개된 생각 일지가 아니다.** 원시 내용은 노출되지 않는다.
- **유창한 답변은 검증된 답변과 다르다.** 최신 파일과 외부 상태는 도구로 확인해야 한다.
- **도구 결과도 항상 참은 아니다.** 실패, 잘린 출력과 오래된 데이터를 다시 검증해야 한다.

## 관련 문서

- [[Codex-CLI|Codex CLI 사용과 설정]]
- [[Context-Engineering|컨텍스트 엔지니어링]]
- [[Agent-Loop-Engineering|에이전트 루프 엔지니어링]]
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]]
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]]
- [[Agent-Skills|에이전트 Skill]]
- [[MCP|Model Context Protocol]]

## 출처

- [Key concepts - OpenAI API](https://developers.openai.com/api/docs/concepts)
- [Reasoning models - OpenAI API](https://developers.openai.com/api/docs/guides/reasoning)
- [Function calling - OpenAI API](https://developers.openai.com/api/docs/guides/function-calling)
- [Conversation state - OpenAI API](https://developers.openai.com/api/docs/guides/conversation-state)
- [Best practices - OpenAI](https://learn.chatgpt.com/guides/best-practices)
- [Custom instructions with AGENTS.md - OpenAI](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Agent approvals and security - OpenAI](https://learn.chatgpt.com/docs/agent-approvals-security)
- [Memories - OpenAI](https://learn.chatgpt.com/docs/customization/memories)
- [Subagents - OpenAI](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Work with files - OpenAI](https://learn.chatgpt.com/docs/artifacts-viewer)
