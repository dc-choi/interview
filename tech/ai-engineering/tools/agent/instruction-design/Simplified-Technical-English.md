---
tags: [ai, prompt-engineering, technical-writing, controlled-language]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["Simplified Technical English", "단순화 기술 영어", "ASD-STE100"]
---

# Simplified Technical English (ASD-STE100) — 통제 언어 규칙으로 LLM 출력 문체 제약하기

ASD-STE100 Simplified Technical English(STE)는 기술 문서를 쓰기 위한 통제 자연어(controlled natural language) 표준이다. 쓰기 규칙과 승인 어휘 사전으로 문장 구조와 단어 선택을 제한해, 영어를 기초 수준으로만 아는 독자도 정비 문서를 잘못 읽지 않게 하는 것이 목적이다. 같은 규칙을 LLM에 요청하면 길고 수식어가 많은 설명을 짧은 문장과 단계별 지시로 바꾸는 출력 문체 지시로 쓸 수 있다. 다만 모델이 STE처럼 보이게 쓴 글이 규격을 지킨 글이라는 보장은 없다.

## 정의와 배경

- **소유와 관리**: 유럽 항공우주방산산업협회 ASD(Aerospace, Security and Defence Industries Association of Europe)가 소유한다. ASD의 작업 그룹인 STEMG(Simplified Technical English Maintenance Group)가 개발, 발행과 유지보수를 맡는다.
- **계기**: 1979년 유럽 항공사 단체 AEA가 유럽 항공우주산업협회 AECMA(현 ASD)에 정비 문서의 가독성을 조사해 해결책을 찾아 달라고 요청했다. 요청한 항공사의 80%가 비영어권 국가 소속이었다. 1983년 작업 그룹 SEWG가 꾸려졌고 1986년 AECMA Simplified English Guide가 처음 나왔다. 2005년 국제 specification, 2025년 국제 standard가 됐다.
- **현재 판**: Issue 9(2025-01-15)다. 보통 3년마다 개정하고 Issue 10은 2028년 1월로 예정돼 있다. 표준은 PDF로 무료 배포한다(2026-10-06 공식 FAQ 기준).
- **구성**: 9개 절 53개 쓰기 규칙과 사전으로 이뤄진다. 사전의 승인 단어는 Issue 9 기준 875개이고, 원칙적으로 단어마다 뜻 하나와 품사 하나를 허용한다. clean, with처럼 품사나 뜻이 여럿 승인된 단어가 소수 있다. 승인되지 않은 단어도 승인 대체어와 함께 실려 있다. 사전에 없는 분야 용어는 technical noun과 technical verb로 쓴다. Issue 9에서 technical name이라는 명칭이 technical noun으로 바뀌었다.
- **적용 범위**: 항공기 정비 문서에서 출발했지만 S1000D 명세가 참조하는 육상, 해상 차량 문서와 재생에너지, 의료기기 분야에서도 쓴다. 비영어권 독자를 위해 만들었지만 영어 원어민 사이의 소통도 개선한다. 유아용으로 쉽게 만든 영어가 아니라 복잡한 시스템과 작업을 명확하게 쓰기 위한 정밀한 표준이다.

## 핵심 규칙

### 단어 — 한 단어, 한 뜻, 한 품사

- 같은 뜻에는 승인 단어 하나만 쓴다. begin, commence, initiate 대신 start만 쓴다.
- 구동사(phrasal verb)는 원칙적으로 쓰지 않는다(Issue 9 Rule 9.3). put out the fire 대신 extinguish를 쓰며, put on처럼 뜻을 제한해 허용한 소수만 예외다.
- -ing 형태는 보통 허용하지 않는다.
- 사전에 없는 분야 용어는 Rule 1.5의 22개 technical noun 범주나 Rule 1.12의 4개 technical verb 범주에 들 때만 쓰고, 보통 사내 용어집이나 용어 데이터베이스에서 찾는다. technical verb는 사전의 승인 단어로 같은 문장을 쓸 수 없을 때만 쓴다.
- 승인 뜻과 철자는 미국 영어와 Merriam-Webster 사전을 기준으로 한다.

### 절차문(procedural writing)

Issue 9 Section 5의 규칙 요약이다.

| 규칙 | 내용 |
|---|---|
| 5.1 | 문장을 짧게 쓴다. 문장당 최대 20단어 |
| 5.2 | 한 문장에 지시를 하나만 쓴다. 둘 이상의 동작이 동시에 일어날 때만 예외 |
| 5.3 | 지시는 명령형으로 쓴다 |
| 5.4 | 독자가 먼저 알아야 할 조건이 있으면 지시를 서술문으로 시작하고 쉼표로 명령과 나눈다 |
| 5.5 | Note에는 정보만 쓰고 지시를 넣지 않는다 |

- 절차문의 지시는 명령형으로 쓰고 수동태를 쓰지 않는다(Rule 5.3, 3.6). The component must be installed 대신 Install the component로 쓴다. 조건 문구(5.4), 동작 직후의 결과나 한계 문장(5.2), Note(5.5)는 절차 안에서도 명령형이 아닌 서술 형태로 쓴다. 이 가운데 Note만 문장당 최대 25단어이고, 작업 단계 안의 문장은 Rule 5.1의 20단어 상한을 따른다.
- 설명 문서 같은 서술문(descriptive writing)은 Section 6의 별도 규칙(문장당 최대 25단어 등)을 따른다. 서술문도 능동태가 기본이고, 행위자를 모를 때만 수동태를 쓴다(Rule 3.6).

## 예시

규칙을 적용한 예다.

| 원문 | STE |
|---|---|
| The component must be installed. | Install the component. |
| Put out the fire. | Extinguish the fire. |
| Commence the test. | Start the test. |

한국어 LLM 응답에 STE의 문장 규칙만 흉내 낸 예다. STE는 영어 통제 언어라 이 예는 STE 준수 문서가 아니다.

원문:

> 원활한 업그레이드를 위해서는 기존 캐시를 먼저 정리한 뒤 리빌드를 진행하는 것이 일반적으로 권장되며, 그렇지 않을 경우 오래된 산출물로 인해 예기치 못한 실패가 발생할 수 있습니다.

문장 규칙 적용:

> 원활하게 업그레이드하려면 보통 아래 순서를 권장합니다.
>
> 1. 기존 캐시를 지우세요.
> 2. 리빌드를 시작하세요.
>
> 참고: 캐시를 지우지 않으면 오래된 산출물 때문에 예기치 못한 실패가 생길 수 있습니다.

## LLM 출력 제약으로 쓰기

### 사례

2026-10-02(UTC 기준) Andrej Karpathy는 X에 LLM 출력을 이해하는 팁을 올리며, 글쓰기 쪽 팁으로 LLM에 ASD-STE100으로 설명하게 하는 방법을 소개했다. 규격이 꽤 엄격해 `80% of the way to ASD-STE100`처럼 누그러뜨려 요청한 적도 있다고 적었다. 같은 글은 그다음 단계로 다이어그램, HTML 웹 페이지, 맞춤 설명 영상을 차례로 더 나은 형식으로 든다.

### 부분 적용

공식 FAQ는 STE가 국제 서신 같은 일반 글쓰기용으로 만든 규격은 아니라고 하면서도, 짧은 문장, 한 문장 한 주제, 능동태 같은 원칙은 다른 글쓰기에도 효과적으로 적용할 수 있다고 답한다. 설명용 응답에는 아래 규칙만 골라 쓰는 편이 실용적이다.

- 문장 길이에 상한을 둔다.
- 절차는 번호 단계로 쓰고 단계마다 명령형 지시를 하나만 둔다.
- 조건은 문장 앞에 둔다.
- 같은 개념에는 같은 용어를 쓰고 동의어로 바꿔 쓰지 않는다.
- 능동태로 쓴다.

승인 어휘 제한까지 모두 요구하면 규격이 엄격한 만큼 설명이 부자연스러워질 수 있어 이 부분을 덜어 낸다.

요청 예시(영어 응답):

> Explain this in the style of ASD-STE100 Simplified Technical English, about 80% of the way. Use a maximum of 20 words in each sentence of a procedure step and 25 words in each sentence of a note or a description. Write each procedure step as one instruction in the imperative. Put conditions at the start of the sentence. Use one term for one concept. Keep every fact. Split long sentences instead of removing content.

요청 예시(한국어 응답):

> 답변에 ASD-STE100 Simplified Technical English의 문장 규칙을 적용한다. 문장은 짧게 쓴다. 절차는 번호 단계로 쓰고 단계마다 지시를 하나만 둔다. 조건은 문장 앞에 둔다. 같은 개념에는 같은 용어를 쓴다. 모든 사실을 유지하고 긴 문장은 나눈다.

- 규격 이름만 적지 않고 적용할 규칙을 함께 적는다. 이름만으로도 문체는 달라질 수 있지만, STE처럼 보이는 글이 규칙과 어휘를 지켰다는 보장은 없다(아래 트레이드오프의 STEMG 경고). 꼭 지킬 규칙은 지시문에 직접 적는다.
- Anthropic 프롬프트 가이드는 하지 말 것 대신 할 것을 지시하고, 프롬프트의 문체를 원하는 출력 문체에 맞추라고 권한다. 위 예시처럼 지시문도 짧은 문장으로 쓴다.
- 매 응답에 적용하려면 CLAUDE.md나 출력 스타일 같은 영속 지시에 넣는다. 주입 경로는 [[Agent-Coding-Guardrails|LLM 코딩 가드레일]]의 배포 절과 같다.

### 한국어 출력

STE 사전은 영어 단어 목록이라 승인 어휘 제한은 한국어 응답에 옮길 수 없다. 같은 개념에 같은 용어를 쓰는 단어 원칙과 문장 규칙은 옮길 수 있다. 영어 20단어 상한을 한국어 어절 수로 그대로 바꿀 근거는 없으니, 길이 기준은 독자와 매체에 맞춰 직접 정한다. 여러 언어로 내보낼 문서라면 STE 영어로 먼저 쓰고 번역하는 방법도 있다. 공식 FAQ는 STE로 쓴 글이 번역가, 신경망 기계번역, LLM 어느 쪽으로 번역하든 쉬워진다고 본다.

## 트레이드오프

| 구분 | 부분 적용 | 전면 적용 |
|---|---|---|
| 용도 | 읽기 쉬운 설명과 작업 안내 | STE를 요구하는 정비 매뉴얼과 기술 문서 |
| 범위 | 문장 길이, 한 문장 한 지시, 명령형, 조건 먼저, 용어 고정 | 53개 규칙, 승인 어휘, technical noun과 technical verb 관리 |
| 검증 | 빠진 사실과 가독성 점검 | 규격 대조와 사람의 검토 |
| LLM 역할 | 출력 생성 | 초안 작성과 점검 보조 |

- **그럴듯함과 준수는 다르다**: STEMG는 AI가 만든 글이 규칙과 어휘를 지키지 않아도 명확하고 STE에 맞는 것처럼 보일 수 있다고 경고한다. 2026년 6월 STEMG와 AI 태스크팀(AITT)이 낸 white paper는 AI가 작성자를 돕되 대체하지 않아야 하고, 사람의 감독을 대신할 수 없다는 입장이다. AI 도움을 받은 내용은 그 범위와 한계를 밝히라고 권한다. ASD는 Issue 9에서도 STE 작성 도구에 대한 보증이나 승인을 하지 않는다고 밝힌다. 2026년 2월 ASD STE Forum에서도 환각, 용어 드리프트, 거짓 준수가 AI 도구의 위험으로 꼽혔다.
- **쓰기 비용**: STE는 독자의 이익을 위해 만든 규격이지 쓰기 쉬운 문체가 아니다. 공식 FAQ는 작성자에게 CEFR C1 수준의 영어를 권한다. LLM이 초안을 쓰면 작성 부담은 줄지만 준수 여부는 따로 확인해야 한다.
- **정보 손실**: 문장을 짧게 하라는 제약이 내용을 줄이라는 지시로 번질 수 있다. 짧게 쓰라는 지시가 안전 처리를 떨어뜨린 코드 사례는 [[Agent-Overengineering-Guard|에이전트 과잉설계 방지]]에 있다. 지시에 사실 유지와 문장 분할을 함께 적는다.
- **형식 한계**: 구조와 관계가 핵심인 설명은 문장을 다듬기보다 다이어그램이나 표로 바꾸는 편이 나을 수 있다.

## 적용 체크포인트

- 목적이 읽기 쉬운 설명인지, STE 준수 문서인지 먼저 정했는가
- 규격 이름과 함께 적용할 규칙을 지시문에 직접 적었는가
- 절차가 번호 단계로 나뉘고 단계마다 명령형 지시가 하나인가
- 조건과 경고가 해당 지시보다 앞에 오는가
- 같은 대상을 여러 이름으로 부르지 않는가
- 문장을 줄이면서 빠진 사실이 없는지 원문과 대조했는가
- STE 준수 여부를 모델의 자기 평가로 판정하지 않고 규격과 사람의 검토로 확인했는가
- 한국어 응답에는 어휘 제한 대신 문장 규칙과 용어 고정만 옮기고 길이 기준은 직접 정했는가

## 출처

- [ASD STEMG, About STE](https://www.asd-ste100.org/about_STE.html)
- [ASD STEMG, FAQ](https://www.asd-ste100.org/STE_faq.html)
- [ASD STEMG, STE Downloads](https://www.asd-ste100.org/STE_downloads.html)
- [ASD STEMG, ASD-STE100 Home](https://www.asd-ste100.org/)
- [ASD, ASD-STE100 Simplified Technical English Issue 9](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf)
- [ASD STEMG, White paper: ASD-STE100 and AI](https://www.asd-ste100.org/assets/files/WhitePaper-ASD-STE100_and_AI.pdf)
- [ASD, What Is Simplified Technical English (STE)?](https://www.asd-europe.org/standards-specifications/simplified-technical-english/what-are-the-basics-of-simplified-technical-english/)
- [Anthropic Platform Docs, Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- [Writing for safety: key insights from the ASD STE Forum 2026 — ASD](https://www.asd-europe.org/news-media/news-events/news/asd-ste100-forum-2026/)
- [From Specification to Standard: A Meta-Terminological Evolution in ASD-STE100 Issue 9 — CEUR Workshop Proceedings, Daniela Zambrini, Orlando Chiarello](https://ceur-ws.org/Vol-3990/short24.pdf)
- [LLM 출력을 이해하는 팁 — X, Andrej Karpathy](https://x.com/karpathy/status/2105819303471976479)

## 관련 문서

- [[Agent-Spec-Writing|에이전트 스펙 작성법 (모호한 지시, 번호 단계)]]
- [[Agent-Coding-Guardrails|LLM 코딩 가드레일 (이름 있는 원칙, 주입 경로)]]
- [[Agent-Test-Verification-Behavior|에이전트 검증 행동 (기법 이름 지시와 실제 행동)]]
- [[Agent-Overengineering-Guard|에이전트 과잉설계 방지 (짧게 쓰라는 지시의 위험)]]
- [[Claude-Code-Customization|Claude Code 커스터마이즈 (출력 스타일)]]
- [[Tech-Writing-Craft|개발자 글쓰기 (모호함을 수치로, 전문용어 풀이)]]
- [[LLM-Assisted-Editing|LLM을 활용한 글 교정 워크플로우 (AI 문체 패턴)]]
