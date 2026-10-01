---
tags: [cicd, github, pull-request, repository, authentication]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["GitHub Repository Operations", "GitHub 저장소 운영"]
verified_at: 2026-09-30
---

# GitHub 저장소 운영

Git은 로컬에서도 동작하는 버전 관리 시스템이고 GitHub는 Git 저장소에 협업, 정책, 자동화와 배포 기능을 더하는 호스팅 플랫폼이다. Git 명령의 데이터 모델과 GitHub의 제품 기능을 구분해야 인증, PR, 릴리스와 자동화 문제를 정확히 진단할 수 있다.

## remote, tracking과 인증

`origin`과 `upstream`은 관례적인 remote 이름일 뿐 특별한 키워드가 아니다. remote-tracking branch인 `origin/main`은 로컬이 마지막으로 갱신한 원격 ref의 기록이지 서버를 실시간으로 보는 포인터가 아니며, 로컬 `main`과 자동으로 같은 상태가 되지 않는다. upstream branch는 인자 없는 `pull`과 `push`가 어느 원격 ref를 대상으로 할지 정하는 별도 설정이다.

```bash
git remote -v
git fetch origin
git branch -vv
git remote get-url origin
```

`fetch`는 원격 ref를 읽어 remote-tracking branch를 갱신하지만 현재 branch와 작업 파일을 통합하지 않는다. `pull`은 먼저 fetch한 뒤 현재 branch에 merge 또는 rebase를 수행한다. 저장소의 히스토리 정책에 맞춰 `--ff-only`, `--rebase` 같은 동작을 명시하고 실행 전후 graph를 확인한다. `git push -u origin feature`의 `-u`는 이후 인자 없는 pull과 push에 사용할 upstream branch를 설정한다.

설정의 실제 출처는 다음처럼 확인한다.

```bash
git config --show-origin --show-scope --list
```

일반적으로 system, global, local 순으로 더 가까운 scope의 단일 값이 우선한다. `user.name`과 `user.email`은 commit의 author 메타데이터이지 GitHub 로그인 자격 증명이 아니다.

GitHub의 HTTPS와 SSH 연결은 모두 암호화된 전송과 인증을 제공한다.

- HTTPS는 비밀번호 대신 토큰, 자격 증명 관리자 또는 GitHub CLI가 관리하는 자격 증명을 사용한다.
- SSH는 공개키를 GitHub 계정에 등록하고 로컬 개인키로 인증한다.
- 어느 방식이 항상 더 안전한 것이 아니다. 키와 토큰의 범위, 보관, 회전, 조직 정책과 실행 환경으로 선택한다.

토큰과 자격 증명 도우미, SSH 키 생성과 호스트 키 확인, 커밋 서명 설정은 [[GitHub-Repository-Operations-Auth-and-Signing|GitHub 인증과 커밋 서명]]에서 다룬다.

## 기존 로컬 프로젝트를 새 원격에 올릴 때

GitHub에서 README, `.gitignore`, license를 함께 만든 저장소에는 이미 root commit이 있어 로컬에서 따로 시작한 이력과 공통 조상이 없다. GitHub 문서는 기존 코드를 올릴 때 이 파일들로 초기화하지 말고 push한 뒤에 추가하라고 안내한다.

```bash
git init -b main                  # Git 2.28+. 이미 만든 저장소는 git branch -m main
git add . && git commit -m "init"
git remote add origin <URL>
git push -u origin main
```

초기 파일이 있는 원격과 만나면 다음처럼 멈춘다 (Git 2.54, pull 설정 없음 재현).

| 상황 | 결과 | 처리 |
|---|---|---|
| 로컬 커밋 없이 같은 경로의 untracked 파일이 있는 채 pull | `untracked working tree files would be overwritten by merge` 후 중단 | 겹치는 파일을 옮기거나 지운 뒤 다시 받는다 |
| 로컬 커밋 뒤 설정 없이 pull | divergent branches 오류로 중단 | `--rebase`나 `--no-rebase`를 고른다 |
| `--no-rebase`(merge) | `refusing to merge unrelated histories` | 두 이력을 합치는 것이 의도일 때만 `--allow-unrelated-histories` |
| `--rebase` | 로컬 커밋을 원격 root commit 위로 옮긴다 | 양쪽이 같은 파일을 추가했다면 add/add 충돌을 해결한다 |

Vite 같은 프로젝트 생성 도구도 `README.md`와 `.gitignore`를 만들어 원격 초기 파일과 경로가 겹치기 쉽다. 로컬 브랜치가 `master`인 채 push하면 원격 `main`과 별개의 브랜치가 생기므로 이름을 먼저 맞춘다([[Version-Control-Tooling#도구와 무관하게 맞출 클라이언트 설정|클라이언트 설정]]). `.gitignore` 템플릿은 배포 입력에도 영향을 준다. GitHub의 Node 템플릿은 `.env`와 `.env.*`를 무시하므로 build에 필요한 공개 env 파일이 저장소에 없을 수 있다([[Single-Host-SPA-API-Deployment#SPA 환경 변수는 public configuration이다|SPA 환경 변수]]).

## 원격 브랜치 생애주기

```bash
git push -u origin feature        # 원격에 같은 이름의 브랜치를 만들고 upstream 연결
git branch -a                     # 로컬과 remote-tracking branch를 함께 보기
git switch fromRemote             # origin/fromRemote를 추적하는 로컬 브랜치 생성
git branch -d feature             # 병합된 로컬 브랜치 삭제
git push origin --delete feature  # 원격 브랜치 삭제
git fetch --prune                 # 원격에서 사라진 remote-tracking branch 정리
git branch -m old-name new-name   # 로컬 브랜치 이름 변경
```

- upstream이 없는 새 브랜치에서 인자 없는 `git push`는 `The current branch <이름> has no upstream branch.`로 멈추고 `git push --set-upstream origin <이름>`을 안내한다. 한 번 연결하면 이후 `git push`와 `git pull`은 그 원격 브랜치를 대상으로 한다. `push.autoSetupRemote=true`(Git 2.37+)는 upstream이 없을 때 `--set-upstream`을 가정한다.
- `git switch <이름>`은 로컬에 없고 한 원격에만 같은 이름의 remote-tracking branch가 있으면 `git switch -c <이름> --track <원격>/<이름>`처럼 동작한다. 원격이 여럿이면 `checkout.defaultRemote`로 고른다. `git checkout -t origin/<이름>`도 같은 결과다.
- `-d`는 upstream이나 `HEAD`에 완전히 병합된 브랜치만 지우고 미병합 브랜치는 `not fully merged`로 거부한다. 그 커밋을 버려도 된다고 확인했을 때만 `-D`로 강제한다. 현재 체크아웃한 브랜치는 다른 브랜치로 옮긴 뒤 지운다.
- 로컬 삭제와 원격 삭제는 서로 영향을 주지 않는다. 다른 사람이 원격 브랜치를 지워도 로컬의 `origin/<이름>`은 `fetch --prune`이나 `fetch.prune=true` 전까지 `branch -a`에 남는다.
- `-M`은 같은 이름의 브랜치가 있어도 덮어쓰는 강제 이름 변경이다.
- `git remote remove <이름>`은 로컬의 remote 설정과 그 remote-tracking branch만 지우며 서버의 저장소는 그대로다.

## push가 거절될 때와 fetch 뒤 검토

원격 브랜치에 내가 받지 않은 커밋이 먼저 올라가 있으면 push는 `! [rejected] main -> main (fetch first)`로 거절된다. 기준은 커밋을 만든 시각이 아니라 원격에 먼저 도착한 순서다. 원격 커밋을 받아 통합한 뒤 push한다. 원격을 내 로컬로 덮어쓰는 `--force`는 그 사이 올라간 동료의 커밋을 지우므로 [[Git-Reset-Reflog|`--force-with-lease`와 백업 절차]]를 따른다.

git-pull 문서 기준 Git 2.33.1부터 통합 방식을 정하지 않은 `git pull`은 `--ff-only`로 동작한다. 원격만 앞섰으면 fast-forward로 끝나지만 양쪽에 커밋이 있으면 `fatal: Need to specify how to reconcile divergent branches.`로 멈춘다. 이때 `git pull --rebase`나 `git pull --no-rebase`(merge)를 명시하거나 저장소 정책에 맞춰 `pull.rebase`를 정한다. rebase는 로컬 커밋을 원격 최신 커밋 뒤로 다시 만들어 선형 이력을 남기고, merge는 갈라진 흔적과 merge commit을 남긴다. 선택 기준은 [[Git-Merge-Strategies|Git 통합 방식]], 충돌 처리는 [[Git-Mental-Model#충돌이 났을 때의 처리 절차|Git 멘탈 모델]]을 따른다.

받은 내용을 통합 전에 보려면 fetch와 pull을 나눈다.

```bash
git fetch origin
git log --oneline main..origin/main   # 받게 될 커밋
git diff main...origin/main           # 분기 이후 원격 쪽 변경
git switch --detach origin/main       # 원격 상태를 열어 실행과 테스트
git switch main
git pull --ff-only                    # 갈라졌다면 --rebase나 --no-rebase를 고른다
```

`git switch origin/main`은 remote-tracking branch가 브랜치가 아니라서 `a branch is expected, got remote branch 'origin/main'`으로 거부되므로 `--detach`를 붙이거나 `git checkout origin/main`을 쓴다. 원격에 새로 생긴 브랜치도 fetch 뒤 `branch -a`로 확인하고 같은 방식으로 살펴본 다음 추적 브랜치를 만든다. 점 두 개와 세 개 비교의 의미는 [[Git-History-Debugging|Git 히스토리 분석과 디버깅]]을 따른다.

## PR은 제안이고 승인은 저장소 정책이다

Pull request는 head branch의 변경을 base branch에 통합하자는 제안이다. 대화, 리뷰와 상태 검사를 한곳에 모으지만 PR 자체가 특정 승인 수나 merge 방식을 강제하지 않는다. 필수 리뷰, 상태 검사, 선형 히스토리와 force push 제한은 ruleset이나 branch protection으로 설정한다.

두 협업 모델을 구분한다.

- shared repository: 같은 저장소의 feature branch에서 PR을 연다.
- fork and pull: 자신의 fork에서 branch를 push하고 원본 저장소로 PR을 연다. 원본 remote를 흔히 `upstream`이라 부른다.

```bash
git remote add upstream https://github.com/OWNER/REPOSITORY.git
git fetch upstream
```

이슈의 closing keyword는 PR이 저장소의 default branch에 merge될 때 연결된 이슈를 자동으로 닫는다. 다른 base branch를 대상으로 한 PR에서는 자동 닫힘이 적용되지 않으며, 다른 저장소 이슈는 `OWNER/REPOSITORY#123`처럼 한정한다.

## Issues와 Projects

Issue는 버그, 제안과 작업의 맥락을 추적한다. 한 이슈에 담당자가 반드시 한 명이어야 하거나 모든 변경에 이슈가 필요하다는 규칙은 GitHub의 제약이 아니라 팀 정책이다.

GitHub Projects는 issue, PR과 초안을 table, board, roadmap으로 보고 custom field, filter와 automation으로 관리한다. 단순 칸반 보드로만 이해하면 현재 기능 범위를 놓친다. 조직의 계획 도구가 Jira나 Linear라면 링크와 상태의 단일 기준을 어디에 둘지 먼저 정한다.

## README와 Pages

GitHub는 저장소의 `.github`, root, `docs` 디렉터리에서 README를 찾아 방문자에게 표시하며 이 순서로 우선한다. README에는 프로젝트 목적, 실행법, 검증법, 기여와 지원 경로처럼 저장소를 사용하는 데 필요한 계약을 둔다. 상세 설계와 운영 절차는 별도 문서로 연결한다.

저장소 화면은 하위 폴더를 열 때도 그 폴더의 `README.md`를 파일 목록 아래에 렌더링한다(2026-09-30 화면 확인, 공식 문서는 위 세 위치의 탐색만 설명한다). 모듈 사용법이나 폴더별 규칙처럼 코드 옆에서 읽혀야 하는 설명은 해당 폴더의 README에 둔다.

GitHub Pages는 저장소 콘텐츠를 정적 사이트로 게시한다. branch의 특정 경로 또는 GitHub Actions workflow를 배포 원본으로 사용할 수 있다. 서버 측 애플리케이션을 실행하는 일반 호스팅은 아니며, private repository와 site 공개 범위의 사용 가능 여부는 계정과 조직의 GitHub 플랜에 따라 달라진다.

| 사이트 종류 | 저장소 | 주소 |
|---|---|---|
| 사용자, 조직 사이트 | `<owner>.github.io` 이름의 저장소, 계정당 하나. owner 이름의 대문자는 소문자로 쓴다 | `https://<owner>.github.io` |
| 프로젝트 사이트 | 일반 저장소, 저장소당 하나 | `https://<owner>.github.io/<repository>` |

`<owner>.github.io` 이름 규칙은 루트 주소를 쓰는 사용자, 조직 사이트에만 필요하다. branch에서 게시하면 게시 원본(branch의 root 또는 `/docs`) 최상위의 `index.html`, `index.md`, `README.md`가 진입 파일이 된다. branch 게시도 GitHub Actions workflow 실행으로 배포되므로 반영 여부와 실패는 Actions 탭에서 확인한다.

## tag, Release와 서명 검증

Git tag는 Git ref이고 GitHub Release는 tag를 기반으로 릴리스 노트와 자산을 제공하는 별도 객체다. 자세한 구분은 [[Git-History-Debugging|Git 히스토리 분석과 디버깅]]에서 다룬다.

GitHub는 GPG, SSH 또는 S/MIME로 서명한 commit과 tag를 검증할 수 있다. `Verified` 표시는 서명이 암호학적으로 유효하고 GitHub의 키 또는 인증서 연결 조건을 충족했다는 뜻이다. 코드가 옳거나 안전하다는 보증도, 서명자가 현실 세계의 특정 인물이라는 법적 증명도 아니다. 조직은 서명 검증과 별도로 리뷰, CI, 권한 통제를 유지한다. 로컬에서 서명 키를 만들고 커밋과 태그에 서명하는 절차는 [[GitHub-Repository-Operations-Auth-and-Signing#커밋과 태그 서명|GitHub 인증과 커밋 서명]]에서 다룬다.

## GitHub CLI와 Actions

`gh`는 터미널에서 GitHub API 기능을 사용하는 공식 CLI다.

```bash
gh auth status
gh repo view
gh issue list
gh pr create
gh pr checks
```

명령과 JSON 필드는 버전에 따라 달라질 수 있으므로 자동화에서는 `gh version`, `gh help`와 종료 코드를 확인한다. 빌드, 테스트와 배포 자동화는 [[GitHub-Actions|GitHub Actions]]에 모으고 로컬 hooks만으로 필수 정책을 강제하지 않는다.

## 출처

- Git 공식 문서: [git remote](https://git-scm.com/docs/git-remote), [git fetch](https://git-scm.com/docs/git-fetch), [git pull](https://git-scm.com/docs/git-pull), [git config](https://git-scm.com/docs/git-config)
- Git 공식 문서: [git push](https://git-scm.com/docs/git-push), [git branch](https://git-scm.com/docs/git-branch), [git switch](https://git-scm.com/docs/git-switch), [git merge, --allow-unrelated-histories](https://git-scm.com/docs/git-merge), [git init](https://git-scm.com/docs/git-init), [git pull 2.33.1, --ff-only 기본값](https://git-scm.com/docs/git-pull/2.33.1), [git config push.autoSetupRemote 2.37.0](https://git-scm.com/docs/git-config/2.37.0)
- GitHub 공식 문서: [Adding locally hosted code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github), [Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [Configuring a publishing source for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- GitHub 공식 문서: [Pull requests](https://docs.github.com/en/pull-requests/reference/pull-requests), [Linking a pull request to an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue), [Configuring a remote for a fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/configuring-a-remote-repository-for-a-fork)
- GitHub 공식 문서: [About Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects), [About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes), [What is GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- GitHub 공식 문서: [About SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/about-ssh), [Commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification), [GitHub CLI manual](https://cli.github.com/manual/)
- 얄팍한 코딩사전, [GitHub 시작하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401041), [원격 저장소 사용하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401042), [push와 pull](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401044), [원격의 브랜치 다루기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401046), [Git의 각종 설정](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401061)
- 얄팍한 코딩사전, [프로젝트와 폴더에 대한 문서](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=405936), [풀 리퀘스트](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=406135), [이슈와 프로젝트](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=406269), [오픈소스에 참여하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=406630)
- 얄팍한 코딩사전, [GitHub에 웹페이지 올리기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=406760), [SSH로 접속하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=407872), [GPG로 커밋에 사인하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=408345), [GitHub CLI](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=409241)
- 얄팍한 코딩사전, [여러 브랜치 만들어보기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401008), [GitHub을 사용하는 이유](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401036), [fetch vs. pull](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401060)
- Kenu 허광남, [02. SPA 개발 환경 구성 (1)](https://www.inflearn.com/courses/lecture?courseId=328553&unitId=106866), [02. SPA 개발 환경 구성 (2)](https://www.inflearn.com/courses/lecture?courseId=328553&unitId=106867)

## 관련 문서

- [[Development-Workflow|개발 워크플로]], [[Version-Control-Tooling|버전 관리 도구 선택]], [[Git-Worktree-and-Hooks|Git worktree와 hooks]], [[GitHub-Actions|GitHub Actions]]
- [[GitHub-Repository-Operations-Auth-and-Signing|GitHub 인증과 커밋 서명]], [[Git-Merge-Strategies|Git 통합 방식]], [[Single-Host-SPA-API-Deployment|단일 서버 SPA와 API 배포]]
