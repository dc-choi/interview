---
tags: [cicd, github, authentication, ssh, gpg, signing]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["GitHub Authentication and Signing", "GitHub 인증과 커밋 서명"]
verified_at: 2026-09-30
---

# GitHub 인증과 커밋 서명

[[GitHub-Repository-Operations|GitHub 저장소 운영]]에서 분리한 절이다. 인증은 누가 저장소를 읽고 push할 수 있는지를, 서명은 커밋과 태그를 누가 만들었는지를 증명한다. 둘은 다른 키와 설정을 쓰므로 따로 점검한다.

## HTTPS는 계정 비밀번호로 인증하지 않는다

GitHub는 2021-08-13부터 Git 작업에서 계정 비밀번호를 받지 않는다. 로컬 push에서 묻는 비밀번호 자리에는 로그인 비밀번호가 아닌 토큰이나 자격 증명 도우미가 관리하는 값이 들어간다.

- GitHub는 HTTPS 사용자에게 GitHub CLI(`gh auth login`)나 Git Credential Manager(GCM)를 권장한다. GCM은 브라우저 로그인과 2FA를 처리해 토큰을 직접 만들어 보관할 필요를 없애고, 인증에 성공하면 macOS 키체인 같은 OS 저장소에 자격 증명을 두어 다음 작업부터 다시 묻지 않는다. macOS는 `brew install --cask git-credential-manager`로 설치하고, Git for Windows에는 GCM이 포함된다.
- personal access token(PAT)은 비밀번호 입력란에 넣는다. GitHub는 classic보다 저장소와 권한을 좁힐 수 있는 fine-grained token을 권장한다. 이름, 만료일과 최소 권한을 정해 만들고, 생성 화면에서 바로 복사해 비밀번호처럼 보관한다. 1년 동안 쓰지 않은 토큰은 GitHub가 자동으로 제거한다.
- 사람이 쓰는 자격 증명과 스크립트, 자동화용 토큰을 나누면 유출됐을 때 폐기할 범위가 줄어든다.

## SSH 키 인증

SSH는 비밀번호 대신 키 쌍을 쓴다. 흔히 공개키를 GitHub에 걸어 두는 자물쇠, 개인키를 로컬에만 두는 열쇠로 비유하며, 공개키만으로 개인키를 만들 수 없다. 실제 공개키 인증은 클라이언트가 세션 식별자를 포함한 데이터에 개인키로 서명하고 서버가 등록된 공개키로 서명을 검증하는 방식이라 개인키가 전송되지 않는다(RFC 4252). 원리는 [[Public-Key-Cryptography|공개키 암호]]의 디지털 서명과 같다.

```bash
ssh-keygen -t ed25519 -C "you@example.com"   # passphrase 입력 권장
cat ~/.ssh/id_ed25519.pub                     # 이 공개키만 GitHub의 SSH and GPG keys에 등록
ssh -T git@github.com                         # 첫 접속에서 host key 지문 확인 뒤 인증 테스트
git remote set-url origin git@github.com:OWNER/REPOSITORY.git   # 기존 HTTPS clone을 SSH로 전환
```

- 확장자가 없는 `id_ed25519`가 개인키다. 저장소, 채팅, 서버 로그로 복사하지 않는다. Ed25519를 지원하지 않는 레거시 시스템은 `ssh-keygen -t rsa -b 4096`을 쓴다.
- 첫 접속의 `Are you sure you want to continue connecting (yes/no)?`는 서버 host key를 믿을지 묻는 단계다. 표시된 지문을 GitHub가 공개한 SSH key fingerprints와 대조한 뒤 yes를 입력해야 중간자 공격을 막는다. 확인한 키는 `~/.ssh/known_hosts`에 남는다. CI runner가 배포 서버에 접속할 때의 host key 검증은 [[Single-Host-SPA-API-Deployment-SSH-Workflow#runner가 들어오는 경로와 host key|SSH 배포 workflow]]를 따른다.
- passphrase를 매번 입력하지 않으려면 ssh-agent를 쓴다. macOS는 `~/.ssh/config`에 `AddKeysToAgent yes`와 `UseKeychain yes`를 두고 `ssh-add --apple-use-keychain ~/.ssh/id_ed25519`로 passphrase를 키체인에 저장한다.
- 방화벽이나 프록시가 SSH를 막는 환경에서는 HTTPS가 통과하기 쉽다. SSH가 계정 비밀번호 전송보다 안전하다는 비교가 토큰 기반 HTTPS보다 항상 안전하다는 뜻은 아니며, 선택은 키와 토큰의 범위, 보관, 회전과 조직 정책으로 한다.

## 커밋과 태그 서명

`user.name`과 `user.email`은 누구나 임의 값으로 설정할 수 있어 작성자 표시만으로는 본인임을 증명하지 못한다. 서명은 커밋이나 태그에 개인키로 만든 서명을 붙이고, GitHub는 등록된 공개키로 검증해 `Verified`를 표시한다. 웹 화면에서 만든 커밋은 GitHub가 자동으로 서명해 `Verified`가 붙지만 로컬에서 만든 커밋은 직접 서명해야 한다. 서명이 필수인지는 저장소 규칙과 조직 정책이 정한다.

```bash
gpg --full-generate-key                         # GnuPG 2.1.17+. 이메일은 GitHub에서 인증한 주소나 no-reply 주소
gpg --list-secret-keys --keyid-format=long      # 키 ID 확인
gpg --armor --export <키 ID>                     # BEGIN부터 END PGP PUBLIC KEY BLOCK까지 복사해 New GPG key로 등록
git config --global user.signingkey <키 ID>
git commit -S -m "feat: ..."                     # 커밋 서명은 대문자 -S
git tag -s v1.2.3 -m "release v1.2.3"            # 태그 서명은 소문자 -s
git config --global commit.gpgsign true          # -S를 잊지 않도록 기본 서명
git config --global tag.gpgSign true
```

- gpg-agent가 passphrase를 물을 터미널을 알도록 `export GPG_TTY=$(tty)`를 셸 초기화 파일에 둔다. GnuPG 매뉴얼은 모든 셸이 읽는 초기화 파일을, GitHub 문서는 zsh의 `.zshrc`(없으면 `.zprofile`)와 bash의 `.bash_profile`이나 `.profile`을 예로 든다.
- 커밋의 소문자 `-s`는 서명이 아니라 `Signed-off-by` trailer를 붙이는 signoff다. 커밋은 `-S`, 태그는 `-s`로 대소문자가 반대라 혼동하기 쉽다.
- `Verified`가 뜨지 않으면 이메일부터 확인한다. GitHub는 커밋의 committer나 태그의 tagger 이메일이 키의 identity에 있고 계정에서 인증된 주소인지 확인하므로, 키를 만들 때의 이메일과 `git config user.email`을 함께 맞춘다.
- Git 2.34 이상은 GPG 대신 SSH 키로도 서명할 수 있다(`git config --global gpg.format ssh`, `user.signingkey`에 공개키 경로). GitHub 문서는 SSH 서명이 만들기 가장 간단하고, GPG는 키 만료와 폐기 같은 기능이 있다고 비교한다. 같은 SSH 키를 인증과 서명에 함께 쓰려면 GitHub에 authentication key와 signing key로 두 번 등록한다.
- `Verified`의 의미와 한계는 [[GitHub-Repository-Operations#tag, Release와 서명 검증|GitHub 저장소 운영]]을 따른다.

## 개인 계정과 Enterprise Managed Users의 경계

2026-10-08 GitHub 공식 문서로 대조한 범위다. 개인 계정에 조직 SAML SSO를 연결하는 방식과 Enterprise Managed Users(EMU)는 계정의 관리 주체가 다르다. EMU에서는 IdP로 사용자를 프로비저닝하고 계정 이름과 이메일을 관리한다. 기존 개인 계정 기반 enterprise에서 전환하려면 새 enterprise로의 마이그레이션이 필요하다.

- 관리형 계정은 enterprise 밖의 저장소에 기여하거나 외부 저장소를 fork할 수 없다. 조직 저장소는 private 또는 internal로 만들며, public 저장소와 gist 생성도 제한된다. 외부 오픈소스 기여에는 별도 개인 계정과 작업 경로가 필요하다.
- 외부 협업이 전면 불가능하다는 뜻은 아니다. 관리형 계정에 guest collaborator 역할을 부여하는 경로가 있다. 일반 개인 계정을 초대하는 방식과 구분하고 허용할 조직과 저장소를 확인한다.
- EMU의 계정 통제와 커밋 서명은 별개다. 계정 이메일을 관리한다고 기존 커밋의 작성자 정보나 서명이 자동으로 바뀌지는 않는다.

### 코드 이전과 배포 환경 이전을 따로 검증한다

GitHub.com에서 Enterprise Importer로 저장소를 옮길 때 Git 이력, PR과 workflow 파일은 이전 대상이다. Actions의 secrets, variables, environments, self-hosted runners와 실행 이력, GitHub Apps 설치, Packages와 rulesets는 자동 이전 대상이 아니다. 조직 전체 이전과 저장소 단위 이전은 팀과 접근 권한의 이관 범위도 다르다.

다음은 이 차이에 따른 전환 점검 제안이다.

1. 시험 이전에서 Git ref와 PR뿐 아니라 runner 선택, 배포 승인과 앱 연결까지 확인한다.
2. 조직명과 저장소명이 바뀌면 OIDC 신뢰 조건, 패키지 참조와 webhook 목적지를 재검토한다. 코드 복사 성공을 배포 성공으로 간주하지 않는다.
3. 기존 커밋의 이메일과 대상 ruleset의 조건을 비교한다. 새 이메일 규칙과 맞지 않는 과거 커밋 때문에 이전이 실패할 수 있다.
4. 전환 중 어느 저장소에 쓰기를 허용할지 정하고, 새 환경의 배포와 복구 경로를 검증한 뒤 이전 연결과 자격 증명을 정리한다.

이 절만 부분 검증했으며 기존 인증과 서명 절 전체의 검증일은 갱신하지 않았다.

## 출처

- GitHub 공식 문서: [Choosing an enterprise type for GitHub Enterprise Cloud](https://docs.github.com/en/enterprise-cloud@latest/admin/concepts/enterprise-fundamentals/choose-an-enterprise-type), [Abilities and restrictions of managed user accounts](https://docs.github.com/en/enterprise-cloud@latest/admin/managing-iam/understanding-iam-for-enterprises/abilities-and-restrictions-of-managed-user-accounts), [About migrations between GitHub products with GitHub Enterprise Importer](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/about-migrations-between-github-products)

- GitHub 공식 문서: [About authentication to GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github), [Managing your personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens), [Caching your GitHub credentials in Git](https://docs.github.com/en/get-started/git-basics/caching-your-github-credentials-in-git)
- GitHub 공식 문서: [Generating a new SSH key and adding it to the ssh-agent](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent), [Adding a new SSH key to your GitHub account](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account), [Testing your SSH connection](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/testing-your-ssh-connection), [GitHub's SSH key fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)
- GitHub 공식 문서: [About commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification), [Generating a new GPG key](https://docs.github.com/en/authentication/managing-commit-signature-verification/generating-a-new-gpg-key), [Telling Git about your signing key](https://docs.github.com/en/authentication/managing-commit-signature-verification/telling-git-about-your-signing-key), [Signing commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits), [Signing tags](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-tags), [Using a verified email address in your GPG key](https://docs.github.com/en/authentication/troubleshooting-commit-signature-verification/using-a-verified-email-address-in-your-gpg-key)
- [Token authentication requirements for Git operations — GitHub Blog](https://github.blog/security/application-security/token-authentication-requirements-for-git-operations/)
- Git 공식 문서: [git commit, -S와 -s](https://git-scm.com/docs/git-commit), [git tag](https://git-scm.com/docs/git-tag), [git config, gpg.format](https://git-scm.com/docs/git-config), [git remote, set-url](https://git-scm.com/docs/git-remote)
- [RFC 4252, The Secure Shell (SSH) Authentication Protocol, 7. Public Key Authentication Method](https://www.rfc-editor.org/rfc/rfc4252#section-7)
- [GnuPG Manual, Invoking GPG-AGENT (GPG_TTY)](https://www.gnupg.org/documentation/manuals/gnupg/Invoking-GPG_002dAGENT.html)
- 얄팍한 코딩사전, [GitHub 시작하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401041), [원격 저장소 사용하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401042), [SSH로 접속하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=407872), [GPG로 커밋에 사인하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=408345)

## 관련 문서

- [[GitHub-Repository-Operations|GitHub 저장소 운영]], [[Public-Key-Cryptography|공개키 암호]], [[Git-History-Debugging|Git 히스토리 분석과 디버깅 (태그)]], [[Single-Host-SPA-API-Deployment-SSH-Workflow|SSH 배포 workflow]]
