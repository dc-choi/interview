---
tags: [cicd, git, staging, commits, stash]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Git Working Tree and Commits", "Git 작업 트리와 커밋"]
verified_at: 2026-08-04
---

# Git 작업 트리와 커밋 관리

커밋 전 변경은 작업 트리와 인덱스를 오간다. 안전한 작업의 핵심은 현재 변경이 어느 공간에 있는지 `status`와 `diff`로 확인한 뒤, 필요한 조각만 커밋하거나 명시적으로 보존하고 버리는 것이다.

## 세 공간과 관찰 명령

| 공간 | 의미 | 확인 |
|---|---|---|
| 작업 트리 | 실제로 편집 중인 파일 | `git diff` |
| 인덱스 | 다음 커밋에 넣을 스냅샷 | `git diff --cached` |
| 저장소 | `HEAD`가 가리키는 커밋 그래프 | `git show HEAD` |

`git status`는 변경 파일을 분류하지만 실제 내용 차이는 `diff`로 확인한다. `git diff HEAD`는 작업 트리의 현재 상태와 `HEAD`를 비교하므로 staged와 unstaged 변경을 함께 점검할 때 유용하다.

## 필요한 변경만 스테이징하기

```bash
git add -p
git diff --cached
git commit -v
```

`git add -p`는 변경을 hunk 단위로 검토해 인덱스에 올린다. 한 파일에 기능 수정과 정리가 섞였을 때도 목적별 커밋으로 나눌 수 있다. 커밋 직전에는 `git diff --cached`로 실제 스냅샷을 확인한다. `git commit -v`는 편집기에 diff를 참고용으로 표시하지만 커밋 메시지에 diff를 포함하지는 않는다.

좋은 커밋은 특정 형식보다 다음 조건으로 판단한다.

- 한 가지 목적을 설명하고 독립적으로 검토할 수 있다.
- 빌드나 테스트를 의도치 않게 깨뜨리지 않는다.
- 메시지는 변경 내용뿐 아니라 필요한 이유를 남긴다.
- 생성물, 비밀 정보와 무관한 로컬 설정을 섞지 않는다.

## `.gitignore`의 경계

`.gitignore`는 아직 추적하지 않는 파일을 무시하도록 지정한다. 이미 추적 중인 파일에는 적용되지 않는다.

```bash
git rm --cached path/to/file
```

위 명령은 인덱스에서만 경로를 제거한다. 팀이 공유할 패턴은 저장소의 `.gitignore`, 해당 저장소에만 필요한 패턴은 `$GIT_COMMON_DIR/info/exclude`, 사용자 전역 패턴은 `core.excludesFile`로 나눈다. 비밀이 이미 커밋됐다면 ignore 추가만으로 기록에서 사라지지 않으므로 자격 증명을 먼저 폐기하고 별도의 이력 정리 절차를 밟는다.

## stash는 임시 선반이다

```bash
git stash push -m "wip: parser"       # tracked 변경 보관
git stash push -u -m "wip: parser"    # untracked도 포함
git stash list
git stash show -p stash@{0}
git stash apply stash@{0}
git stash drop stash@{0}
```

기본 `stash push`는 추적 중인 staged와 unstaged 변경을 보관한다. `-u`는 untracked까지, `-a`는 ignored 파일까지 포함하므로 범위를 먼저 확인한다. `apply`는 항목을 남기고 적용하며 `pop`은 적용에 성공하면 항목을 제거한다. 충돌로 `pop`이 실패하면 stash가 남을 수 있으므로 상태를 확인한 뒤 직접 해결한다.

오래 보존할 작업에는 이름 있는 브랜치와 커밋이 더 안전하다. stash는 로컬 전용이고 순서가 바뀔 수 있으므로 공유나 장기 백업 수단으로 취급하지 않는다.

## amend와 interactive rebase

```bash
git commit --amend
git rebase -i HEAD~5
```

`--amend`는 마지막 커밋을 수정하는 새 커밋을 만들고 현재 브랜치가 새 커밋을 가리키게 한다. interactive rebase도 선택한 커밋을 재작성한다. 이미 다른 사람이 기반으로 삼은 커밋에는 팀 합의와 복구 계획 없이 적용하지 않는다. 원격 ref를 다시 써야 한다면 [[Git-Reset-Reflog|force-with-lease와 range-diff]]로 보존과 검증을 먼저 한다.

## branch 이동과 파일 복원 구분

```bash
git switch feature
git switch -c new-feature
git switch --detach <commit>
```

`switch`는 branch와 detached HEAD 이동을 담당하고 `restore`는 경로 내용을 복원한다. `checkout`도 여전히 유효하지만 두 역할을 모두 가진 명령이므로 특히 경로 인자와 branch 이름이 겹칠 때 의도를 확인한다.

## 커밋 전 변경 되돌리기

`restore`는 대상을 명시해 작업 트리나 인덱스를 복원한다.

```bash
git restore -- path/to/file           # 인덱스 상태로 작업 파일 복원
git restore --staged -- path/to/file  # HEAD 상태로 인덱스 복원
git restore --source=<commit> -- path/to/file
```

첫 번째 명령은 커밋하지 않은 작업 트리 변경을 버릴 수 있다. 실행 전 `git diff`로 대상을 확인하고 필요한 변경은 patch, stash 또는 임시 커밋으로 보존한다.

## untracked 파일 삭제

```bash
git clean -nd   # 삭제 예정 파일과 디렉터리 미리 보기
git clean -fd   # 확인한 untracked 파일과 디렉터리 삭제
git clean -ndX  # ignored 파일만 미리 보기
```

`git clean`으로 지운 untracked 파일은 Git 객체나 reflog로 복구할 수 없다. 항상 `-n`으로 같은 범위를 미리 보고, `-x`가 ignored 파일까지 모두 포함한다는 점을 특히 주의한다.

## 출처

- Git 공식 문서: [gitignore](https://git-scm.com/docs/gitignore), [git add](https://git-scm.com/docs/git-add), [git commit](https://git-scm.com/docs/git-commit), [git stash](https://git-scm.com/docs/git-stash), [git switch](https://git-scm.com/docs/git-switch), [git restore](https://git-scm.com/docs/git-restore), [git clean](https://git-scm.com/docs/git-clean)
- 얄팍한 코딩사전, [Git에게 맡기지 않을 것들](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401000), [Git의 3가지 공간](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401053), [보다 세심하게 스테이징하고 커밋하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401069)
- 얄팍한 코딩사전, [커밋하기 애매한 변화 치워두기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401070), [커밋 수정하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401071), [과거의 커밋들을 수정, 삭제, 병합, 붙여넣기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401072)
- 얄팍한 코딩사전, [관리되지 않는 파일들 삭제하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401076), [커밋하지 않은 변경사항 되돌리기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401079)
- 얄팍한 코딩사전, [checkout 명령어에 대하여](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=417579)

## 관련 문서

- [[Git-Mental-Model|Git 멘탈 모델]], [[Git-Reset-Reflog|Git Reset과 복구]], [[Git-History-Debugging|Git 히스토리 분석과 디버깅]]
