---
tags: [palantir, marketplace]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Marketplace 입력 mapping과 설치 job

## Product, draft와 설치

Product는 설치 가능한 resource 묶음이고 store는 product를 담는다. 설치할 version의 changelog, inputs와 outputs를 검토한다. Recalled version은 새 수동/자동 설치가 차단되지만 이미 설치된 것은 계속 쓸 수 있다. 가능한 정상 version으로 옮기는 조치는 별도로 필요하다.

Installation job draft는 project/space/Ontology와 여러 제품의 의존성을 구성하는 변경안이다. Create draft는 설치 실행이 아니다. Required input과 blocking validation을 해결한 뒤 Install로 job을 제출한다. Warning은 설치를 막지 않더라도 영향 검토가 필요하다.

API의 `MarketplaceInstallationJob`은 하나 이상의 기존 제품 설치를 업그레이드하려는 시도이며, draft와 제출된 job은 같은 RID를 쓴다. 따라서 RID가 생겼거나 그대로라는 사실만으로 제출 또는 성공을 판정하지 않고 `status`를 함께 읽는다. 2026-10-21 수집된 공식 개요를 2026-10-22 Create Marketplace Installation Job의 검색 반환 본문과 대조한 범위이며, 개요 URL 직접 열기와 실제 API 호출은 확인하지 못했다.

기존 installation을 Open하는 것과 Install again으로 새 자원을 만드는 것을 구분한다. 같은 제품을 다른 입력에 다시 설치할 수 있지만 기존 내용이 자동 재사용된다고 가정하지 않는다. 완료 후 Ontology indexing 때문에 앱 가용성이 몇 분 늦을 수 있다.

### API 생성의 기본값은 draft 보존이 아니다

2026-10-22 공식 Create Marketplace Installation Job의 검색 반환 본문과 2026-10-21 수집 명세를 대조했다. 직접 페이지 열기와 실제 API 호출은 확인하지 못했다.

- `POST /api/v3/platform/marketplaceInstallationJobs`는 기존 설치의 목표 버전 업그레이드를 준비한다. `preview=true`와 OAuth2 제3자 앱의 `api:v3:marketplace-installation-job:write:create` scope가 필요하다.
- `submissionMode`를 생략하면 `NON_BLOCKING_ERRORS` 허용 수준과 `ABORT` 처리로 제출한다. 검토만 하려면 `{"type":"draft"}`를 명시한다. 이 모드는 준비와 검증만 수행하고 후속 제출을 기다린다.
- 응답은 준비와 검증이 끝나기 전에 돌아온다. `PREPARING`은 계속 조회하되, `IDLE_DRAFT`는 조회만 반복해도 진행하지 않으므로 별도 후속 조치가 필요하다. 생성 응답을 설치 완료로 처리하지 않는다.
- 대상은 서로 다른 설치 1~10개, 제품당 최대 하나다. Namespace와 marketplace가 같아야 하며 override 적용 뒤 Ontology는 최대 하나여야 한다.
- 각 대상의 `values`와 `explicitlyUnset`은 이전 수동 값과 명시적 해제를 모두 교체한다. 일부 필드만 덧붙이는 patch로 취급하지 않는다. 두 필드에서 빠진 입력은 default, 자동 mapping이나 recommendation으로 충족될 수 있다.
- 생성은 멱등하지 않다. 반복 호출이 새 draft를 만들거나 충돌할 수 있으므로 응답 유실 시 기존 job과 draft 상태부터 확인하는 것이 운영상 안전하다.

## 취소 요청과 자원 복구를 구분한다

2026-10-22 공식 Abort/Get Marketplace Installation Job 페이지와 수집된 abort 명세를 대조했다. 아래는 API 계약이며 실제 호출과 복구 결과는 검증하지 않았다.

- 취소 경로는 `POST /api/v3/platform/marketplaceInstallationJobs/{marketplaceInstallationJobRid}/abort`다. Draft 중단과 제출된 job의 취소 요청을 처리한다. Preview 기능이므로 `preview=true`가 필요하며, OAuth2 제3자 앱에는 `api:v3:marketplace-installation-job:write:abort` scope가 필요하다.
- Job이 조회 가능한 동안 취소 호출은 멱등적이다. 제출된 job은 `ABORTING`을 거쳐 `ABORTED`가 될 수 있으므로 `get`으로 계속 조회한다. 이미 끝난 job을 취소해도 기존 최종 상태는 바뀌지 않는다.
- 취소 전 생성된 자원 때문에 설치가 불일치 상태로 남을 수 있다. 복구 방법은 같은 목표 버전으로 새 job을 시도하는 것이며, 취소를 자동 롤백이나 복구 성공으로 기록하지 않는다.
- 중단한 draft는 자동 정리 전까지만 조회할 수 있다. `get`은 실패하거나 중단된 job에도 HTTP 200을 반환하므로 응답의 `status`를 읽는다. 조회에는 별도로 `api:v3:marketplace-installation-job:read:get` scope가 필요하다.
- `AbortInstallationJobPermissionDenied`는 job이 보여도 취소 권한이 없는 403이다. `MarketplaceInstallationJobNotFound`는 404다. 취소 후 조회에서도 접근할 수 없는 job과 존재하지 않는 job이 같은 NotFound로 반환되므로, 404만으로 취소 성공을 판단하지 않는다.

## API의 설치 등록과 작업 실행을 구분한다

2026-10-22 Marketplace v3 API 문서 대조 기준이다. `MarketplaceInstallation`은 Compass에 등록된 제품 설치 자원이며, 자원이 존재한다는 사실만으로 설치 job의 완료를 판단하지 않는다.

- `POST /api/v3/platform/marketplaceInstallations`는 지정 project/folder에 설치를 등록한다. 이 호출은 job을 실행하거나 제품 자원을 설치하지 않는다. 실제 설치 버전은 후속 job에서 선택한다.
- 선택 입력인 `targetVersionHint`는 버전에 따른 검증과 초기 제목 결정에 사용한다. 설치 실행이나 해당 버전의 배포 완료를 뜻하지 않는다.
- 조회 응답의 선택 필드 `latestTargetVersion`은 가장 최근 제출한 job의 목표 버전이다. 현재 설치된 버전과 다를 수 있고, job이 실행된 적이 없으면 없다. 따라서 필드 유무나 값만으로 성공한 설치 버전을 확정하지 않는다.
- 생성은 멱등하지 않다. 반복 요청은 별도 설치를 만들며, 선택된 제품 버전의 singleton 정책이 목적지 namespace의 추가 설치를 금지하면 충돌 오류가 난다. 응답을 받지 못했다는 이유만으로 생성 요청을 반복하지 않는 것이 운영상 안전하다.

위 생성과 조회 endpoint는 preview이며 요청에 `preview=true`가 필요하다. OAuth2를 사용하는 제3자 앱의 scope는 생성에 `api:v3:marketplace-installation:write:create`, 조회에 `api:v3:marketplace-installation:read:get`이다. 실제 환경의 호출이나 권한 검증은 수행하지 않았으며, 설치 진행과 완료는 job 및 설치 자원을 별도로 확인한다.

### 생성 입력과 버전 힌트의 제약

2026-10-21 수집된 공식 Create Marketplace Installation 명세를 2026-10-22 대조한 범위다. 공개 페이지의 실시간 재조회는 실패했으므로 수집 이후 변경 여부와 실제 호출 동작은 확인하지 못했다.

- 필수 입력은 `marketplaceRid`, `productId`, `parentFolderRid`다. `parentFolderRid`는 등록 목적지이며 후속 job이 자원을 만드는 project/folder를 가리킨다. `ontologyRid`는 후속 job이 Ontology 자원을 만들거나 수정할 대상이고, 제품이 Ontology와 상호작용하지 않으면 생략한다.
- `targetVersionHint`는 `versionId` 또는 `semanticVersion` 형태를 받는다. 후자는 선행 0이 없는 음이 아닌 정수 세 부분의 정확한 `major.minor.patch`만 받는다. 버전 범위, wildcard, prerelease와 build metadata는 지원하지 않는다. 예를 들어 `1.2.3`과 `^1.2.3`을 같은 입력으로 취급하지 않는다.
- 힌트를 생략하면 최신 released version을 버전별 검증과 초기 제목 결정에 사용한다. 이 기본값도 설치 실행 버전의 확정과 구분한다.
- 잘못된 버전 형식은 `InvalidInstallationTargetVersionHint`, 존재하지 않는 힌트 버전은 `MarketplaceProductVersionNotFound`, singleton 충돌은 `SingletonMarketplaceInstallationAlreadyExists`로 구분한다. 운영에서는 입력 오류와 충돌을 반복 요청으로 해결하려 하지 말고 해당 조건부터 확인한다.

### 조회 응답의 현재 위치와 오류를 읽는다

2026-10-21 수집된 공식 Get Marketplace Installation 명세를 2026-10-22 대조한 범위다. 공개 URL의 실시간 재조회는 실패했으므로 아래는 수집본의 계약이며 이후 변경 여부와 실제 호출은 확인하지 못했다.

- 조회 경로는 `GET /api/v3/platform/marketplaceInstallations/{marketplaceInstallationRid}`다. 경로에는 설치 RID가 필요하며, `productId`를 대신 넣는 계약이 아니다.
- `parentFolderRid`와 `namespaceRid`는 설치가 Compass에서 현재 속한 위치다. 응답을 최초 생성 위치의 변경 불가능한 이력으로 사용하지 않는다. `displayName`도 현재 표시 이름이며 `description`은 설명이 없으면 생략된다.
- `latestTargetVersion`이 있으면 `versionId`와 `semanticVersion`을 함께 제공한다. 이 필드는 최근 제출 job의 목표를 나타내므로 현재 설치 버전의 성공 증거로 쓰지 않는다.
- 명세의 오류 목록에는 `MarketplaceInstallationNotFound`가 `NOT_FOUND` 코드와 `marketplaceInstallationRid` 매개변수로 정의되어 있다. 이 목록만으로 인증이나 전송 계층의 모든 실패 유형을 열거했다고 해석하지 않는다.

## 입력을 충족하는 방식

Input은 resource, group, migration 설정이나 prefix일 수 있다. Linked product가 채운 input은 기본 숨김이므로 mandatory 개수만 보지 말고 실제 공급 자원을 확인한다. Downstream tab은 해당 input을 소비할 출력을 보여 준다.

Linked installation은 외부 참조, 기존 설치 upgrade 또는 새 설치로 추가한다. 외부 참조는 store를 넘을 수 있으나 하나의 job에 실제 포함되는 installation은 같은 store와 space여야 한다. Apply changes 전후 graph에서 이번 job이 수정할 대상과 참조만 할 대상을 구분한다.

Placeholder는 검증일 기준 dataset input만 지원한다. 실제 자원이 없을 때 schema stub으로 설치를 진행하므로 데이터가 준비됐다는 뜻이 아니다. 이후 Edit로 실제 입력에 remap한다. Folder auto-selection과 bulk-set도 선택한 자원/column mapping을 검토한다.

### API 조회에서 값, 명시적 해제와 생략을 구분한다

2026-10-22 수집본과 검색 도구가 반환한 공식 v3 API 문서 본문을 대조했다. 페이지 직접 열기는 실패했으며 실제 API 호출은 수행하지 않았다.

`GET /api/v3/platform/marketplaceInstallations/{marketplaceInstallationRid}/inputs`는 현재 충족된 입력과 마지막 job이 명시적으로 미충족으로 남긴 입력을 조회한다. Preview endpoint이므로 `preview=true`가 필요하며, OAuth2 제3자 앱의 scope는 `api:v3:marketplace-installation-inputs:read:get`이다.

- `inputs`는 qualified input API name을 키로 하는 현재 값의 map이다. 기본 `selection=MANUAL_ONLY`는 수동으로 충족한 값만 반환하고, `ALL`은 저장된 모든 출처의 충족 값을 반환한다.
- `explicitlyUnset`은 마지막 변경 job이 명시적으로 미충족으로 남긴 API name 목록이며 `selection`과 관계없이 반환한다. 값도 명시적 해제도 없는 optional input은 두 필드 모두에 나타나지 않는다.
- 따라서 기본 응답에 없다는 사실만으로 해제 상태를 추정하지 않는다. 전체 충족 값을 비교하려면 `ALL`을 사용하고 명시적 해제와 생략을 따로 읽는다.
- 반환 값은 최초 제출 때와 다른 지원 표현을 사용할 수 있다. Credential 값은 평문 대신 secret 이름만 노출하며 다른 installation job에 제출할 수 없다. 조회 응답 전체를 새 job의 입력으로 그대로 복사하는 방식은 피한다.

### 입력 API 이름이 없는 오류는 재시도로 해결하지 않는다

2026-10-22 공식 Get Marketplace Installation Inputs의 수집본과 검색 반환 본문에서 확인한 오류 계약이다. 직접 페이지 열기와 실제 API 호출은 확인하지 못했다.

- `InstallationInputApiNamesNotEnabled`는 제품 입력 중 API 이름이 없는 경우의 `INVALID_ARGUMENT` 오류다. 공식 페이지의 HTTP 상태는 400이며 매개변수는 `installationRids`다. 해당 제품의 input API name generation을 활성화하는 것이 명세의 해결 조건이다.
- `MarketplaceInstallationNotFound`는 `NOT_FOUND`, HTTP 404이며 매개변수는 `marketplaceInstallationRid`다. 입력 이름 설정 문제와 설치 자원을 찾지 못한 문제를 같은 재시도 대상으로 묶지 않는다.
- 운영상 추론으로, 400을 빈 `inputs` 응답으로 바꾸거나 `selection=ALL`로 반복 호출하지 않는다. 이름 생성 설정을 확인한 뒤 다시 조회한다. 이 두 오류만으로 인증과 전송 계층의 모든 실패를 설명하지는 않는다.

### 설치 전 입력 탐색과 필터의 범위

2026-10-22 공식 Discover Inputs 문서의 검색 반환 본문과 수집본을 대조했다. 직접 페이지 열기와 실제 API 호출은 확인하지 못했다.

- `POST /api/v3/platform/marketplaceInstallationJobs/discoverInputs`는 기존 설치의 목표 버전에 필요한 입력과 공급 경로를 탐색한다. `preview=true`, 각 대상의 편집 권한과 제품 입력의 API 이름이 필요하다. OAuth2 scope는 `api:v3:marketplace-installation-job:read:discover-inputs`다.
- 대상은 서로 다른 설치 1~10개이며 제품당 하나다. Namespace와 marketplace가 같아야 하고, 위치 override 적용 후 Ontology는 최대 하나여야 한다.
- `recommendations=[]`는 대상 밖 설치의 추천을 끈다. 요청 안의 대상끼리는 여전히 입력을 공급할 수 있다.
- `sourceFilter`를 생략하면 유일한 공급 경로가 `MANUAL`인 입력만 반환한다. 지정하면 `excludedSources` 중 하나라도 공급 경로에 포함된 입력을 제외한다. 공급 경로가 없는 입력은 어느 경우든 반환하지 않는다.
- 응답의 `inputs`는 필터 적용 후 결과이며 페이지 구분이 없다. 제외된 입력의 오류도 `errors`에서 빠진다. 따라서 빈 입력 map이나 오류 목록을 전체 설치의 준비 완료 증거로 사용하지 않는다.

## Override와 이름

Manual override는 default/linked product 공급을 덮는다. Unnecessary override는 현재 같은 값이라도 자동 연결을 고정하므로 후속 변경 추적에 차이가 생길 수 있다. Clean up에서 unnecessary override를 지우면 현재 값은 같지만 linked product override를 지우면 값이 달라질 수 있다.

Ontology install prefix는 display name만 또는 display/API name 모두에 적용할 수 있다. 외부 소비자의 API 이름 의존성을 확인한다. Outputs의 configuration/upstream을 검토해 실제 생성/수정 자원을 확인한다.

## 출처

- [Palantir Foundry, Discover Inputs Marketplace Installation Jobs](https://www.palantir.com/docs/foundry/api/v3/marketplace-v3-resources/marketplace-installation-jobs/discover-inputs-marketplace-installation-jobs) — 2026-10-22 검색 반환 본문과 수집본으로 대상 제약, 권한과 필터 범위 대조. 실제 호출은 미실시.
- [Palantir Foundry, Abort Marketplace Installation Job](https://www.palantir.com/docs/foundry/api/v3/marketplace-v3-resources/marketplace-installation-jobs/abort-marketplace-installation-job) — 2026-10-22 취소의 멱등성, 상태 전이, 복구 제약과 오류 계약 확인.
- [Palantir Foundry, Get Marketplace Installation Job](https://www.palantir.com/docs/foundry/api/v3/marketplace-v3-resources/marketplace-installation-jobs/get-marketplace-installation-job) — 2026-10-22 조회 권한, HTTP 200과 job 상태의 구분, NotFound의 접근성 의미 확인.
- [Palantir Foundry, Create Marketplace Installation Job](https://www.palantir.com/docs/foundry/api/v3/marketplace-v3-resources/marketplace-installation-jobs/create-marketplace-installation-job) — 2026-10-22 검색 반환 본문과 수집 명세로 RID 공유, 제출 기본값, 입력 교체와 비멱등성 대조. 직접 열기와 실제 호출은 미확인.
- [Palantir Foundry, Marketplace Installation Inputs basics](https://www.palantir.com/docs/foundry/api/v3/marketplace-v3-resources/marketplace-installation-inputs/marketplace-installation-inputs-basics) — 2026-10-21 수집본을 2026-10-22 공식 문서 검색 반환 본문과 대조.
- [Palantir Foundry, Get Marketplace Installation Inputs](https://www.palantir.com/docs/foundry/api/v3/marketplace-v3-resources/marketplace-installation-inputs/get-marketplace-installation-inputs) — 2026-10-22 검색 반환 본문에서 선택 범위, 명시적 해제, 재사용 제약과 오류 계약 확인. 오류 이름, 코드와 매개변수는 수집본도 대조했으며 직접 열기와 실제 호출은 미확인.
- [Palantir Foundry, Get Marketplace Installation](https://www.palantir.com/docs/foundry/api/v3/marketplace-v3-resources/marketplace-installations/get-marketplace-installation) — 2026-10-22 등록 자원과 목표 버전의 의미, preview와 조회 scope 확인. 현재 위치 필드와 오류 계약은 2026-10-21 수집본을 대조했으며 실시간 재조회와 실제 호출은 미확인.
- [Palantir Foundry, Create Marketplace Installation](https://www.palantir.com/docs/foundry/api/v3/marketplace-v3-resources/marketplace-installations/create-marketplace-installation) — 2026-10-22 등록과 job 실행의 구분, 버전 힌트와 비멱등성 확인. 생성 입력과 버전 형식 제약은 2026-10-21 수집본 대조이며 실시간 재조회와 실제 호출은 미확인.
- [Palantir Foundry, marketplace](https://www.palantir.com/docs/foundry/marketplace/)
- [Palantir Foundry, browse-products](https://www.palantir.com/docs/foundry/marketplace/browse-products/)
- [Palantir Foundry, getting-started](https://www.palantir.com/docs/foundry/marketplace/getting-started/)
- [Palantir Foundry, install-product](https://www.palantir.com/docs/foundry/marketplace/install-product/)
- [Palantir Foundry, overview](https://www.palantir.com/docs/foundry/marketplace/overview/)

## 관련 문서

- [[Palantir-Foundry-Marketplace]]
