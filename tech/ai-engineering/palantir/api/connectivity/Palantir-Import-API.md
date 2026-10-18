---
tags: [palantir, foundry, api, connectivity, import, incremental]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# File Import와 Table Import의 실행 계약

File Import는 외부 raw file을, Table Import는 schema 있는 row를 Foundry dataset으로 옮기는 batch sync다. 설정 RID와 execute가 반환하는 Build RID를 구별한다. 실행은 비동기이며 [[Palantir-Build-Job-API]]로 완료를 확인한다.

## 공통 생성, 교체와 삭제

`/api/v2/connectivity/connections/{connectionRid}/fileImports` 또는 `/tableImports`에서 POST create, GET list를 쓴다. 뒤에 import RID를 붙여 GET/PUT replace/DELETE를 호출하고 `/execute`로 실행한다.

생성의 datasetRid, importMode와 displayName은 필수다. output datasetRid와 branchName은 생성 후 바꿀 수 없다. branchName의 명세 기본은 대부분 enrollment에서 master다. replace body에는 이 불변 필드가 없으므로 대상으로 쓰는 dataset/branch를 변경하려는 목적으로 PUT을 사용하지 않는다.

scope는 file-import/table-import 각각 read/write/execute로 나뉜다. 예를 들어 실행은 `api:connectivity-file-import-execute`, 설정 변경은 `api:connectivity-file-import-write`다. Connection write나 일반 dataset write를 자동 대체 권한으로 보지 않는다.

list는 해당 사용자에게 보이는 import만 반환하며 pageToken/pageSize와 nextPageToken으로 이어서 읽는다. 삭제는 import 설정만 없애고 목적지 dataset은 삭제하지 않는다. 그 import에 의한 이후 갱신은 중단된다. execute 응답의 BuildRid 문자열은 최종 데이터 반영 성공이 아니다.

## File Import의 상태와 Filter

File importMode는 SNAPSHOT(이번 실행 파일만 새 상태), APPEND(기존+추가), UPDATE(파일명 기준 기존 교체)다. subfolder를 생략하면 외부 시스템 root에서 가져온다. filter는 나열한 순서로 적용되며 순서가 성능에 영향을 줄 수 있다.

| filter | 의미와 경계 |
|---|---|
| pathMatchesFilter / pathNotMatchesFilter | source root 기준 상대 path regex, subfolder를 지정해도 기준 동일 |
| anyPathMatchesFilter | 하나라도 regex와 맞으면 그 subfolder의 나머지 조건을 통과한 파일 전부 |
| filesCountLimitFilter | transaction당 양수 filesCount만 유지, 선택 순서 보장 없음 |
| changedSinceLastUploadFilter | 마지막 import 이후 추가/변경 파일, SIZE/LAST_MODIFIED 중 하나라도 변화 |
| lastModifiedAfterFilter | 지정 ISO timestamp 이후 수정, 생략 시 filter를 추가한 시점 |
| atLeastCountFilter | 나머지 filter 뒤 파일 수가 minFilesCount(양수) 이상일 때만 전부 import |
| fileSizeFilter | strict gt/lt bytes 범위, 하나 이상 필요 |
| customFilter | 조회는 가능하나 create/update 입력으로 미지원 |

changedSinceLastUploadFilter에 criteria가 없으면 새 파일만 읽는다. 이전 importMode와 무관하게 이미 올린 파일을 제외하며 **SNAPSHOT으로 실행해도 filter state가 초기화되지 않는다.** dataset snapshot과 수집 cursor reset을 혼동하면 재수집이 누락될 수 있다.

fileSizeFilter의 gt는 음수 불가, lt는 최소 1 byte이며 두 값이 있으면 `gt < lt - 1`이어야 한다. 모두 exclusive라 인접한 경계는 만족하는 정수 byte 크기가 없다. 값은 long format 문자열이다.

Filter 각각의 범위/최소개수 오류와 FileImportNotSupportedForConnection, ConnectionDetailsNotDetermined, dataset/import 존재/권한 오류를 구분한다. 응답에서 읽은 customFilter를 그대로 replace 요청에 넣으면 지원 오류다.

## Table Import의 Query와 Incremental State

Table importMode는 SNAPSHOT/APPEND만 지원한다. file의 UPDATE를 그대로 보내지 않는다. allowSchemaChanges 기본 false이며 true일 때 기존 dataset과 schema가 달라도 import 성공을 허용한다.

config는 Databricks/JDBC/Microsoft SQL Server/PostgreSQL/Microsoft Access/Snowflake/Oracle import union이다. 각 config는 필수 query와 optional initialIncrementalState를 받는다. sync당 한 SQL query가 data table을 출력해야 하며 stored procedure 호출 같은 작업을 피하도록 설명한다. 실제 Connection이 그 import config를 지원하는지도 확인한다.

incremental은 timestamp/ID처럼 단조 증가하는 column과 초기값을 지정한다. 다음 실행은 이전 최대값보다 **큰** 값의 row를 읽는 계약이다. SQL에서 `?`로 현재 incremental state를 참조해 WHERE 등에 사용한다. equal timestamp로 늦게 도착한 row나 과거값 update까지 일반 CDC처럼 잡아준다고 확대하지 않는다. 이 한계는 strict greater-than 조건에서 도출한 설계 주의점이다.

initialIncrementalState는 string/date/integer/timestamp/long/decimal union이며 각각 columnName/currentValue가 필요하다. integer는 숫자, long/decimal은 문자열, date는 local date, timestamp는 UTC timestamp 형식이다. 초기값을 모든 type에 문자열 하나로 강제하지 않는다.

TableImportTypeNotSupported는 API 미지원, TableImportNotSupportedForConnection은 해당 Connection과 config 불일치다. 연결 상세를 결정하지 못하는 내부 오류와 import 자체 권한/존재 오류도 따로 처리한다. generic retry만으로 입력 오류가 해결되지는 않는다.

공개 endpoint와 schema 검토이며 실제 import, cursor 이동, schema 변경이나 외부 DB query를 실행하지 않았다.

## 출처

- [Palantir, Create File Import](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/file-imports/create-file-import)
- [Palantir, Replace File Import](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/file-imports/replace-file-import)
- [Palantir, Execute File Import](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/file-imports/execute-file-import)
- [Palantir, List File Imports](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/file-imports/list-file-imports)
- [Palantir, Delete File Import](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/file-imports/delete-file-import)
- [Palantir, Create Table Import](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/table-imports/create-table-import)
- [Palantir, Replace Table Import](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/table-imports/replace-table-import)
- [Palantir, Execute Table Import](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/table-imports/execute-table-import)
- [Palantir, List Table Imports](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/table-imports/list-table-imports)
- [Palantir, Delete Table Import](https://www.palantir.com/docs/foundry/api/connectivity-v2-resources/table-imports/delete-table-import)
