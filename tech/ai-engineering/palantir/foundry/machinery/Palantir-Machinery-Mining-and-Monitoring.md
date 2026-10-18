---
tags: [palantir, machinery, process]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Machinery mining과 모니터링 해석

## 관측과 정의의 차이

Process mining은 실제 관측된 상태/transition을 기존 정의에 겹쳐 보여 준다. Amber는 추가 후보, gray는 기존 정의에 있는 관측, dashed는 현재 데이터에 나타나지 않은 정의다. 관측되지 않았다는 사실만으로 불필요한 경로나 오류라고 확정하지 않는다.

최신 process object만으로 상태를 찾을 수 있지만 transition과 시간 분석에는 log를 권장한다. Transition filter는 빈도순 누적 비율의 상위 x%를 유지하므로 희귀하지만 중요한 실패 경로를 숨길 수 있다. Excluded elements는 저장 후에도 유지되므로 이후 데이터 변화 때 재검토한다.

## Widget의 입력과 선택

Workshop의 v2 widget은 Machinery v2 resource를 사용한다. 기존 widget은 설정과 input을 함께 업그레이드한다. Root process별 object set을 넣으면 configured link로 child process object set을 도출한다. Root와 subprocess를 모두 독립 입력으로 줘야 한다고 가정하지 않는다.

Historical/current count와 duration은 구분된 metric view다. Node 선택은 현재 그 상태/과거에 거친 상태로, edge 선택은 모든 과거 transition/마지막 transition으로 설정할 수 있다. 이 선택은 output object set의 의미를 바꾼다.

Path explorer의 path 선택은 앞선 node/edge 선택을 덮어써 output을 결정한다. Duration distribution은 graph 선택과 bucket 선택을 결합해 outlier를 찾는다. 화면에서 보이는 것과 output에 포함되는 것을 각각 확인한다.

## Conformance와 대규모 입력

기본 widget metric은 정의에 맞는 process만 계산하며 정의 밖 상태/transition은 제외한다. 그러나 graph의 log object type 하나라도 100만 object를 초과하면 conformance filtering을 끄고 전체 input으로 metric과 output을 계산한다. 데이터가 늘면 분석 모집단이 바뀔 수 있으므로 임계값 전후 비교에 주의한다.

Deviation은 기본 숨김이며 graph 표시와 output 포함 여부를 따로 설정할 수 있다. Sankey 두께, current duration과 historical duration은 같은 업무 질문에 대한 값이 아니다. 지연된 log와 필터를 고려해 병목과 SLA 위반을 판정한다.

## 출처

- [Palantir Foundry, analyze-and-monitor](https://www.palantir.com/docs/foundry/machinery/analyze-and-monitor/)
- [Palantir Foundry, process-mining](https://www.palantir.com/docs/foundry/machinery/process-mining/)

## 관련 문서

- [[Palantir-Foundry-Machinery]]
