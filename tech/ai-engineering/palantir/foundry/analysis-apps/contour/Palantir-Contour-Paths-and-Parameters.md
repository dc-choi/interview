---
tags: [palantir, foundry, contour]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Contour의 분석 경로와 매개변수

Contour는 dataset 중심의 탐색, 집계와 dashboard를 제공한다. Ontology로 매핑하지 않은 일회성 데이터, 큰 join/aggregate와 dataset 결과 공유에 적합하다. Path는 위에서 아래로 board의 변환/필터를 적용한다. 같은 분석 안에서는 결과를 저장하지 않고 다른 path의 입력으로 쓸 수 있다.

공통 필터와 parameter를 앞선 path에 모아 재사용한다. Dashboard의 시각적 순서와 실제 path dependency는 다르다. Board는 filter/visualize/join/transform/column 편집으로 찾고 필요한 위치에 삽입한다. 중간에서 board를 복사하거나 아래 board를 제거할 때 downstream dependency를 확인한다.

Parameter는 Date/String/Number이며 다중 값은 String/Number에서만 지원한다. Multi-value는 0개/1개여도 배열이므로 기존 scalar expression을 바꿔야 한다. Default 편집은 모든 사용자에게 적용되고 override는 현재 사용자에게만 적용되며 refresh하면 사라진다.

Linked column suggestion은 최대 1,000 unique 값이다. 같은 dataset/RV의 string parameter를 cross-filter group으로 묶으면 제한은 개별 parameter가 아닌 조합 전체에 적용된다. 목록에 없다고 원천 값이 없는 것은 아니다. Dashboard에는 실제 board가 사용하는 parameter만 나타난다. Legacy Reports는 RV suggestion과 cross-filter group을 지원하지 않는다. 새 parameter 추가 후 downstream path와 report도 갱신한다.

## 출처

- [Palantir, contour](https://www.palantir.com/docs/foundry/contour)
- [Palantir, analysis-create-path](https://www.palantir.com/docs/foundry/contour/analysis-create-path)
- [Palantir, analysis-parameterize](https://www.palantir.com/docs/foundry/contour/analysis-parameterize)
- [Palantir, boards-add](https://www.palantir.com/docs/foundry/contour/boards-add)
- [Palantir, boards-overview](https://www.palantir.com/docs/foundry/contour/boards-overview)
- [Palantir, core-concepts](https://www.palantir.com/docs/foundry/contour/core-concepts)
- [Palantir, overview](https://www.palantir.com/docs/foundry/contour/overview)

## 관련 문서

- [[Palantir-Contour]]
- [[Palantir-Pipeline-Builder]]
