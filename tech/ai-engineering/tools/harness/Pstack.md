---
tags: [ai, harness, agent, skills, verification]
status: done
verified_at: 2026-11-15
category: "AI엔지니어링(AIEngineering)"
aliases: ["pstack", "poteto mode", "피스택"]
---

# pstack

pstack은 코딩 에이전트에게 계획, 구현, 검증과 기록의 습관을 skill 묶음으로 넣는 오픈소스 플러그인이다. Cursor의 공개 플러그인 저장소(`cursor/plugins`)에 있고, README는 작성자의 별칭인 poteto로 1인칭으로 쓰였으며 라이선스를 MIT로 적는다. 목표는 코드를 적게 쓰되 품질을 높이는 것이다.

하네스 관점에서 보면 [[BMad-Method|BMad Method]]처럼 역할과 산출물을 정한 기성 워크플로우라기보다, 작업 유형별 playbook과 짧은 원칙 skill을 모아 둔 도구 상자에 가깝다. 자율 실행 playbook도 있어, `autopilot-stack`은 PR을 만들고 검증한 뒤 사람이 리뷰하고 머지하도록 넘기고 `autopilot-full`은 PR마다 담당을 하나씩 두고 머지까지 진행한다. 사람이 리뷰를 덜 하는 흐름에서 쓸 수 있는 도구 중 하나가 프로젝트에 맞춘 검증 skill이다.

## 구성 (2026-11-15 저장소 기준)

- **진입점**: `/poteto-mode`가 작업에 맞는 playbook을 고르고 다른 skill로 일을 보낸다. README는 playbook 23개와 원칙 skill 24개, 서브에이전트 `poteto-agent`와 `comment-sicko`를 둔다고 적는다. `pstack/skills` 폴더에는 일반 skill 34개와 `principle-` 접두사의 원칙 skill 24개가 있다. 개수는 저장소 갱신에 따라 바뀌므로 다시 확인한다.
- **설치**: Cursor는 `/add-plugin pstack`, Claude Code는 `/plugin marketplace add cursor/plugins` 뒤 `/plugin install pstack@cursor-plugins`다. Claude Code에서는 명령에 접두사가 붙어 `/pstack:poteto-mode`가 되고, 제3자 마켓플레이스는 자동 업데이트가 기본으로 꺼져 있어 `/plugin`의 마켓플레이스 탭에서 켜거나 `claude plugin update pstack@cursor-plugins`로 직접 갱신한다. Cursor 전용 단계는 Claude Code에서 건너뛴다.
- **모델 배정**: README의 기본값은 코드 작성 위임을 Grok 계열에, 가장 어려운 변경과 글, 판단을 Opus 5.5에 맡기는 것이다. `setup-pstack`이 역할별 모델을 바꾸고 그 선택을 규칙 파일로 쓴다.
- **자동 호출 차단**: `poteto-mode`, `in-your-own-words`, 검증 skill과 `correct`를 포함한 대부분의 skill은 프론트매터에 `disable-model-invocation: true`가 있어 모델이 skill 도구로 스스로 부르지 않는다. 다만 `poteto-mode`가 활성화되면 형제 skill의 SKILL.md를 읽어 따르는 방식으로 다른 skill에 일을 보낸다. 플래그는 자동 호출만 막고 실행 자체를 막지는 않는다.

## 검증 skill을 프로젝트별로 만든다

pstack의 검증 skill은 범용 체크리스트가 아니라 그 앱을 사용자처럼 실제로 조작해 증거를 남기는 프로젝트 전용 skill이다. pstack은 이 skill을 만드는 skill과 유지하는 skill을 따로 둔다.

**create-verification-skill**은 저장소를 조사해 검증 skill을 생성한다. 경로는 Cursor 기준 `.cursor/skills/verify-<app>/`이고, Claude Code 어댑터 문서는 `.cursor/skills/`를 `.claude/skills/`로 대응시킨다.

1. 저장소를 인터뷰한다. 어떤 표면(웹, CLI 등)인지, 어떻게 실행하고 조작하는지, 어떤 증거를 남길지, 인스턴스를 격리할 수 있는지를 확인한다.
2. Launch, Doctor, Drive, Evidence, Cleanup, Helpers 절로 이뤄진 SKILL.md를 만든다.
3. 사용자에게 보이는 주요 기능 3~5개로 `features/` 지도를 시작한다.
4. 생성한 skill을 한 번 끝까지 실행하고, 정리 단계 뒤에도 증거가 남는지 확인한다. 한 번도 실행하지 않은 skill은 초안이지 산출물이 아니라고 적는다.
5. 사용자에게 유지 루프(`maintain-verification-skill`)를 안내한다.

**maintain-verification-skill**은 기능이 바뀌어 검증 skill이 낡는 것을 막는다. 인덱스를 정리하고, 기능 파일마다 읽기 전용 서브에이전트로 소스와 대조한 뒤, 소스 대조가 깨끗해도 모든 기능을 실제로 조작해 보고 차이를 나눈다. 검증 skill 문서가 현재 기능과 어긋난 drift, 검증 도구의 공백, 제품 쪽 공백이 기본 분류다. 제품 회귀는 문서로 덮지 않고 보고하며, 실제로 조작해 볼 수 없는 기능은 구체적인 전제 조건을 적을 때만 `verified-unreachable`로 둔다. 결과는 `clean`(변경 없음), `changed`(증명된 수정만 담은 PR 하나), `blocked` 중 하나이며 제품 코드는 고치지 않고 검증 skill 폴더만 편집한다.

검증 skill이 체크리스트로만 남으면 기능이 바뀔 때마다 조용히 틀려진다. 생성과 유지를 분리하고 유지 단계에서도 실제 실행을 요구하는 이유다. 레이스와 상태 머신처럼 실행 테스트로 잡기 어려운 코드에는 형식 검증을 만드는 `create-formal-verification-skill`과 TLA+ 모델을 검사해 Mermaid 상태도로 그리는 `statechart`를 따로 둔다.

## 반복 실수를 강제 층으로 내린다

**correct**는 같은 종류의 실수가 두 번 나오면 하나의 실수 유형으로 보고, 다시 일어나지 못하게 고친다. 고치는 자리는 높은 층부터 고른다. 아키텍처로 불가능하게 만들 수 있으면 그렇게 하고, 안 되면 타입(잘못된 코드가 컴파일되면 린트나 CI 검사로 보완), 테스트 순으로 내려가며 문서나 에이전트 규칙은 마지막이다. 새로 넣은 검사는 과거의 실제 실수에서 실패하는지 보여야 하고, 에이전트 지침 파일에 규칙과 그 규칙을 강제하는 장치를 짝지은 표를 유지한다.

이는 [[Harness-Gate-Placement|게이트 배치]]의 요청 층과 강제 층 구분, [[AI-Native-System|AI 네이티브 시스템]]의 실수를 시스템으로 흡수하는 루프와 같은 방향이다. 문서에 규칙을 더하는 것을 가장 약한 수단으로 두는 점이 핵심이다.

## 의도 확인과 무인 실행 뒤의 따라잡기

- **in-your-own-words**: 작업 전에 사용자의 목표와 풀려는 문제를 에이전트의 말로 다시 설명하게 한다. 지시를 잘못 이해한 채 오래 달리는 실패를 시작 전에 드러내는 장치다. `poteto-mode`도 첫 규칙으로 목표 재진술을 둔다.
- **ketchup**: 마지막 메시지 이후 대화에서 무엇이 바뀌었는지 요약한다. 영상으로 만드는 `ketchup-video`도 있다.
- **show-me-your-work**: 결정을 커밋할 수 있는 TSV로 기록해 검토 가능한 결정 이력을 남긴다. `poteto-mode`는 긴 자율 실행에 이를 쓰도록 안내한다.
- **interrogate**: 여러 모델이 diff를 깨뜨리려 시도하고 증명된 지적만 남긴다. 같은 모델의 자기 리뷰를 줄이는 방향은 [[Independent-Agent-Code-Review|독립 에이전트 코드 리뷰]]를 본다.
- **reflect**: 긴 작업의 절차를 skill 수정으로 남긴다. `automate-me`는 사용자의 대화 기록에서 자기만의 `-mode` skill 초안을 만든다.

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

## 출처

- [pstack README — GitHub, cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack)
- [pstack poteto-mode SKILL.md — GitHub, cursor/plugins](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md)
- [pstack in-your-own-words SKILL.md — GitHub, cursor/plugins](https://github.com/cursor/plugins/blob/main/pstack/skills/in-your-own-words/SKILL.md)
- [pstack create-verification-skill SKILL.md — GitHub, cursor/plugins](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md)
- [pstack maintain-verification-skill SKILL.md — GitHub, cursor/plugins](https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md)
- [pstack correct SKILL.md — GitHub, cursor/plugins](https://github.com/cursor/plugins/blob/main/pstack/skills/correct/SKILL.md)
- [pstack Claude Code harness adapter — GitHub, cursor/plugins](https://github.com/cursor/plugins/blob/main/pstack/docs/harness/claude-code.md)

## 관련 문서

- [[BMad-Method|BMad Method (역할별 기성 워크플로우)]]
- [[Harness-Gate-Placement|게이트 배치 (요청 층과 강제 층)]]
- [[AI-Native-System|AI 네이티브 시스템 (실수를 시스템으로 흡수하는 루프)]]
- [[Agent-Skills|에이전트 skill]]
- [[Independent-Agent-Code-Review|독립 에이전트 코드 리뷰]]
- [[Agent-Test-Verification-Behavior|에이전트 검증 행동]]
