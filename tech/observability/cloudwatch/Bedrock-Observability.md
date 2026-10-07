---
tags: [observability, aws, bedrock, cloudwatch, rag]
status: done
verified_at: 2026-10-07
category: "관측가능성(Observability)"
aliases: ["Bedrock 관측", "Bedrock Observability"]
---

# Bedrock 관측

생성형 AI 운영에서는 호출 성공과 응답 품질을 따로 본다. HTTP 요청이 성공해도 필요한 근거를 놓치거나 틀린 답을 생성할 수 있다. CloudWatch의 서비스 지표에 애플리케이션의 검색, 생성과 사용자 피드백 기록을 연결한다.

## 기본 지표의 의미부터 구분한다

2026-10-07 공식 문서 기준, `bedrock-runtime` 호출의 지표는 `AWS/Bedrock` namespace에서 제공한다.

| 지표 | 해석 |
|---|---|
| `Invocations` | 지원 추론 API의 성공 요청 수. 전체 시도 수가 아니다 |
| `InvocationLatency` | 요청부터 마지막 토큰 수신까지의 시간 |
| `TimeToFirstToken` | 지원 스트리밍 API의 첫 토큰 수신까지의 시간 |
| `InvocationClientErrors`, `InvocationServerErrors` | 클라이언트 오류와 서비스 측 오류 |
| `InvocationThrottles` | 제한된 호출 수. SDK 재시도 설정의 영향도 받는다 |
| `InputTokenCount`, `OutputTokenCount` | 입력과 출력 토큰 사용량 |

지연 증가를 볼 때 출력 길이와 첫 토큰 지연을 함께 본다. 성공 수만 분모로 삼아 전체 요청의 실패율이라고 부르지 않는다. 애플리케이션 요청 한 건이 여러 모델 호출과 재시도를 만들 수 있으므로 업무 요청 수와 모델 호출 수도 구분한다. 이는 지표 정의를 적용한 분석 기준이다.

## 503과 429를 구분해 대응한다

2026-10-07 공식 오류 문서 기준, `503 ServiceUnavailable`은 높은 수요나 일시적인 서비스 용량 부족을 뜻한다. 계정 할당량 초과인 `429 ThrottlingException`과 구분한다. 서버 오류가 늘었다는 이유만으로 할당량 증설을 해결책으로 정하지 않는다.

1. 애플리케이션에서 오류 코드, 요청 ID, 모델 또는 inference profile, 호출 리전과 시각을 기록한다. CloudWatch의 서버 오류와 throttling 지표를 함께 보고 AWS Health의 공지된 장애를 확인한다.
2. 지수 백오프와 지터를 적용한다. SDK와 애플리케이션의 재시도를 함께 세어 총 시도 수와 요청 기한을 제한한다. 이 제한은 재시도로 부하와 지연이 증폭되는 것을 막기 위한 설계 기준이다.
3. 반복되는 503에는 해당 모델과 리전이 지원하는 cross-Region inference를 검토한다. Geographic profile은 정해진 지리적 범위 안에서, Global profile은 지원하는 전 세계 상용 리전에서 처리할 수 있으므로 데이터 처리 위치와 IAM/SCP 허용 범위를 먼저 확인한다.
4. 지속적으로 높은 처리량이 필요하면 지원 모델의 Provisioned Throughput을 별도 용량 선택지로 평가한다. Inference profile과 Provisioned Throughput은 현재 함께 사용할 수 없다. 구매 자원은 시간 단위로 과금되며 삭제할 때까지 과금이 이어지고, 약정에 따라 즉시 삭제하지 못할 수 있다.

복구 판단에서는 최종 실패 수만 보지 않고 요청당 시도 수, 총 지연과 성공률을 함께 본다. 모델이나 리전을 바꿨다면 응답 품질과 데이터 처리 조건도 다시 검증한다. 재시도 공통 원칙은 [[Retry-Backoff-Jitter|재시도와 백오프]], 모델 전환은 [[LLM-Failure-Handling|LLM 장애 대응]]을 따른다.

## 호출 로그는 별도로 켠다

Model invocation logging은 기본 비활성화다. 지원 호출의 요청, 응답과 메타데이터를 CloudWatch Logs나 S3로 전달하며 목적지는 같은 계정과 리전이어야 한다. `bedrock-runtime` 외의 endpoint에도 같은 로깅이 적용된다고 가정하지 않는다.

로그에는 프롬프트와 응답 본문이 포함될 수 있다. 수집 전에 허용할 데이터 종류, 접근 권한과 보존 기간을 정한다. 본문 전체를 운영 로그에 무조건 남기는 대신 민감 데이터 노출과 진단에 필요한 범위를 함께 판단한다. 큰 본문과 바이너리의 S3 저장 경로도 확인해야 CloudWatch 로그만 보고 내용이 누락됐다고 오판하지 않는다.

로그 부재는 호출 부재의 증거가 아니다. 로깅 설정, 지원 endpoint, 목적지 권한과 `ModelInvocationLogsCloudWatchDeliveryFailure` 같은 전달 실패 지표를 확인한다.

## 요청 흐름과 품질을 연결한다

다음은 RAG 애플리케이션에 적용할 계측 설계다. Bedrock이 모든 단계를 자동 기록한다는 뜻은 아니다.

- 요청의 상위 span 아래에 검색, 문맥 구성, 모델 호출과 후처리를 나눈다. SDK 자동 계측으로 보이지 않는 애플리케이션 단계는 별도로 계측한다.
- 검색한 청크와 모델에 실제 전달한 청크의 식별자와 버전을 구분한다. 검색 성공 뒤 문맥 축약에서 근거가 빠질 수 있다.
- 모델 오류와 지연 외에 근거 지지, 답변 정확도와 사용자 피드백을 별도로 평가한다. Guardrail 개입 여부 하나로 답변 정확성을 판정하지 않는다.

## 사용자 피드백을 EMF로 집계한다

Embedded Metric Format(EMF)은 구조화 로그에서 커스텀 지표를 비동기로 추출한다. 로그 수집과 보관, 생성한 커스텀 지표의 비용이 발생한다. 요청마다 달라지는 `requestId`를 dimension으로 쓰면 고유 조합마다 지표가 늘어나므로 개별 요청 추적은 로그에 남기는 구성을 검토한다.

피드백 집계에는 긍정 수와 응답 수를 함께 남기고 비율을 계산한다. 표본이 적거나 피드백이 없을 때의 경보 정책을 정하며, 응답한 사용자만의 평가를 전체 요청의 정확도로 일반화하지 않는다. EMF는 중복 지표 값이 발생할 수 있으므로 정산처럼 정확한 개수가 필요한 집계의 정본으로 사용하지 않는다.

## 출처

- [Amazon Bedrock, Troubleshooting Amazon Bedrock API Error Codes](https://docs.aws.amazon.com/bedrock/latest/userguide/troubleshooting-api-error-codes.html)
- [Amazon Bedrock, Route model inference requests across AWS Regions with cross-Region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html)
- [Amazon Bedrock, Increase model invocation capacity with Provisioned Throughput](https://docs.aws.amazon.com/bedrock/latest/userguide/prov-throughput.html)
- [Amazon Bedrock, Monitor bedrock-runtime inference using CloudWatch metrics](https://docs.aws.amazon.com/bedrock/latest/userguide/monitoring-runtime-metrics.html)
- [Amazon Bedrock, Monitor model invocation using CloudWatch Logs and Amazon S3](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html)
- [Amazon CloudWatch, Embedding metrics within logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html)

## 관련 문서

- [[CloudWatch|CloudWatch]]
- [[OpenTelemetry|OpenTelemetry]]
- [[RAG-Retrieval-Engineering|RAG 검색 품질]]
- [[LLM-Cost-Optimization|LLM 비용 최적화]]
- [[PII-Masking|로그의 민감 정보 보호]]
