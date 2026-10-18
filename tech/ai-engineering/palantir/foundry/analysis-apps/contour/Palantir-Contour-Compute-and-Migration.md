---
tags: [palantir, foundry, contour]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Contour 비용과 Pipeline Builder 전환

Interactive board마다 Spark query를 실행하며 상류 변경은 downstream 재계산을 유발한다. 문서의 기본 interactive usage rate 15는 계약별 확인 대상이다. Driver와 executor의 자원/시간 합에 적용하며 예시처럼 각 항에 적용했다면 합계에 다시 15를 곱하지 않는다. Batch dataset job은 interactive always-on 배율과 구분한다.

공통 path 재사용, join 전 filter, parameter와 무관한 비싼 계산의 materialization, 동일 입력/쿼리 cache로 비용을 줄인다. Any-match 다중 join, regex와 비유일 key는 부하가 크다. 문서는 분석당 15~20 path와 input 평균 파일 128MB 이상을 권고하지만 모든 workload의 절대 최적값은 아니다. Projection은 write 비용이 있어 반복 read가 충분할 때 검토한다.

## 운영 pipeline으로 옮기기

고정된 분석 로직의 운영에는 Pipeline Builder를 권고한다. Converter는 논리 보존을 보장하지 않는다. SPLIT/pivot conversion 미지원, type coercion과 output schema 변화, 변환되지 않은 blank parameter, timezone 차이를 확인한다. 일부 board를 제거해 변환했다면 해당 로직을 다시 넣고 전후 결과를 대조해야 한다.

## FAQ와 상세 문서의 차이

FAQ의 자동 path 갱신 불가 설명과 dashboard의 refresh-on-open 설정은 범위를 구분한다. Schedule은 저장 dataset build이며 열 때 refresh와 같은 작업이 아니다. Pivot preview 한도도 FAQ의 100 columns/10,000 values와 상세 board의 1,000 complete rows가 다르므로 하나의 보편 숫자로 통합하지 않는다.

Contour export는 FAQ 기준 100,000행이며 enrollment별 차이가 있다. Dataset 저장과 download는 별도 한도/권한을 따른다. FAQ join 예제의 aircraft 좌석 수 결과는 입력 table과 뒤바뀌어 있어 데이터 검증의 정답 예제로 사용하지 않는다. 작은 preview, chart, count와 key별 대조를 함께 수행한다.

## 출처

- [Palantir, compute-usage](https://www.palantir.com/docs/foundry/contour/compute-usage)
- [Palantir, convert-to-pipeline-builder](https://www.palantir.com/docs/foundry/contour/convert-to-pipeline-builder)
- [Palantir, faq](https://www.palantir.com/docs/foundry/contour/faq)
- [Palantir, performance-optimize](https://www.palantir.com/docs/foundry/contour/performance-optimize)

## 관련 문서

- [[Palantir-Contour]]
- [[Palantir-Pipeline-Builder]]
