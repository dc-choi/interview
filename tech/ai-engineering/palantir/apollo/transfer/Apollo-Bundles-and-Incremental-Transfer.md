---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo Bundle과 증분 전송

## 네트워크 경계에서 정본을 전달한다

Source Hub의 catalog/환경 정의를 Bundle로 묶어 Target Hub에 전달하고 그곳에서 다시 Plan을 계산한다. Hub는 다른 전송의 source와 target을 겸할 수 있다. source가 실제 artifact 저장소에 접근하지 못하면 metadata만 보내고 image 전달은 별도 책임으로 남는다. 파일 업로드 완료, 비동기 import 처리, CR 승인과 실제 deployment 완료를 각각 확인한다.

Pipeline은 source 자원 선택, resource 종류 필터, label, build 주기와 risk policy를 가진다. 수정은 CR 승인이 필요하다. archive는 생성/수정을 멈추고 unarchive로 재개할 수 있다. 삭제는 history와 설정을 영구 제거하며 먼저 archive해야 한다.

## 무엇을 보내는가

Data selection은 Environment, Module, Product, 특정 Release와 Team을 고른다. Module-only는 최신 정의만, release 선택 전략은 none/all/minimal로 구분한다. all도 초기 snapshot 예시는 최신 release부터 시작하고 이후 새 release들을 보낸다. 이름만 보고 모든 과거 버전을 최초 전송한다고 해석하지 않는다. minimal은 의존성과 schema의 upgrade 경로에 필요하지 않은 중간 버전을 제거하며 선택한 제품 집합을 함께 평가한다.

Resource selection은 선택 결과에서 metadata, container image, product/asset binary, SLS config, recall, Module, Environment, vulnerability report/suppression, Team/contact 식별자 등을 더 고른다. metadata-only는 artifact와 배포 가능성까지 보장하지 않는다. Module 정의의 제품/릴리스는 별도 resource type으로 전송한다. future resource types를 자동 포함할지 명시한다.

Label inclusion/exclusion은 값 미지정 시 존재 여부만 본다. 여러 허용 값 중 하나면 충족하고 같은 타입의 여러 요구조건은 모두 통과해야 한다. exclusion이 inclusion보다 우선하며 label이 선언한 자원 타입에만 해당한다.

## snapshot, incremental과 checkpoint

snapshot은 매번 선택 조건의 현재 전체 결과, incremental은 앞 Bundle 이후 변화를 담고 의존 Bundle 순서를 지켜 처리한다. Pipeline의 첫 Bundle은 snapshot이다. checkpoint는 새 target의 합류를 위한 독립 snapshot이며 기존 incremental chain의 다음 기준을 바꾸지 않는다. 기본 checkpoint 주기는 성공한 incremental 10개마다이며 조정 가능하다. 큰 checkpoint의 storage/transfer 비용과 새 target의 catch-up 지연을 교환한다.

공식 예시로 흐름을 보면 incremental 전략에서 첫 Bundle은 그 시점의 최신 release만 담은 snapshot이다. 다음 Bundle은 그 뒤 새로 생긴 release만 담고, 새 release가 없으면 release를 담지 않은 incremental이 된다. checkpoint 주기에 도달하면 그 시점의 최신 release를 담은 checkpoint가 따로 만들어지지만, 다음 incremental은 checkpoint가 아니라 직전 incremental에 의존한다. snapshot 전략에서는 매 Bundle이 그 시점 최신 release만 담으므로 중간 release가 빠질 수 있다.

2026-11-09 공식 checkpoint 문서 대조 기준, 새 transfer target은 가장 최근의 snapshot Bundle부터 시작하며 이것이 checkpoint일 수 있다. 주기 값은 checkpoint 사이에 만들 incremental 수다. target이 하나뿐인 Pipeline(예: Environment 설정만 한 Target Hub로 보내는 경우)이나 Source Hub 저장 공간이 부족하면 100 같은 큰 값으로 생성 빈도를 낮출 수 있다. 설정 위치는 Pipeline settings의 **Build settings > Checkpoint Bundles**다.

Export Bundles inbox에서 checkpoint는 `CHECKPOINT` tag가 붙고 회색으로 보인다. 기존 transfer target에는 전송되지 않으며 Pipeline 상태도 바꾸지 않는다. Target Hub에서는 다른 Bundle과 같은 방식으로 import하고, admission에 성공하면 Import Bundles inbox에도 같은 tag로 표시된다. 회색 항목을 전송 누락이나 실패로 해석하지 않는다.

여러 Pipeline이 같은 target에 보내 state 추정이 어긋나면 target의 Entity JSON을 내려받아 Pipeline Target Hub versions에 반영한다. 이 기능은 실제 target 버전에 맞는 upgrade 경로와 bundle 크기를 계산하기 위한 것이며 target 소프트웨어 자체를 바꾸는 작업은 아니다.

## 큰 파일과 전송 확인

2026-10-30 공식 chunking 문서 대조 기준, Export Pipeline의 **Build settings > Max transfer size**를 4~16 GB 범위로 설정한다. 전체 Bundle 크기가 이 한도를 초과할 때 여러 파일로 나뉜다. 한도를 바꿔도 이미 만든 Bundle에는 소급 적용되지 않고 이후 생성한 Bundle부터 적용된다.

Bundle의 **Downloads > Bundle chunks**에서 각 청크의 크기를 확인하고 개별 또는 일괄 다운로드한다. Target Hub의 Import 애플리케이션에는 청크를 순서와 관계없이 올릴 수 있다. Import inbox의 Bundle 상태에서 아직 받지 못한 청크를 확인하며, 모든 청크를 받은 뒤 Bundle import를 처리한다. 청크 업로드 완료와 Bundle 처리 완료를 구분한다. incremental Bundle 간 의존 순서와 한 Bundle 안의 청크 업로드 순서는 별개다.

CLI 문서 기준 최소 0.425.0에서 bundle download/upload/assemble을 제공한다. 기본 download는 chunk를 stream해 합치지만 하나가 실패하면 전체 명령이 실패한다. 신뢰성이 필요하면 chunks-only, index-only를 각각 받아 로컬에서 assemble한다. 실패 chunk ID를 골라 재시도한다. 문서의 오류 목록과 뒤의 재시도 예시 ID가 맞지 않으므로 예시 숫자를 그대로 복사하지 않는다. gzip은 합치는 시간을 크게 늘릴 수 있다.

Experimental layer deduplication은 특정 Target Hub에 이미 전송한 layer를 제외한다. Any Hub는 dedup이 아니다. target upload와 존재 확인 후 source에서 수동 transfer를 confirm해야 이후 계산에서 제외한다. premature confirm은 뒤 Bundle 실패를 만들 수 있다. target별 download가 아니거나 7일이 지난 download, 기능이 꺼진 Pipeline은 confirmation만 해도 dedup이 안 된다. 잘못 확인했거나 target에서 삭제했으면 rescind한다. 이 기능 장애 시 끄면 더 큰 Bundle로 돌아간다.

preview는 build 전 선택 내용을 확인하는 도구다. build 후 다음 preview, 설정 변경, 수동 refresh로 갱신된다. missing resource를 무시하도록 설정하면 build 성공이어도 필요한 이미지가 빠질 수 있다.

## 출처

- [Palantir, export-import](https://www.palantir.com/docs/apollo/export-import) — 부모 경로에서 source/target와 Bundle 흐름.
- [Palantir, apollo-cli-for-bundle](https://www.palantir.com/docs/apollo/export-import/apollo-cli-for-bundle) — download/upload/assemble, chunk 실패와 최소 CLI.
- [Palantir, bundle-chunking](https://www.palantir.com/docs/apollo/export-import/bundle-chunking) — 2026-10-30 분할 한도, 새 Bundle 적용, 다운로드와 누락 청크 확인 절차 대조. 다른 절의 검증일은 frontmatter 기준.
- [Palantir, bundle-layer-deduplication](https://www.palantir.com/docs/apollo/export-import/bundle-layer-deduplication) — target별 layer dedup과 confirmation의 정확성.
- [Palantir, bundle-preview](https://www.palantir.com/docs/apollo/export-import/bundle-preview) — preview 자동/수동 갱신.
- [Palantir, checkpoint-bundle](https://www.palantir.com/docs/apollo/export-import/checkpoint-bundle) — checkpoint는 incremental chain 기준을 바꾸지 않음. 2026-11-09 새 target 시작점, 주기 설정, inbox 표시와 import 절차 대조.
- [Palantir, create-export-bundle](https://www.palantir.com/docs/apollo/export-import/create-export-bundle) — pipeline build와 export 단계.
- [Palantir, create-pipeline](https://www.palantir.com/docs/apollo/export-import/create-pipeline) — 전략, missing-resource 선택, archive와 영구 삭제.
- [Palantir, data-selection-rules](https://www.palantir.com/docs/apollo/export-import/data-selection-rules) — 선택 자원과 none/all/minimal release 전략.
- [Palantir, export-label-requirements](https://www.palantir.com/docs/apollo/export-import/export-label-requirements) — label exclusion 우선, 값 OR와 조건 AND.
- [Palantir, import-bundle](https://www.palantir.com/docs/apollo/export-import/import-bundle) — 비동기 import의 진행/실패 확인.
- [Palantir, overview](https://www.palantir.com/docs/apollo/export-import/overview) — source metadata/이미지와 target Plan의 단계.
- [Palantir, resource-selection](https://www.palantir.com/docs/apollo/export-import/resource-selection) — resource 종류 필터, metadata-only와 future type.
- [Palantir, target-hub-versions](https://www.palantir.com/docs/apollo/export-import/target-hub-versions) — target 버전 JSON으로 source 추정 보정.

## 관련 문서

- [[Apollo-Cross-Hub-Governance-and-Bundle-Security]]
- [[Apollo-CLI-Releases-and-Modules]]
