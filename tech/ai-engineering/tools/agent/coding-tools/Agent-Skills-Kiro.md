---
tags: [ai, skills, kiro, hook, steering, mcp]
status: done
verified_at: 2026-10-26
category: "AI엔지니어링(AIEngineering)"
aliases: ["Kiro Hooks", "Kiro Skills", "Kiro Powers", "Kiro Steering", "Kiro MCP"]
---

# Kiro Steering, 훅, 스킬, MCP와 Powers

[[Agent-Skills|에이전트 스킬]]에서 분리한 Kiro 문서다. 스킬의 정의와 SKILL.md 구조, 점진적 공개, Claude Code와 Codex의 관례 비교, 스킬과 훅의 구분은 그 문서에 두고, 여기서는 Kiro의 Steering, Hooks, Skills, MCP 설정과 Powers를 다룬다.

## Kiro Steering: 포함 모드와 적용 범위

이 절은 2026-10-26 Kiro 공식 문서로 확인한 부분 검증이다. Steering은 프로젝트의 관례와 기준을 Markdown 파일로 두어 대화마다 다시 설명하지 않게 하는 지속 지침이다.

- workspace steering은 `.kiro/steering/`에 두고 그 workspace에만 적용한다. global steering은 `~/.kiro/steering/`에 두고 모든 workspace에 적용하며 IDE와 CLI에서 쓴다. Web의 클라우드 sandbox는 이 로컬 폴더를 읽지 못한다. 둘의 지침이 충돌하면 workspace steering을 우선한다.
- `AGENTS.md`는 global steering 위치나 workspace 루트에 두면 자동으로 읽고 workspace 하위 디렉터리에서도 발견한다. 포함 모드 없이 항상 포함 대상이다(custom agent의 상속 해제는 아래 예외다. 신뢰 전 미로드 목록은 Steering files만 적어 신뢰하지 않은 workspace에서 `AGENTS.md`도 빠지는지는 문서로 확인되지 않는다). 다른 호스트의 발견 규칙은 [[Agent-Repository-Instructions-Hosts|AGENTS.md 호스트별 발견과 적용]]에서 비교한다.
- front matter는 파일 맨 앞의 `---` 사이에 두는 YAML이며 앞에 빈 줄이나 다른 내용이 있으면 안 된다.

| `inclusion` | 로드 시점 | 적합한 내용 예 |
|---|---|---|
| `always` (기본값) | 모든 상호작용 | workspace 전반의 기준, 기술 선호, 보안 정책과 코딩 관례. 기초 파일 `product.md`, `tech.md`, `structure.md`는 기본 포함 |
| `fileMatch` | 작업 파일이 `fileMatchPattern`(문자열 또는 배열)에 맞을 때 | 컴포넌트 패턴, 테스트 방식처럼 특정 파일 유형에만 적용되는 기준 |
| `manual` | 채팅에서 `#파일이름`으로 참조하거나 `/` 슬래시 명령으로 고를 때 | 문제 해결 가이드, 마이그레이션 절차처럼 가끔만 필요한 특화 절차와 긴 문서 |
| `auto` | 요청이 `description`과 맞을 때. `name`, `description` 필수, 슬래시 명령에도 표시 | API 설계 관례처럼 경로보다 작업 주제로 고를 지침 |

Kiro CLI의 V1/V2/V3는 세션이 쓰는 에이전트 엔진 구분이며 2.31, 2.33 같은 CLI 릴리스 번호와 다르다. V3는 기존 2.x 설치와 함께 실행되며 `kiro-cli --v3`로 대화형 세션을 시작할 수 있다. V3는 네 모드를 모두 지원한다. V1/V2에서는 `always` 파일이 자동 로드되고 `fileMatch`와 `manual`은 자동 로드에서 제외되며, V3의 완전한 매칭과 활성화 동작을 제공하지 않는다. `auto`의 V1/V2 동작은 공식 문서에 없다. custom agent 설정 레퍼런스(IDE 1.0과 CLI V3 형식)는 custom agent가 기본 steering, 스킬과 `AGENTS.md`를 자기 리소스와 함께 상속한다고 설명하고, CLI 2.10 변경 기록은 2.7.0부터 자동 상속되며 2.10에서 해제 설정을 더했다고 적는다. CLI 설정 `chat.disableInheritingDefaultResources`(기본값 `false`, 전역 또는 workspace 범위)를 `true`로 두면 custom agent는 이 기본 리소스를 받지 않고, built-in agent는 설정과 관계없이 상속한다. 상속을 끈 뒤 workspace steering과 스킬을 다시 넣으려면 레퍼런스 예시처럼 `resources`에 `file://.kiro/steering/**/*.md`와 `skill://.kiro/skills/**/SKILL.md`를 넣는다(레퍼런스 예시에 근거한 조합). Steering 페이지는 custom agent에 steering이 자동 포함되지 않는다고 적어 설정 레퍼런스, 변경 기록과 어긋나고, IDE에 같은 해제 설정이 있는지는 문서에 없다(2026-10-26 기준). Kiro CLI 2.33 이상의 대화형 V3 세션은 신뢰하지 않은 workspace의 steering을 로드하지 않는다(아래 MCP 절의 workspace 신뢰).

운영 점검 제안: `always`는 모든 상호작용의 컨텍스트에 들어가므로 짧은 공통 기준만 두고, 나머지는 경로, 직접 호출과 작업 주제에 따라 나눈다([[Agent-Context-Budget#패턴 3 — 스킬, 지침 문서: Catalog-First|Catalog-First 로딩]]). `auto`의 description에는 공식 예시처럼 언제 쓰는지 적는다. 공식 모범 사례는 파일당 한 영역을 두고, 기준뿐 아니라 결정 이유를 적으며, API 키와 비밀번호 같은 민감 정보를 넣지 않도록 권한다. steering이 로드됐다는 사실과 생성 결과의 준수는 따로 확인한다.

## Kiro Hooks의 자동 실행과 차단 경계

2026-10-10 Kiro 공식 문서의 부분 검증이며, CLI V3 표기, `matcher`와 종료 코드는 2026-10-26에 다시 확인했다. IDE 1.0과 CLI V3의 현재 형식은 `.kiro/hooks/<id>.json`이며 `version: "v1"`, `hooks` 배열, PascalCase `trigger`, `action`과 선택적 `matcher`를 사용한다. `matcher`는 파일 이벤트에서 파일 경로 정규식이고, `PreToolUse`/`PostToolUse`에서 도구 선택자(`@mcp`, `@<server>` 등)나 도구 ID 정규식이며, 생략하면 항상 일치한다. 이전 IDE의 설정 예제를 현재 형식으로 복사하지 않는다.
- `command`는 셸 명령을 실행하고 `agent`는 현재 대화에 프롬프트를 전달한다. 저장 후 테스트 생성 요청은 결과를 별도로 확인한다.
- 종료 코드의 의미는 공식 페이지끼리 어긋난다(2026-10-26 기준). Hook actions 페이지(2026-10-10 갱신)는 0 이외 종료 코드를 오류로 전달하고 Pre Tool Use에서는 도구 실행을, Prompt Submit에서는 프롬프트 제출을 차단한다고 적는다. IDE 1.x Hooks 페이지(2026-08-21 갱신)는 종료 코드 2만 `PreToolUse`, `UserPromptSubmit`, `PreTaskExec`를 차단하고 다른 0 이외 코드는 차단이 아닌 오류로 본다. CLI의 Exit codes 레퍼런스(2026-10-05 갱신)는 종료 코드 2의 차단을 `PreToolUse` 전용으로, 그 밖의 코드를 훅 실패(STDERR 경고)로 두고, CLI V3 훅 마이그레이션 표(2026-10-10 갱신)는 `PreToolUse`와 `PreTaskExec`를 차단 가능으로 표시한다. CLI V3의 `UserPromptSubmit` 훅은 프롬프트를 거부하지 않고 0 이외 종료 시 훅 출력과 종료 코드를 에이전트에 맥락으로 넘기며, `Stop` 훅은 종료 코드 1로 한 턴 더 진행하게 할 수 있다. Claude Code의 종료 코드 2 규칙과 같거나 다르다고 단정하지 않는다.
- 운영 점검 제안: 테스트 실행과 생성 요청을 나누고, 차단이 필요한 검사는 실제 거부 사례로 확인한다. 사후 검사 실패를 이미 수행된 변경의 자동 취소로 해석하지 않는다.

## Kiro Skills: 이식 가능한 형식과 호스트 동작을 구분한다

이 절은 2026-10-10 Kiro 공식 문서의 부분 검증이다.

- `.kiro/skills/`는 프로젝트 범위, `~/.kiro/skills/`는 전역 범위다. 같은 이름이면 프로젝트 스킬이 우선한다. 전역 폴더 지원은 IDE와 CLI 기준이며 Web과 Mobile까지 확대하지 않는다.
- 이름과 description으로 발견하고, 요청에 맞으면 본문을 읽는다. `/스킬이름`으로 직접 호출할 수도 있다. 카탈로그 비용과 실제 활성화된 본문 비용을 구분한다.
- GitHub에서 가져올 때는 저장소 루트가 아닌 스킬 하위 폴더나 `SKILL.md` URL을 사용한다. 가져오기는 스킬 디렉터리로 복사하는 동작이므로 원본의 후속 변경까지 자동 동기화된다고 가정하지 않는다.
- 공통 형식으로 지침을 옮겨도 스크립트의 실행 도구와 네트워크 요구는 남는다. `compatibility`로 환경 요구를 적고 실제 호스트에서 확인한다.

이식 점검 제안: 지침 로드, 필요한 실행 파일의 존재, 스크립트의 실제 성공을 각각 확인한다. 스킬이 목록에 보이거나 활성화됐다는 사실만으로 작업 완료나 권한 부여를 판단하지 않는다.

## Kiro MCP: 설정 범위와 도구 승인

이 절은 2026-10-26 Kiro 공식 문서로 확인한 부분 검증이다. MCP의 구조와 일반 통제 원칙은 [[MCP#통제와 보안: 권한이 생긴 만큼|MCP의 통제와 보안]]에 두고, 여기서는 Kiro의 설정과 승인 동작을 다룬다.

- workspace의 `.kiro/settings/mcp.json`은 현재 workspace에만, user의 `~/.kiro/settings/mcp.json`은 IDE와 CLI에서 모든 workspace에 적용한다. 두 파일이 있으면 병합하며 workspace 설정이 우선한다.
- 같은 이름의 서버는 agent 설정의 `mcpServers`, workspace, user 순으로 우선순위가 가장 높은 정의만 쓰고, 이름이 다른 서버는 함께 쓴다. custom agent의 `includeMcpJson: true`는 agent 자체 서버에 더해 user와 workspace 서버를 쓰게 한다.

| 필드 | 대상 | 의미 |
|---|---|---|
| `command`, `args` | 로컬 stdio | 실행 명령(필수)과 인자 |
| `url`, `headers` | 원격 | HTTPS 엔드포인트(localhost는 HTTP 허용, 필수)와 연결 헤더. 인증이 필요하면 `oauth`를 쓰며, 서버 항목의 `oauthScopes`는 `oauth.oauthScopes`가 없을 때의 대체값 |
| `env` | 로컬, 원격 | 서버 프로세스 환경 변수 |
| `disabled` | 로컬, 원격 | 서버 비활성화, 기본값 `false` |
| `autoApprove` | 로컬, 원격 | 확인 없이 실행할 도구 이름. `"*"`는 모든 도구 |
| `disabledTools` | 로컬, 원격 | 에이전트 호출에서 뺄 도구 이름 |

IDE는 `${VAR}` 참조(공식 예시는 `env`와 `headers`) 가운데 승인한 환경 변수만 확장한다. CLI는 실행 전에 셸에서 내보낸 변수를 참조하며 프로젝트 `.env`를 자동으로 읽지 않는다.

Kiro IDE 1.3 이상은 Tool Search를 자동으로, Kiro CLI 2.31 이상의 로컬 V3 세션은 기본으로 써서 모델에 모든 도구 정의 대신 간략한 목록을 주고 필요한 도구만 불러온다. V2 세션에서는 `toolSearch.enabled`로 켜는 opt-in이며, MCP 도구 정의가 기본값 기준으로 컨텍스트 창의 5%(`toolSearch.minPct`)나 50,000 토큰(`toolSearch.minTokens`) 중 하나를 넘으면 활성화된다. 도구 정의 검증은 Tool Search와 별개다. 도구 이름이 서버 접두사를 포함해 64자를 넘거나 `^[a-zA-Z][a-zA-Z0-9_]*$`에 맞지 않거나 description이 비면 그 도구는 검증 오류로 제외된다.

승인은 다음 층으로 나눠 확인한다. `permissions.yaml` 규칙과 그 승인 흐름은 IDE와 Kiro CLI V3 세션에 적용되며, CLI V2의 지속 신뢰 설정은 도구별 `toolsSettings` 규칙이다(V2 신뢰 설정을 바꾼 뒤 생성된 V3 규칙을 맞추려면 `/upgrade-agent`를 다시 실행). Web은 둘 다 쓰지 않고 권한 확인 대신 관리형 클라우드 sandbox를 쓰며, 저장소의 `.kiro/settings/mcp.json`에 둔 로컬 MCP 서버를 로드한다.

- MCP 도구는 실행 전에 승인을 요청한다. 반복 승인은 서버의 `autoApprove`에 도구 이름을 넣거나 승인 화면의 지속 선택으로 줄인다.
- IDE의 채팅 승인 창은 이번 호출만 정하는 Allow, Deny를 보여 주고, 작동하는 저장 규칙을 만들 수 있을 때만 Always allow, Always deny도 보여 준다. Always allow는 패턴과 적용 범위를 고르며, 범위는 모든 workspace(`~/.kiro/settings/permissions.yaml`), 이 workspace(`~/.kiro/workspace-roots/<hash>/permissions.yaml`), 세션 종료까지의 메모리다. workspace 범위 규칙도 저장소 밖의 사용자별 파일이다.
- Kiro CLI V3는 Yes, Trust, No 패널로 묻는다. Trust 선택기의 저장 범위는 현재 세션이 기본값이고 `s` 키로 session, workspace, user를 바꾸며, workspace와 user 승인은 V3 permission store에 남는다.
- permission 규칙은 deny 우선(deny > ask > allow)으로 평가하고, 범위 사이의 우선순위 없이 가장 제한적인 효과를 적용한다. MCP 규칙은 `my-server/*`처럼 서버와 도구 이름으로 지정한다. 예외로 로컬 command sandbox의 `sandbox_network` 호스트 규칙은 순서대로 적용해 처음 맞는 규칙이 결정하므로, 구체적인 deny를 그 호스트도 포함하는 넓은 allow보다 앞에 둔다.
- 공식 모범 사례는 민감한 시스템에 쓰기 권한이 없고, 검증된 코드의 신뢰할 수 있는 출처에서 왔으며, 자주 쓰고 접근 범위가 좁은 도구만 자동 승인하고, 위험한 작업은 `disabledTools`로 막도록 권한다. `autoApprove`에 넣은 도구도 신뢰하지 않은 workspace에서는 호출마다 묻고, 일치하는 deny 규칙이 있으면 거부된다.
- Kiro CLI 2.33 이상의 대화형 V3 세션은 신뢰하지 않은 workspace에서 처음 시작하면 신뢰 여부를 묻는다. 이 확인 화면은 Kiro CLI 전용이다. 신뢰 전에는 workspace의 custom agent, steering, MCP 서버 설정과 스킬을 로드하지 않고, 저장된 허용 규칙이나 `autoApprove`가 있어도 MCP 도구 호출과 Power의 활성화, 콘텐츠 읽기와 도구 호출마다 묻는다. 일치하는 deny 규칙은 그대로 거부한다. CLI 2.34 이상의 `--trust-workspace`는 한 번의 V3 실행에만 신뢰를 주고 저장하지 않는다. `--no-interactive` 실행과 V1/V2 세션은 묻지 않고 workspace 설정을 로드한다.
- workspace 서버는 그 프로젝트를 열었을 때만 시작하지만, workspace 설정은 서버 목록을 나눌 뿐 접근을 격리하지 않는다. 로컬 command sandbox나 다른 OS 제한이 없으면 workspace 서버도 사용자 계정의 파일, 자격 증명, 환경 변수와 네트워크에 접근할 수 있다.
- 로컬 command sandbox는 Kiro IDE 1.3 이상과 Kiro CLI 2.31 이상의 로컬 V3 세션에서 쓸 수 있으며 기본으로 꺼져 있다. 전역 `~/.kiro/settings/sandbox.json`(CLI는 `$KIRO_HOME`을 설정하면 그 아래 `settings/sandbox.json`)이나 프로젝트 `<workspace-root>/.kiro/settings/sandbox.json`에서 `enabled`를 `true`로 켜고(IDE는 상태 표시줄의 Command sandbox를 선택하면 활성 설정 파일이 열린다) `mcpSandboxing`(기본값 `false`)을 `true`로 두면, stdio 서버를 셸 명령과 같은 OS 샌드박스, 네트워크 모드와 `sandbox_network` 규칙 아래에서 실행한다. 공식 예시는 두 값을 함께 켜며, sandbox를 끈 채 `mcpSandboxing`만 켰을 때의 동작은 문서에 없다. 프로젝트 파일은 전역에서 켠 MCP 감싸기를 끄지 못한다. 원격 HTTP/SSE 서버는 대상이 아니다. sandbox는 명령이 할 수 있는 일을 줄일 뿐 격리를 보장하지 않으며, 신뢰하지 않은 서버를 안전하게 만들지도 않는다.

운영 점검 제안: user 설정에는 여러 프로젝트에서 자주 쓰는 서버만, workspace 설정에는 그 프로젝트에 필요한 서버만 둔다. Tool Search가 정의 전송을 줄여도 연결한 서버마다 실행 주체와 접근 경로는 남는다. `"*"`는 그 서버의 모든 도구를 확인 없이 실행하게 하므로 쓰기 도구가 있는 서버에는 쓰지 않는다. `kiro://` 설치 링크의 확인 창은 명령과 인자를 보여 주지만 환경 변수와 헤더는 이름만 표시하므로 신뢰할 수 있는 출처만 쓰고 설치 뒤 설정을 확인한다. 자격 증명은 `${VAR}` 참조로 두고 자격 증명이 든 설정 파일을 커밋하지 않는다. 서버 쪽 보안 경계는 [[MCP-Security-Boundaries|MCP 보안 경계]]를 따른다.

## Kiro Powers: 도구와 지침을 함께 활성화한다

이 절은 2026-10-07 Kiro 공식 문서로 확인한 범위다.

Powers는 MCP 도구, 스킬과 지식을 함께 설치하고 작업 맥락에 따라 활성화하는 패키지다. 스킬이 작업 방법을 설명한다면 Power는 그 지침과 연결 도구를 함께 묶는다. 대화의 키워드에 맞는 Power를 로드하므로 모든 연동 문서를 처음부터 넣을 필요가 줄어든다. 실제 토큰 절감과 결과 품질은 작업별로 측정한다.

| 구성 | 역할 |
|---|---|
| `plugin.json` | 필수 manifest, 패키지 식별 정보와 활성화 `keywords` |
| `skills/<작업>/SKILL.md` | 선택한 작업의 지침, 필요하면 scripts와 references 포함 |
| `mcp.json` | 선택적 MCP 서버 연결 설정 |
| `dev.kiro/` | steering 같은 Kiro 전용 확장 |

과거 `POWER.md` 중심 예제를 현재 생성 규격으로 그대로 사용하지 않는다. 현재 공식 생성 가이드는 `plugin.json`을 요구하며 MCP 없는 스킬 전용 Power도 허용한다. 키워드 활성화는 지침을 선택하는 수단이며 생성 코드의 정확성을 보증하지 않는다.

### API 명세 연동에 적용하는 점검 순서

다음은 명세 조회와 코드 생성을 연결할 때의 설계 점검안이다. Power 설치만으로 자동 충족되는 기능은 아니다.

1. 필요한 API의 공식 명세 위치와 버전을 식별한다.
2. 조회 도구로 요청 경로, 필드, 인증과 오류 응답을 확인하고 관련 부분만 사용한다.
3. 지침에는 추측한 필드 사용 금지, 오류 처리와 검증할 응답을 적는다.
4. 생성 코드는 명세와 테스트 응답으로 대조한다. 명세 읽기와 실제 데이터 변경 권한은 구분한다.

## SageMaker Unified Studio의 원격 작업 경계

이 절은 2026-10-23 공식 문서로 확인한 부분 검증이다. Kiro를 로컬 IDE로 사용하면서 SageMaker Unified Studio Space의 파일과 클라우드 컴퓨트에 연결할 수 있다. Powers 설치와는 별개의 원격 접속 구성이다.

기존 domain, project와 Space를 준비하고, AWS Toolkit에서 해당 프로젝트의 IAM 역할 또는 IAM Identity Center 인증과 리전을 선택한다. Kiro용 SageMaker SSH Plugin과 Space의 remote access 활성화가 필요하다. 실행 중인 Space는 remote access를 켜기 위해 재시작할 수 있으므로 진행 중 작업을 확인한다. 공식 가이드는 최소 8 GB RAM을 요구한다.

서비스가 제공하는 `smus-context.md`를 `AGENTS.md`에서 연결하면 프로젝트 맥락을 에이전트에 전달할 수 있다. 서비스가 갱신하는 파일을 직접 수정하기보다 별도 지침 파일이나 `AGENTS.md`에 작업 조건을 적는다. 맥락 파일 제공이 IAM 권한 부여나 생성 결과의 검증을 대신하지 않는다.

다음은 데이터 파이프라인을 위임할 때의 점검 제안이다.

1. 접속한 Space, 역할과 리전을 확인한다. 원격 창의 파일 변경은 해당 Space에 반영된다.
2. 요구사항과 작업 순서에 사용할 데이터, 실행 엔진, 품질 규칙과 출력 위치를 적는다.
3. 생성된 코드와 품질 검사 결과를 실제 입력, 실패 규칙과 대조한다. 작업 완료 메시지로 데이터 정확성을 판정하지 않는다.
4. 생성한 메타데이터의 검토, 카탈로그 게시와 데이터 접근 허용을 별도로 확인한다. 세부 기준은 [[SageMaker-Catalog-Discovery|SageMaker Catalog의 메타데이터와 데이터 탐색]]을 따른다.

`Open in Kiro` 링크로 연 세션은 중단 시 자동 재접속하지 않는다. 해당 링크로 다시 연결하며, 이 링크 경로의 중단 없는 세션은 최대 12시간이다. 이 조건을 모든 원격 접속 방식에 일괄 적용하지 않는다.

## 출처

- [Kiro Docs, Hooks](https://kiro.dev/docs/hooks/)
- [Kiro Docs, Hook actions](https://kiro.dev/docs/hooks/actions/)
- [Kiro Docs, Hooks (What's new in IDE 1.0)](https://kiro.dev/docs/ide/whats-new-v1/hooks/)
- [Kiro Docs, Exit codes](https://kiro.dev/docs/reference/exit-codes/)
- [Kiro Docs, CLI V3 hooks migration](https://kiro.dev/docs/cli/v3/hooks-migration/)
- [Kiro Docs, Agent Skills](https://kiro.dev/docs/skills/)
- [Kiro Docs, Powers](https://kiro.dev/docs/powers/)
- [Kiro Docs, Create powers](https://kiro.dev/docs/powers/create/)
- [Kiro Docs, Steering](https://kiro.dev/docs/steering/)
- [Kiro Docs, Model Context Protocol (MCP)](https://kiro.dev/docs/mcp/)
- [Kiro Docs, MCP configuration](https://kiro.dev/docs/mcp/configuration/)
- [Kiro Docs, MCP tools](https://kiro.dev/docs/mcp/usage/)
- [Kiro Docs, Tool Search](https://kiro.dev/docs/mcp/tool-search/)
- [Kiro Docs, MCP best practices](https://kiro.dev/docs/mcp/security/)
- [Kiro Docs, Permissions](https://kiro.dev/docs/permissions/)
- [Kiro Docs, Local command sandbox](https://kiro.dev/docs/sandbox/)
- [Kiro Docs, What's new in CLI V3](https://kiro.dev/docs/cli/v3/)
- [Kiro Docs, Agent configuration reference](https://kiro.dev/docs/custom-agents/configuration-reference/)
- [Kiro CLI 2.10 changelog — Kiro](https://kiro.dev/changelog/cli/2-10)
- [Kiro Steering | Consistent Agent Behavior Across Every Task — Amazon Web Services](https://www.youtube.com/watch?v=3qGIYFnTYnM)
- [Kiro MCP | Connect External Tools to Your Agent — Amazon Web Services](https://www.youtube.com/watch?v=Z9Y_DaOFqOE)
- [Amazon SageMaker Unified Studio, Kiro in Amazon SageMaker Unified Studio](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/kiro-for-smus.html)
- [Amazon SageMaker Unified Studio, Connecting to Amazon SageMaker Unified Studio Spaces](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/connecting-to-spaces.html)
- [Amazon SageMaker Unified Studio, Link to Kiro from Amazon SageMaker Unified Studio](https://docs.aws.amazon.com/sagemaker-unified-studio/latest/userguide/link-to-kiro.html)

## 관련 문서

- [[Agent-Skills|에이전트 스킬 (스킬 정의, SKILL.md 구조, 점진적 공개, 스킬 vs 훅)]]
- [[Claude-Code-Extension-Reference|Claude Code 확장 메커니즘 (종료 코드 2 차단 규칙과 훅 세부 메커니즘)]]
- [[Agent-Context-Budget|에이전트 컨텍스트 예산 (스킬과 지침 문서의 Catalog-First 로딩)]]
- [[MCP|MCP (외부 경계 확장)]]
- [[MCP-Security-Boundaries|MCP 보안 경계 (서버 자격 증명, 요청 검증과 게이트웨이)]]
- [[Agent-Repository-Instructions-Hosts|AGENTS.md 호스트별 발견과 적용 (다른 호스트의 지침 발견 규칙)]]
- [[SageMaker-Catalog-Discovery|SageMaker Catalog의 메타데이터와 데이터 탐색]]
