---
tags: [cicd, git, version-control]
status: index
verified_at: 2026-08-04
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Git 폴더", "Git 인덱스"]
---

# Git

깃의 내부 모델, 머지 전략과 복구 노트 묶음. 상위 인덱스는 [[version-control|버전 관리]].

## 문서

- [[Git-Mental-Model|Git 멘탈 모델 (커밋 스냅샷/브랜치 포인터/HEAD, fast-forward, 3-way merge, rebase 원리)]]
- [[Git-Working-Tree-and-Commits|Git 작업 트리와 커밋 관리 (staging, stash, restore, clean)]]
- [[Git-Merge-Strategies|Git 통합 방식 (Merge commit/Squash/Rebase, fast-forward와 히스토리 재작성)]]
- [[Git-Reset-Reflog|Git Reset과 복구 (reset/revert, reflog, force-with-lease, range-diff)]]
- [[Git-History-Debugging|Git 히스토리 분석과 디버깅 (log/diff, blame, bisect, tag)]]
- [[Git-Worktree-and-Hooks|Git worktree와 hooks (병렬 작업 트리, 로컬 자동화와 CI 경계)]]

## 실무 학습 순서

Git은 명령어 암기보다 현재 상태와 명령 뒤의 변화를 예측하는 능력으로 확인한다. 검색이 현재 역할 기술의 1순위이며, Git은 GraphQL과 Redis처럼 업무에서 계속 쓰는 공통 기반이다. 별도 대형 커리큘럼을 열지 않고 실제 작업에서 드러난 빈칸 하나를 아래 순서로 보강한다.

1. 상태 모델: commit DAG, branch와 HEAD, working tree, index, local branch, remote-tracking branch와 upstream을 `status`와 `diff`로 확인
2. 협업 변경: fetch 뒤 차이 확인, merge/rebase/squash 선택과 conflict 해결
3. 진단과 복구: log/diff, stash, reset/revert, reflog, backup branch와 `--force-with-lease`

파괴적 실습은 실제 업무 저장소나 공유 원격이 아니라 버려도 되는 로컬 저장소와 로컬 bare remote에서만 한다. 실제 저장소에서는 팀 정책과 현재 상태를 먼저 확인하고, ref를 움직이기 전에 작업 트리와 로컬 전용 커밋을 보존한다.

## 상황별 작은 gate

전체를 한 번에 완료하지 않는다. 현재 업무에서 드러난 빈칸과 맞는 행 하나만 골라 결과와 짧은 기록을 남기면 해당 빈칸을 닫고 원래 작업으로 돌아간다.

| 현재 빈칸 | 작은 통과 gate |
|---|---|
| 상태와 staging | 갈라진 graph를 만들고 `status`, `diff`, `diff --cached`로 working tree/index를 구분하며 HEAD와 local/remote-tracking branch의 ahead/behind를 설명한다 |
| pull과 upstream 진단 | branch/upstream, pull 설정과 fetch 뒤 graph를 확인해 fast-forward 가능 여부와 다음 명령을 근거로 고른다 |
| 통합과 conflict | merge 또는 rebase를 선택해 conflict를 해결하고 전후 graph와 변경 내용이 의도대로인지 검증한다 |
| 보존과 복구 | dirty working tree와 로컬 전용 commit을 보존하고 reset/rebase 사고를 reflog와 backup branch로 복구하며, 공유 commit에는 revert를 고르는 이유를 설명한다 |
| 선택적 patch와 회귀 추적 | 실제 필요가 생겼을 때만 특정 commit을 cherry-pick하거나 `git bisect`로 회귀를 만든 commit을 찾는다 |
| 팀 workflow | 실제 팀의 pull, merge, force-push와 PR 규칙 중 이번 판단에 필요한 부분만 확인해 한 페이지로 정리한다 |

실제 Git 사고를 처리했더라도 해당 상태 변화와 복구 이유를 자료 없이 설명하거나 안전한 로컬 저장소에서 재현하지 못하면 그 빈칸을 닫은 것으로 계산하지 않는다. Incident note는 사고가 있었을 때만 증상, 가설, 보존, 복구와 검증 순서로 남긴다.

## 출처

- [Git workflows](https://git-scm.com/docs/gitworkflows)
- [Git user manual](https://git-scm.com/docs/user-manual)
- [git bisect](https://git-scm.com/docs/git-bisect)
- [git push, force-with-lease](https://git-scm.com/docs/git-push)
