---
tags: [palantir, foundry, document-intelligence]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 문서 추출의 배포, 재처리와 실패 처리

Batch template는 lightweight transform을 사용하며 preview를 지원하지 않는다. 기본은 매 build 전체 문서를 처리하는 non-incremental이고 incremental decorator를 켜면 신규 media item 결과를 append한다. 생성된 input/model RID, output과 prompt를 확인한 뒤 실행한다. 실제 배포/호출은 이 문서 작성에서 검증하지 않았다.

## Prompt와 재처리

Basic VisionLLMDocumentsExtractorInput는 user prompt만, layout-aware VisionLLMLayoutDocumentsExtractorInput는 system prompt만 사용자화한다. Layout-aware user prompt의 JSON schema는 고정해야 한다. Template를 직접 수정해 앱의 평가와 batch가 달라지게 하기보다 앱에서 변경/평가 후 다시 배포한다. 회전 등 image 전처리는 별도 pipeline과 새 media set으로 만든다.

Layout-aware JSON/schema 실패는 ERROR_RESPONSE_JSON_PARSING으로 남는다. 공급자는 상위 모델에서도 약 5% 실패할 수 있다고 설명하며 이 비율을 보장값으로 사용하지 않는다. 실패 row의 layoutInfo는 layout model 추출 결과이지 VLM 성공 결과가 아니다. filter_on_media_items로 대상을 고르고 incremental decorator를 제거해 완료로 인식된 실패 row를 다시 처리한다. 새 결과와 기존 결과의 중복/교체 정책은 downstream에서 확인한다.

THREAD_NUMBER 기본20, 개발 환경에서 최대300 시험은 보편적인 권장치가 아니다. 할당량이 부족하면 rate limit과 retry가 다른 job까지 압박한다. Telemetry에서 aip_workflows 접두사 로그를 확인한다.

## Function orchestration

Function 배포에는 foundry-platform-sdk>=1.78, chunking은 aip-workflows>=0.40.0, embedding은 openai가 필요하다. LLM import/권한과 enrollment timeout을 구성한다. 생성된 단일 page 함수를 Automate 등으로 조합하며 대량 PDF를 함수 하나에서 끝내려 하지 않는다.

예제는 transform job 생성 후 0.5초 간격으로 SUCCESSFUL/FAILED까지 polling한다. 외부 함수 timeout이 남아 있으므로 무제한 작업 보장이 아니다. TransformResult는 result/error/retryable을 구분하고 QoS의 DO_NOT_RETRY는 재시도하지 않으며 RPC/일반 Palantir error는 예제상 재시도 불가로 반환한다. 실패값을 빈 정상 text로 합치면 안 된다.

## Chunk와 embedding 계약

추출 결과는 page별 row다. create_chunks_per_document는 document ID로 page를 합친 후 자르고 create_chunks_per_row는 page마다 자른다. chunk_size8192는 character 수이며 모델 token 한도와 다르다. Function의 concat_before_chunk는 결과를 inner list 하나로 합치므로 반환 구조도 확인한다.

예제마다 extraction_result와 extractionResult column 이름이 다르다. 실제 출력 schema를 확인해 chunking input을 맞춘다. 일부 예제의 str(response.json())은 strict JSON 직렬화가 아니므로 JSON 소비자는 json.dumps를 사용해야 한다. sys.maxsize로 chunk를 사실상 생략해도 embedding 모델 context 제한은 사라지지 않는다.

## 출처

- [Palantir, deploy-to-python-functions](https://www.palantir.com/docs/foundry/document-intelligence/deploy-to-python-functions)
- [Palantir, deploy-to-python-transforms](https://www.palantir.com/docs/foundry/document-intelligence/deploy-to-python-transforms)

## 관련 문서

- [[Palantir-Document-Intelligence]]
- [[Palantir-Functions]]
