---
tags: [finops, aws, saas, metering, api-gateway, firehose, athena]
status: done
verified_at: 2026-10-22
category: "비용&운영(FinOps)"
aliases: ["SaaS 사용량 미터링", "SaaS Usage Metering"]
---

# SaaS 사용량 미터링

미터링은 고객별 API 호출 수, 전송량 같은 사용량을 측정하는 과정이다. 측정값에 가격과 계약 조건을 적용하는 청구, 클라우드 원가를 계산하는 비용 귀속과 구분한다. API 호출을 세었다는 사실만으로 고객에게 청구할 업무 결과 수가 확정되지는 않는다.

## API 로그를 분석하는 구성

AWS의 공개 예제는 Cognito로 인증한 사용자의 REST API 호출을 API Gateway에서 기록한다. Lambda가 업무 요청을 처리하고, 접근 로그는 Data Firehose를 거쳐 S3에 저장한다. Athena로 사용자별 호출을 집계하며, 별도 Lambda가 작은 파일을 병합하고 Parquet으로 변환한다. 이는 사용량 분석의 구성 예다. 청구 확정과 정산의 완전성을 검증한 결과는 아니다.

REST API의 Firehose 접근 로깅에는 다음 조건이 있다.

- 배포한 stage와 Firehose stream이 필요하며 stream 이름은 `amazon-apigateway-`로 시작한다.
- 접근 로그 목적지는 CloudWatch 또는 Firehose 중 하나를 선택한다. 실행 로그를 CloudWatch로, 접근 로그를 Firehose로 보내는 조합은 가능하다.
- Firehose는 버퍼 설정에 따라 여러 레코드를 S3 객체로 묶는다. S3 저장과 후속 변환을 거치는 집계에 즉시 반영을 가정하지 않는다.

각 조건은 [API Gateway의 Firehose 로깅](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-logging-to-kinesis.html)과 [Firehose 전달 문서](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html)를 대조한 범위다.

## 로그 수와 청구 수를 구분한다

API Gateway는 일부 오류에서 로그와 지표를 생성하지 않을 수 있다. 공식 문서는 413, 431, 과도한 429, API mapping이 없는 custom domain의 4xx, 내부 실패로 인한 5xx를 예로 든다. 콘솔의 REST API method 테스트도 실제 로그와 지표를 생성하지 않는다. 따라서 접근 로그를 모든 요청의 완전한 원장으로 간주하지 않는다. [API Gateway 모니터링 문서](https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-monitor.html)

다음은 이 제약을 고려한 **설계 점검안**이며 AWS 예제가 모두 구현했다는 뜻은 아니다.

| 결정할 항목 | 점검 질문 |
|---|---|
| 청구 단위 | 시도한 요청, 성공 응답, 완료한 업무 중 무엇을 세는가? |
| 고객 귀속 | 인증된 사용자와 계약한 테넌트를 어떤 검증된 관계로 연결하는가? |
| 재시도 | 네트워크 재시도로 같은 업무가 반복되면 한 번만 청구할 것인가? |
| 집계 마감 | 늦게 도착한 로그와 재처리를 어느 청구 기간에 반영하는가? |
| 대사 | 업무 완료 기록과 미터링 집계의 차이를 어떻게 조사하고 정정하는가? |

예를 들어 보고서 생성 요청이 재시도됐지만 보고서는 하나만 완성됐다면, 요청 횟수와 완료 건수는 다른 측정값이다. 완료 건당 청구를 선택했다면 업무 식별자와 완료 기록을 기준으로 중복 정책을 설계한다. 반대로 요청당 과금이라면 어떤 실패를 포함할지 계약과 집계 조건을 맞춘다.

## 운영 확인

적용 전에는 테스트 요청의 예상 건수와 고객별 집계를 비교하고, 실패, 재시도, 지연 도착과 재처리도 확인한다. 원본 JSON과 변환한 Parquet을 함께 조회해 이중 합산하지 않도록 집계 경로를 정한다. 이 절차는 검증 제안이며 실제 AWS 배포와 청구 대사는 수행하지 않았다.

고객별 사용량은 [[Cloud-Unit-Cost|클라우드 단위 비용]]의 분모 후보가 될 수 있지만, 사용량 비율만으로 모든 공유 비용의 귀속이 정해지는 것은 아니다.

## 출처

- [AWS 분석 서비스를 활용하여 SaaS 미터링 시스템 구축하기 — AWS 기술 블로그](https://aws.amazon.com/ko/blogs/tech/saas-metering-system-with-aws/)
- [Amazon API Gateway, Log REST API calls to Amazon Data Firehose](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-logging-to-kinesis.html)
- [Amazon API Gateway, Monitor REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-monitor.html)
- [Amazon Data Firehose, Understand data delivery](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html)

## 관련 문서

- [[Cloud-Unit-Cost|클라우드 단위 비용]]
- [[AWS-Cost-Allocation-Tags|AWS 비용 귀속]]
- [[Athena|S3 데이터의 SQL 분석]]
