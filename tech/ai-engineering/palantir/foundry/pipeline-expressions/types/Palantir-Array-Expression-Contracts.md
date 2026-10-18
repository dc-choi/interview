---
tags: [palantir, pipeline-builder, arrays, "null"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 배열 표현식의 위치, 결측과 행 수

배열 자체가 null인 상태, 빈 배열과 null 원소가 있는 배열은 다르다. 공식 함수 레퍼런스의 계약을 정리했으며 실제 Pipeline 실행은 검증하지 않았다.

## 위치와 경계

`arrayElementV1`, `arrayPositionV1`, `arrayAddV1`과 배열 변환의 `elementIndex`는 1부터 시작한다. 조회에서 -1은 마지막 원소이고 0이나 범위 밖은 null이다. position 함수는 첫 일치 위치를 Long으로 반환하며, 찾지 못하거나 검색 값이 null이면 null이다. contains 함수와 null 검색 계약이 다르다.

`arrayAddV1`은 범위보다 먼 위치에 넣을 때 간격을 null로 채운다. 음수 위치도 뒤에서 세며 원래 배열보다 앞으로 넘어가면 null이 추가되는 예제가 있다. null index는 ANSI mode on에서 null, off에서 원본 배열을 유지한다.

`arraySliceV1`의 두 번째 숫자는 종료 위치가 아니라 길이다. 음수 시작 위치 예제가 있지만 설명 첫 문장은 시작을 1 이상으로 제한한다. 시작 0은 인자 설명에서 오류라고 하고 예제는 null이다. 예제와 설명이 불일치하므로 유효한 시작과 음수가 아닌 길이를 먼저 검증하고 실제 실패 방식을 확인한다.

출처: [Element](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayElementV1), [Position](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayPositionV1), [Add](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayAddV1), [Slice](https://www.palantir.com/docs/foundry/pb-functions-expression/arraySliceV1)

## 결합과 집합 연산

| 연산 | 중복과 null 계약 |
| --- | --- |
| `arrayConcatV1` | 중복을 보존한다. null 배열이 섞이면 ANSI on에서 null, off에서 해당 배열을 건너뛰며 모두 null이면 빈 배열이다. |
| `arrayUnionV1` | 중복을 제거한다. null 배열을 건너뛰며 모두 null이면 빈 배열인 예제가 있다. |
| `arrayIntersectV1` | 중복을 제거한다. null 배열이 섞이면 빈 배열인 예제가 있다. |
| `arrayDifferenceV1` | 왼쪽에서 오른쪽에 없는 고유 원소를 남긴다. 오른쪽 null은 왼쪽을 남기고 왼쪽 null은 null이다. |
| `arrayDistinctV1` | 배열 내부 중복을 제거하며 null 배열은 null이다. |
| `arrayFlattenV2` | 중첩을 한 단계만 펼친다. null 하위 배열은 ANSI on에서 전체 null, off에서 건너뛴다. 하위 배열 내부의 null 원소는 남는다. |

집합 함수 예제의 출력 순서를 일반적인 정렬 보장으로 사용하지 않는다. 순서가 필요한 소비자는 명시적으로 정렬해야 한다.

출처: [Concat](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayConcatV1), [Union](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayUnionV1), [Intersect](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayIntersectV1), [Difference](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayDifferenceV1), [Distinct](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayDistinctV1), [Flatten](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayFlattenV2)

## 검사와 삭제

`arrayContainsV1`은 배열에 null 원소가 있으면 null 검색에 true를 반환한다. null 배열에서는 false이다. 숫자 타입 간 비교를 허용하지만 1.2를 1로 반올림해서 같게 보지는 않는다. `arrayContainsNullV1`은 null 배열 자체를 null 원소가 있는 배열로 보지 않고 false로 반환한다.

`isArrayUniqueV1`은 여러 null 원소를 중복으로 취급한다. 빈 배열은 true, null 배열은 ANSI on에서 null/off에서 false이다. 중첩 배열의 순서가 다르면 다른 원소인 예제가 있다. `arraysHaveIntersectionV1`은 공유 원소를 검사하며 null 배열 예제는 false이다.

`arrayRemoveV1`은 대상 값의 모든 출현을 제거한다. null을 제거할 때는 ANSI on에서 전체 null, off에서는 null 원소를 제거한다. `allArrayElementsSatisfyV1`과 `anyArrayElementSatisfyV1`은 각 원소에 조건을 적용하며 null 배열은 null이다. 비어 있는 배열이나 조건 결과가 null인 모든 경우의 진리표를 제공한다고 확대 해석하지 않는다.

출처: [Contains](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayContainsV1), [Contains null](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayContainsNullV1), [Unique](https://www.palantir.com/docs/foundry/pb-functions-expression/isArrayUniqueV1), [Has intersection](https://www.palantir.com/docs/foundry/pb-functions-expression/arraysHaveIntersectionV1), [Remove](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayRemoveV1), [All satisfy](https://www.palantir.com/docs/foundry/pb-functions-expression/allArrayElementsSatisfyV1), [Any satisfy](https://www.palantir.com/docs/foundry/pb-functions-expression/anyArrayElementSatisfyV1)

## 변환, 정렬과 축약

`transformArrayElementV1`과 `filterArrayElementV1`은 원소와 1-based index, 바깥 행의 값을 참조할 수 있다. filter는 true인 원소를 남긴다. `reduceArrayElementsV1`은 accumulator와 초기값을 사용하며 빈 배열은 초기값, null 배열은 null이다. 지원 타입 선언이 AnyType이 아니므로 Decimal이나 Struct를 무조건 넣을 수 있다고 가정하지 않는다.

`arraySortV1`은 오름차순에서 null을 앞에, 내림차순에서 뒤에 둔다. `arraySortByKeyV2`는 중첩 Struct 필드와 여러 우선순위를 지정할 수 있다. 동률의 안정적 순서까지 보장한다는 설명은 없다. `arrayMaxV1`과 `arrayMinV1`은 ComparableType에 적용하며 null 원소를 건너뛰고 빈 배열과 null 배열에서는 null이다. `arraySumV1`의 null 원소 처리는 Treat null as zero 옵션으로 정한다.

출처: [Transform](https://www.palantir.com/docs/foundry/pb-functions-expression/transformArrayElementV1), [Filter](https://www.palantir.com/docs/foundry/pb-functions-expression/filterArrayElementV1), [Reduce](https://www.palantir.com/docs/foundry/pb-functions-expression/reduceArrayElementsV1), [Sort](https://www.palantir.com/docs/foundry/pb-functions-expression/arraySortV1), [Sort by key](https://www.palantir.com/docs/foundry/pb-functions-expression/arraySortByKeyV2), [Maximum](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayMaxV1), [Minimum](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayMinV1), [Sum](https://www.palantir.com/docs/foundry/pb-functions-expression/arraySumV1)

## 행 수와 배열 길이가 바뀌는 연산

`explodeArrayV1`과 위치를 포함하는 `explodeArrayWithPositionV2`는 원소마다 행을 만든다. Keep empty / null arrays 옵션으로 빈 배열과 null 배열을 null 출력 행으로 남길 수 있다. 위치 포함 함수의 위치도 1부터 시작하며 보존된 빈 행의 위치는 null이다.

`arraysZipV1`은 가장 긴 배열 길이를 기준으로 모자란 위치를 null로 채운다. ANSI on에서 null 배열이 섞이면 전체 null이며 off에서는 해당 필드가 null로 채워진다. `arraysCartesianProductV1`은 위치를 맞추는 대신 조합을 만든다. 입력 길이의 곱만큼 결과가 커질 수 있으므로 큰 배열을 합치기 전에 크기를 제한한다. null 배열이 포함된 예제는 빈 배열이다.

`mapFromArraysV1`은 두 배열 길이가 다르면 null이며 중복 키는 마지막 키/값 쌍이 남는다. null 키에 대해 설명은 runtime error, 예제는 null을 보여 준다. null 키를 사전에 거부하고 실행 모드의 실제 실패 방식을 확인한다. null 값은 허용한다.

출처: [Explode](https://www.palantir.com/docs/foundry/pb-functions-expression/explodeArrayV1), [Explode with position](https://www.palantir.com/docs/foundry/pb-functions-expression/explodeArrayWithPositionV2), [Zip](https://www.palantir.com/docs/foundry/pb-functions-expression/arraysZipV1), [Cartesian product](https://www.palantir.com/docs/foundry/pb-functions-expression/arraysCartesianProductV1), [Map from arrays](https://www.palantir.com/docs/foundry/pb-functions-expression/mapFromArraysV1)

## 생성과 작은 연산

`createArrayV1`은 입력을 원소로 모으므로 배열 입력은 중첩 배열이 되고 null도 원소로 남는다. `createEmptyArrayV1`은 원소 타입을 명시한 빈 배열이다. `arrayRepeatV1`은 배열 전체를 반복해 붙이며 `arrayReverseV1`은 원소의 순서를 뒤집는다.

`arrayPartitionV1`은 순서를 보존하며 지정 크기 이하의 하위 배열로 나눈다. 크기는 양의 정수이고 잘못된 크기나 null 입력은 null이다. `sequenceV2`는 양 끝을 포함하되 step에 맞는 정수 배열을 만든다. 시작 10, 끝 0에 양수 step 2를 주는 예제는 null이므로 날짜 sequence의 역방향 예제와 동일하게 취급하지 않는다.

`arrayJoinV1`의 null 구분자는 ANSI on에서 null, off에서 빈 구분자처럼 처리된다. 빈 배열을 합치면 빈 문자열이다. `lengthV1`은 String/Array/Binary/Map을 받으며 Integer를 반환하지만 문자열 예제만으로 모든 타입의 길이 단위를 확정하지 않는다.

출처: [Create](https://www.palantir.com/docs/foundry/pb-functions-expression/createArrayV1), [Empty](https://www.palantir.com/docs/foundry/pb-functions-expression/createEmptyArrayV1), [Repeat](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayRepeatV1), [Reverse](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayReverseV1), [Partition](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayPartitionV1), [Sequence](https://www.palantir.com/docs/foundry/pb-functions-expression/sequenceV2), [Join](https://www.palantir.com/docs/foundry/pb-functions-expression/arrayJoinV1), [Length](https://www.palantir.com/docs/foundry/pb-functions-expression/lengthV1)

## 엔진 지원

All/any 조건, partition, Struct key 정렬, Cartesian product, 위치 포함 explode, filter, reduce와 transform은 Batch/Streaming이며 Faster 지원으로 표시되어 있지 않다. 나머지 이 문서의 함수는 세 모드를 지원한다.

## 이전 버전 번역본의 경계

다음 출처는 공식 AIP 기계번역이며 정확성 미검증 경고가 있다. 현재 영어 문서와 같은 버전으로 취급하지 않는다.

`explodeArrayWithPositionV1`은 위치와 원소를 가진 struct 행으로 배열을 펼친다. Optional keep-empty/null 설정을 켜면 빈/null 배열을 null로 남기고 아니면 제거한다. 이 짧은 이전 문서는 position의 기준 숫자를 명시하지 않으므로 다른 array 함수의 1-based 규칙을 자동 적용하지 않는다.

## 출처

- [Palantir, explodeArrayWithPositionV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/explodeArrayWithPositionV1/)

- [Palantir, Pipeline Builder expression reference](https://www.palantir.com/docs/foundry/pb-functions-expression/)
- 각 계약의 함수별 공식 출처는 해당 본문에 연결했다.

## 관련 문서

- [[Palantir-Map-and-Struct-Contracts|Map의 순서와 Struct의 결측]]
- [[Palantir-Datetime-Expression-Contracts|날짜 sequence의 별도 계약]]
- [[Palantir-Pipeline-Expressions|Pipeline Builder 표현식]]
