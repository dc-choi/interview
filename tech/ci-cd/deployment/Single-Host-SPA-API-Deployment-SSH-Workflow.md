---
tags: [cicd, deployment, github-actions, ssh, bash, security]
status: done
verified_at: 2026-09-30
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Single Host SSH Deploy Workflow", "SSH 배포 workflow", "GitHub Actions SSH 배포"]
---

# GitHub Actions에서 SSH로 단일 서버 배포하기

[[Single-Host-SPA-API-Deployment|단일 서버 SPA와 API 배포]]에서 떼어 낸 절이다. CI runner가 SSH로 서버에 들어가 배포 스크립트를 실행하는 push 방식은 구성이 단순하지만 production 접근 권한을 CI에 맡기고, 원격 셸의 결과를 CI의 성공 판정으로 그대로 옮긴다. 권한 경계, 네트워크 노출, 원격 셸의 환경과 종료 코드를 함께 설계해야 녹색 표시가 배포 성공의 근거가 된다.

## 권한과 승인 경계

- PR에서는 build와 test만 수행하고 보호된 branch의 검증된 commit만 배포한다.
- `permissions`를 기본 read-only로 두고 job별 최소 권한만 연다.
- production environment에 승인자, branch/tag 제한과 environment secret을 둔다.
- third-party action은 repository를 확인한 뒤 full-length commit SHA로 고정한다.
- SSH key는 전용 계정과 제한된 권한을 사용하고 주기적으로 회전한다. host key를 검증해 중간자 공격을 막는다.
- cloud API가 지원하면 장기 access key보다 OIDC 기반의 짧고 제한된 credential을 우선한다.
- workflow와 배포 script 변경은 CODEOWNERS나 필수 review 대상으로 둔다.
- log에 secret, private key와 command argument가 노출되지 않는지 실패 경로까지 확인한다.

## runner가 들어오는 경로와 host key

- GitHub-hosted runner가 서버로 접속하는 구조라면 서버의 SSH port가 runner에서 도달 가능해야 한다. GitHub는 runner IP 범위가 너무 많아 내부 자원의 allowlist로 쓰지 말라고 하고, API가 주는 IP 목록도 주 1회 갱신된다. 결국 이 구성은 SSH를 인터넷 전체에 여는 쪽으로 기운다.
- GitHub가 제시하는 대안은 고정 IP 범위를 가진 larger runner와 self-hosted runner다. larger runner도 기본은 job마다 바뀌는 동적 IP이고, 고정 IP는 GitHub Enterprise Cloud 고객이 설정하는 선택 기능이다. self-hosted runner는 GitHub로 나가는 HTTPS 443 연결을 요구하므로, 서버와 같은 private network에서 job을 받아 실행하면 외부에서 22번으로 들어올 경로가 필요 없다. 다만 GitHub는 public 저장소에는 self-hosted runner를 거의 쓰지 말아야 한다고 안내한다. 누구나 PR을 열어 runner 환경을 공격할 수 있기 때문이다. 개인 계정의 public 저장소처럼 두 대안이 모두 현실적이지 않은 구성이 AWS 위에 있다면, inbound 22 없이 배포하는 경로는 다음 항목의 OIDC와 SSM Run Command다.
- AWS라면 GitHub OIDC로 받은 짧은 자격 증명으로 Systems Manager Run Command를 호출해 inbound 22 없이 명령을 실행하는 경로도 있다 ([[IAM-Role-Federation|GitHub Actions OIDC]], [[Systems-Manager|Systems Manager]]).
- 판단 기준은 공개 SSH를 유지하는 비용(key 회전, 접속 시도 차단, 감사)과 runner나 SSM을 구성하는 비용이다.
- 흔히 쓰는 `appleboy/ssh-action`은 `fingerprint` 입력이 비어 있으면 서버 host key를 검증하지 않는다. 내부 library `easyssh-proxy`가 이때 `ssh.InsecureIgnoreHostKey()`를 쓰기 때문이다. 값을 넣으면 서버가 제시한 host key의 `ssh.FingerprintSHA256` 결과(`SHA256:`로 시작하는 문자열)와 정확히 비교하고, 다르면 연결을 거부해 배포 단계가 실패한다. action의 구현 방식(Docker, composite)은 version마다 바뀌므로 불변 사실로 외우지 않는다.
- 넣을 값은 서버가 실제로 제시할 host key의 fingerprint다. 이 client는 host key 알고리즘을 따로 지정하지 않아 Go `x/crypto/ssh`의 기본 선호 순서를 따르는데, 이 순서는 ECDSA와 RSA-SHA2를 앞에 두고 Ed25519를 맨 뒤에 둔다. Ed25519는 서버에 ECDSA나 RSA 같은 다른 host key가 없을 때만 쓰인다. 그래서 RSA, ECDSA, Ed25519 host key를 모두 가진 일반 OpenSSH 서버에 README 예시 명령의 `ed25519` fingerprint를 그대로 넣으면 `ssh: host key fingerprint mismatch`로 실패한다(drone-ssh가 쓰는 x/crypto v0.57.0에 easyssh-proxy와 같은 설정을 준 client로 재현). README도 예시의 key 종류를 실제 key에 맞게 바꾸라고 하고, 명령에 `cut -d ' ' -f2`를 붙여 두 번째 필드만 남긴다. 서버 콘솔처럼 이미 신뢰하는 경로에서 `ssh-keygen -l -f /etc/ssh/ssh_host_ecdsa_key.pub | cut -d ' ' -f2`처럼 제시될 key(보통 ECDSA)의 `SHA256:` 값만 secret에 넣는다. `ssh-keygen -l` 출력 줄 전체를 넣어도 불일치로 실패하므로, 아무것도 바꾸지 않는 script로 한 번 연결을 확인한다.
- GitHub Actions secret 이름은 참조할 때 대소문자를 구분하지 않고 GitHub가 대문자로 저장한다. 정확해야 하는 것은 이름의 철자와 private key 값 전체다.

## 원격 셸은 로그인 셸이 아니다

사람이 `ssh user@host`로 들어오면 대화형 로그인 셸이라 `/etc/profile`과 `~/.bash_profile`(없으면 `~/.bash_login`, `~/.profile`)을 읽는다. CI가 `ssh host '<command>'`처럼 원격 명령을 실행하면 비로그인, 비대화형 셸이라 `.bash_profile`을 읽지 않는다. Bash 매뉴얼은 sshd가 띄운 비대화형 셸이면 `~/.bashrc`를 읽는다고 설명하지만, upstream source에서는 이 감지(`SSH_SOURCE_BASHRC`)가 기본으로 꺼져 있어 배포판 build마다 다르다. 읽더라도 많은 배포판의 `bashrc`에는 `[ -z "$PS1" ] && return` 같은 비대화형 조기 반환이 있다. `./deploy.sh`로 실행한 스크립트 자체도 비대화형 셸이라 시작 파일 대신 `BASH_ENV`만 확인하고 부모 환경을 상속한다.

그래서 `.bash_profile`의 PATH로 등록한 Node, npm, PM2는 수동 SSH에서는 동작하지만 CI log에는 `command not found`(종료 코드 127)로 실패한다. `.bashrc`에서 초기화하는 nvm도 같은 이유로 빠질 수 있다.

1. 배포 스크립트 첫머리에서 PATH를 명시하거나 런타임을 절대 경로로 호출한다. 사람의 로그인 설정이 바뀌어도 배포가 흔들리지 않는다.
2. 운영 런타임을 package manager로 시스템 경로에 설치한다 ([[Single-Host-SPA-API-Deployment#서버 기준선|서버 기준선]]).
3. 시작할 때 `command -v node npm pm2`와 `node -v`를 출력해 실제로 해석된 실행 파일과 버전을 배포 log에 남긴다.
4. `bashrc`의 조기 반환 줄을 지우는 방법은 같은 계정을 쓰는 다른 비대화형 도구에도 영향을 주므로 마지막 선택지로 둔다.

cron과 systemd unit처럼 로그인 셸을 거치지 않는 실행 경로에도 같은 원리가 적용된다. 사람의 셸 설정에 기대지 말고 실행 환경을 스크립트나 unit 안에 명시한다.

## 녹색 표시는 마지막 명령의 종료 코드다

SSH 단계의 성패는 원격 명령의 종료 상태로 정해진다. Bash는 마지막으로 실행한 명령의 종료 상태를 돌려주므로, `set -e`가 없는 스크립트에서는 `npm run build`가 실패해도 뒤의 복사와 `pm2 restart`가 성공하면 단계가 녹색으로 끝난다. 사용자는 이전 화면이나 깨진 화면을 본다.

- 스크립트 첫머리에 `set -eo pipefail`을 둔다. `-e`는 실패한 명령에서 멈추고 `pipefail`은 파이프 앞쪽 명령의 실패도 결과에 반영한다. `if`의 조건, 마지막이 아닌 `&&`와 `||` 목록의 명령, `!`로 뒤집은 명령에서는 `-e`가 멈추지 않는다.
- `appleboy/ssh-action`은 예전의 `script_stop` 옵션을 제거했고 스크립트 맨 위에 `set -e`를 두라고 안내한다.
- `pm2 restart`의 성공은 재시작 명령의 성공이지 새 process가 요청을 처리한다는 증거가 아니다. 기동 직후 crash, port 충돌과 Nginx 경로 오류는 이 신호로 드러나지 않는다. 마지막에 local health endpoint와 외부 HTTPS URL을 재시도와 timeout을 두고 확인하고, 실패하면 nonzero로 끝내야 녹색이 서비스 정상의 근거가 된다.
- `set -e`로 중간에 멈추면 반쯤 갱신된 working tree와 정적 파일이 남을 수 있다. 새 release 디렉터리에 만든 뒤 전환하는 [[Single-Host-SPA-API-Deployment#배포 단위와 release layout|release layout]]과 함께 설계해야 실패가 복구 가능한 상태로 끝난다.

## pull-in-place를 벗어날 시점

SSH pull-in-place는 학습과 작은 내부 서비스에는 쓸 수 있다. 그러나 immutable artifact, 사전 검증, 빠른 rollback과 audit 요구가 커지면 registry 기반 image 배포나 deployment service로 옮긴다 ([[Docker-Image-Pipeline#작은 서비스의 SSH + Compose 배포|SSH + Compose 배포]]).

## 출처

- [GitHub, Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub, GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [GitHub, Self-hosted runners reference](https://docs.github.com/en/actions/reference/runners/self-hosted-runners)
- [GitHub, Larger runners reference](https://docs.github.com/en/actions/reference/runners/larger-runners)
- [GitHub, Secrets reference](https://docs.github.com/en/actions/reference/security/secrets)
- [appleboy/ssh-action, README와 action.yml](https://github.com/appleboy/ssh-action)
- [appleboy/easyssh-proxy, easyssh.go](https://github.com/appleboy/easyssh-proxy/blob/master/easyssh.go)
- [appleboy/drone-ssh, go.mod](https://github.com/appleboy/drone-ssh/blob/master/go.mod)
- [Go x/crypto, ssh/common.go defaultHostKeyAlgos (v0.57.0)](https://github.com/golang/crypto/blob/v0.57.0/ssh/common.go)
- [GNU Bash Manual, Bash Startup Files](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html)
- [GNU Bash Manual, The Set Builtin](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html)
- [GNU Bash Manual, Exit Status](https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html)
- [GNU Bash source, config-top.h](https://git.savannah.gnu.org/cgit/bash.git/tree/config-top.h)
- [Kenu 허광남 강사, SPA 개발 환경 구성 2](https://www.inflearn.com/courses/lecture?courseId=328553&unitId=106867)
- [Kenu 허광남 강사, 배포 프로세스](https://www.inflearn.com/courses/lecture?courseId=328553&unitId=106868)
- [Kenu 허광남 강사, 도메인 등록과 HTTPS 설정](https://www.inflearn.com/courses/lecture?courseId=328553&unitId=106870)
- [Kenu 허광남 강사, 배포 자동화](https://www.inflearn.com/courses/lecture?courseId=328553&unitId=106871)

## 관련 문서

- [[Single-Host-SPA-API-Deployment|단일 서버 SPA와 API 배포]]
- [[GitHub-Actions|GitHub Actions]]
- [[EC2-Network-Access|EC2 네트워크 접근]]
- [[Supply-Chain-Security|공급망 보안]]
- [[Container-Entrypoint-Signals|Container entrypoint와 signal]]
