---
tags: [palantir, pipeline-builder, json, xml, data-quality]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 스키마 파싱과 데이터 정제

파싱 결과가 생성되었다고 모든 입력 필드가 보존되거나 업무 조건을 만족하는 것은 아니다. 아래는 공식 표현식 문서를 대조한 내용이며 실제 Pipeline 실행은 검증하지 않았다.

## JSON의 스키마와 오류

`parseJsonAsSchemaV3`는 지정 스키마에 없는 필드를 무시한다. 필요한 필드가 없으면 null로 채우므로 필수값 검증은 별도로 필요하다. Simple 모드는 파싱하지 못한 필드를 null로 처리하고 With errors 모드는 `ok`와 단수 `error`를 갖는 구조를 반환한다. 잘못된 타입, 잘못된 JSON과 중간에서 끊긴 JSON의 오류 예제가 구분되어 있다.

스키마의 Binary 필드는 JSON 문자열의 Base64를 해석한다. 화면에 보이는 문자열이 같아도 결과는 Binary이다. 빈 문자열, JSON null, 빠진 필드와 null 배열 원소의 차이는 결과에도 남을 수 있다. 타입이 맞지 않는 With errors 예제는 `ok: null`이므로 항상 부분적으로 성공한 struct를 받는다고 가정하지 않는다. [Parse JSON](https://www.palantir.com/docs/foundry/pb-functions-expression/parseJsonAsSchemaV3)

`jsonStringV2`는 Array/Map/Struct를 JSON 문자열로 직렬화한다. 중첩 Binary는 Base64로 표시하고 날짜와 timestamp를 문자열로 표현하며 null 필드와 원소를 보존하는 예제가 있다. 이는 `castV2`로 struct의 표시 문자열을 얻는 것과 다르다. 예제 표만으로 Map의 원래 값 타입을 모두 복원할 수 없으므로 숫자처럼 보이는 값이 문자열로 나온 예제를 모든 숫자의 강제 문자열 변환으로 일반화하지 않는다. [Convert data to JSON](https://www.palantir.com/docs/foundry/pb-functions-expression/jsonStringV2)

## XML과 이름 공간

`parseXmlAsSchemaV2`도 스키마 밖 필드를 무시하고 누락 필드를 null로 채운다. Attribute prefix로 속성 필드를 구분하며 Value tag는 자식 없이 속성만 있는 요소의 값을 지정한다. Ignore namespace를 켜면 요소와 속성의 namespace를 제거한다. 이때 스키마에 namespace가 남아 있으면 대응하지 않는다는 설명이 있다. 이름 공간이 다른 동일 local name을 합쳐도 되는지 확인해야 한다.

XML의 Simple 모드는 파싱 오류에서 null, With errors 설명은 `ok`와 복수 `errors` 필드를 사용한다. JSON 함수의 단수 `error`와 같은 필드 이름이라고 가정하지 않는다. 이 함수는 Batch/Streaming 지원이며 Faster 지원으로 표시되어 있지 않다. [Parse XML](https://www.palantir.com/docs/foundry/pb-functions-expression/parseXmlAsSchemaV2)

`gzipDecompressV1`은 gzip Binary를 String으로 바꾼다. 읽은 레퍼런스는 잘못된 압축 데이터, 압축 해제 크기 한도와 문자셋 선택을 상세히 규정하지 않는다. 그런 조건이 필요한 입력 처리에는 별도 실행 검증이 필요하다. [Gzip decompress](https://www.palantir.com/docs/foundry/pb-functions-expression/gzipDecompressV1)

## 정제와 기본값을 명시한다

`cleanStringV1`은 normalize whitespace, trim, nullify empty 동작을 집합으로 선택한다. `trimV1`의 공백 범위는 Unicode whitespace, Java String.trim과 Character.isWhitespace 중 하나에 해당하는 문자다. ASCII space만 제거한다고 이해하지 않는다.

`unicodeNormalizeV1`은 NFC/NFD/NFKC/NFKD를 선택한다. 예제에서 NFC/NFD는 전각 숫자를 유지하지만 NFKC/NFKD는 ASCII 숫자로 바꾼다. 식별자의 호환 정규화를 허용할지는 업무 정책으로 정하고, 표시용 원문 보존과 비교용 정규화를 구분한다.

`createNullValueV1`은 타입이 있는 null을 만든다. `firstNonNullV1`은 앞에서부터 non-null을 고르며 빈 문자열도 건너뛸지 별도 옵션으로 정한다. `mapValuesV2`는 찾지 못한 키에 기본값을 쓰지만, 키가 존재하고 값이 null이면 그 null을 남긴다. 기본값을 모든 null 결과의 대체값으로 취급하지 않는다.

`renameStructFieldV1`은 locator로 중첩 필드 이름을 변경하며 null struct는 null이다. 이름을 바꿨다고 해당 필드를 참조하는 모든 소비자가 자동으로 이전되는 것은 아니다. XML 외 이 문서의 함수는 Batch/Faster/Streaming 지원으로 표시되어 있다.

## 이전 버전 번역본의 경계

다음 출처는 공식 AIP 기계번역이며 정확성 미검증 경고가 있다. 현재 영어 문서와 같은 버전으로 취급하지 않는다.

XML V1과 JSON V2도 스키마 밖 필드를 무시하고 누락 필드를 null로 채운다. JSON V2는 빈 문자열, null 원소와 map의 null 값을 보존하는 예시가 있다. XML V1에는 attribute prefix와 value tag가 있지만 현재 V2의 namespace 무시와 오류 출력 모드를 제공한다고 명시하지 않는다. JSON V2 역시 현재 V3의 With errors 출력 계약으로 읽지 않는다.

## 출처

- [Palantir, parseXmlAsSchemaV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/parseXmlAsSchemaV1/)
- [Palantir, parseJsonAsSchemaV2 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/parseJsonAsSchemaV2/)

- [Palantir, Clean string](https://www.palantir.com/docs/foundry/pb-functions-expression/cleanStringV1)
- [Palantir, Trim whitespace](https://www.palantir.com/docs/foundry/pb-functions-expression/trimV1)
- [Palantir, Unicode normalize](https://www.palantir.com/docs/foundry/pb-functions-expression/unicodeNormalizeV1)
- [Palantir, Create null value](https://www.palantir.com/docs/foundry/pb-functions-expression/createNullValueV1)
- [Palantir, First non-null](https://www.palantir.com/docs/foundry/pb-functions-expression/firstNonNullV1)
- [Palantir, Map values](https://www.palantir.com/docs/foundry/pb-functions-expression/mapValuesV2)
- [Palantir, Rename struct field](https://www.palantir.com/docs/foundry/pb-functions-expression/renameStructFieldV1)
- JSON/XML/gzip의 공식 출처는 해당 본문에 연결했다.

## 관련 문서

- [[Palantir-Type-and-Encoding-Contracts|표시 문자열과 직렬화의 차이]]
- [[Palantir-String-Normalization-Contracts|문자열 정규화와 식별자]]
- [[Palantir-Pipeline-Expressions|Pipeline Builder 표현식]]
