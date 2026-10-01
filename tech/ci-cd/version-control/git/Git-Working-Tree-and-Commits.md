---
tags: [cicd, git, staging, commits, stash]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Git Working Tree and Commits", "Git 작업 트리와 커밋"]
verified_at: 2026-09-30
---

# Git 작업 트리와 커밋 관리

커밋 전 변경은 작업 트리와 인덱스를 오간다. 안전한 작업의 핵심은 현재 변경이 어느 공간에 있는지 `status`와 `diff`로 확인한 뒤, 필요한 조각만 커밋하거나 명시적으로 보존하고 버리는 것이다.

## 세 공간과 관찰 명령

| 공간 | 의미 | 확인 |
|---|---|---|
| 작업 트리 | 실제로 편집 중인 파일 | `git diff` |
| 인덱스 | 다음 커밋에 넣을 스냅샷 | `git diff --cached` (`--staged`와 같다) |
| 저장소 | `HEAD`가 가리키는 커밋 그래프, `.git` 디렉터리에 저장 | `git show HEAD` |

`git status`는 변경 파일을 분류하지만 실제 내용 차이는 `diff`로 확인한다. `git diff HEAD`는 작업 트리의 현재 상태와 `HEAD`를 비교하므로 staged와 unstaged 변경을 함께 점검할 때 유용하다. `--name-only`를 붙이면 내용 없이 바뀐 파일 이름만 보여 변경 범위가 넓을 때 먼저 훑기 좋고, `git diff --staged --name-only`는 스테이징된 파일만 나열한다.

`git init`이 만드는 `.git` 디렉터리가 저장소 자체다. 이를 지우면 작업 파일은 남아도 push하지 않은 커밋, 로컬 브랜치, stash와 reflog가 함께 사라진다.

## 필요한 변경만 스테이징하기

```bash
git add -p
git diff --cached
git commit -v
```

`git add -p`는 변경을 hunk 단위로 검토해 인덱스에 올린다. 한 파일에 기능 수정과 정리가 섞였을 때도 목적별 커밋으로 나눌 수 있다. 프롬프트에서 `y`는 그 hunk를 스테이징하고 `n`은 건너뛰며, `s`는 더 작게 나누고 `e`는 직접 편집한다. `q`는 남은 hunk를 두고 끝내며 그때까지 고른 것만 반영되고, `?`는 전체 키를 보여 준다. 일부만 스테이징한 파일은 `git status`에서 staged와 unstaged 양쪽에 나타난다. 커밋 직전에는 `git diff --cached`로 실제 스냅샷을 확인한다. `git commit -v`는 편집기에 diff를 참고용으로 표시하지만 커밋 메시지에 diff를 포함하지는 않는다.

좋은 커밋은 특정 형식보다 다음 조건으로 판단한다.

- 한 가지 목적을 설명하고 독립적으로 검토할 수 있다.
- 빌드나 테스트를 의도치 않게 깨뜨리지 않는다.
- 메시지는 변경 내용뿐 아니라 필요한 이유를 남긴다.
- 생성물, 비밀 정보와 무관한 로컬 설정을 섞지 않는다.

### 단축 명령이 스테이징하는 범위

| 명령 | 하는 일 | 주의 |
|---|---|---|
| `git add .` | 현재 디렉터리 아래의 새 파일, 수정, 삭제를 스테이징 | 상위 경로의 변경은 빠진다 |
| `git add -A` | 작업 트리 전체의 새 파일, 수정, 삭제를 스테이징 | 경로를 주면 그 경로로 한정한다 |
| `git commit -a`, `-am "메시지"` | 추적 중인 파일의 수정과 삭제를 스테이징하고 커밋 | Git이 모르는 새 파일은 빠진다 |
| `git rm <파일>` | 파일을 지우고 그 삭제를 스테이징 | 커밋하지 않은 수정이 있으면 거부한다. `--cached`는 인덱스에서만 뺀다 |
| `git mv <이전> <새 이름>` | 파일을 옮기고 그 변경을 스테이징 | 옮긴 뒤 `git rm`, `git add`를 한 것과 같다 |

`commit -am`만 쓰는 습관은 새 파일이 빠진 커밋을 만든다. 커밋 전 `git status`의 untracked 목록을 확인한다. Git은 이름 변경을 따로 기록하지 않고 스냅샷 사이의 내용 유사도로 rename을 추정하므로 편집기에서 이름을 바꾼 뒤 `git add -A`해도 결과는 같다. 이름이 바뀐 파일 하나의 이력은 `git log --follow -- <파일>`로 이어 본다.

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

```bash
git stash push -p -m "wip: 일부"         # hunk를 골라 일부만 보관
git stash branch wip/parser stash@{1}   # 보관 당시 커밋에서 새 브랜치를 만들어 복원
git stash clear                         # 모든 항목 삭제
```

원래 브랜치가 많이 바뀌어 `apply`가 충돌하면 `stash branch`를 쓴다. 그 stash를 만들 때의 `HEAD` 커밋에서 새 브랜치를 만들고 변경을 작업 트리와 인덱스에 되살리므로 충돌 없이 복원되며, 성공하면 그 항목을 목록에서 지운다. `clear`나 `drop`으로 지운 항목은 일반 복구 수단으로 되살릴 수 없고, gc 전까지 `git fsck --unreachable`로 찾아볼 여지만 남는다.

오래 보존할 작업에는 이름 있는 브랜치와 커밋이 더 안전하다. stash는 로컬 전용이고 순서가 바뀔 수 있으므로 공유나 장기 백업 수단으로 취급하지 않는다.

## amend와 interactive rebase

```bash
git commit --amend -m "새 메시지"   # 스테이징된 변경이 없을 때만 메시지만 교체
git add forgotten.ts
git commit --amend --no-edit       # 빠뜨린 변경을 넣고 메시지는 유지
git rebase -i <고칠 커밋 중 가장 오래된 커밋>^   # 또는 HEAD~5
```

`--amend`는 마지막 커밋을 수정하는 새 커밋을 만들고 현재 브랜치가 새 커밋을 가리키게 한다. `git reset --soft HEAD^` 뒤 다시 커밋하는 것과 거의 같고, 메시지를 주지 않으면 원래 메시지를 편집 시작점으로 연다. 새 커밋에는 그 시점의 인덱스가 기록되므로, 스테이징해 둔 변경이 있으면 `-m`으로 메시지만 고치려 해도 그 변경이 알림 없이 함께 들어간다. 메시지만 고칠 때는 먼저 `git diff --cached`가 비어 있는지 확인한다. interactive rebase도 선택한 커밋을 재작성한다. 이미 다른 사람이 기반으로 삼은 커밋에는 팀 합의와 복구 계획 없이 적용하지 않는다. 원격 ref를 다시 써야 한다면 [[Git-Reset-Reflog|force-with-lease와 range-diff]]로 보존과 검증을 먼저 한다.

`rebase -i`에 넘긴 기준 커밋은 목록에 나오지 않으므로 고칠 커밋 중 가장 오래된 것의 부모를 넘긴다. 편집기 목록은 오래된 커밋이 위에 오고, 줄의 `pick`을 바꿔 저장하면 위에서부터 다시 적용한다.

- `reword`: 그 커밋의 메시지 편집 화면이 이어서 열린다.
- `drop` 또는 줄 삭제: 그 커밋을 이력에서 뺀다.
- `squash`, `fixup`: 그 줄의 커밋을 바로 위 줄 커밋에 합친다. `squash`는 두 메시지를 이어 붙여 편집하게 하고 `fixup`은 위 커밋의 메시지만 남긴다.
- `edit`: 그 커밋을 적용한 직후 멈춘다. 커밋을 나누려면 `git reset HEAD^`로 커밋만 되돌려 변경을 작업 트리에 남기고, `git add -p`와 `git commit`을 작업 단위로 반복한 뒤 `git rebase --continue`로 나머지를 재적용한다.

과거 커밋 하나를 고치면 그 뒤 커밋은 내용이 같아도 부모가 달라져 모두 새 해시가 된다. 서로 다른 작업이 한 커밋에 섞였으면 `edit`로 나누고, 한 작업이 여러 커밋에 흩어졌거나 저장하듯 잦게 만든 커밋은 `squash`나 `fixup`으로 합친다. 나누거나 합친 중간 커밋이 빌드와 테스트를 통과하는지 확신할 수 없으면 커밋마다 남은 변경을 stash해 두고 검증한다. 메시지 편집기 설정과, 기다리지 않는 편집기에서 `commit --amend`와 `rebase -i`가 취소되지 않고 이전 메시지나 todo 목록 그대로 진행되는 문제는 [[Version-Control-Tooling#도구와 무관하게 맞출 클라이언트 설정|클라이언트 설정]]을 따른다.

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

```bash
git clean -id   # 후보를 보여 준 뒤 메뉴에서 골라 지우기
```

`clean.requireForce`가 기본 true라 `-f` 없이는 삭제를 거부하고, `-i`는 대화형 확인으로 이를 대신한다. `-d`가 없으면 untracked 디렉터리 안으로 들어가지 않으므로 새 폴더까지 정리하려면 붙인다. `-i` 메뉴의 filter by pattern은 제외 패턴을, select by numbers는 번호와 범위를 받아 대상을 줄이고, ask each는 항목마다 삭제 여부를 묻는다. clone 직후 상태로 되돌릴 때는 `git clean -fdx`를 `git reset --hard`나 `git restore`와 함께 쓰는데, 커밋하지 않은 변경과 함께 `.env` 같은 로컬 설정, 빌드 산출물과 설치한 의존성까지 사라진다.

## 출처

- Git 공식 문서: [gitignore](https://git-scm.com/docs/gitignore), [git add](https://git-scm.com/docs/git-add), [git commit](https://git-scm.com/docs/git-commit), [git stash](https://git-scm.com/docs/git-stash), [git switch](https://git-scm.com/docs/git-switch), [git restore](https://git-scm.com/docs/git-restore), [git clean](https://git-scm.com/docs/git-clean)
- Git 공식 문서: [git rebase, INTERACTIVE MODE와 SPLITTING COMMITS](https://git-scm.com/docs/git-rebase), [git rm](https://git-scm.com/docs/git-rm), [git mv](https://git-scm.com/docs/git-mv), [git diff](https://git-scm.com/docs/git-diff), [git log](https://git-scm.com/docs/git-log), [gitrepository-layout](https://git-scm.com/docs/gitrepository-layout), [Pro Git 2.2 Recording Changes to the Repository](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)
- 얄팍한 코딩사전, [Git에게 맡기지 않을 것들](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401000), [Git의 3가지 공간](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401053), [보다 세심하게 스테이징하고 커밋하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401069)
- 얄팍한 코딩사전, [커밋하기 애매한 변화 치워두기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401070), [커밋 수정하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401071), [과거의 커밋들을 수정, 삭제, 병합, 붙여넣기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401072)
- 얄팍한 코딩사전, [관리되지 않는 파일들 삭제하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401076), [커밋하지 않은 변경사항 되돌리기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401079)
- 얄팍한 코딩사전, [checkout 명령어에 대하여](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=417579)
- 얄팍한 코딩사전, [Git 전역설정 & 프로젝트 관리 시작하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=400995), [변화를 타임캡슐에 담아 묻기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401002), [어떻게 커밋하는게 좋을까요?](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401068), [차이 살펴보기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=404540)

## 관련 문서

- [[Git-Mental-Model|Git 멘탈 모델]], [[Git-Reset-Reflog|Git Reset과 복구]], [[Git-History-Debugging|Git 히스토리 분석과 디버깅]]
