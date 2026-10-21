---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-21
category: AI Engineering
aliases: []
---

# Apollo CLI 자원과 변경 요청

## 조회, 제안과 적용을 구분한다

환경, 엔티티와 릴리스는 서로 다른 ID 체계를 쓴다. 엔티티 작업은 AEID, 제품은 product ID, 제품 릴리스는 Maven coordinate를 받는 경우가 많다. CR 단건 명령(get, approve, cancel, comment, reject, reopen, label add와 label remove)은 모두 request RID를 받는다. 명령이 CR을 만들었다는 사실은 변경 적용이 끝났다는 뜻이 아니다. `changerequest approve`도 비동기 승인이다.

CR 목록은 space ID가 필요하며 author, environment, title, status와 limit로 좁힌다. 상태에는 `PENDING_APPROVALS`, `APPROVED`, `REJECTED`, `CANCELLED`, `ERROR`, `APPROVED_APPLYING`, `APPROVED_MERGED`가 있다. reject에는 reason, comment에는 comment가 필요하다. approve의 `-c` 또는 `--comment` 승인 의견은 선택값이다. cancel은 대기 중(pending)인 요청을 취소한다. 대기 중이 어느 상태값인지는 명령 계약에 정의되어 있지 않으므로 `PENDING_APPROVALS`와 같다고 단정하지 않는다. Apollo 가이드의 CR 상태 정의(Approved, Pending Approvals, Rejected, Cancelled, Error)는 Cancelled를 작성자가 취소한 상태로 설명할 뿐, 누가 어떤 상태에서 취소할 수 있는지는 정하지 않는다. 다른 Apollo 문서는 Module 설치의 업데이트를 일시 중지하면 Apollo가 열린 Module 업데이트 CR을 취소한다고 설명하므로, 취소된 CR을 작성자가 직접 취소했다고 단정하지 않는다. 2026-10-21 확인한 가이드와 CLI 문서에는 가이드의 다섯 상태와 CLI list의 일곱 상태값 사이의 대응이 나와 있지 않으며, `APPROVED_APPLYING`과 `APPROVED_MERGED`는 가이드에 정의가 없다. reopen은 취소되거나 거부된 요청을 다시 연다. CR label은 기존 label name으로 추가하고 제거한다. CR을 바꾸는 명령 중 approve, cancel, reject, reopen, label add와 label remove는 `--dry-run`으로 변경 없이 수행할 작업을 출력하고, comment 명령에는 이 플래그가 없다.

## 환경 설정의 두 종류

`environment config get --output-dir`는 CCS의 `metadata.yml`과 서비스별 설정 디렉터리를 쓴다. 디렉터리를 고친 뒤 `config apply --config-dir`로 변경 요청을 만들거나 단일 `--environment-config` 파일을 보낸다.

반면 experimental `environment setting`은 선언한 엔티티, maintenance window와 plan 동작을 포함하는 `deployment.yml`을 다룬다. `setting edit`은 전체 YAML을 편집기로 열거나 `--content` / `--file`로 대체한다. 일부 조각을 전체 설정으로 잘못 보내지 않는다.

환경 삭제, artifact registry 할당과 해제, 환경별 release channel 변경은 변경 요청을 생성한다. 환경 생성 시 contact team은 선택값이다. manifest generate의 storage class를 생략하면 인프라 기본값을 쓴다. `environment version compare`는 설치된 엔티티와 채널의 최신 버전을 비교하며 기본적으로 갱신 대상만 표시하고 `--all`로 전체를 표시한다.

## 엔티티 조작의 경계

Experimental `entity enforce`는 version이 없으면 최신 게시 설정을 강제하고, version을 주면 설정과 버전을 강제한다. asset과 foundry-product는 version이 필요하다. `--skip-validation`은 사전 검증을 건너뛰는 별도 선택이다. install은 JSON/YAML spec 파일을 받거나 대화형으로 필드를 묻는다.

`entity aggregate`는 space의 환경별 데이터를 파일로 저장하고 공통 대상 환경으로 AEID를 변환해 병합한다. 병합 과정에서 버전들을 합치고 지정 채널을 설정하며, 모든 버전과 최저 버전의 보고서도 만들 수 있다. 실제 운영 환경 자체를 병합하는 명령으로 해석하지 않는다.

`entity maintenancewindowoverride create`는 **고유 AEID별로 CR 하나씩** 만든다. 기본은 no-downtime이며 downtime은 별도 플래그다. 모든 요청의 시작은 제출 시각이고 종료는 그 시각에 duration을 더한 값이라 승인 대기가 유효 기간을 소모한다. duration은 양수이고 최대 3600시간이다. 중간 제출 실패 시 앞서 생성한 CR은 남고 뒤의 엔티티는 제출하지 않는다. 대량 요청은 dry-run과 반환한 CR 목록으로 부분 성공을 확인한다.

## 릴리스 label 관리

Experimental `label`의 확인된 자원 종류는 product-release이며 식별자는 Maven coordinate다. get은 label이 없으면 실패하고 list로 적용된 목록을 볼 수 있다. set은 기존 값을 덮어쓴다. delete는 label ID로 적용을 제거한다. 이 명령의 label ID와 CR label 명령의 기존 label name을 혼동하지 않는다.

## 출처

- [Palantir, apollo-cli artifact-registry](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_artifact-registry) — Artifact Registry 명령 그룹.
- [Palantir, apollo-cli artifact-registry list](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_artifact-registry_list) — 전체 registry 목록 조회.
- [Palantir, apollo-cli changerequest](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest) — 변경 요청 작업 그룹과 비동기 승인.
- [Palantir, apollo-cli changerequest approve](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest_approve) — 승인은 비동기이고 선택 comment, dry-run 지원.
- [Palantir, apollo-cli changerequest cancel](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest_cancel) — request RID로 대기 중 요청 취소, dry-run 지원.
- [Palantir, apollo-cli changerequest comment](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest_comment) — 필수 comment를 요청에 추가.
- [Palantir, apollo-cli changerequest get](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest_get) — request RID로 단건 조회.
- [Palantir, apollo-cli changerequest label](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest_label) — CR label 작업 그룹.
- [Palantir, apollo-cli changerequest label add](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest_label_add) — 기존 label name을 추가, dry-run 지원.
- [Palantir, apollo-cli changerequest label remove](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest_label_remove) — 기존 label name을 제거, dry-run 지원.
- [Palantir, apollo-cli changerequest list](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest_list) — 상태 필터와 필수 space ID.
- [Palantir, apollo-cli changerequest reject](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest_reject) — 필수 reason으로 거부, dry-run 지원.
- [Palantir, apollo-cli changerequest reopen](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_changerequest_reopen) — 취소 또는 거부된 요청을 재개, dry-run 지원.
- [Palantir, apollo-cli entity Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_entity) — 엔티티 명령은 experimental.
- [Palantir, apollo-cli entity aggregate Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_entity_aggregate) — 환경별 AEID 변환과 버전 병합 보고서.
- [Palantir, apollo-cli entity enforce Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_entity_enforce) — 설정 강제와 설정/버전 강제 구분.
- [Palantir, apollo-cli entity get Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_entity_get) — AEID로 조회.
- [Palantir, apollo-cli entity install Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_entity_install) — Helm/asset 설치, 파일 또는 대화형 입력.
- [Palantir, apollo-cli entity list Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_entity_list) — 환경의 엔티티 목록.
- [Palantir, apollo-cli entity maintenancewindowoverride Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_entity_maintenancewindowoverride) — 엔티티별 유지보수 override 그룹.
- [Palantir, apollo-cli entity maintenancewindowoverride create Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_entity_maintenancewindowoverride_create) — AEID마다 CR, 승인 대기와 부분 제출 실패의 영향.
- [Palantir, apollo-cli environment](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment) — 환경 CRUD, 설정과 버전 작업 그룹.
- [Palantir, apollo-cli environment artifact-registry](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_artifact-registry) — 환경 registry 할당 그룹.
- [Palantir, apollo-cli environment artifact-registry assign](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_artifact-registry_assign) — 한 환경에 여러 registry 할당 CR.
- [Palantir, apollo-cli environment artifact-registry list](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_artifact-registry_list) — 환경에 할당된 registry 조회.
- [Palantir, apollo-cli environment artifact-registry unassign](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_artifact-registry_unassign) — registry 해제 CR.
- [Palantir, apollo-cli environment config](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_config) — CCS 환경 config 작업 그룹.
- [Palantir, apollo-cli environment config apply](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_config_apply) — 파일 또는 디렉터리로 config CR 생성.
- [Palantir, apollo-cli environment config get](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_config_get) — metadata와 서비스 디렉터리를 로컬로 내려받음.
- [Palantir, apollo-cli environment create](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_create) — 선택 contact team으로 환경 생성.
- [Palantir, apollo-cli environment delete](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_delete) — 환경 삭제 CR.
- [Palantir, apollo-cli environment get](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_get) — 단일 환경 조회.
- [Palantir, apollo-cli environment list](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_list) — 환경 ID에 대한 검색 필터.
- [Palantir, apollo-cli environment manifest](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_manifest) — 환경 manifest 명령 그룹.
- [Palantir, apollo-cli environment manifest generate](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_manifest_generate) — Kubernetes manifest 생성과 storage class 선택.
- [Palantir, apollo-cli environment release-channel](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_release-channel) — 환경의 release channel 작업 그룹.
- [Palantir, apollo-cli environment release-channel set](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_release-channel_set) — 여러 환경의 채널 변경 CR.
- [Palantir, apollo-cli environment setting Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_setting) — deployment.yml은 config와 별개인 환경 설정.
- [Palantir, apollo-cli environment setting edit Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_setting_edit) — 전체 환경 settings YAML 대체.
- [Palantir, apollo-cli environment setting get Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_setting_get) — 선언 엔티티, window와 plan 동작 조회.
- [Palantir, apollo-cli environment version](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_version) — 환경별 버전 비교 그룹.
- [Palantir, apollo-cli environment version compare](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_environment_version_compare) — 업데이트 대상 기본 출력, --all과 채널 재지정.
- [Palantir, apollo-cli label Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_label) — label 자원 종류는 확인된 범위에서 product-release.
- [Palantir, apollo-cli label delete Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_label_delete) — label ID로 적용 제거.
- [Palantir, apollo-cli label get Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_label_get) — 미적용 label get은 실패.
- [Palantir, apollo-cli label list Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_label_list) — 자원에 적용된 label 목록.
- [Palantir, apollo-cli label set Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_label_set) — label ID의 값을 덮어씀.
- [Palantir, Change Requests](https://www.palantir.com/docs/apollo/managing-changes/change-requests) — 다섯 가지 CR 상태 정의, Cancelled는 작성자가 취소한 상태로 설명하고 취소할 수 있는 상태는 정하지 않음.
- [Palantir, Create, edit, and delete a Module](https://www.palantir.com/docs/apollo/managing-modules/create-module) — Module 업데이트 일시 중지 시 Apollo가 열린 Module 업데이트 CR을 취소.

- [Palantir, apollo-cli](https://www.palantir.com/docs/apollo/apollo-cli) — 부모 CLI 경로는 artifact-registry list 본문으로 연결된다.

## 관련 문서

- [[Apollo-CLI-Authentication-and-Profiles]]
- [[Apollo-CLI-Releases-and-Modules]]
