---
tags: [palantir, pipeline-builder, security, media]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 보호된 값과 미디어 식별자 표현식

함수의 반환 타입, 실패 값과 권한 정책을 구분한다. 아래 내용은 공식 표현식 문서에 근거하며 실제 암호화, 권한 검사와 미디어 접근을 실행한 결과는 아니다.

## Cipher 연산

`cipherEncryptV1`, `cipherDecryptV1`, `cipherHashV1`은 Cipher license RID와 대상 값을 받는다. 암호화와 해시 결과는 CipherText, 복호화 결과는 String으로 선언되어 있다. null 입력은 null을 반환하며 Batch, Faster, Streaming을 지원한다.

이 함수 레퍼런스만으로 암호 알고리듬, 키 관리, 호출 권한과 해시 충돌 특성을 확정하지 않는다. 암호화, 복호화와 해시를 모두 문자열 변환 하나로 취급하지 않고 사용할 license와 허용 연산을 별도 확인해야 한다.

출처: [Encrypt](https://www.palantir.com/docs/foundry/pb-functions-expression/cipherEncryptV1), [Decrypt](https://www.palantir.com/docs/foundry/pb-functions-expression/cipherDecryptV1), [Hash](https://www.palantir.com/docs/foundry/pb-functions-expression/cipherHashV1)

## 분류 문자열 변환의 실패

`cbacStringToGroupNamesV3`은 비동기 변환으로 선언되어 있고 Batch/Streaming에서 지원한다. 선언된 반환 구조는 `markingIds: Array<Classification>`과 `errors: String`이다. 실패하면 markingIds가 null이고, 성공하면 errors가 null이다.

예제는 배열만 보여 주어 반환 struct 선언과 표현 수준이 다르다. 배열 예제만 보고 실제 결과에서 오류 필드를 생략하면 안 된다. 빈 문자열의 빈 배열 예제와 잘못된 문자열의 변환 실패도 구분한다. 변환 실패를 분류 없음으로 바꾸는 정책은 문서에서 보장하지 않는다. [CBAC string to group names](https://www.palantir.com/docs/foundry/pb-functions-expression/cbacStringToGroupNamesV3)

## Delegated media GID 생성

`constructDelegatedMediaGidV1`은 media locator, media type과 producer UUID로 식별자를 구성하며 Batch/Streaming을 지원한다. locator와 type은 비어 있으면 안 된다. UUID 상수가 잘못되면 전체 출력이 null이 될 수 있고, 1,024자를 넘는 식별자도 null이 된다. 필수 값이 null인 경우도 따로 처리해야 한다.

형식에 맞는 식별자를 만들었다고 대상 미디어의 존재, 접근 권한이나 사용 가능성을 검증한 것은 아니다. 생성 실패와 이후 조회 실패를 분리해야 한다. [Construct delegated media GID](https://www.palantir.com/docs/foundry/pb-functions-expression/constructDelegatedMediaGidV1)

## 이전 버전 번역본의 경계

다음 출처는 공식 AIP 기계번역이며 정확성 미검증 경고가 있다. 현재 영어 문서와 같은 버전으로 취급하지 않는다.

`cbacStringToGroupNamesV1`은 `groupNames: Array<String>`과 `errors: String`을 반환하는 Batch 함수다. 잘못된 분류 문자열에서 목록은 비어 있고 오류 메시지를 제공한다고 설명한다. 현재 V3의 `markingIds: Array<Classification>` 및 실패 시 null과 다르므로 필드명과 실패 처리를 버전별로 유지한다.

## 출처

- [Palantir, cbacStringToGroupNamesV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/cbacStringToGroupNamesV1/)

- [Palantir, Pipeline Builder expression reference](https://www.palantir.com/docs/foundry/pb-functions-expression/)
- 각 계약의 함수별 공식 출처는 해당 본문에 연결했다.

## 관련 문서

- [[Palantir-Boolean-and-Validation-Contracts|형식 검사와 존재 확인의 차이]]
- [[Palantir-Pipeline-Expressions|Pipeline Builder 표현식]]
