---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 외부 hosted model의 credential 위임과 egress

외부 hosted model을 Foundry model로 감싸면 version/lineage/permission과 live objective/Function 연계를 얻는다. 단순 general-purpose API나 LLM이면 Data Connection source를 외부 transform/Function에서 직접 호출하거나 AIP registered model로 연결하는 경로도 검토한다.

## 연결과 권한

URL/connection configuration은 optional이고 model metadata로 보이는 평문이다. secret은 encrypted credentials에 두고 load 때 adapter로 복호화해 전달한다. model 접근자는 외부 원본 권한이 없어도 저장된 credential을 통해 inference할 수 있으므로 이 model은 외부 권한을 위임하는 경계다.

egress policy로 endpoint 통신을 허용한다. objective와 model이 같은 project면 live egress를 자동 추가하지만 다른 project면 hosting project에 policy를 import해야 한다. Python transform은 동일 policy/필요 ExportControl을 명시적으로 설정한다.

## 지원 범위

external model은 objective batch deployment와 objective automatic evaluation을 지원하지 않는다. Python transform에서 직접 inference하는 것은 가능하므로 batch 작업 전체가 불가능하다는 뜻은 아니다. remote endpoint availability/quota/latency와 결과 JSON parsing/OOM은 별도 실패 원인이다. retry는 provider에 맞게 설계해야 하며 sample은 일반 backoff 계약을 제공하지 않는다.

## Provider 예제의 조건

| Provider | 설정과 credential | API 가정/주의 |
|---|---|---|
| Databricks | host,serving_endpoint_name / token | Python3.11.11,SDK0.55.0,pandas2.2.3 예제. records JSON,serving endpoint 권한,workspace443. sample prose URL과 code host 사용을 대조한다. |
| SageMaker | region_name,endpoint_name / access_key_id,secret_access_key | Python3.8.17,boto3 1.28.1,pandas1.5.3. runtime.sagemaker.<region>.amazonaws.com443,instances/features payload와 JSON response 가정. ClientError는 egress/endpoint/권한도 확인한다. |
| Vertex AI | project_id,region_name,endpoint_id / service-account JSON | Python3.8.17,aiplatform1.32.0/google-auth2.23.0 예제. regional aiplatform443,records input. endpoint 초기화 오류,Forbidden과 BadRequest를 구분한다. |
| Open AI | base_url,api_type,api_version,engine / api_key | source는 openai1.1.0 테스트라고 쓰지만 ChatCompletion.create와 openai.error 등 옛 API를 사용한다. 현재 SDK 호출 계약으로 복사하지 말고 설치 version의 공식 API와 대조한다. |

각 adapter는 자신이 선언한 input/output type과 실제 remote response를 맞춰야 한다. timeout/auth/permission/rate-limit 오류를 log하고 rethrow하는 예제를 자동 회복 정책이나 현재 provider 호환성 검증으로 보지 않는다.

## 출처

- [Palantir, external-model-connection](https://www.palantir.com/docs/foundry/integrate-models/external-model-connection)
- [Palantir, external-model-connection-databricks](https://www.palantir.com/docs/foundry/integrate-models/external-model-connection-databricks)
- [Palantir, external-model-connection-sagemaker](https://www.palantir.com/docs/foundry/integrate-models/external-model-connection-sagemaker)
- [Palantir, external-model-connection-vertex-ai](https://www.palantir.com/docs/foundry/integrate-models/external-model-connection-vertex-ai)
- [Palantir, external-model-connection-open-ai](https://www.palantir.com/docs/foundry/integrate-models/external-model-connection-open-ai)

## 관련 문서

- [[Palantir-Data-and-Model-Integration]]
- [[Palantir-Registered-Models-and-Provider-Proxies]]
