---
tags: [observability, aws, sagemaker, llm, metrics]
status: done
verified_at: 2026-10-07
category: "관측가능성(Observability)"
aliases: ["SageMaker LLM Observability", "SageMaker LLM 관측"]
---

# SageMaker LLM 추론 관측

LLM 운영은 추론 서버의 성능과 응답 품질을 함께 관측해야 한다. HTTP 요청 성공, 낮은 지연과 여유 있는 GPU만으로 답변의 정확성을 판단할 수 없다. SageMaker AI endpoint의 인프라 지표와 별도로 수집한 품질 평가를 같은 모델과 시간 구간으로 연결한다.

## 지표를 세 층으로 나눈다

| 층 | 확인할 신호 | 해석 경계 |
|---|---|---|
| 자원 | GPU 사용률, GPU 메모리, CPU와 인스턴스 상태 | 자원 사용률만으로 응답 품질을 판단하지 않는다 |
| 추론 | TTFT, 토큰 간 지연, 처리 토큰 수, KV cache 사용률과 대기 요청 수 | 입력 길이와 동시 요청 조건이 다르면 지연 비교가 왜곡된다 |
| 품질 | 안전성, 관련성, 정답성 등 과제별 평가 | 판정 점수는 평가 기준과 판정 모델에 의존한다 |

SageMaker의 detailed observability는 지원되는 vLLM과 SGLang 컨테이너가 내보내는 추론 지표를 수집한다. TTFT는 첫 토큰까지, 토큰 간 지연은 생성 중 토큰 사이의 시간을 나타낸다. 이 지표를 일반적인 요청 전체 지연과 혼용하지 않는다.

## 수집 설정과 조회 경로

- `EnableEnhancedMetrics`는 기존 CloudWatch 지표에 인스턴스와 컨테이너 수준 차원을 추가한다.
- `EnableDetailedObservability`는 OpenTelemetry 기반 지표 수집과 PromQL 조회를 위한 별도 기능이다. 두 플래그를 같은 것으로 취급하지 않는다.
- 기존 endpoint는 새 endpoint configuration을 만들어 detailed observability를 켜고 적용하는 절차가 필요하다. 현재 configuration의 값을 먼저 확인한다.
- 사용자 정의 컨테이너는 Prometheus 형식 지표를 노출해야 한다. 공식 설정 가이드의 포트, 경로와 `ContainerMetricsConfig` 조건을 확인한다.
- PromQL 조회에는 CloudWatch의 OTel enrichment 설정이 필요하다. 외부 Grafana 연결은 리전별 PromQL endpoint와 SigV4 인증을 사용한다. 기존 CloudWatch 데이터 소스를 연결했다는 사실만으로 이 경로가 구성됐다고 보지 않는다.

## 모델 준비 시간과 요청 지연을 구분한다

모델을 배포하거나 용량을 늘릴 때의 준비 시간과, 준비된 모델이 요청을 처리하는 시간은 다른 구간이다. Ahead-of-time compilation은 새 인스턴스에서 수행할 컴파일을 앞당기고, fast model loading은 사전 분할한 가중치를 S3에서 GPU로 병렬 스트리밍해 적재 경로를 줄인다. 적재 시간의 개선 배율을 토큰 생성 속도의 개선 배율로 옮기지 않는다.

성능 비교에서는 같은 입력과 출력 길이, 동시성 조건을 두고 다음 신호를 함께 기록한다.

| 구간 | 측정할 내용 | 해석 경계 |
|---|---|---|
| 배포와 확장 | 용량 확장 시작부터 실제 추론 가능 상태까지 | 모델 적재만 빨라져도 전체 준비 시간이 같은 비율로 줄지는 않는다 |
| 첫 응답 | 클라이언트가 요청을 보낸 뒤 첫 토큰을 받기까지의 TTFT | 서버 내부 지표와 클라이언트 측정의 시작점, 끝점을 구분한다 |
| 생성과 완료 | 토큰 간 지연, 전체 응답 수신까지의 client latency | 첫 토큰이 빨라도 긴 출력의 완료는 늦을 수 있다 |
| 성공 여부 | 호출 수, 호출 오류와 빈 응답 수 | 성공한 요청의 지연만 보고 실패가 늘어난 구성을 채택하지 않는다 |

## Scale-to-zero 복구는 오류와 함께 관측한다

실시간 endpoint의 inference component 기반 scale-to-zero는 실행 용량을 없앤 상태다. 새 인스턴스를 준비하는 데 수분이 걸릴 수 있고, 그동안 호출은 오류를 반환한다. 요청 한 번이 자동으로 보관됐다가 성공 응답을 받는 것으로 해석하지 않는다.

- 이 방식은 inference component를 호스팅하는 endpoint와 production variant의 `ManagedInstanceScaling.MinInstanceCount=0` 설정을 전제로 한다. 각 component의 최소 copy 수와 축소 정책도 따로 설정한다.
- 0에서 복구하려면 `NoCapacityInvocationFailures`를 감시하는 CloudWatch alarm과 component의 step scaling policy를 연결한다. 최소 용량을 0으로 설정한 것만으로 복구 설정이 끝나지는 않는다.
- 운영 점검에서는 용량 없는 호출 실패 수, scaling activity, 실제 첫 성공까지의 시간과 클라이언트의 재시도 결과를 함께 본다. 이는 위 동작에서 도출한 점검 기준이다.
- 사용자 대기 한도보다 복구가 느리면 상시 용량 유지 여부를 검토한다. 재시도를 채택한다면 횟수와 전체 대기 시간에 상한을 두고 실패 응답을 처리한다.

이 절은 실시간 inference component 구성의 관측 경계다. Asynchronous Inference나 Serverless Inference의 대기열과 시작 동작으로 일반화하지 않는다.

## 품질 평가는 별도 파이프라인이다

인프라 지표를 켠다고 LLM의 정답성 점수가 자동으로 생성되지는 않는다. 응답 표본에 평가를 실행하고 평가 결과를 별도 지표로 발행해야 한다. 한 구현 방식은 MLflow 판정기와 Bedrock 모델로 응답을 평가하고 CloudWatch에 결과를 보내 Grafana에서 보는 것이다.

다음은 위 구조에서 도출한 운영 점검 항목이다.

1. 모델 버전, 평가 기준과 판정 모델을 기록해 점수 변화의 원인을 구분한다.
2. 같은 시간 구간에서 요청 수, 평가된 표본 수와 평가 실패를 함께 본다. 평가가 멈춘 상태를 품질 정상으로 해석하지 않는다.
3. 지연 악화는 자원과 대기열로, 품질 저하는 입력과 평가 결과로 원인을 좁힌다. 두 현상이 함께 나타나는지도 확인한다.
4. 실제 사용자 응답 지연과 평가 자체의 지연, 비용을 구분한다. 동기 평가를 붙이면 사용자 요청 경로에도 추가 시간이 생길 수 있다.

판정기의 편향과 사람 평가를 이용한 보정은 [[Eval-LLM-Judge]], 고정 문항을 이용한 지속 감시는 [[Eval-Model-Drift-Monitoring]]에서 다룬다. 이 문서는 SageMaker의 수집과 관측 연결 범위를 다룬다.

## 출처

- [AWS, Inference optimization for Amazon SageMaker AI models](https://docs.aws.amazon.com/sagemaker/latest/dg/model-optimize.html)
- [AWS, Evaluate the performance of optimized models](https://docs.aws.amazon.com/sagemaker/latest/dg/model-optimize-evaluate.html)
- [AWS, Scale an endpoint to zero instances](https://docs.aws.amazon.com/sagemaker/latest/dg/endpoint-auto-scaling-zero-instances.html)
- [AWS, Getting started with detailed observability](https://docs.aws.amazon.com/sagemaker/latest/dg/monitoring-detailed-observability-getting-started.html)
- [AWS, OpenTelemetry metrics reference](https://docs.aws.amazon.com/sagemaker/latest/dg/inference-monitoring.html)
- [AWS, Connect to your observability tool](https://docs.aws.amazon.com/sagemaker/latest/dg/monitoring-detailed-observability-promql.html)
- [Comprehensive observability for Amazon SageMaker AI LLM inference: From GPU utilization to LLM quality — AWS](https://aws.amazon.com/blogs/machine-learning/comprehensive-observability-for-amazon-sagemaker-ai-llm-inference-from-gpu-utilization-to-llm-quality/)

## 관련 문서

- [[LLM-Inference-Bottlenecks|LLM 추론 병목과 서빙 기법]]
- [[CloudWatch|CloudWatch 수집과 알림]]
- [[Eval-LLM-Judge|LLM 판정기]]
- [[Eval-Model-Drift-Monitoring|서빙 모델 드리프트 감시]]
