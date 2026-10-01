---
tags: [ci-cd, git, version-control, tooling]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Version Control Tooling", "버전 관리 도구"]
verified_at: 2026-09-30
---

# 버전 관리 도구 선택

버전 관리 선택은 VCS, 저장소 호스팅과 클라이언트를 나누어 판단한다. Git과 GitHub는 같은 제품이 아니며 특정 조합이 널리 보인다는 사실만으로 조직의 기본값을 정하지 않는다.

## 세 가지 결정

| 층 | 결정 대상 | 핵심 질문 |
|---|---|---|
| VCS | Git, Subversion, Mercurial 등 | 이력과 branch를 어떤 모델로 저장하고 동기화하는가 |
| 호스팅 | GitHub, GitLab, Bitbucket, 자체 서버 등 | 권한, 리뷰, CI, 감사와 데이터 위치 요구를 충족하는가 |
| 클라이언트 | CLI, IDE 통합, GUI | 사용자가 같은 상태 모델을 정확히 관찰하고 조작할 수 있는가 |

호스팅을 바꿔도 VCS가 Git이면 commit과 branch의 기본 모델은 유지된다. 반대로 GitHub의 Issue, PR, Projects, Actions와 Pages는 Git 명령 자체의 기능이 아니다.

## VCS 모델 비교

### Git

Git은 분산형 VCS다. 일반적인 clone은 로컬에 저장소 데이터와 작업 트리를 두므로 commit, branch, log 같은 작업을 서버 연결 없이 수행하고 나중에 ref를 교환할 수 있다. commit은 트리 스냅샷을 가리키지만 저장 계층은 packfile에서 delta compression을 사용할 수 있다.

Git branch는 commit을 가리키는 ref여서 생성 자체가 가볍다. 이것이 merge 충돌, 검증과 장기 branch 운영 비용까지 자동으로 낮춘다는 뜻은 아니다.

### Subversion

Subversion은 중앙 저장소와 working copy를 사용하는 중앙집중형 VCS다. commit과 중앙 이력 조회 같은 저장소 작업은 서버와 상호작용한다. branch와 tag는 저장소 경로를 복사해 표현하지만 공식 구현의 copy는 저장 공간을 즉시 모두 복제하지 않는 cheap copy다. 따라서 복사 기반이라는 이유만으로 branch가 저장 용량 면에서 무겁다고 단정하지 않는다.

### Mercurial

Mercurial도 분산형 VCS로 로컬 commit과 repository 간 동기화를 지원한다. 기존 저장소, 조직의 운영 경험과 확장 기능이 있다면 단순 인기 비교보다 마이그레이션 비용과 상호 운용성을 먼저 평가한다.

## 선택 기준

새 도구를 정하거나 마이그레이션할 때 다음을 실제 저장소로 검증한다.

- monorepo 크기, binary 자산, 부분 checkout과 네트워크 특성
- branch, merge, release와 외부 기여 방식
- 계정 수명 주기, SSO, 권한 분리, audit와 규정 준수
- 백업, 재해 복구, 데이터 위치와 self-host 운영 부담
- CI runner, package registry, issue tracker와 IDE 통합
- export 가능성, API 안정성, 가격과 plan별 제한
- 교육, 변환, 이력 보존과 병행 운영 비용

호스팅 서비스의 가격과 기능은 바뀔 수 있다. 무료 여부나 가장 큰 생태계 같은 표현을 영구 사실처럼 문서에 고정하지 않고, 결정 시점의 공식 plan과 기능 문서를 확인해 decision record에 날짜와 요구사항을 남긴다.

## CLI와 GUI

CLI와 GUI는 서로 다른 Git이 아니라 같은 저장소를 조작하는 인터페이스다. 팀 전체에 하나만 강제하기보다 다음 기준으로 선택한다.

- CLI는 재현 가능한 명령 기록, 자동화와 원격 진단에 유리하다.
- GUI와 IDE는 graph, staging hunk와 conflict를 시각적으로 검토하는 데 유리하다.
- 어떤 도구를 쓰든 실행 전후 `status`, `diff`와 graph를 확인하고 실제 Git 명령 또는 변경 결과를 설명할 수 있어야 한다.
- 도구가 생성한 credential, merge 설정과 push 옵션을 저장소 정책에 맞게 점검한다.

### 도구와 무관하게 맞출 클라이언트 설정

CLI든 GUI든 같은 Git 설정을 읽으므로 설치 직후 다음을 맞춘다. 어느 scope의 값이 적용되는지는 [[GitHub-Repository-Operations|GitHub 저장소 운영]]의 `git config --show-origin`으로 확인한다.

```bash
git config --global init.defaultBranch main   # Git 2.28+
git config --global core.editor "code --wait" # GUI 편집기는 닫힐 때까지 기다리게 한다
git config --global alias.st status           # git st
```

- 기본 브랜치: 설정이 없으면 `git init`은 아직 `master`를 만들고 Git 3.0에서 `main`으로 바뀔 예정이라고 안내한다(2026-09-30 최신 2.56까지 3.0 미출시). GitHub는 새 저장소의 기본 브랜치를 `main`으로 만든다(계정과 조직 설정으로 변경 가능). 이름이 어긋난 채 push하면 원격에 별개의 브랜치가 생기므로 `init.defaultBranch`나 `git init -b main`으로 맞추고, 이미 만든 저장소는 `git branch -m master main`으로 바꾼다.
- 편집기: 메시지 없이 `git commit`을 실행하면 `GIT_EDITOR`, `core.editor`, `VISUAL`, `EDITOR` 순으로 고른 편집기가 열리고, 모두 없으면 보통 `vi`다. `git rebase -i`의 todo 목록은 `GIT_SEQUENCE_EDITOR`, `sequence.editor`를 먼저 보고 둘 다 없으면 이 순서를 따른다. `vi`는 `i`로 입력을 시작해 `:wq`로 저장 종료하고 `:q!`로 저장 없이 나간다. 새 커밋의 메시지를 비운 채 끝나면 `Aborting commit due to empty commit message.`로 커밋이 취소된다.
- 기다리지 않는 편집기: VS Code 계열처럼 실행 명령이 창만 띄우고 바로 끝나는 GUI 편집기는 파일이 닫힐 때까지 기다리는 `--wait` 같은 옵션이 없으면 Git이 편집 전의 파일을 그대로 읽는다. 새 커밋은 빈 메시지라 취소되지만, `commit --amend`와 `rebase --continue`는 미리 채워진 이전 메시지로, `rebase -i`는 바꾸지 않은 todo 목록으로 조용히 진행된다(Git 2.54에서 즉시 종료하는 편집기로 재현). 그래서 `--wait`는 새 커밋뿐 아니라 이 모든 편집에 필요하다.
- 별칭: 자주 쓰는 명령을 줄이되 로컬 설정이므로 공유 문서와 스크립트에는 원래 명령을 쓴다.

줄바꿈은 운영체제마다 다르다. Windows는 CRLF, macOS와 Linux는 LF를 쓰므로 변환 규칙이 팀원마다 다르면 내용 변화 없이 파일 전체가 바뀐 diff, 불필요한 충돌, 줄 끝 CR 때문에 실행이 깨지는 셸 스크립트가 생긴다.

| 설정 | 범위 | 동작 |
|---|---|---|
| `core.autocrlf=true` | 사용자별 | 모든 파일에 `text=auto`와 `core.eol=crlf`를 준 것과 같다. 작업 트리는 CRLF, 저장소는 LF |
| `core.autocrlf=input` | 사용자별 | 커밋할 때만 LF로 바꾸고 체크아웃 때는 변환하지 않는다 |
| `.gitattributes`의 `* text=auto` | 저장소에 커밋해 팀 전체 | Git이 텍스트로 판단한 파일을 LF로 저장한다. 이미 CRLF로 커밋된 파일은 변환하지 않는다 |
| `*.sh text eol=lf`, `*.png binary` | 저장소 | 셸 스크립트는 작업 트리에서도 LF로 고정하고, 바이너리는 줄바꿈 변환, 텍스트 diff와 텍스트 병합을 하지 않는다 |

개인 설정은 사람마다 달라질 수 있으므로 저장소의 `.gitattributes`를 기준으로 삼는다. 기존 저장소에 규칙을 추가해도 이미 커밋된 파일은 그대로이므로 깨끗한 작업 트리에서 `git add --renormalize .`로 다시 정규화해 별도 커밋으로 남긴다.

## Branch 전략은 배포 모델의 결과다

GitHub Flow, Git Flow와 trunk-based development는 팀 규모만으로 자동 선택되지 않는다.

- 지속 배포와 짧은 변경에는 짧은 branch와 trunk 통합이 잘 맞을 수 있다.
- 여러 지원 버전과 정기 릴리스가 있으면 release branch가 필요할 수 있다.
- 장기 branch가 많을수록 통합 지연과 충돌 비용을 관찰해야 한다.
- main이 항상 배포 가능한지는 전략과 CI, feature flag, release 정책으로 보장할 운영 목표이지 Git의 속성이 아니다.

선택한 전략에는 branch 수명, base 동기화, merge 방식, release cut, hotfix 전파와 삭제 기준을 함께 적는다. 구현은 [[Development-Workflow|개발 워크플로]]와 [[Git-Merge-Strategies|Git 통합 방식]]에서 구체화한다.

## 출처

- Git 공식 자료: [About Version Control](https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control), [What is Git](https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F)
- Git 공식 자료: [git config (core.autocrlf, core.editor, alias, init.defaultBranch)](https://git-scm.com/docs/git-config), [git init](https://git-scm.com/docs/git-init), [git var, GIT_EDITOR와 GIT_SEQUENCE_EDITOR](https://git-scm.com/docs/git-var), [gitattributes, End-of-line conversion](https://git-scm.com/docs/gitattributes), [git add --renormalize](https://git-scm.com/docs/git-add), [Git 2.28 release notes](https://github.com/git/git/blob/master/Documentation/RelNotes/2.28.0.adoc), [git-scm.com 최신 릴리스](https://git-scm.com/)
- [GitHub, Branches, About the default branch](https://docs.github.com/en/pull-requests/reference/branches), [GitHub, Managing the default branch name for your repositories](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/managing-the-default-branch-name-for-your-repositories), [VS Code, Command Line Interface (--wait)](https://code.visualstudio.com/docs/configure/command-line)
- [Version Control with Subversion](https://svnbook.red-bean.com/), [Mercurial 공식 사이트](https://www.mercurial-scm.org/)
- 얄팍한 코딩사전, [Git을 배워야 하는 이유](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=400989), [Git을 특별하게 만드는 것](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401052), [협업을 위한 브랜치 전략들](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=402881)
- 얄팍한 코딩사전, [GitHub을 사용하는 이유](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401036), [CLI vs. GUI](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=400996)
- 얄팍한 코딩사전, [설치 및 설정 (Windows)](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=400992), [설치 및 설정 (Mac)](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=400994), [Git 전역설정 & 프로젝트 관리 시작하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=400995), [변화를 타임캡슐에 담아 묻기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401002), [Git의 각종 설정](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401061)

## 관련 문서

- [[Development-Workflow|개발 워크플로]], [[GitHub-Repository-Operations|GitHub 저장소 운영]], [[git|Git 폴더 인덱스]], [[Code-Review-Culture|코드 리뷰 문화]]
