---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo CLI 릴리스, 채널과 모듈

## 게시의 두 단계

Helm chart는 `product-release helm-chart init`으로 Apollo manifest 또는 `.config.tgz`를 만들고 `product-release create`로 등록한다. **create는 메타데이터만 게시하며 실제 artifact를 업로드하지 않는다.** 로컬 chart 파일을 입력해도 배포 때에는 지정 registry에서 원본 chart와 이미지를 가져올 수 있어야 한다.

- create의 `--default-config`는 values.yaml, `--config-schema`는 선택적인 values.schema.json이다. schema를 주려면 default config도 필요하다.
- init의 `--values`는 로컬 template 렌더링용이다. 설치의 기본값을 대신 게시하지 않는다.
- `--rollout-strategy`는 `manageRollout`과 `applyChangesNoWait`를 받는다. resource readiness timeout은 apply 및 hook timeout과 별개이며 applyChangesNoWait와 함께 쓸 수 없다.
- 문서상 image pre-pull timeout은 1~90분, resource readiness timeout은 3분~4시간 범위다.
- `product-release verify`는 manifest 또는 TGZ의 `*/deployment/manifest.yml`을 검증한다. 정적 유효성 검사와 실제 배포 성공은 구분한다.
- asset publish는 임의 파일을 asset TGZ로 패키징해 게시한다. `--images`는 업그레이드 권고 전 가용성을 검사할 이미지를 선언한다.
- Terraform init은 Maven coordinate와 repository URL로 manifest를 만든다.

Deprecated `publish helm-chart`는 대체 경로로 init 다음 create를 명시한다. 문서에는 2025년 12월 제거 예정 문구가 남아 있으므로 문서 존재를 현재 실행 지원의 증거로 쓰지 않는다.

## 채널 소속과 승격

릴리스 하나가 여러 채널에 속할 수 있다. `product-release release-channel edit`은 현재 소속을 편집기로 열며 빈 목록을 저장하면 모든 소속을 제거한다. 편집 취소, 빈 문서 또는 비정상 편집기 종료는 변경 없이 취소한다. 빈 목록과 빈 문서는 효과가 다르다.

Experimental `release-channel add`는 반복 Maven coordinate, YAML 파일, 환경과 bundle 입력을 합쳐 중복을 제거한다. remove는 coordinate와 파일 입력을 합친다. dry-run은 제출할 좌표를 보여준다. export는 전체 또는 제품별 최신 버전의 좌표를 YAML로 저장한다. diff는 특정 환경에서 사용하는 제품에 대해 source에 있고 target에 없는 릴리스를 찾는다.

채널 생성은 description과 label 존재/값 요구사항을 받는다. update는 현재 revision으로 낙관적 동시성을 적용하며 label 요구사항은 대체하거나 명시적으로 비울 수 있다. archive는 rationale이 필요하고 채널을 읽기 전용으로 만든다. list의 page token은 한 페이지와 다음 토큰을 반환하는 페이지네이션 계약이다.

## 승격 파이프라인 수정

Experimental `product promotion`은 get, set, append, enable, disable을 제공한다. disable은 자동 승격을 멈추지만 기존 채널 소속을 제거하지 않는다. set과 append는 단일 제품 또는 환경 전체 제품을 대상으로 할 수 있다.

append는 source/target 채널 쌍으로 stage 충돌을 판정한다. 기본 동작은 충돌별 확인이며 `--override`는 덮어쓰기 확인을 생략한다. set과 append의 문서 예시는 YAML 형태가 다르므로 서로 바꿔 쓰지 않고 해당 명령의 현재 schema와 help를 확인한다. zeroCanary와 dynamic stage는 soak, label, 건강한 엔티티 비율 등 서로 다른 기준을 가진다.

## 모듈 정의와 설치

모듈은 함께 설치하는 제품과 설정의 묶음이다. create는 같은 이름이 있으면 갱신한다. lock은 definition별 lock file을 만들고 `--verify`는 오래된 lock을 CI 실패로 만든다. update는 하위 모듈 revision을 최신으로 바꾼다.

Experimental diff는 두 파일 또는 파일과 Hub 최신 revision을 비교하며 같으면 출력하지 않는다. evaluate의 product-dependencies 기능은 하위 모듈까지 포함한 직접 외부 의존성이 모듈 안에서 충족되는지 확인한다. flatten은 합성 모듈을 펼친다.

install은 product ID면 해석한 채널의 최신 release, 전체 Maven coordinate면 특정 version을 설치한다. 기존 설치가 있으면 갱신한다. `--ignore-recalls`와 `--ignore-secret-requirements`는 별도 우회 옵션이므로 기본 설치 계약으로 일반화하지 않는다. variable은 반복 KEY=VALUE로 전달한다.

Target Hub 명령은 대상 Hub와 그쪽으로 보내는 pipeline을 조회한다. transfer 대상 조회와 bundle의 실제 export/import는 다른 단계다.

## 출처

- [Palantir, apollo-cli publish Deprecated](https://www.palantir.com/docs/apollo/apollo-cli-deprecated/apollo-cli_publish) — 이전 publish 명령의 폐기 표시.
- [Palantir, apollo-cli publish helm-chart Deprecated](https://www.palantir.com/docs/apollo/apollo-cli-deprecated/apollo-cli_publish_helm-chart) — 이전 Helm 게시를 init/create로 교체.
- [Palantir, apollo-cli helm-chart Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_helm-chart) — 실험적 Helm 검사 그룹.
- [Palantir, apollo-cli helm-chart validate Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_helm-chart_validate) — 로컬/원격 chart 정적 검사와 로컬 values 렌더링.
- [Palantir, apollo-cli module](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_module) — 모듈 생성, 고정과 설치 작업 그룹.
- [Palantir, apollo-cli module create](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_module_create) — 동명 모듈은 갱신.
- [Palantir, apollo-cli module diff Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_module_diff) — 같은 정의는 출력 없음, 파일/최신 revision 비교.
- [Palantir, apollo-cli module evaluate Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_module_evaluate) — 하위 모듈의 직접 제품 의존성 충족 검사.
- [Palantir, apollo-cli module flatten Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_module_flatten) — 합성 모듈 펼치기.
- [Palantir, apollo-cli module get Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_module_get) — module product ID로 조회.
- [Palantir, apollo-cli module install Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_module_install) — 제품 ID는 채널 최신, coordinate는 고정 버전, 기존 설치 갱신.
- [Palantir, apollo-cli module list Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_module_list) — 모듈 목록 조회.
- [Palantir, apollo-cli module lock](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_module_lock) — lock file 생성과 CI --verify.
- [Palantir, apollo-cli module update](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_module_update) — 하위 모듈 revision 최신화.
- [Palantir, apollo-cli product](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product) — 제품 목록과 promotion 작업 그룹.
- [Palantir, apollo-cli product-release](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release) — 제품 릴리스 작업 그룹.
- [Palantir, apollo-cli product-release asset](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_asset) — asset 작업 그룹.
- [Palantir, apollo-cli product-release asset publish](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_asset_publish) — 임의 파일 TGZ 게시와 이미지 가용성 선언.
- [Palantir, apollo-cli product-release create](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_create) — 메타데이터 게시, artifact 별도, schema는 default config 필요.
- [Palantir, apollo-cli product-release get](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_get) — 좌표 하나는 YAML, 여러 개는 표.
- [Palantir, apollo-cli product-release helm-chart](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_helm-chart) — Helm manifest 초기화 그룹.
- [Palantir, apollo-cli product-release helm-chart init](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_helm-chart_init) — OCI/local chart, rollout과 timeout 제약.
- [Palantir, apollo-cli product-release init](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_init) — manifest 파일에서 초기 artifact 생성.
- [Palantir, apollo-cli product-release list](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_list) — 제품별 릴리스 페이지 크기와 채널 필터.
- [Palantir, apollo-cli product-release release-channel](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_release-channel) — 릴리스별 채널 소속 그룹.
- [Palantir, apollo-cli product-release release-channel edit](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_release-channel_edit) — 빈 목록은 소속 제거, 빈 문서는 취소.
- [Palantir, apollo-cli product-release terraform](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_terraform) — Terraform manifest 그룹.
- [Palantir, apollo-cli product-release terraform init](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_terraform_init) — Terraform repository와 coordinate 초기화.
- [Palantir, apollo-cli product-release verify](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product-release_verify) — TGZ 안 manifest 또는 파일 검증.
- [Palantir, apollo-cli product list](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product_list) — 전체 제품 목록.
- [Palantir, apollo-cli product promotion Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product_promotion) — 실험적 자동 승격 pipeline 그룹.
- [Palantir, apollo-cli product promotion append Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product_promotion_append) — source/target stage 충돌 감지와 선택적 덮어쓰기.
- [Palantir, apollo-cli product promotion disable Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product_promotion_disable) — 비활성화는 기존 채널 소속에 영향 없음.
- [Palantir, apollo-cli product promotion enable Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product_promotion_enable) — 설정 stage와 조건에 따른 자동 승격 재개.
- [Palantir, apollo-cli product promotion get Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product_promotion_get) — revision, enabled와 stage 조회.
- [Palantir, apollo-cli product promotion set Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_product_promotion_set) — 전체 pipeline 교체와 환경 단위 적용.
- [Palantir, apollo-cli release-channel Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel) — 실험적 release channel 그룹.
- [Palantir, apollo-cli release-channel add Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel_add) — 여러 좌표/파일/환경/bundle 입력 병합과 중복 제거.
- [Palantir, apollo-cli release-channel create Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel_create) — description과 label 요구사항으로 채널 생성.
- [Palantir, apollo-cli release-channel diff Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel_diff) — 환경의 제품에 한정한 source와 target 차이.
- [Palantir, apollo-cli release-channel export Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel_export) — 전체 또는 제품별 최신 좌표 YAML export.
- [Palantir, apollo-cli release-channel get Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel_get) — 이름으로 채널 조회.
- [Palantir, apollo-cli release-channel list Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel_list) — page token은 단일 페이지와 다음 토큰.
- [Palantir, apollo-cli release-channel remove Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel_remove) — 좌표와 YAML 파일을 합쳐 소속 제거.
- [Palantir, apollo-cli release-channel update Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_release-channel_update) — revision 기반 갱신, label 대체와 읽기 전용 archive.
- [Palantir, apollo-cli target-hub Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_target-hub) — 전송 대상 Hub 작업 그룹.
- [Palantir, apollo-cli target-hub get Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_target-hub_get) — ID로 target Hub 조회.
- [Palantir, apollo-cli target-hub list Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_target-hub_list) — target Hub 목록.
- [Palantir, apollo-cli target-hub pipeline Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_target-hub_pipeline) — target Hub에 연결한 pipeline 그룹.
- [Palantir, apollo-cli target-hub pipeline list Experimental](https://www.palantir.com/docs/apollo/apollo-cli/apollo-cli_target-hub_pipeline_list) — 해당 target Hub로 전송하는 pipeline 목록.

- [Palantir, apollo-cli-deprecated](https://www.palantir.com/docs/apollo/apollo-cli-deprecated) — 부모 deprecated 경로는 폐기된 Helm 게시 본문으로 연결된다.

## 관련 문서

- [[Apollo-CLI-Authentication-and-Profiles]]
- [[Apollo-CLI-Resources-and-Changes]]
