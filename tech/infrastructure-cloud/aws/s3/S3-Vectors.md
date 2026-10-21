---
tags: [aws, s3, vector-search, embeddings, rag]
status: done
verified_at: 2026-10-22
category: "Infrastructure - AWS"
aliases: ["S3 Vectors", "S3 벡터 검색"]
---

# S3 Vectors의 저장과 검색 계약

S3 Vectors는 전용 vector bucket 안의 vector index에 벡터를 저장하고 유사도를 검색하는 서비스다. 원문 객체를 S3에 올리는 작업, 임베딩 생성과 벡터 검색은 각각 다른 단계다.

## 임베딩과 인덱스를 맞춘다

인덱스를 만들 때 차원, 거리 척도와 필터에서 제외할 메타데이터 키를 정한다. 생성 뒤 인덱스 이름, 차원, 거리 척도와 비필터 메타데이터 키를 바꾸려면 새 인덱스를 만들어야 한다. 문서와 질의는 같은 임베딩 모델을 사용한다.

`QueryVectors`에는 질의 벡터, 대상 인덱스와 `topK`를 전달한다. 기본 응답은 벡터 키이며 거리와 메타데이터를 추가로 요청할 수 있다. 여러 페이지로 나뉘면 `nextToken`으로 이어 읽는다. 검색 결과는 유사한 자료의 후보이므로 원문의 정확성과 답변의 타당성은 별도로 평가한다.

Bedrock Knowledge Bases와 통합하면 원문 수집, 텍스트 분할, 임베딩 생성과 vector index 적재를 관리형 RAG 흐름으로 연결할 수 있다. 직접 `QueryVectors`를 호출한 것만으로 이 전처리와 답변 생성이 함께 수행되는 것은 아니다.

## 메타데이터의 저장과 필터링을 구분한다

메타데이터는 기본적으로 필터에 사용할 수 있지만, 인덱스 생성 시 비필터 키로 지정한 필드는 조회 조건으로 쓸 수 없다. 그 필드로 필터를 요청하면 `400 Bad Request`가 발생한다. 비필터 필드도 결과 메타데이터로 반환할 수 있다.

2026-10-22 공식 문서 기준, `ENHANCED` 인덱스는 메타데이터 조건을 먼저 적용한 뒤 유사도를 검색한다. `CLASSIC` 인덱스의 기본 검색은 후보 탐색과 필터 평가를 함께 진행하며, 조건에 맞는 항목이 드물면 `topK`보다 적게 반환할 수 있다. `CLASSIC`에서도 요청의 `queryMode`를 `ENHANCED`로 지정할 수 있다. 인덱스 모드와 요청 옵션을 함께 확인한다.

## 적용 전 비교할 것

다음은 실제 도입을 위한 검증 제안이다.

- 대표 질문과 정답 자료로 검색 품질을 비교한다. 필터 선택도와 데이터 규모를 바꿔 누락과 지연을 측정한다.
- 임베딩 생성, 저장, 조회와 답변 생성의 비용을 함께 계산한다. 특정 고객 사례의 비용 절감 효과를 다른 부하에 그대로 적용하지 않는다.
- 문서 수정과 삭제가 원문, 벡터 및 애플리케이션 캐시에 반영되는지 확인한다. 저장소의 쓰기 일관성만으로 전체 파이프라인의 최신성을 판단하지 않는다.

서비스 계약을 문서로 대조했으며 실제 인덱스 생성, 검색 품질과 비용 측정은 수행하지 않았다.

## 출처

- [AWS, Working with S3 Vectors and vector buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors.html)
- [AWS, Creating a vector index in a vector bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-create-index.html)
- [AWS, Querying vectors](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-query.html)
- [AWS, Metadata filtering](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-metadata-filtering.html)

## 관련 문서

- [[S3|S3 문서 지도]]
- [[Vector-Similarity-Search|벡터 유사도 검색]]
- [[RAG-Retrieval-Engineering|RAG 검색 설계]]
