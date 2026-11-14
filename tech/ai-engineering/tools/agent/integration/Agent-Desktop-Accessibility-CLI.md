---
tags: [ai, agent, computer-use, accessibility, desktop-automation, cli]
status: done
verified_at: 2026-11-14
category: "AI엔지니어링(AIEngineering)"
aliases: ["agent-desktop", "Agent Desktop", "접근성 트리 기반 데스크톱 조작", "Accessibility Tree Computer Use"]
---

# 접근성 트리 기반 데스크톱 조작: agent-desktop

에이전트가 데스크톱 앱을 조작하는 방법은 화면을 찍어 좌표를 고르는 방식과, 운영체제의 접근성 API로 버튼과 입력칸 같은 요소를 직접 다루는 방식으로 나뉜다. Vercel Labs의 agent-desktop은 후자를 CLI로 제공하는 도구다. 브라우저 밖 앱 조작의 권한과 승인 경계는 [[Agent-Browser-Task-Boundaries|브라우저 에이전트의 작업과 권한 경계]]에서 다룬다.

## 정의

agent-desktop은 앱의 접근성 트리를 읽어 JSON으로 돌려주고, 그 요소에 클릭이나 값 입력 같은 동작을 실행하는 Rust 도구다. CLI와 C 라이브러리(`libagent_desktop_ffi`)로 배포되며 라이선스는 Apache-2.0이다. 내부에 모델이 없고, 다음 동작은 호출한 에이전트의 루프가 정한다. 따라서 특정 에이전트 제품에 묶이지 않고 셸 명령을 실행할 수 있는 에이전트라면 붙일 수 있다. `agent-desktop mcp`로 각 명령을 stdio MCP 도구로도 노출한다(v1.2.0부터).

| OS | 요구 조건(README 기준) | 사용하는 접근성 API |
|---|---|---|
| macOS | 13 이상, Intel 또는 Apple Silicon | AX API |
| Windows | 10 1809 이상, x64 또는 ARM64 | UI Automation |
| Linux | Ubuntu 24.04 이상, x86_64 또는 aarch64, X11 또는 Wayland | AT-SPI |

## 동작 방식: snapshot과 ref

1. `snapshot --app <앱> -i`로 상호작용 가능한 요소의 트리를 받는다. 각 요소에는 `@<snapshot_id>:eN` 형태의 ref가 붙는다.
2. `click @<snapshot_id>:e8`처럼 ref로 동작을 실행한다.
3. 다시 snapshot을 찍어 결과를 확인한다.

ref는 그 snapshot 안에서만 유효하다. snapshot id가 없는 `@e8`은 `INVALID_ARGS`로 거부되고, UI가 바뀌어 요소가 사라지거나 여러 개와 맞으면 `STALE_REF`나 `AMBIGUOUS_TARGET`을 돌려준다. 추측해서 가장 비슷한 요소를 누르지 않고 실패로 닫는(fail-closed) 설계이므로, 에이전트는 오류를 받으면 snapshot을 다시 찍는다. 재시도는 오류의 `error.disposition.retry`가 `safe`일 때만 한다. 요소가 많은 앱은 `--skeleton`과 `--compact`로 개요를 먼저 받고 `--root @<ref>`로 특정 영역만 내려가 읽는다.

## 실제 마우스를 쓰지 않는 기본 모드

기본값은 headless다. ref 동작은 접근성 API로 실행해 포인터를 움직이지 않고 포커스도 가져가지 않는다. 사용자가 다른 앱으로 작업하는 동안 뒤에 깔린 창의 버튼을 누르는 동작은 계기 영상의 macOS 시연에서 보였으며, 문서는 백그라운드나 최소화 창의 동작을 따로 보장하지 않는다. 접근성 경로로 실행할 수 없는 동작은 실제 입력으로 몰래 바꾸지 않고 실패한다. 전역 `--headed` 옵션을 주면 실제 키보드와 마우스 입력을 허용하며, 이때는 대상 창에 포커스를 주고 커서를 쓴다.

플랫폼마다 접근성 API가 지원하는 쓰기 동작이 다르다. 예를 들어 Windows의 UI Automation에는 선택 위치에 문자를 끼워 넣는 쓰기가 없어 headless `type`이 실패하므로 `set-value`를 쓰거나 `--headed`로 실제 키 입력을 보낸다. 앱마다 접근성 트리의 품질도 다르므로 화면에는 보이는 요소가 트리에 없을 수 있다(이 문서의 해석).

## 여러 에이전트의 동시 실행

입력 장치는 컴퓨터 전체에 하나뿐이라, 동작을 보내는 순간에는 한 프로세스만 독점권(Interaction Lease)을 갖는다. `session start --cursor --multi-agent`로 세션을 열면 에이전트마다 화면 표시용 커서가 따로 생기고 커서는 동시에 움직이지만, 실제 동작은 차례로 실행된다. 세션마다 snapshot 이름 공간이 분리되어 한 세션의 id를 다른 세션에서 쓰지 못한다. 따라서 여러 에이전트가 동시에 일한다는 말은 대기와 판단이 겹친다는 뜻이며, 동작 자체가 병렬로 실행된다는 뜻은 아니다. v1.3.0은 호스트 데스크톱과 분리된 macOS VM에서 명령을 실행하는 `sandbox` 명령을 더했다.

## 설치와 권한

- 설치: `npm install -g agent-desktop`(Bun, Yarn, pnpm 가능) 또는 macOS와 Linux의 `brew install agent-desktop`. 에이전트용 스킬은 `npx skills add https://github.com/vercel-labs/agent-desktop --skill agent-desktop`으로 더하고, 바이너리가 `agent-desktop skills get desktop`으로 사용 안내를 출력하기도 한다.
- macOS: `agent-desktop permissions --guide`가 손쉬운 사용(Accessibility) 권한 부여를 안내하고, `agent-desktop status`가 권한과 지원 범위를 보여 준다. 스크린샷 기능에 화면 기록 권한이 필요한지는 확인하지 못했다.

## 보안과 운영 체크포인트

- snapshot, 클립보드 읽기, 스크린샷, 명령 출력과 디버그 산출물에는 데스크톱의 개인 정보가 담길 수 있어 공개 로그와 업로드에 넣지 않는다. 에이전트가 이 출력을 모델 공급자에게 보낸다는 점을 전제로 조작할 앱을 정한다(이 문서의 해석).
- 비밀 값은 `type`, `set-value`, `clipboard-set`의 `--stdin`으로 넘겨 프로세스 인자에 남기지 않는다. batch JSON의 텍스트는 프로세스 인자에 나타나므로 비밀 단계는 별도 명령으로 실행한다.
- OS가 암호 필드로 표시한 칸의 값은 출력하지 않는다. 기본 모드는 이벤트 JSONL만 기록하지만, `session start --screenshots`로 켠 재생 산출물(동작 전후 PNG)은 가리지 않은 채 남고 HTML 내보내기에 들어갈 수 있다.
- 접근성 권한은 다른 앱의 내용을 읽고 조작하는 강한 권한이다. 상시 실행하는 에이전트에 줄 때는 [[Agent-Execution-Isolation|에이전트 실행 격리]]처럼 대상 앱, 계정과 네트워크 범위를 함께 제한한다(이 문서의 제안).
- 1.0 출시(2026-10-28) 뒤 16일 만에 1.3.1(2026-11-13)까지 나왔다(GitHub 릴리스 UTC 기준). 명령과 옵션이 빠르게 바뀌므로 사용 전 현재 README와 릴리스 노트를 다시 확인한다.

## 선택할 때 확인할 조건

다음은 위 동작 방식에서 도출한 이 문서의 제안이다.

| 질문 | 접근성 트리 방식이 유리한 조건 | 다른 방식을 볼 조건 |
|---|---|---|
| 대상 앱이 요소를 노출하는가 | 표준 위젯으로 만든 앱 | 캔버스나 게임처럼 직접 그리는 UI는 스크린샷과 비전 모델 |
| 사용자가 같은 컴퓨터를 쓰는가 | 포인터와 포커스를 뺏지 않아야 할 때 | 격리된 VM이나 별도 데스크톱이면 화면 기반 도구도 가능 |
| 더 구조적인 연결이 있는가 | API, CLI나 MCP가 없는 설치형 앱 | 전용 API나 MCP가 있으면 그쪽이 데이터 접근과 반복 작업에 안정적 |
| 동작이 되돌릴 수 있는가 | 확인 snapshot으로 결과를 검증할 수 있을 때 | 송금, 발송, 삭제는 사람 승인을 앞에 둔다 |

## 출처

- [agent-desktop README — Vercel Labs](https://github.com/vercel-labs/agent-desktop) — 2026-11-14 정의, 지원 OS와 API, ref 규칙, headless 기본값, 설치, 보안 안내 대조
- [agent-desktop CONCEPTS — Vercel Labs](https://github.com/vercel-labs/agent-desktop/blob/main/CONCEPTS.md) — 2026-11-14 fail-closed 해석, Interaction Lease, 다중 에이전트 세션, 암호 필드와 replay 산출물 대조
- [agent-desktop Releases — Vercel Labs](https://github.com/vercel-labs/agent-desktop/releases) — 2026-11-14 v1.0.0(10-28), v1.2.0 MCP, v1.3.0 sandbox, v1.3.1(11-13) 대조
- [클로드에 붙여 쓰는 미친 도구 agent-desktop — 잔재미코딩](https://www.youtube.com/watch?v=luEhiMTWlW8) — 2026-11-01 공개 쇼츠, 작성 계기이며 동작 설명은 위 저장소 문서로 대조

## 관련 문서

- [[Agent-Browser-Task-Boundaries|브라우저 에이전트의 작업과 권한 경계]]
- [[Agent-Execution-Isolation|에이전트 실행 격리]]
- [[Natural-Language-E2E-Agent|자연어 E2E 테스트 에이전트]]
- [[Agent-Friendly-Websites|에이전트 친화적 웹사이트]]
- [[Agent-Integration|에이전트와 업무 시스템 연결]]
