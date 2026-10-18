---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Machinery process 상태와 로그 계약"]
---

# Machinery process 상태와 로그 계약

## 현재 상태와 관측 이력

Process Mining은 Machinery의 이전 이름이다. Process object는 열거 가능한 string state property와 정확히 하나의 현재 상태를 가진다. 서로 독립된 상태 축은 별도 process/hierarchy로 모델링한다. State ID는 실제 데이터의 string이며 display label과 구분한다.

Log object는 한 property의 변화에 대응한다. 내부 Action으로 자동 생성하는 로그에 임의 Action을 추가하는 것과 외부 change log를 수집하는 것을 혼합하지 않는다. 외부 입력의 process ID/state/timestamp와 선택적 isDeleted가 현재 상태를 결정하며 최신 isDeleted=true인 process는 존재하지 않는 것으로 취급한다.

수동 로그 schema에는 logId/processId/old state/new state/timestamp가 필요하다. isLatest는 선택적이고 duration은 Long 밀리초다. Path는 JSON을 직렬화한 string이며 array column이 아니다. ID 유일성, timestamp 순서와 동일 시각의 결정 규칙은 실제 입력에서 별도 검증해야 한다.

## 정의와 실제 관측

정의 graph는 허용되거나 기대하는 전이를, operational widget은 실제 로그의 전이를 나타낸다. Unexpected transition은 업무 위반뿐 아니라 누락/순서/매핑 오류일 수 있으므로 관측만으로 원인을 확정하지 않는다. Expected transition filter는 표현을 바꾸며 원본 이력을 정정하지 않는다.

자동 로그는 비동기라 상태 개수 외 집계가 실제 object보다 늦을 수 있다. Last updated는 기본적으로 최신 log 시각이며 실제 object 변경 시각과 같다는 보장은 없다. Process/log object set과 linked search-around가 일치해야 기간과 집계의 모집단을 비교할 수 있다.

Live Mining은 log set에서 상태와 edge를 도출한다. 입력 변경으로 layout이 재설정될 수 있으며 이 모드에서는 automation을 사용할 수 없다. Graph가 실제 경로를 관측했다는 것과 해당 경로가 승인됐다는 것은 다르다.

확보한 setup/operationalize 일부는 중국어 자동 번역의 역사적 문서다. 외부에서 mined process가 read-only라는 설명과 내부/외부 로그 조정의 제한은 그 문서 범위로 보존하며 모든 최신 enrollment의 기능 부재로 일반화하지 않는다. 실제 상태 변경이나 automation 실행은 하지 않았다.

## 출처

- [Palantir process-mining, process-mining](https://www.palantir.com/docs/foundry/process-mining)
- [Palantir process-mining, core-concepts](https://www.palantir.com/docs/foundry/process-mining/core-concepts)
- [Palantir process-mining, overview](https://www.palantir.com/docs/foundry/process-mining/overview)
- [Palantir process-mining, process-mining-operationalize](https://palantir.com/docs/zh/foundry/process-mining/process-mining-operationalize/)
- [Palantir process-mining, process-mining-setup](https://palantir.com/docs/zh/foundry/process-mining/process-mining-setup/)

## 관련 문서

- [[Palantir-Workflow-Operations]]
