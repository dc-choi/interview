---
tags: [cicd, github, pull-request, repository, authentication]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["GitHub Repository Operations", "GitHub 저장소 운영"]
verified_at: 2026-08-04
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

GitHub Pages는 저장소 콘텐츠를 정적 사이트로 게시한다. branch의 특정 경로 또는 GitHub Actions workflow를 배포 원본으로 사용할 수 있다. 서버 측 애플리케이션을 실행하는 일반 호스팅은 아니며, private repository와 site 공개 범위의 사용 가능 여부는 계정과 조직의 GitHub 플랜에 따라 달라진다.

## tag, Release와 서명 검증

Git tag는 Git ref이고 GitHub Release는 tag를 기반으로 릴리스 노트와 자산을 제공하는 별도 객체다. 자세한 구분은 [[Git-History-Debugging|Git 히스토리 분석과 디버깅]]에서 다룬다.

GitHub는 GPG, SSH 또는 S/MIME로 서명한 commit과 tag를 검증할 수 있다. `Verified` 표시는 서명이 암호학적으로 유효하고 GitHub의 키 또는 인증서 연결 조건을 충족했다는 뜻이다. 코드가 옳거나 안전하다는 보증도, 서명자가 현실 세계의 특정 인물이라는 법적 증명도 아니다. 조직은 서명 검증과 별도로 리뷰, CI, 권한 통제를 유지한다.

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
- GitHub 공식 문서: [Pull requests](https://docs.github.com/en/pull-requests/reference/pull-requests), [Linking a pull request to an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue), [Configuring a remote for a fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/configuring-a-remote-repository-for-a-fork)
- GitHub 공식 문서: [About Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects), [About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes), [What is GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- GitHub 공식 문서: [About SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/about-ssh), [Commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification), [GitHub CLI manual](https://cli.github.com/manual/)
- 얄팍한 코딩사전, [GitHub 시작하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401041), [원격 저장소 사용하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401042), [push와 pull](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401044), [원격의 브랜치 다루기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401046), [Git의 각종 설정](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401061)
- 얄팍한 코딩사전, [프로젝트와 폴더에 대한 문서](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=405936), [풀 리퀘스트](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=406135), [이슈와 프로젝트](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=406269), [오픈소스에 참여하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=406630)
- 얄팍한 코딩사전, [GitHub에 웹페이지 올리기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=406760), [SSH로 접속하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=407872), [GPG로 커밋에 사인하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=408345), [GitHub CLI](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=409241)

## 관련 문서

- [[Development-Workflow|개발 워크플로]], [[Version-Control-Tooling|버전 관리 도구 선택]], [[Git-Worktree-and-Hooks|Git worktree와 hooks]], [[GitHub-Actions|GitHub Actions]]
