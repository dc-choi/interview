---
tags: [palantir, pipeline-builder, strings, identifiers]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 문자열 정규화, 분할과 식별자

문자열 처리에서 결측, 빈 문자열, 형식과 식별자 안정성을 분리한다. 아래는 공식 함수 문서의 계약과 예제를 정리한 내용이며 실제 실행은 검증하지 않았다.

## 결측과 표시

`concatStringsV1`은 null을 건너뛰는 예제를 제공하며, Null output if any input is null을 true로 지정하면 전체 결과가 null이다. `formatStringV1`은 printf 형식으로 값을 표시하며 null 인자를 문자열 `null`로 넣는 예제가 있다. 결측이 포함된 복합 키를 만들 때 두 함수를 같은 의미로 바꾸면 안 된다. [Concatenate](https://www.palantir.com/docs/foundry/pb-functions-expression/concatStringsV1), [Format](https://www.palantir.com/docs/foundry/pb-functions-expression/formatStringV1)

`nullifyEmptyStringV1`은 빈 문자열을 null로 바꾼다. 공백만 있는 문자열까지 비운다는 보장은 이 문서에 없다. `leftStringV1`, `rightStringV1`은 지정 길이만 취하며 문자열보다 긴 길이는 원문 전체를 반환한다. left 함수의 음수 길이 예제는 빈 문자열이다. [Nullify](https://www.palantir.com/docs/foundry/pb-functions-expression/nullifyEmptyStringV1), [Left](https://www.palantir.com/docs/foundry/pb-functions-expression/leftStringV1), [Right](https://www.palantir.com/docs/foundry/pb-functions-expression/rightStringV1)

`leftPadV1`, `rightPadV1`은 길이를 늘리기만 하는 함수가 아니다. 짧은 목표 길이를 주면 원문을 잘라내고 0이면 빈 문자열이다. ANSI mode off에서 null 길이는 빈 문자열, null pad는 원문 유지인 예제가 있으며 on에서는 null이다. [Left pad](https://www.palantir.com/docs/foundry/pb-functions-expression/leftPadV1), [Right pad](https://www.palantir.com/docs/foundry/pb-functions-expression/rightPadV1)

## 대소문자와 문자 변환

`lowercaseV1`, `uppercaseV1`은 전체 문자열의 대소문자를 바꾼다. `titleCaseV1`은 단어 첫 글자만 대문자로 만들고 나머지는 소문자로 만들지만 `hello-world` 예제 결과는 `Hello-world`이다. 모든 구두점을 단어 경계로 가정하지 않는다. `sentenceCaseV1`은 문장 첫 글자를 바꾸며 나머지를 소문자로 정규화하지 않는다. `hELLO WORLD`는 `HELLO WORLD`가 된다.

`translateStringV1`은 언어 번역이 아니라 문자별 치환이다. 매칭 문자열보다 대체 문자열이 짧으면 대응하는 대체 문자가 없는 문자를 삭제한다. `UnhexToStringV1`은 두 자리씩 바이트로 해석한 뒤 UTF-8 문자열을 만든다. `urlEncodeV1`은 percent encoding을 적용하며 URL 전체를 조립하거나 신뢰성을 검증하는 함수는 아니다.

출처: [Lowercase](https://www.palantir.com/docs/foundry/pb-functions-expression/lowercaseV1), [Uppercase](https://www.palantir.com/docs/foundry/pb-functions-expression/uppercaseV1), [Title case](https://www.palantir.com/docs/foundry/pb-functions-expression/titleCaseV1), [Sentence case](https://www.palantir.com/docs/foundry/pb-functions-expression/sentenceCaseV1), [Character translate](https://www.palantir.com/docs/foundry/pb-functions-expression/translateStringV1), [Unhex](https://www.palantir.com/docs/foundry/pb-functions-expression/UnhexToStringV1), [URL encode](https://www.palantir.com/docs/foundry/pb-functions-expression/urlEncodeV1)

## 분할의 단위와 손실

`splitStringV2`의 구분자는 정규식이다. 양수 limit은 출력 원소의 상한이며 남은 문자열은 마지막 원소에 모인다. 끝의 구분자로 빈 원소가 남을 수 있고 빈 입력도 빈 배열이 아니라 빈 문자열 하나인 배열을 반환한다. `stringBeforeDelimiterV1`, `stringAfterDelimiterV1`은 첫 구분자 기준이며, 찾지 못하면 원문 전체를 반환한다. 실패가 빈 값으로 드러난다고 가정하지 않는다.

`chunkStringV1`은 대략적인 문자 수와 구분자 우선순위로 분할한다. overlap은 0 이상이면서 chunk size보다 작아야 한다. 구분자로 자르기 어려운 긴 조각은 목표 size보다 길게 남는 예제가 있다. 따라서 size를 모델의 엄격한 토큰 상한으로 사용할 수 없다. 구분자 유지 여부도 원문 복원에 영향을 준다.

`textSegmentationV1`은 단어 수 단위의 sliding window다. overflow는 공유할 단어 수이며, 음수 overflow 예제에서는 일부 단어를 건너뛴다. 모든 내용을 보존하려는 검색용 분할에는 음수 값을 허용하지 않는 검증이 필요하다. 마지막에 짧은 조각이 남는 것도 정상 동작이다.

출처: [Split](https://www.palantir.com/docs/foundry/pb-functions-expression/splitStringV2), [Before delimiter](https://www.palantir.com/docs/foundry/pb-functions-expression/stringBeforeDelimiterV1), [After delimiter](https://www.palantir.com/docs/foundry/pb-functions-expression/stringAfterDelimiterV1), [Chunk](https://www.palantir.com/docs/foundry/pb-functions-expression/chunkStringV1), [Segmentation](https://www.palantir.com/docs/foundry/pb-functions-expression/textSegmentationV1)

## 형식과 식별자 안정성

`parsePhoneNumberV2`는 지역과 출력 형식(E.164, 숫자만, 국제/국내, RFC3966)을 사용한다. `+`와 국가 번호가 없으면 지역 지정이 필요하며, 파싱 성공은 실제 사용 중인 번호나 소유권 확인을 뜻하지 않는다. `parseSemanticVersionV1`은 release와 prerelease를 논리 타입으로 바꾸며 잘못된 문자열은 null이다. 이 파서 문서만으로 모든 버전 표준 비교 규칙을 확정하지 않는다.

`soundexV1`은 발음 기반 코드이므로 서로 다른 단어가 같은 코드가 된다. 식별자나 동일성 판정에 단독 사용하지 않는다. `sha256V1`은 String/Binary의 SHA-256 문자열을 반환한다. 여러 필드를 해시한다면 값의 구분, null 처리와 정규화를 먼저 정의해야 한다.

`uuidV1`은 UUID v4를 생성하며 반복 build에서 같은 값을 보장하지 않는다. `uuidV5V1`은 namespace와 name에 따른 결정적 UUID를 만든다. 함수가 UUID로 해석하지 못한 namespace(예제의 `not-a-uuid`, 빈 문자열)나 null 입력은 null이며, 해석 범위는 아래 경계값 예제를 따른다. 고정 식별자에 사용할 때는 namespace와 name 구성 규칙도 유지해야 한다.

2026-10-25 UUID v5 공식 문서 부분 대조 기준, 두 인자는 String 표현식이며 결과도 String이다. namespace UUID와 name을 SHA-1으로 해시한다. 표준 형태의 namespace에서 영문자의 대소문자만 바꾼 두 예제는 같은 결과를 낸다.

다만 namespace 파싱 성공을 엄격한 UUID 표기 검증으로 사용하지 않는다. 공식 경계값 예제에서 `1-2-3-4-5`와 `+1-2-3-4-5`는 같은 결과를 내며, 표준 자릿수와 다른 구성요소(`123456789-1-1-1-1`, 0으로 채운 22자리 첫 구성요소)도 받아들인다. 반대로 하이픈을 뺀 32자리 표기, 중괄호로 감싼 표기와 `urn:uuid:` 접두사 표기는 null이다. 이는 문서에 실린 예제의 범위이며 모든 비표준 입력의 정규화 규칙을 보장하지 않는다. 적용 제안: 외부에서 namespace를 받는다면 허용할 표기와 오류 처리 방식을 별도로 정한다. Foundry에서의 실행 결과는 확인하지 않았다.

`createQualifiedTimeSeriesIdV1`의 결과는 seriesId와 syncRid를 담은 문자열이다. null 입력이 전체 null이 되지 않고 문자열 `null`이 필드에 들어가는 예제가 있다. 생성된 문자열을 유효한 시계열 참조로 사용하기 전에 두 입력을 검증한다.

출처: [Phone number](https://www.palantir.com/docs/foundry/pb-functions-expression/parsePhoneNumberV2), [Semantic version](https://www.palantir.com/docs/foundry/pb-functions-expression/parseSemanticVersionV1), [Soundex](https://www.palantir.com/docs/foundry/pb-functions-expression/soundexV1), [SHA-256](https://www.palantir.com/docs/foundry/pb-functions-expression/sha256V1), [UUID unstable](https://www.palantir.com/docs/foundry/pb-functions-expression/uuidV1), [UUID v5](https://www.palantir.com/docs/foundry/pb-functions-expression/uuidV5V1), [Time series reference](https://www.palantir.com/docs/foundry/pb-functions-expression/createQualifiedTimeSeriesIdV1)

## 엔진 지원

2026-10-25 재확인한 UUID v5는 Batch/Faster/Streaming 지원으로 표시되어 있다. 나머지 함수는 2026-10-16 대조 기준으로 Chunk, printf 형식, semantic version과 시계열 참조 생성이 Batch/Streaming, Soundex가 Batch/Faster이며 그 밖의 함수는 Batch/Faster/Streaming이다. 문자열 계열이라는 이유로 같은 실행 엔진에서 모두 사용할 수 있다고 가정하지 않는다. 다른 함수의 지원 상태를 이번에 재검증하지 않아 frontmatter의 `verified_at`은 유지한다.

## 출처

- [Palantir, UUID V5](https://www.palantir.com/docs/foundry/pb-functions-expression/uuidV5V1) — 2026-10-25 인자, namespace 경계값 예제와 실행 엔진 지원 부분 대조.
- [Palantir, Pipeline Builder expression reference](https://www.palantir.com/docs/foundry/pb-functions-expression/)
- 각 계약의 함수별 공식 출처는 해당 본문에 연결했다.

## 관련 문서

- [[Palantir-Regex-Expression-Contracts|정규식의 일치와 실패 값]]
- [[Palantir-Type-and-Encoding-Contracts|타입과 인코딩]]
- [[Palantir-Pipeline-Expressions|Pipeline Builder 표현식]]
- [[Palantir-Pipeline-Schema-Quality-and-Identity|스키마, 품질과 안정적인 식별자]] — 자연 key로 UUID v5를 만드는 전제
