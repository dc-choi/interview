---
tags: [palantir, dataset-preview, csv, time-travel]
status: done
verified_at: 2026-11-26
category: "AI엔지니어링(AIEngineering)"
aliases: ["Dataset Preview와 parsing"]
---

# Dataset Preview와 parsing

Dataset Preview는 selected branch의 data sample과 metadata/history/schema/files/job spec/health를 함께 보는 앱이다. Preview의 기본 sample을 전체 dataset으로 읽지 않는다. Filter/sort는 일반 dataset 전체에 적용되지만 결과 preview에도 row 수 제한이 남는다. Table이 보여 준 행 수를 분석 모집단 크기로 사용하지 않는다.

## 화면 구성과 어디서 무엇을 확인하나

| 영역 | 확인할 것 |
|---|---|
| Header | 이름, display name, 위치, 선택한 branch. 공유, 이동, 이름 변경 같은 file 작업 |
| Information panel의 About | 생성과 갱신 시각과 사용자, table 크기, 생성에 쓰인 tool과 input dataset, tag |
| Information panel의 Columns | column type, 설명, null 비율과 분포, sample 값 |
| Information panel의 Schedules | 이 dataset을 갱신하는 build schedule |
| Details | schema 편집, file 목록과 download, job spec, sync 상태, custom metadata, disk와 Spark resource usage, stream의 last run details |
| Actions | All actions dropdown의 분석, 탐색, 변환, 관리 tool과 menu 밖에 노출된 Analyze(Contour), Build |

About의 Edit schema는 CSV와 JSON에만 schema를 추론하고 jagged row drop, encoding, file path, row byte offset, import timestamp, row number column 추가 같은 parsing option을 준다. 다른 file type은 Details의 Schema에서 고친다. Furnace SQL output은 job spec에 여러 SQL definition을 남길 수 있다. Active definition은 다음 rebuild(schedule 또는 수동)에 실행될 SQL이고 active를 바꿔도 즉시 실행되지 않으므로, rebuild 전에는 현재 data를 만든 definition과 다를 수 있다. Custom metadata로 더한 field는 information panel에 보이므로 소유자, 용도 같은 운영 정보를 dataset 곁에 둘 수 있다.

Preview table의 column menu는 sort, filter, chart를 만들고, cell 선택으로 그 값만 포함하거나 제외할 수 있다. Column 단위로 issue를 보고하고 조회할 수 있어 data 품질 문제를 그 column에 붙여 남긴다.

## Stream과 archive의 관측 범위

Streaming preview는 최근 row의 작은 sample이며 Live updates로 바뀐다. Sorting/filter/chart는 Archive에서만 사용하고 archive 상태를 나타낸다. History/Health/Compare도 Archive에서 보이며 Health 결과는 live stream 자체가 아니라 archive dataset의 검사다. Live job/metric은 Stream/Metrics와 troubleshooting view로 조사한다. Metrics tab은 권장 debugging metric을 표시한 dropdown과 threshold, 경고 표시가 있는 chart를 주고, 상단 toggle의 Troubleshoot and Debug mode는 stream 중단을 단계별로 따라가게 하고, 오른쪽 panel의 metric tag를 선택하면 해당 chart가 강조된다.

History에서 삭제되지 않은 과거 transaction에 branch를 만들 수 있다. Details의 schema/files/job spec/source provenance/sync/resource usage를 함께 확인한다. Compare는 별도 dataset/과거 transaction/다른 branch를 비교할 수 있지만 preview 화면만으로 merge의 모든 runtime 영향이 검증되지는 않는다.

Manual upload는 CSV/TSV/XLS/XLSM/XLSX를 지원한다. CSV/TSV에서 같은 filename/schema는 기존 data UPDATE, 다른 filename은 APPEND 경로가 될 수 있으므로 append가 기존 file overwrite와 같은 의미가 아님을 확인한다.

## CSV schema는 parsing 계약을 포함한다

Inference는 제안이며 delimiter/quote/escape/encoding/header/type를 확인한다. TextDataFrameReader는 Spark CSV reader에 위임하며 CSV_PARSER/MULTILINE_CSV_PARSER/SIMPLE_PARSER/SINGLE_COLUMN_PARSER 등 parser별 option 지원이 다르다.

| Option | 의미 |
|---|---|
| nullValues | null로 읽을 문자열 목록 |
| fieldDelimiter/quoteCharacter | 한 문자 구분/quote |
| recordDelimiter | newline으로 끝나는 record separator |
| dateFormat | column별 JodaTime pattern |
| skipLines | file마다 건너뛰는 초기 line 수 |
| jaggedRowBehavior | column 수 불일치 시 throw 또는 drop row |
| parseErrorBehavior | type parsing 실패 시 throw 또는 replace null |
| addFilePath/addImportedAt | row provenance metadata 추가 |
| initialReadTimeout | 첫 row 읽기 대기 상한, 기본 1시간 |

Drop row와 replace null은 실패를 가리는 대신 data를 잃거나 값 의미를 바꿀 수 있다. Parsed output과 reject/null 수를 확인한다. DataSourceDataFrameReader의 format=csv/options 경로는 Spark CSV option을 직접 설정하는 대안이며 이 옵션들을 TextDataFrameReader field와 섞지 않는다.

Nested quote/embedded newline 때문에 inference가 실패하면 column/quote 정의를 저장한 뒤 DataSource reader의 header/multiLine을 설정하는 경로가 있다. Save without validating은 valid data를 보장하는 우회가 아니라 별도 검증이 필요한 schema 작성 단계다.

여러 CSV의 뒤쪽에만 column이 추가된 경우 explicit schema/order와 PERMISSIVE로 trailing missing value를 null로 읽을 수 있다. `{a}`, `{a,b}`처럼 같은 prefix여야 하며 `{b,a}`, 중간 column 누락과 reorder를 name 기반으로 합치는 mergeSchema가 아니다. 임의 schema union은 custom transform으로 처리한다. Excel에서 압축된 한 column처럼 보이면 export 실패 전에 지역 delimiter 설정도 확인한다.

## SQL console과 Time Travel

Embedded SQL console은 현재 resource의 quick query, autocomplete/result/worksheet 저장을 제공하며 full-screen SQL Studio로 확장할 수 있다. Ontology Manager만 Furnace Data mode와 Ontology SQL Object mode를 전환하고 Dataset Preview/Data Lineage는 Data mode다. SQL/download role은 별도 적용된다.

Beta Time Travel은 committed dataset transaction 또는 Iceberg snapshot timeline에서 Single version/Range를 제공한다. Stable unique key가 있으면 row modification을 매칭하고 없으면 remove+add로 보일 수 있다. Refine query는 version reference를 바꿔 같은 query를 timeline에 적용한다.

Bisect는 key와 column/target value로 추가/삭제/값 변경 시점을 찾지만 현재 page에 로드한 version만 검색한다. Retention으로 data가 제거된 version도 볼 수 없다. 검색된 첫 변화가 전체 원본 역사상 최초라는 결론은 coverage를 확인한 뒤 내린다.

## 출처

- [Palantir, Dataset Preview](https://www.palantir.com/docs/foundry/dataset-preview)
- [Palantir, CSV parsing](https://www.palantir.com/docs/foundry/dataset-preview/csv-parsing)
- [Palantir, Dataset Preview FAQ](https://www.palantir.com/docs/foundry/dataset-preview/dataset-preview-faq)
- [Palantir, SQL console](https://www.palantir.com/docs/foundry/dataset-preview/sql-console)
- [Palantir, Time Travel (Beta)](https://www.palantir.com/docs/foundry/dataset-preview/time-travel)
- [Palantir, SQL definitions](https://www.palantir.com/docs/foundry/sql-warehousing/sql-definitions/)

## 관련 문서

- [[Palantir-Lineage-Aware-Deletion-Policies|Retention과 가용 history]]
- [[Palantir-Health-Check-Evaluation-and-Freshness|Archive health의 시점]]
- [[Palantir-SQL-Execution-and-Worksheets|SQL 실행과 worksheet]]
- [[Palantir-SQL-Writes-History-and-Active-Definitions|SQL 쓰기 이력과 active definition]]
