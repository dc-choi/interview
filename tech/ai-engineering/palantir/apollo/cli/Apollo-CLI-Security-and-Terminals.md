---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo CLI 취약점 검사와 터미널

## Apollo CVE 검사와 로컬 Grype 검사

`cve check`는 환경, 좌표 YAML 파일, product ID 중 하나 이상에서 릴리스를 모아 Apollo의 recall 사유, 최근 scan과 활성 CVE를 확인한다. 입력을 합칠 수 있고 release channel로 필터링할 수 있다. `--rescan`은 최근 7일 동안 검사하지 않은 릴리스를 재검사하며 `--force`는 이 기간 기준을 우회한다. force에는 rescan이 필요하다.

`cve list`는 릴리스와 컨테이너 이미지별 CVE 대응 기한을 출력한다. 환경/파일은 해당 릴리스들을, product ID는 최신 릴리스를 질의한다. 활성 finding은 due date에 Overdue로 나온다. check의 제품 전체 릴리스와 list의 최신 릴리스 범위를 혼동하지 않는다.

`cve grype scan`은 PATH의 Grype를 실행하며 **Apollo 취약점 데이터를 가져오지 않는다.** 가능한 경우 NVD CVE ID와 CVSS를 선택하고 심각도는 CVSS v3, v2, Grype 순서로 계산한다. 보존하는 CVSS 점수는 선택된 v3 점수다.

추가 Grype 인자는 `--` 뒤로 보내지만 Grype 출력 형식을 바꾸는 `-o`, `--output`, `--file`은 금지한다. `--output-file`은 CLI 출력 형식과 무관하게 정규화 JSON을 저장한다. Grype가 유효한 JSON을 만든 뒤 비정상 종료하면 보고서를 출력하면서 오류를 반환한다. 유효 보고서가 없는 실행 실패는 보고서를 출력하지 않는다. 따라서 보고서 존재와 실행 성공을 별도로 판정한다.

## 터미널 접근의 세 단계

Experimental terminal 명령은 policy, grant, session을 구분한다. policy list는 요청 가능한 정책을, grant list는 현재 사용자가 가진 정책과 만료를, session list는 환경의 세션을 보여준다.

`grant request <policy-name>`은 인증된 사용자 자신의 접근 권한을 위한 CR을 만든다. duration을 생략하면 정책의 기본 기간을 쓴다. 요청 제출만으로 grant가 생겼다고 판단하지 않는다.

`session create`는 kubectl이 구성된 debug Pod에서 터미널을 만들고 연결한다. terminal profile을 생략하면 기본 shell profile을 쓴다. attach는 기존 session ID로 연결한다. 서버의 정책, grant와 CR 승인 요건을 통과해야 하는 기능이며 이 문서 작성 중 실제 세션을 만들지 않았다.

## 출처

- [Palantir, apollo-cli cve](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_cve) — CVE 명령 그룹.
- [Palantir, apollo-cli cve check](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_cve_check) — 여러 릴리스 입력 병합과 7일 재검사 기준.
- [Palantir, apollo-cli cve grype](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_cve_grype) — 로컬 Grype 검사 그룹.
- [Palantir, apollo-cli cve grype scan](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_cve_grype_scan) — NVD 우선 정규화, 유효 보고서와 비정상 종료 처리.
- [Palantir, apollo-cli cve list](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_cve_list) — 릴리스와 이미지별 CVE 기한, 제품 입력은 최신 릴리스.
- [Palantir, apollo-cli terminal Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_terminal) — 터미널은 policy, grant, session을 분리.
- [Palantir, apollo-cli terminal grant Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_terminal_grant) — 접근 grant 조회와 요청 그룹.
- [Palantir, apollo-cli terminal grant list Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_terminal_grant_list) — 자신의 grant 종류와 만료 조회.
- [Palantir, apollo-cli terminal grant request Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_terminal_grant_request) — 자기 접근 CR과 정책 기본 duration.
- [Palantir, apollo-cli terminal policy Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_terminal_policy) — 터미널 접근 정책 그룹.
- [Palantir, apollo-cli terminal policy list Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_terminal_policy_list) — 요청 가능한 TAP 조회.
- [Palantir, apollo-cli terminal session Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_terminal_session) — 세션 생성, 재접속과 목록 그룹.
- [Palantir, apollo-cli terminal session attach Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_terminal_session_attach) — 기존 session ID에 연결.
- [Palantir, apollo-cli terminal session create Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_terminal_session_create) — kubectl debug Pod, 기본 shell profile.
- [Palantir, apollo-cli terminal session list Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_terminal_session_list) — 환경의 터미널 세션 목록.

## 관련 문서

- [[Apollo-CLI-Authentication-and-Profiles]]
- [[Apollo-CLI-Resources-and-Changes]]
