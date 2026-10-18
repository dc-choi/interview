---
tags: [palantir, pipeline-builder, map, struct]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Map과 Struct 표현식의 순서와 결측

Map은 키와 값의 대응, Struct는 이름이 있는 필드 구조다. 같은 화면 표기처럼 보여도 순서, 결측과 행 수의 계약은 다르다. 아래는 공식 문서에 근거하며 실제 Pipeline 실행은 검증하지 않았다.

## Map 조회, 변경과 행 수

`valueFromMapV1`은 키가 없거나 map 또는 키가 null이면 null을 반환한다. 따라서 반환값 하나만으로 없는 키와 null 값인 키를 구분할 수 없다. 키는 ComparableType이며 배열과 중첩 배열을 키로 조회하는 예제도 있다. [Value from map](https://www.palantir.com/docs/foundry/pb-functions-expression/valueFromMapV1)

`addOrUpdateMapEntryV1`은 기존 키를 덮어쓰거나 새 키를 추가한다. null 값도 저장하지만 map 자체가 null이면 새 map으로 만들지 않는다. null 키는 ANSI mode off에서 원본 map 유지, on에서 null 결과인 예제가 있다. `removeMapEntryByKeyV1`도 null 키의 ANSI 차이가 있으며, 없는 키를 지우면 원본 map을 유지한다. [Add or update](https://www.palantir.com/docs/foundry/pb-functions-expression/addOrUpdateMapEntryV1), [Remove](https://www.palantir.com/docs/foundry/pb-functions-expression/removeMapEntryByKeyV1)

`extractMapKeysV1`과 `extractMapValuesV1`은 배열 순서를 보장하지 않는다. 두 함수를 따로 호출한 뒤 배열 위치로 키와 값을 다시 결합하는 방식은 문서가 보장하는 대응 관계가 아니다. 값 배열에는 null 값이 남고, null map은 null을 반환한다. [Keys](https://www.palantir.com/docs/foundry/pb-functions-expression/extractMapKeysV1), [Values](https://www.palantir.com/docs/foundry/pb-functions-expression/extractMapValuesV1)

`explodeMapV1`은 키와 값의 쌍마다 행을 만든다. 빈 map과 null map에서는 행이 사라진다. 원본 행을 보존해야 한다면 explode 이후 행 수가 같은지 확인하는 것만으로는 부족하며, 빈 값 보존 정책을 먼저 설계해야 한다. [Explode map](https://www.palantir.com/docs/foundry/pb-functions-expression/explodeMapV1)

## 키와 값 변환의 지원 차이

`transformMapKeysV1`과 `transformMapValuesV1`의 표현식은 각 키와 값의 쌍에 접근한다. 키 변환에서도 원래 값을 사용할 수 있고 값 변환에서도 키를 사용할 수 있다. 키 변환 후 서로 다른 키가 같아지는 경우의 충돌 정책은 읽은 예제에 명시되어 있지 않다. 변경 전에 충돌 여부를 검사한다.

Map 함수 전체가 같은 엔진에서 실행되는 것은 아니다. 키/값 추출과 조회는 Batch/Faster/Streaming, 추가/삭제/explode/키 변환은 Batch/Streaming, 값 변환은 Batch 지원으로 표시되어 있다. [Transform keys](https://www.palantir.com/docs/foundry/pb-functions-expression/transformMapKeysV1), [Transform values](https://www.palantir.com/docs/foundry/pb-functions-expression/transformMapValuesV1)

## Struct의 null과 경로

`createStructV2`는 모든 입력 필드가 null이어도 필드가 있는 struct를 만든다. struct 자체의 null과 모든 필드가 null인 struct는 다르다. [Create struct](https://www.palantir.com/docs/foundry/pb-functions-expression/createStructV2)

`addOrUpdateStructFieldV1`과 `getStructFieldV2`는 locator로 중첩 필드를 지정한다. null struct에 필드를 추가해도 null이고, 존재하는 struct의 필드에 null을 쓰는 것은 해당 필드 값을 null로 만드는 동작이다. 중첩 경로의 부모가 null인 조회도 null을 반환한다. 세 Struct 함수는 Batch/Faster/Streaming을 지원한다. [Update struct](https://www.palantir.com/docs/foundry/pb-functions-expression/addOrUpdateStructFieldV1), [Get field](https://www.palantir.com/docs/foundry/pb-functions-expression/getStructFieldV2)

## 출처

- [Palantir, Pipeline Builder expression reference](https://www.palantir.com/docs/foundry/pb-functions-expression/)
- 각 계약의 함수별 공식 출처는 해당 본문에 연결했다.

## 관련 문서

- [[Palantir-Boolean-and-Validation-Contracts|구조의 빈 값과 결측 검사]]
- [[Palantir-Pipeline-Expressions|Pipeline Builder 표현식]]
