---
tags: [palantir, foundry, pipeline-builder, similarity, embeddings, rouge]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 텍스트와 벡터 유사도 계약"]
---

# Pipeline Builder 텍스트와 벡터 유사도 계약

Distance measurement expression은 문자열 편집 거리, 토큰 집합 비교, ROUGE와 embedding 벡터 비교를 포함한다. 지리적 거리 함수와 이름이 비슷해도 입력, 단위와 점수의 방향이 다르다. 아래는 2026-10-16 공식 문서 기준이며 실제 Pipeline이나 평가 모델은 실행하지 않았다.

## 비교 단위부터 선택한다

| 연산 | 입력과 출력 | 공개 지원 엔진 |
|---|---|---|
| Edit distance | String 두 개, Integer 또는 정규화 Double | Batch/Faster/Streaming |
| Token set ratio | String 두 개, 0~1 Double | Batch/Streaming |
| ROUGE | Prediction/target String, precision/recall/fmeasure 구조체 | Batch |
| Similarity score | Float 배열 두 개, Double | Batch |

거리가 작을수록 가까운 표현과 유사도가 클수록 가까운 표현을 같은 정렬 방향으로 다루지 않는다. 0~1 점수라는 이유만으로 서로 다른 함수의 threshold를 공유하지 않는다.

## Edit distance의 알고리즘과 정규화

Levenshtein, indel과 Damerau-Levenshtein을 선택할 수 있고 ignore case와 normalize distance 옵션이 별도다. `hlelo`와 `hello` 예시는 Levenshtein 2, Damerau-Levenshtein 1로 달라진다. 인접 문자 뒤바꿈을 어떻게 세는지가 결과에 영향을 준다.

정규화 모드는 0이 차이 없음, 1이 유사성 없음인 범위를 설명하며 출력 타입도 Double이 될 수 있다. 비정규화 정수와 같은 threshold로 비교하지 않는다. 어떤 문자열 길이를 분모로 쓰는지는 이 계약만으로 임의의 공식을 붙이지 않는다. 한 입력이라도 null인 예시는 null이다.

## Token set ratio의 1은 문자열 동일성을 뜻하지 않는다

Token set ratio는 단어 순서가 다른 `hello world`와 `world hello`에도 1을 반환한다. Ignore case를 켜면 중복과 대소문자가 다른 문자열에도 1인 예시가 있다. 동일 문자열 확인, 정렬 순서 검증이나 원본 증거 보존을 대신하지 않는다.

빈 문자열끼리는 1이지만 null이 들어가면 null이다. 빈 입력이 서로 같다는 점수와 내용이 충분하다는 조건을 분리한다. 문서의 substring 설명도 일반적인 문자 단위 부분 문자열 검사로 확대하지 않는다.

## ROUGE의 문자 처리와 문장 경계

ROUGE는 소문자로 바꾼 뒤 ASCII 알파벳과 숫자만 비교하고 나머지는 단어 구분자로 처리한다. 비 ASCII 문자만 같은 두 입력은 토큰이 없어 0인 예시가 있다. 한국어 본문의 내용 유사성을 이 함수 하나로 평가하는 데는 적합하지 않다.

ROUGE-1/2/3은 각각 단어 1개, 연속 2개와 3개의 겹침을 보고, ROUGE-L은 같은 순서로 나타나는 가장 긴 단어열을 본다. 세 단어보다 짧은 동일 문장도 ROUGE-3에서 0인 예시가 있으므로 동일 입력이면 모든 variant가 1이라는 가정은 틀린다.

ROUGE-Lsum은 개행으로 문장을 나누고 문장 부호만으로는 나누지 않는다. 별도의 detected sentences variant는 문장 경계를 자동 검출하며 문장 순서를 바꾼 예시에도 1을 반환한다. Use stemmer는 단어 형태를 맞추는 옵션이며 언어 지원 범위까지 이 문서가 보장하지는 않는다.

반환은 precision, recall과 fmeasure다. 입력이 null이거나 scorer 크기 제한 등으로 평가할 수 없으면 결과 전체가 null이다. 숫자 0으로 대체하면 유사성이 낮은 경우와 평가 실패가 섞인다. 구체적인 크기 한도와 언어별 문장 검출 품질은 이 공개 페이지에서 확인되지 않는다.

## Embedding 비교의 타입과 실패 조건

Similarity score의 타입 변수는 `Array<Float>`다. Metric은 cosine similarity, cosine distance, dot product와 Euclidean distance를 선택한다. 실제 예시는 같은 embedding에 대해 cosine similarity/dot product가 1, Euclidean distance가 0이지만, 모든 벡터가 정규화됐다는 일반 보장은 아니다.

일반 배열 예시는 `[1, 2]`와 `[1, 3]`의 dot product를 7로 반환한다. 길이가 다르거나 한쪽이 null인 경우는 null이다. 같은 차원이라는 사실만으로 두 벡터가 같은 모델과 embedding 공간에 속한다고 보지 않는다.

공개 embedding 예시 자체가 `...`로 생략돼 있어 원래 고차원 배열과 숫자 결과를 완전히 재현할 수 없다. 0 벡터, NaN/Infinity와 배열 내부 null의 정책도 이 예시들만으로 확정하지 않는다. 점수 계산은 사실 일치나 모델 출력의 정답 여부 검증과 별개다.

## 이전 버전 번역본의 경계

다음 출처는 공식 AIP 기계번역이며 정확성 미검증 경고가 있다. 현재 영어 문서와 같은 버전으로 취급하지 않는다.

`levenshteinDistanceV1`은 두 문자열과 ignore-case를 받아 Integer를 반환하며 Batch/Streaming을 표시한다. Null 입력은 null이다. 현재 edit-distance의 알고리즘 선택, 정규화 Double과 Faster 지원을 이 이전 API에 있다고 간주하지 않는다.

## 출처

- [Palantir, levenshteinDistanceV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/levenshteinDistanceV1/)

- [Palantir, Edit distance](https://www.palantir.com/docs/foundry/pb-functions-expression/levenshteinDistanceV2)
- [Palantir, Token set ratio](https://www.palantir.com/docs/foundry/pb-functions-expression/tokenSetRatioV1)
- [Palantir, ROUGE score](https://www.palantir.com/docs/foundry/pb-functions-expression/rougeScoreV1)
- [Palantir, Similarity score](https://www.palantir.com/docs/foundry/pb-functions-expression/similarityScoreV1)

## 관련 문서

- [[Palantir-Pipeline-Expressions|Expression 타입과 지원 엔진]]
- [[Palantir-Geospatial-Geometry-Operations|미터를 사용하는 지리적 거리와의 구별]]
