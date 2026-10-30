---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo 엔티티 구성과 수명주기

## 설치 계약

동일 제품을 환경에 여러 번 설치할 수 있으나 엔티티 이름은 해당 환경 안에서 유일해야 한다. 제품, 이름, namespace, 채널과 지원 버전별 override를 선언하고 CR 승인과 병합을 거쳐 설치한다. 채널을 생략하면 환경의 기본 Release Channel을 따르며, Helm release name의 기본값은 엔티티 Name이다. 이미 unmanaged가 관측되면 기존 대상을 관리하고, 없으면 새 설치를 만든다. uninstall했어도 아직 managed이면 중복 추가하지 않고 unmanage 완료를 기다리거나 uninstall을 취소한다.

지원 버전은 실제 배포 허용 범위다. 최소한 빈 overrides 블록이 있어야 그 major 버전을 설치한다. `1.2.0` 블록은 같은 major의 그 버전 이상, `2.0.0`은 major2, `2.6.0`이 추가되면 그 이후에 더 구체적인 override를 쓴다. 구성과 버전 선택을 같은 Plan에서 해결해 경쟁을 줄인다. UI의 defaults는 현재 실행 중 버전에 해당하는 tab이면 실행 release에서, 다른 tab이면 채널의 해당 범위 최대 non-recalled release에서 가져온다. 모두 recalled이면 최대 matching release를 표시할 수 있으므로 표시값과 설치 허용을 혼동하지 않는다.

Environment Config는 DNS, cloud/region처럼 여러 엔티티가 공유하는 속성에 쓴다. YAML key는 hyphen, period와 whitespace를 쓰지 않는다. 일부 엔티티만 쓰는 값은 config override가 낫다. 변경 승인 뒤 해당 값을 사용하는 엔티티마다 Plan을 발행한다. Helm에서는 `.Values.apollo.environment`로, override 내에서는 preprocess를 통해 참조한다. agent가 apollo block에 entity/product/environment/secret/registry 정보를 주입하고 응용 override는 top-level Helm values로 합친다.

### 승인 뒤에도 설치나 업그레이드가 진행되지 않을 때

CR 승인과 실제 설치 가능 조건은 다르다. 2026-10-30 공식 설치 안내에서 다음 조건을 대조했다.

- **설치:** 구독 채널에 해당 제품의 Release가 있어야 설치 Plan을 추천한다. 제품에 Release를 게시한 것과 구독 채널로 승격한 것을 구분한다.
- **업그레이드:** 구독 채널에 더 새로운 Release가 있어야 하며, 현재 Release에 버전 변경을 동결하는 recall이 있으면 업그레이드 조건을 만족하지 않는다.
- **공통 제약:** maintenance window, suppression window와 제품 의존성 제약을 충족해야 한다. 설치 시 의존 제품 자체도 정상 설치와 업그레이드가 가능해야 한다. 새 Release에서 추가된 의존성과 stack override, ignored dependency 설정을 함께 확인한다.

지원 버전 범위와 채널의 Release, 실행 제약을 나누어 확인하면 승인 완료를 배포 완료로 오인하지 않을 수 있다. 상세 Plan 판단은 [[Apollo-Orchestration-and-Constraints]]를 따른다.

## 의존성의 인스턴스 범위

기본 stack 범위를 바꾸는 dependency stack override와 특정 제품 의존성을 무시하는 ignored dependency는 별도 기능이다. dependency group은 여러 인스턴스가 섞이지 않도록 최소 한 group을 공유하는 대상끼리 의존성과 비호환을 평가한다. 명시하지 않거나 빈 목록이면 default group이다. 제품별 group override로 검색 범위를 바꿀 수 있고 wildcard는 모든 group을 허용한다. staging 인스턴스가 production DB로 잘못 충족되지 않는지 확인한다.

## 정지, 제거와 관리 해제

정지는 응용 chart의 replica 설정을 0으로 만드는 방식이며 Kubernetes Pod 자체를 pause하는 기능은 아니다. 복구는 그 override를 제거해 제품 기본값으로 돌린다. 구형 정지 예제의 replication.desired:0은 Beta replication 규격의 양의 정수 조건과 충돌하므로 chart가 실제 받는 키/schema를 먼저 확인한다.

uninstall은 실제 Kubernetes 자원을 제거하고, unmanage는 Apollo 선언에서 지워 Plan을 중단한다. unmanage only는 실제 자원을 남긴다. 기본은 uninstall 다음 자동 unmanage다. 필수 의존 대상은 그에 의존하는 엔티티가 설치된 동안 제거하지 못하지만 optional 의존자는 먼저 제거할 필요가 없다. 요청 제출과 실행은 분리되어 승인 뒤에도 제약 때문에 기다릴 수 있고 그 사이 다른 Plan이 실행될 수 있다. unmanage 전에는 uninstall을 취소할 수 있다.

### 제거 요청과 Undo의 확인 경계

필수 의존성을 해결하지 않고 제거 요청을 제출할 수는 있지만, 의존성이 남으면 제거 Plan은 실행되지 않는다. 요청 승인 여부와 자원 제거 완료 여부를 별도로 확인한다.

`Undo`는 아직 unmanaged가 아닌 `Uninstall pending` 또는 `Uninstalled` 상태에서 선택할 수 있다. 제거가 실행되기 전이라면 제거 시도를 중단한다. 이미 제거된 경우에도 Undo 대상이 될 수 있다는 설명을 데이터 복원 보장으로 해석하지 않는다. 공식 안내는 삭제된 데이터나 Kubernetes 자원의 복구 범위를 보장하지 않으므로 별도의 복구 절차를 확인한다.

제품과 릴리스 삭제는 영구적이다. 설치 중인 엔티티가 없는지 확인한다. 제품 삭제 화면을 떠나면 중간에 멈출 수 있고 이미 삭제한 부분은 남는다. display name, description과 Markdown README는 사용자 표시를 바꿀 뿐 불변 Product ID를 바꾸지 않는다.

## 출처

- [Palantir, introduction-install](https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-install) — 설치 후 Activity와 Entity 상태로 확인.
- [Palantir, introduction-products](https://www.palantir.com/docs/apollo/apollo-getting-started/introduction-products) — 제품 생성 권한과 릴리스 게시의 구분.
- [Palantir, add-and-edit-entities](https://www.palantir.com/docs/apollo/managing-entities/add-and-edit-entities) — 2026-10-30 환경 내 이름 유일성, 기본 채널과 Helm release name, CR 승인/병합, 설치/업그레이드 조건을 부분 대조. 다른 절의 검증 날짜는 유지했다.
- [Palantir, deleting-and-unmanaging-entities](https://www.palantir.com/docs/apollo/managing-entities/deleting-and-unmanaging-entities) — 구형 삭제 페이지는 uninstall 안내로 위임.
- [Palantir, overview](https://www.palantir.com/docs/apollo/managing-entities/overview) — 환경 Config에서 관리 선언 편집.
- [Palantir, set-config-overrides](https://www.palantir.com/docs/apollo/managing-entities/set-config-overrides) — 버전 범위별 override와 Helm values 주입.
- [Palantir, stopping-and-starting-entities](https://www.palantir.com/docs/apollo/managing-entities/stopping-and-starting-entities) — replica0 정지와 default 복구 예제의 타입별 검증 필요.
- [Palantir, uninstalling-and-unmanaging-entities](https://www.palantir.com/docs/apollo/managing-entities/uninstalling-and-unmanaging-entities) — 2026-10-30 제거 요청의 의존성 대기와 Undo 대상 상태를 부분 대조. 다른 절의 검증 날짜는 유지했다.
- [Palantir, environment-config](https://www.palantir.com/docs/apollo/managing-environments/environment-config) — Environment Config 용도, key 규칙과 참조.
- [Palantir, environment-settings](https://www.palantir.com/docs/apollo/managing-environments/environment-settings) — dependency group, override와 default 의미.
- [Palantir, create-a-new-product](https://www.palantir.com/docs/apollo/managing-products/create-a-new-product) — 불변 Product ID와 초기 권한5분 설정.
- [Palantir, delete-product-and-product-release](https://www.palantir.com/docs/apollo/managing-products/delete-product-and-product-release) — 영구 삭제와 화면 이탈 시 부분 삭제.
- [Palantir, overview](https://www.palantir.com/docs/apollo/managing-products/overview) — 제품 관리 안내는 Helm 중심.
- [Palantir, product-display-metadata](https://www.palantir.com/docs/apollo/managing-products/product-display-metadata) — display metadata와 immutable ID 분리.
- [Palantir, managing-entities](https://www.palantir.com/docs/apollo/managing-entities) — 엔티티 부모 문서도 config 관리 진입점.
- [Palantir, managing-products](https://www.palantir.com/docs/apollo/managing-products) — 제품 부모 문서의 Helm 범위.

## 관련 문서

- [[Apollo-Orchestration-and-Constraints]]
- [[Apollo-Modules-and-Configuration-Ownership]]
