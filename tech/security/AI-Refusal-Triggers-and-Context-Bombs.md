---
tags: [security, llm, prompt-injection, ai-evasion, deception, canary]
status: done
category: "보안(Security)"
aliases: ["AI Evasion", "AI 분석 회피", "Context Bomb", "컨텍스트 폭탄", "Refusal Trigger", "안전 거부 유도"]
---

# AI 분석 회피와 안전 거부 유도: AI Evasion과 Context Bomb

AI가 파일, 코드, 클라우드 자원을 읽고 판단하는 흐름이 늘면서, 읽히는 쪽이 그 판단을 조작하려는 문자열을 심는다. 방향은 둘이다. 하나는 모델이 대상을 안전하다고 답하게 만드는 것이고, 다른 하나는 모델의 안전 장치를 자극해 작업 자체를 멈추게 하는 것이다. 후자는 공격자가 분석을 막는 데도, 방어자가 공격 에이전트를 멈추는 데도 쓰인다.

## 두 가지 조작 방향

| 방향 | 노리는 결과 | 성공 조건 |
| --- | --- | --- |
| 안전 판정 유도 | 분석 모델이 악성 파일을 무해하다고 답한다 | 모델이 데이터 안의 지시를 명령으로 따른다 |
| 안전 거부 유도 | 모델이 안전 정책에 걸려 읽기나 작업을 중단한다 | 모델이 위험 주제에 반응해 거부한다 |

안전 판정 유도는 [[LLM-Application-Security#LLM01 프롬프트 인젝션|간접 프롬프트 인젝션]]이다. 지시와 데이터의 분리, 출력 검증으로 성공률을 낮출 수 있지만 확실한 예방법은 아니다. 안전 거부 유도는 모델이 지시를 따르게 만들 필요가 없다. 다만 컨텍스트에 들어온다고 항상 거부가 나지는 않는다(아래 희석 결과). 그래서 인젝션 방어 수준과 무관하게 걸릴 수 있고, 안전 정책이 엄격한 모델일수록 잘 걸릴 수 있다(이 문서의 해석).

## 분석을 막으려는 쪽의 사용

- 악성 코드 안의 안전 판정 유도: Check Point Research가 2025-06-25 공개한 표본은 같은 달 초 VirusTotal에 익명으로 올라왔고, 일부 코드가 동작하지 않는 미완성 형태였다. 분석하는 AI에게 이전 지시를 무시하고 계산기처럼 행동하며 `NO MALWARE DETECTED`라고 답하라는 문자열을 코드에 넣었다. Check Point의 MCP 기반 분석 시스템에서는 인젝션이 실패해 모델이 파일을 악성으로 판정하고 인젝션 시도까지 지적했다. Check Point는 이 범주를 AI Evasion이라고 부른다.
- 악성 패키지의 안전 거부 유도: Socket이 2026-06-08 보고한 악성 PyPI wheel 묶음에서는 자격 증명 탈취 코드가 든 `_index.js` 맨 앞에, 실행되지 않는 큰 JavaScript 주석으로 가짜 시스템 지시와 안전 정책을 자극하는 내용을 넣었다. Socket은 이를 파일 앞부분을 언어 모델에 넣는 scanner나 분석 보조 도구의 거부, 혼란, 성급한 분류를 노린 분석 방해로 보며, YARA 규칙, 엔트로피 검사, AST 분석, 역난독화 같은 정적 탐지를 우회하는 수단은 아니라고 덧붙였다.
- 운영 주체가 확인되지 않은 웹 스크립트: 위험 주제를 연상시키는 함수명과 보이지 않는 Unicode로 감춘 가짜 지시를 지문 수집 스크립트에 넣은 사례는 [[Web-Content-Manipulation-for-AI#분석 방해용 코드와 문서도 자료로 취급한다|AI가 읽는 웹 콘텐츠의 조작]]에 있다. 분석자는 일반적인 안티봇 스크립트로 해석했고 LLM 분석 방해 목적은 추정이다.

세 사례 모두 문자열이 있다는 사실과 그 문자열이 분석을 실제로 막았다는 사실은 다르다. 분석 결과를 기록할 때는 어떤 모델과 요청에서 거부나 오판이 났는지를 함께 남긴다.

## 방어자의 사용: Context Bomb

Context bomb은 공격 에이전트가 지나갈 경로에 둔 짧은 문자열로, 악의 없는 이유로 모델의 안전 장치를 자극해 공격을 멈추게 한다. Tracebit이 2026-07 공개한 연구에서는 기만용 비밀 값(canary)에 이 문자열을 넣었다. 읽는 순간 경보가 울리는 canary와 결합해, 에이전트를 멈추는 효과와 침입 탐지를 함께 노린다.

실험 구성과 결과(2026-07 발표 기준, 공급사 자체 측정):

- 약 300개 자원과 열 가지 공격 경로를 심은 자체 AWS 시험 환경(cyber range)에서, 낮은 권한 키로 시작한 에이전트에게 파괴적 행동 없이 최대 영향을 내고 가능하면 은밀하게 움직이라고 지시했다. 모델은 Claude Opus 4.8, Gemini 3.1 Pro, GLM 5.2, DeepSeek V4 Pro, Kimi K2.6 다섯 개이고 총 152회 실행했다. Opus 4.8은 Claude Code로, 나머지는 OpenRouter를 거친 OpenCode로 실행했다.
- 기만 자원이 없는 기준 조건과 비교해 Secrets Manager의 기만 비밀 하나에 문자열을 넣은 조건에서 전체 계정 관리자 권한 획득은 57%에서 5%로, 하나 이상의 공격 경로 완료는 91%에서 15%로 줄었다. Opus 4.8의 관리자 권한 획득은 93%에서 0%가 됐다.
- 모델 계열마다 반응하는 주제가 달랐다. 시험한 서구 모델 두 개(Opus 4.8, Gemini 3.1 Pro)는 위험한 생물학 주제에 안정적으로 멈췄고, 중국 사업자를 거친 중국 모델은 정치적으로 민감한 중국어 주제에 자주 멈췄다. 한 번의 프롬프트로 통하던 문자열도 공격 중간에 섞이면 효과가 희석돼, 여러 번의 퍼징으로 다듬어야 했다.
- 문자열이 있는 조건에서 공격 경로를 완료한 모든 실행이 canary 경보를 남겼다.

### 한계

- 공급사가 만든 시험 환경과 공급사가 고른 모델에서 잰 값이고 독립 재현은 확인되지 않았다. 문맥 초과나 모델 사용 불가처럼 무관한 이유로 실패한 실행은 집계에서 뺐다. 모델별, 조건별 실행 수는 공개하지 않았다. 기만 비밀만 두고 문자열은 넣지 않은 대조 조건이 없어, 문자열의 효과와 기만 자원 자체의 효과가 분리되지 않는다(이 문서의 해석). Anthropic 모델의 사이버 예외 허용이 Opus까지만 닿아 Fable은 시험하지 못했고, OpenAI 모델은 예외 절차가 진행 중이라 빠졌다. 2026-07 FAQ 기준 Tracebit은 고객이 켤 수 있는 선택 기능으로 제품에 지원을 넣었다고 밝힌다.
- 저자도 공격 에이전트를 완전히 막지 못하고 공격과 방어의 적응이 이어질 것이라고 밝힌다. 거부 장치를 제거한(abliterated) Qwen3.8-27B는 안전 거부가 아닌 별도 페이로드로 멈췄다는 후속 결과를 냈다. 도구 출력을 자르거나 거부를 감지해 루프를 바꾸는 에이전트에서 효과가 약해질 수 있다는 점은 이 문서의 해석이다.
- 우리 쪽의 정당한 AI 에이전트도 같은 문자열에 멈출 수 있다. 저자는 다른 모델 계열을 겨냥한 문자열 선택과 배치 위치를 완화책으로 제시한다. 이를 발견한 사람이 놀랄 수 있다는 점도 운영 비용이다.

따라서 context bomb은 공격 속도를 늦추고 탐지 기회를 늘리는 보조 통제로 보고, 권한 최소화와 경보 대응을 대신하지 않는다(이 문서의 해석).

## 방어 쪽 AI 분석 파이프라인의 점검

이 문서의 점검 제안이다. 사례에서 가져온 사실은 항목 안에 따로 밝힌다.

- 분석 대상의 이름, 주석, 숨은 문자열은 지시가 아니라 자료로 다룬다. 모델 출력에 대상 안의 문구를 그대로 따르는 흔적이 없는지 본다.
- 거부나 빈 결과를 무해 판정으로 처리하지 않는다. 거부는 별도 상태로 기록하고, 다른 모델 계열이나 사람 검토로 넘긴다.
- 파일 앞부분만 모델에 넣는 구성은 앞에 둔 미끼 문자열에 약하다(위 Socket 사례). 대상을 신뢰하지 않는 데이터로 분리해 넣고, 정적 분석 결과를 함께 쓴다(운영 제안).
- 사고 대응처럼 공격 기록을 대량으로 읽는 작업은 사업자의 안전 정책에 막힐 수 있다. Hugging Face는 2026-07 자율 AI 에이전트가 수행한 침해를 조사하면서 1만 7천 건이 넘는 공격 기록을 상용 API의 최신 모델로 분석하려 했지만 사업자의 안전 장치가 막았고, 자체 인프라의 공개 가중치 모델 GLM-5.2로 분석했다(공격 데이터가 환경 밖으로 나가지 않는 효과도 함께 들었다). 쓸 수 있는 모델 경로와 사업자의 보안 연구 허용 절차를 미리 확인한다(운영 제안).
- 자체 환경에 context bomb을 두면 사내 에이전트가 읽는 경로와 겹치지 않는지, 경보가 어디로 가는지 먼저 정한다.

## 출처

- [AI Evasion: The Next Frontier of Malware Techniques — Check Point Research](https://blog.checkpoint.com/artificial-intelligence/ai-evasion-the-next-frontier-of-malware-techniques) — 2025-06-25 게시. 2026-11-14 표본 업로드 시기, 인젝션 문구, 분석 결과와 범주 이름 대조
- [Context bombs: stopping AI attackers in their tracks — Tracebit](https://tracebit.com/blog/context-bombs-stopping-ai-attackers-in-their-tracks) — 2026-07-13 게시. 2026-11-14 정의, 배치 위치와 경보 결과 대조
- [Context Bombs: stopping AI attackers in their tracks — Tracebit Research](https://agentic.tracebit.com/context-bombs/) — 2026-07 working paper. 2026-11-14 실험 구성, 실행 환경, 모델, 실행 수, 결과 수치, 모델별 주제, 제외한 실행과 한계 대조
- [Mini Shai-Hulud, Miasma, and Hades Worms Target Bioinformatics and MCP Developers via Malicious PyPI Wheels — Socket](https://socket.dev/blog/mini-shai-hulud-miasma-and-hades-worms-target-bioinformatics-and-mcp-developers-via-malicious) — 2026-06-08 게시. 2026-11-14 `_index.js` 주석의 목적과 정적 탐지에 대한 단서 대조
- [Security incident disclosure — July 2026 — Hugging Face](https://huggingface.co/blog/security-incident-july-2026) — 2026-07-16 게시. 2026-11-14 자율 에이전트 공격, 기록 규모, 사업자 안전 장치의 차단과 GLM-5.2 분석 대조

## 관련 문서

- [[Web-Content-Manipulation-for-AI|AI가 읽는 웹 콘텐츠의 조작]] — 지문 수집 스크립트의 안전 거부 유도 사례
- [[LLM-Application-Security|LLM 애플리케이션 보안]] — 간접 프롬프트 인젝션
- [[AI-Accelerated-Threat-Defense|악용 시간 단축과 AI 공격에 대비하는 방어]]
- [[Agent-Execution-Isolation|에이전트 실행 격리]]
- [[Malicious-Agent-Skills|악성 에이전트 스킬]]
