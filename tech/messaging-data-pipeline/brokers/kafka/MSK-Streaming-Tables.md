---
tags: [messaging, kafka, aws, msk, iceberg, s3]
status: done
verified_at: 2026-10-07
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["MSK Streaming Tables", "MSK에서 S3 Tables로 적재"]
---

# MSK Streaming Tables

MSK Express의 Kafka 토픽을 S3 Tables의 Iceberg 테이블로 적재하는 관리형 기능이다. Channel이 Glue Schema Registry의 스키마로 JSON을 변환해 Parquet 파일로 쓰고 테이블에 반영한다.

## 구성 조건

- MSK Provisioned의 **Express broker**가 대상이다. Standard broker와 MSK Serverless는 지원하지 않는다.
- MSK, S3 Table bucket, Glue Schema Registry와 DLQ 버킷은 같은 계정과 리전에 있어야 한다.
- 입력은 스키마 ARN을 지정하는 일반 `JSON` 또는 레코드에 스키마 ID가 들어 있는 `JSON_SCHEMA_GSR`이다.
- 적재용 IAM 역할과 **S3 DLQ 버킷**이 필요하다. 여기서 DLQ는 SQS 큐를 뜻하지 않는다.

## 신규 적재와 과거 데이터 복구는 다르다

Channel은 활성화 이후 생성된 레코드만 적재하며 과거 토픽 데이터를 백필하지 않는다. 구성마다 새 Iceberg 테이블을 만들고 기존 테이블로 적재하지 않는다.

Schema evolution은 지원하지 않아 생성 후 스키마 변경이 적재 실패를 일으킬 수 있다. 시간 기반 파티셔닝만 지원한다. 전환 전후 데이터를 합쳐야 한다면 별도 백필과 중복 검증 경로를 설계한다.

## 신선도와 실패 레코드

신선도 설정은 5~15분이다. 최소 5분 설정에는 비압축 입력 약 2.4 MB/s 이상이 필요하므로, 저처리량 토픽은 더 긴 값을 선택한다. 초 단위 조회 요구에 적합하다고 가정하지 않는다.

공식 문서상 DLQ에는 처리하지 못한 레코드의 식별자와 오류 맥락이 기록되고 **전체 payload는 보존되지 않는다**. 따라서 복구 설계에서는 원본을 Kafka 보존 기간 안에 다시 읽을 수 있는지 확인한다. DLQ 파일이 있다는 사실만으로 재처리 가능성이 보장되지는 않는다.

운영 확인은 정상 이벤트의 조회 가능 시각, 스키마 오류의 기록, 원본 재조회 가능 여부를 나눠 수행한다. 자동 적재 성공률과 업무 데이터의 완전성은 별도 지표다.

## 출처

- [AWS, Amazon MSK streaming tables to Apache Iceberg](https://docs.aws.amazon.com/msk/latest/developerguide/msk-data-delivery-iceberg.html)
- [AWS, Key concepts](https://docs.aws.amazon.com/msk/latest/developerguide/msk-data-delivery-iceberg-concepts.html)
- [Amazon MSK data delivery to streaming tables — Amazon Web Services](https://www.youtube.com/watch?v=a6XIYDf-JKc)

## 관련 문서

- [[MQ-Kafka-Retention|Kafka 보존과 재생 가능 기간]]
- [[S3-Tables-Maintenance|S3 Tables 유지보수]]
- [[Kinesis|Kinesis의 스트리밍 적재]]
