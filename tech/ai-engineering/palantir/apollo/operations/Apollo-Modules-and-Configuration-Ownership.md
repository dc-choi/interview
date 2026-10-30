---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo Module 구성과 설정 소유권

## 모듈은 제품과 설정의 배포 단위다

Module은 함께 배포하는 제품, 버전별 설정, variable과 secret 요구사항을 묶는다. Helm 엔티티는 productId와 namespace, Terraform 엔티티는 productId와 계정/인스턴스 정보를 가진다. 같은 엔티티가 있으면 Module이 이를 인수할 수 있지만 동일 AEID인지 먼저 확인한다. 엔티티 하나는 Module 하나가 관리한다.

Module 릴리스는 불변이며 새 정의를 게시하면 새 버전을 만든다. 설치는 환경 기본 채널을 추적하고 필요하면 채널을 재지정한다. 해당 채널에 릴리스가 승격되어야 update CR을 제안한다. 구형 가이드의 최신 버전 즉시 전파 설명은 이 채널 추적 조건과 함께 읽는다.

string variable은 defaultValue, anchored regex 또는 oneOf 제약을 가질 수 있다. default도 제약을 만족해야 한다. preset은 options와 그 모든 선택지를 매핑한 stringPreset을 조합하며 설치자는 option을 고른다. 개별 stringPreset을 직접 재정의하지 않는다. 새 릴리스에서 preset mapping을 바꾸면 같은 option을 쓰는 기존 설치도 그 Module update에서 바뀐다.

## 기존 config의 소유권

| syncConfigOverrides | 기존 엔티티 업데이트 | 사용 조건 |
|---|---|---|
| ENABLED(기본) | Module 정의로 전체 교체 | 설치간 구성을 일치시키고 차이는 variable로 표현 |
| MERGE | Module key가 이기고 그 외 Entity key 유지 | Module과 Entity가 소유 key를 나누어 관리 |
| DISABLED | 기존 config 유지 | Module이 기존 config를 통제하지 않음 |

새 엔티티는 어느 mode에서도 Module config를 처음 적용한다. MERGE에서 Module 소유 key는 사용자가 바꿀 수 없고 `{{ unset }}`으로 값을 제거하면서 사용자 설정도 막을 수 있다. Module 정의에서 key를 그냥 삭제하면 기존 Entity 값은 남고 사용자 소유가 된다.

마지막 key 제거 동작은 `MERGE`의 규칙이다. `ENABLED`는 Module 정의로 전체 교체하므로 정의에서 빠진 key도 제거한다. `DISABLED`는 기존 Entity 설정을 유지한다. 따라서 설정 삭제를 검토할 때는 YAML diff와 함께 `syncConfigOverrides`를 확인한다.

installConfigOverrides는 MERGE에서 최초 설치에만 적용하는 기본값이다. 이후에는 Entity 소유이며 후속 Module 릴리스에 추가한 install-only key도 미래 최초 설치에만 적용된다. pause는 열린 update CR을 취소하고 새 CR 생성을 막으며 Module 소유 key의 긴급 수정을 허용한다. resume은 최신 릴리스와 차이를 맞추는 CR을 만들고 merge까지 Resuming Updates다.

## 합성과 Git 관리

Composite Module은 이미 있는 하위 Module의 정확한 name/version을 고정한다. 부모 릴리스가 고정한 하위 version을 바꾸려면 부모도 새 릴리스가 필요하다. 같은 하위를 여러 번 포함하면 unique key로 구별한다.

variableOverrides는 직접 하위가 정의한 변수만 하드코딩하거나 부모 변수로 매핑한다. stringPreset은 override할 수 없고 options는 option 값 또는 부모 options로만 바꾸며 부모 선택지는 하위의 부분집합이어야 한다. entityOverrides는 같은 type/productId와 선택 entityName으로 대상을 고른다. config key는 병합하고 secret requirements는 이름별로 바꾸거나 추가한다. 하위 restrictions.submoduleUsage.allowEntityOverrides:false면 entity override를 거부하지만 variable override는 가능하다.

`variableOverrides`와 `entityOverrides`의 도달 범위는 다르다. 변수는 직접 하위 Module이 정의한 것만 바꿀 수 있지만, Entity override는 그 하위에 직접 정의되지 않은 Entity에도 적용할 수 있다. 합성 계층이 깊을 때 변수의 제한을 Entity에도 그대로 적용하지 않는다.

합성 예시에서 같은 config key는 `entityOverrides` 값이 우선하고, 지정하지 않은 기존 key는 남는다. 반면 같은 이름의 `secretRequirements`를 재정의한 예시는 기존 `api-key`를 `a-different-key`로 교체한다. secret 이름별 병합을 내부 key 목록의 합집합으로 해석하지 않는다. 이는 요구사항 정의의 합성이며 실제 secret 값의 수정과는 구분한다.

Git 관리의 이점은 review와 버전 추적이다. Module 직접 생성 권한을 광범위하게 열어두면 Git review를 우회할 수 있다. lock file은 합성 결과와 필요한 전체 variable을 보여주고 CI에서 lock --verify로 최신 여부를 확인한다. version:local은 전체 정의 디렉터리를 제공해 로컬 하위를 실제 릴리스 좌표로 해결하며 변경한 하위와 부모를 함께 새 버전으로 게시한다. 설치 순서는 YAML 나열 순서가 아니라 Product Release dependencies로 정한다.

## 호환되는 진화와 삭제

새 variable에 기본값이 없으면 기존 설치 update가 막힌다. variable 개명은 이전 설치값 보존을 보장하지 않는다. 삭제는 모든 참조를 먼저 없애야 한다. 제품 제거를 원하면 markedForUninstallation을 명시하고 필요하면 minVersion으로 마이그레이션 완료 후 제거한다. 정의에서 항목만 빼면 실제 설치는 남고 Module 관리만 끝난다.

`markedForUninstallation.unmanageAfterUninstall`의 기본값은 `AUTOMATIC`이며 제거 뒤 Apollo 관리도 해제한다. `MANUAL`은 제거 뒤에도 managed 상태를 남긴다. 이는 자원을 남기는 `Unmanage only`와 다르다. 대상 Entity가 환경에 없으면 해당 제거 선언은 Module 설치에서 무시된다. `minVersion`은 제거 자격의 최소 버전이며 의존성 제약까지 없애는 옵션은 아니다.

관리 이전은 구 Module에서 항목을 제거해 업데이트한 뒤 신 Module에 같은 AEID를 넣어 인수한다. 구성 차이가 없다는 조건에서 실제 재설치 Plan 없이 이전할 수 있다. Module unlink도 엔티티를 남긴다. Module 삭제는 설치가 없어야 하며 하위로 참조하는 다른 Module이나 shared 제약도 확인한다.

자동 update 승인 mode는 최종 승인이 아니라 CEL의 적격 조건이다. Apollo가 생성한 자동 update이고 사용자 config를 덮어쓰지 않아야 하며 custom CEL은 추가 승인 요구를 둘 수 있다. install과 수동 update는 자동 승인 적격이 아니다. Module recall은 해당 버전으로의 제안/열린 CR을 막지만 이미 설치된 버전을 자동 downgrade하지 않는다.

설치 가이드에는 동일 환경에 여러 설치를 언급하지만 update 가이드에는 하나만 가능하다고 적혀 있다. 설치 가능 개수는 이 상충 문구만으로 확정하지 않고 현재 Hub UI/schema에서 확인한다.

## 출처

- [Palantir, modules](https://www.palantir.com/docs/apollo/core/modules) — Module 채널 추적과 recall의 자동 roll-off 미지원.
- [Palantir, best-practices](https://www.palantir.com/docs/apollo/managing-environments/best-practices) — fleet 공통 구성을 Git/Module로 관리.
- [Palantir, managing-modules](https://www.palantir.com/docs/apollo/managing-modules) — Module 부모 경로의 catalog/installation/contents.
- [Palantir, composite-modules](https://www.palantir.com/docs/apollo/managing-modules/composite-modules) — 2026-10-30 변수와 Entity override의 도달 범위, config 우선순위와 secret 요구사항 교체 예시를 부분 대조. 다른 절의 검증 날짜는 유지했다.
- [Palantir, create-module](https://www.palantir.com/docs/apollo/managing-modules/create-module) — 2026-10-30 설정 key 제거의 mode별 차이와 제거 후 관리 상태, 대상 부재와 최소 버전 조건을 부분 대조. 다른 절의 검증 날짜는 유지했다.
- [Palantir, git-module](https://www.palantir.com/docs/apollo/managing-modules/git-module) — Git review 우회 방지, lock과 local submodule resolution.
- [Palantir, install-module](https://www.palantir.com/docs/apollo/managing-modules/install-module) — 기존 AEID 인수, preview와 unlink시 설치 보존.
- [Palantir, overview](https://www.palantir.com/docs/apollo/managing-modules/overview) — Module 릴리스/설치/contents 탐색.
- [Palantir, update-module-installation](https://www.palantir.com/docs/apollo/managing-modules/update-module-installation) — 자동 update 적격, 채널과 개수 설명의 상충.

## 관련 문서

- [[Apollo-CEL-Approval-Policies]]
- [[Apollo-CLI-Releases-and-Modules]]
