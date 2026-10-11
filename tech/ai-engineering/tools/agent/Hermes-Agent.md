---
tags: [ai, agent, hermes-agent, skills, memory, messaging-gateway, trust-boundary]
status: done
verified_at: 2026-10-12
category: "AI엔지니어링(AIEngineering)"
aliases: ["Hermes Agent", "헤르메스 에이전트"]
---

# Hermes Agent — 경험을 스킬과 메모리로 남기는 게이트웨이 상주 에이전트

Hermes Agent는 Nous Research가 GitHub에 MIT 라이선스로 공개한 오픈소스 AI 에이전트다. CLI, 데스크톱 앱과 메신저로 대화하며, 작업에서 얻은 절차는 스킬로, 환경 정보와 사용자 선호는 메모리로 저장해 다음 세션에서 다시 쓴다. 제품 동작은 2026-10-12에 확인한 README와 공식 문서 기준이다. 확인한 GitHub 페이지에서 릴리스 버전을 확인하지 못해 특정 버전과 대조하지 않았으므로 기본값은 설치한 버전의 문서로 다시 확인한다.

## 학습 루프 — 모델이 아니라 스킬과 메모리를 고친다

Nous Research는 README와 공식 문서에서 Hermes Agent를 학습 루프가 내장된 유일한 에이전트로 소개한다. 벤더의 자기 설명이며 다른 제품과 비교해 검증한 결과가 아니다.

공식 문서는 학습 루프를 경험에서 스킬을 만들고 사용하면서 개선하며, 지식을 남기도록 스스로 상기(nudge)하고, 세션을 거치며 사용자에 대한 모델을 쌓는 과정으로 설명한다. README는 여기에 복잡한 작업 뒤의 자율 스킬 생성, 과거 세션 검색을 통한 회상, Honcho 기반 사용자 모델링과 agentskills.io 표준 호환을 함께 적는다.

결과가 남는 곳은 `~/.hermes/skills/`의 스킬 파일, `~/.hermes/memories/`의 메모리 파일과 `~/.hermes/state.db`의 세션 기록이다. 문서가 설명하는 범위에서 이 루프는 모델 가중치를 바꾸는 학습이 아니라 에이전트가 다음에 읽을 파일과 기록을 고치는 구조다. 그래서 학습의 품질은 무엇이 저장되고 누가 검토하는지에 달려 있다.

## 스킬 — 절차를 파일로 남긴다

- 공식 문서는 `~/.hermes/skills/`를 스킬의 기본 디렉터리이자 정본(source of truth)으로 설명한다. 문서의 예시 스킬은 `name`, `description`, `version`, `platforms`, `metadata`를 담은 YAML frontmatter와 본문으로 된 `SKILL.md`다.
- 공식 문서는 agentskills.io 오픈 표준과 호환된다고 밝히고, agentskills.io의 지원 클라이언트 목록에도 Hermes Agent가 있다. agentskills.io는 이 형식을 Anthropic이 처음 개발해 오픈 표준으로 공개했다고 설명한다. 표준의 스킬은 최소 `name`과 `description` 메타데이터와 지침을 담은 `SKILL.md` 폴더이며 스크립트, 참조 문서와 템플릿을 함께 둘 수 있다. 호스트별 관례와 점진적 공개의 원리는 [[Agent-Skills]]에서 다룬다.
- 로딩은 단계적이다. `skills_list()`는 이름, 설명과 카테고리만 돌려주고 `skill_view(name)`은 본문 전체를, `skill_view(name, path)`는 참조 파일을 읽는다.
- 에이전트는 `skill_manage` 도구로 스킬을 만들고(`create`), 부분 수정하고(`patch`), 삭제한다(`delete`). `write_file`과 `remove_file`로 부속 파일도 다룬다.
- 공식 문서는 시스템 프롬프트가 비자명한 작업 절차를 `skill_manage`로 기록하도록 요청한다고 설명하고, 반복할 가치가 있는 여러 단계 작업 흐름을 알아냈을 때, 오류나 막다른 길 끝에 작동하는 경로를 찾았을 때, 사용자가 접근 방식을 교정했을 때를 든다. 도구 호출 횟수 같은 고정 조건은 문서에 정의돼 있지 않다.
- Skills Hub는 공식 선택 스킬, GitHub 저장소, skills.sh, ClawHub, LobeHub 같은 출처에서 스킬을 설치하며 `builtin`, `official`, `trusted`, `community` 신뢰 등급을 둔다. 허브에서 설치하는 스킬은 보안 스캐너를 거치고, `--force`로도 `dangerous` 판정은 무시할 수 없다.

## 메모리와 세션 간 회상 — 사실과 선호를 따로 둔다

| 저장소 | 위치 | 내용 |
|---|---|---|
| `MEMORY.md` | `~/.hermes/memories/` | 에이전트의 메모(환경 사실, 관례, 배운 점), 2,200자(약 800토큰) 한도 |
| `USER.md` | `~/.hermes/memories/` | 사용자 프로필(선호, 소통 방식, 기대), 1,375자(약 500토큰) 한도 |
| 세션 기록 | `~/.hermes/state.db` | CLI와 메신저 세션을 SQLite에 저장하고 FTS5로 전문 검색 |

- 에이전트는 `memory` 도구의 `add`, `replace`, `remove`로 메모리를 고친다. `read` 동작은 없고 `replace`와 `remove`는 부분 문자열로 항목을 찾는다.
- 메모리는 자동으로 압축되지 않는다. 한도를 넘는 쓰기는 오류를 돌려주고, 에이전트가 항목을 합치거나 지운 뒤 다시 쓴다.
- 메모리는 세션 시작 시 시스템 프롬프트에 고정 스냅숏으로 들어간다. 세션 중 변경은 디스크에 바로 저장되지만 프롬프트에는 다음 세션부터 반영된다.
- 메모리 문서는 세션 검색이 LLM 요약이나 자르기 없이 저장된 메시지를 돌려준다고 설명한다. README의 기능 목록은 세션 검색에 LLM 요약을 함께 적고 있어 두 설명이 다르다. 설치한 버전에서 동작을 확인한다.
- Honcho 같은 외부 메모리 공급자는 플러그인으로 선택 설치한다.

정리하면 절차는 스킬에, 환경 사실과 선호는 메모리에, 원래 대화는 세션 기록에 남는다. 이 구분을 기억 연산 관점에서 보려면 [[Agent-Memory-Retain-Recall-Reflect]]를 참고한다.

## 게이트웨이 — 한 프로세스가 여러 메신저를 받는다

- README는 Telegram, Discord, Slack, WhatsApp, Signal과 CLI를 단일 게이트웨이 프로세스에서 처리한다고 설명한다. 프로필을 여러 개 두면 게이트웨이 프로세스도 프로필마다 따로 뜬다.
- 공식 문서 첫 페이지는 지원 플랫폼으로 CLI, Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Mattermost, Email, SMS, DingTalk, Feishu, WeCom, Weixin, QQ Bot, Yuanbao, BlueBubbles, Home Assistant, Microsoft Teams, Google Chat을 들고 그 밖의 플랫폼도 있다고 적는다. README 기능 절의 목록보다 넓으므로 플랫폼별 연결 방법은 게이트웨이 문서에서 확인한다.
- README는 결과를 메신저 플랫폼으로 보내는 내장 cron 스케줄러와 병렬 작업용 격리 서브에이전트를 기능으로 든다.

## 프로필과 Kanban — 용도마다 홈을 나누고 작업을 배정한다

- 공식 문서는 프로필을 별도 홈 디렉터리로 설명한다. 프로필마다 `config.yaml`, `.env`, `SOUL.md`, 메모리, 세션, 스킬, cron 작업과 상태 DB를 따로 둔다. 기본 프로필은 `~/.hermes`, 추가 프로필은 `~/.hermes/profiles/` 아래에 있으며 `hermes profile create <이름>`으로 만들고 `hermes -p <이름> chat`처럼 실행할 프로필을 지정한다.
- 게이트웨이는 프로필마다 별도 프로세스로 뜨고 자체 봇 토큰을 쓴다. 공식 문서는 두 프로필이 실수로 같은 봇 토큰을 쓰면 두 번째 게이트웨이가 충돌한 프로필을 알리는 오류와 함께 차단된다고 설명하며(적용되는 플랫폼 범위는 프로필 문서에서 확인한다), 두 에이전트 프로세스가 같은 프로필 홈을 가리키지 않도록 경고한다.
- 프로필은 git 저장소로 묶어 `hermes profile install`로 설치하고 `hermes profile update`로 갱신한다. 배포본에는 `SOUL.md`, 설정, 스킬, cron 작업과 MCP 연결이 담기고 자격 증명, 메모리와 세션은 각 기기에 남는다. 보안 문서는 `hermes profile install`과 `hermes profile update`가 제3자의 `SOUL.md`를 검사나 승인 프롬프트 없이 프로필 홈에 복사한다고 설명하므로, 설치와 갱신 때마다 저장소의 `SOUL.md`, 스킬, cron 작업과 MCP 설정을 직접 읽는다(문서 설명에서 도출한 운영 제안).
- Kanban은 모든 프로필이 공유하는 지속형 작업 보드다. 작업은 `~/.hermes/kanban.db`에 저장되고 담당자로 프로필 하나를 지정하며, 디스패처 루프가 작업을 원자적으로 점유해 담당 프로필을 별도 OS 프로세스로 실행한다. 기본값인 자동 모드(`kanban.auto_decompose: true`)에서는 디스패처가 Triage에 들어온 작업에 분해기(decomposer)를 자동 실행하고, 수동 모드에서는 사용자가 처리할 때까지 Triage에 둔다.
- 보드는 대시보드 플러그인, `hermes kanban` CLI, 채팅과 게이트웨이의 `/kanban` 명령, 데스크톱 앱에서도 볼 수 있다. 문서는 Kanban이 단일 호스트용으로 설계돼 신뢰된 로컬 사용자를 가정한다고 설명하며, 대시보드를 네트워크에 노출하면 Kanban을 포함한 모든 플러그인 경로가 네트워크에서 접근 가능해지므로 공유 호스트에서는 그렇게 하지 말라고 경고한다.

## 모델과 실행 환경

- 모델 공급자로 Nous Portal, OpenRouter, OpenAI, 직접 지정한 엔드포인트 등을 쓸 수 있고 `hermes model`로 바꾼다.
- 터미널 백엔드는 local, Docker, SSH, Singularity, Modal, Daytona, Vercel Sandbox 일곱 가지다. 보안 문서는 local을 격리 없이 호스트에서 실행되는 백엔드로, docker, singularity, modal, daytona, vercel_sandbox를 격리된 백엔드로 분류한다. Docker 백엔드에는 Linux capability 제거(drop), 권한 상승 차단, 프로세스 수 제한 같은 강화 설정이 들어간다.

## 분석 렌즈 — 맥락이 어디에 머무는가

이 절의 세 분류(세션 채팅형, 폴더 작업형, 게이트웨이 상주형)는 사용자가 말을 거는 방식으로 AI 도구를 나눈 발표의 구분을 빌린 것이다(출처의 영상 항목). 폴더 작업형은 이 문서에서 저장소 결합형 코딩 에이전트로 부른다. 맥락이 머무는 곳과 위험 열, 아래 두 질문은 이 문서의 해석이며 표준 분류나 제품 사양이 아니다. 제품 기능에 따라 세 형태의 경계는 겹칠 수 있다.

| 형태 | 대화 창구 | 맥락이 머무는 곳 | 먼저 볼 위험 |
|---|---|---|---|
| 세션 채팅형 | 웹이나 앱의 대화 창 | 대화 스레드와 제품이 제공하는 메모리 | 대화가 끝나면 절차 지식이 흩어짐 |
| 저장소 결합형 코딩 에이전트 | 터미널, IDE | 작업 폴더와 `AGENTS.md`, `CLAUDE.md` 같은 지시 파일 | 폴더 밖 지식 단절, 저장소 쓰기와 명령 실행 권한 |
| 게이트웨이 상주형(Hermes Agent) | 메신저와 CLI | 프로필 홈의 메모리, 스킬과 세션 기록 | 외부 메시지 입력, 상시 실행 권한, 누적 기억의 오염 |

렌즈로 확인할 질문은 둘이다. 다음 세션이 이전 작업을 무엇으로 기억하는가, 그리고 누가 어떤 경로로 에이전트에게 지시를 넣을 수 있는가. 게이트웨이 상주형은 맥락이 폴더나 스레드를 넘어 이어지는 대신 그 기억을 만드는 입력 경로가 메신저까지 넓어진다.

## 운영과 보안 체크포인트

### 에이전트가 쓴 스킬과 메모리는 검토한 뒤 신뢰한다

- 공식 문서는 에이전트가 어떤 스킬이든 수정하거나 삭제할 수 있고 기본값에서는 승인 없이 쓴다고 설명한다. 검토한 절차만 재사용하려면 `skills.write_approval: true`로 쓰기를 대기열에 두고 `/skills pending`, `/skills approve`, `/skills reject`로 처리한다.
- `skills.guard_agent_created`는 위험 패턴을 찾는 휴리스틱 스캐너이며 승인 게이트가 아니다. 기본 활성 여부는 확인한 문서에 명시돼 있지 않다.
- 메모리도 `memory.write_approval: true` 설정으로 `/memory pending`, `/memory approve`, `/memory reject` 검토를 거치게 할 수 있다. 메모리 항목은 저장 전에 프롬프트 인젝션, 자격 증명 유출, SSH 백도어 같은 위협 패턴과 보이지 않는 유니코드 문자를 검사받는다.
- 메모리는 다음 세션부터 시스템 프롬프트에 들어가므로 잘못 저장된 항목은 지울 때까지 이후 세션에 영향을 준다. `MEMORY.md`와 `USER.md`를 주기적으로 읽어 보는 운영 절차를 둔다. 이는 문서 동작에서 도출한 운영 판단이다.
- 외부 스킬 감사와 수명주기 관리는 [[Agent-Skills]]의 기준을 함께 적용한다.

### 메신저 게이트웨이는 외부 입력 경계다

- 플랫폼별(`TELEGRAM_ALLOWED_USERS` 등) 또는 전체(`GATEWAY_ALLOWED_USERS`) 허용 목록을 둔다. 보안 문서는 허용 목록이 없고 `GATEWAY_ALLOW_ALL_USERS`도 설정하지 않으면 모든 사용자를 거부한다고 설명하며, 운영 환경에서 `GATEWAY_ALLOW_ALL_USERS=true`를 쓰지 말라고 권한다.
- 채팅형 DM 플랫폼의 기본값인 페어링 방식에서는 모르는 사용자에게 일회용 코드를 주고 소유자가 CLI에서 승인한다. 코드는 1시간 뒤 만료되고 5회 실패하면 1시간 잠긴다.
- 허용 목록은 누가 말을 걸 수 있는지를 정할 뿐 메시지 내용의 안전성을 판단하지 않는다. 허용된 사용자의 메시지에도 전달된 글, 링크, 첨부를 통해 다른 사람이 쓴 지시가 섞일 수 있다. 보안 문서는 컨텍스트 파일의 인젝션 검사를 의도 판단이 아닌 휴리스틱으로 설명한다. 메시지 본문이나 도구 출력을 검사하는 기능은 확인한 문서 범위에서 찾지 못했다.
- 메시지 창구의 신뢰 경계는 [[Agent-Email-Interface]], 도구 서버 쪽 자격 증명과 정책 경계는 [[MCP-Security-Boundaries]]와 함께 본다.

### 파괴적 작업과 외부 발송 전 승인

- 위험 명령은 재귀 삭제, `mkfs`, `dd if=`, 원격 내용을 셸로 파이프하는 명령 같은 패턴 목록으로 판별한다. 승인 모드(`approvals.mode`)에는 `smart`(보조 LLM이 위험도를 평가해 저위험 명령은 그 명령에 한해 자동 승인하고, 명백히 위험하면 자동 거부하며, 불확실하면 사용자에게 묻는다), `manual`(위험 명령마다 승인 요청), `off`(문서상 `--yolo` 실행에 해당)가 있다. 보안 문서는 `smart`를 기본값으로 적으므로 위험 패턴에 걸린 명령 일부가 사용자 확인 없이 실행될 수 있다(문서 동작에서 도출한 판단). 설치한 버전의 실제 값은 설정에서 확인한다.
- YOLO 모드(`--yolo`, `/yolo`, `HERMES_YOLO_MODE=1`)는 해당 세션의 위험 명령 안전 검사를 모두 끄지만 hardline 차단 목록은 그대로 적용된다.
- 메신저 세션에서는 에이전트가 위험 명령의 내용을 채팅으로 보내 답장을 기다리고, 제한 시간 안에 답이 없으면 거부한다(fail-closed).
- 컨테이너 백엔드에서는 컨테이너를 보안 경계로 보고 위험 명령 검사를 생략한다. 이때 실제 경계는 컨테이너에 넘긴 자격 증명과 마운트 범위다. 이는 문서 동작에서 도출한 판단이다.
- 확인한 보안 문서는 명령 실행 승인을 설명하며 메일 발송이나 채널 게시 같은 외부 발송의 별도 승인은 다루지 않는다. 발송 도구에는 [[Agent-Email-Interface]]의 발신 승인 경계를, 고위험 결정에는 [[Harness-Engineering]]의 HITL 배치를 따로 설계한다.

### 비밀값

- API 키는 `~/.hermes/.env`에 두고 파일 권한을 제한하며 버전 관리에 커밋하지 않는다.
- `execute_code`는 이름에 `KEY`, `TOKEN`, `SECRET`, `PASSWORD`, `CREDENTIAL`, `PASSWD`, `AUTH`가 들어간 환경 변수를 하위 프로세스에서 제거한다. local `terminal`은 이름 패턴이 아니라 공급자 키, 게이트웨이 토큰, 도구 API 키 같은 Hermes 인프라 변수 목록만 제거하고, Docker, SSH, Modal 백엔드는 기본적으로 호스트 환경 변수를 넘기지 않는다. 그래서 local 백엔드에서는 이 목록에 없는 호스트 비밀값이 명령에 전달될 수 있다(문서 설명에서 도출한 판단). 스킬이 선언하고 실제로 설정된 변수와 `terminal.env_passthrough`의 변수는 전달되고, Docker 백엔드는 `docker_forward_env`에 적은 호스트 변수도 넘긴다. 보안 문서는 Docker로 전달한 값을 컨테이너 안의 코드가 읽어 유출할 수 있다고 경고한다.
- MCP stdio 하위 프로세스에는 `PATH`, `HOME` 같은 고정 변수와 해당 서버 설정의 `env`만 전달된다.

### 저장 위치와 감사

| 대상 | 위치 | 확인 방법 |
|---|---|---|
| 스킬 | `~/.hermes/skills/` | `/skills list`, 파일 직접 열람 |
| 메모리 | `~/.hermes/memories/MEMORY.md`, `USER.md` | 파일 열람, `memory` 도구로 수정과 삭제 |
| 세션 기록 | `~/.hermes/state.db` | `hermes sessions list` |
| 비밀값 | `~/.hermes/.env` | 파일 권한 점검 |
| 로그 | `~/.hermes/logs/` | 운영 체크리스트의 모니터링 대상 |

표의 경로는 기본 프로필 기준이다. 다른 프로필은 `~/.hermes/profiles/` 아래 각자의 홈에 이 파일들을 따로 두고, README는 Windows 네이티브 설치의 홈을 `%LOCALAPPDATA%\hermes`로 안내한다. 스킬과 메모리 디렉터리의 변경 이력을 남기면 학습 루프가 무엇을 바꿨는지 추적할 수 있다. 다만 `.env`가 같은 홈에 있으므로 홈 전체를 버전 관리에 넣지 않는다. 이는 저장 구조에서 도출한 운영 제안이다.

보안 문서의 운영 체크리스트는 명시적 허용 목록, 컨테이너 백엔드(`terminal.backend: docker`), 게이트웨이를 root로 실행하지 않기, `terminal.cwd` 지정, `command_allowlist` 검토, `~/.hermes/logs/` 모니터링과 정기적인 `hermes update`를 든다.

## 체크포인트

- 벤더가 말하는 학습 루프가 모델 학습이 아니라 스킬, 메모리와 세션 기록의 갱신이라는 점과 메모리 한도, 고정 스냅숏의 영향
- 게이트웨이 허용 목록, DM 페어링과 기본 거부가 막는 것과 막지 못하는 것
- 에이전트가 쓴 스킬과 메모리를 승인 대기열로 돌리는 설정과 휴리스틱 스캐너의 한계
- 위험 명령 승인 모드와 컨테이너 백엔드에서 검사를 생략하는 이유, 외부 발송 승인을 따로 설계하는 이유

## 출처

- [hermes-agent — Nous Research (GitHub)](https://github.com/NousResearch/hermes-agent)
- [Hermes Agent Documentation](https://hermes-agent.nousresearch.com/docs/)
- [Hermes Agent Docs, Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)
- [Hermes Agent Docs, Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory)
- [Hermes Agent Docs, Skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- [Hermes Agent Docs, Profiles](https://hermes-agent.nousresearch.com/docs/user-guide/profiles)
- [Hermes Agent Docs, Kanban](https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban)
- [Agent Skills, Overview](https://agentskills.io)
- [헤르메스 에이전트 기본 개념과 지금 모르면 안되는 이유 총정리 — 인프런, 단테랩스](https://www.youtube.com/watch?v=3l4Ew8ZU9Ig) — 2026-10-10 공개 영상, 작성 계기이자 분석 렌즈 세 분류의 출처이며 기능 설명은 위 공식 문서로 대조

## 관련 문서

- [[Agent-Skills|에이전트 스킬 (SKILL.md 형식, 점진적 공개, 외부 스킬 신뢰와 수명주기 감사)]]
- [[Agent-Memory-Retain-Recall-Reflect|에이전트 기억의 저장, 검색과 추론 (개인화 기억의 출처, 저장 위치와 삭제 범위)]]
- [[Agent-Email-Interface|이메일 에이전트 인터페이스 (메시지 창구의 신뢰 경계와 발신 승인)]]
- [[MCP-Security-Boundaries|MCP 보안 경계 (자격 증명 전달과 게이트웨이 정책)]]
- [[Harness-Engineering|하네스 엔지니어링 (제약, 검증과 HITL 배치)]]
- [[Agent-Loop-Engineering|루프 엔지니어링 (정지 조건과 가드)]]
