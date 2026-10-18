---
tags: [palantir, foundry, api, dataset, view, primary-key, security]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 Dataset View API"]
---

# View의 backing dataset, primary key와 marking

View는 자체 데이터 파일을 보유하지 않고 backing dataset들의 union으로 읽힌다. primary key를 추가해 중복을 해소할 수 있으며 backing 데이터 변경 때 최신 결과를 반영하도록 build가 trigger된다. 이 build는 데이터 파일을 읽거나 쓰는 materialization과는 다르다.

View는 schema가 있는 dataset을 대상으로 하며 Transform input으로 사용할 수 있지만 output으로 쓰지는 못한다. 일반 dataset과 비슷하게 쓸 수 있다는 설명을 모든 Dataset endpoint의 View 지원 보장으로 확대하지 않는다.

## 생성/조회와 backing 목록 변경

공통 prefix는 `/api/v2/datasets/views`다. create는 parentFolderRid/viewName과 선택적 backingDatasets/branch/primaryKey를 받고, get은 viewDatasetRid와 선택적 branch로 metadata를 조회한다.

| 작업 | Method와 나머지 경로 | 목록 처리 |
|---|---|---|
| 생성 | POST prefix | 초기 backing 목록 |
| 조회 | GET `/{viewDatasetRid}` | 현재 metadata |
| 추가 | POST `/{viewDatasetRid}/addBackingDatasets` | 같은 dataset RID와 branch의 중복은 무시 |
| 제거 | POST `/{viewDatasetRid}/removeBackingDatasets` | 지정 backing이 없어도 오류 없음 |
| 교체 | PUT `/{viewDatasetRid}/replaceBackingDatasets` | 전체 backing 목록 교체 |
| PK 추가 | POST `/{viewDatasetRid}/addPrimaryKey` | 아직 PK가 없는 View에만 추가 |

각 backing은 datasetRid, 선택적 branch와 stopPropagatingMarkingIds를 가진다. backing branch를 생략하면 View branch를 따른다. backing을 제거하거나 교체 중 일부를 제거하면 다음 View update 때 SNAPSHOT transaction이 생긴다. 이를 단순 append 변화로만 다루는 downstream 증분 계산은 재검토해야 한다.

backing dataset은 View의 Project에 있어야 한다. 아니면 Project resource reference로 추가하거나 같은 Project로 옮기는 절차를 안내한다. InputBackingDatasetNotInOutputViewProject가 있으면 단순 read 권한만 추가해 해결된다고 가정하지 않는다.

## Marking 제거는 backing마다 인가를 확인한다

stopPropagatingMarkingIds의 각 marking에 caller의 DECLASSIFY 권한이 필요하다. 같은 marking이 여러 backing dataset에 적용되면 각 backing에 제거할 ID를 지정하지 않는 한 계속 상속된다. 한 입력에서만 표시를 제거한 것으로 View 전체가 낮은 보안이 된다고 판단하지 않는다.

쓰기 endpoint는 `api:datasets-write`를 명시한다. Get View의 schema에는 scope 목록이 비어 있지만 이것만으로 익명/무권한 접근이 허용된다고 해석하지 않는다. ViewNotFound는 부재, 잘못된 branch나 token 접근 불가일 수 있다.

## Primary key는 writer가 지킬 계약이다

PK column 목록은 비어 있으면 안 되고 정규화 후 중복이 없어야 하며 모두 schema에 있어야 한다. 지원 타입은 BYTE/SHORT/DECIMAL/INTEGER/LONG/STRING/BOOLEAN/TIMESTAMP/DATE다. backing dataset이 없는 View에는 PK를 추가할 수 없다.

resolution은 unique 또는 duplicate다. unique는 creator/writer가 같은 PK의 중복이 없음을 보장하는 계약이며 reader가 이 가정으로 최적화할 수 있다. 위반하면 undefined behavior가 될 수 있다. DB unique constraint처럼 잘못된 모든 쓰기를 자동 거부하는 기능이라고 해석하지 않는다.

duplicate resolution은 latestWins 전략을 제공한다. 지정 column 목록을 순서대로 비교해 가장 큰 값을 가진 row를 선택한다. 이를 별도 설정 없이 publish 시각이나 도착 순서의 last-write-wins로 취급하지 않는다.

선택한 최종 row의 boolean deletionColumn이 true이면 결과에서 제외한다. 과거 row 하나에 삭제 표시가 있다는 이유로 어떤 최신 row도 무조건 삭제되는 규칙은 아니다. 삭제 column은 schema에 있어야 하며 boolean이어야 한다.

Add Primary Key는 기존 PK가 있으면 ViewPrimaryKeyCannotBeModified conflict다. create 예제의 primaryKey는 columns만 보여 주지만 field schema의 resolution은 필수로 표시되어 있어 예제만으로 생략 가능성을 확정하지 않는다. 실제 SDK/서버 입력 계약을 확인한다.

## 실패 후의 자원 상태

InvalidViewBackingDataset은 backing 부재/접근 불가를 포함한다. PK column 누락/미지원 type, 삭제 column 부재/잘못된 type과 DECLASSIFY 거부는 서로 다른 문제다.

Create View 실패 후 backing dataset cleanup도 실패하면 ViewDatasetCleanupFailed가 발생할 수 있다. 생성 요청 실패를 아무 자원도 남지 않았다는 보장으로 다루지 않고 오류의 viewDatasetRid로 상태를 확인한다. 공통 오류 처리는 [[Palantir-API-Client-Contract]]를 따른다.

공식 일곱 endpoint와 기본 설명을 대조했으며 실제 View 생성, 중복 해소, marking 변경과 실패 후 정리를 시험하지 않았다.

## 출처

- [Palantir, View basics](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/views/view-basics)
- [Palantir, Create View](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/views/create-view)
- [Palantir, Get View](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/views/get-view)
- [Palantir, Add Backing Datasets](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/views/add-backing-datasets)
- [Palantir, Remove Backing Datasets](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/views/remove-backing-datasets)
- [Palantir, Replace Backing Datasets](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/views/replace-backing-datasets)
- [Palantir, Add Primary Key](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/views/add-primary-key)

## 관련 문서

- [[Palantir-Data-APIs]]
- [[Palantir-Dataset-V2-API]]
- [[Palantir-Python-Incremental-Contract]]
- [[Palantir-Security-and-Governance]]
