---
tags: [palantir, sync, incremental, media]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Sync의 상태와 파일 수집 모드

Batch sync는 외부 데이터를 dataset에 기록하며, streaming sync는 지속적으로 읽어 stream에 기록한다. Source 연결 설정과 실제 sync 실행은 별도다. 기존 dataset을 대상으로 지정하면 이전 데이터가 덮어써질 수 있다.

## Batch 설정과 검증

Batch output은 Source와 같은 Project에 두어 접근 경계를 맞추는 구성이 권장된다. SNAPSHOT은 이전 view를 대체하고 APPEND는 새 데이터를 추가한다. Table sync의 schema 변경은 기본적으로 허용하지 않는다. Timezone 없는 timestamp는 기본 String이며, timezone을 명시한 Timestamp나 Long으로 가져오는 옵션이 있다.

Table preview는 처음 20행에 한정된다. File preview의 `Exclude files already synced` 필터는 실제 실행 때 적용되므로 preview와 결과가 다를 수 있다. Source 탐색에 stored procedure가 표시되지 않아도 SQL query에서 EXEC로 호출할 수 있다는 안내가 있으므로 SQL 권한을 읽기 전용으로 가정하지 않는다.

같은 sync를 Data Connection과 Data Lineage 양쪽에서 중복 scheduling하지 않는다. Data Lineage의 sync schedule에는 Force build를 사용하라는 공식 안내가 있다. Foundry worker sync는 약 48시간을 넘으면 자동 취소되며 별도 maximum duration으로 더 짧게 제한할 수 있다.

## 파일 모드 조합

| 모드 | Transaction과 필터 | 실제 의미 |
| --- | --- | --- |
| 전체 mirror | SNAPSHOT, 이미 수집한 파일 제외 없음 | 매번 현재 대상 파일 전체로 view 교체 |
| 추가 전용 mirror | APPEND + 이미 수집한 파일 제외 | 경로 기준 처음 본 파일을 축적 |
| 변경 파일 mirror | UPDATE + 이미 수집한 파일 제외 + 수정시각/크기 비교 | 새 파일과 변경된 경로를 갱신, downstream append-only 증분 실행 불가 |
| 최근 수집 창 | SNAPSHOT + 이미 수집한 파일 제외 | 이번 실행에서 처음 가져온 파일만 view에 남음 |

APPEND에 수정시각/크기 변경 재수집을 섞으면 같은 경로를 다시 추가하려는 문제가 생긴다. UPDATE는 삭제된 원천 파일까지 자동 제거하는 전체 mirror 보장이 아니다. 문서는 실행 때 한 번이라도 존재했던 파일의 최신 버전을 축적하는 방식으로 설명한다.

파일 수 제한은 선택 순서가 비결정적일 수 있다. SNAPSHOT 전체 mirror에 적용하면 일부만 남고, 최근 수집 창에 적용하면 backlog가 쌓여 최신성 의미가 깨진다. `At least N files`가 충족되지 않으면 빈 transaction이 될 수 있다. 이 세 필터는 모드와 함께 검토한다.

## 실패와 삭제

File batch sync는 실행 중 하나라도 실패하면 그 실행의 전체 transaction을 abort한다. 백만 파일 중 마지막 파일에서 실패해도 앞선 파일이 commit되지 않는다. APPEND와 파일 수 제한으로 실행 단위를 줄이면 재작업 범위를 줄일 수 있다.

`Exclude files already synced`는 매번 전체 파일을 scan하므로 대규모에서 느릴 수 있다. 지원되는 S3/GCS의 `Modified since last sync`는 더 가벼운 대안이지만 원천 timestamp 갱신과 시계의 정확성에 의존한다. S3-compatible 시스템은 이를 별도로 확인한다.

Completion strategy는 legacy이며 기존 설정은 읽기 전용이고 새 sync에는 설정할 수 없다. 성공 후 원천 삭제는 best effort다. Commit 후 agent가 죽거나 쓰기 권한이 없으면 삭제가 실패하고 자동 재시도가 보장되지 않는다. 권장 대안은 commit된 output을 입력으로 받는 downstream external transform에서 삭제를 재시도하는 방식이다. 이 경우에도 원천 파일이 그 사이 바뀌는 상황과 삭제 권한을 검토한다.

수집 중 gzip, concatenate, rename, timestamp 이름 추가 같은 transformer를 쓸 수 있지만 provenance와 branch를 위해 Foundry downstream 변환을 권고한다. PGP decrypt는 agent의 key가 필요하며 Foundry worker에서는 제공하지 않는다.

## Streaming과 media

Streaming throughput 설정은 partition 수에 영향을 준다. Setup 문서는 Normal을 최대 5MB/s로 설명한다. Agent worker는 host에서 연산하므로 Foundry compute profile 설정을 제공하지 않는다. Schema 추론을 덮어쓸 수 있지만 실제 message와 호환성은 검증해야 한다.

Media sync 문서의 명시적 지원 Source는 S3와 OneLake/ABFS다. 미지원 파일 Source는 dataset으로 수집한 뒤 Python으로 media set에 쓸 수 있다. Virtual media set은 원천에서 직접 읽으며 파일을 Foundry backing store로 복사하지 않는다. 파일 형식, 경로, 크기, 이미 수집한 파일과 schema 불일치 필터를 선택하고 schedule을 별도로 설정한다.

## 출처

- [Palantir, Set up a batch sync](https://www.palantir.com/docs/foundry/data-connection/set-up-sync)
- [Palantir, File-based syncs](https://www.palantir.com/docs/foundry/data-connection/file-based-syncs)
- [Palantir, Set up a streaming sync](https://www.palantir.com/docs/foundry/data-connection/set-up-streaming-sync)
- [Palantir, Media set syncs](https://www.palantir.com/docs/foundry/data-connection/media-set-sync)

## 관련 문서

- [[Palantir-Export-State-and-Governance|외부 export의 상태와 재실행]]
- [[Palantir-External-Transforms-Governance|외부 transform]]
- [[Palantir-Data-Connectivity|데이터 연결]]

공식 동작 설명을 학습했다. 수집 실패, 재시도와 원천 삭제를 실제로 실행하지 않았다.
