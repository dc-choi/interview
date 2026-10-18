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

snapshot은 매번 선택 조건의 현재 전체 결과, incremental은 앞 Bundle 이후 변화를 담고 의존 Bundle 순서를 지켜 처리한다. Pipeline의 첫 Bundle은 snapshot이다. checkpoint는 새 target의 합류를 위한 독립 snapshot이며 기존 incremental chain의 다음 기준을 바꾸지 않는다. 기본 checkpoint 주기는 성공한 incremental10개마다이며 조정 가능하다. 큰 checkpoint의 storage/transfer 비용과 새 target의 catch-up 지연을 교환한다.

여러 Pipeline이 같은 target에 보내 state 추정이 어긋나면 target의 Entity JSON을 내려받아 Pipeline Target Hub versions에 반영한다. 이 기능은 실제 target 버전에 맞는 upgrade 경로와 bundle 크기를 계산하기 위한 것이며 target 소프트웨어 자체를 바꾸는 작업은 아니다.

## 큰 파일과 전송 확인

chunking은 생성 시 최대4~16GB로 나누며 설정 변경은 새 Bundle부터 적용한다. chunk 자체는 순서와 관계없이 upload할 수 있지만 전체가 있어야 처리한다. incremental Bundle 간 의존 순서와 chunk 순서는 별개다.

CLI 문서 기준 최소0.425.0에서 bundle download/upload/assemble을 제공한다. 기본 download는 chunk를 stream해 합치지만 하나가 실패하면 전체 명령이 실패한다. 신뢰성이 필요하면 chunks-only, index-only를 각각 받아 로컬에서 assemble한다. 실패 chunk ID를 골라 재시도한다. 문서의 오류 목록과 뒤의 재시도 예시 ID가 맞지 않으므로 예시 숫자를 그대로 복사하지 않는다. gzip은 합치는 시간을 크게 늘릴 수 있다.

Experimental layer deduplication은 특정 Target Hub에 이미 전송한 layer를 제외한다. Any Hub는 dedup이 아니다. target upload와 존재 확인 후 source에서 수동 transfer를 confirm해야 이후 계산에서 제외한다. premature confirm은 뒤 Bundle 실패를 만들 수 있다. target별 download가 아니거나7일이 지난 download, 기능이 꺼진 Pipeline은 confirmation만 해도 dedup이 안 된다. 잘못 확인했거나 target에서 삭제했으면 rescind한다. 이 기능 장애 시 끄면 더 큰 Bundle로 돌아간다.

preview는 build 전 선택 내용을 확인하는 도구다. build 후 다음 preview, 설정 변경, 수동 refresh로 갱신된다. missing resource를 무시하도록 설정하면 build 성공이어도 필요한 이미지가 빠질 수 있다.

## 출처

- [Palantir, export-import](https://www.palantir.com/docs/apollo/export-import) — 부모 경로에서 source/target와 Bundle 흐름.
- [Palantir, apollo-cli-for-bundle](https://www.palantir.com/docs/apollo/export-import/apollo-cli-for-bundle) — download/upload/assemble, chunk 실패와 최소CLI.
- [Palantir, bundle-chunking](https://www.palantir.com/docs/apollo/export-import/bundle-chunking) — chunk 크기, 임의 upload 순서와 전체 수신 후 처리.
- [Palantir, bundle-layer-deduplication](https://www.palantir.com/docs/apollo/export-import/bundle-layer-deduplication) — target별 layer dedup과 confirmation의 정확성.
- [Palantir, bundle-preview](https://www.palantir.com/docs/apollo/export-import/bundle-preview) — preview 자동/수동 갱신.
- [Palantir, checkpoint-bundle](https://www.palantir.com/docs/apollo/export-import/checkpoint-bundle) — checkpoint는 incremental chain 기준을 바꾸지 않음.
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
