---
tags: [ai, coding-agent, session, transcript, privacy, git]
status: done
verified_at: 2026-11-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Session History", "에이전트 세션 기록", "Atuin Threads", "DeltaDB", "Entire 체크포인트"]
---

# 에이전트 세션 기록의 보존, 검색과 이어받기

코딩 에이전트의 세션 기록에는 실행한 명령과 출력뿐 아니라 요청한 의도, 시도했다 버린 접근과 결정 이유가 대화로 남는다. 셸 기록은 무엇을 실행했는지만 남기므로 둘은 다른 자료다. 이 기록은 도구마다 저장 위치와 보존 기간이 다르고 여러 머신에 흩어지므로 무엇을 모을지, 어디에 둘지, 누가 읽을지, 다른 도구로 넘길 때 무엇이 빠지는지를 따로 정한다.

## 기록이 흩어지고 사라지는 경로

- **제품별 저장소**: Codex는 `$CODEX_HOME/sessions`에 transcript를 두고([[Codex-CLI#세션 저장소 운영|Codex 세션 저장소]]), Claude Code는 `~/.claude` 아래 평문으로 두며 `cleanupPeriodDays`(기본 30일)가 지나면 지운다([[Claude-Code-Config-Permissions|Claude Code 설정과 권한]]).
- **보존 기간**: 이미 지워진 세션은 나중에 수집 도구를 켜도 가져올 수 없다. 수집을 처음 켤 때 들어오는 것도 그 기간 안의 기록뿐일 수 있다는 지적이 GeekNews 댓글에 있다.
- **여러 머신**: 개발 서버, 노트북과 임시 인스턴스를 오가면 같은 작업의 기록이 머신마다 나뉜다.

## 수집 범위는 비밀 값과 코드 노출로 정한다

2026-11-16 Atuin 18.24.8 문서 기준 Atuin Threads는 Claude Code, Codex, Copilot, Grok Build, Hermes Agent, Kiro, opencode, Pi와 Amp의 세션을 thread로 기록한다. 기본으로 꺼져 있고 `atuin threads enable`로 켜며, 켠 뒤의 세션부터 기록하고 기존 세션은 `atuin threads import`로 가져온다. 2026-10-27 발표 글은 지원 대상을 다섯 개로 적었으므로 지원 목록은 버전마다 확인한다.

| 항목 | 문서의 처리 |
|---|---|
| 대화와 도구 호출 | 입력과 출력을 함께 남기고, 파일 편집은 에이전트가 기록한 diff로 남긴다 |
| 추론 | 추론했다는 표시만 남긴다 |
| 비밀 값 | 알려진 패턴과 `redact_patterns`에 맞는 값을 `****`로 가린다. 빨리 가릴 수 없는 텍스트는 남기지 않는다 |
| 자격 증명 파일 | `.env`, SSH 키, AWS 자격 증명과 `sensitive_files`의 내용은 남기지 않는다 |
| 크기 | 이미지를 빼고, 호출 하나의 입력이나 출력은 64KiB를 넘으면 앞뒤만 남긴다 |
| 코드 노출 축소 | `capture_tools = false`면 도구 이름과 실패 여부만 남긴다 |

필터 설정은 데몬을 다시 시작한 뒤 새로 기록하거나 가져온 thread에만 적용되고, 이미 기록한 것은 그대로다. 문서가 직접 밝히듯 도구 호출에는 코드베이스의 상당 부분이 들어갈 수 있다. 가림 규칙이 모든 비밀 값을 잡는다고 보지 않고, 민감한 저장소는 `cwd_filter`로 그 디렉터리의 도구 호출 입력과 출력을 빼거나 `capture_tools = false`로 도구 기록을 끈다. 두 설정 모두 도구 이름은 남기고 대화 본문을 빼 주지는 않으므로, 대화도 남기면 안 되는 저장소에서는 수집을 켜지 않는다(운영 제안).

## 동기화와 검색

thread는 암호화된 레코드 저장소에 들어가 셸 기록처럼 동기화된다. 발표 글은 로컬 전용, Atuin 호스팅 서버와 자체 서버 가운데 고를 수 있고 동기화는 종단 간 암호화되어 Atuin도 내용을 읽지 못한다고 설명한다. 검색은 검색어의 각 단어가 온전한 단어로 들어 있는 thread를 찾으며, 도구 호출은 입력과 바뀐 파일 이름까지 검색되지만 출력은 검색되지 않는다.

에이전트가 과거 세션을 직접 찾게 하려면 `atuin mcp`를 MCP 서버로 연결한다. thread 도구는 검색, 목록과 읽기만 하는 읽기 전용이고 stdio로 필요할 때 실행된다. 발표 글의 사례는 중단했던 기능의 시도와 중단 이유, 이전 장애 조사에서 원인을 찾은 기록을 에이전트가 찾아 새 작업에 쓴 것이다. 과거 기록은 당시의 판단이므로 현재 코드와 설정으로 다시 확인한다([[Agent-Memory-Retain-Recall-Reflect#오래된 기억의 검색 순위와 사실의 유효성을 구분한다|오래된 기억과 사실의 유효성]]).

## 이어받기는 무엇이 넘어가는지 확인한다

`atuin resume`은 thread를 고른 뒤 원래 에이전트로 재개, 포크, 다른 에이전트로 계속 중에서 고르게 한다.

| 방식 | 넘어가는 것 | 확인할 점 |
|---|---|---|
| 원래 에이전트로 재개 | 세션 ID는 모든 머신에서 같다. 다른 머신에서 기록됐거나 transcript가 지워졌으면 동기화된 메시지로 transcript를 다시 써서 재개한다 | 이 머신의 사본이 다른 방향으로 갈라졌거나 에이전트가 여기서 그 세션을 실행 중이면 아무것도 쓰지 않고 선택을 묻는다 |
| 포크 | 같은 에이전트의 새 세션에 도구 호출을 포함한 같은 기록을 쓴다 | 원본은 그대로 두며, 메시지가 없는 세션은 포크할 수 없다 |
| 다른 에이전트로 계속 | 대화와 기록된 도구 호출의 입력과 결과가 넘어가고, 같은 일을 하는 도구가 있으면 그 에이전트의 도구로 바뀐다. 새 세션은 원래 세션을 가리키는 메모로 시작한다 | 추론은 버려진다. 대응 도구가 없는 호출은 읽을 수만 있고 다시 부르지 못한다 |

하위 에이전트 세션은 목록에 없고 부모 세션으로 재개한다. 다른 에이전트로 넘긴 세션은 원래 모델의 추론 과정 없이 결과만 이어받으므로, 넘긴 뒤 첫 작업에서 목표와 남은 결정을 다시 확인한다(이 문서의 제안). 제품이 transcript를 지우기 전에 수집해 두면 위 재개 경로로 되살릴 수 있지만, 그 사본도 같은 민감도로 관리해야 한다.

## Git 밖에 남는 작업 기록

커밋은 결과의 체크포인트이고 그 사이의 대화와 편집 과정은 다른 저장소에 남을 수 있다. 저장소를 옮기거나 미러링할 때 이 기록이 함께 가는지 따로 확인한다.

- **Zed Delta**: 동료를 에이전트와의 작업 스레드에 초대해 같은 작업 트리를 보며 리뷰하고, 리뷰는 상위 스레드 작업 트리의 격리된 복사본에서 변경을 시험한다. DeltaDB는 커밋 사이의 편집을 사람과 에이전트의 메시지와 함께 기록하고, 커밋은 여전히 푸시, 풀과 빌드의 기준이다. Zed 팀은 Delta 저장소에서 PR을 끄고 Delta 안에서 개발하지만 CI는 기존 제공자를 쓴다(2026-09-16 공개 베타 발표 기준).
- **Entire CLI**: 체크포인트는 연결된 커밋, 프롬프트와 전사, 도구 활동과 바뀐 파일을 담고 작업 브랜치에 커밋을 더하지 않는다. CLI 0.10.0부터 기본인 `git-refs` 백엔드는 체크포인트마다 `refs/entire/checkpoints/<shard>/<id>` ref를 만들고, pre-push 훅이 대기 중인 체크포인트 ref를 체크포인트 동기화 원격 하나로 보낸다. 원격이 여럿이어도 모든 원격에 복사하지 않는다.

브랜치만 복제하는 미러나 이전 도구로는 별도 ref와 외부 DB의 기록이 따라오지 않을 수 있다(문서에서 도출). 저장소를 읽을 수 있는 사람은 그 안의 전사도 읽을 수 있다고 보고, 공개 저장소에서는 체크포인트의 저장 위치를 먼저 정한다(운영 제안). 저장 계층 쪽 변화는 [[Server-Centric-Version-Control|서버 중심 버전 관리]]에 있다.

## 팀 공유는 권한 모델부터 정한다

Atuin은 Git 브랜치처럼 thread를 넘겨받는 옵트인 공유를 개발 중이라고 밝혔다(2026-10-27 발표 기준, 출시 전). Ace는 프로젝트 단위 공유로 그 프로젝트의 채널을 읽고 쓰게 하고, 팀원의 에이전트 호출은 채널 소유자가 채널마다 따로 켠다(새 채널은 꺼진 채 시작). 켜면 팀원이 소유자의 사용자 권한으로 명령을 실행하므로, 기록을 보여 줄 범위와 호출을 허용할 범위를 따로 정한다([[Production-Agent-Architecture-Delegation#여러 사용자가 쓰는 에이전트는 누구의 권한으로 실행하는지 정한다|에이전트 실행 주체]]). 세션 기록을 공유하면 그 안의 경로, 명령 출력과 코드도 함께 공유되므로 공유 범위는 비공개를 기본으로 둔다.

## 운영 점검

- 쓰는 에이전트마다 transcript의 위치와 보존 기간을 알고, 수집 도구를 켜기 전에 지워질 기록을 정했는가
- 수집에서 뺄 저장소와 디렉터리, 비밀 값 가림 규칙과 도구 기록 여부를 정했는가
- 동기화 서버를 고를 때 암호화 범위, 자체 운영 여부와 키를 잃었을 때의 복구 경로를 확인했는가
- 다른 에이전트로 넘긴 세션에서 추론이 빠진다는 점을 알고 목표와 남은 결정을 다시 확인하는가
- 저장소 이전이나 미러링 때 별도 ref나 외부 DB에 남은 작업 기록의 처리 방법을 정했는가

## 출처

- [Atuin Threads: All your agent sessions on every machine — Atuin Blog, Ellie Huxtable](https://blog.atuin.sh/threads-agent-sessions/) — 2026-10-27 발표. 18.24 도입, 옵트인 수집, 저장과 동기화 선택지, 종단 간 암호화, MCP 활용 사례와 팀 공유 계획 대조
- [Atuin Docs, Threads](https://github.com/atuinsh/atuin/blob/v18.24.8/docs/docs/ai/threads.md) — 2026-11-16 v18.24.8 태그 문서로 지원 에이전트, 기록 범위와 가림, 재개, 포크와 다른 에이전트로의 이어받기 대조
- [Atuin Docs, MCP Server](https://docs.atuin.sh/main/ai/mcp/) — 2026-11-16 thread 도구와 읽기 전용 범위 대조
- [Replacing Pull Requests with Delta — Zed Blog, Nathan Sobo](https://zed.dev/blog/delta-public-beta) — 2026-09-16 발표. 스레드 리뷰, DeltaDB의 기록 범위와 커밋의 역할을 2026-11-16 대조
- [Entire Docs, Checkpoint storage](https://docs.entire.com/guides/checkpoints/checkpoint-storage) — 2026-11-16 저장 백엔드, ref 경로, 기본값이 바뀐 버전과 푸시 대상 원격 대조
- [Entire Docs, Checkpoints overview](https://docs.entire.com/guides/checkpoints/overview) — 2026-11-16 체크포인트의 내용과 작업 브랜치 비변경 대조
- [Atuin Threads: 모든 머신의 에이전트 세션을 한곳에 — GeekNews](https://news.hada.io/topic?id=37009) — 학습 계기, Claude Code 기본 보존 기간에 관한 댓글
- [AI 시대, git push 앞뒤에서 바뀌는 것들 — GeekNews](https://news.hada.io/article/git-push-in-the-agent-era) — Delta와 Entire 사례를 함께 다룬 계기

## 관련 문서

- [[Codex-CLI#세션 저장소 운영|Codex 세션 저장소 운영]]
- [[AI-Coding-Agent-Usage-Telemetry|AI 코딩 에이전트 사용량 텔레메트리]] — 같은 transcript를 토큰 집계로 읽을 때의 보존과 신뢰 경계
- [[Agent-Memory-Retain-Recall-Reflect|에이전트 기억의 저장, 검색과 추론]]
- [[Server-Centric-Version-Control|서버 중심 버전 관리]]
- [[Production-Agent-Architecture-Delegation|위임 경계와 실행 주체]]
- [[Agent-Terminal-Workspaces|에이전트 터미널과 작업 공간]]
