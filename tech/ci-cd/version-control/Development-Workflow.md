---
tags: [ci-cd, workflow, process, github]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Development Workflow", "개발 프로세스"]
verified_at: 2026-08-04
---

# 개발 워크플로, Issue에서 Merge까지

Issue, branch, commit과 pull request를 연결하면 변경의 목적, 구현과 검증 기록을 함께 추적할 수 있다. 다만 한 이슈, 한 브랜치, 한 PR은 유용한 기본 템플릿이지 GitHub가 강제하는 표준이나 모든 작업에 맞는 법칙은 아니다. 작업 위험, 배포 방식과 팀 정책에 맞게 단위를 조정한다.

## 기본 흐름

```text
Issue 또는 작업 설명
  -> branch에서 변경
  -> 목적별 commit
  -> PR과 자체 검토
  -> CI와 필요한 리뷰
  -> 팀이 정한 방식으로 merge
  -> 배포, 관찰과 후속 작업
```

이 흐름의 목적은 절차 수를 늘리는 것이 아니라 다음 질문에 답하는 것이다.

- 왜 바꿨는가, 어떤 요구사항과 위험이 있었는가
- 무엇을 검증했고 누가 어떤 근거로 승인했는가
- 어느 배포에 포함됐고 문제가 생기면 무엇을 되돌릴 것인가

오타처럼 위험이 낮은 작업은 이슈 없이 PR 설명만으로 충분할 수 있다. 반대로 여러 저장소와 팀에 걸친 기능은 하나의 상위 이슈 아래 여러 branch와 PR로 나누는 편이 추적과 리뷰에 안전하다.

## Issue와 Project

Issue에는 해결책을 미리 고정하기보다 문제와 완료 조건을 먼저 남긴다.

- 배경과 사용자 또는 운영 영향
- 재현 방법이나 현재 관찰값
- 범위와 제외 범위
- acceptance criteria와 검증 방법
- 관련 문서, 로그와 의존 작업

담당자 수, label과 상태 체계는 팀 정책이다. 공동 작업이면 여러 담당자나 하위 이슈가 더 정확할 수 있다. GitHub Projects는 issue와 PR을 table, board, roadmap으로 보고 custom field와 automation으로 관리할 수 있으므로 단순 칸반 보드로 한정하지 않는다.

## Branch와 commit

branch 이름은 검색과 정리에 도움이 되는 최소 규칙만 둔다.

```text
<type>/<issue-number>-<short-description>

feature/12-comment-delete
fix/34-login-null-check
docs/56-runbook
```

이슈 번호가 없는 작업이나 자동화 branch라면 저장소 정책에 맞는 다른 식별자를 쓴다. branch 이름만으로 연결을 보장하지 말고 PR 본문과 이슈 링크를 함께 둔다.

커밋은 독립적으로 이해하고 검증 가능한 목적 단위로 만든다. Conventional Commits는 변경 유형을 기계가 읽게 하는 선택적 규약이며 Git의 요구사항은 아니다. 프로젝트가 사용한다면 실제 허용 type, scope와 breaking change 표기를 저장소 문서와 검사로 일치시킨다.

## Pull request

좋은 PR은 줄 수 기준보다 한 가지 의사결정을 검토할 수 있는 응집된 범위를 가진다.

- 목적, 접근 방식과 대안을 설명한다.
- 테스트 결과와 수동 검증, 배포 및 롤백 방법을 남긴다.
- 데이터 마이그레이션, 보안과 호환성 위험을 표시한다.
- 생성된 코드와 무관한 포맷 변경을 분리한다.
- 작성자가 diff를 먼저 읽고 불필요한 변경을 제거한다.

PR이 커졌다면 무조건 파일을 쪼개기보다 리뷰 가능한 선행 refactor, 스키마, 기능과 후속 정리로 나눌 수 있는지 판단한다. 동작이 함께 배포되어야 하거나 분할이 더 위험하면 큰 이유와 리뷰 순서를 명시한다.

## Issue 연결과 자동 닫힘

GitHub에서 PR 본문에 `Closes #12`, `Fixes #12`, `Resolves #12` 같은 keyword를 쓰면 PR이 해당 저장소의 default branch에 merge될 때 연결된 이슈가 자동으로 닫힌다.

- default branch가 아닌 branch로 merge할 때는 자동 닫히지 않는다.
- 다른 저장소 이슈는 `Closes OWNER/REPOSITORY#12`처럼 한정한다.
- 단순 참조만 필요하면 keyword 없이 `#12`를 링크한다.
- merge 전에는 연결 관계와 base branch를 GitHub UI에서 확인한다.

## Merge 방식과 저장소 규칙

Merge commit, squash와 rebase는 히스토리 모양과 보존 정보가 다르다. 어느 하나가 보편적으로 가장 많이 쓰이거나 항상 낫다고 가정하지 않고 [[Git-Merge-Strategies|Git 통합 방식]]의 기준으로 저장소 정책을 정한다.

main을 항상 배포 가능한 상태로 유지하는 팀이라면 ruleset 또는 branch protection에 다음 조건을 조합할 수 있다.

- PR을 통한 변경
- 필수 CI status checks
- 필요한 수의 승인과 code owner 검토
- 최신 base 반영 또는 merge queue
- force push와 branch 삭제 제한
- 서명된 commit이나 선형 히스토리

모든 항목을 무조건 켜면 작은 팀과 긴급 복구를 불필요하게 막을 수 있다. 규칙마다 보호하려는 실패, 우회 권한, 장애 시 절차와 감사 기록을 함께 정한다. PR 자체가 승인을 강제하는 것이 아니라 이 저장소 규칙이 강제한다.

## Fork와 외부 기여

원본 저장소에 branch push 권한이 없으면 fork에서 branch를 만들고 원본으로 PR을 보낸다. 흔히 원본을 `upstream`, 자신의 fork를 `origin`으로 두지만 이름은 관례다.

```bash
git remote add upstream https://github.com/OWNER/REPOSITORY.git
git fetch upstream
git branch -vv
```

기여 전에는 원본 저장소의 contribution guide, base branch, 테스트와 commit 정책을 우선한다. 자세한 인증과 remote 모델은 [[GitHub-Repository-Operations|GitHub 저장소 운영]]을 참고한다.

## Hotfix와 오래 사는 변경

Hotfix 출발점과 되돌려 합칠 branch는 실제 배포 branch 전략으로 결정한다. 모든 저장소에 `develop`이 있다고 가정하지 않는다. 수정 후에는 운영 배포뿐 아니라 영향받는 활성 branch, release와 changelog에도 필요한 변경을 반영한다.

오래 걸리는 기능은 다음 중 위험이 낮은 방법을 고른다.

- 작고 동작 가능한 조각을 main에 merge하고 feature flag로 노출을 제어한다.
- 격리 branch를 유지하되 base 동기화 방식을 merge 또는 rebase 중 팀 정책으로 정한다.
- API 호환 계층과 점진적 마이그레이션으로 배포 단위를 나눈다.

공유 branch를 정기적으로 rebase하면 다른 사람의 기반 commit을 다시 쓸 수 있다. branch 소유권과 force push 정책이 명확하지 않다면 merge가 더 안전할 수 있다.

## 개인 저장소의 적용 수준

혼자 작업해도 중요한 변경에는 목적과 검증 기록이 유용하다. 그러나 모든 사소한 수정에 issue와 PR을 의무화할 필요는 없다. 되돌리기 비용, 미래의 설명 필요성과 자동화 검증 가치를 기준으로 commit만 쓸지, branch와 PR까지 쓸지 정한다.

## 출처

- GitHub 공식 문서: [Pull requests](https://docs.github.com/en/pull-requests/reference/pull-requests), [Linking a pull request to an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue), [About Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects)
- GitHub 공식 문서: [Configuring a remote for a fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/configuring-a-remote-repository-for-a-fork), [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- 얄팍한 코딩사전, [풀 리퀘스트](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=406135), [이슈와 프로젝트](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=406269), [오픈소스에 참여하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=406630)

## 관련 문서

- [[GitHub-Repository-Operations|GitHub 저장소 운영]], [[Version-Control-Tooling|버전 관리 도구 선택]], [[Git-Merge-Strategies|Git 통합 방식]], [[Code-Review-Culture|코드 리뷰 문화]]
