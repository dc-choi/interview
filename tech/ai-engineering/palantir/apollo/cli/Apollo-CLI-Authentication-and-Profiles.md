---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-21
category: AI Engineering
aliases: []
---

# Apollo CLI 인증과 프로필

Apollo CLI는 Linux, macOS, Windows에서 Hub의 제품, 환경, 릴리스와 운영 자원을 다루는 도구다. UI에서 바이너리를 내려받고 실행 권한을 부여한 뒤 `apollo-cli configure`로 연결을 설정한다. 명령별 지원 여부는 설치된 바이너리의 `--help`와 대조한다.

## 인증 선택과 설정

`--apollo-token-provider`는 `auto`, `static`, `service-user`, `sso`를 받는다. `auto`는 토큰이 있으면 static, client ID와 secret이 모두 있으면 service-user, 그 외에는 브라우저 SSO를 선택한다. 토큰과 함께 client ID나 secret 중 하나라도 설정하면 오류가 난다. service-user는 client ID와 secret으로 Multipass에서 토큰을 발급받고, sso는 Multipass에 대한 대화형 브라우저 로그인이며 YubiKey 같은 하드웨어 키를 지원한다. SSO 로그인은 토큰이 필요한 명령을 처음 실행했는데 유효한 캐시 토큰이 없을 때 자동으로 시작된다. SSO로 얻은 토큰은 프로필별로 캐시되고 별도 입력 없이 갱신된다. `--sso-callback-port`는 SSO OAuth callback을 받을 로컬 loopback 포트이며, 0을 주면 사용 가능한 임시 포트를 고른다.

설정 파일은 `~/.palantir/apollo-cli.config`에 생성된다. Hub URL, 인증값, 기본 환경과 space를 프로필로 묶을 수 있다. `configure`는 기본적으로 현재 활성 프로필을 수정한다. `configure --profile <이름>`으로 특정 프로필을 지정할 수 있고, 그 이름이 없으면 새 프로필을 만든다. 따라서 프로필 이름의 오타도 새 설정을 만들 수 있으므로 대상 이름을 확인한다. `configure`에서 Enter는 기존 값을 유지하고 작은따옴표 두 개는 값을 비운다. 인증 방식을 바꿀 때 이전 방식을 위한 값을 지워야 한다.

- `--profile`은 한 명령에 프로필을 적용한다. `profile use`는 이후 명령의 기본 프로필을 바꾼다.
- `profile create --copy-from`은 기존 설정에서 시작하며 `--set-current`로 기본값을 바꾼다.
- 기본 프로필은 삭제하거나 개명할 수 없다. 현재 프로필을 삭제하면 기본 프로필로 전환된다.
- `profile import`는 YAML/JSON을 읽는다. `--name`, `--overwrite`, `--set-current`는 각각 이름, 덮어쓰기, 기본값 변경을 제어한다.
- **프로필 export에는 토큰과 client secret이 포함된다.** 저장소, 공개 로그와 공유 문서에 넣지 않는다.

`--environment`와 `--space-id`는 서로 다른 범위를 지정한다. enrollment의 primary organization 소속이 아닌 사용자가 릴리스를 다룰 때 명시적인 space ID가 필요할 수 있다. `-o json`은 기계 판독에 쓰고, `--quiet`는 stderr에 로그를 출력하지 않는다. `--http-timeout`은 모든 Apollo 요청의 제한 시간이며 단위는 분이므로 초 단위 관례로 값을 정하지 않는다. `--insecure-skip-verify`는 서버 인증서 검증을 생략하므로 정상 연결의 기본값으로 삼지 않는다.

## 지원 단계와 문서 차이

Experimental 표시 명령은 configure에서 V2 experimental commands를 켜야 한다. Deprecated 명령은 문서가 남아 있다는 이유로 현재 바이너리에서도 실행 가능하다고 판단하지 않는다. 빠른 시작의 인증 소개는 토큰과 service account 두 방법을 먼저 설명하지만 같은 문서의 설정 예와 root CLI는 SSO도 명시한다. 실제 명령 계약은 현재 help와 해당 명령 문서를 우선 대조한다.

## 최소 연결 확인

`apollo-cli environment list -o json`으로 인증과 Hub 연결을 함께 확인한다. 빈 목록은 연결 실패와 다르다. 현재 자격 증명으로 볼 수 있는 환경이 없을 수 있다. 이 문서는 공식 CLI 계약을 정리한 것이며 실제 Hub에 로그인하거나 실행한 결과는 아니다.

## 출처

- [Palantir, apollo-cli](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli) — 플랫폼 지원과 공통 인증(Multipass 토큰 발급, 하드웨어 키, 프로필별 캐시와 자동 SSO 로그인), 출력, 연결 플래그, SSO callback 포트와 분 단위 요청 제한 시간.
- [Palantir, apollo-cli artifact-registry list](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_artifact-registry_list) — 루트와 같은 상속 플래그 설명.
- [Palantir, apollo-cli configure](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_configure) — 현재 프로필 구성, Enter 유지와 작은따옴표 두 개로 초기화.
- [Palantir, apollo-cli profile Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_profile) — URL, 자격 증명, 환경 기본값을 프로필로 묶음.
- [Palantir, apollo-cli profile create Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_profile_create) — 대화형 생성과 기존 프로필 복제.
- [Palantir, apollo-cli profile delete Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_profile_delete) — 기본 프로필 삭제 금지, 활성 삭제 시 기본으로 전환.
- [Palantir, apollo-cli profile export Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_profile_export) — 내보내기에 인증 secret이 포함됨.
- [Palantir, apollo-cli profile import Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_profile_import) — YAML/JSON 가져오기와 명시적 덮어쓰기.
- [Palantir, apollo-cli profile list Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_profile_list) — 현재 프로필을 별표로 표시.
- [Palantir, apollo-cli profile rename Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_profile_rename) — 기본 프로필 이름 변경 금지.
- [Palantir, apollo-cli profile show Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_profile_show) — 지정하지 않으면 현재 프로필 설정 조회.
- [Palantir, apollo-cli profile use Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_profile_use) — 영속 기본 프로필과 일회성 --profile 구분.
- [Palantir, Getting started with the Apollo CLI](https://www.palantir.com/docs/apollo/apollo-getting-started/apollo-cli-getting-started) — UI 바이너리 설치, 설정 파일, 인증 확인과 제품 게시 예시.

## 관련 문서

- [[Apollo-CLI-Resources-and-Changes]]
- [[Apollo-CLI-Releases-and-Modules]]
