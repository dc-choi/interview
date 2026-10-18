---
tags: [palantir, foundry, pipeline-builder, data-engineering]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder LLM cache와 평가 계약"]
---

# Pipeline Builder LLM cache와 평가 계약

Use LLM node는 data row를 prompt에 넣어 batch 처리를 수행한다. AIP custom-workflow 권한이 필요하고 Palantir 모델 외에도 REST API/compute-module 기반 registered model을 선택할 수 있다. Non-retryable error 시 fallback 목록을 순서대로 시도하고 model switch debug 메시지를 남긴다.

## Prompt와 schema

Classification은 single/multiple/exact multiplicity, summarization은 words/sentences/paragraphs 목표, extraction은 field type을 구성한다. 이들은 prompt 지시이며 의미 정확성의 보장이 아니다. Create prompt 뒤 template 화면으로 돌아갈 수 없으며 preview는 처음 50 row만 표시한다.

Vision은 vision-capable model과 media-reference column을 요구한다. Use LLM 안내는 media set 직접 입력 대신 table-row 변환을 요구하는 반면 media guide는 table read mode를 직접 지원한다고 설명한다. Node별 입력 계약을 확인하고 generic file reference와 실제 media set reference도 구분한다.

Struct output은 strict parsing이며 불일치하면 coercion error를 낸다. String JSON output 뒤 별도 parse를 쓰면 오류 처리를 분리할 수 있다. Include errors는 원래 값과 error string의 struct로 타입을 바꾼다. Trial의 raw initial prompt에는 backend 추가 내용, 중간 실패 output, correction과 final output이 포함되어 원래 작성 prompt만으로 실제 요청을 재현했다고 보지 않는다.

## Cache key와 재계산

Skip recomputing rows는 실제 prompt에 쓰인 column/parameter 값이 같으면 이전 output을 재사용한다. 사용하지 않은 column만 바뀌면 cache hit이 될 수 있다. 이전 error/null output은 다음 run에서 다시 계산한다. Source는 값 기반 설명과 함께 physical row 차이도 cache를 무효화할 수 있다고 하므로 deterministic upstream dedup/filter와 stable representative를 요구한다.

Prompt/model 변경은 cache clear가 필요할 수 있다는 warning이 나타나며 output type 변경은 자동 clear한다. Clear는 snapshot과 전체 row 재처리를 유발한다. Shared cached node의 downstream output은 같은 job group에 넣어야 한다. Cache dataset의 실용적 row 수 제한 없음 설명을 storage/cost나 service capacity가 무한하다는 뜻으로 해석하지 않는다.

## 평가의 비교 기준

Edit 권한으로 isolated evaluation을 실행하고 expected input/output와 evaluator를 구성해 결과 dataset에 저장한다. Exact string은 기본 case/whitespace-sensitive, array는 기본 order-sensitive다. Integer range는 integer만, numeric exact는 integer/long/float/double/short를 지원한다.

Generic exact는 numeric와 date/timestamp를 coercion하고 object/object-set은 reference, struct/map은 unordered key-value, list는 ordered elements, model은 ID/parameter로 비교한다. Type-specific evaluator가 있으면 그 세부 옵션과 타입 검사를 우선 고려한다. Temporal/numeric range, edit distance, keyword, regex, length도 각 기준을 확인한다.

LLM-as-judge는 검증 가능한 assertion을 조건으로 쓰며 object locator/RID/object-set/model 같은 reference type을 actual value로 받지 않는다. Judge 통과는 독립적 사실 검증이나 production 무오류 증거가 아니다. Evaluation과 trial은 실제 전 데이터의 drift/실패를 대체하지 않는다.

## 동시성과 assistant

Spark node는 core당 여러 thread로 요청한다. Core 증가가 provider/AIP rate limit과 retry를 늘릴 수 있어 default XS를 기준으로 job duration과 총 task runtime을 함께 비교한다. 요청은 LMS에 직접 가는 대신 functions executor로 routing되어 LLM 비용 외 executor usage도 발생한다.

Generate는 metadata로 transform logic을 제안하고 Explain은 connected single-output graph의 논리를 요약한다. 이름/설명을 적용하면 collaborator에게 보존된다. Regex/timestamp helper와 proposal description은 제안이며 generated logic을 시험해야 한다. 이 문서는 모델 호출, cache hit 또는 평가 실행을 직접 검증하지 않았다.

## 출처

- [Palantir Pipeline Builder, evaluation-suite](https://www.palantir.com/docs/foundry/pipeline-builder/evaluation-suite)
- [Palantir Pipeline Builder, pipeline-builder-aip](https://www.palantir.com/docs/foundry/pipeline-builder/pipeline-builder-aip)
- [Palantir Pipeline Builder, pipeline-builder-llm](https://www.palantir.com/docs/foundry/pipeline-builder/pipeline-builder-llm)

## 관련 문서

- [[Palantir-Pipeline-Builder]]
- [[Palantir-Pipeline-Transforms]]
- [[Palantir-Pipeline-Expressions]]
