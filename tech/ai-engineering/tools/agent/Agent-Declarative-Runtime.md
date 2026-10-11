---
tags: [ai, agent, docker, runtime, a2a, mcp, declarative]
status: done
verified_at: 2026-10-11
category: "AI엔지니어링(AIEngineering)"
aliases: ["Docker Agent", "docker-agent", "cagent", "선언형 에이전트 런타임", "Declarative Agent Runtime"]
---

# 선언형 에이전트 런타임 (Docker Agent)

에이전트를 코드가 아니라 설정 파일로 정의하고, 모델 호출과 도구 실행, 위임과 스트리밍을 도는 루프는 런타임이 맡는 방식이다. 에이전트의 정의가 데이터가 되므로 버전 관리, 리뷰, 배포와 서비스 노출을 컨테이너처럼 다룰 수 있다. Docker Agent는 Docker가 만든 이 방식의 런타임이다. 에이전트판 `docker run`을 표방하며, 코드를 쓰는 프레임워크도 호스팅 SaaS도 새 모델도 아니라고 소개한다. 다만 docs.docker.com 개요는 같은 제품을 framework라고도 부르고 Go 라이브러리로 임베드하는 방법도 있다.

이 문서는 2026-10-11에 main 브랜치 문서(docker.github.io/docker-agent), docs.docker.com과 GitHub 저장소를 대조했고, 그날 최신 릴리스는 v1.150.0(2026-10-09)이다. main 문서에는 아직 릴리스되지 않은 기능이 있을 수 있고 docs.docker.com과 반영 시점이 다를 수 있다. 릴리스가 잦아 플래그와 스키마가 자주 바뀌므로 설치한 버전의 문서로 다시 확인한다.

## 이름과 설치 경로

- Apache-2.0 오픈소스다. Docker Desktop 4.49~4.62에서는 cagent라는 이름이었고 4.63부터 Docker Agent로 포함된다. 프로젝트는 v1.30.0(2026-03-09)에서 cagent에서 docker-agent로 이름 변경을 마쳤고, 이 릴리스부터 예전 `CAGENT_*` 환경 변수도 함께 받는다.
- Desktop에 묶인 버전은 최신 릴리스보다 늦을 수 있다. 2026-10-11 기준 Docker Desktop 4.94.0에는 v1.144.0이 들어 있다. Desktop 4.63 이상이 없거나 더 새 버전이 필요하면 `brew install docker-agent`로 설치하고 바이너리를 `~/.docker/cli-plugins/docker-agent`로 연결해 `docker agent`로 실행하며, 두 설치가 함께 있으면 실제로 실행되는 버전을 확인한다.
- v1.30.0 이전 자료(Desktop 4.62 이하 포함)는 `cagent` 명령과 예전 스키마를 쓸 수 있다. 런타임은 오래된 설정을 읽을 때 최신 스키마로 자동 변환하지만 명령과 키 이름은 현재 문서에 맞춘다.

## 정의를 설정으로 옮긴다

설정 전체에는 에이전트를 하나 이상 둔 `agents`가 필요하고, 에이전트 정의의 필수 키는 `model` 하나다(외부 코딩 CLI를 쓰는 `harness`를 두면 생략한다). 아래는 설명과 지시를 함께 둔 최소 예시다.

```yaml
agents:
  root:
    model: openai/gpt-5
    description: A helpful assistant
    instruction: You are a helpful assistant.
```

| 키 | 역할 |
|---|---|
| `model` | `openai/`, `anthropic/`, `google/`, `openrouter/`, Docker Model Runner의 `dmr/` 같은 공급자 접두사로 모델을 고른다. 공급자가 바뀌면 그 공급자의 자격증명과 설정도 함께 맞춘다 |
| `instruction`, `description` | 에이전트의 지시와 설명 |
| `toolsets` | `filesystem`, `shell`, `fetch`, `memory`, `think`, `todo` 같은 내장 도구와 `mcp`, `a2a`, `openapi` 연결 |
| `sub_agents`, `handoffs` | 다른 에이전트에게 일을 넘기는 방식(아래 위임 절) |
| `readonly` | 에이전트나 toolset 단위로 읽기 전용 도구만 허용 |
| `max_iterations`, `max_consecutive_tool_calls` | 루프 반복 상한(기본 0은 무제한)과, 이름과 인자가 같은 도구 호출이 연속될 때 에이전트를 끝내는 상한(기본 5) |

이름이 `root`인 에이전트가 있으면 그것이, 없으면 처음 정의한 에이전트가 진입점이고 `-a`로 바꿀 수 있다. MCP 서버는 `ref: docker:duckduckgo`처럼 Docker MCP Gateway의 컨테이너로 붙이거나(`docker mcp` CLI 플러그인과 Docker 엔진이 필요하며 보통 Docker Desktop의 MCP Toolkit으로 갖춘다), 명령과 인자로 stdio 서버를 띄우거나, 원격 URL로 연결한다.

도구 호출 루프를 직접 짠 코드와 같은 에이전트의 YAML 설정을 비교하면 줄 수 차이가 크지만, 더 중요한 차이는 루프의 소유자다. 직접 구현하면 루프를 한 줄씩 설명하고 고칠 수 있고, 런타임을 쓰면 루프와 권한 동작을 런타임의 버전과 문서에 맡긴다. 판단 기준: 정의를 파일로 배포하고 같은 정의를 API, MCP와 A2A로 노출하는 이점과, 잦은 릴리스를 따라가야 하는 비용을 비교한다. 분기와 상태 전이를 코드로 통제해야 하면 직접 구현이나 워크플로우 엔진을 함께 검토한다([[Production-Agent-Architecture#핵심 엔진: 프레임워크 vs 자체 구현|프레임워크 vs 자체 구현]], [[Agent-From-Scratch|에이전트 직접 만들기]]).

## 실행, 노출과 배포

| 명령 | 동작 |
|---|---|
| `docker agent run agent.yaml` | 터미널 UI로 대화한다. 별도의 `exec` 하위 명령은 없고 화면 없는 실행은 `run --exec`다 |
| `docker agent serve api` | HTTP API(기본 `127.0.0.1:8080`) |
| `docker agent serve mcp` | 기본은 stdio MCP 서버, `--http`면 `127.0.0.1:8081`. 에이전트를 지정하지 않으면 모든 에이전트를 각각 도구로 노출한다 |
| `docker agent serve a2a agent.yaml` | A2A 서버(기본 `127.0.0.1:8082`). `-a`로 노출할 에이전트를, `-l`로 주소를 정한다 |
| `docker agent serve chat` | OpenAI 호환 `/v1/chat/completions`(기본 `127.0.0.1:8083`) |
| `docker agent share push`, `share pull` | 설정을 OCI 레지스트리에 올리고 받는다. `docker agent run myorg/agent:tag`로 레지스트리의 정의를 바로 실행할 수도 있다 |

레지스트리에 올라가는 것은 에이전트 설정이며 YAML은 평문으로 올라간다. 따라서 API 키나 토큰을 YAML에 직접 적지 않고 실행 환경에서 주입한다. 남이 만든 에이전트를 실행하면 그 toolset이 내 환경과 자격증명으로 돈다. 운영 제안: 받은 정의는 실행 전에 toolset, MCP 명령, 원격 URL과 작성자가 정한 안전 모드(`runtime.safety`, 에이전트별 `safety`)를 읽는다. `share push --key`로 서명하고 `share pull --key`로 검증한 정의만 실행하며, digest 참조 실행을 설치한 버전이 지원하면 태그 대신 검토한 digest로 고정한다.

## 위임 방식 세 가지

| 방식 | 문맥 | 특징 |
|---|---|---|
| `sub_agents` | 자식이 새 하위 세션에서 정리된 작업 설명만 받는다 | `transfer_task` 도구가 자동으로 켜지고 확인 없이 승인된다. 부모는 자식의 결과를 기다린다 |
| `handoffs` | 같은 세션에서 전체 대화 이력을 넘긴다 | 대화의 주도권을 다른 에이전트로 옮긴다 |
| `a2a` toolset | 원격 A2A 에이전트를 도구처럼 호출한다 | 프로세스와 네트워크 경계를 넘는다. 인증 제약은 아래 A2A 단락을 본다 |

병렬 위임용 `background_agents`는 여기서 다루지 않는다. 같은 프로세스 안의 계층 위임과 원격 에이전트 호출을 모두 에이전트끼리의 대화로 묶으면 권한과 실패의 경계를 잘못 잡는다.

## 권한 경계를 설정으로 나눈다

로그를 읽는 분석 에이전트에만 로그 폴더 접근 도구를 주고, 다른 팀의 에이전트는 파일 도구 없이 그 에이전트를 A2A로 호출하게 하면 파일 접근은 한 에이전트로 모인다. 다만 A2A 엔드포인트가 로그 내용에 닿는 새 경로가 되므로 엔드포인트 인증, 호출자 구분과 응답에 담을 범위를 함께 정해야 데이터 접근이 실제로 제한된다. `readonly`와 `filesystem` toolset의 `allow_list`를 함께 지정했을 때의 동작은 설치한 버전에서 시험한 뒤 적용한다.

- `readonly: true`는 읽기 전용 도구만 허용한다. 읽기 전용 여부는 도구의 `ReadOnlyHint` 표시로 판정한다. MCP 도구의 이 표시는 서버가 스스로 붙이므로 신뢰하지 않는 서버의 도구에는 경계가 되지 못한다([[MCP#통제와 보안: 권한이 생긴 만큼|annotation의 신뢰 범위]]).
- `filesystem` toolset의 `allow_list`와 `deny_list`로 경로를 제한한다. `deny_list`가 우선하고, 상대 경로는 작업 디렉터리 기준이며, 심볼릭 링크는 먼저 해석한 뒤 범위를 검사한다. 이 목록은 파일 도구의 설정이므로 경로를 묶을 에이전트에는 `shell`을 주지 않거나 샌드박스를 함께 쓴다.
- 권한 규칙은 Deny, Allow, Ask 순으로 평가하고, 안전 모드를 정하지 않은 세션은 읽기 전용 도구만 자동 승인하고 나머지는 묻는다. 이 검사는 클라이언트 쪽에서 이뤄진다.
- 안전 모드에는 strict, balanced, restricted, autonomous가 있고 `--yolo`는 `--safety autonomous`의 예전 별칭이다. `serve a2a`, `serve mcp --http`, `serve chat`은 안전 모드를 정하지 않으면 restricted로 동작하며, YAML의 `safety: autonomous`는 이들의 시작을 막으므로 autonomous는 `--safety autonomous` 플래그로만 켠다.
- 클라이언트 쪽 권한 검사는 격리가 아니다. 신뢰하지 않는 정의는 `--sandbox`로 실행한다. 샌드박스는 Docker Agent가 구현하지 않고 Docker Sandboxes가 제공하며, PATH에 독립 `sbx` CLI가 있으면 그것을, 없으면 `docker sandbox` CLI 플러그인을 쓴다. VM은 기본 차단 네트워크 프록시 뒤에서 돈다.

Docker Agent끼리 A2A로 연결할 때는 인증 조합에 제약이 있다(2026-10-11 v1.150.0 태그와 main 문서 기준). 루프백이 아닌 주소로 `serve a2a`를 열려면 `--insecure-no-auth`로 노출을 명시하지 않는 한 `--auth-token`이 필요하다. 그런데 `a2a` toolset은 Agent Card를 조회할 때 설정한 헤더를 보내지 않아 토큰으로 보호한 서버를 찾지 못한다. 로컬이나 사설 IP의 에이전트에 연결하려면 `allow_private_ips: true`도 필요하다. 따라서 양쪽이 모두 Docker Agent이고 서버가 루프백 밖에 있으면 인증 없이 열어야 연결되므로, 접근 제한은 사설망, 방화벽이나 IP 허용 목록 같은 네트워크 계층에서 건다. 토큰 하나를 여러 팀이 나눠 쓰면 호출자를 구분하거나 개별로 회수할 수 없다([[Production-Agent-Architecture#환경을 넘는 위임은 호출자의 권한을 보존한다|호출자 권한 보존]]). A2A 지원은 동작하지만 아직 발전 중인 기능이고, 도구 호출은 별도 A2A 이벤트로 노출되지 않는다. Agent Card 인증과 보안 원칙은 [[MCP#A2A와의 경계 — 도구 연결과 에이전트 협업|MCP와 A2A의 경계]]를, 사용자 정의 전송은 [[A2A-Kafka-Transport|A2A와 Kafka 전송]]을 본다.

## 루프 가드와 예산

- `max_iterations`는 대화형 세션에서 한도에 닿으면 멈추고 계속할지 묻는다. 무인 실행에서 되돌릴 수 없는 상한이 필요하면 `before_llm_call`의 내장 `max_iterations` hook을 쓴다.
- `max_consecutive_tool_calls`는 이름과 인자가 같은 호출의 연속 반복을 막는다. 인자만 바꿔 도는 루프는 잡지 못한다.
- 비용, 토큰과 작업 시간은 최상위 `budget`(실행 전체)이나 이름 붙인 `budgets`(에이전트별 선택)의 `max_cost`, `max_tokens`, `max_time`으로 묶는다. 예산은 턴 경계에서 검사하므로 진행 중인 한 턴만큼 넘을 수 있고, 걸리면 계속 여부를 묻지 않고 종료한다. `serve api` 런타임은 v1.150.0부터 매니페스트 예산을 적용하며 재시작하면 카운터가 초기화된다.

이 상한들은 횟수와 양만 제한하고 결과가 나아지는지는 판단하지 않으므로 진전 없음 판정, 결과 검증과 정지 조건은 따로 설계한다([[Agent-Loop-Engineering#가드 — bare loop는 열린 청구서|루프의 3종 가드]]).

## 운영 체크포인트

- 설치한 버전과 참고한 문서(main 문서 또는 docs.docker.com)를 기록하고 플래그와 스키마를 그 기준으로 확인했는가
- 외부에서 받은 에이전트 정의의 toolset, MCP 연결과 안전 모드를 읽어 봤고, 서명 검증과 고정으로 검토한 정의만 실행하는가
- 위임 방식(하위 세션, 대화 이관, 원격 호출)마다 자동 승인과 권한 범위를 구분했는가
- 파일과 셸 권한을 `readonly`, 경로 목록과 샌드박스 중 어디서 막는지 정했는가
- 네트워크에 노출한 A2A 서버의 접근을 토큰이나 네트워크 계층으로 제한했고, 그 조건에서 호출하는 쪽이 실제로 연결되는지 시험했는가
- 반복, 연속 호출과 비용의 상한을 정하고, 상한이 대화형 세션과 무인 실행에서 다르게 동작하는지 확인했는가

## 출처

- [Docker Agent, Documentation](https://docker.github.io/docker-agent/)
- [Docker Agent, Configuration Overview](https://docker.github.io/docker-agent/configuration/overview/)
- [Docker Agent, Agent Configuration](https://docker.github.io/docker-agent/configuration/agents/)
- [Docker Agent, Agents](https://docker.github.io/docker-agent/concepts/agents/)
- [Docker Agent, Tool Configuration](https://docker.github.io/docker-agent/configuration/tools/)
- [Docker Agent, Filesystem Tool](https://docker.github.io/docker-agent/tools/filesystem/)
- [Docker Agent, MCP Tool](https://docker.github.io/docker-agent/tools/mcp/)
- [Docker Agent, Troubleshooting](https://docker.github.io/docker-agent/community/troubleshooting/)
- [Docker Agent, Model Providers](https://docker.github.io/docker-agent/providers/overview/)
- [Docker Agent, CLI Reference](https://docker.github.io/docker-agent/features/cli/)
- [Docker Agent, Agent Distribution](https://docker.github.io/docker-agent/concepts/distribution/)
- [Docker Agent, Multi-Agent Systems](https://docker.github.io/docker-agent/concepts/multi-agent/)
- [Docker Agent, A2A Protocol](https://docker.github.io/docker-agent/features/a2a/)
- [Docker Agent, A2A Tool](https://docker.github.io/docker-agent/tools/a2a/)
- [Docker Agent, Permissions](https://docker.github.io/docker-agent/configuration/permissions/)
- [Docker Agent, Hooks](https://docker.github.io/docker-agent/configuration/hooks/)
- [Docker Agent, Budget](https://docker.github.io/docker-agent/configuration/budget/)
- [Docker Agent, Sandbox](https://docker.github.io/docker-agent/configuration/sandbox/)
- [Docker Docs, Docker Agent](https://docs.docker.com/ai/docker-agent/)
- [Docker Docs, Sandbox Mode](https://docs.docker.com/ai/docker-agent/configuration/sandbox/)
- [Docker Desktop release notes — Docker Docs](https://docs.docker.com/desktop/release-notes/)
- [docker/docker-agent — GitHub](https://github.com/docker/docker-agent)
- [CHANGELOG — GitHub, docker/docker-agent](https://github.com/docker/docker-agent/blob/main/CHANGELOG.md)
- [Release v1.30.0 — GitHub, docker/docker-agent](https://github.com/docker/docker-agent/releases/tag/v1.30.0)
- [Release v1.150.0 — GitHub, docker/docker-agent](https://github.com/docker/docker-agent/releases/tag/v1.150.0)
- [Docker Agent: Build AI Agents That Talk to Each Other — Better Stack](https://www.youtube.com/watch?v=Mph1H5u3yeA) — 2026-10-10 업로드, 개념 소개와 A2A 데모의 계기로만 사용하고 모델 대결 결과는 쓰지 않음

## 관련 문서

- [[Agent-Loop-Engineering|루프 엔지니어링]] — 정지 조건과 3종 가드
- [[Agent-From-Scratch|에이전트 직접 만들기]] — 루프를 코드로 짤 때
- [[Production-Agent-Architecture#핵심 엔진: 프레임워크 vs 자체 구현|프레임워크 vs 자체 구현]]
- [[MCP#A2A와의 경계 — 도구 연결과 에이전트 협업|MCP와 A2A의 경계]]
- [[MCP#통제와 보안: 권한이 생긴 만큼|MCP 통제와 보안]] — annotation과 로컬 stdio 서버의 신뢰 범위
- [[MCP-Security-Boundaries|MCP 보안 경계]] — 게이트웨이와 자격 증명 주입
- [[A2A-Kafka-Transport|A2A와 Kafka 전송]] — 바인딩, 재전달과 권한
- [[Bedrock-AgentCore-Operations|Bedrock AgentCore 운영]] — 관리형 에이전트 런타임과 비교
- [[LLM-Model-Tiers#티어별 역할 분리와 상호 검토|역할별 에이전트 정의]] — Codex의 에이전트별 TOML 설정
