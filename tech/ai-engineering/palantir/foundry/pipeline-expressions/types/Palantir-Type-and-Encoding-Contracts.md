---
tags: [palantir, pipeline-builder, types, encoding]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Pipeline Builder 타입 변환과 인코딩

타입 변환, 표시 형식과 인코딩은 서로 다른 계약이다. 아래는 공식 함수 레퍼런스의 선언과 예제를 정리한 내용이며 실제 Foundry 실행으로 검증하지 않았다.

## 타입 변환과 조건 분기의 공통 타입

`castV2`는 배열 원소의 타입도 바꿀 수 있다. 하지만 struct나 map을 문자열로 바꾼 결과는 `{1,false}`, `{1 -> true}` 같은 표시 형식이다. 이를 JSON 직렬화 결과로 취급하지 않는다.

문자열을 Boolean으로 변환할 때는 공백을 정리하고 대소문자를 무시하며 `true/t/y/yes/1`, `false/f/n/no/0`을 인정한다. 그 밖의 문자열은 null이 될 수 있다. 문자열 `1.0`의 정수 변환 실패를 숫자형 실수의 모든 변환 규칙으로 일반화하지 않는다. [Cast](https://www.palantir.com/docs/foundry/pb-functions-expression/castV2)

`logicalTypeCastV1`은 기본 표현을 바꾸는 대신 논리 타입의 조건을 적용한다. 대체값도 같은 조건을 통과해야 한다. 자연수 조건을 위반한 입력에 대체값 `-1`을 주면 null, `1`을 주면 1인 예제가 있다. [Logical type cast](https://www.palantir.com/docs/foundry/pb-functions-expression/logicalTypeCastV1)

`caseV2`의 Decimal 결과 타입은 각 분기의 타입을 함께 고려한다. 합쳐진 정밀도가 표현 한도를 넘으면 타입 조정과 overflow로 null이 생길 수 있다. 선택한 값만 확인해서 안전하다고 판단하지 않는다. 문서는 분기 평가의 지연 실행을 보장하지 않는다. [Case](https://www.palantir.com/docs/foundry/pb-functions-expression/caseV2)

`formatNumberV1`은 소수 자릿수와 그룹 구분자를 적용한 String을 반환한다. 계산에 사용할 숫자 반올림과 표시 형식 변환을 분리한다. [Format number](https://www.palantir.com/docs/foundry/pb-functions-expression/formatNumberV1)

## Binary 표시와 실제 바이트

| 함수 | 입력과 출력 | 해석할 때 주의할 점 |
| --- | --- | --- |
| `base64EncodeV1` | Binary 또는 String → String | String을 인코딩하는 동작과 Binary를 화면에 표시한 표기를 혼동하지 않는다. |
| `base64DecodeV1` | String → Binary | 예제의 입력과 출력 표기가 같아 보여도 출력은 Binary이다. |
| `base64DecodeToStringV1` | Binary 또는 String → String | Base64를 해석한 내용을 UTF-8 문자열로 읽는다. |
| `decodeV1` | Binary → String | UTF-8, UTF-16/BE/LE, ISO-8859-1, US-ASCII, Windows-31J 중 문자셋을 지정한다. |
| `skipBytesV1` | Binary와 Integer → Binary | 입력이 null이면 null이며, 예제에서 바이트 수보다 큰 건너뛰기는 빈 값 대신 null이다. |

Binary 예제 표의 Base64 표현은 바이트를 문서에 표시하는 방법이다. 이를 입력 문자열로 다시 넣으면 다른 바이트가 될 수 있다. 인코딩 왕복 검사는 표시 문자열뿐 아니라 출력 타입과 실제 바이트를 비교해야 한다.

출처: [Base64 encode](https://www.palantir.com/docs/foundry/pb-functions-expression/base64EncodeV1), [Base64 decode](https://www.palantir.com/docs/foundry/pb-functions-expression/base64DecodeV1), [Decode to string](https://www.palantir.com/docs/foundry/pb-functions-expression/base64DecodeToStringV1), [Decode](https://www.palantir.com/docs/foundry/pb-functions-expression/decodeV1), [Skip bytes](https://www.palantir.com/docs/foundry/pb-functions-expression/skipBytesV1)

## 진법, 시프트와 URL

`convertBaseV1`은 엄격한 숫자 형식 검증기가 아니다. 2진법 입력 `123`을 1로, `213`을 0으로 해석하는 예제가 있다. 문자열 전체가 유효한 숫자인지 먼저 검사해야 하는 업무라면 별도 검증이 필요하다. [Convert base](https://www.palantir.com/docs/foundry/pb-functions-expression/convertBaseV1)

`bitShiftLeftV1`과 `bitShiftRightV1`은 입력 정수 계열의 타입을 유지한다. 무한 정밀도 곱셈과 나눗셈으로 이해하지 않는다. Integer 최댓값의 왼쪽 10비트 이동 결과는 -1024이며 음수나 큰 이동 횟수도 단순 오류로 거부되지 않는 예제가 있다. 허용할 이동 횟수와 overflow 처리 기준을 호출부에서 정한다. 두 함수와 진법 변환은 Batch/Streaming 지원이며 Faster 지원으로 표시되어 있지 않다. [Left shift](https://www.palantir.com/docs/foundry/pb-functions-expression/bitShiftLeftV1), [Right shift](https://www.palantir.com/docs/foundry/pb-functions-expression/bitShiftRightV1)

`urlDecodeV1`은 percent encoding을 해석한다. URL의 신뢰성 검사나 보안 정제를 대신하지 않는다. [URL decode](https://www.palantir.com/docs/foundry/pb-functions-expression/urlDecodeV1)

## 출처

- [Palantir, Pipeline Builder expression reference](https://www.palantir.com/docs/foundry/pb-functions-expression/)
- 각 계약의 함수별 공식 출처는 해당 본문에 연결했다.

## 관련 문서

- [[Palantir-Boolean-and-Validation-Contracts|조건, 결측과 검증]]
- [[Palantir-Pipeline-Expressions|Pipeline Builder 표현식]]
