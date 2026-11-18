---
tags: [ai, harness, agent, skills, pull-request, ci, code-review]
status: done
verified_at: 2026-11-19
category: "AI엔지니어링(AIEngineering)"
aliases: ["tstack", "티스택", "PR 배송 skill 묶음"]
---

# tstack

tstack은 코드를 쓴 뒤의 일, 즉 변경 증명, 리뷰, PR 작성, CI와 리뷰 봇 감시, 병합을 코딩 에이전트에게 맡기는 skill 9개 묶음이다. 공개 저장소 `t3dotgg/tstack`에 있고 라이선스는 MIT다. README는 Claude Code와 Codex에서 동작하며, 일부 skill은 T3 Code의 기능이 있으면 쓰고 없으면 각 에이전트의 기본 도구로 대체한다고 적는다.

코드를 더 잘 쓰게 하는 skill 묶음과 달리, 구현이 끝난 뒤 사람에게 되돌아오던 반복 작업을 겨냥한다. 같은 하네스 영역의 [[Pstack|pstack]]이 작업 유형별 playbook과 프로젝트 전용 검증 skill에 무게를 둔다면, tstack은 PR 하나를 병합 가능한 상태까지 끌고 가는 흐름에 집중한다.

## 구성 (2026-11-19 저장소 기준)

| skill | README가 적은 역할 |
|---|---|
| `full-send` | 변경을 증명하고 리뷰받아 PR을 열고 감시한 뒤 병합까지 한다 |
| `full-stop` | `full-send`와 같지만 사람이 병합할 수 있는 상태에서 멈춘다 |
| `council` | 서로 다른 세 제공사의 모델에게 리뷰를 받고 모두 동의할 때까지 반복한다 |
| `sol-loop` | OpenAI의 GPT Sol로 두 에이전트가 동의할 때까지 리뷰를 반복한다 |
| `file-pr` | 바뀐 파일 목록이 아니라 문제부터 설명하는 짧은 PR을 쓴다 |
| `babysit-pr` | CI와 리뷰 봇을 지켜보다 실제 지적만 고친다 |
| `takeover` | 다른 사람이나 에이전트가 끝내지 못한 PR을 이어받고 원작자 기여를 유지한다 |
| `modernize` | 오래된 PR을 리베이스하고 아직 필요한 변경인지 판단한다 |
| `leaving-pr-comments` | 에이전트가 사용자 대신 남기는 댓글의 형식을 맞춘다(자동 적용) |

- **의존 관계:** `full-stop`은 `full-send`를, `full-send`는 `sol-loop`, `file-pr`, `babysit-pr`를 부른다. `takeover`는 `modernize`, `file-pr`, `babysit-pr`, `leaving-pr-comments`를 쓰고, `file-pr`, `babysit-pr`, `modernize`는 `leaving-pr-comments`를 쓴다. 의존이 있는 skill만 복사하면 호출 대상이 없어 흐름이 끊긴다.
- **설치:** 저장소를 클론해 `skills/` 아래 폴더를 Claude Code는 `~/.claude/skills/`, Codex는 `~/.codex/skills/`에 복사한다. 인증된 GitHub CLI(`gh`)와 `babysit-pr`의 대기 스크립트 `pr-wait`를 돌릴 `python3`가 필요하다.
- **다른 제공사 모델:** `council`과 `sol-loop`는 다른 제공사 모델을 서브에이전트로 띄울 수 있는 하네스가 있어야 한다. 닿을 경로가 없으면 다른 모델로 바꾸지 않고 막힌 사실을 보고한다. `full-send`의 리뷰 단계가 `sol-loop`이므로 이 경로가 없으면 `full-send`와 `full-stop`도 리뷰 단계에서 멈춘다.
- **사용자 설정 위치:** 위원 모델 같은 개인 설정은 `CLAUDE.md`나 `AGENTS.md`에 두라고 한다. skill 파일을 고치지 않아야 저장소 갱신을 받아도 설정이 남는다. README는 skill을 출발점으로 보고 각자 고쳐 쓰라고 적는다.

## full-stop은 병합 결정을 사람에게 남긴다

`full-send`와 `full-stop`의 차이는 하는 일이 아니라 마지막 결정을 누가 하느냐다. `full-send`의 목표는 병합된 PR이고, `full-stop`은 같은 과정을 거쳐 병합 직전에 사람에게 넘긴다. `full-send`는 병합 관문을 통과하면 병합하고, 자기 PR 브랜치에 `--force-with-lease`로 강제 푸시하며, 증명에 필요한 테스트 수단을 묻지 않고 쓸 권한을 받는다.

`full-send`의 순서는 가장 작은 수정으로 변경을 끝내고, 증명하고, `sol-loop`로 리뷰받고, 리베이스해 `file-pr`로 PR을 열고(어떻게 증명했는지 한 줄 포함), `babysit-pr`로 감시하고, 병합한 뒤 PR 링크, 병합 커밋, 증명과 결정을 보고하는 것이다.

**증명은 이번 세션에서 직접 관찰한 증거다.** 직접적인 방법부터 쓴다.

1. 실패를 재현하고, 고친 뒤 같은 재현이 통과하는지 본다.
2. 저장소의 CI 검사(타입 검사, 린트, 테스트)를 돌린다.
3. 테스트가 없고 테스트 환경이 있으면 수정 전에는 실패하는 테스트를 하나 더한다.
4. UI나 런타임 변경은 앱을 실행해 본다. 목을 쓴 테스트 통과가 사용자 경험의 동작을 증명하지 않는다는 이유다.
5. 증명할 수 없으면 사용자에게 묻는다.

**병합 관문**은 최신 커밋에서 다음이 모두 참일 때다. 증명이 diff 전체를 덮는다. 필수 검사가 통과했다. 리뷰 봇이 끝났고 지적마다 고쳤거나 이유를 적어 닫았다. 변경을 요구하는 사람 리뷰가 남아 있지 않다. 브랜치가 최신이고 GitHub가 병합 가능하다고 본다. 병합은 저장소가 정한 방식을 쓰고 `--admin` 같은 우회를 쓰지 않는다.

`full-send`도 사용자에게 묻는 경우가 있다. 변경을 증명할 수 없을 때, 병합 관문을 스스로 통과시킬 수 없을 때, 목표가 결과를 바꿀 만큼 모호할 때, 다른 PR 때문에 이 PR이 필요 없어졌을 때, 그리고 데이터 삭제, 운영 환경 변경, 저장소 밖 변경, PR 닫기, 자기 PR 브랜치가 아닌 브랜치의 강제 푸시 전이다. 답이 없으면 PR을 열어 둔 채 병합하지 않는다. 테스트 실행 허가가 하네스나 시스템의 승인 프롬프트를 건너뛰게 하지도 않는다.

## CI와 리뷰 봇 감시

`babysit-pr`는 PR마다 감시자를 하나만 둔다. 직접 폴링 루프나 `sleep` 루프를 만들지 말고 `pr-wait`(T3 Code에서는 자체 감시 도구)만 쓰라고 한다.

- **대기 조건:** `pr-wait <pr> --until ready|green|any-change`. 기본값 `ready`는 필수 검사 통과, Greptile이나 Macroscope의 최신 커밋 리뷰, 미해결 스레드 없음이다. 두 봇은 스크립트에 고정돼 있어(2026-11-19 기준) 둘 다 없는 저장소는 필수 검사만 보는 `--until green`을 쓴다. CodeRabbit은 참고용이라 기다리지 않는다.
- **종료 코드:** 0은 조건 충족이나 병합, 1은 에이전트가 조치해야 조건을 채울 수 있는 상태(필수 검사 실패, 충돌, 미해결 스레드, PR 닫힘)이며 처리한 뒤 감시자를 다시 띄운다. 2는 잘못된 입력, 모르는 PR, 이미 같은 PR을 감시하는 `pr-wait`가 있는 경우로, 감시자 하나 원칙을 이 코드가 강제한다.
- **지적 처리:** 마지막 푸시 이후의 검사와 댓글만 본다. 봇의 지적은 코드를 바꾸기 전에 소스와 대조하고, 오탐은 이유를 적어 닫는다. 저장소 실패와 인프라 일시 오류를 구분한다. 범위를 넓히는 수정(꼭 필요하지 않은 테스트, 사소한 경계 조건 방어)은 이유를 적고 후속 작업으로 남긴다.
- **소음 줄이기:** 조치가 필요 없는 이벤트에는 메시지를 남기지 않는다. 같은 GitHub 계정의 감시자는 API 사용 한도를 함께 쓰므로 감시자를 늘리지 않는다.

에이전트가 기다리는 방식을 스크립트로 고정해 둔 점이 핵심이다. 대기 루프를 모델이 매번 만들면 한도를 낭비하거나 같은 PR에 감시자가 겹친다.

## 다중 모델 리뷰: council

`council`은 세 제공사에서 하나씩 강한 모델을 높은 추론 노력으로 골라 읽기 전용으로 리뷰하게 한다. 사용자가 위원을 지정하면 그 모델을, 아니면 각 제공사의 최신 대표 모델을 쓴다. 세 제공사에 닿지 못하거나 지정한 위원을 쓸 수 없으면 다른 모델로 바꾸지 않고 그 사실을 보고한다.

- 위원마다 10점 만점 점수를 받고, 고친 뒤의 새 리뷰는 다음 라운드로 센다. 모든 위원이 만족할 때까지 반복하며 라운드 상한을 두지 않는다. 반면 `sol-loop`는 기본 3라운드(최대 5라운드)의 예산을 두고, 예산이 끝난 것을 승인으로 보지 않는다.
- 결과는 도착하는 대로 코드와 대조하지만, 위원이 같은 체크아웃을 리뷰하는 동안에는 편집하지 않는다.
- 범위를 좁게 지키는 것이 조정자의 일이라고 명시한다.
- PR이 있으면 본문에 라운드별, 위원별 점수 표를 남기고, 받지 못한 점수는 지어내지 않고 `no score`로 적는다.

세 모델이 동의했다고 맞다는 보장은 없다. 서로 다른 모델이 서로 다른 결함을 잡을 가능성을 사는 장치이며, 같은 모델의 자기 리뷰 한계는 [[Independent-Agent-Code-Review|독립 에이전트 코드 리뷰]]를 본다.

## 트레이드오프

- **장점:** PR 설명이 바뀐 파일 목록이 아니라 문제와 증명부터 시작한다(소개 영상은 이 점이 PR을 이해하기 쉽게 만든다고 평가했다). 증명, 병합 관문, 감시 방식이 문장으로 명시돼 있어 각 저장소에 맞게 고치기 쉽다.
- **한계:** 모두 에이전트에게 주는 지시라 요청 층이다. 자동 병합을 맡기려면 별도로 브랜치 보호, 필수 검사, 권한 제한을 강제 층에 둔다([[Harness-Gate-Placement|게이트 배치]]). 테스트가 부실하면 증명 단계도 약해진다.
- **도입 순서(적용 제안):** 처음부터 `full-send`를 쓰지 않고 `file-pr`과 `babysit-pr`부터 저장소에 맞춘다. 다른 제공사 모델 연결이 갖춰지면 `full-stop`으로 병합 결정을 사람에게 남기고, 신뢰가 쌓인 뒤 위험이 낮은 변경에만 `full-send`를 검토한다. 권한을 넓히는 일반 순서는 [[Agent-Loop-Engineering|루프 엔지니어링]]의 위임 사다리를 따른다.
- **비용:** 리뷰 반복과 다중 모델 호출은 토큰과 시간을 쓴다. 작은 변경마다 전체 흐름을 돌릴 필요는 없다.
- **변동성:** 저장소는 2026-10-24 첫 커밋 뒤 2026-11-11까지 커밋 6개이고 릴리스나 버전 표기가 없다. skill 내용과 기본 모델은 바뀔 수 있으므로 설치 전에 다시 확인한다.

## 면접 체크포인트

- 에이전트가 변경이 동작한다고 말할 때 무엇을 증거로 요구하는가, 목을 쓴 테스트 통과가 부족한 경우
- 자동 병합 흐름에서 사람에게 남길 결정과 강제 층에 둘 통제
- CI 대기를 에이전트가 직접 폴링하게 둘 때의 문제
- 다중 모델 리뷰의 합의가 정확성을 보장하지 않는 이유

## 출처

- [tstack README — GitHub, t3dotgg/tstack](https://github.com/t3dotgg/tstack)
- [tstack full-send SKILL.md — GitHub, t3dotgg/tstack](https://github.com/t3dotgg/tstack/blob/main/skills/full-send/SKILL.md)
- [tstack council SKILL.md — GitHub, t3dotgg/tstack](https://github.com/t3dotgg/tstack/blob/main/skills/council/SKILL.md)
- [tstack babysit-pr SKILL.md — GitHub, t3dotgg/tstack](https://github.com/t3dotgg/tstack/blob/main/skills/babysit-pr/SKILL.md) — 2026-11-19 대조, `pr-wait` 사용법과 종료 코드
- [tstack sol-loop SKILL.md — GitHub, t3dotgg/tstack](https://github.com/t3dotgg/tstack/blob/main/skills/sol-loop/SKILL.md) — 2026-11-19 대조, 모델 대체 금지와 라운드 예산
- [Claude Code Writes the Code... Theo's Skills Ship It — YouTube, Better Stack](https://www.youtube.com/watch?v=GGrvSnpPTGo) — 2026-11-12 소개 영상, 음성 전사 기준. 도입 순서 제안의 계기

## 관련 문서

- [[Pstack|pstack]]
- [[Agent-Skills|에이전트 skill]]
- [[Independent-Agent-Code-Review|독립 에이전트 코드 리뷰]]
- [[Code-Review-AI-Agent-Operations|에이전트 시대 코드 리뷰 운영]]
- [[Harness-Gate-Placement|게이트 배치 (요청 층과 강제 층)]]
- [[Agent-Loop-Engineering|루프 엔지니어링]]
