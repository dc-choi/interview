---
tags: [ci-cd, mise, toolchain, development-environment]
status: done
verified_at: 2026-10-22
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["mise 프로젝트 개발환경", "Mise Project Toolchain"]
---

# mise로 프로젝트 도구와 실행 환경 관리하기

mise는 프로젝트가 사용하는 도구 버전, 환경 변수와 task를 `mise.toml`에 선언하고 명령 실행에 적용한다. 개발자가 기억하는 설치 절차를 줄이고 로컬과 CI에서 같은 선언을 읽게 하는 데 쓴다. 도구 설치, 현재 셸에 적용, 정확한 버전 고정은 서로 다른 단계다.

## 선언과 실행의 구분

| 구성 | 역할 |
| --- | --- |
| `[tools]` | Node.js 같은 도구와 버전 요청 |
| `[env]` | mise가 실행하는 명령에 전달할 환경 변수 |
| `[tasks.<이름>]` | 팀이 공유하는 명령과 실행 설명 |

다음은 학습용 최소 구성이다. `24`는 Node.js 버전 접두사이며 최신 권장 버전이나 정확한 패치 버전 고정을 뜻하지 않는다.

```toml
[tools]
node = "24"

[env]
NODE_ENV = "development"

[tasks.runtime]
description = "실행 중인 Node.js 버전 확인"
run = "node --version"
```

- `mise use node@24`는 필요한 도구를 설치하고 버전 요청을 설정 파일에 기록한다.
- `mise install`은 프로젝트 설정에 따른 도구 설치에 쓴다. 설정을 받은 사람이 먼저 내용을 검토해야 한다.
- `mise exec -- node --version`은 설정의 도구와 환경을 자식 프로세스에 적용한다. 현재 셸 자체는 바꾸지 않는다.
- `mise run runtime`은 이름 붙인 task를 실행한다. 기본 자동 설치가 켜져 있으면 필요한 도구도 설치한다.

대화형 셸의 activation은 디렉터리와 prompt 변화에 따라 PATH와 환경을 갱신한다. 디렉터리에 들어가는 것과 도구 설치 완료를 동일하게 보지 않는다. CI와 스크립트는 activation 없이 `mise exec`와 `mise run`을 사용할 수 있다.

## 재현성은 버전 요청보다 구체적이다

`node = "24"`만 공유하면 설치 시점에 따라 서로 다른 24.x 버전이 선택될 수 있다. `mise lock`으로 구체적인 해석 결과를 기록하고 `mise install --locked`로 설치하면 일치하는 lock 항목이 없을 때 새 버전을 임의로 해석하는 대신 실패한다.

`mise.toml`, `mise.lock`과 의존성 그래프용으로 생성된 `.mise/locks/`가 있다면 함께 버전 관리한다. 다운로드 URL을 기록하는 backend에서는 현재 OS와 아키텍처용 항목도 필요하다. 개발 장비와 CI가 다르면 두 플랫폼을 준비해야 한다.

도구 버전 lock은 애플리케이션의 `package-lock.json` 같은 의존성 lock을 대신하지 않는다. OS, 네이티브 빌드 입력과 외부 서비스까지 같은 상태라는 보장도 아니다. 재현성 검토에서는 [[Dependency-Management|애플리케이션 의존성 관리]]와 함께 확인한다.

## 설정이 합쳐지는 범위 확인하기

일반 전역 설정보다 프로젝트 설정이 우선하고, 더 가까운 디렉터리의 설정이 부모 설정을 덮어쓴다. 같은 디렉터리의 `mise.local.toml`은 공유 설정보다 우선하는 개인 설정이며 버전 관리에서 제외한다. 파일 전체를 교체하는 방식이 아니라 도구별, 환경 변수별로 합치므로 전역에만 있는 다른 도구는 상속될 수 있다.

예외로 전역 `config.override.toml`은 프로젝트와 로컬 설정보다 우선한다. 프로젝트 파일만 보고 실제 실행 버전을 확정하지 않는다. `mise config ls`, `mise ls --current`와 `mise exec -- node --version`으로 읽힌 설정과 선택, 실행 결과를 각각 확인한다.

## 설정 신뢰와 bootstrap의 경계

설정은 수동 데이터만 담는 파일이 아니다. template, hook, 환경 지시자와 설치 옵션은 코드를 실행할 수 있다. 받은 저장소에서는 task를 포함한 설정 내용을 검토한 뒤 실행하거나 신뢰한다. 설정 신뢰는 다운로드한 도구의 안전성 검증과 별개이며, task sandbox가 설정 평가까지 격리하는 것도 아니다.

프로젝트 도구 관리에서 장비 초기화로 확장하면 변경 범위가 커진다. `mise bootstrap`은 선언에 따라 호스트 패키지, 파일, 셸 설정 등을 적용할 수 있다. 운영 판단으로, 프로젝트 실행에 필요한 도구와 장비 전체의 설정 변경을 나눠 검토한다.

- bootstrap의 선언적 부분은 현재 상태와 차이를 비교한다. hook과 `bootstrap` task는 매번 실행되므로 반복해도 안전하게 작성한다.
- bootstrap은 트랜잭션이 아니다. 뒤 단계가 실패해도 앞에서 적용한 변경이 남을 수 있다.
- `--dry-run`은 적용 전 점검 수단이지만 실행이 전혀 없다는 보장은 아니다. `[bootstrap.files]` 내용 template의 `exec()`는 비교를 위해 평가될 수 있다.

암호화된 값을 저장할 수 있다는 이유만으로 비밀 복구 절차와 출력 노출까지 해결됐다고 판단하지 않는다. 비밀을 얻는 도구와 최초 인증 수단의 준비는 별도 검토 대상이다. 이 문서는 개인 키 복구 스크립트나 비밀 값 공개 절차를 제시하지 않는다.

## 적용 확인

프로젝트를 바꿔 가며 선택된 도구가 달라지는 이유, 일반 셸 실행과 `mise exec`의 차이, 버전 접두사와 lock의 차이를 설명할 수 있어야 한다. 도입을 검토할 때는 격리된 개발환경에서 로컬과 CI의 선택 버전을 비교하고, 기존 package script를 불필요하게 중복하지 않는다. 위 명령은 공식 문서와 대조한 예시이며 이 문서 작성 과정에서 설치하거나 실행해 검증한 결과는 아니다.

## 출처

- [mise, Getting started](https://mise.jdx.dev/getting-started.html)
- [mise, mise.toml](https://mise.jdx.dev/configuration.html)
- [mise, mise exec](https://mise.jdx.dev/cli/exec.html)
- [mise, Lockfile](https://mise.jdx.dev/dev-tools/mise-lock.html)
- [mise, Security overview](https://mise.jdx.dev/security.html)
- [mise, Bootstrap](https://mise.jdx.dev/bootstrap.html)

## 관련 문서

- [[Dependency-Management|의존성 관리]]
- [[Toolchain-Upgrade-CI-Build-Time|툴체인 업그레이드 뒤 CI 빌드 시간 비교]]
- [[CICD-Pipeline|CI 파이프라인 구현]]
