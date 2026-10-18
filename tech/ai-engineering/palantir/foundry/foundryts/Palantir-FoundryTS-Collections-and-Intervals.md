---
tags: [palantir, foundry, foundryts]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# NodeCollection의 cardinality와 local memory

NodeCollection은 FunctionNode/SummarizerNode를 모은 iterable이다. raw series 결과에는 series ID 또는 points alias를 담은 series column이 추가된다. non-uniform collection의 columns/types는 각 결과 schema의 합집합이므로 모든 row에 모든 값이 있는 것은 아니다.

## 단일 연산과 다중 연산

scale처럼 single-series input을 요구하는 함수에 collection을 직접 넘기면 오류다. nc.map(F.scale(10))으로 각 series에 적용한다. sum/mean/distribution처럼 여러 input을 합치는 함수와 map으로 독립 적용하는 것은 결과 의미가 다르다. scatter는 정확히2series를 받는다.

## Resolve의 비용

to_dataframe(numPartitions=16)은 query를 Spark executor에 분산해 concatenate한다. partition 수는 collection 크기,executor 수와 memory에 맞춘다. to_pandas(parallel=4,mode=thread)는 각 query 결과를 local에 저장하고 합치므로 전체가 memory에 들어가야 한다. process/thread와 과한 parallelism은 memory/overhead를 늘릴 수 있다. parallel=1은 병렬화를 하지 않는다.

to_rdd는 version1.0.0부터 deprecated다. collection이 lazy로 조립됐다는 사실과 실제 local materialization 가능성을 구분한다.

## Interval과 분할

Interval은 start-inclusive/end-exclusive와 optional name/metadata다. start/end는 codex Timestamp,start/end_native는 native값,start/end_ns는 nanosecond 표현이다. end 기본값 설명에 Timestamp.min이 중복 기재되어 있으므로 필요한 bound를 명시하고 실제 library를 확인한다.

map_intervals는 모든 series에 각 interval의 time_range를 만들어 interval.start/end와 optional alias column을 붙인다. 겹치는 interval이면 같은 원본 point가 여러 range 결과에 나타날 수 있다. 이후 map으로 range별 계산하며 전체 series 집계와 결과 cardinality가 다르다.

## 출처

- [Palantir, node-collection](https://www.palantir.com/docs/foundry/foundryts/node-collection)
- [Palantir, interval](https://www.palantir.com/docs/foundry/foundryts/interval)

## 관련 문서

- [[Palantir-FoundryTS-Query-and-Ontology]]
- [[Palantir-FoundryTS-Time-Search]]
