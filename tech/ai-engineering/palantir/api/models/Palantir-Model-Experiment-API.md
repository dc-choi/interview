---
tags: [palantir, foundry, api, model, experiment]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Experiment Metadata와 원시 Metric을 구별한다

Experiment는 부모 Model에 속해 학습 실행의 parameter, metric과 artifact를 추적한다. API는 metadata/집계와 원시 series/table을 별도로 제공한다. 아래 endpoint는 모두 Preview와 `api:models-read` scope를 요구한다.

## Experiment 정보

`GET /api/v2/models/{modelRid}/experiments/{experimentRid}`는 source, branch, status/statusMessage, parameters, series metadata, summaryMetrics, artifacts, tags, optional linkedModelVersion/jobRid를 반환한다. source는 Code Workspace(container와 optional deployment RID), authoring repository 또는 SDK다. status는 RUNNING/SUCCEEDED/FAILED다.

parameter value는 datetime/boolean/string/double/integer union이다. 여기의 integer value는 long-format 문자열이므로 일반 32-bit integer로 강제하지 않는다. series metadata는 name, optional length와 numeric min/max/last 집계다. summary metric에서 유도된 경우 length가 없을 수 있고 아직 계산하지 않은 min/max/last도 빠질 수 있다. 누락을 0이나 빈 시계열로 바꾸지 않는다.

artifacts map은 이름, optional description, sizeBytes와 table rowCount 같은 details를 담는다. 크기/rowCount는 long 문자열이며 예제 숫자만 보고 구현하지 않는다. linkedModelVersion은 별도 RID로 추적한다.

## 검색은 이름과 값 조건을 같은 항목에 결합한다

`POST /models/{modelRid}/experiments/search`는 optional where, orderBy, pageSize/pageToken을 body로 받는다. where 생략 시 해당 Model의 모든 experiment가 대상이다. 기본 pageSize 50, 최대 100이며 nextPageToken으로 계속 읽는다. 기본 정렬은 relevance이고 명시 정렬은 EXPERIMENT_NAME/CREATED_TIME과 ASC/DESC다.

and/or/not과 eq/contains/startsWith를 조합한다. equality는 STATUS/BRANCH/EXPERIMENT_NAME/RID/JOB_RID/TAG/PARAMETER_NAME/SERIES_NAME, substring/prefix는 experiment/parameter/series 이름을 대상으로 한다. parameter 이름과 값 조건을 독립 predicate로만 나열하면 서로 다른 parameter에 매칭될 위험이 있어 atomic filter를 사용한다.

- parameterFilter는 정확한 parameterName과 값 비교를 같은 parameter에 결합한다. EQ는 boolean/double/integer/datetime, GT/LT는 double/integer/datetime, CONTAINS는 string에 지원된다.
- seriesFilter는 같은 seriesName의 LENGTH/AGGREGATION_MIN/MAX/LAST를 EQ/GT/LT로 비교한다.
- summaryMetricFilter는 같은 seriesName과 MIN/MAX/LAST 집계를 값 비교에 결합한다.

지원하지 않는 operator/type 조합이나 status, malformed filter는 InvalidExperimentSearchFilter다. metadata search와 artifact row filter를 같은 기능으로 해석하지 않는다.

## Series JSON과 Parquet

`GET /models/{modelRid}/experiments/{experimentRid}/series/{experimentSeriesName}/json`은 원시 metric 값을 반환한다. pageSize 기본 200/최대 1,000, offset 기본 0이다. pageToken 방식과 다르다.

현재 series union은 doubleV1이며 각 값에 value, timestamp와 step이 있다. timestamp는 Unix epoch 기준 **밀리초** long 문자열이다. step도 long 문자열이다. metric value와 sampling timestamp/step을 분리해 읽는다.

같은 경로의 `/parquet`은 원시 series를 Parquet binary stream으로 준다. JSON endpoint의 offset/pageSize를 Parquet에도 있다고 가정하지 않는다. ExperimentSeriesNotFound, 접근 불가를 포함할 수 있는 ModelExperimentNotFound와 endpoint permission 오류를 처리한다.

## Table Artifact JSON과 Parquet

`GET /models/{modelRid}/experiments/{experimentRid}/artifactTables/{experimentArtifactTableName}/json`은 binary stream 안에 row object의 JSON 배열을 반환한다. 각 row는 column name→value다. pageSize 기본 10/최대 100, offset 기본 0이다. binary 응답이라고 파일 내용을 JSON이 아니라고 판단하지 않는다.

같은 경로의 `/parquet`은 raw table을 Parquet로 반환한다. missing artifact와 missing/inaccessible experiment를 구분하며 metadata에서 artifact를 발견한 사실을 내용 다운로드 완료로 기록하지 않는다.

공개 명세 검토이며 실제 experiment/series/artifact를 읽거나 metric 통계의 정확성을 실행 검증하지 않았다.

## 출처

- [Palantir, Get Experiment](https://www.palantir.com/docs/foundry/api/models-v2-resources/experiments/get-experiment)
- [Palantir, Search Experiments](https://www.palantir.com/docs/foundry/api/models-v2-resources/experiments/search-experiments)
- [Palantir, JSON Experiment Series](https://www.palantir.com/docs/foundry/api/models-v2-resources/experiment-series-list/json-experiment-series)
- [Palantir, Parquet Experiment Series](https://www.palantir.com/docs/foundry/api/models-v2-resources/experiment-series-list/parquet-experiment-series)
- [Palantir, JSON Experiment Artifact Table](https://www.palantir.com/docs/foundry/api/models-v2-resources/artifact-tables/json-experiment-artifact-table)
- [Palantir, Parquet Experiment Artifact Table](https://www.palantir.com/docs/foundry/api/models-v2-resources/artifact-tables/parquet-experiment-artifact-table)
