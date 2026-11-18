---
tags: [ai, llm, prompt-engineering, claude, bedrock, structured-output]
status: done
verified_at: 2026-10-26
category: "AI엔지니어링(AIEngineering)"
aliases: ["Prompt Engineering", "프롬프트 엔지니어링", "프롬프트 기법", "프리필 대체", "Few-shot 프롬프팅"]
---

# 프롬프트 엔지니어링 (Prompt Engineering)

프롬프트 엔지니어링은 지시, 역할, 예시, 근거 자료와 출력 형식을 컨텍스트에 넣어 모델 출력이 원하는 방향으로 좁혀지게 하는 작업이다. 같은 기법도 모델과 과업에 따라 효과가 달라서, Anthropic 프롬프트 가이드는 특정 모델에서 잰 기법을 다른 모델에 쓰기 전에 자기 평가로 다시 확인하라고 안내한다. 이 문서는 기법별 용도와 2026-10-26 Anthropic, AWS 공식 문서 기준의 계약을 정리하고 세부는 관련 문서로 넘긴다. 상위: [[llm|LLM 원리와 운영]].

## 프롬프트보다 성공 기준과 시험 입력을 먼저 만든다

Anthropic의 프롬프트 엔지니어링 개요는 시작 조건으로 사용 사례의 성공 기준, 그 기준으로 경험적으로 시험할 방법, 개선할 첫 초안을 든다. 평가 설계 안내는 실제 과업 분포를 닮은 문항에 경계 사례를 넣고, 자동 채점이 가능하게 문항을 짜며, 사람이 손으로 채점한 소수 문항보다 신호가 조금 약해도 자동 채점한 다수 문항을 우선하라고 권한다.

- 모든 실패가 프롬프트로 풀리지는 않는다. 같은 개요는 지연과 비용은 다른 모델을 고르는 편이 쉬울 때가 있다고 밝힌다. 지식 부족과 행동 문제의 구분은 [[LLM-Generation-Mechanics-Context-and-Agent#프롬프트, RAG와 파인튜닝은 바꿀 대상으로 고른다|바꿀 대상의 선택]]을 따른다.
- 문항 구성, 개발용 세트와 홀드아웃의 분리는 [[Eval-Golden-Set-and-Deploy-Gates#문항 구성과 홀드아웃|골든셋과 홀드아웃]], 평가를 개발 순서에 넣는 방식은 [[Evaluation-Driven-Development|평가 주도 개발]]을 따른다.
- Anthropic의 대화형 프롬프트 튜토리얼은 Claude 3 모델 기준으로 쓰였고, 개요는 현재 가이드와 다르면 가이드를 따르라고 명시한다. 같은 시기 자료의 기법은 아래 계약으로 다시 확인한다.
- 모델을 바꾸면 이전 모델의 약점을 메우려고 넣은 지시를 다시 본다. 가이드는 더 철저히 하거나 도구를 적극적으로 쓰라고 밀던 지시를 줄이라고 하며, Claude 4.6 모델이 더 능동적이라 그런 지시에 과잉 반응할 수 있다고 설명한다.

## 기법별 용도와 확인할 계약

| 기법 | 쓰는 상황 | 2026-10-26 기준 확인할 계약 | 세부 |
|---|---|---|---|
| 명확한 지시와 이유 | 형식, 제약과 순서가 중요한 작업 | 맥락을 거의 모르는 동료가 읽고 따라 할 수 있는지가 판정 기준이다. 지시의 이유를 함께 쓰면 모델이 그 설명을 일반화할 수 있다. 단계의 순서나 누락 없는 수행이 중요하면 지시를 번호 목록이나 글머리 목록의 순차 단계로 쓴다 | [[Agent-Spec-Writing\|스펙 작성]] |
| 역할 | 응답의 관점과 어조를 맞출 때 | 시스템 프롬프트의 한 문장으로도 행동과 어조의 초점이 맞춰진다고 안내한다. 정답률 개선은 가이드가 밝힌 효과가 아니므로 평가로 따로 확인한다 | [[Agent-Spec-Writing#역할과 작업 단위를 함께 명시한다\|역할과 작업 단위]] |
| 예시(few-shot) | 출력 형식, 어조와 구조를 맞출 때 | 3~5개를 권한다. 실제 사용 사례와 닮게, 경계 사례를 넣어 의도치 않은 패턴을 배우지 않을 만큼 다양하게, `<example>` 태그(여러 개면 `<examples>`)로 지시와 구분한다 | [[LLM-Product-Attribute-Extraction\|예시 정답 검증]], [[Eval-LLM-Judge\|예시의 편향과 비용]] |
| XML 태그 구조 | 지시, 맥락, 예시와 입력이 섞일 때 | 일관되고 설명적인 태그 이름을 쓰고 계층이 있으면 중첩한다. 메인 대화에 들어가는 제3자 콘텐츠는 태그 대신 아래처럼 `tool_result`에 넣고 가능하면 JSON 객체로 감싸라고 안내한다 | [[LLM-Application-Security#프롬프트와 모델 수준 방어 — Spotlighting과 Instruction Hierarchy\|구분자의 한계]] |
| 긴 문서 배치와 인용 추출 | 약 2만 토큰 이상의 입력 | 긴 자료를 위에, 질문과 지시와 예시를 아래에 두고 문서마다 태그와 출처를 붙이며 관련 구절을 먼저 뽑게 한다. 제3자 문서는 `tool_result`에 넣고 질문과 지시는 그 뒤 user 턴에 둔다(적용 제안) | [[Claude-Code-Business-Automation#긴 문서 분석과 출력 독자를 함께 지정한다\|긴 문서 분석]] |
| 출력 형식 | 화면이나 코드로 받을 출력 | 하지 말 것보다 할 것을 지시하고 프롬프트 문체를 원하는 출력 문체에 맞춘다. 스키마가 정해진 JSON은 지원 모델과 경로에서 구조화 출력을 우선 검토하고(인용과 함께 쓸 수 없다), 그 밖의 형식은 지시와 재시도나 XML 태그 추출로 받는다(적용 제안) | [[Simplified-Technical-English\|출력 문체 제약]] |
| 환각 완화 | 근거가 필요한 답 | 모르겠다고 답해도 된다고 명시하고, 2만 토큰이 넘는 문서는 구절을 그대로 먼저 뽑게 하며, 근거 인용을 찾지 못한 주장은 철회하게 한다. 가이드는 이 기법이 환각을 없애지는 못한다고 밝힌다 | [[LLM-Hallucination-Verification\|환각 검증]], [[LLM-Abstention\|응답 보류]] |
| 도구 정의 | 함수 호출 | 도구 설명이 도구 성능에 가장 큰 영향을 준다 | [[LLM-Workflow-Patterns-Function-Calling#도구 정의는 설명이 선택을 좌우한다\|도구 정의]] |
| 검색 결합 | 바뀌는 지식, 출처가 필요한 답 | 검색을 도구로 맡겨 모델이 소스와 질의를 고르는 에이전틱 구성은 정지 조건과 비용을 함께 설계한다(적용 제안) | [[RAG-Retrieval-Engineering#단발 RAG와 에이전틱 RAG\|단발 RAG와 에이전틱 RAG]] |

### 입력과 도구 결과를 먼저 검사한다

2026-10-26 Anthropic의 탈옥과 프롬프트 인젝션 완화 안내 기준이다.

- 경량 모델(안내 예시는 Claude Haiku 5.5)로 사용자 입력을 본 대화 전에 분류하고, 판정은 구조화 출력의 불리언처럼 단순한 값으로 받는다. 안내는 Haiku 5.5가 안전 분류기로 검사 요청 자체를 거절할 수 있으므로 `stop_reason`이 `refusal`인 응답을 유해 판정으로 처리하라고 한다. 같은 처리를 다른 검사 모델로 넓히는 것은 적용 제안이다.
- 웹페이지, 메일 본문, OCR 결과 같은 외부 콘텐츠는 `tool_result` 블록에만 넣고, 가능하면 JSON 객체의 문자열로 감싸 지시와의 경계를 분명히 한다. 앱의 지시는 `tool_result` 안에 넣지 않고 뒤따르는 user 턴에 둔다. 도구 결과도 같은 경량 모델 검사를 거친 뒤 돌려줄 수 있다.
- 작은 가드 모델은 본 모델과의 해석 능력 차이로 우회될 수 있으므로 검사 하나에 기대지 않고 출력과 도구 실행 단계의 권한 검사를 함께 둔다([[LLM-Application-Security#가드 모델 우회 — 능력 격차가 곧 취약점|가드 모델 우회]]).

## 개발자 지시와 사용자 입력을 역할로 나눈다

시스템 프롬프트는 애플리케이션 개발자가 쓰는 지시로 역할, 다룰 범위와 금지할 행동을 정하고, 사용자 프롬프트는 최종 사용자가 보낸 내용이다. 2026-11-18 OpenAI 문서 기준 Responses API는 앞의 것을 `developer` 메시지나 `instructions`로, 뒤의 것을 `user` 메시지로 받고 `developer` 메시지를 `user` 메시지보다 우선한다. 문서는 둘을 함수 정의와 그 함수에 넘기는 인자에 비유한다. 아래 예는 openai Python SDK 3.55.0으로 매개변수와 `output_text` 정의만 확인했고 API는 호출하지 않았다.

```python
from openai import OpenAI

client = OpenAI()  # OPENAI_API_KEY 환경 변수를 읽는다

student_question = input("질문: ")
response = client.responses.create(
    model="gpt-6.2-sol",
    input=[
        {"role": "developer", "content": (
            "너는 입문 프로그래밍 과목의 조교다. 과목과 컴퓨터과학 질문에만 답한다. "
            "과제의 완성 답안과 코드는 주지 말고 다음 단계를 생각하게 하는 질문이나 힌트를 준다."
        )},
        {"role": "user", "content": student_question},
    ],
)
print(response.output_text)
```

- **지시와 입력을 한 문자열로 잇지 않는다**: 지시 끝에 사용자 질문을 붙여 한 메시지로 보내면 모델이 개발자 지시와 사용자 입력을 역할로 구분할 근거가 사라진다(이 문서의 판단). 역할을 나눠도 우선순위가 지시 위반을 막는다는 보장은 아니므로 [[LLM-Application-Security#프롬프트와 모델 수준 방어 — Spotlighting과 Instruction Hierarchy|Instruction Hierarchy와 그 한계]]를 함께 본다.
- **`instructions`와 첫 `developer` 메시지를 구분한다**: 최상위 `instructions`는 그 요청에만 적용되고 `previous_response_id`로 이은 다음 응답에 넘어가지 않는다. 여러 턴에 쓸 지시는 `input`의 첫 `developer` 메시지에 둔다. GPT-6.2부터의 과금 차이는 [[OpenAI-GPT-Generations|OpenAI GPT 세대]]에 있다.
- **`output_text`는 SDK 편의 속성이다**: `output` 배열의 message 항목에서 `output_text` 조각만 이어 붙인다. 거절(`refusal`)이나 도구 호출만 있는 응답이면 빈 문자열이 되므로, 빈 답과 거절을 구분하려면 `output` 항목의 `type`을 본다.
- **금지 지시도 평가로 확인한다**: 완성 답안 요청, 범위 밖 질문, 지시를 무시하라는 요청을 평가 문항에 넣고 답 유출을 잰다. 답을 주지 않도록 지시했다는 사실이 실제로 답을 주지 않는다는 보장은 아니다([[AI-Tutoring-and-Mastery-Learning#위험을 수업 설계와 평가로 옮긴다|AI 튜터링의 위험]]).

## 템플릿은 입력 조립과 모델 호출을 분리한다

고정 지시와 매번 바뀌는 입력을 템플릿과 변수로 나누면 같은 지시를 여러 입력에 재사용할 수 있다. LangChain Python의 `PromptTemplate.from_template`은 문자열 템플릿을 만들며 기본 형식은 `f-string`이다. `ChatPromptTemplate.from_messages`는 역할과 내용으로 된 메시지 템플릿을 구성한다. 후자의 `invoke` 결과는 변수가 채워진 `ChatPromptValue`이며 모델이 생성한 답변이 아니다. 모델 호출은 별도로 연결한다. 이 절은 2026-11-04 LangChain 공식 API 참조로 확인했으며 실행 시험은 하지 않았다.

**적용 제안:** 고객 리뷰를 처리한다면 검토 기준과 출력 필드는 고정하고, 리뷰 원문과 조회한 상품 정보만 변수로 전달한다. 변수 치환이 성공했는지와 답변이 업무 기준에 맞는지는 별도로 검사한다. 템플릿으로 분리했다는 이유만으로 입력 속 지시문이 무력화되거나 출력이 안전해졌다고 판단하지 않는다.

템플릿 본문을 누가 작성하는지도 신뢰 경계다. LangChain API 참조는 신뢰할 수 없는 출처의 Jinja2 템플릿이 임의 Python 코드 실행으로 이어질 수 있다고 경고한다. 기본 샌드박스도 보안 보장이 아니므로 외부에서 받은 Jinja2 템플릿을 실행하지 않도록 권한다. 신뢰한 템플릿에 외부 텍스트를 값으로 넣는 것과 외부 텍스트 자체를 템플릿으로 실행하는 것을 구분한다.

## 채팅 템플릿은 모델이 학습한 형식을 따른다

메시지 API에 역할별 메시지를 보내면 그 메시지를 모델 입력으로 직렬화하는 일은 제공자가 맡는다. 가중치를 직접 서빙하거나 프롬프트 문자열을 손으로 조립하면 이 일을 애플리케이션이 맡는다. 채팅 모델도 토큰 시퀀스를 이어 쓰는 모델이라 `role`과 `content` 목록은 `<|user|>`나 `[INST]` 같은 제어 토큰이 든 하나의 토큰 시퀀스로 바뀌고, 그 형식을 정한 것이 채팅 템플릿이다. 형식은 모델마다 다르고 같은 기반 모델에서 나온 모델끼리도 다를 수 있다. Mistral-7B에서 미세조정한 두 모델 가운데 Mistral-7B-Instruct는 `[INST]`와 `[/INST]`를, Zephyr-7B는 `<|user|>`와 `<|assistant|>`를 쓰며, 제어 토큰이 틀리면 성능이 크게 떨어진다. 2026-11-18 Hugging Face Transformers v5.23.0 문서와 vLLM 문서 기준이다.

- **저장소의 템플릿을 적용한다**: 모델과 함께 배포된 템플릿을 `apply_chat_template`으로 적용하고 형식을 손으로 잇지 않는다. vLLM 서버도 토크나이저 설정의 템플릿을 쓰며, 템플릿이 없는 모델은 `--chat-template`으로 지정하지 않으면 chat 요청이 모두 오류다. 템플릿도 모델 저장소에서 오므로 [[Hugging-Face-Hub#다운로드할 버전을 고정한다|버전 고정]] 범위에 넣는다(적용 제안).
- **특수 토큰을 두 번 넣지 않는다**: 템플릿에는 필요한 특수 토큰이 이미 들어 있다. `tokenize=False`로 만든 문자열을 다시 토큰화할 때 `add_special_tokens=False`를 주지 않으면 `<bos>` 같은 토큰이 중복돼 성능이 떨어질 수 있으므로, `tokenize=True`로 한 번에 처리하는 편이 안전하다.
- **응답 시작 표지를 붙인다**: 추론 때는 `add_generation_prompt=True`로 assistant 응답이 시작된다는 토큰을 붙인다. 빠지면 모델이 답하지 않고 사용자 메시지를 이어 쓸 수 있다. 마지막 assistant 메시지를 이어 쓰게 하는 프리필은 `continue_final_message`로 하며 두 옵션을 함께 주면 오류다. 미세조정 데이터도 같은 템플릿으로 만들되 이 표지는 붙이지 않는다.
- **어긋나도 호출은 성공한다**: 형식이 학습 때와 조금 달라도 모델은 오류 없이 무언가를 생성하므로 품질 저하가 오류 로그로 드러나지 않는다. 서빙 엔진이나 프롬프트 조립 도구를 바꾸면 렌더링한 입력 문자열을 이전 경로와 비교하고 같은 평가 세트로 다시 잰다(해석과 적용 제안).

## 프리필로 하던 일을 옮긴다

프리필은 마지막 assistant 메시지의 앞부분을 미리 채워 모델이 그 뒤를 잇게 하는 기법으로, `{`나 `[`로 시작하게 해 JSON이나 정해진 괄호 형식을 강제하거나 서론을 건너뛰게 하는 데 쓰였다. Anthropic 문서 기준으로 Claude 4.6 이후 모델과 Claude Mythos Preview는 마지막 assistant 턴의 프리필을 400 오류로 거부한다. 이전 모델은 계속 지원하고, 대화 중간에 assistant 메시지를 두는 것은 영향을 받지 않는다([[LLM-API-Version-Migration|모델 단위 제약과 버전 단위 제약]]).

| 프리필의 용도 | 옮길 방법 |
|---|---|
| JSON, YAML 같은 형식 강제 | 가이드는 먼저 형식을 따르라고 지시해 보라고 하며, 최신 모델은 지시하면 복잡한 스키마도 안정적으로 맞추고 재시도를 함께 구현하면 특히 그렇다고 설명한다. JSON 스키마를 강제해야 하면 구조화 출력을 쓰고, `stop_reason`이 `refusal`이나 `max_tokens`면 출력이 스키마를 벗어날 수 있으므로 먼저 확인한다. 정상 종료여도 문자열 `enum`과 `const` 값의 대소문자는 보장하지 않으므로 대소문자를 무시해 비교한다 |
| 분류 | 유효 라벨을 enum으로 둔 도구나 구조화 출력 |
| 서론 제거 | 시스템 프롬프트에 서론 없이 바로 답하라고 지시하거나 XML 태그 안 출력, 구조화 출력, 도구 호출을 쓴다. 가끔 남는 서론은 후처리로 지운다 |
| 끊긴 응답 이어 쓰기 | 끊긴 응답의 마지막 텍스트를 user 메시지에 넣고 이어서 쓰라고 요청한다. 오류 처리 경로이고 사용자 경험에 손해가 없으면 다시 요청한다 |
| 긴 대화의 맥락 재주입 | 알림을 user 턴에 넣거나 도구나 컨텍스트 압축(compaction)으로 공급한다 |

구조화 출력도 값의 정확성은 보장하지 않고 위 대소문자 같은 예외가 있으므로 값은 따로 검증한다([[LLM-Failure-Handling-Response-Validation#구조화 출력은 형식만 보장한다|구조화 출력의 범위]]). Bedrock에서 Claude의 구조화 출력은 2026-10-26 사용자 가이드 기준 Converse의 `outputConfig.textFormat`(`type`은 `json_schema`, 스키마는 `structure.jsonSchema.schema`에 JSON 문자열로 넣는다), Claude InvokeModel의 `output_config.format`(스키마는 JSON 문자열이 아니라 객체), 도구 정의의 `strict: true`로 쓴다. Claude 전용 안내는 bedrock-runtime의 Converse, InvokeModel, Anthropic Messages API와 bedrock-mantle의 Anthropic Messages API를 경로로 들고, 지원은 모델과 엔드포인트마다 다르다고 적는다. 한도가 Anthropic API 문서와 다르므로([[LLM-Failure-Handling-Response-Validation#구조화 출력은 형식만 보장한다|Anthropic API 쪽 구조화 출력]]) 경로별로 확인한다.

- 스키마의 모든 object에 `additionalProperties: false`를 명시해야 하며, 빠지거나 다른 값이면 400 `ValidationException`이다.
- 선택 속성은 중첩 object까지 합쳐 12개, 타입 배열이나 `anyOf`를 쓰는 속성은 16개까지다. 선택 속성 초과는 문법 컴파일 중에 검사되므로 오류가 최대 약 90초 뒤에 올 수 있다.
- 새 스키마의 첫 요청은 문법 컴파일에 최대 약 90초가 걸리고, 컴파일 결과는 첫 접근부터 24시간 같은 계정의 같은 스키마 요청에 재사용된다. 가이드는 클라이언트 읽기 timeout을 120초 이상으로 두라고 권한다.
- Anthropic 모델에서 인용(citations)과 함께 켜면 400이다. 일부 지리적 범위(Geographic) 교차 리전 추론 프로필은 모델에 따라 구조화 출력을 지원하지 않으므로(예: India 프로필의 Claude Haiku 4.5) 모델 카드를 확인한다.
- 2026-10-26 확인한 Bedrock 구조화 출력 문서와 Claude Opus 4.8 모델 카드에는 프리필 거부를 적은 문장이 없었다. Bedrock 경로의 프리필 동작은 대상 모델을 호출해 확인한다.

## 수동 CoT보다 내장 사고를 먼저 쓴다

Chain-of-thought(CoT) 프롬프팅은 중간 추론 단계를 담은 few-shot 예시를 주는 기법으로 제안됐다. 원 논문은 세 대형 언어 모델에서 산술, 상식, 기호 추론 성능이 올랐고, 540B 모델에 예시 8개를 준 설정이 당시 GSM8K 최고 정확도를 냈다고 보고했다. 현재 Claude 모델에서는 같은 목적을 모델의 사고 기능이 맡는다.

- Claude 4.6 이후 모델의 사고 방식은 adaptive thinking(`thinking: {type: "adaptive"}`)으로, 사고할지와 얼마나 할지를 모델이 정하고 깊이는 `effort`와 질문의 복잡도에 따라 달라진다. Claude 4.7 이후 모델에 `budget_tokens`를 보내면 400이다. thinking 매개변수를 생략했을 때 사고가 꺼지는 모델, 기본으로 켜지는 모델, 항상 켜진 모델이 나뉘므로 응답 블록은 위치가 아니라 `type`으로 고르고 `max_tokens`에 사고 몫을 남긴다([[Claude-Opus-5|Opus 5의 사고 기본값]]).
- 가이드는 손으로 쓴 단계별 계획보다 충분히 생각하라는 일반 지시가 더 나은 추론을 내는 경우가 많다고 본다. 예시는 사고와 함께 써도 효과가 있으며, 문제, 적용할 방법, 기대 답의 순서로 보여 주면 비슷한 문제를 사고하는 방식에 반영된다.
- 사고가 꺼진 경우의 대안으로 수동 CoT가 남는다. 답하기 전에 문제를 따져 보게 하고 최종 답은 `<answer>` 태그에 넣어 추출한다. 가이드가 꼽은 Claude Fable 5.1, Fable 5, Opus 5.5, Opus 5, Sonnet 5.5에서는 추론을 `<thinking>` 태그 같은 출력으로 쓰라고 요구하는 프롬프트가 거절될 수 있으므로 사고 기능에 맡기고, 비용과 지연이 문제면 `effort`를 낮춘다. 도구 매개변수로 단계별 추론을 요구해도 `reasoning_extraction` 거절이 날 수 있으므로 짧은 설명이나 근거를 요구한다([[LLM-Failure-Handling-Response-Validation#200 응답은 stop_reason부터 확인한다|거절 처리]]).
- 끝내기 전에 시험 기준으로 답을 검증하라는 지시는 코딩과 수학의 오류를 잡는 데 효과적이라고 안내한다. 다만 Claude Opus 5는 지시 없이도 스스로 검증해 이전 모델용 검증 지시가 과잉 검증과 토큰, 지연 증가를 부르므로 고쳐 쓰지 말고 지우라고 한다.
- 사고의 설명은 답의 근거가 아니므로 감사 기록으로 쓰지 않는다([[LLM-Hallucination-Verification#설명은 증거가 아니다|설명은 증거가 아니다]]).

## 체이닝은 중간 결과를 검사할 때 쓴다

Anthropic 가이드는 adaptive thinking과 서브에이전트 조율로 대부분의 다단계 추론을 모델 안에서 처리한다고 보고, 작업을 순차 API 호출로 나누는 명시적 프롬프트 체이닝은 중간 출력을 검사하거나 특정 파이프라인 구조를 강제해야 할 때 유용하다고 정리한다. 가장 흔한 형태는 초안 생성, 기준에 따른 검토, 검토를 반영한 수정으로 이어지는 자기 교정 체인이며, 단계마다 별도 호출이라 그 지점에서 기록, 평가와 분기를 할 수 있다. 단계 수만큼 호출과 지연이 늘어나므로 같은 평가 입력으로 단일 호출과 비교한다(적용 제안). 고정 절차와 에이전트 중 무엇을 고를지는 [[LLM-Workflow-Patterns-Chain-vs-Agent|체인과 에이전트]]를 따른다.

## Bedrock에서 평가로 프롬프트를 다듬는다

2026-10-26 Bedrock 사용자 가이드 기준이다. 프롬프트 버전의 배포 계약은 [[LLM-Gateway#호출 계층과 프롬프트 배포 계약을 분리한다|프롬프트 배포 계약]]에서 다룬다.

| 기능 | 하는 일 | 확인할 점 |
|---|---|---|
| 프롬프트 최적화 | 짧은 프롬프트 하나를 모델 하나에 맞게 경험칙으로 빠르게 다시 쓴다(약 1k 토큰 이하에서 효과적). 콘솔의 playground나 Prompt management, Agents for Amazon Bedrock runtime의 `OptimizePrompt` API로 부른다 | 평가 데이터를 쓰지 않고 여러 모델을 비교하지 않는다. 영어 프롬프트를 권한다. 2026-10-26 지원 모델 표의 Claude는 Opus 4와 Sonnet 4까지였지만, 모델 카드의 추론 엔드포인트별 표시에서 Opus 4.8과 Sonnet 4.6은 bedrock-runtime 지원이고 Opus 4.8은 bedrock-mantle 미지원이므로 둘 다 확인한다 |
| Advanced Prompt Optimization | 프롬프트 템플릿, 변수에 넣을 평가 샘플, 정답과 평가 방법(LLM 판정 루브릭, Lambda 함수, 자연어 조정 기준)을 받아 추론, 채점, 재작성을 반복한다. 현재 모델과 후보를 합쳐 최대 5개 모델에서 최적화 전후를 비교하고, 샘플별 점수와 모델별 평균, 중앙값 지연과 TTFT를 돌려준다 | 작업당 템플릿 10개, 템플릿당 평가 샘플 100개, 계정과 리전당 동시 작업 20개. 별도 서비스 요금 없이 추론과 Lambda 비용이 든다(기본 판정 모델은 Claude Sonnet 4.6). 프롬프트 하나에 샘플이 적으면 15~20분, 프롬프트와 샘플이 많으면 몇 시간까지 걸릴 수 있다. 서울(ap-northeast-2)을 포함한 14개 리전에서 제공한다 |

Advanced Prompt Optimization의 선택 기능인 프롬프트 단축은 평가 점수를 유지하거나 높이는 범위에서 프롬프트 길이를 줄여 입력 토큰 비용을 낮추고 지연을 줄일 수 있다. 단축 요건을 맞추지 못하면 원래 프롬프트를 그대로 돌려주며 원본보다 길어지지는 않는다. 다시 쓸 범위는 선택적 최적화 태그(`<advpo:optimize>`, `<advpo:exclude>`)로 제한하며, 단축도 그 범위 안에서만 적용된다. 가이드는 평가 방법이 최적화의 방향을 정하므로 기준을 최대한 정밀하게 정의하고, 단축 결과는 홀드아웃 데이터로 검증하라고 한다. 최적화에 쓴 샘플로 다시 잰 점수는 개선을 과대평가할 수 있으므로, 홀드아웃에서 기존 버전과 같은 조건으로 정확도, 지연과 비용을 비교한 뒤 승격한다(적용 제안, [[Evaluation-Driven-Development#자동 개선 후보도 별도 평가를 거친다|자동 개선 후보의 평가]]).

Bedrock의 프롬프트 개념 문서는 모델별 가이드를 따르라고 하며 Claude는 Anthropic 가이드로 연결한다. 같은 문서는 API로 보내는 Claude 프롬프트에 `\n\nHuman:`과 `\n\nAssistant:`를 반드시 넣어야 한다고 아직 적고 있지만, AWS는 이 형식의 Claude Text Completions API 문서를 legacy로 표시하고 Messages API 문서로 옮겼다. 현재 Claude 모델에는 Converse나 Messages의 역할별 메시지 구조([[Bedrock-Model-Inference|Bedrock 모델 호출]])와 Anthropic 가이드를 따른다.

## 면접 체크포인트

- 프롬프트를 고치기 전에 성공 기준, 시험 입력과 홀드아웃을 먼저 두는 이유
- 프리필로 JSON을 강제하던 코드를 Claude 4.6 이후 모델로 옮길 때의 대체 수단과 구조화 출력이 보장하지 않는 것
- 수동 CoT와 내장 사고의 차이, 모델에게 추론을 출력하라고 요구할 때 생기는 문제
- 프롬프트 체이닝을 단일 호출보다 고를 조건과 늘어나는 비용
- 가중치를 직접 서빙할 때 채팅 템플릿과 특수 토큰을 모델이 학습한 형식에 맞춰야 하는 이유와, 어긋나도 오류가 나지 않는 문제
- 시스템 프롬프트와 사용자 입력을 역할로 나눠 보내는 이유와, 금지 지시가 실제로 지켜지는지 확인하는 방법

## 출처

- [OpenAI API Docs, Text generation](https://developers.openai.com/api/docs/guides/text), [Create a model response](https://developers.openai.com/api/reference/resources/responses/methods/create) — 2026-11-18 developer와 user 역할의 우선순위, `instructions`와 첫 developer 메시지의 쓰임, `output_text` 설명 대조. openai Python SDK 3.55.0 소스로 `output_text`가 거절을 빼고 text 조각만 잇는 것을 확인했다
- [LangChain Reference, PromptTemplate.from_template](https://reference.langchain.com/python/langchain-core/prompts/prompt/PromptTemplate/from_template)
- [LangChain Reference, ChatPromptTemplate](https://reference.langchain.com/python/langchain-core/prompts/chat/ChatPromptTemplate)
- [Hugging Face Transformers, Chat templates](https://huggingface.co/docs/transformers/chat_templating) — 2026-11-18 v5.23.0 문서의 제어 토큰 차이, 특수 토큰 중복 경고, `add_generation_prompt`와 `continue_final_message`, 학습 데이터 전처리 대조
- [vLLM, Online Serving](https://docs.vllm.ai/en/latest/serving/online_serving/) — 2026-11-18 Chat Template 절의 토크나이저 설정 요구, `--chat-template`과 템플릿이 없을 때의 오류 대조
- [Claude Platform Docs, Prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)
- [Claude Platform Docs, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- [Claude Platform Docs, Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- [Claude Platform Docs, Using the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)
- [Claude Platform Docs, Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- [Claude Platform Docs, Mitigate jailbreaks and prompt injections](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks)
- [Claude Platform Docs, Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- [Claude Platform Docs, Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Amazon Bedrock, Get validated JSON results from models](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html)
- [Amazon Bedrock, Structured outputs for Anthropic Claude models](https://docs.aws.amazon.com/bedrock/latest/userguide/claude-messages-structured-outputs.html)
- [Amazon Bedrock, Claude Opus 4.8](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-opus-4-8.html)
- [Amazon Bedrock, Optimize a prompt](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-management-optimize.html)
- [Amazon Bedrock, How Advanced Prompt Optimization works](https://docs.aws.amazon.com/bedrock/latest/userguide/advanced-prompt-optimization-how.html)
- [Amazon Bedrock, Supported Regions, models, and quotas for Advanced Prompt Optimization](https://docs.aws.amazon.com/bedrock/latest/userguide/advanced-prompt-optimization-quotas.html)
- [Amazon Bedrock, Shorten prompts](https://docs.aws.amazon.com/bedrock/latest/userguide/advanced-prompt-optimization-shorten.html)
- [Amazon Bedrock, Selective optimization](https://docs.aws.amazon.com/bedrock/latest/userguide/advanced-prompt-optimization-selective.html)
- [Amazon Bedrock, Prompt engineering concepts](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-engineering-guidelines.html)
- [Amazon Bedrock, Anthropic Claude Text Completions API (legacy)](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-text-completion.html)
- [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models — arXiv, Wei et al.](https://arxiv.org/abs/2201.11903)
- [Amazon Bedrock을 활용한 프롬프트 엔지니어링 모범사례 — Amazon Web Services Korea (YouTube)](https://www.youtube.com/watch?v=84462rNBg1k) — 2024-09-12 공개. 학습 계기로 삼았고 본문에는 2026-10-26 공식 문서로 대조한 내용만 넣었다.
- [YouTube, Marina Wyss, AI Engineering in 76 Minutes (Complete Course/Speedrun!)](https://www.youtube.com/watch?v=JV3pL1_mn2M) — 2025-04-01 업로드. Chip Huyen의 책 AI Engineering(O'Reilly Media, 2025)을 요약한 강의로 채팅 템플릿 절의 계기다. 사실은 위 Hugging Face와 vLLM 문서로 대조했고, 기존 절은 다시 대조하지 않아 `verified_at`은 유지한다
- [YouTube, Harvard CS50 (2026), Artificial Intelligence](https://www.youtube.com/watch?v=gmuTjeQUbTM&t=65059s) — freeCodeCamp.org 채널, 2026-02-05 공개, 18:04:19부터. 역할 분리 절의 계기이며 사실은 위 OpenAI 문서와 SDK로 대조했고, 기존 절은 다시 대조하지 않아 `verified_at`은 유지한다

## 관련 문서

- [[llm|LLM 원리와 운영 (상위 인덱스)]]
- [[LLM-Workflow-Patterns-Function-Calling|Function Calling (도구 정의의 설명, 예시와 호출 강제)]]
- [[LLM-Failure-Handling-Response-Validation|LLM 응답 검증 (구조화 출력의 범위와 거절 처리)]]
- [[LLM-API-Version-Migration|LLM API 버전과 SDK 마이그레이션 (프리필과 샘플링 파라미터 400)]]
- [[Claude-Opus-5|Claude Opus 5 (사고 설정과 effort)]]
- [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문 (프롬프트와 Eval의 앞뒷면, 홀드아웃)]]
- [[Evaluation-Driven-Development|평가 주도 개발]]
- [[LLM-Prompt-Caching|프롬프트 캐싱 (고정 지시와 예시의 배치)]]
- [[Context-Engineering|컨텍스트 엔지니어링]]
- [[LLM-Application-Security|LLM 애플리케이션 보안]]
- [[Bedrock-Model-Inference|Bedrock 모델 호출]]
- [[Hugging-Face-Hub|Hugging Face 모델 허브와 버전 고정]] — 채팅 템플릿이 함께 오는 모델 저장소
