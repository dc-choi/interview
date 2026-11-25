---
tags: [ai, harness, agent, skills, verification]
status: done
verified_at: 2026-11-18
category: "AI엔지니어링(AIEngineering)"
aliases: ["pstack", "poteto mode", "피스택"]
---

# pstack

pstack은 코딩 에이전트에게 계획, 구현, 검증과 기록의 습관을 skill 묶음으로 넣는 오픈소스 플러그인이다. Cursor의 공개 플러그인 저장소(`cursor/plugins`)에 있고, README는 작성자의 별칭인 poteto로 1인칭으로 쓰였으며 라이선스를 MIT로 적는다. 목표는 코드를 적게 쓰되 품질을 높이는 것이다.

하네스 관점에서 보면 [[BMad-Method|BMad Method]]처럼 역할과 산출물을 정한 기성 워크플로우라기보다, 작업 유형별 playbook과 짧은 원칙 skill을 모아 둔 도구 상자에 가깝다. 자율 실행 playbook도 있어, `autopilot-stack`은 PR을 만들고 검증한 뒤 사람이 리뷰하고 머지하도록 넘기고 `autopilot-full`은 PR마다 담당을 하나씩 두고 머지까지 진행한다. 사람이 리뷰를 덜 하는 흐름에서 쓸 수 있는 도구 중 하나가 프로젝트에 맞춘 검증 skill이다.

## 구성 (2026-11-18 저장소 기준)

- **진입점**: `/poteto-mode`가 작업에 맞는 playbook을 고르고 다른 skill로 일을 보낸다. README는 playbook 22개와 원칙 skill 24개, 서브에이전트 `poteto-agent`와 `comment-sicko`를 둔다고 적는다. `pstack/skills` 폴더에는 일반 skill 34개와 `principle-` 접두사의 원칙 skill 24개가 있다. 개수는 저장소 갱신에 따라 바뀌므로 다시 확인한다.
- **설치**: Cursor는 `/add-plugin pstack`, Claude Code는 `/plugin marketplace add cursor/plugins` 뒤 `/plugin install pstack@cursor-plugins`다. Claude Code에서는 명령에 접두사가 붙어 `/pstack:poteto-mode`가 되고, 제3자 마켓플레이스는 자동 업데이트가 기본으로 꺼져 있어 `/plugin`의 마켓플레이스 탭에서 켜거나 `claude plugin update pstack@cursor-plugins`로 직접 갱신한다. Cursor 전용 단계는 Claude Code에서 건너뛴다.
- **모델 배정**: 2026-11-16 README 변경 뒤 기본값은 코드 작성 위임(feature, refactoring, bug fix, perf, hillclimb)과 글, 판단을 Opus 5.5의 xhigh에 맡기고 어떤 역할도 xhigh를 넘기지 않는 것이다(그 전에는 코드 작성 위임이 Grok 계열이었다). 리뷰 패널 밖에서 Fable 5.2는 이름으로 지정하거나 같은 지시의 Opus 5.5 실행이 두 번 실패했을 때만 쓰고, 기본 리뷰 패널은 Fable 5.2, Opus 5.5, Gemini 4 Carbon이다. `setup-pstack`이 역할별 모델을 바꾸고 그 선택을 규칙 파일로 쓴다.
- **자동 호출 차단**: `poteto-mode`, `in-your-own-words`, 검증 skill과 `correct`를 포함한 대부분의 skill은 프론트매터에 `disable-model-invocation: true`가 있어 모델이 skill 도구로 스스로 부르지 않는다. 다만 `poteto-mode`가 활성화되면 형제 skill의 SKILL.md를 읽어 따르는 방식으로 다른 skill에 일을 보낸다. 플래그는 자동 호출만 막고 실행 자체를 막지는 않는다.

## 검증 skill을 프로젝트별로 만든다

pstack의 검증 skill은 범용 체크리스트가 아니라 그 앱을 사용자처럼 실제로 조작해 증거를 남기는 프로젝트 전용 skill이다. pstack은 이 skill을 만드는 skill과 유지하는 skill을 따로 둔다.

**create-verification-skill**은 저장소를 조사해 검증 skill을 생성한다. 경로는 Cursor 기준 `.cursor/skills/verify-<app>/`이고, Claude Code 어댑터 문서는 `.cursor/skills/`를 `.claude/skills/`로 대응시킨다.

1. 저장소를 인터뷰한다. 어떤 표면(웹, CLI 등)인지, 어떻게 실행하고 조작하는지, 어떤 증거를 남길지, 인스턴스를 격리할 수 있는지를 확인한다.
2. Launch, Doctor, Drive, Evidence, Cleanup, Helpers 절로 이뤄진 SKILL.md를 만든다. Drive 절에는 좌표나 탭 순서 대신 ARIA 레이블, data 속성, 프롬프트 문자열, 경로 같은 안정적인 손잡이를 쓴다.
3. 사용자에게 보이는 주요 기능 3~5개로 `features/` 지도를 시작한다. 기능 파일마다 사용자 관점에서 무엇이고 어떻게 도달하며, 하네스로 어떻게 조작하고 어떤 관찰 가능한 최종 상태가 동작을 증명하는지를 `Sub-features`, `How to get to it (user POV)`, `Driving it with <harness>`, `Gotchas` 네 절로 적는다. 시드 데이터에 전제 조건이 없어 실패하면 시나리오를 약하게 바꾸지 않고 그 이유를 `Gotchas`에 남긴다. 이 지도가 저장소의 검증 원천이므로 편한 진입점 하나만 조작한 증명은 지도에 다른 진입점이 있으면 불완전하다.
4. 생성한 skill을 한 번 끝까지 실행하고, 정리 단계 뒤에도 증거가 남는지 확인한다. 한 번도 실행하지 않은 skill은 초안이지 산출물이 아니라고 적는다.
5. 사용자에게 유지 루프(`maintain-verification-skill`)를 안내한다.

**maintain-verification-skill**은 기능이 바뀌어 검증 skill이 낡는 것을 막는다. 인덱스를 정리하고, 기능 파일마다 읽기 전용 서브에이전트로 소스와 대조한 뒤, 소스 대조가 깨끗해도 모든 기능을 실제로 조작해 보고 차이를 나눈다. 검증 skill 문서가 현재 기능과 어긋난 drift, 검증 도구의 공백, 제품 쪽 공백이 기본 분류다. 제품 회귀는 문서로 덮지 않고 보고하며, 실제로 조작해 볼 수 없는 기능은 구체적인 전제 조건을 적을 때만 `verified-unreachable`로 둔다. 결과는 `clean`(변경 없음), `changed`(증명된 수정만 담은 PR 하나), `blocked` 중 하나이며 제품 코드는 고치지 않고 검증 skill 폴더만 편집한다.

검증 skill이 체크리스트로만 남으면 기능이 바뀔 때마다 조용히 틀려진다. 생성과 유지를 분리하고 유지 단계에서도 실제 실행을 요구하는 이유다. 레이스와 상태 머신처럼 실행 테스트로 잡기 어려운 코드에는 형식 검증을 만드는 `create-formal-verification-skill`과 TLA+ 모델을 검사해 Mermaid 상태도로 그리는 `statechart`를 따로 둔다.

### 검증 수단이 병렬화의 전제다

아래는 pstack 작성자가 공개 세션(2026-08)에서 설명한 운영 경험이며, 생산성 수치는 측정 조건 없이 제시돼 옮기지 않는다.

- **사람이 검증자이면 병목이 된다.** 에이전트가 앱을 직접 실행하고 조작하지 못하면 사람이 앱을 띄워 확인하고 스크린샷과 콘솔 오류를 옮겨 준다. 이 상태에서는 에이전트를 여러 개 띄워도 병렬로 진행되지 않는다. 검증 skill은 좋은 설계를 보장하지 않지만 적어도 조작한 경로에서 코드가 동작하는지는 에이전트가 확인하게 해 준다. 성능 문제라면 같은 조작 경로에서 CPU 트레이스나 힙 스냅샷을 뜨고, 그 분석은 `trace forensics` playbook이 맡는다.
- **기능 지도는 모호한 보고의 색인이다.** 앱을 띄울 수 있어도 기능의 위치와 도달 경로를 모르면 에이전트는 사이드바가 느리다는 보고를 받고도 코드를 뒤지며 헤맨다. 지도가 있으면 물음표만 붙은 스크린샷 같은 보고도 기능과 재현 경로로 옮길 수 있다.
- **로컬에서 만들고 신뢰가 쌓인 뒤 넓힌다.** 검증 skill은 에이전트가 앱을 조작하는 모습을 로컬에서 지켜보며 다듬는다. 믿을 수 있게 된 뒤에는 같은 skill을 클라우드 에이전트와 자동화가 쓴다. 세션의 사례에서는 들어온 버그 보고를 클라우드 환경의 에이전트가 같은 skill로 재현하고 main에서 이미 고쳐졌는지까지 확인해 돌려줬다. 결과를 믿을 근거 없이 많은 클라우드 에이전트부터 띄우면 토큰만 쓴다. 권한과 자율을 넓히는 일반 순서는 [[Agent-Loop-Engineering|루프 엔지니어링]]의 위임 사다리를 따른다.
- **경보가 같은 skill을 부른다:** 같은 작성자는 이후 대담(2026-11-14 공개)에서 이 순서의 다음 단계를 설명했다. 에이전트가 직접 실행하고 확인하는 작은 루프가 믿을 만해지면, 지표가 임계값 아래로 떨어질 때 울리는 경보가 에이전트를 실행하고 에이전트는 작은 루프에 준 skill로 문제를 재현하고 고친다. 사람의 일은 에이전트 하나하나를 지켜보는 데서 여러 에이전트를 조율하는 쪽으로 옮겨 간다. 사내에서는 pstack 사내판을 저장소에 설치해 구성원 모두와 봇이 띄운 클라우드 에이전트가 같은 skill을 쓴다고 했다(자기 보고). 팀 채팅의 봇이 이 바깥 루프를 맡는 구성은 [[AI-Coworker-Bots|AI 동료 봇]]을 본다.

## 반복 실수를 강제 층으로 내린다

**correct**는 모든 기여자를 연 파일만 보고 가장 가까운 예시를 베끼며 컴파일되는 가장 짧은 길을 고르는 에이전트로 가정하고, 한 파일에서 옳아 보이는 변경이 저장소 전체에서도 옳도록 설계하라고 한다. 같은 종류의 실수가 두 번 나오면 하나의 실수 유형으로 보고, 다시 일어나지 못하게 고친다. 고치는 자리는 높은 층부터 고른다. 아키텍처로 불가능하게 만들 수 있으면 그렇게 하고, 안 되면 타입(잘못된 코드가 컴파일되면 린트나 CI 검사로 보완), 테스트 순으로 내려가며 문서나 에이전트 규칙은 마지막이다. 새로 넣은 검사는 과거의 실제 실수에서 실패하는지 보여야 하고, 에이전트 지침 파일에 규칙과 그 규칙을 강제하는 장치를 짝지은 표를 유지한다.

이는 [[Harness-Gate-Placement|게이트 배치]]의 요청 층과 강제 층 구분, [[AI-Native-System|AI 네이티브 시스템]]의 실수를 시스템으로 흡수하는 루프와 같은 방향이다. 문서에 규칙을 더하는 것을 가장 약한 수단으로 두는 점이 핵심이다. 코드베이스 설계로 옮긴 원칙은 [[AI-Native-System#가장 짧은 경로를 올바른 경로로 만든다|가장 짧은 경로를 올바른 경로로 만든다]]를 본다.

**no-comments**는 리뷰 전에 읽기 전용 리뷰어 `comment-sicko`를 띄워 주석을 걷어 낸다. 지우지 말 것이나 문구를 바꾸지 말 것처럼 제약을 주장하는 주석은 승인을 받은 뒤 타입, 런타임 검사, 테스트나 CI 린트 중 가장 싼 수단으로 옮기고 주석을 지운다. 바꿀 수 없는 대상에 관한 주석만 그 증거가 있을 때 남는다. 리뷰 대화의 지적이 영구 규칙처럼 주석으로 쌓이는 에이전트의 습관을 겨냥한 장치로 읽을 수 있다(이 문서의 해석).

## 의도 확인과 무인 실행 뒤의 따라잡기

- **in-your-own-words**: 작업 전에 사용자의 목표와 풀려는 문제를 에이전트의 말로 다시 설명하게 한다. 지시를 잘못 이해한 채 오래 달리는 실패를 시작 전에 드러내는 장치다. `poteto-mode`도 첫 규칙으로 목표 재진술을 둔다.
- **ketchup**: 마지막 메시지 이후 대화에서 무엇이 바뀌었는지 요약한다. 영상으로 만드는 `ketchup-video`도 있다.
- **show-me-your-work**: 결정을 커밋할 수 있는 TSV로 기록해 검토 가능한 결정 이력을 남긴다. `poteto-mode`는 긴 자율 실행에 이를 쓰도록 안내한다.
- **interrogate**: 여러 모델이 diff를 깨뜨리려 시도하고 증명된 지적만 남긴다. 같은 모델의 자기 리뷰를 줄이는 방향은 [[Independent-Agent-Code-Review|독립 에이전트 코드 리뷰]]를 본다. 작성자는 제품 의도를 모르는 리뷰어가 과적합할 수 있다며 리뷰 skill의 비중을 줄이고 투자를 코드베이스와 정적 분석으로 옮겼다고 밝혔다([[Independent-Agent-Code-Review#리뷰 깊이는 토큰 예산과 제품 의도로 정한다|리뷰 깊이와 토큰 예산]]).
- **reflect**: 긴 작업의 절차를 skill 수정으로 남긴다. `automate-me`는 사용자의 대화 기록에서 자기만의 `-mode` skill 초안을 만든다.

## skill 변경은 눈가림 평가로 확인한다

pstack의 skill은 작성자가 에이전트의 도구 호출과 추론 기록에서 찾은 반복 실패마다 하나씩 만든 것이다(공개 세션의 설명). 관련 코드를 읽지 않고 원인을 단정하는 실패에 조사 절차를 붙이는 식이다. 고친 skill이 의도대로 행동을 바꾸는지는 `eval` playbook으로 확인한다.

- **후보에게 평가임을 숨긴다**: 후보가 보는 디렉터리, 파일과 프롬프트에 eval, test, judge, rubric, score, benchmark 같은 단어를 쓰지 않고 사용자가 고를 법한 프로젝트 이름을 쓴다. 프롬프트는 실제 사용자 요청처럼 목표만 말하고, 후보는 다른 후보가 있는지 모른다.
- **루브릭은 판정자만 본다**: 조정자가 3~6개의 구체적인 기준을 쓴다. 후보는 서로 다른 모델로 병렬 실행하고, 판정자는 다른 모델 계열 하나로 두어 모델 이름 없이 익명 라벨로 결과를 본다. 두 변형을 비교하면 한 판정자가 두 묶음을 어느 쪽인지 모른 채 한 번에 같은 척도로 채점한다.
- **자기 보고를 믿지 않는다**: 후보가 skill을 따랐는지는 실행 기록에서 실제로 연 파일과 코드의 모양으로 판정한다. 조정자도 모든 결과를 직접 읽고, 판정자와 의견이 갈리면 모델의 편향이나 루브릭의 모호함으로 본다.

이름을 감춰도 평가 인식이 사라졌다고 볼 수는 없다([[LLM-Eval-Strategy#평가 인식과 운영 환경의 차이|평가 인식]]). 작성자는 점수가 만점이 될 때까지 반복해 skill을 다듬는 방식도 소개했지만 playbook에는 반복 절차가 없고, 점수 상승이 품질 향상을 보장하지 않는다는 점은 [[Agent-Loop-Engineering#점수가 오른다고 결과가 좋아지지는 않는다|루프 엔지니어링]]을 본다.

## 트레이드오프

- **장점**: 검증 절차가 앱마다 맞춰지고 증거(스크린샷, 터미널 기록, 응답 본문, 로그, 종료 코드, DB 상태)가 남아 나중에 확인할 수 있다. 반복 실수를 강제 장치로 바꾸는 절차가 명시돼 있다.
- **한계**: 대부분의 skill은 지시라 요청 층이다. 검증 skill을 실행했는지, 모든 기능을 돌렸는지는 모델이 따르는 절차에 기대므로, 반드시 지켜야 하는 검사는 훅이나 CI에 둔다. 검증 skill이 다루는 기능 지도 밖의 회귀는 잡지 못한다.
- **조직 조건**: 사람 리뷰 없이 머지하는 흐름을 들이려면 외부 모델 사용, 코드 반출과 승인 정책이 이를 허용하는지부터 확인한다. 이 흐름을 들여올 때는 [[Agent-Test-Verification-Behavior|에이전트 검증 행동]]의 한계와 [[AI-Slop-Quality-Gate|AI 슬롭 품질 게이트]]의 사람 이해 요구를 함께 본다.
- **변동성**: skill 목록과 개수, 기본 모델 배정은 저장소 갱신에 따라 바뀐다. 다른 에이전트용으로 옮긴 비공식 사본도 있으므로(예: Claude Code, Codex 등으로 옮겼다고 밝힌 `michael-denyer/pstack-claude`, 2026-11-15 확인) 공식 저장소에서 설치한다.

## 면접 체크포인트

- 사람이 리뷰하지 않을 때 무엇이 품질을 보증하는가, 범용 체크리스트와 앱 전용 검증 skill의 차이
- 검증 skill이 낡는 것을 어떻게 알아내고, drift와 제품 버그를 어떻게 구분하는가
- 반복 실수를 문서가 아니라 아키텍처, 타입, 린트, 테스트로 막는 순서와 그 이유
- 무인 실행 전에 의도를 재진술하게 하는 장치가 줄이는 실패
- 검증 수단이 없을 때 병렬 실행이 막히는 이유, skill 변경을 눈가림 평가할 때 숨길 것과 실행 기록으로 판정할 것

## 출처

- [pstack README — GitHub, cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack)
- [pstack poteto-mode SKILL.md — GitHub, cursor/plugins](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md)
- [pstack in-your-own-words SKILL.md — GitHub, cursor/plugins](https://github.com/cursor/plugins/blob/main/pstack/skills/in-your-own-words/SKILL.md)
- [pstack create-verification-skill SKILL.md — GitHub, cursor/plugins](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md)
- [pstack maintain-verification-skill SKILL.md — GitHub, cursor/plugins](https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md)
- [pstack correct SKILL.md — GitHub, cursor/plugins](https://github.com/cursor/plugins/blob/main/pstack/skills/correct/SKILL.md)
- [pstack Claude Code harness adapter — GitHub, cursor/plugins](https://github.com/cursor/plugins/blob/main/pstack/docs/harness/claude-code.md)
- [pstack eval playbook — GitHub, cursor/plugins](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/eval.md) — 2026-11-18 눈가림 규칙, 루브릭과 판정자 배치, 실행 기록 판정 확인
- [pstack no-comments SKILL.md — GitHub, cursor/plugins](https://github.com/cursor/plugins/blob/main/pstack/skills/no-comments/SKILL.md) — 2026-11-18 주석 정리와 제약 주석의 강제 수단 이전 확인
- [SpaceX AI engineer, Lauren Tan — YouTube, Ai insider](https://www.youtube.com/watch?v=I_oMJk6barY) — 2026-09-26 재게시, 음성 전사 기준. 원 세션은 [How Cursor Turned AI Agents Into Better Engineers — Maven Lightning Lesson](https://maven.com/p/e23d9c/how-cursor-turned-ai-agents-into-better-engineers)(2026-08-12, Zoom)로 보인다(날짜, 진행자와 질의응답 형식이 일치한다는 추론). 설명란의 에이전트 사용률과 에이전트 팀 구성 주장은 음성에 없어 반영하지 않았다
- [The Rise Of AI Coworkers — YouTube, Y Combinator](https://www.youtube.com/watch?v=y1-9yeYLJUo) — 2026-11-14 공개 Lightcone 대담, 2026-11-25 재게시본(머니 래빗홀, gP1ELwJA97k)의 사람이 단 영어 자막 기준. 경보로 시작하는 바깥 루프, 저장소에 설치한 사내판, 리뷰 skill 비중 축소는 작성자의 자기 보고

## 관련 문서

- [[BMad-Method|BMad Method (역할별 기성 워크플로우)]]
- [[Harness-Gate-Placement|게이트 배치 (요청 층과 강제 층)]]
- [[AI-Native-System|AI 네이티브 시스템 (실수를 시스템으로 흡수하는 루프)]]
- [[Agent-Skills|에이전트 skill]]
- [[Independent-Agent-Code-Review|독립 에이전트 코드 리뷰]]
- [[Agent-Test-Verification-Behavior|에이전트 검증 행동]]
- [[LLM-Eval-Strategy|LLM 평가 전략 (평가 인식과 운영 환경의 차이)]]
- [[Agent-Loop-Engineering|루프 엔지니어링 (위임 사다리, 점수와 품질의 어긋남)]]
