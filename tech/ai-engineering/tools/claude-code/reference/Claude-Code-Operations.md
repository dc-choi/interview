---
tags: [ai, claude-code, cli, ci-cd, cost, troubleshooting, code-review]
status: done
verified_at: 2026-10-12
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Code Operations", "클로드 코드 운영", "클로드 코드 트러블슈팅", "클로드 코드 비용"]
---

# Claude Code 운영 — 실행 모드, CI, 비용, 트러블슈팅

에이전트를 일상 도구와 파이프라인으로 굴릴 때의 운영 레퍼런스. 관통하는 감각은 두 가지다 — **컨텍스트가 성능과 비용의 제1 변수**이고, 문제가 생기면 **실제로 무엇이 로드되고 실행됐는지부터 확인**한다.

## 실행 모드와 입력

- 3종: 인터랙티브(`claude`) / 원샷(`claude -p`, 출력 text, json, stream-json) / 파이프(`git diff | claude -p "리뷰"`) — Unix 유틸리티처럼 조합
- 입력 세 접두사: `/`(명령과 스킬), `!`(셸 직접 실행, 출력이 컨텍스트에 추가), `@`(파일 참조 — 파일은 전체 내용, 디렉토리는 목록만 포함)
- `/btw` 사이드 질문: 히스토리를 오염시키지 않고 캐시를 재사용해 저비용 — 무거운 조사를 통째로 위임하는 서브에이전트와 정반대 트레이드오프
- 체크포인트: 프롬프트마다 자동 생성, 30일 보존. Esc Esc 메뉴에서 코드+대화 / 대화만 / 코드만 / 부분 요약 선택. 한계: Bash로 실행한 rm, mv는 미추적 — 장기 안전망은 Git
- 세션: `/rename` 후 이름으로 재개, `--fork-session`, `/branch`(세션 내 분기), `--from-pr`(PR 연결 세션 재개)

## 헤드리스와 CI

- `--bare`: 최소 모드. 공식 CLI 문서 기준(확인 2026-07-15) 훅, 스킬, 플러그인, MCP 서버, auto-memory, CLAUDE.md의 자동 탐색을 건너뛰고 `CLAUDE_CODE_SIMPLE=1`을 설정한다. Bash와 파일 읽기, 편집 도구는 유지된다. 필요한 컨텍스트와 확장은 `--append-system-prompt`, `--settings`, `--mcp-config`, `--agents`, `--plugin-dir` 같은 플래그로 명시 주입한다. OAuth와 키체인도 읽지 않으므로 인증은 `ANTHROPIC_API_KEY` 또는 `--settings`의 `apiKeyHelper`로 제공한다. CI와 스크립트처럼 장비별 로컬 설정에 영향받지 않아야 할 때 적합하다
- CI 안전장치 4종: `--max-turns`(리뷰 5, 구현 10~15 권장), `--max-budget-usd`, 잡 타임아웃, dontAsk 권한 모드. `--dangerously-skip-permissions`는 격리 컨테이너에서만
- 무인 실행의 승인 처리(2026-11-24 공식 문서 대조): `--allowedTools`는 나열한 도구를 묻지 않고 실행하게 하는 사전 승인이지 나머지를 막는 목록이 아니다. 목록 밖이라도 승인이 필요 없는 호출(작업 디렉터리의 파일 읽기, 읽기 전용 명령)은 실행되고, 공식 문서는 권한 모드를 정하지 않은 `-p` 실행이 Manual 모드로 시작해 승인이 필요한 호출을 `PermissionRequest` 훅이나 `--permission-prompt-tool`이 승인하지 않으면 거부한다고 안내한다. 다만 changelog의 v2.1.302 항목은 이 기본값을 서드파티 제공자, 텔레메트리 꺼짐, 새 설치로 한정하고, 그 밖의 환경에서는 기본 모드가 서버 설정에 따라 auto일 수 있다(2026-11-24 changelog 대조). 무인 실행은 기본값에 기대지 않고 `--permission-mode`를 명시한다. 예약 작업처럼 답할 사람이 없으면 `--permission-prompts none`(v2.1.259 이상)을 준다. 승인 호스트(`--permission-prompt-tool`, SDK의 `canUseTool` 콜백)가 있으면 이 플래그 없이는 요청마다 호스트의 답을 기다리지만, 플래그를 주면 `PermissionRequest` 훅이 허용하지 않는 한 묻지 않고 거부하며 `AskUserQuestion`처럼 사람의 답이 필요한 도구도 뺀다. 이후 실행에도 적용하려면 `permissions.denyInsteadOfPrompting`(v2.1.319 이상)을 켜고, 특정 도구를 막아야 하면 사전 승인 목록이 아니라 deny 규칙을 둔다([[Claude-Code-Config-Permissions|설정과 권한]])
- 텔레메트리나 feature flag를 끈 환경의 auto 모드(2026-11-25 changelog v2.1.319 대조): LLM 게이트웨이 뒤를 포함해 이 환경에서는 서버 쪽 검사가 판정하지 못한 호출이 내장 분류기로 넘어가지 않고 질문이나 거부로 처리된다. Bedrock, Vertex와 Foundry는 이 폴백 변경의 대상이 아니다. 기존 클라이언트 분류기를 유지하려면 `CLAUDE_CODE_AUTO_MODE_SERVER=0`을 준다. 다만 자체 분류기 요청은 사용량에 잡히고(changelog v2.1.326), v2.1.327 변경 기록은 이후 릴리스에서 폴백을 없앤다고 예고했다(2026-11-25 기준). 2026-11-25 Permission modes 문서는 아직 이 예외를 적지 않는다. LLM 게이트웨이 뒤에서는 `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`가 있어도 `CLAUDE_CODE_AUTO_MODE_SERVER=1`로 서버 검사를 켤 수 있으며, 관리 설정이 `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`를 정했다면 `=1`도 관리 설정에 둔다. 프로젝트 밖에서 끈 서버 검사를 프로젝트 설정이나 플러그인이 다시 켜지 못한다. v2.1.319는 auto 모드에서 검사 수단이 없어 동작이 거부된 `claude -p` 실행이 종료 코드 0으로 끝나던 문제를 고쳐 text와 JSON 출력에서 1로 끝나게 했다. 분류기가 막은 일반 거부는 해당 동작만 실행하지 않고 실행을 이어 가므로 이 항목의 대상이 아니다. `/status`가 세션에 닿지 않는 서버 검사를 켜짐으로 표시하던 문제도 이때 고쳤으므로, 대화형 세션에서는 v2.1.319 이상의 `/status`로 실제 적용 여부를 본다(적용 제안). 텔레메트리는 두고 flag 조회만 끄는 `CLAUDE_CODE_DISABLE_FEATURE_FLAGS`는 기존 `DISABLE_GROWTHBOOK`의 새 이름이며(옛 이름도 동작, 새 이름은 v2.1.319 이상), 켜면 Remote Control처럼 flag 조회가 필요한 기능을 쓸 수 없다(Environment variables 문서). auto 모드 자체의 정의는 [[Claude-Code-Config-Permissions|설정과 권한]]
- 구조화 출력: `--output-format json` + `--json-schema`로 파이프라인에서 파싱 가능한 응답 강제
- GitHub Actions: 공식 액션 + `@claude` 트리거. **모델 버전 고정이 필수** — 별칭이 새 모델을 가리키게 되면 미활성 모델 에러로 파이프라인이 깨진다
- 자동 코드 리뷰(Code Review, Team과 Enterprise 대상 research preview, ZDR이나 HIPAA 구성을 적용한 조직은 쓸 수 없고 Anthropic BAA 적용 대상도 아님): GitHub 앱이 저장소 설정에 따라 PR을 열 때, push마다 또는 `@claude review` 코멘트로 리뷰하고 발견을 해당 줄의 인라인 코멘트로 단다. 비용은 플랜 포함 사용량과 별도로 사용 크레딧(usage credits)에서 나가며 리뷰당 평균 $15에서 $25다. 커스터마이즈는 CLAUDE.md(새로 들어온 위반을 nit로 표시)보다 리뷰 전용 파일 REVIEW.md가 확실하다. REVIEW.md는 발견과 검증 에이전트에 리뷰 지침으로 직접 전달되고 순위와 보고 에이전트도 참고하므로 심각도 기준, nit 상한과 skip 규칙을 여기에 명시한다
- 로컬 리뷰 `/code-review`(별칭 `/review`): GitHub 앱 없이 터미널 세션에서 정확성 버그를 찾고, 모델과 effort에 따라 재사용, 단순화, 효율 같은 정리 항목도 함께 보고한다. 기본 대상은 upstream보다 앞선 브랜치 커밋과 커밋하지 않은 변경이고, 파일 경로, PR 번호, 브랜치나 `main...my-feature` 같은 ref 범위를 대상으로 줄 수 있다. 기본으로 자체 컨텍스트를 가진 백그라운드 서브에이전트로 돌아 대화를 채우지 않고(`-p`, Agent SDK, 진행 중 재실행, `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`에서는 포그라운드), 비용은 일반 사용량에 포함된다. effort를 `low`로 주면 확신이 큰 발견만 보고해 오탐이 적고 `medium`부터 `max`까지는 범위를 넓힌다. 레벨을 생략하면 대화형 세션에서 마지막으로 직접 입력한 레벨을 이전 세션 것까지 재사용하고(`-p` 실행에서 준 레벨은 기억하지 않는다), 입력한 적이 없으면 세션의 현재 effort를 쓴다. `ultra`는 기억한 레벨을 쓰지도 바꾸지도 않는다. `--fix`는 발견을 작업 트리에 적용하는데 백그라운드 리뷰의 수정은 체크포인트 밖이라 `/rewind`가 아니라 git으로 되돌리고(포그라운드로 돌았으면 `/rewind`로 되돌린다), `--comment`는 GitHub PR에는 인라인 코멘트로, GitLab MR에는 노트 하나로 올린다(GitLab은 v2.1.257 이상과 `glab` CLI 필요, 없으면 터미널에 출력). CLAUDE.md는 따르지만 REVIEW.md는 읽지 않는다. 버그를 찾지 않고 정리 항목만 찾아 바로 고치는 리뷰는 `/simplify`다
- 클라우드 리뷰 `/code-review ultra`(ultrareview, research preview, 계정에서 쓸 수 있으면 `/ultrareview`도 별칭으로 동작): Anthropic 인프라의 클라우드 샌드박스에서 리뷰어 에이전트 여럿이 변경을 병렬로 살피고, 보고하는 발견마다 독립적으로 재현하고 검증해 스타일 제안보다 실제 버그에 집중한다. 인자가 없으면 기본 브랜치 대비 현재 브랜치(커밋하지 않은 변경과 staged 변경 포함)를 묶어 업로드하고, github.com PR 번호를 주면 로컬에서 아무것도 올리지 않고 샌드박스가 PR을 clone한다. 보통 5분에서 10분 걸리는 백그라운드 작업이라 `/tasks`로 확인하고, 슬래시 명령은 사용자가 직접 입력할 때만 실행된다(Claude가 스스로 시작하지 않고 예약 작업도 클라우드 리뷰를 띄우지 않는다. Claude가 Bash로 `claude ultrareview`를 대신 실행하면 저장소 전체 리뷰 폴백은 거부된다). claude.ai 계정 인증이 필요하고 Bedrock, Google Cloud Agent Platform, Microsoft Foundry와 ZDR이나 HIPAA 구성 조직에서는 쓸 수 없으며, 쓸 수 없으면 세션 안의 로컬 리뷰로 대신 돈다. 플랜 포함 사용량이 아니라 사용 크레딧으로 과금되고, Pro와 Max에는 계정당 한 번 주는 무료 3회(갱신 없음)가 있으며 그 뒤에는 변경 규모에 따라 보통 $5에서 $25다. PR 모드는 Claude 계정에 연결한 GitHub 계정의 읽기 권한이 필요하다. 스크립트와 CI에서는 끝날 때까지 기다려 결과를 stdout으로 내는 `claude ultrareview`를 쓰며, 같은 claude.ai 인증과 사용 크레딧 설정이 필요하다(`claude -p '/code-review ultra'`는 기다리지 않고 종료하고, 사용 크레딧으로 과금될 리뷰는 아예 띄우지 않는다)

## 비용 관리 — 정량 감각

- 활성 사용일 기준 개발자당 평균 약 $13/일, 90%가 $30 이하. 유휴 백그라운드 세션은 세션당 약 $0.04
- 사고(thinking) 토큰은 화면에 안 보여도 출력 토큰으로 과금된다. adaptive reasoning 모델은 effort level로 조절하고, 고정 예산 모델은 `MAX_THINKING_TOKENS`로 상한을 낮출 수 있다. 공식 비용 가이드는 팀원이 plan 모드로 도는 에이전트 팀을 일반 세션 대비 약 7배 토큰으로 안내하며, 실제 사용량은 활성 팀원 수와 실행 시간에 따라 달라진다. Fast Mode는 최대 2.5배 빠른 대신 토큰당 요금이 더 높고, 대화 중 처음 켜면 기존 컨텍스트 전체에 비캐시 입력 요금이 한 번 적용되므로 비용이 중요하면 세션 시작 시 켠다
- 절감 순서: /clear와 /compact 습관 → 기본 모델 한 단계 낮추고 서브에이전트는 저비용 모델 → 무거운 MCP 대신 gh, aws 같은 CLI → 훅으로 대용량 로그 전처리 → CLAUDE.md 슬림화 + 스킬 분리 ([[LLM-Model-Tiers|티어 라우팅]]과 같은 논리)
- 유휴 압축(idle compaction): 자리를 비운 사이 prompt cache가 만료되면 다음 메시지가 전체 컨텍스트를 캐시 없이 다시 처리한다. 변경 기록은 2.1.299에 터미널 유휴 압축 추가를 알렸다(설정 키와 아래 환경 변수는 2.1.290 이상에서 인식하고, 그보다 오래된 버전은 키를 무시하므로 `autoCompactEnabled`로 끈다). 200K 토큰 이상인 대화를 약 54분 방치하면 1시간 캐시가 만료되기 전에 미리 압축해 이 재처리를 피한다. 대화가 1시간 TTL을 쓸 때만 동작한다. Claude 구독의 플랜 사용량 안에서는 1시간이 기본이고, API 키, 클라우드 제공자나 사용 크레딧으로 과금되는 대화는 기본 5분이라 `promptCacheTtl`이나 `CLAUDE_CODE_PROMPT_CACHE_TTL`로 1시간을 지정해야 한다. 최소 토큰 수는 `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS`로 바꾸며 100000보다 작은 값은 100000으로 올린다. 기본값에서는 200K 컨텍스트 창 대화가 그 전에 자동 압축되므로, 자동 압축 경계가 임계값보다 큰 대화가 대상이다. 자동 압축 창을 200K 이하로 줄였다면 임계값도 그보다 낮춰야 대상이 된다. settings.json의 `"idleCompaction": false`나 2.1.302부터 생긴 `/config`의 `Idle compaction` 항목으로 끄고, `autoCompactEnabled`를 끄거나 `DISABLE_AUTO_COMPACT`를 설정해도 함께 꺼진다. 컴퓨터가 깨어 있어야 하며, 2.1.314부터 VS Code와 Claude Desktop의 Code 탭(로컬 또는 SSH 세션)에도 적용되고 텔레메트리를 끈 구독자와 1시간 캐시를 켠 Bedrock, Vertex, Foundry, LLM 게이트웨이에서도 돈다. 트레이드오프는 둘이다. 캐시가 만료된 뒤 이어서 보낸 메시지는 원래 대화가 아니라 요약에서 이어지므로 세부 맥락이 빠질 수 있고, 압축 자체가 유휴 중에 토큰을 쓴다. 2.1.318에서 요약이 아닌 응답으로 대화를 바꾸던 문제를 고쳤으므로 이상한 재개를 보면 버전부터 확인한다(2026-11-09 변경 기록, Settings reference, Prompt caching과 Manage costs 문서 확인)
- `/usage`는 Pro, Max, Ultra, Team, Enterprise 플랜에서 이 기기의 로컬 세션 기록을 바탕으로 최근 사용량의 10% 이상을 차지한 행동마다 줄이는 방법을 행으로 보여 준다. 공식 예시는 max 대신 high effort로 낮추기(`/effort high`), 자리를 비우기 전 `/compact` 실행, CLAUDE.md 줄이기다. 행의 비율은 절감량이 아니라 그 행에 해당하는 사용량 비중이라 합계가 100%를 넘을 수 있다. 2.1.305부터 `f`를 누르면 `/effort`로 끝나는 행은 진행 중인 턴이 끝난 뒤 실행되고, 처리할 수 있는 나머지 행은 변경마다 먼저 보여 주라는 프롬프트 하나로 Claude에 보낸다. `run /compact`로 끝나는 행은 자동 실행하지 않는다. 공식 모델 설정 문서는 낮은 effort가 단순 작업에서 빠르고 저렴하며 높은 effort가 복잡한 문제에 깊은 추론을 준다고 설명하고, max는 효용이 체감하고 과잉 사고하기 쉬우니 넓게 쓰기 전에 시험하라고 경고한다. 적용 제안으로(단서 영상 제작자의 개인 운용과 같은 방향), effort를 늘 max에 두기보다 복잡한 작업에만 올리고 단순 작업은 낮춰 두는 방식을 같은 과업의 재프롬프트 횟수와 사용량으로 비교해 정한다
- 서브에이전트 진행 요약(subagent progress summaries): 변경 기록 2.1.323은 `CLAUDE_CODE_DISABLE_AGENT_PROGRESS_SUMMARIES=1`(2.1.318부터 인식)이 서브에이전트 진행 요약과 그것을 쓰는 요청을 끈다고 밝혔다. 요청이 따로 나가므로 사용량을 쓰지만, 2026-11-14 확인한 Manage costs의 백그라운드 사용량 절은 이 요청을 다루지 않는다. 동작과 비중은 서드파티 글(Flamerix AI)의 측정이다. 이 글은 요약이 에이전트 패널의 상태 줄을 채우려고 약 30초마다 에이전트 전사 전체를 그 에이전트의 모델로 보내 3~5단어를 받으며, 로컬 세션 로그에는 남지 않는다고 적었다. 작성자가 요약 타이머를 막는 Bun preload 스크립트를 적용하기 전 1주 동안 자체 텔레메트리의 `claude_code.api_request` 이벤트를 `query_source`(`agent_summary`)로 묶은 결과 Claude Code의 요청별 추정 비용(`cost_usd`) 기준 전체의 16.4%였다고 보고했으나 수집 범위는 밝히지 않았다. 이 설명대로라면 비중은 백그라운드 에이전트 수와 실행 시간에 따라 달라진다(추론). 공식 모니터링 문서의 비용 counter는 `query_source`를 `main`, `subagent`, `auxiliary` 같은 거친 범주로만 나누고 진행 요약이 어디에 들어가는지 정의하지 않는다. 그래서 사용량이 예상보다 빨리 줄면 로컬 전사 기반 집계만 믿지 말고 OpenTelemetry 요청 이벤트의 `query_source`와 비용으로 세분해 보며, 진행 표시가 필요 없으면 이 변수로 끈 실행과 비교한다(적용 제안). 그 전에 쓰이던 `CLAUDE_CODE_FORK_SUBAGENT=0` 우회는 공식 문서상 fork 모드(v2.1.302부터 기본 켜짐, 대화형 터미널은 v2.1.232부터)를 끄는 설정이다. fork 모드가 꺼지면 Claude가 스스로 fork를 시작하지 못하지만 사용자가 직접 시작하는 fork(`/subtask`, agent view를 끈 경우 `/fork`)는 그대로 쓸 수 있고, 요약 억제 효과 보고는 엇갈린다
- Code Mode(2026-11-26 공식 문서와 변경 기록 대조): v2.1.323에 실험 기능으로 추가됐고 기본은 꺼져 있으며 이후 릴리스에서 바뀌거나 없어질 수 있다. Bash, Read, Edit를 하나씩 부르는 대신 Claude가 여러 도구 호출을 담은 JavaScript를 써서 한 단계에 실행하고, 스크립트가 명령을 병렬로 돌리거나 앞 결과를 다음 호출에 쓰고 Claude가 읽어야 할 출력 부분만 돌려줄 수 있다. 공식 문서는 여러 파일에 반복되는 변경이나 결과를 걸러 읽어야 하는 검색처럼 관련 도구 호출이 많은 작업에 권하지만 토큰 절감량은 제시하지 않는다. 도구 호출마다 쌓이던 중간 결과가 줄어 사용량이 줄 수 있다는 것은 이 동작에서 나온 추론이며, 실제 효과는 같은 과업을 켠 실행과 끈 실행으로 비교해 `/usage`와 텔레메트리로 확인한다(적용 제안). 켜는 방법은 셸, 사용자 `~/.claude/settings.json`의 `env`나 `--settings` 파일에 `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1`을 두는 것이다. 프로젝트와 로컬 설정 파일의 이 변수는 무시되고 관리 설정으로는 켤 수 없다. 셸, 사용자 설정, `--settings` 파일이나 관리 설정 중 한 곳에 `0`이 있으면 다른 곳의 `1`보다 우선해 꺼지므로 조직은 관리 설정에 `0`을 두어 막을 수 있다. 클라우드 제공자 사용자는 서버 관리 설정을 받지 않고 시작할 수 있어 이 `0`은 MDM이나 관리 설정 파일로 배포한다. 첫 세션에서 확인 뒤 재시작하고, Code Mode로 시작한 세션은 Code Mode를 켠 상태에서만 재개된다. 공식 문서 Requirements 기준 지원 표면은 터미널의 대화형 `claude` 세션이고 VS Code 패널, Desktop 앱과 클라우드 세션에서는 동작하지 않는다(변경 기록 2.1.331과 2.1.332에는 `--bare`, Agent SDK와 `claude -p`의 Code Mode 수정 항목이 있어 비대화형 지원 범위는 미확인). Code Mode 세션 안에서는 Remote Control, Claude in Chrome과 computer use를 쓸 수 없고 세션을 Desktop 앱이나 백그라운드 세션으로 옮길 수 없다. 모델은 Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable 5.2로 한정되고 native build가 필요하다(2026-11-26 기준). Bedrock, Google Cloud Agent Platform, Microsoft Foundry 같은 클라우드 제공자는 v2.1.331 이상이 필요하며, Enterprise Admin Console 로그인으로 접속하면 Agent Platform이나 Mantle 엔드포인트가 아닌 Bedrock만 된다. LLM 게이트웨이, Claude for Government와 ZDR이나 HIPAA 구성 조직은 제외된다. 권한 면에서는 auto와 `bypassPermissions` 모드에서 어느 모드도 자동 승인하지 않는 호출을 빼면 스크립트가 확인 없이 끝까지 돌 수 있고, auto 모드 분류기는 개별 호출이 아니라 코드를 보므로 실행 중 계산된 값은 보지 못한다. 샌드박스 설정은 스크립트가 실행하는 셸 명령에만 적용되고 JavaScript 자체와 파일, 웹, MCP 도구 호출은 샌드박스 밖에서 돈다. 스크립트마다 승인하려면 `"ask": ["REPL"]`을 두고, 스크립트 안의 호출은 원래 도구 이름(`Bash` 등)의 deny/ask 규칙과 `PreToolUse` 훅으로 통제한다. Bash 규칙은 명령 문자열을 매칭하므로 규칙이 잡지 못하는 형태로 같은 명령이 실행될 수 있다. v2.1.329 이상에서는 훅이 타임아웃이 아닌 오류로 실패하면 기본으로 호출이 권한 검사로 넘어가므로, 반드시 막아야 하는 호출은 command나 http 훅의 `onFailure`를 block으로 둔다
- 팀 관측: OpenTelemetry 메트릭(비용, 토큰, 코드 라인 수)을 팀 속성으로 분해해 대시보드화

## 서비스 정책 변화와 재현 보고를 구분한다

같은 CLI 버전이라도 모델과 서버가 제공한 정책에 따라 작업 거부가 달라질 수 있다. 재현 기록에는 버전, 모델, 작업 유형, 입력과 거부 내용을 남긴다. 거부 사례를 곧바로 법률상 금지 범위나 모든 모델의 기능 한계로 해석하지 않는다.

### 사례: 특정 게임 재구현 제한

Game Developer의 2026-10-30 기사(같은 날 Anthropic 확인을 반영해 갱신)에 따르면 Anthropic 대변인은 기술 스태프 Addy Osmani의 X 발언을 확인 자료로 제시했다. 그 발언은 Opus 5.5용 Claude Code 프롬프트에 특정 게임의 재구현을 피하도록 두 문장을 넣었고, 이유는 Claude로 지식재산권을 침해하는 일이 이용 정책 위반이기 때문이며, 독창적인 게임, 장르 게임과 사용자 자신의 디자인과 에셋으로 만든 게임은 계속 동작해야 한다는 내용이다. 규칙 문구 자체는 한 X 사용자가 10월 27일경 반영된 규칙 갱신에서 찾았다고 보고하고 기사가 옮긴 것이다. 독창적인 게임, 장르 게임과 사용자 자신의 디자인과 에셋으로 만든 게임은 만들되, 이름을 바꾸거나 독창적이라고 불러도 특정 기존 게임의 재현은 만들지 말라는 두 문장이다. Anthropic이 확인한 것은 두 문장을 추가한 사실과 의도이며 이 문구가 정확하다고 확인하지는 않았다. 기사는 공식 발표나 변경 기록을 언급하지 않고, 당사자 X 게시물 원문은 열어 보지 못했다.

- **문구는 바뀔 수 있다:** 같은 발언은 균형을 맞추도록 계속 고쳐 가겠다고 덧붙였다. 2026-11-23 무인 Claude Code 실행(Opus 5.5, CLI 버전은 기록하지 않음)에서 작성 에이전트가 읽은 자기 지침은 비슷한 메커니즘의 게임도 허용 쪽에 두고, 재현의 기준으로 이름, 캐릭터, 아트, 음악, 레벨과 외형을 열거했다. 사용자가 보고한 문구와 다르지만, 개정 때문인지, 실행 환경의 차이인지, 인용이 줄인 것인지는 확인하지 못했다. 한 실행의 관찰이며 공식 공개 문서로 대조하지 않았다. 거부를 재현해 기록할 때는 날짜, CLI 버전과 모델을 함께 남긴다.
- **소유 여부는 확인할 수 없다:** 기사도 Claude가 사용자의 아이디어와 에셋 소유를 어떻게 판별하는지 불분명하다고 지적한다. 정당한 작업이 거부되면 우회 문구를 찾기보다 자기 디자인과 에셋이라는 사실과 범위를 요청에 드러내고, 그래도 막히면 `/feedback`으로 보고한다(적용 제안).
- **법률 판단과 구분한다:** 이 제한은 제품 정책이며 저작권 침해 여부를 판정하지 않는다. 이전에 단서로만 남겼던 모딩과 역공학 거부 사례와 내부 플래그 이름은 여전히 1차 출처로 확인하지 못했고, 비활성화 설정이 없다는 주장은 같은 X 사용자의 보고를 기사가 전한 것이다. 우회 설정이나 내부 플래그 조작 절차로 바꾸지 않는다.

## 트러블슈팅 — 진단 순서

- 원인을 모르면 `/doctor`부터 (설치 상태, 설정, 확장(사용하지 않는 스킬, MCP 서버, 플러그인, 느린 훅), CLAUDE.md와 권한을 점검하고 확인을 받아 수정). 세션 없이 읽기 전용 설치 진단은 `claude doctor`, 키바인딩 경고는 `--debug` 로그에 남는다. 세션 로그 분석은 `/debug`
- 성능 저하의 최다 원인은 커진 컨텍스트. 압축 직후 다시 차오르는 스래싱이면 파일을 라인 범위로 읽거나 조사를 서브에이전트로 위임
- 인증 대표 함정: 셸 프로필에 남은 낡은 ANTHROPIC_API_KEY가 구독 OAuth를 조용히 오버라이드 — `/status`로 활성 자격 증명 확인
- 설정 디버깅은 "실제로 뭐가 로드됐나"부터: /status, /context, /permissions, /hooks. 흔한 실수 — 훅 matcher를 배열로 작성(단일 문자열이어야 함), permissions를 엉뚱한 파일에 배치, 서브에이전트가 CLAUDE.md를 상속한다고 가정
- 에러: 일시 오류는 지수 백오프로 자동 재시도되므로 기다리는 게 먼저. 용량 초과(529)는 모델 전환(용량은 모델별), 컨텍스트 초과는 /compact
- 요청 압축: 2026-11-02 확인한 변경 기록 기준으로 2.1.300부터는 텔레메트리를 꺼도 api.anthropic.com으로 가는 큰 요청을 gzip으로 압축하며, `CLAUDE_CODE_GZIP_REQUEST_BODIES=0`으로 끌 수 있다. 이 항목은 압축을 적용하는 크기 기준, 가리키는 텔레메트리 설정, 텔레메트리를 켠 세션에서 압축이 시작된 버전과 LLM 게이트웨이나 제3자 플랫폼 경로의 적용 여부를 적지 않는다. 작은 요청은 되는데 요청이 커질 때만 실패하고 TLS를 풀어 본문을 검사하는 프록시나 보안 장비를 거친다면 이 변수로 압축을 끈 실행과 비교한다(적용 제안). 응답 쪽은 별개로, 2.1.316에서 압축된 응답이 잘리거나 손상될 때 일부 네트워크 요청이 멈추던 문제를 고쳤으므로 요청이 멈추면 버전부터 확인한다
- **품질이 나빠졌다면 컨텍스트와 하네스부터 확인한다** — 전체 모델 ID로 고정했다면 가중치는 바뀌지 않지만 별칭이 가리키는 모델, Claude Code 버전과 기본값(effort, 시스템 프롬프트)은 바뀔 수 있다([[Eval-Model-Drift-Monitoring|서빙 모델 드리프트 감시]]). 컨텍스트 압박, 낡은 CLAUDE.md를 확인하고, 잘못된 답변에 수정을 이어가기보다 되감고(rewind) 더 구체적으로 재프롬프트하는 편이 낫다
- **adaptive thinking 끄기 팁은 모델을 확인한다**: 품질 저하를 느낄 때 settings.json의 `env`에 `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1`과 `MAX_THINKING_TOKENS`를 넣었더니 같은 작업의 재프롬프트 횟수가 줄었다는 커뮤니티 보고가 있다(2026-04, 개인 비교). 공식 환경 변수 문서(2026-09-29 확인) 기준 이 변수는 Opus 4.6과 Sonnet 4.6에서만 adaptive reasoning을 끄고 `MAX_THINKING_TOKENS` 고정 예산으로 돌리며, Opus 4.7 이후, Sonnet 5 이후와 Fable 모델에는 효과가 없다. adaptive 모델에서는 `MAX_THINKING_TOKENS`의 0이 아닌 값도 무시된다. 현재 모델에서는 effort 수준(`/effort`, `CLAUDE_CODE_EFFORT_LEVEL`)으로 조절하고, 효과는 같은 과업의 재프롬프트 횟수처럼 비교 가능한 지표로 판정한다

## 안티패턴 5종

뒤죽박죽 세션(→ 작업 전환 시 /clear), 반복 수정 실패(→ 2회 실패면 /clear 후 배운 것을 반영한 재프롬프트), 비대한 CLAUDE.md(→ 스킬로 분리), 검증 없는 신뢰(→ 테스트와 기대 출력 제공), 무한 탐색(→ 범위 축소, 서브에이전트 위임).

대형 코드베이스는 경계 설계로 대응: 시작 디렉토리로 범위 결정, 디렉토리별 CLAUDE.md(온디맨드 로드), Read deny로 dist와 vendor 차단, `--add-dir`로 필요한 곳만 추가.

## 체크포인트

- 성능 저하와 비용 폭증의 공통 제1 원인 (컨텍스트)과 대응 순서
- CI에서 에이전트를 태울 때의 안전장치 4종과 모델 버전 고정이 필수인 이유
- 로컬 `/code-review`, 클라우드 `/code-review ultra`, 관리형 Code Review의 실행 위치, 과금과 REVIEW.md 반영 차이(관리형은 반영, 로컬은 읽지 않음, ultra는 ultrareview 문서에 언급 없음, 2026-10-12 기준)
- 품질 저하 시 확인 순서 (컨텍스트, CLAUDE.md, CLI 버전과 기본값 변경, 재프롬프트), 커뮤니티 설정 팁이 현재 모델에 적용되는지
- /btw와 서브에이전트의 트레이드오프
- 안티패턴 5종과 각각의 처방

## 출처

- [Claude Code 공식 문서, CLI reference](https://code.claude.com/docs/en/cli-usage)
- [Claude Code 공식 문서, Environment variables](https://code.claude.com/docs/en/env-vars)
- [Run Claude Code programmatically — bare mode](https://code.claude.com/docs/en/headless#start-faster-with-bare-mode)
- [Run Claude Code programmatically — auto-approve tools](https://code.claude.com/docs/en/headless#auto-approve-tools) — 2026-11-24, `--allowedTools`의 사전 승인, Manual 모드 시작(v2.1.302), dontAsk, `--permission-prompts none`(v2.1.259)과 `permissions.denyInsteadOfPrompting` 대조. 이 범위만 확인했으며 frontmatter의 검증일은 유지
- [Claude Code 공식 문서, Fast mode](https://code.claude.com/docs/en/fast-mode)
- [Claude Code 공식 문서, Manage costs](https://code.claude.com/docs/en/costs)
- [Claude Code 공식 문서, Settings reference](https://code.claude.com/docs/en/settings-reference)
- [Claude Code 공식 문서, Prompt caching](https://code.claude.com/docs/en/prompt-caching)
- [Claude Code 공식 문서, Model configuration](https://code.claude.com/docs/en/model-config) — 2026-11-09 effort 안내와 max 경고, 기본 자동 압축 경계 확인
- [Claude Code 공식 문서, Monitoring](https://code.claude.com/docs/en/monitoring-usage) — 2026-11-14 비용 counter의 `query_source` 값 확인
- [Claude Code 공식 문서, Create custom subagents](https://code.claude.com/docs/en/sub-agents) — 2026-11-14 fork 모드 기본값과 `CLAUDE_CODE_FORK_SUBAGENT` 확인
- [Claude Code 공식 문서, Code Review](https://code.claude.com/docs/en/code-review)
- [Claude Code 공식 문서, Find bugs with ultrareview](https://code.claude.com/docs/en/ultrareview)
- [Claude Code 공식 문서, Commands](https://code.claude.com/docs/en/commands)
- [클로드 코드 가이드 (레퍼런스 03 기본 사용법, 13 CI/CD, 14 CLI, 16 베스트 프랙티스, 17 트러블슈팅) — WikiDocs](https://wikidocs.net/book/19104)
- [Claude Code 품질 저하 때 adaptive thinking 끄기 — Threads, withfox](https://www.threads.com/@withfox/post/DXDx0mhCX4z)
- [Claude Code 2026 — YouTube, 토비의 스프링](https://www.youtube.com/watch?v=Y2mEVnN-FKY) — 2026-10-11, 2026년 변경을 소개하는 TTS 내레이션 영상. 로컬 리뷰와 ultra 리뷰 항목의 단서로만 쓰고 내용은 공식 문서로 대조
- [Claude Code CHANGELOG — GitHub, anthropics/claude-code](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) — 2026-11-02, 2.1.300의 요청 압축과 2.1.316의 압축 응답 수정 항목 확인. 2026-11-09, 2.1.299, 2.1.302, 2.1.305, 2.1.314, 2.1.318의 유휴 압축과 `/usage` 항목 확인. 2026-11-14, 2.1.323의 `CLAUDE_CODE_DISABLE_AGENT_PROGRESS_SUMMARIES` 추가 항목 확인. 2026-11-25, 2.1.319의 auto 모드 서버 검사, 종료 코드 수정, `permissions.denyInsteadOfPrompting`과 feature flag 항목, 2.1.326의 자체 분류기 사용량 항목, 2.1.327의 폴백 제거 예고 확인. 2026-11-26, 2.1.323의 Code Mode 추가, 2.1.329의 훅 실패 처리, 2.1.331의 클라우드 제공자 터미널 세션 지원과 `--bare` 수정, 2.1.332의 `claude -p` 재개 수정 항목 확인
- [Claude Code 공식 문서, Code Mode](https://code.claude.com/docs/en/code-mode) — 2026-11-26 실험 상태, 켜고 끄는 변수, Requirements, 제한 사항, 권한, 훅 실패와 샌드박스 경계 대조. 변수를 둘 수 있는 위치는 Settings reference로 대조. 이 범위만 확인했으며 frontmatter의 검증일은 유지
- [클로드코드 미친 신기능 Code Mode, 5시간/주간 한도가 더 오래 간다 — YouTube, 잔재미코딩(DaveLee)](https://www.youtube.com/watch?v=8ylzY9PrNJ4) — 2026-11-15 Shorts. Code Mode 항목의 단서로만 쓰고 내용은 공식 문서와 변경 기록으로 대조. 제작자의 비교 측정(링크 찾기 약 50%, 파일 수정 약 20% 토큰 감소)은 재현하지 않은 개인 관찰이라 본문에 옮기지 않음
- [Claude Code 공식 문서, Permission modes](https://code.claude.com/docs/en/permission-modes) — 2026-11-25 `-p`에서 분류기 차단 뒤 실행을 이어 가는 동작과 서버 검사 폴백 서술 확인
- [Claude Code 2.1.319 auto 모드, 권한 거부, MCP 태스크 점검 — YouTube, 길리랩](https://www.youtube.com/watch?v=p4vCkzg2Pf4) — 2026-11-15 Shorts. auto 모드 항목의 단서로만 쓰고 내용은 변경 기록으로 대조. MCP task 항목은 세션 종류별 조건을 정리하지 못해 옮기지 않음
- [클로드 코드 숨은 신기능, 모르면 사용량 손해봅니다 딱 2개 — YouTube, 잔재미코딩(DaveLee)](https://www.youtube.com/watch?v=U-5FEwY8Rm0) — 2026-10-28 Shorts. 유휴 압축과 `/usage` 항목의 단서로만 쓰고 내용은 변경 기록과 공식 문서로 대조. 제작자의 1회 측정(약 53분 뒤 314K에서 62K 토큰으로 감소)은 재현하지 않은 개인 관찰이라 본문에 옮기지 않음
- [Claude Code burns ~15-20% of your tokens on a 3-word status line: a Bun preload that turns agent_summary off — GitHub Gist, Flamerix AI](https://gist.github.com/flamerix-ai/c3905705cc4205e5de3011fa2e74efce) — 2026-11-14 확인. 제목의 비율, 호출 주기, 비용 비중과 로그 누락은 작성자의 측정과 주장이며 공식 수치가 아님
- [These 5 Words Cost 12% of Your Claude Code Usage — YouTube, Better Stack](https://www.youtube.com/watch?v=F4h3a8HFBSE) — 2026-11-01. 진행 요약 비용 항목의 단서로만 쓰고, 영상의 측정치(12%, 8%)는 재현하지 않은 제작자 개인 측정이라, 영상이 전한 Anthropic 측 비율은 원문을 확인하지 못해 옮기지 않음
- [Claude now 3x FASTER — YouTube, The PrimeTime](https://www.youtube.com/watch?v=AL89pwVdI9g) — 2026-10-22 Shorts. 요청 압축 항목의 단서로만 쓰고, 영상의 속도 배수는 변경 기록에서 확인되지 않아 옮기지 않음
- [Anthropic orders AI tool Claude to stop remaking video games — Game Developer, Bryant Francis](https://www.gamedeveloper.com/programming/anthropic-appears-to-have-ordered-ai-tool-claude-to-stop-remaking-video-games) — 2026-10-30(같은 날 Anthropic 확인 반영 갱신). 2026-11-23 X 사용자가 보고한 두 문장, 대변인이 제시한 Osmani 발언과 허용 범위 대조. Osmani의 X 게시물 원문은 열어 보지 못함
- [클로드 코드, 게임 복제 거절한다 — YouTube, 큰돌의터전](https://www.youtube.com/watch?v=sEQs7QEnzSA) — 2026-11-06 Shorts. 게임 재구현 제한 사례의 단서로만 씀. 영상이 전한 이슈 트래커 사례는 1차 출처로 확인하지 못했고, 게임사의 플레이 테스트 취소는 위 기사에도 있으나 게임사 발표는 확인하지 않았으며 운영 주제와 멀어 옮기지 않음

- 사용자 제공 GeekNews 알림(2026-11-02 09:33, 10:10) — Claude Code 게임 재구현 제한과 모딩 거부 사례. 발언 원문, 적용 범위와 실제 재현 미확인.

## 관련 문서

- [[Claude-Code-Fundamentals|Claude Code 기초 (세션, 컨텍스트 관리)]]
- [[Claude-Code-Extension-Reference|Claude Code 확장 메커니즘]]
- [[Claude-Code-Business-Automation|Claude Code 비즈니스 자동화 (스케줄 3계층)]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택, 라우팅]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산]]
