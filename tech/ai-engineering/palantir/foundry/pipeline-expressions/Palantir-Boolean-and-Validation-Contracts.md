---
tags: [palantir, pipeline-builder, boolean, "null", validation]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 불리언과 형식 검증"]
---

# 불리언과 형식 검증의 경계

결측을 false로 바꾸는지 unknown으로 유지하는지에 따라 필터와 승인 조건의 결과가 달라진다. 2026-10-16 Pipeline Builder 공개 함수 레퍼런스 대조 기준이며 실제 엔진 실행 결과는 아니다.

## ANSI 설정이 바꾸는 null 논리

`andV1`, `orV1`, `notAnyV1`은 ANSI off에서 null을 false로 취급한다. ANSI on에서는 결과를 결정할 수 있는 조건이 있는지에 따라 null을 유지한다.

| 입력 | AND(ANSI on) | OR(ANSI on) | Not any(ANSI on) |
|---|---|---|---|
| null, true | null | true | false |
| null, false | false | null | null |
| null, null | null | null | null |

ANSI off에서 null 두 개의 AND/OR는 false, notAny는 true다. 반면 단일 `notV1`의 null 입력 예제는 null을 반환한다. Null을 먼저 false로 치환한 뒤 NOT을 적용하는 방식과 같은 연산이라고 가정하지 않는다.

StartsWith, endsWith와 stringContains도 입력 null에 대해 ANSI on은 null, off는 false를 보여준다. 대소문자 무시는 별도 literal 옵션이다. 문자를 비교하는 정책과 결측을 다루는 정책을 따로 정한다.

## 같은 값 비교와 포함 검사

`equalsV1`의 null-safe true 예제는 null/null을 true, null/값을 false로 처리한다. False이면 두 경우 모두 null이다. 옵션 설명의 null을 false로 취급한다는 짧은 문장만으로 null/null도 false라고 해석하면 틀린다. 옵션 미지정 예제는 true 설정과 같은 결과를 보여준다.

Greater/less 및 포함 비교는 ComparableType을 받으며 null 비교 예제는 null이다. `isInV1`은 배열이나 struct 자체도 비교 대상으로 삼는다. 목록에 null이 있으면 null 값의 포함 검사도 true가 될 수 있다. SQL의 임의 IN 연산과 동일한 결측 규칙이라고 추정하지 않는다.

`leastV1`은 Boolean 분류에도 등장하지만 출력은 비교한 값의 타입이다. Null을 제외한 최소값을 반환하고 모두 null이면 null이다. 문서 분류를 반환 타입으로 사용하지 않는다.

## 비어 있음과 잘못된 값은 다르다

- `isNullV1`/`isNotNullV1`은 빈 문자열을 null로 취급할지 선택한다.
- `isNaNV1`은 NaN만 검사한다. Null 입력 예제는 false다.
- `isEmptyStructV1`은 내부 배열과 struct를 재귀 검사한다. 예제에는 값이 모두 null인 map도 빈 것으로 판정된다.
- `isValidUuidV1`은 완전한 UUID 문자열의 대소문자 표기를 허용하지만 앞에 다른 문구가 붙으면 false다. Null도 false다.

중첩 값이 비어 있다는 이유로 원래 record가 없었던 것과 같게 취급하면 데이터 유입 문제를 놓칠 수 있다. 빈 struct, null, 빈 문자열과 NaN을 구분할지는 업무의 결측 정의에 따라 결정한다.

## 형식 검사와 자원 접근 검사

Media reference 검사는 문자열 구조와 MIME type의 파싱 가능성을 확인한다. Legacy reference 형식도 통과할 수 있다. True는 파일 존재, 내용 무결성이나 읽기 권한의 증거가 아니다.

RID, UUID, MIME type과 delegated media GID 검사도 각각의 형식 유효성을 다룬다. 실제 자원 접근은 후속 API와 권한 확인으로 검증한다. Delegated media GID의 null 예제는 null이므로 모든 검증 함수가 항상 true/false만 반환한다고 가정하지 않는다.

## 지원 모드

대부분의 이 범위 함수는 Batch/Faster/Streaming을 지원한다. `notAnyV1`과 `isEmptyStructV1`은 Batch/Streaming만 표시한다. 엔진 전환에서 비슷한 함수로 대체할 때는 모드 지원과 null 진리표를 함께 대조한다.

## 이전 버전 번역본의 경계

다음 출처는 공식 AIP 기계번역이며 정확성 미검증 경고가 있다. 현재 영어 문서와 같은 버전으로 취급하지 않는다.

비교 V1의 중국어 예시는 strict greater/less에서도 null/null을 true로 표시한다. Greater-or-equal은 값/null을 true, less-or-equal은 null/값을 true로 표시한다. 현재 비교 함수의 null 결과와 다르므로 이전 버전의 문서상 값으로만 보존하며 실행 정답으로 일반화하지 않는다. `isValidMediaReferenceV1`의 datasetFile/mediaSetItem 예시가 true여도 대상 파일 존재나 권한을 검증한 결과는 아니다.

## 출처

- [Palantir, greaterThanV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/greaterThanV1/)
- [Palantir, lessThanV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/lessThanV1/)
- [Palantir, greaterThanOrEqualsV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/greaterThanOrEqualsV1/)
- [Palantir, lessThanOrEqualsV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/lessThanOrEqualsV1/)
- [Palantir, isValidMediaReferenceV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/isValidMediaReferenceV1/)

- [Palantir, And](https://www.palantir.com/docs/foundry/pb-functions-expression/andV1)
- [Palantir, Or](https://www.palantir.com/docs/foundry/pb-functions-expression/orV1)
- [Palantir, Not any](https://www.palantir.com/docs/foundry/pb-functions-expression/notAnyV1)
- [Palantir, Not](https://www.palantir.com/docs/foundry/pb-functions-expression/notV1)
- [Palantir, Equals](https://www.palantir.com/docs/foundry/pb-functions-expression/equalsV1)
- [Palantir, Greater than](https://www.palantir.com/docs/foundry/pb-functions-expression/greaterThanV2)
- [Palantir, Greater than or equals](https://www.palantir.com/docs/foundry/pb-functions-expression/greaterThanOrEqualsV2)
- [Palantir, Less than](https://www.palantir.com/docs/foundry/pb-functions-expression/lessThanV2)
- [Palantir, Less than or equals](https://www.palantir.com/docs/foundry/pb-functions-expression/lessThanOrEqualsV2)
- [Palantir, Is in](https://www.palantir.com/docs/foundry/pb-functions-expression/isInV1)
- [Palantir, Least](https://www.palantir.com/docs/foundry/pb-functions-expression/leastV1)
- [Palantir, Starts with](https://www.palantir.com/docs/foundry/pb-functions-expression/startsWithV1)
- [Palantir, Ends with](https://www.palantir.com/docs/foundry/pb-functions-expression/endsWithV1)
- [Palantir, String contains](https://www.palantir.com/docs/foundry/pb-functions-expression/stringContainsV1)
- [Palantir, Is null](https://www.palantir.com/docs/foundry/pb-functions-expression/isNullV1)
- [Palantir, Is not null](https://www.palantir.com/docs/foundry/pb-functions-expression/isNotNullV1)
- [Palantir, Is NaN](https://www.palantir.com/docs/foundry/pb-functions-expression/isNaNV1)
- [Palantir, Is empty struct](https://www.palantir.com/docs/foundry/pb-functions-expression/isEmptyStructV1)
- [Palantir, Is valid UUID](https://www.palantir.com/docs/foundry/pb-functions-expression/isValidUuidV1)
- [Palantir, Is valid RID](https://www.palantir.com/docs/foundry/pb-functions-expression/isValidRidV1)
- [Palantir, Is valid MIME type](https://www.palantir.com/docs/foundry/pb-functions-expression/isValidMimeTypeV1)
- [Palantir, Is valid media reference](https://www.palantir.com/docs/foundry/pb-functions-expression/isValidMediaReferenceV2)
- [Palantir, Is valid delegated media GID](https://www.palantir.com/docs/foundry/pb-functions-expression/isValidDelegatedMediaGidV1)

## 관련 문서

- [[Palantir-Numeric-Expression-Contracts|수치 연산과 결측]]
- [[Palantir-Aggregation-and-Window-Contracts|집계의 null 처리]]
- [[Palantir-Security-and-Governance|참조와 원본의 접근 권한]]
