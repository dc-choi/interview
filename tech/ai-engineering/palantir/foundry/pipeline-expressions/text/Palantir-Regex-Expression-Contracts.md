---
tags: [palantir, pipeline-builder, regex]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 정규식 함수의 매칭 범위와 실패 값

정규식 함수는 부분 검색, 전체 일치, 추출과 치환의 계약이 다르다. 이 문서는 공식 함수 레퍼런스에 근거하며 엔진별 실제 실행은 검증하지 않았다. 여섯 함수 모두 Batch/Faster/Streaming 지원으로 표시되어 있다.

## 부분 검색과 전체 검증

`regexFindV1`은 문자열 일부와 맞으면 true, `regexMatchV2`는 문자열 전체가 맞아야 true이다. 형식 검증에 부분 검색을 사용하면 앞뒤의 허용하지 않은 텍스트가 남아도 통과할 수 있다.

두 함수 모두 ANSI mode on에서는 null 입력/패턴이 null, off에서는 false인 예제가 있다. 문법이 잘못된 패턴 `(`은 두 모드에서 false로 나온다. 이 결과만으로 정상적인 불일치와 잘못된 패턴을 구분할 수 없다. [Regex find](https://www.palantir.com/docs/foundry/pb-functions-expression/regexFindV1), [Regex match](https://www.palantir.com/docs/foundry/pb-functions-expression/regexMatchV2)

## 추출과 위치

`regexExtractV1`은 첫 일치의 지정 그룹을 반환하며 일치가 없으면 빈 문자열이다. null 입력의 null 결과와 다르다. `regexExtractAllV1`은 각 일치에서 지정 그룹을 뽑은 배열이며 group 0은 전체 일치이다. 선택적 그룹이 실제로 참여하지 않은 예제에서도 빈 문자열이 배열에 남는다. [Extract](https://www.palantir.com/docs/foundry/pb-functions-expression/regexExtractV1), [Extract all](https://www.palantir.com/docs/foundry/pb-functions-expression/regexExtractAllV1)

`regexIndexV2`의 위치는 0부터 시작하는 Unicode code point 기준이다. UTF-8 바이트나 JavaScript UTF-16 인덱스와 무조건 같은 값이 아니다. 이모지가 앞에 있는 문자열을 다른 런타임에서 자를 때 단위를 맞춰야 한다. 중첩 일치를 별도로 세지 않으며, 불일치는 빈 배열, null 입력과 잘못된 패턴은 null인 예제가 있다. [Regex index](https://www.palantir.com/docs/foundry/pb-functions-expression/regexIndexV2)

## 치환 문자열도 문법이다

`regexReplaceV1`은 여러 일치를 치환하고 `$1` 같은 그룹 참조 예제를 제공한다. 역슬래시, 리터럴 달러 기호, 그룹 참조는 입력 문자열과 정규식, 치환 문자열 각각의 이스케이프 층을 구분해야 한다. 잘못된 패턴과 null 치환 문자열의 결과는 null이다.

공식 표의 리터럴 `$` 검색 예제는 표시된 패턴과 결과만으로 정확한 이스케이프를 재현하기 어렵다. 문서 화면의 표기를 그대로 복사해 동작을 단정하지 않는다. 백슬래시와 달러 기호가 포함된 실제 값으로 작은 재현 검사를 먼저 수행한다. [Regex replace](https://www.palantir.com/docs/foundry/pb-functions-expression/regexReplaceV1)

## 이전 버전 번역본의 경계

다음 출처는 공식 AIP 기계번역이며 정확성 미검증 경고가 있다. 현재 영어 문서와 같은 버전으로 취급하지 않는다.

`regexIndexV1` 중국어 문서는 Batch만 표시한다. `ababab`에서 `ab`의 위치는 `[0,2,4]`, 불일치는 빈 배열, null 입력/패턴은 null이다. V2의 Unicode code point 명시와 Faster/Streaming 지원을 V1 문서에 소급하지 않는다.

## 출처

- [Palantir, regexIndexV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/regexIndexV1/)

- [Palantir, Pipeline Builder expression reference](https://www.palantir.com/docs/foundry/pb-functions-expression/)
- 각 계약의 함수별 공식 출처는 해당 본문에 연결했다.

## 관련 문서

- [[Palantir-Boolean-and-Validation-Contracts|ANSI mode와 결측]]
- [[Palantir-Pipeline-Expressions|Pipeline Builder 표현식]]
