---
tags: [cicd, gitlab, ai, agent-security, prompt-injection, codeowners]
status: done
verified_at: 2026-11-15
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["CI Agent Instruction Files", "CI 에이전트 지침 파일", "CLAUDE.md AGENTS.md CI 보안", "에이전트 설정 파일 리뷰"]
---

# CI에서 에이전트 지침 파일 다루기

CI에서 코딩 에이전트를 실행하면 `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` 같은 지침 파일은 문서가 아니라 파이프라인의 판단을 바꾸는 설정이 된다. 확장자가 `.md`라 리뷰 대상에서 빠지기 쉽지만, `.gitlab-ci.yml`이나 워크플로 파일과 같은 수준으로 소유자, 승인, 변경 감지와 자격 증명 범위를 정한다.

## 왜 도구 제한만으로 부족한가

에이전트는 저장소를 체크아웃한 뒤 지침 파일을 로드한다. GitInject 논문은 이를 운영자 수준 지시로 로드된다고 표현한다. 지침 파일에 리뷰 기준을 낮추라거나 특정 변경을 승인하라는 문장이 들어가면 실행할 명령이 없으므로 허용 도구 목록이 막을 대상도 없다.

GitInject 논문(arXiv 2606.09935, v2 2026-11-02)은 GitHub Actions의 실제 워크플로를 임시 저장소에서 돌려 이 문제를 측정했다.

- 네 AI 제공자의 다섯 워크플로에서 11개 공격 시나리오를 평가했고, 시험한 구성에서 모든 제공자가 고위험 공격 하나 이상에 취약했다.
- 가장 심각한 결함은 병합되지 않은 기여의 설정 파일이 운영자 수준 지시로 로드되는 구조였다. 이 경로로 자격 증명이 유출되거나 리뷰 판단이 오염됐다.
- 모델 비교표(Table 3)의 9개 모델 중 6개는 PR이나 이슈 본문으로 온 payload를 모두 거부했지만, 같은 9개 중 7개는 같은 의미의 payload가 설정 파일로 오면 따랐다. 이 비교에서 가용성 공격(denial of wallet)은 빠져 있고, 그 공격은 PR 본문에서도 일부 모델에 성공했다.
- 도구 제한은 셸을 거치는 유출을 막았지만 판단 조작에는 효과가 없었다. 논문은 판단 조작에 셸이 관여하지 않으므로 도구 제한이 효과가 없다고 적고, 유출 경로를 막아도 파일이 여전히 권위 있는 지시로 로드되므로 에이전트에 남은 능력은 조종될 수 있다고 정리했다.
- 설정 파일 공격 두 가지는 GitHub뿐 아니라 GitLab과 Hugging Face에서도 재현됐다. 이 이식 실험은 저자들이 직접 만든 Claude Code CLI 워크플로와 CLAUDE.md 공격 두 가지로 했고, GitLab에서의 Codex와 AGENTS.md, GitLab Duo는 측정하지 않았다.
- GitHub처럼 외부 기여자의 워크플로 실행 전에 메인테이너 승인을 요구하는 장치가 있으면, 승인을 보류하는 동안은 에이전트가 돌지 않아 논문의 공격이 성립하지 않는다. 그러나 승인하는 순간 에이전트를 제약하거나 기여를 정화하지 않으므로 논문이 평가한 노출로 그대로 돌아간다.

Claude Code 문서는 CLAUDE.md 내용이 시스템 프롬프트 뒤의 사용자 메시지로 전달되며, Claude가 맥락으로 다룰 뿐 강제되는 설정이 아니라고 적는다. 반드시 막아야 하는 동작은 PreToolUse hook 같은 강제 층에 둔다([[Harness-Gate-Placement|게이트 배치]]).

## 1. 에이전트가 읽는 파일 목록 만들기

에이전트마다 탐색 규칙이 달라 루트의 파일 하나만 보면 빠지는 경로가 생긴다. 2026-11-15 공식 문서 기준이다.

| 에이전트 | 읽는 위치 | 목록에 함께 넣을 것 |
|---|---|---|
| Claude Code | 작업 디렉터리와 그 위의 모든 디렉터리의 `CLAUDE.md`, `CLAUDE.local.md`를 이어 붙인다. 하위 디렉터리 파일은 그 디렉터리의 파일을 읽거나 고칠 때 로드한다 | `@path`로 가져오는 파일(최대 4단계 재귀), 루트와 하위 디렉터리의 `.claude/rules/`의 `.md`, CLAUDE.md가 없을 때 대신 읽는 `AGENTS.md`와 `.claude/AGENTS.md`(아래 설명) |
| Codex | 프로젝트 루트(대개 Git 루트)에서 작업 디렉터리까지 내려가며 디렉터리마다 `AGENTS.override.md`, `AGENTS.md`, fallback 파일명 중 하나를 읽는다 | `project_doc_fallback_filenames`에 등록한 파일명, Codex 홈의 전역 파일 |

Claude Code는 기본 설정에서 작업 디렉터리나 그 위에 `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`가 하나도 없을 때만 `AGENTS.md`를 읽는다(v2.1.277 이상). Amazon Bedrock 세션이나 telemetry를 끈 세션처럼 일부 세션은 v2.1.281 전까지 CLAUDE.md만 읽었다. Project instructions 설정이 `claude-md-and-agents-md`이면 두 파일을 모두 읽는다. CI 러너의 버전과 설정에 따라 읽는 파일이 달라지므로 두 이름을 모두 목록에 넣는다.

Codex는 합친 크기가 `project_doc_max_bytes`(기본 32 KiB)에 이르면 파일 추가를 멈춘다. 목록에는 파일 이름뿐 아니라 이런 가져오기와 대체 규칙으로 끌려오는 경로를 넣는다. `GEMINI.md`처럼 위 표에 없는 에이전트의 탐색 규칙은 이 문서에서 대조하지 않았으므로 해당 에이전트 문서로 따로 확인한다.

## 2. GitLab에서 승인과 감지 걸기

### CODEOWNERS 등록

Code Owners는 GitLab Premium과 Ultimate 기능이다. 저장소는 `CODEOWNERS` 파일 하나만 쓰며 `./CODEOWNERS`, `./docs/CODEOWNERS`, `./.gitlab/CODEOWNERS` 순서로 먼저 찾은 파일만 적용한다. 한 섹션 안에서 여러 줄이 맞으면 그 섹션의 마지막 줄만 적용되고, 섹션이 여러 개면 섹션마다 마지막 줄이 따로 적용된다. 그래서 같은 섹션에서 뒤에 오는 넓은 패턴이 지침 파일 항목을 덮을 수 있다. 승인 판단은 대상 브랜치의 `CODEOWNERS`를 기준으로 한다.

어떤 규칙에도 맞지 않는 파일은 새 파일이어도 Code Owner 승인이 필요 없다. 목록화한 경로만 하나씩 적으면 MR이 다른 위치에 지침 파일을 새로 넣을 때 승인이 걸리지 않으므로, 디렉터리 깊이와 무관하게 파일 이름으로 맞는 패턴을 쓴다(문법은 CODEOWNERS reference로 확인). 경고 job이 들어 있는 `.gitlab-ci.yml`과 `CODEOWNERS` 자체도 소유 대상에 넣는다. MR 파이프라인은 소스 브랜치 내용으로 돌기 때문에 같은 MR이 경고 job을 지울 수 있다. 소유자는 변경 작성자와 다른 사람으로 둔다.

### 승인 규칙이 실제로 작동하게

`CODEOWNERS`를 커밋해도 승인이 강제되지는 않는다. 대상 브랜치가 보호 브랜치이고 그 브랜치에 Code Owner 승인 요구(UI에서 Require approval from code owners 또는 Code owner approval)가 켜져 있어야 한다.

- Protected branches 문서의 Require Code Owner approval 절은 규칙에 맞는 직접 푸시가 거부된다고 적은 뒤, 같은 절에서 보호 브랜치에 푸시가 허용된(Allowed to push and merge) 사용자와 그룹은 MR 없이 병합할 수 있어 Code Owners를 포함한 승인 규칙을 건너뛴다고 적는다. 원칙과 예외로 읽히므로 실제 동작은 대상 인스턴스에서 확인한다. 어느 쪽이든 모든 변경이 MR을 거치게 하려면 이 값을 No one으로 둔다. GitLab 문서는 운영 브랜치에 Code Owner 승인과 함께 이 구성을 권한다.
- GitLab 문서는 프로젝트의 Protected branches 설정을 없애고 Settings > Repository > Branch rules로 옮긴다고 안내한다. 도입 시점의 메뉴 위치를 다시 확인한다.
- 설정 뒤에는 지침 파일을 고치는 MR을 새로 열어 Code Owner 승인이 필수로 표시되는지 확인한다. 설정 화면의 체크만으로 작동을 판단하지 않는다.

### 변경을 파이프라인에 드러내기

경고는 파이프라인이 띄우고 차단은 승인 규칙이 맡는다. `rules:changes`는 MR 파이프라인에서 대상 브랜치와 비교한다. 새 브랜치 파이프라인이나 푸시 이벤트가 없는 태그, 예약, 수동 파이프라인에서는 항상 참이 되므로 MR 파이프라인으로 한정하거나 `compare_to`를 쓴다. `rules:changes` 한 절에는 패턴을 50개까지 쓸 수 있다.

아래 예시는 프로젝트가 이미 `workflow:rules`로 MR 파이프라인을 쓰고 있다는 전제다. `workflow:rules`와 job별 `rules`가 모두 없는 프로젝트에서는 기존 job이 MR 파이프라인에 들어가지 않으므로, 이 job만 더하면 지침 파일을 바꾼 MR에서만 이 job 하나짜리 MR 파이프라인이 생긴다. GitLab은 MR 파이프라인이 있으면 Pipelines must succeed 판단에 그 결과만 보므로, `allow_failure`로 성공 처리된 이 파이프라인 때문에 브랜치 파이프라인의 테스트 실패가 병합 검사에서 빠질 수 있다. 먼저 `workflow:rules`로 파이프라인 종류를 정리한다.

```yaml
agent-instructions-changed:
  stage: test
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      changes:
        paths:
          - "**/CLAUDE.md"
          - "**/CLAUDE.local.md"
          - "**/AGENTS.md"
          - "**/AGENTS.override.md"
          - "**/GEMINI.md"
          - ".claude/**/*"
          - "**/.claude/**/*"
          - ".gitlab-ci.yml"
          - "CODEOWNERS"
          - "docs/CODEOWNERS"
          - ".gitlab/CODEOWNERS"
  allow_failure: true
  script:
    - echo "에이전트 지침 파일이 바뀌었습니다. Code Owner 승인을 확인하세요."
    - exit 1
```

`allow_failure: true`인 job이 실패하면 주황색 경고로 표시되고 파이프라인은 성공으로 남는다. 그래서 이 job은 리뷰어의 눈에 띄게 하는 역할이고, 병합을 막는 것은 앞의 승인 규칙이다. 특정 종료 코드만 경고로 두려면 `allow_failure:exit_codes`를 쓴다.

### 에이전트 자격 증명을 보호된 변수로

- 에이전트 API 키는 보호된 변수로 둔다. 보호된 변수는 보호 브랜치와 보호 태그에서 도는 파이프라인에만 노출된다. GitLab 18.1에 들어온 Allow merge request pipelines to access protected variables and runners 설정을 켜면 MR 파이프라인도 접근할 수 있는데, 소스와 대상 브랜치가 모두 보호 브랜치이고, 파이프라인을 일으킨 사용자가 대상 브랜치에 push나 merge 권한이 있으며, 두 브랜치가 같은 프로젝트에 있어야 한다. fork의 MR 파이프라인은 접근하지 못한다. 이 설정의 기본값은 공식 문서에 없으므로 프로젝트 설정에서 체크 상태를 직접 확인한다. 따라서 보호되지 않은 소스 브랜치의 MR에서는 리뷰 에이전트가 키를 받지 못한다.
- 마스킹은 로그 노출을 줄일 뿐이다. GitLab 문서는 마스킹이 악의적 사용자의 값 접근을 막는 보장된 방법이 아니며, 악성 코드는 마스킹되고 보호된 변수 모두를 탈취할 수 있다고 경고한다. 대안으로 GitLab Secrets Manager([[GitLab-Secrets-Manager|GitLab Secrets Manager]]), 외부 시크릿과 file 타입 변수를 든다.
- 그룹 변수는 하위 그룹과 프로젝트로 재귀 상속되고, 같은 이름은 가장 가까운 하위 그룹의 값을 쓴다. 프로젝트의 Settings > CI/CD > Variables에 표시되는 상속 그룹 변수 목록에서 상위 그룹이 주는 키를 확인한다.

## 승인 규칙이 막지 못하는 구간

아래는 위 출처를 조합한 운영 판단이다.

Code Owner 승인은 지침 파일 변경이 보호 브랜치에 들어가는 것을 막는다. 그러나 MR 파이프라인에서 에이전트가 돌면, 승인 전에 MR 소스 브랜치의 지침 파일을 이미 읽는다. GitInject가 측정한 경로가 바로 병합되지 않은 기여의 설정 파일이다.

- 외부 기여나 신뢰하지 않는 작성자의 MR에서는 에이전트를 자동 실행하지 않거나, 지침 파일을 대상 브랜치 버전으로 고정해 실행하는 방법을 검토한다. 고정은 GitInject가 측정한 대책이 아니고, MR 파이프라인은 소스 브랜치의 `.gitlab-ci.yml`로 돌므로 고정 단계는 MR이 바꿀 수 없는 층에 두어야 한다([[GitLab-Security-Policies|GitLab 보안 정책]]).
- 리뷰 에이전트의 승인 의견을 병합 조건으로 쓰지 않는다. 판단 조작은 도구 제한으로 막히지 않으므로 사람 승인과 결정적 검사를 병합 조건으로 남긴다([[Code-Review-AI-Agent-Operations|에이전트 시대 코드 리뷰 운영]]).
- MR 파이프라인에 보호된 변수를 열어 두었다면, 지침 파일을 바꾼 MR에서 에이전트가 그 자격 증명을 쥔 채 실행되는지 확인한다.

## 트레이드오프

- 자동 실행의 범위를 좁힐수록 공격면은 줄지만 리뷰 대기 시간이 늘어난다. 내부 작성자의 MR은 자동 실행하고 외부 기여는 승인자가 지침 파일 diff를 먼저 확인한 뒤 실행하는 식으로 나눈다. 승인 자체는 실행 뒤의 에이전트를 제약하지 않는다.
- 변경 감지 job의 경로 패턴은 에이전트를 바꾸거나 새 지침 파일 규칙이 생길 때 함께 갱신해야 한다. 목록과 `CODEOWNERS`, `rules:changes`가 어긋나면 감지되지 않는 지침 파일이 생긴다.

## 점검 체크포인트

- 에이전트별 탐색 규칙과 가져오기로 로드되는 파일까지 목록에 있는가.
- 목록의 모든 경로가 `CODEOWNERS`에 있고 소유자가 작성자와 다른가.
- 대상 보호 브랜치에 Code Owner 승인이 켜져 있고 Allowed to push and merge가 No one인가.
- 새 MR로 승인 규칙이 실제로 필수로 걸리는지 확인했는가.
- 지침 파일 변경 MR에서 경고 job이 뜨는가.
- 에이전트 키가 보호된 변수이고, MR 파이프라인과 상위 그룹에서 오는 노출 경로를 확인했는가.
- 면접에서는 CLAUDE.md 같은 파일이 왜 보안 경계인지 물을 수 있다. 에이전트가 권위 있는 지시로 로드해 도구 제한을 걸어도, 또는 도구 호출 없이도 판단이 바뀌므로, 파이프라인 설정처럼 소유자와 승인으로 병합을 막고, 병합 전 MR 실행에서는 신뢰하지 않는 지침을 읽지 않게 한다고 답한다.

## 출처

- [GitInject: Real-World Prompt Injection Attacks in AI-Powered CI/CD Pipelines — arXiv, Jafar Isbarov, Umid Suleymanov, Ilia Shumailov, Murat Kantarcioglu](https://arxiv.org/abs/2606.09935) — v2 2026-11-02, 2026-11-15 초록, 공격 매트릭스, 본문과 설정 파일 비교, 도구 제한의 한계와 메인테이너 승인 대조
- [GitLab CI에 AI 에이전트를 연결할 때 점검할 5가지 — YouTube, InfoGrab](https://www.youtube.com/watch?v=pFZBY3qz9HI) — 2026-11-05 공개 영상, 계기 자료. 설명란이 원문으로 가리키는 InfoGrab 블로그 글은 2026-09-16 경로에 있다. 사실은 아래 공식 문서로 대조했고 문서에서 확인하지 못한 화면 표시와 설정 값의 세부는 옮기지 않았다
- [Claude Code Docs, How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [OpenAI, Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) — 2026-11-15 기존 developers.openai.com 주소에서 308로 이동한 주소
- [GitLab Docs, Code Owners](https://docs.gitlab.com/user/project/codeowners/)
- [GitLab Docs, Syntax of CODEOWNERS file](https://docs.gitlab.com/user/project/codeowners/reference/)
- [GitLab Docs, Specify when jobs run with rules](https://docs.gitlab.com/ci/jobs/job_rules/)
- [GitLab Docs, Merge request pipelines](https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/)
- [GitLab Docs, Auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/)
- [GitLab Docs, Protected branches](https://docs.gitlab.com/user/project/repository/branches/protected/)
- [GitLab Docs, CI/CD YAML syntax reference](https://docs.gitlab.com/ci/yaml/)
- [GitLab Docs, CI/CD variables](https://docs.gitlab.com/ci/variables/)

## 관련 문서

- [[GitHub-Agentic-Workflows|GitHub Agentic Workflows (보호 파일 정책과 safe outputs)]]
- [[GitLab-Security-Policies|GitLab 보안 정책 (MR 승인 분리)]]
- [[GitLab-Duo-Agent-Platform|GitLab Duo Agent Platform]]
- [[LLM-Application-Security|LLM 애플리케이션 보안]]
- [[Harness-Gate-Placement|게이트 배치 (요청 층과 강제 층)]]
- [[Code-Review-AI-Agent-Operations|에이전트 시대 코드 리뷰 운영]]
- [[Agent-Repository-Instructions-Hosts|AGENTS.md 호스트별 발견과 적용]]
