---
tags: [security, llm, ai, owasp, prompt-injection, rag, agent-security]
status: done
verified_at: 2026-10-06
category: "보안(Security)"
aliases: ["LLM Application Security", "LLM 보안", "OWASP Top 10 LLM", "프롬프트 인젝션", "Spotlighting", "Instruction Hierarchy", "Agents Rule of Two"]
---

# LLM 애플리케이션 보안 — OWASP Top 10 (2025)

LLM을 제품에 넣으면 기존 웹 취약점 위에 **모델 고유의 공격면**이 얹힌다. 신뢰 경계가 프롬프트, 학습 데이터, 임베딩, 에이전트 권한으로 확장되며, 확률적 모델 특성상 상당수는 완전 차단이 아니라 완화만 가능하다. OWASP가 정리한 10개 항목이 그 공격면의 지도다.

OWASP 2026판(표지 기준 2026-08-04)에서도 프롬프트 인젝션은 LLM01이다. 과도한 위임은 6위에서 3위로, 무제한 소비는 10위에서 6위로 올랐고 부적절한 출력 처리는 5위에서 10위로 내려갔으며, 시스템 프롬프트 유출은 범위를 넓혀 Hidden Context Exposure(LLM08)가 됐다. 2026판 LLM01은 이미지나 오디오에 지시를 숨기는 교차 모달 공격까지 포함한다. 순위는 실무자 투표에 3/4, 실제 사고 기록(7,714건 중 분류한 6,639건)에 1/4의 가중치를 둬 정했다. 사고 기록만으로 줄 세우면 프롬프트 인젝션은 10위 밖이지만, OWASP는 이 차이를 방어 효과(적극적으로 막은 결과 공개 기록에 남는 사례가 적다)로 보고 1위를 유지했다. 모델이 호출할 도구와 세션 사이에 이어지는 메모리를 가진 행위자가 되면 OWASP Agentic Top 10과 함께 본다. 아래 항목 번호와 각 항목의 기본 설명은 2025판 기준이고, 2026판에서 가져온 내용은 문장에 2026판으로 표시했다.

## LLM01 프롬프트 인젝션

이용자 입력이 의도치 않은 방식으로 모델 동작이나 출력을 바꾸는 취약점. 사람이 못 읽는 형태여도 성립한다.

- **직접**: 이용자가 프롬프트로 모델 동작을 직접 변경 (탈옥/jailbreak은 안전 프로토콜을 무시시키는 직접 인젝션의 한 종류)
- **간접**: 웹페이지, 파일 등 외부 소스의 콘텐츠에 숨긴 지침이 실행 (RAG 소스 문서 변조 등)
- **멀티모달**: 이미지에 지침을 숨겨 텍스트와의 상호작용을 악용 — 탐지가 특히 어려움
- 완화: 시스템 프롬프트로 모델 역할과 제한 명시, 출력 형식 검증, 입출력 필터링, 최소 권한, 고위험 행위에 사람 승인(human-in-the-loop), 신뢰 못 하는 외부 콘텐츠 분리, 적대적 테스트. **확실한 예방법은 없고 영향 완화만 가능**

### 프롬프트와 모델 수준 방어 — Spotlighting과 Instruction Hierarchy

OWASP 2026판 LLM01의 설명대로 LLM은 시스템 프롬프트, 사용자 입력, 검색 문서와 도구 출력을 하나의 토큰 흐름으로 받으므로 지시와 데이터를 구조적으로 구분하지 못하고, SQL의 매개변수화 쿼리에 해당하는 깔끔한 장치도 없다. 프롬프트 기법인 Spotlighting은 입력에 출처 신호를 싣고, 모델 학습 기법인 Instruction Hierarchy는 출처별 우선순위를 학습시켜 이 구분을 보완한다.

Spotlighting(Microsoft, 2024)은 입력을 변환해 출처를 계속 알리는 프롬프트 기법군이다. GPT 계열 모델 실험에서 간접 인젝션 성공률을 50% 초과에서 2% 미만으로 낮췄다.

| 방식 | 동작 | 논문 실험 결과 | 주의 |
|---|---|---|---|
| delimiting | 비신뢰 텍스트 앞뒤에 `<<`, `>>` 같은 기호를 두고 그 사이의 지시를 따르지 말라고 시스템 프롬프트로 알린다 | GPT-3.5-Turbo에서 성공률 약 절반 감소 | 구분자를 아는 공격자가 같은 기호를 넣어 경계를 무력화할 수 있고, 저자들은 더 효과적이면서 구현이 쉬운 방식이 있어 이 방식을 권하지 않는다. 논문은 XML 태그를 다루지 않지만, 시작과 끝 표식으로 감싸기만 하는 XML 태그 방식도 이 정의에 해당한다 |
| datamarking | 텍스트의 모든 공백을 `ˆ` 같은 표식 토큰으로 바꿔 전체에 끼운다 | 요약 과제에서 GPT-3.5-Turbo 약 50%에서 약 3%, Text-003(논문 표기) 40%에서 0%. Q&A 과제는 GPT-3.5-Turbo 8.0%, GPT-4 1.0%. 과제 성능 저하 없음 | 입력과 겹치지 않는 토큰을 고르고 자주 바꾼다 |
| encoding | base64, ROT13 같은 알려진 인코딩으로 변환해 넣는다 | GPT-3.5-Turbo에서 요약 0.0%, Q&A 1.8% | 성공률을 잰 GPT-3.5는 과제 성능이 크게 떨어졌다. GPT-4는 과제 성능을 대부분 유지했지만 인코딩 성공률은 보고되지 않아 고성능 모델 전제로만 검토한다 |

저자들은 방어자가 시스템 프롬프트 전체가 유출됐다고 가정해야 한다고 본다.

Instruction Hierarchy(OpenAI, 2024)는 시스템 메시지, 사용자 메시지, 도구 출력(웹 브라우징과 검색, 코드 실행 결과, 업로드하거나 검색해 온 문서) 순의 우선순위를 합성 데이터로 만들어 GPT-3.5 Turbo를 SFT와 RLHF로 학습시켰다. 상위 지시와 제약이나 목표가 같은 aligned 지시는 따르고, 충돌하는 misaligned 지시는 가능하면 무시하고 그럴 수 없으면 거절한다. 브라우징과 도구 출력 안의 지시는 모두 misaligned로 가정했다. 시스템 프롬프트 추출 방어가 63% 개선됐고, 학습 데이터에서 직접 다루지 않은 탈옥에 대한 견고성도 30% 넘게 올라 일반화를 보였다. 정상 요청을 무시하거나 거절하는 over-refusal 회귀도 함께 보고됐다.

이 우선순위는 API로 쓰는 모델에서는 모델 제공자가 학습시키는 영역이다. 앱이 할 일은 지시를 developer 메시지(다른 제공자에서는 시스템 프롬프트)에, 외부 콘텐츠를 도구 결과나 인용 블록에 넣어 출처를 보존하는 것이다. OpenAI Model Spec 2026-08-18판은 Root, System, Developer, User, Guideline 순의 권한 수준을 두고, 따옴표 안의 텍스트, YAML, JSON, XML, `untrusted_text` 블록, 멀티모달 데이터, 첨부 파일과 도구 출력은 기본적으로 권한이 없어 그 안의 지시를 따를 명령이 아니라 정보로 다룬다고 정한다.

둘 다 주입 성공률을 낮추는 통제이지 보안 경계가 아니다. Spotlighting이 적응형 공격에서 보인 결과는 아래 [[#적응형 공격과 피해 반경 제한|적응형 공격과 피해 반경 제한]]에 있고, Instruction Hierarchy는 그 평가의 방어 12종에 들지 않았다.

### 듀얼 LLM 격리 (Dual-LLM 패턴)

입출력 필터와 분류기 같은 가드레일만으로는 간접 인젝션을 확실히 막지 못한다. Microsoft 365 Copilot의 EchoLeak(CVE-2025-32711, 2025)은 크래프팅한 이메일에 숨긴 지침이 RAG 컨텍스트로 들어가 XPIA 분류기와 링크 차단, CSP를 우회하고 자동 로딩되는 이미지 URL로 내부 데이터를 유출한 제로클릭 사례다. 우회가 계속 나오는 구조적 한계 때문에, 권한과 비신뢰 콘텐츠를 아키텍처 수준에서 분리하는 방식이 근본 완화로 제시된다.

- **Privileged LLM**: 신뢰 입력(주로 이용자)만 받고 도구(메일 전송, 상태 변경 등)에 접근한다. 비신뢰 콘텐츠에는 절대 노출되지 않는다
- **Quarantined LLM**: 이메일, 웹페이지 같은 비신뢰 콘텐츠를 처리하되 도구 접근이 전혀 없다 (항상 오염 가능성 있는 것으로 취급)
- **Controller**: LLM이 아닌 일반 소프트웨어가 둘 사이를 중재한다. 오염 가능성 있는 텍스트를 변수 토큰(`$VAR1`)으로 대체하고, Privileged LLM에는 원문과 오염될 수 있는 요약을 넘기지 않는다. 정해진 분류값처럼 검증 가능한 결과만 제한적으로 전달하는 예외를 원 제안이 설명한다
- 효과와 한계: 격리 모델의 도구 제거만으로 confused deputy 공격 전체가 차단되지는 않는다. 비신뢰 출력이 권한 모델로 돌아오지 않도록 Controller가 경계를 유지해야 한다. 이용자가 외부 글을 복사해 신뢰 입력으로 다시 넣거나 출력의 링크와 이미지가 외부 요청을 일으키는 경로도 점검한다. 사회공학과 구현 복잡도는 남으며, 권한 강제는 LLM06의 완전 중재처럼 LLM 밖에 둔다
- **CaMeL (2025)**: Dual-LLM을 확장한 설계로, 신뢰할 수 있는 사용자 질의에서 제어 흐름과 데이터 흐름을 먼저 추출하므로 LLM이 읽어 온 비신뢰 데이터는 실행 흐름을 바꾸지 못한다. 값마다 capability(데이터 출처와 읽을 수 있는 대상)를 붙이고 도구를 호출할 때 보안 정책으로 검사해, 허용되지 않은 흐름으로 비공개 데이터가 새는 것을 막는다. AgentDojo(에이전트 프롬프트 인젝션 벤치마크)에서 방어 없는 시스템의 84% 대비 77%의 과제를 증명 가능한 보안으로 풀어 과제 성공률 일부를 보안과 맞바꾼다

### 가드 모델 우회 — 능력 격차가 곧 취약점

본 모델보다 작고 저렴한 입력 가드를 쓰는 설계에서는 두 모델의 해석 능력 차이가 공격면이 될 수 있다. PuzzleMask(2026)는 평범한 산문에 명령을 분산 배치해 텍스트 전체의 수량적, 자기참조적 해석이 필요하도록 만든 연구다. 연구진의 시험에서 가드 3종은 각각 23회, 다른 1종은 5회 모두 입력을 안전하다고 분류했다. 타깃 `gpt-5-thinking-high`는 18회 중 17회(약 94.4%) 숨긴 지시를 복원하고 실행했다. 이는 특정 모델과 실험 조건의 결과이며 모든 가드의 탐지율이나 현재 제품의 공격 성공률이 아니다.

- 완화 1, 가드에 재작성을 시킨다: 입력을 의미가 보존되게 다시 쓰게 하면 정밀하게 배치된 구조가 깨진다.
- 완화 2, 정책 문구를 구조 기준으로 보강한다: 수량적이면서 텍스트 전체에 자기참조적인 문장은 unsafe로 분류하라는 규칙 하나로 해당 연구의 변형 전부가 검출됐다. 다만 특정 기법에 맞춘 규칙이라 다음 변형에 그대로 통하지는 않는다.
- 완화 3, 입력만 보지 않는다: 출력과 행동(도구 호출) 단계에서 다시 검사한다. 연구진은 Opus 계열에서 차단을 관찰했고, 출력과 행동 감시가 작동한 것으로 추정했다. 내부 방어 기전이나 입력 필터의 기여를 확정한 결과는 아니다.
- 더 큰 가드를 쓰는 선택도 비용, 지연과 실제 탐지율로 비교한다. 모델 크기를 맞추는 것만으로 방어가 보장되지는 않는다.

이 연구는 입력 분류기 하나만 신뢰할 수 없다는 반례다. 위험한 행위는 도구 실행 직전에도 LLM 밖에서 권한과 인자를 검증한다. 듀얼 LLM 격리와 행동 통제도 각 경계가 실제로 지켜지는지 검증해야 한다.

### 적응형 공격과 피해 반경 제한

- **적응형 공격(Nasr, Carlini 외, 2025-10)**: 방어 설계를 알고 경사 하강, 강화학습, 무작위 탐색과 사람 레드팀으로 공격을 최적화하자 최근 탈옥과 프롬프트 인젝션 방어 12종 대부분에서 성공률이 90%를 넘었다. 원 논문들은 대부분 0에 가까운 성공률을 보고했었다. AgentDojo의 정적 공격에서 1%까지 낮았던 Spotlighting과 Prompt Sandwiching(비신뢰 입력 뒤에 사용자 프롬프트를 다시 붙이는 방어)은 탐색 기반 공격에서 둘 다 95%를 넘었고, 학습 기반 MetaSecAlign은 정적 2%에서 96%가 됐다. 사람 레드팀 참가자는 Spotlighting을 뚫는 공격을 265건 만들었다.
- **통제의 두 종류(OWASP 2026판 LLM01)**: 주입 성공률을 낮추는 통제는 적응형 공격에서 약해질 것으로 보고(위 평가에서 Spotlighting, 필터 모델, StruQ와 MetaSecAlign 같은 학습 기반 방어가 뚫렸다), 주입이 성공한 뒤 피해 반경을 묶는 통제는 시스템을 탐색할 수 있는 공격자에게도 남는다. 출처 표시 채널은 비적응형 시험에서만 성공률을 낮추며 표시 방식을 아는 공격자가 흉내 낼 수 있다. 에이전트에서는 최소 권한과 능력 예산(capability budgeting)이 하중을 받는 통제다. 방어는 정적 성공률만으로 평가하지 않고, AgentDojo 같은 벤치마크로 기준선을 잡은 뒤 방어 명세 전체를 공개한 레드팀으로 시험한다.
- **Agents Rule of Two(Meta, 2025-10-31)**: 한 세션에서 [A] 비신뢰 입력 처리, [B] 민감한 시스템이나 비공개 데이터 접근, [C] 상태 변경이나 외부 통신 중 둘까지만 허용한다. 새 세션(새 컨텍스트 윈도)을 열지 않은 채 셋이 모두 필요하면 자율 실행을 허용하지 말고 최소한 사람 승인 같은 감독을 둔다. Chromium의 Rule of 2와 lethal trifecta(비공개 데이터 접근, 비신뢰 콘텐츠 수집, 외부 통신이 동시에 성립하면 고위험이고 하나를 빼면 조건이 사라진다)에서 나왔으며, 다른 위협 벡터까지 막기에 충분하거나 위험 완화의 종착점인 것은 아니다. OWASP 2026판은 이를 하한선으로 삼아 [A,B,C] 에이전트에는 행동마다 사람 승인을, [A,B]와 [A,C] 구성에는 명시적인 잔여 위험 평가를 요구한다.
- **결정적 집행(OWASP 2026판 LLM01 완화)**: 자격 증명과 상태 변경 능력은 모델이 아니라 앱 코드에 두고 작업마다 최소 권한을 준다. 권한이 필요한 호출은 실행 시점에 의도와 인자를 다시 검증하는 결정적 정책 엔진을 거친다(2025판 LLM06, 2026판 LLM03 과도한 위임의 완전 중재와 같은 원칙). CI 에이전트에 적용한 사례는 [[GitHub-Agentic-Workflows|GitHub Agentic Workflows의 safe outputs]]다.
- **사람 승인과 보이지 않는 문자(OWASP 2026판 LLM01 완화)**: 권한이 필요하거나 되돌릴 수 없거나 외부에 보이는 행동은 사람 확인을 받되, 승인 화면은 요약이 아니라 실제로 실행될 행동을 그대로 보여 준다. 보이지 않는 문자로 표시와 실행이 달라질 수 있고, 승인이 많아지면 피로로 판단이 무뎌진다. 입력과 렌더링 경계마다 tag 블록(U+E0000~U+E007F), variation selector(U+FE00~U+FE0F. Unicode에는 보충 블록 U+E0100~U+E01EF도 있다), zero-width 문자(U+200B, U+200C, U+200D, U+2060)를 제거하되, 보이는 텍스트나 이후의 다른 스테가노그래피 방식은 이것으로 막지 못한다.

다층 방어 사례로 Google Gemini(2025-06-13 발표 기준)는 프롬프트 생애주기의 단계마다 방어를 겹친다. 이메일과 파일 속 악성 지시를 찾는 분류기, 프롬프트 주변에 사용자 작업만 수행하고 적대적 지시는 무시하라는 보안 지시를 덧붙이는 security thought reinforcement, 외부 이미지 URL을 렌더링하지 않는 markdown sanitizer(위 EchoLeak형 0-click 이미지 유출을 Gemini에는 해당하지 않게 만든다)와 Safe Browsing 기반 의심 URL 제거(Gmail 요약에서 `suspicious link removed`로 대체), 캘린더 일정 삭제 같은 위험 작업의 사용자 확인(HITL), 막은 공격을 알리는 사용자 알림, Gemini 2.5의 적대적 데이터 학습이다.

## LLM02 민감 정보 유출

PII, 재무, 건강, 기밀 데이터, 독점 알고리즘이 출력으로 새는 것. 이용자가 무심코 넣은 데이터가 학습에 포함돼 나중에 유출될 수도 있다.

- 완화: 학습 전 데이터 정제(마스킹), 엄격한 입력 검증, 최소 권한 접근, 명확한 옵트아웃 정책, 연합 학습(federated learning), 차등 프라이버시(노이즈 추가), 동형 암호화, 토큰화

## LLM03 공급망

학습 데이터, 모델, 배포 플랫폼의 무결성에 영향을 주는 취약점. 기존 SW 공급망(A06:2021)에 더해 **사전학습 모델, 데이터셋, LoRA 어댑터, 모델 병합, 온디바이스 배포**가 새 리스크를 만든다.

- 취약점: 오래된 타사 패키지, 라이선스 리스크, 취약한 사전학습 모델(정적 검사 불가한 바이너리 블랙박스), 약한 모델 출처 보증, 악성 LoRA 어댑터, 조작 취약한 모델 병합
- 완화: 신뢰 가능한 공급자만, AI 레드팀 평가, **SBOM/AI-BOM(OWASP CycloneDX)**, 모델 서명과 파일 해시 무결성 검사, 협업 개발 환경 감사, 패치 정책

## LLM04 데이터 및 모델 오염 (Poisoning)

학습, 미세조정, 임베딩 데이터를 조작해 백도어, 편향, 성능 저하를 심는 무결성 공격. 검증되지 않은 외부 데이터 사용 시 위험이 높다. 백도어는 특정 트리거 전까지 정상 동작해 탐지가 어렵다 (Sleeper Agents).

- 완화: 데이터 출처 추적(ML-BOM), 공급자 검증, 엄격한 샌드박싱, 데이터 버전 관리(DVC), 이상 징후 탐지, 적대적 견고성 테스트, 학습 손실 모니터링

## LLM05 부적절한 출력 처리

LLM 출력을 다운스트림에 넘기기 전 검증, 정제, 인코딩이 부족한 것. **출력을 신뢰하는 순간 전통적 인젝션이 재현**된다.

- 결과: 출력이 shell/eval로 → RCE, 브라우저 렌더 → XSS, DB 쿼리 → SQL 인젝션, 파일 경로 → 경로 탐색
- 완화: 모델을 이용자처럼 불신(제로 트러스트), OWASP ASVS 준수, 컨텍스트별 출력 인코딩, 매개변수화 쿼리, CSP, 로깅과 모니터링

## LLM06 과도한 위임 (Excessive Agency)

에이전트/플러그인에 준 과도한 **기능, 권한, 자율성** 때문에 예상 밖 입력이나 조작된 출력이 위험한 작업을 수행하게 되는 것.

- 세 근본 원인: 과도한 기능(불필요한 확장 접근), 과도한 권한(읽기만 필요한데 UPDATE/DELETE 권한), 과도한 자율성(사람 확인 없이 삭제, 전송)
- 완화: 확장 기능과 범위 최소화, 개방형 기능(shell 실행 등) 회피, 다운스트림 최소 권한, 이용자 컨텍스트로 실행(OAuth 최소 스코프), 고위험 작업에 사람 승인, **완전한 중재**(권한은 LLM이 아니라 다운스트림에서 강제)

## LLM07 시스템 프롬프트 유출

시스템 프롬프트에 담긴 자격 증명, 내부 규칙, 권한 구조가 노출되는 것. **유출 자체가 아니라 시스템 프롬프트에 비밀을 두거나 그것을 보안 제어로 쓴 설계 결함**이 문제다.

- 원칙: 시스템 프롬프트는 비밀 저장소도 보안 경계도 아니다. API 키, 자격 증명, 권한 구조를 넣지 말 것
- 완화: 민감 데이터를 프롬프트 밖 외부 시스템에 분리, 행동 제어를 프롬프트에 의존하지 않기, LLM 외부의 독립 가드레일, 권한 분리와 인증 체크는 결정적이고 감사 가능한 시스템에서

## LLM08 벡터 및 임베딩 취약점 (RAG)

RAG의 벡터/임베딩이 생성, 저장, 검색되는 방식의 취약점. RAG는 사전학습 모델에 외부 지식을 결합해 성능과 관련성을 높이는 기법.

- 취약점: 접근 제어 미흡으로 임베딩 무단 접근, **멀티테넌트 벡터 DB 공유 시 교차 컨텍스트 유출**, 임베딩 역전(inversion)으로 원본 복원, 데이터 오염, RAG 후 모델 행동 변화(감성/공감 저하)
- 완화: 세분화된 접근 제어(권한 인식 벡터 DB), 데이터 검증과 출처 인증, 결합 데이터 분류와 태깅, 변경 불가 로그와 모니터링

## LLM09 허위 정보 (Misinformation)

신뢰할 만해 보이지만 틀렸거나 오해를 유발하는 출력. 주원인은 **환각**(통계적 패턴으로 빈틈을 메우다 생기는 허구)과 **과도한 신뢰**(이용자가 검증 없이 수용).

- 위험: 사실 오류(Air Canada 챗봇 소송 패소), 근거 없는 주장(ChatGPT 가짜 판례), 안전하지 않은 코드 추천(존재하지 않는 라이브러리 → LLM05, 공급망과 연결)
- 완화: RAG로 검증된 정보 근거화, 미세조정과 PET, 교차 검증과 사람 감독, 자동 검증, AI 생성물임을 UI에 명시, 리스크 커뮤니케이션

## LLM10 무제한 소비 (Unbounded Consumption)

통제되지 않은 추론 허용으로 서비스 거부, 경제적 손실, 모델 도용이 발생하는 것. 클라우드의 높은 연산 비용이 표적이 된다.

- 위험: 가변 길이 입력 플러딩, **지갑 거부 공격(Denial of Wallet, 종량제 비용 폭증)**, 컨텍스트 윈도우 초과 입력, 자원 집약 쿼리, API를 통한 모델 추출과 기능적 복제(섀도 모델), 부채널 공격
- 완화: 입력 크기 검증, logits/logprobs 노출 제한, 속도 제한과 쿼터, 자원 할당 모니터링, 타임아웃과 조절, 샌드박싱, 워터마킹, 단계적 성능 저하(graceful degradation), RBAC와 중앙 ML 모델 인벤토리, 자동화 MLOps 배포

## 신뢰 경계 관점 요약

- 클라이언트 입력, 외부 데이터 소스, RAG 저장소, 인터넷은 모두 **신뢰 못 하는 매체**로 취급 (부록 위협 모델의 T/B 경계)
- 관통하는 원칙: 입력도 출력도 불신, 최소 권한, 권한 강제는 LLM 밖 결정적 시스템에서, 고위험엔 사람 승인, 전 구간 모니터링
- 기존 웹 보안과의 연결: 출력 처리(LLM05)는 [[XSS]], [[SQL-Injection|SQL Injection]]의 LLM 버전, 공급망(LLM03)은 [[Supply-Chain-Security]]의 ML 확장, 시스템 프롬프트(LLM07)는 [[Secret-Management|시크릿 관리]] 원칙과 동일

### 자체 학습 모델의 공급망과 복구 경계

자체 학습이나 미세조정을 하는 모델은 추론 API뿐 아니라 데이터 준비, 학습 환경과 배포 산출물까지 추적해야 한다. 다음은 AWS Machine Learning Lens의 데이터 계보, 승인 패키지와 복구 지침을 연결한 점검 순서다(2026-10-10 해당 지침 대조).

1. **데이터 준비:** 원본 출처, 전처리 변환, 접근과 변경 이력, 무결성 검사 결과를 남긴다. 모델 파일의 버전만으로는 어떤 데이터와 변환이 결과에 영향을 줬는지 재현할 수 없다.
2. **학습 환경:** 승인한 공개 라이브러리를 관리하는 저장소와 버전 정책을 두고, 의존성과 컨테이너 구성도 추적한다. 데이터 계보와 실행 환경 기록은 서로 대체하지 않는다.
3. **배포와 복구:** 학습 데이터, 특징 변환, 모델 산출물, 컨테이너 이미지와 엔드포인트 설정의 연결을 보존한다. 이전 정상 모델 파일만 보관하지 말고 해당 서비스 구성을 복구하는 절차까지 시험한다.

위험 목록은 무엇을 막을지 정하는 기준이고, 이 기록은 문제가 생겼을 때 어느 데이터와 배포를 조사하고 되돌릴지 정하는 근거다. 계보와 버전 관리를 갖췄다는 사실만으로 오염이나 취약점이 없음을 증명하지는 않는다.

## 면접 체크포인트

- 프롬프트 인젝션의 직접/간접/멀티모달 구분과 완전한 예방은 불가능하고 완화만 가능하다는 전제
- Spotlighting의 세 방식과 delimiting을 실무에서 권하지 않는 이유, Instruction Hierarchy가 앱이 아니라 모델 학습의 영역이고 앱은 메시지 채널로 출처를 보존해야 하는 이유
- 정적 벤치마크에서 0%에 가깝던 방어 대부분이 적응형 공격에서 90% 넘게 뚫리는 이유와 Rule of Two, 결정적 정책 엔진, 실제 행동을 보여 주는 승인으로 피해 반경을 묶는 설계
- 부적절한 출력 처리가 왜 기존 인젝션(XSS, SQLi, RCE)의 재현인지
- 과도한 위임의 세 근본 원인(기능/권한/자율성)과 완전 중재 원칙
- 시스템 프롬프트 유출의 진짜 문제는 유출이 아니라 설계 결함이라는 점
- RAG 멀티테넌트 환경의 교차 컨텍스트 유출과 권한 인식 벡터 DB
- 무제한 소비의 지갑 거부 공격(DoW)과 모델 추출

## 출처

2026-10-02에는 Dual-LLM 원 제안의 Controller와 데이터 격리 조건, PuzzleMask의 실험 표본과 성공률을 대조했다. OWASP 전체 항목과 개별 제품의 현재 방어 상태를 재인증한 기록은 아니다. 2026-10-06에는 Spotlighting과 Instruction Hierarchy 원 논문, Model Spec 2026-08-18판의 권한 수준, 적응형 공격 평가, Agents Rule of Two, CaMeL, Gemini 다층 방어와 OWASP 2026판의 LLM01 완화와 순위 변경을 대조했다. 2026판 LLM02 이하의 본문은 대조하지 않았다.

- [OWASP Top 10 for LLM Applications 2025 (한국어판) — OWASP GenAI](https://genai.owasp.org/)
- [The Dual LLM pattern for building AI assistants that can resist prompt injection — Simon Willison's Weblog](https://simonwillison.net/2023/Apr/25/dual-llm-pattern/)
- [Zero-Click AI Vulnerability Exposes Microsoft 365 Copilot Data Without User Interaction — The Hacker News](https://thehackernews.com/2025/06/zero-click-ai-vulnerability-exposes.html)
- [PuzzleMask: Abusing Plain Prose as a Covert AI Attack Vector — Check Point Research](https://research.checkpoint.com/2026/puzzlemask-abusing-plain-prose-as-a-covert-ai-attack-vector/)
- [PuzzleMask: 평범한 문장을 잠재적 AI 공격 수단으로 오용하기 — GeekNews](https://news.hada.io/topic?id=33622)
- [OWASP Top 10 for LLM Applications 2026 — OWASP GenAI](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/)
- [Defending Against Indirect Prompt Injection Attacks With Spotlighting — arXiv](https://arxiv.org/abs/2403.14720)
- [The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions — arXiv](https://arxiv.org/abs/2404.13208)
- [Model Spec (2026-08-18) — OpenAI](https://model-spec.openai.com/2026-08-18.html)
- [The Attacker Moves Second: Stronger Adaptive Attacks Bypass Defenses Against LLM Jailbreaks and Prompt Injections — arXiv](https://arxiv.org/abs/2510.09023)
- [Agents Rule of Two: A Practical Approach to AI Agent Security — Meta AI](https://ai.meta.com/blog/practical-ai-agent-security/)
- [Defeating Prompt Injections by Design — arXiv](https://arxiv.org/abs/2503.18813)
- [Mitigating prompt injection attacks with a layered defense strategy — Google](https://blog.google/security/mitigating-prompt-injection-attacks/)
- [Blocks.txt — Unicode](https://www.unicode.org/Public/UCD/latest/ucd/Blocks.txt)
- [AWS, Machine Learning Lens: MLSEC03-BP04 Enforce data lineage](https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/mlsec03-bp04.html)
- [AWS, Machine Learning Lens: MLOPS04-BP02 Establish reliable packaging patterns to access approved public libraries](https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/mlops04-bp02.html)
- [AWS, Machine Learning Lens: MLREL05-BP02 Create a recoverable endpoint with a managed version control strategy](https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/mlrel05-bp02.html)

## 관련 문서

- [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문]] — 가드레일을 회귀 테스트 대상으로 두고 탐지율, 차단율, 과잉 차단을 따로 재는 법
- [[Application-Security|애플리케이션 보안 / 시큐어코딩]]
- [[Supply-Chain-Security|공급망 보안]]
- [[Network-Perimeter-Security|네트워크 경계 보안]]
- [[Secret-Management|시크릿 관리]]
- [[AI-Infra-Geopolitics|AI 인프라 지정학]]
- [[Developer-Role-AI-Era|AI 시대 개발자 역할]]
- [[Claude-Code-Cloud-Security|Claude Code 클라우드 실행과 보안 (에이전트 인프라의 다층 방어 사례)]]
- [[MCP-Security-Boundaries|MCP 보안 경계 (서버 자격 증명, 요청 검증과 게이트웨이)]]
- [[Agent-Ready-Data|에이전트용 데이터 준비 (위임 접근, JIT 자격 증명과 lethal trifecta)]]
