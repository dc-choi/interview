---
tags: [palantir, foundry, pipeline-builder, schema, transform]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 행, 열과 스키마 변환"]
---

# Pipeline Builder 행, 열과 스키마 변환

Transform은 값 계산뿐 아니라 행 수, 열 보존과 물리 분할을 바꾼다. 변경 전후의 schema와 어떤 행이 남는지 함께 확인해야 한다. 별도 검증일을 적은 절을 제외하면 2026-10-16 공개 문서 기준이며 실제 Pipeline 실행은 검증하지 않았다.

## 열 생성과 기존 값 보존

Apply expression은 하나의 expression을, Apply multiple expressions는 expression 목록을 적용한다. Multiple expressions의 `Keep remaining columns`는 계산하지 않은 열의 보존 여부다. Select와 Drop은 각각 남길 열, 제거할 열을 명시한다.

Apply to multiple columns의 조건은 행 조건이 아닌 schema의 열 조건이다. 각 일치 열에 expression을 적용하며 `Keep matched columns`와 `Keep remaining columns`를 따로 선택한다. 새 열의 이름이 기존 일치 열과 같으면 보존 옵션을 켜도 원래 열을 덮어쓴다. 원본을 남기려면 새 이름으로 alias해야 한다.

Array elements to columns는 지정한 이름 개수만큼 배열 앞부분을 열로 만든다. 배열이 짧으면 부족한 값이 null이고, 더 길면 지정 범위 밖 값은 새 열로 만들지 않는다. 같은 이름의 기존 열은 타입이 달라도 덮어쓰는 예시가 있다. Null 배열과 배열 내부 null은 서로 다른 원본 상태이며 추출 후에도 원본 배열이 남는 예시를 확인한다.

Flatten struct는 깊이, prefix와 separator로 중첩 필드를 열로 펼치며 예시에서는 원본 struct도 남긴다. Extract many struct fields는 locator별 새 이름을 지정하고 원본 struct를 제거한다고 명시한다. 두 함수를 같은 보존 정책으로 묶지 않는다.

## 열 이름 변경은 값 변경과 다르다

Rename은 명시한 이름을, Uppercase column names는 모든 열 이름을 바꾼다. Normalize column names는 camel case 경계에 underscore를 넣고 소문자화하며 공백/하이픈을 underscore로 바꾸고 마침표를 제거한다. 연속 underscore와 앞뒤 underscore도 정리한다.

Foundry 금지 문자는 `Remove special characters`가 false여도 underscore로 바뀐다. 그 옵션은 추가 특수문자 묶음을 바꿀지 결정한다. 서로 다른 원본 이름이 같은 이름으로 정규화될 수 있으므로 결과 schema를 확인한다. 일반 normalize의 충돌 해소 정책을 Excel header 파서의 suffix 규칙과 같다고 가정하지 않는다.

## 필터와 중복의 행 수

Filter는 조건이 true인 행만 남기고 false와 null을 제거한다. Split on condition은 true/false 두 출력을 설명하지만 null의 분기 동작은 해당 공개 페이지에서 명확하지 않다. Filter의 null 정책을 그대로 적용했다고 단정하지 않는다.

Drop duplicates는 선택한 열로 동일성을 판단하고, subset이 없으면 전체 행으로 판단한다. 어떤 대표 행을 안정적으로 남기는지는 예시만으로 보장되지 않는다. 최신 행 선택이 필요하면 명시적인 정렬 기준과 Top rows 같은 계약을 사용한다.

Keep duplicates는 중복 그룹의 행들을 남기는 연산이다. 대표 하나만 남기는 dedup과 다르며, 선택 키가 null인 행들이 중복 그룹으로 남는 예시가 있다. 스트리밍의 시간 제한 dedup은 별도 상태 계약을 따른다.

## Union의 schema 선택

| 연산 | 출력 열의 범위 |
|---|---|
| Union by name | 같은 열 이름으로 이어 붙임 |
| Wide union by name | 모든 입력 열의 합집합, 없는 값은 null |
| Narrow union by name | 모든 입력에 공통인 열만 유지 |
| First union by name | 첫 입력의 열만 유지, 다른 입력에서 없는 값은 null |

Union은 행을 이어 붙이는 것이며 중복 제거를 뜻하지 않는다. First union의 입력 순서는 schema를 결정하므로 순서가 의미 있는 설정이다. 타입 충돌이나 암묵적 형 변환 정책은 해당 설명들만으로 일반화하지 않는다.

## 정렬, 선택과 물리 분할

Sort는 열별 오름차순/내림차순 목록을 사용한다. Top rows는 partition별 정렬 결과에서 기본 1행 또는 지정 개수를 고른다. 같은 정렬값의 tie-breaker를 지정하지 않으면 특정 대표 행의 재현성을 보장했다고 볼 수 없다.

Top rows 인자 설명은 최소 하나의 sort specification을 요구하지만 빈 목록의 예시도 있다. 빈 목록이 안정된 첫 행을 보장한다고 해석하지 않는다. Number of rows 0은 빈 결과 예시가 있다.

Repartition은 shuffle을 강제하고 열과 partition 수를 선택할 수 있으며 incremental build의 partition 수를 별도로 지정한다. Coalesce는 shuffle 없이 partition 수를 줄이고 더 큰 수를 요청해도 기존 수를 유지한다. 둘 다 업무 키의 유일성이나 정렬을 보장하는 기능은 아니다.

Row size는 JVM 안의 한 행 크기를 byte로 추정한다. 파일의 직렬화 크기나 네트워크 전송 크기와 같다고 단정하지 않는다. Text block은 설명을 넣을 뿐 데이터를 변환하지 않는다.

## 빈 입력의 schema와 지원 엔진

Empty table은 schema와 read mode를 갖는다. 수동 입력 테이블은 schema를 생략하면 비어 있지 않은 행으로 추론한다. 행이 없더라도 schema가 있는 테이블과 schema 자체가 없는 입력은 구분한다.

Apply, project, 이름 변경, select/drop, flatten, 수동/빈 테이블과 일반/wide union은 Batch/Faster/Streaming이다. Array 추출, 상세 struct 추출, dedup, first/narrow union, sort, top rows, repartition과 coalesce는 Batch/Faster다. Split은 Batch/Faster, Row size는 Batch다. 지원 표는 배포 환경에서 직접 시험한 결과가 아니다.

## Range로 정수 행을 생성한다

2026-10-30 공식 `Range` V1 문서 대조 기준이다. Range는 `id`라는 long 타입 열 하나를 가진 테이블을 만든다. 기존 테이블의 행을 거르는 Filter와 달리 지정한 정수 범위로 행을 생성한다. 지원 엔진은 Batch/Faster이며 Streaming은 지원 목록에 없다.

`Start`는 포함하고 `End`는 제외하며 `Step`만큼 증가시킨다. `End`는 필수이고 `Start`와 `Step`은 선택적 `Literal<Long>` 인자다. `Step`은 음수도 허용하지만 0은 허용하지 않는다. 예를 들어 `Start=2`, `End=10`, `Step=3`이면 `id` 값은 `2, 5, 8`이다.

이 페이지에는 생략한 `Start`와 `Step`의 기본값이나 범위 방향과 step 부호가 맞지 않을 때의 결과가 명시되지 않는다. 재현 가능한 입력이 필요하면 세 값을 명시하고, 경계값과 감소 범위는 실제 실행에서 확인한다. 위 예시는 공식 문서의 출력이며 이 문서 작성 중 실행한 결과는 아니다.

## Flatten V1 번역 계약

영어 V1 경로 대신 확보한 공식 중국어 AIP 미검증 번역은 Batch/Streaming과 struct expression, maximum depth, optional prefix/separator를 명시한다. 예시에서는 원본 struct를 보존하고, null struct/중간 struct/leaf를 각각 null 출력 열로 전파한다. Separator가 비어 있는 예시는 underscore를 사용하며 지정 separator는 중첩 경로 사이에 적용한다. V2 지원 엔진 목록을 V1에 소급하지 않는다.

## 출처

- [Palantir, Apply expression](https://www.palantir.com/docs/foundry/pb-functions-transform/applyExpressionV1)
- [Palantir, Apply multiple expressions](https://www.palantir.com/docs/foundry/pb-functions-transform/projectV1)
- [Palantir, Apply to multiple columns](https://www.palantir.com/docs/foundry/pb-functions-transform/projectOnConditionV1)
- [Palantir, Select columns](https://www.palantir.com/docs/foundry/pb-functions-transform/selectV1)
- [Palantir, Drop columns](https://www.palantir.com/docs/foundry/pb-functions-transform/dropV1)
- [Palantir, Array elements to columns](https://www.palantir.com/docs/foundry/pb-functions-transform/arrayToColumnsV1)
- [Palantir, Flatten struct](https://www.palantir.com/docs/foundry/pb-functions-transform/flattenStructV2)
- [Palantir, Extract many struct fields](https://www.palantir.com/docs/foundry/pb-functions-transform/getManyStructFieldsV1)
- [Palantir, Rename columns](https://www.palantir.com/docs/foundry/pb-functions-transform/renameColumnsV1)
- [Palantir, Uppercase column names](https://www.palantir.com/docs/foundry/pb-functions-transform/uppercaseColumnNamesV1)
- [Palantir, Normalize column names](https://www.palantir.com/docs/foundry/pb-functions-transform/normalizeColumnNamesV1)
- [Palantir, Filter](https://www.palantir.com/docs/foundry/pb-functions-transform/filterV1)
- [Palantir, Split on condition](https://www.palantir.com/docs/foundry/pb-functions-transform/splitOnConditionV1)
- [Palantir, Drop duplicates](https://www.palantir.com/docs/foundry/pb-functions-transform/dropDuplicatesV1)
- [Palantir, Keeps duplicates](https://www.palantir.com/docs/foundry/pb-functions-transform/keepDuplicatesV1)
- [Palantir, Union by name](https://www.palantir.com/docs/foundry/pb-functions-transform/unionByNameV1)
- [Palantir, Wide union by name](https://www.palantir.com/docs/foundry/pb-functions-transform/wideUnionByNameV1)
- [Palantir, Narrow union by name](https://www.palantir.com/docs/foundry/pb-functions-transform/narrowUnionByNameV1)
- [Palantir, First union by name](https://www.palantir.com/docs/foundry/pb-functions-transform/firstUnionByNameV1)
- [Palantir, Sort](https://www.palantir.com/docs/foundry/pb-functions-transform/sortV2)
- [Palantir, Top rows](https://www.palantir.com/docs/foundry/pb-functions-transform/topRowV2)
- [Palantir, Repartition data](https://www.palantir.com/docs/foundry/pb-functions-transform/repartitionV1)
- [Palantir, Coalesce data](https://www.palantir.com/docs/foundry/pb-functions-transform/coalesceV1)
- [Palantir, Row size](https://www.palantir.com/docs/foundry/pb-functions-transform/rowSizeV1)
- [Palantir, Text block](https://www.palantir.com/docs/foundry/pb-functions-transform/textBlockV1)
- [Palantir, Empty table](https://www.palantir.com/docs/foundry/pb-functions-transform/emptyTableV1)
- [Palantir, Manually entered table](https://www.palantir.com/docs/foundry/pb-functions-transform/manuallyEnteredTableV1)
- [Palantir, Range](https://www.palantir.com/docs/foundry/pb-functions-transform/rangeV1) — 2026-10-30 출력 열, 범위 경계, 인자와 지원 엔진 대조.

- [Palantir, flattenStructV1 (중국어 AIP 미검증 번역)](https://palantir.com/docs/zh/foundry/pb-functions-transform/flattenStructV1/)

## 관련 문서

- [[Palantir-Pipeline-Transforms|테이블과 파일 변환 지도]]
- [[Palantir-Pipeline-Streaming-State-Contracts|시간 제한 중복 제거와 CDC]]
- [[Palantir-Pipeline-Aggregation-and-Pattern-Transforms|집계와 pivot의 행 수]]
