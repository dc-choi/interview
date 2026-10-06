---
tags: [cicd, github-actions, ai, llm, agent-security, prompt-injection]
status: done
verified_at: 2026-10-06
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["GitHub Agentic Workflows", "gh-aw", "Agentic Workflows", "에이전틱 워크플로", "Safe Outputs", "세이프 아웃풋"]
---

# GitHub Agentic Workflows (gh-aw)

GitHub Agentic Workflows(gh-aw)는 저장소 자동화를 자연어 Markdown으로 정의하고 Copilot, Claude Code, Codex 같은 코딩 에이전트를 GitHub Actions 안에서 실행하는 도구다. YAML frontmatter에는 트리거, 권한, 도구, 엔진과 허용할 쓰기를 적고, 본문에는 에이전트가 할 일을 자연어로 쓴다. `gh aw compile`이 이 파일을 검증해 Actions가 실제로 실행하는 `.lock.yml`을 만든다.

설계의 중심은 판단과 쓰기의 분리다. 에이전트는 읽기 전용 권한으로 판단만 하고, 이슈, 코멘트, 라벨과 PR 같은 쓰기는 frontmatter에 선언한 종류와 개수 안에서 별도 job이 검증한 뒤 적용한다. 이 쓰기 경로를 safe outputs라고 부른다.

GitHub Changelog 기준 2026-02-13에 technical preview, 2026-06-11에 public preview로 공개됐고, 2026-10-06에 확인한 gh-aw FAQ와 GitHub Docs도 public preview이며 바뀔 수 있다고 밝힌다. `gh extension install github/gh-aw`로 설치하는 MIT 라이선스 오픈소스이며, 저장소 README는 보안 고려와 사람의 세심한 감독이 필요하고 그래도 일이 잘못될 수 있으니 주의해서 쓰라고 경고한다. 아래 기본값과 설정 이름은 따로 표시하지 않으면 2026-10-06에 확인한 gh-aw 문서 기준이다.

## 어떤 작업에 맞는가

에이전틱 workflow는 결정적인 Actions workflow를 대체하지 않고 보완한다. 빌드, 테스트, 린트, 배포와 재현 가능한 스크립트는 기존 workflow가 맞다. 이슈 triage, 문서 초안, 의존성 조사, 사람이 검토할 코드 개선 제안처럼 해석과 조사, 생성이 필요한 작업이 대상이다. gh-aw 비용 문서도 결정적 도구로 풀 수 있는 작업은 결정적 도구로 풀고 에이전트는 필요할 때만 쓰라고 권한다.

- 규칙을 코드로 쓸 수 있으면 일반 workflow로 둔다. 사용자가 자기 말로 쓴 이슈를 분류하는 일처럼 입력이 자유 텍스트이고 규칙으로 옮기기 어려운 판단이 후보다.
- 결과는 사람이 검토하거나 되돌릴 수 있는 산출물로 끝나야 한다. 코멘트, 라벨, 리뷰를 기다리는 PR이 그런 형태다.
- 에이전트를 시작하기 전에 거를 수 있는 조건은 먼저 거른다. `skip-if-match`와 `skip-if-no-match`는 GitHub 검색 조건을 비용이 낮은 pre-activation job에서 평가하므로, 조건이 맞지 않으면 에이전트 실행 비용이 생기지 않는다.

## 파일 구조와 컴파일

원본은 `.github/workflows/` 아래의 `.md` 파일이고 컴파일 결과인 `.lock.yml`이 Actions가 실행하는 파일이다. 두 파일을 함께 커밋하고, frontmatter를 바꾸면 lock 파일을 다시 생성한다.

```markdown
---
on:
  issues:
    types: [opened]
permissions: read-all
safe-outputs:
  staged: true               # 처음에는 API를 호출하지 않고 step summary로 결과만 본다
  add-comment:
    max: 1
  add-labels:
    allowed: [bug, area/*]
    blocked: [area/security]  # allowed에 맞아도 blocked가 먼저 거부한다
    max: 1
    max-labels: 2
---

# 새 이슈 분류

새 이슈의 제목과 본문을 읽고 bug 여부와 관련 영역 라벨을 붙인다.
재현 정보가 부족하면 필요한 정보를 묻는 코멘트를 하나 남긴다.
```

- 컴파일은 schema 검증, expression 허용 목록 검사와 action pinning을 적용한다. lock 파일의 action 참조는 `actions/checkout@<sha> # v4`처럼 commit SHA로 고정된다.
- strict 모드는 frontmatter `strict`로 제어하며 기본값이 `true`다. CLI reference가 정리한 strict 검증 항목은 write 권한 금지(쓰기는 safe outputs로), 명시적인 `network` 설정, 와일드카드 도메인 금지, 고정한 action, deprecated 필드 금지다. `strict: false`로 컴파일한 workflow는 public 저장소에서 실행 시 실패하고, `.github/workflows/aw.json`에 `"strict": true`를 두면 개별 workflow가 strict를 끌 수 없다.
- 컴파일 명령에 `--actionlint`, `--zizmor`, `--poutine`을 주면 workflow lint, 보안 취약점 탐지와 공급망 위험 분석을 함께 실행한다. `--zizmor` 결과는 경고로 보고되고, `--strict`와 함께 주면 발견 사항이 있을 때 실패한다.

## Safe outputs — 판단하는 job과 쓰는 job을 나눈다

### 실행 흐름

1. **agent job**은 최소한의 읽기 전용 권한으로 실행된다. GitHub MCP 서버 같은 읽기 전용 도구는 쓸 수 있지만, PR 생성 같은 외부 쓰기는 즉시 적용되지 않고 SafeOutputs가 artifact로 모아 둔다. Safe Outputs MCP Gateway 명세(2026-10-01 Working Draft 1.29.8) 기준으로 에이전트는 컨테이너로 띄운 safeoutputs MCP 서버의 도구(`create_issue` 등)를 호출하고, 서버는 호출을 JSON schema로 검증해 NDJSON 파일에 한 줄씩 기록하며, agent job이 이 파일을 artifact로 올린다.
2. **threat detection job**은 safe outputs를 설정하면 자동으로 켜지고 agent job 다음, 쓰기 job 이전에 실행된다. 기본으로 workflow와 같은 엔진을 쓰는 AI 에이전트가 출력 항목, git patch와 workflow의 원래 의도를 함께 보고 프롬프트 인젝션, secret 유출과 악성 patch를 찾는다. 위협으로 판정하면 workflow가 실패하고 이후의 safe output job은 모두 건너뛴다.
3. **safe output job**은 artifact를 내려받아 유형별로 묶고 `max` 같은 제약을 적용한 뒤, 유형에 필요한 범위의 권한으로 GitHub API를 호출한다. `create_issue`, `add_comment`와 `add_labels`는 `issues: write`, `create_pull_request`는 `contents: write`와 `pull-requests: write`를 받는다.

프롬프트 인젝션이 에이전트를 장악해도 공격자가 얻는 것은 읽기 전용 권한으로 실행되는 에이전트다. 쓰기는 선언한 유형과 개수 안에서, 검증과 탐지를 지난 뒤에 다른 job이 수행한다.

### 선언하는 제약

- **유형 허용 목록**: `safe-outputs`에 선언한 쓰기만 적용된다. create-issue, add-comment, add-labels, create-pull-request, update-issue, close-issue처럼 유형별로 선언한다.
- **개수 상한 `max`**: 유형마다 실행당 상한이 있다. 기본값은 create-issue, add-comment와 create-pull-request가 1이고, add-labels는 호출 5회에 호출당 라벨 수 `max-labels` 10이다. create-pull-request의 1은 한 실행 안의 모든 에이전트가 나눠 쓰는 quota이고, `max-labels`를 넘는 add-labels 호출은 라벨을 하나도 붙이지 않고 거부된다.
- **라벨 허용과 차단**: `allowed`와 `blocked`는 glob 패턴이며 `blocked`를 먼저 평가한다. blocked에 맞는 라벨은 allowed에 맞아도 거부되므로, 보안 판정이나 배포 승인처럼 사람만 붙여야 하는 라벨은 blocked에 둔다.
- **staged 모드**: `staged: true`를 safe-outputs 전체나 유형별로 두면 API를 호출하지 않고 만들었을 결과를 step summary로 보여 준다. 새 workflow나 지시를 바꾼 workflow를 실제로 쓰기 전에 확인하는 단계다.
- **출력 정제**: 적용 전에 secret redaction, URL 도메인 필터링(기본 허용은 GitHub, `allowed-domains`로 확장), XML escape, HTTPS 강제, 크기 제한, 제어 문자 제거와 GitHub 참조 escape를 거친다. 허용하지 않은 `#123`, `owner/repo#456` 같은 참조는 backtick으로 감싸 다른 이슈의 타임라인에 항목이 생기지 않게 한다.
- **PR의 보호 파일**: create-pull-request는 보호 파일 규칙을 기본으로 적용한다. `package.json`, `go.mod` 같은 런타임 의존성 매니페스트, `AGENTS.md`와 `CLAUDE.md` 같은 엔진 지시 파일, `.github/`, `.githooks/` 같은 저장소 보안 설정, `CODEOWNERS` 같은 거버넌스 파일, 점으로 시작하는 최상위 디렉터리를 바꾸면 기본 정책 `request-review`가 PR은 만들되 해당 파일을 나열한 `REQUEST_CHANGES` 리뷰를 단다. 정책은 `blocked`(오류로 실패), `fallback-to-issue`(PR 대신 사람이 적용할 검토 이슈 생성)와 `allowed`(제한 없음)로 바꿀 수 있고, patch 크기는 `max-patch-size`(기본 4096 KB)로 제한한다.
- **사람 승인 gate**: GitHub Environment protection rule을 건 custom job을 만들고 기본 `safe_outputs` job이 `needs`로 그 job을 기다리게 하면, 지정한 reviewer가 승인할 때까지 쓰기가 멈춘다. 이 대기는 에이전트가 영향을 줄 수 있는 workflow 로직이 아니라 GitHub 인프라가 강제한다. threat detection을 켜 두면 gate보다 먼저 실행되므로 reviewer는 자동 검사를 통과한 출력을 본다. 실행 시작 자체를 승인받으려면 트리거 설정의 `manual-approval`로 activation job에 environment를 건다.
- **우회 경로**: 작성자가 직접 write 권한을 주거나 custom job을 정의하면 별도의 신뢰 경계가 생기고 safe-output 목록의 제약을 받지 않는다. strict 모드가 write 권한을 거부하는 이유다.

## 에이전트 실행 경계

safe outputs가 쓰기를 묶는다면, 아래 층은 에이전트가 무엇을 읽고 어디로 나갈 수 있는지를 묶는다. FAQ가 기본 구성으로 드는 층은 읽기 전용 에이전트, safe outputs, 쓰기 전 threat detection과 네트워크 허용 목록 넷이다.

- **입력 정제**: activation 단계 경계에서 사용자가 만든 콘텐츠를 에이전트에 넘기기 전에 변환한다. `@user` 멘션과 `fixes #123` 같은 자동 연결 키워드는 backtick으로 무력화하고, `<script>`는 `(script)`로 바꾸며, HTTPS와 신뢰 도메인이 아닌 URL은 `(redacted)`로 가린다. 크기는 0.5MB, 65k 줄로 제한한다.
- **무결성 필터**: MCP gateway가 GitHub 도구 호출 결과의 항목마다 작성자 연관성과 merge 여부로 무결성 수준을 매기고, `tools.github.min-integrity` 미만 항목을 엔진이 보기 전에 제거한다. public 저장소는 설정이 없으면 `approved`(OWNER, MEMBER, COLLABORATOR, 신뢰한 bot과 `trusted-users`의 콘텐츠)가 자동 적용되고, private과 internal 저장소에는 자동 정책이 없다.
- **샌드박스**: 에이전트는 기본으로 내부 Docker 네트워크의 컨테이너에서 실행되고, MCP 서버도 각각 격리된 컨테이너에서 실행된다. 적격 GitHub-hosted runner에서는 KVM으로 격리한 Cloud Hypervisor microVM을 preview로 쓸 수 있다.
- **네트워크**: AWF(Agent Workflow Firewall)가 iptables로 HTTP와 HTTPS 트래픽을 Squid proxy로 돌리고 도메인 허용 목록으로 egress를 제한하며, 모든 엔진이 이 방화벽을 거친다. `network`를 생략하면 인증서, JSON schema, Ubuntu와 패키지 미러 같은 기본 인프라만 허용하는 `defaults`가 되고, `network: {}`는 모든 접근을 막는다. 허용 도메인은 하위 도메인을 포함하고, 막힌 도메인은 `gh aw logs --run-id <run-id>`로 확인한다.
- **자격 증명 격리**: 모델 API 토큰은 API proxy가 보관하므로 에이전트는 토큰을 보지 못한다.
- **실행 권한자**: `roles`는 이벤트를 일으킨 사용자의 저장소 역할이 목록과 정확히 일치하는지 검사하는 허용 목록이고, 기본값은 `[admin, maintainer, write]`다. `[write]`만 두면 admin과 maintainer도 거부되고, `roles: all`은 검사를 끈다.

## 비용과 반복 상한

AI Credits(AIC)는 1 AIC가 0.01 USD인 비용 단위이고, models.dev 가격 데이터로 계산한다.

- `max-ai-credits`는 실행 1회의 AIC 예산이다. 기본으로 켜져 있고 생략하면 1000이다.
- `max-daily-ai-credits`는 workflow 하나의 24시간 AIC 상한이다. 초과하면 activation이 예산 초과를 보고하고 agent job을 건너뛴다. 생략했을 때의 동작은 Cost Management 문서(기본 5000 상속)와 Frontmatter reference(비활성)의 서술이 달라 필요한 값을 명시한다. `-1`은 명시적으로 끈다.
- `max-turns`는 모델 응답과 도구 호출을 합한 반복 횟수의 상한이다. 생략하면 500이고 다섯 내장 엔진 모두 지원한다.
- `timeout-minutes`는 에이전트 실행 step의 시간 상한이며 기본값은 20분이다.
- threat detection은 본 예산과 별도로 `safe-outputs.threat-detection.max-ai-credits`(기본 400)를 쓴다.
- 트리거 설정의 `stop-after`는 절대 날짜나 컴파일 시점부터의 상대 기간(`+7d`, `+25h`)이 지나면 트리거를 끈다. 최소 단위는 시간이고 다시 컴파일하면 정지 시각도 다시 계산된다. 시험용 workflow가 잊힌 채 계속 도는 비용을 막는다.

비용은 엔진 제공자의 추론 비용과 GitHub Actions 실행 시간으로 나뉘고, gh-aw 자체는 무료 오픈소스다. 조직 소유 저장소에 Copilot 플랜이 있으면 `copilot-requests: write` 권한으로 조직에 과금할 수 있다.

## 엔진

기본 엔진은 GitHub Copilot CLI(`copilot`)이고, Copilot을 쓸 때는 `engine:`을 생략할 수 있다. 다른 내장 엔진은 Claude Code(`claude`), OpenAI Codex(`codex`), Google Gemini CLI(`gemini`)와 Pi(`pi`)이며 `ANTHROPIC_API_KEY`, `CODEX_API_KEY` 또는 `OPENAI_API_KEY`, `GEMINI_API_KEY` 같은 별도 인증이 필요하다. OpenCode, Aider, Cursor, Kiro 같은 통합은 공식 지원이 아닌 샘플이다. threat detection은 내장 엔진에서만 실행되고, custom 엔진을 쓰는 workflow의 detection은 기본으로 `copilot`에서 실행된다.

## 트레이드오프

- **결정적 통제와 확률적 통제**: 읽기 전용 agent job, 선언한 유형과 `max`, 라벨 차단 목록, 네트워크 허용 목록은 주입이 성공한 뒤에도 피해 반경을 묶는 결정적 통제다. threat detection은 프롬프트를 받은 AI 에이전트가 판정하므로 [[LLM-Application-Security#적응형 공격과 피해 반경 제한|적응형 공격]] 관점에서는 주입 성공률을 낮추는 층으로 보고 단독 경계로 삼지 않는다. 입력 정제의 변환도 멘션, 키워드, 태그, URL과 크기를 다루므로 자연어로 쓴 지시는 에이전트에 그대로 전달된다고 보고 설계한다.
- **요청 층과 강제 층**: 본문의 자연어 지시는 에이전트가 따르기를 기대하는 요청 층이고, safe outputs와 권한, 방화벽은 에이전트가 지시를 어겨도 걸리는 강제 층이다([[Harness-Gate-Placement|게이트 배치]]). 반드시 지켜야 하는 제약을 본문 문장으로만 쓰지 않는다.
- **Rule of Two로 본 구성**: 공개 저장소의 이슈 triage는 비신뢰 입력[A]과 상태 변경[C]을 함께 가진 구성이고, safe outputs는 [C]를 선언한 유형과 개수로 좁힌다. 비공개 코드나 데이터 접근[B]까지 더해지면 세 조건이 모두 열리므로 Environment 승인 gate 같은 사람 감독을 둔다.
- **비결정성**: 같은 입력에도 판단이 달라질 수 있다. 결과는 사람이 검토하는 산출물로 끝내고, 매번 같아야 하는 판정은 일반 workflow나 테스트로 고정한다.
- **경계를 여는 설정**: 직접 write 권한, custom job, `strict: false`, `roles: all`과 `threat-detection: false`는 각각 위 경계 하나를 열거나 없앤다. 쓰는 이유를 PR에 남기고 리뷰한다.
- **preview의 변동성**: 설정 이름, 기본값과 문서가 아직 움직인다. 2026-10-06에도 `max-daily-ai-credits`의 기본 동작이 문서마다 달랐으므로, 도입 시점의 reference를 다시 확인하고 비용과 권한에 관한 값은 명시한다.

## 운영과 면접 체크포인트

- 이 작업을 규칙으로 쓸 수 있는가. 쓸 수 있으면 일반 workflow로 두고, 해석이 필요한 부분만 에이전트에 맡긴다.
- `safe-outputs`에 필요한 유형만 선언하고 `max`를 기본값 이하로 유지했는가. 사람만 붙일 라벨을 `blocked`에 두었는가.
- 새 workflow를 `staged: true`로 먼저 실행해 step summary를 확인했는가.
- `strict`를 유지하고, lock 파일을 바꾸는 PR에서 `--actionlint`, `--zizmor`, `--poutine` 결과를 확인하는가.
- 네트워크 허용 목록이 필요한 도메인만 담고, 막힌 요청을 로그로 확인하는가.
- `max-ai-credits`, `max-daily-ai-credits`, `max-turns`와 `stop-after`를 명시했는가.
- 코드를 바꾸는 workflow에서 보호 파일 정책과 사람 리뷰를 유지하는가.
- 면접에서는 코딩 에이전트가 CI에서 PR을 만들게 할 때 프롬프트 인젝션의 피해를 어떻게 묶는지 물을 수 있다. 판단하는 job에는 읽기 전용 권한만 주고, 쓰기는 선언한 유형과 개수로 제한한 별도 job이 검증 뒤 수행하며, AI 탐지는 보조 층으로 두고 되돌리기 어려운 쓰기 앞에는 GitHub 인프라가 강제하는 사람 승인 gate를 둔다는 구조로 답한다.

## 출처

- [GitHub Agentic Workflows, Home](https://github.github.com/gh-aw/)
- [GitHub Agentic Workflows, What are Agentic Workflows?](https://github.github.com/gh-aw/introduction/overview/)
- [GitHub Agentic Workflows, Security Architecture](https://github.github.com/gh-aw/introduction/architecture/)
- [GitHub Agentic Workflows, Safe Outputs](https://github.github.com/gh-aw/reference/safe-outputs/)
- [GitHub Agentic Workflows, Safe Outputs (Pull Requests)](https://github.github.com/gh-aw/reference/safe-outputs-pull-requests/)
- [GitHub Agentic Workflows, Safe Outputs MCP Gateway Specification](https://github.github.com/gh-aw/specs/safe-outputs-specification/)
- [GitHub Agentic Workflows, Threat Detection](https://github.github.com/gh-aw/reference/threat-detection/)
- [GitHub Agentic Workflows, GitHub Integrity Filtering](https://github.github.com/gh-aw/reference/integrity/)
- [GitHub Agentic Workflows, Network Permissions](https://github.github.com/gh-aw/reference/network/)
- [GitHub Agentic Workflows, Triggers](https://github.github.com/gh-aw/reference/triggers/)
- [GitHub Agentic Workflows, Frontmatter](https://github.github.com/gh-aw/reference/frontmatter/)
- [GitHub Agentic Workflows, Cost Management](https://github.github.com/gh-aw/reference/cost-management/)
- [GitHub Agentic Workflows, AI Engines](https://github.github.com/gh-aw/reference/engines/)
- [GitHub Agentic Workflows, CLI Commands](https://github.github.com/gh-aw/setup/cli/)
- [GitHub Agentic Workflows, FAQ](https://github.github.com/gh-aw/reference/faq/)
- [GitHub Docs, About GitHub Agentic Workflows](https://docs.github.com/en/copilot/concepts/agents/about-github-agentic-workflows)
- [github/gh-aw — GitHub](https://github.com/github/gh-aw)
- [GitHub Agentic Workflows are now in technical preview — GitHub Changelog](https://github.blog/changelog/2026-02-13-github-agentic-workflows-are-now-in-technical-preview/)
- [GitHub Agentic Workflows is now in public preview — GitHub Changelog](https://github.blog/changelog/2026-06-11-github-agentic-workflows-is-now-in-public-preview/)

## 관련 문서

- [[GitHub-Actions|GitHub Actions (permissions, action SHA 고정과 cache 신뢰 경계)]]
- [[LLM-Application-Security|LLM 애플리케이션 보안 (Rule of Two, 결정적 집행과 피해 반경 제한)]]
- [[Harness-Gate-Placement|게이트 배치 (요청 층과 강제 층)]]
- [[Agent-Swarm-Containment|에이전트 군집 격리 (이그레스 허용 목록과 공유 자원 통제)]]
- [[MCP-Security-Boundaries|MCP 보안 경계 (게이트웨이와 서버 자격 증명)]]
- [[Supply-Chain-Security|공급망 보안]]
