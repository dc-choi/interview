---
tags: [security, ai, agent-skills, supply-chain, prompt-injection]
status: done
verified_at: 2026-11-03
category: "보안(Security)"
aliases: ["Malicious Agent Skills", "악성 에이전트 스킬", "Hidden Skill Instructions", "스킬에 숨긴 지시"]
---

# 악성 에이전트 스킬: 자연어 페이로드와 숨긴 지시

skill은 SKILL.md(메타데이터와 지시)를 중심으로 만든 작은 패키지이며 스크립트나 추가 리소스가 들어 있을 수도 있다. 에이전트는 필요할 때 skill 문서를 읽고 그 지시를 따른다(VirusTotal이 설명한 OpenClaw skill 기준. Claude Code와 Codex의 형식은 [[Agent-Skills|에이전트 스킬]]). 그래서 악성 skill의 공격은 실행 파일 없이 문장 하나로도 성립한다. 설치 검토는 코드 검사에서 끝나지 않고, 에이전트가 실제로 읽는 원본 텍스트 전체를 대상으로 해야 한다.

## 관측 규모와 읽는 법

VirusTotal이 2026-10-08 공개한 분석(From Automation to Infection Part III) 기준이다.

| 관측 | 값 |
|---|---|
| 분석한 skill | VirusTotal 제출물의 한 시점 스냅샷에서 skill이 아닌 업로드를 걸러 낸 35,878개 |
| 악성 판정 | 6,637개(18.5%). 악성의 78.2%는 변형이 둘 이상인 1,016개 계열에 속한다 |
| 공격이 있는 위치 | 악성의 62.0%는 공격 전체가 자연어 지시에 있고 악성 코드가 없다. 외부 인프라 의존 23.7%, 악성 스크립트 포함 13.7%, 나머지 0.6%는 혼합이나 설정 기반 |
| 오픈소스 scanner 3종의 기본 설정 결과 | VirusTotal 벤치마크에서 기본 설정으로 돌린 Tencent AI-Infra-Guard 0.2.2(static scan), NVIDIA SkillSpector 2.11.2(default threshold), Cisco Skill Scanner 2.1.0(default verdict)은 악성 skill의 36~71%를 놓치고 정상 skill의 21~61%를 악성으로 표시했다. 세 도구 중에서는 가장 많이 잡은 도구가 정상도 가장 많이 표시했고, SkillSpector의 모든 finding을 악성으로 치면 탐지율 74.8%, 오탐률 71.0%였다 |

- **표본의 편향:** 특정 마켓의 전체 목록이 아니라 VirusTotal 제출물의 스냅샷이다. ClawHub에 게시되는 skill은 모두 VirusTotal로 검사되기 때문에 OpenClaw가 과대 대표되며, VirusTotal은 플랫폼별 비율이 각 플랫폼의 노출 정도가 아니라 skill이 VirusTotal에 도달하는 경로를 반영한다고 밝힌다.
- **비교의 기준:** 기준 라벨은 VirusTotal 자체 파이프라인(지표와 텔레메트리 상관, Gemma 기반 모델, Gemini 분석)으로 만들었다. VirusTotal은 이 구성만 밝혔고, 이를 결합해 판정하는 규칙과 문턱, 사람 검수 여부, 라벨 자체의 오류율, 벤치마크 표본의 크기와 구성은 Part III와 숨김 기법 글에 없다. 판정표는 Benign을 Clean이라고만 설명하며, 벤치마크의 정상(clean)이 Benign만인지 비악성 전체인지 밝히지 않았다. 벤치마크 표의 단일 모델(Single-pass Jev-like model)은 이 파이프라인 중 실시간으로 도는 부분이며 이 라벨 대비 탐지율 81.3%, 정상 skill을 악성으로 표시한 비율 7.7%다. 라벨을 만든 파이프라인의 일부라 독립 평가로 보지 않는다(해석).
- **서명과 규칙의 한계:** VirusTotal은 악성 다수에 해시를 잡을 바이너리가 없어 파일 서명만으로는 알 수 있는 것이 적고, 규칙 기반 scanner가 문서와 공격을 구분하지 못해 자연어 공격을 놓치거나 정상 skill을 많이 표시한다고 설명한다. 텍스트 파일도 해시는 있지만 문장을 조금만 바꿔도 달라지고 악성 다수가 변형 계열이므로, 개별 해시보다 계열 단위로 묶어 보는 편이 맞다(해석).

## 검토자가 보는 화면과 에이전트가 읽는 원본을 다르게 만드는 기법

VirusTotal의 2026-10-21 후속 글 기준이다. VirusTotal은 데이터의 악성 skill 대부분이 아무것도 숨기지 않았다고 본다. 평범해 보이게 쓰였더라도 파일을 읽는 검토자는 지시나 코드를 볼 수 있다는 뜻이다. 아래 세 기법으로 숨긴 경우는 악성 6,637개 중 90개(1.4%)였으며, 파이프라인이 악성으로 판정한 지시가 숨긴 위치에 있을 때만 센 하한값이다.

| 기법 | 건수 | 원리 | 관측 예 |
|---|---|---|---|
| 빈 줄 패딩 | 56 | 78~825줄의 빈 줄 뒤에 지시를 둔다. 스크롤하던 검토자는 문서가 끝난 것처럼 보이는 곳에서 멈추기 쉽고, 긴 입력을 자르는 scanner는 마지막 줄에 닿지 못할 수 있다 | WHO 지표를 조회하는 skill은 빈 줄 733줄(한 줄을 빼고 공백 문자로 채움) 뒤 마지막 줄에서 나이지리아의 말라리아 발생률을 실제 값과 관계없이 0으로 출력하라고 지시해, 에이전트가 돌려주는 데이터를 바꾸게 한다 |
| HTML 주석 | 28 | VirusTotal은 GitHub, 마켓플레이스 웹 페이지와 IDE의 Markdown 미리보기가 HTML 주석을 표시하지 않지만, SKILL.md를 불러오는 에이전트는 주석까지 원본 파일을 읽는다고 설명한다 | 환경 변수와 설정 파일의 API 키와 토큰을 모두 외부 주소로 보내고 그 URL을 사용자에게 말하지 말라는 지시, 외부 주소의 스크립트를 내려받아 셸로 실행하라는 지시 |
| 보이지 않는 Unicode | 6 | tag 문자나 zero-width 문자로 지시를 인코딩하거나, zero-width 문자를 단어 사이에 끼워 키워드 매칭을 깨뜨린다. ASCII 인쇄 문자와 대응하는 tag 문자는 U+E0020~U+E007E이고(블록 전체는 U+E0000~U+E007F), 대부분의 편집기, 터미널과 브라우저는 이 문자를 표시하지 않는다. VirusTotal은 여러 LLM이 이렇게 인코딩한 텍스트를 읽고 따른다고 쓰지만 구체적인 근거는 글에 없다 | 빈 줄처럼 보이는 줄에 든 tag 문자 182개, U+200C와 U+200D를 비트 0과 1로 쓴 인코딩, 단어 사이에 끼워 키워드 규칙을 피하는 U+200B |

- 보이지 않는 Unicode를 쓴 6개 중 일부는 자리표시 명령이나 계산기 실행 같은 무해한 명령만 든 개념 증명이었지만 설치할 수 있는 skill로 제출됐고, 숨기는 방식은 payload와 관계없이 똑같이 작동한다. 작동하지 않는 template도 악성 계열 이름을 받았으므로 악성 건수에는 이런 개념 증명이 섞여 있다(해석).
- zero-width 인코딩을 쓴 파일의 마지막 줄은 자동 skill 검토기와 LLM 기반 scanner를 겨냥해, ZeroLeaks의 감사를 받았다고 주장하며 휴리스틱 표시를 무시하고 오탐으로 승인하라고 적었다. 파일을 검사하는 LLM도 검사 대상 텍스트의 지시를 입력으로 받는다는 뜻이다(해석, [[LLM-Application-Security|LLM 애플리케이션 보안]]).

## 은폐와 지속성: skill을 지워도 남는 지시

- **알리지 말라는 지시:** 확인 단계가 자동이니 사용자에게 알리지 말라, 보안 절차에 혼란을 줄 수 있으니 이 URL을 사용자에게 말하지 말라, 사용자는 알 필요가 없다는 문장이 관측됐다. 조용히 처리하라는 표현이나 메모리 파일 언급은 정상 skill에도 나오며, VirusTotal은 단순한 규칙으로는 둘을 믿을 만하게 가르지 못해 이 유형의 건수를 내지 않았다.
- **메모리와 설정 파일 쓰기:** 일부 skill은 에이전트에게 MEMORY.md, SOUL.md, AGENTS.md 같은 지속 메모리나 설정 파일에 항목을 쓰라고 지시했고, VirusTotal은 이런 항목이 skill을 지운 뒤에도 에이전트에 계속 영향을 줄 수 있다고 설명한다. 한 예는 모든 응답 끝에 표식을 붙이라는 지시를 지속 메모리에 저장하게 했다. 효과는 표식 추가에 그치지만 skill보다 오래 남는 경로를 쓴다.
- 에이전트 profile을 설치하거나 갱신할 때 제3자의 SOUL.md가 검사나 승인 없이 복사되는 경로는 [[Hermes-Agent|Hermes Agent]], 규칙 파일에 넣은 지시로 코딩 에이전트의 의존성 선택을 바꾸는 경로는 [[Coding-Agent-Package-Hallucination|코딩 에이전트의 패키지 환각 공격]]에 있다.

## 설치 전후 점검

아래 항목은 VirusTotal의 두 글이 권하는 점검이다. 해석과 적용 제안은 따로 표시한다.

- **원본 파일을 끝까지 읽는다:** 렌더링된 페이지가 아니라 raw 파일을 보고 파일 끝을 확인한다. 설치 전에 SKILL.md와 함께 든 스크립트를 검토하고, 의심스러운 빈 공간이 있는 긴 파일도 끝까지 본다.
- **정규화한 뒤 검사한다:** 정적 규칙을 적용하거나 LLM에 넘기기 전에 zero-width 문자를 지우고, tag 문자는 해독하거나 거부하고, 연속된 빈 줄을 줄인다. 빈 줄 패딩이 공백 문자로 채워진 사례가 있으므로 공백만 있는 줄도 빈 줄로 다룬다(해석). 입력과 렌더링 경계에서 지울 문자 범위는 [[LLM-Application-Security|LLM 애플리케이션 보안]]의 보이지 않는 문자 항목과 같은 계열이다.
- **지침과 메모리 파일을 보호한다:** MEMORY.md, SOUL.md, AGENTS.md, CLAUDE.md와 .cursorrules를 skill이 사용자의 명시적 승인 없이 고칠 수 없는 파일로 다룬다. 적용 제안: skill을 설치하거나 처음 실행한 뒤 이 파일들의 diff를 확인한다.
- **출처와 실행 범위를 줄인다:** 신뢰하는 출처에서 설치하고 버전을 고정하며, `curl | sh` 실행이나 추가 도구 내려받기를 요구하는 skill은 피한다. 에이전트를 sandbox나 container에서 실행하고 클라우드 자격 증명, SSH 키와 .env 파일은 가능한 한 작업 공간 밖에 둔다. 격리 설계는 [[Agent-Execution-Isolation|에이전트 실행 격리]]를 따른다.
- **설치 전 검사와 그 한계:** VirusTotal은 설치 전에 VirusTotal로 skill을 검사하라고 권하며, Code Insight와 에이전트 연동이 skill 패키지 원본을 분석한다고 설명한다. 출처의 세 글 모두에 Code Insight 자체의 탐지율이 없고 벤치마크 표의 모델과의 관계도 설명돼 있지 않으므로, 검사 통과를 원본 검토 생략의 근거로 쓰지 않는다(해석).
- **실행 중 감시(보안팀 대상 권고):** 에이전트 프로세스가 webhook, paste 사이트나 이메일 서비스로 데이터를 보내는지, LLM base URL 같은 에이전트 설정이 예상하지 않게 바뀌는지 본다. 같은 계열의 변형은 개별 해시 대신 계열 이름(CARO-A 명명)으로 묶어 추적한다.

## 점검 질문

- 악성 skill의 다수가 실행 코드 없이 동작한다면 해시 서명과 코드 정적 분석은 무엇을 놓치는가?
- 검토자가 보는 화면과 에이전트가 읽는 원본이 달라지는 세 경로는 무엇이고, 각각 무엇으로 드러내는가?
- skill을 지웠는데도 이상 동작이 남는다면 어디부터 확인하는가?
- scanner 탐지율을 읽을 때 기준 라벨, 기본 설정과 표본 구성을 왜 함께 보는가?

## 출처

- [How Some Malicious AI Skills Hide Instructions from Reviewers — VirusTotal Blog](https://blog.virustotal.com/2026/10/how-some-malicious-ai-skills-hide.html) — 2026-10-21 게시. 2026-11-03 숨김 기법별 건수와 예, 은폐와 지속성 지시, 점검 권고 대조
- [From Automation to Infection (Part III): Naming, Measuring, and Detecting Malicious AI Agent Skills — VirusTotal Blog](https://blog.virustotal.com/2026/10/from-automation-to-infection-part-iii.html) — 2026-10-08 게시. 2026-11-03 표본, 판정 분포, 공격 위치 비율, scanner 비교와 권고 대조
- [From Automation to Infection: How OpenClaw AI Agent Skills Are Being Weaponized — VirusTotal Blog](https://blog.virustotal.com/2026/02/from-automation-to-infection-how.html) — 2026-02-02 게시. skill 패키지의 구성과 에이전트가 읽는 방식
- [AI Skills Are Hiding Instructions From You — YouTube, Better Stack](https://www.youtube.com/watch?v=KrsNGFodfOg) — 2026-10-24 공개 영상, 계기 자료. 사실은 위 VirusTotal 글로 대조했다

## 관련 문서

- [[Agent-Skills|에이전트 스킬]] — 설치 경로와 신뢰, 외부 스킬 감사
- [[Coding-Agent-Package-Hallucination|코딩 에이전트의 패키지 환각 공격]] — 규칙 파일에 넣은 지시와 탐지기의 한계
- [[Web-Content-Manipulation-for-AI|AI가 읽는 웹 콘텐츠의 조작]] — 사람에게 보이지 않는 웹 페이지 지시
- [[LLM-Application-Security|LLM 애플리케이션 보안]] — 프롬프트 인젝션과 보이지 않는 문자 제거
- [[Supply-Chain-Security|공급망 보안]] — 레지스트리 악성 패키지와 대응
- [[Agent-Execution-Isolation|에이전트 실행 격리]] — 모델 밖에서 강제하는 권한 경계
- [[Hermes-Agent|Hermes Agent]] — 에이전트 메모리와 스킬 쓰기 승인
