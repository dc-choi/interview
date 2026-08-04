---
tags: [cicd, git, worktree, hooks, automation]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Git Worktree and Hooks", "Git Worktree와 Hooks"]
verified_at: 2026-08-04
---

# Git worktree와 hooks

`worktree`는 한 저장소의 여러 브랜치를 동시에 펼치고, hooks는 Git 명령의 특정 시점에 로컬 프로그램을 실행한다. 전자는 병렬 작업을 편하게 하지만 작업 디렉터리를 자동 동기화하지 않는다. 후자는 빠른 피드백을 주지만 clone만으로 팀 전체에 배포되는 정책 장치는 아니다.

## linked worktree의 모델

주 작업 트리 외에 linked worktree를 만들면 저장소의 객체 데이터베이스와 대부분의 refs를 공유하면서 각 작업 트리가 별도의 파일, 인덱스와 `HEAD`를 가진다.

```bash
git worktree add ../repo-hotfix -b hotfix/login main
git worktree add ../repo-review <commit-or-branch>
git worktree list
```

- 한 worktree의 커밋 객체와 브랜치 ref는 같은 저장소에서 보이지만 다른 worktree의 파일이 자동으로 갱신되지는 않는다.
- 안전하지 않은 동시 ref 변경을 막기 위해 한 브랜치는 보통 둘 이상의 worktree에서 동시에 체크아웃할 수 없다.
- 임시 리뷰, 긴 빌드와 긴급 수정처럼 stash나 branch switch 비용이 큰 병렬 작업에 적합하다.
- 같은 프로젝트를 완전히 독립된 저장소로 실험하거나 객체와 설정까지 격리해야 한다면 별도 clone이 더 알맞다.

## 제거와 정리

```bash
git worktree remove ../repo-hotfix
git worktree prune --dry-run
git worktree prune
```

제거 전 각 worktree에서 `git status`를 확인하고 변경을 커밋, stash 또는 별도 patch로 보존한다. 디렉터리를 파일 시스템에서 먼저 지웠다면 관리 메타데이터가 남을 수 있고 `prune`이 이를 정리한다. 이동식 디스크처럼 일시적으로 사라지는 worktree는 `git worktree lock`으로 prune 대상이 되지 않게 할 수 있다.

## hooks가 실행되는 위치

Git hooks는 commit, rebase, push 수신 같은 이벤트에서 이름이 정해진 실행 파일을 호출한다. 기본 hook 디렉터리는 `$GIT_DIR/hooks`이며 `core.hooksPath`로 다른 경로를 지정할 수 있다.

| hook | 실행 시점 | 흔한 용도 |
|---|---|---|
| `pre-commit` | 커밋 객체 생성 전 | 빠른 포맷, lint, 비밀 탐지 |
| `commit-msg` | 메시지 확정 전 | 커밋 메시지 규칙 검사 |
| `pre-push` | 원격으로 객체를 보내기 전 | 영향 범위 테스트 |
| `pre-receive`, `update` | 서버가 push를 수락하기 전 | 서버 측 ref 정책 |

많은 클라이언트 hook은 0이 아닌 종료 코드로 작업을 중단할 수 있다. 일부는 `--no-verify`로 건너뛸 수 있으므로 보안이나 병합 조건의 유일한 통제로 삼지 않는다.

## 팀에 배포할 때의 경계

`.git/hooks`는 일반 작업 트리에 없으며 clone이나 pull로 자동 공유되지 않는다. hook 스크립트를 저장소 안에 버전 관리하고 설치 스크립트, hook manager 또는 `core.hooksPath`로 연결할 수 있지만 각 개발 환경에서 설치가 필요하다.

팀의 필수 조건은 다음처럼 계층화한다.

1. 로컬 hook은 빠른 피드백과 실수 예방을 담당한다.
2. CI는 동일 검사를 깨끗한 환경에서 다시 실행한다.
3. GitHub ruleset이나 branch protection은 통과한 검사와 리뷰를 merge 조건으로 강제한다.
4. 자체 Git 서버를 운영한다면 서버 측 hooks를 추가할 수 있다.

hook은 개발자 권한으로 실행되므로 외부 기여 저장소의 설치 스크립트를 검토 없이 실행하지 않고 자격 증명을 출력하지 않는다. 오래 걸리는 전체 테스트는 로컬 push를 과도하게 막기보다 CI로 옮기고 hook에는 빠른 검사만 둔다.

## 출처

- Git 공식 문서: [git worktree](https://git-scm.com/docs/git-worktree), [githooks](https://git-scm.com/docs/githooks), [core.hooksPath](https://git-scm.com/docs/git-config#Documentation/git-config.txt-corehooksPath)
- GitHub 공식 문서: [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), [GitHub Actions](https://docs.github.com/en/actions)
- 얄팍한 코딩사전, [Git Hook](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=405146), [worktree, 여러 브랜치 동시에 작업하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=405703)

## 관련 문서

- [[Git-Working-Tree-and-Commits|Git 작업 트리와 커밋 관리]], [[Development-Workflow|개발 워크플로]], [[GitHub-Actions|GitHub Actions]]
