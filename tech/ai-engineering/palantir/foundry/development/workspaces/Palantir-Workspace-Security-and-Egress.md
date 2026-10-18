---
tags: [palantir, workspace, security, restricted-view, egress]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workspace credential, restricted output와 egress"]
---

# Workspace security와 egress

Workspace는 terminal과 code 실행을 가진 general-purpose authoring 환경이다. Extension/MCP/AI tool도 session이 지원하는 사용자 권한을 행사할 수 있다. 도구가 권한을 새로 늘리지는 않지만 read-only UI라는 가정도 성립하지 않는다.

## Credential scope와 사용자 권한의 교집합

Foundry request는 workspace credential의 operation/resource scope와 현재 user permission을 모두 통과해야 한다. 지원되는 authoring write/discovery는 포함하지만 broad administration은 제외한다. 같은 Project에 있다는 사실만으로 접근하지 못하며 role/Org/Marking/granular policy도 적용된다.

Data input을 load하기 전에 등록해 lineage와 mandatory control을 전파한다. 한 input의 Marking 접근을 잃으면 workspace와 지원 output 접근도 막힐 수 있고 전파에는 짧은 지연이 있을 수 있다. Session별 data state는 사용자 간 공유하지 않는다.

Audit log는 Foundry service가 받은 request의 근거이며 local terminal/editor/AI conversation 전체 transcript가 아니다. AI tool 한 번이 여러 service request를 만들 수도 있다. 반복 request 수를 사용자 명령 횟수로 곧바로 환산하지 않는다.

## Restricted outputs는 output/egress를 제한한다

Restricted View는 Jupyter에서만 읽는 경로이며 restricted outputs mode를 enable하고 restart해야 한다. Dataset/model/table 쓰기, telemetry/log와 data checkpoint upload를 막고 network policy/source를 비활성화한다. Code checkpoint는 남으므로 data를 code에 넣지 않는다.

Jupyter application 전용 가이드는 Dash/Streamlit이 Restricted View를 input으로 쓰며 사용자별 policy를 적용한다고 설명한다. 공통 security/data 가이드의 출력 금지와 구분한다. 이를 RV-derived dataset/model export 허용이나 모든 app의 지원으로 확대하지 말고 실제 app publish 경로/버전과 정책을 검증한다. Mode 변경도 restart 전후를 확인한다.

RV policy가 사용자마다 달라 같은 code도 다른 row를 볼 수 있다. Loaded input policy/access가 바뀌면 workspace 접근을 잃고 새 session이 필요할 수 있다. Ontology의 RV-backed entity 사용은 별도이며 workspace OSDK 가이드는 미지원으로 명시한다.

## Sources와 exportable Marking을 함께 평가한다

Interactive/app 외부 연결은 source가 network egress policy를 대체하는 우선 경로다. CBAC 환경은 예외이며 published transform은 source/외부 API를 지원하지 않는 범위다. Source의 API name, repository import enable, workspace 추가와 restart가 필요하다.

Jupyter는 `containers-external-systems-python`, R은 Python/reticulate로 source와 secret/HTTPS client를 사용한다. Secret을 code에 쓰거나 출력하지 않는다. Published app의 Advanced에 source도 포함해야 하며 viewer는 포함된 모든 source 접근을 요구한다.

Export enabled source의 exportable marking과 workspace 전체 input lineage를 비교한다. 하나라도 허용되지 않은 Marking dataset과 source는 같이 쓸 수 없다. 새 dataset load를 막거나 startup conflict를 내며 source/input을 제거하고 checkpoint 없이 restart해야 해결되는 경로다. 특정 함수에서 그 dataset을 안 쓴다는 이유로 workspace 전체 검사를 생략하지 않는다.

## Download와 CSP는 승인된 경로를 쓴다

IDE native upload/download와 app download button은 제한된다. 필요한 file은 dataset에 write한 뒤 Foundry의 export/justification/limit을 따른다. CSP는 arbitrary CDN JavaScript를 막으며 folium/pandasgui 등 미지원 package의 우회 로딩으로 해결하지 않는다. Unauthorized는 browser/session뿐 아니라 input Marking 권한 상실도 조사한다.

## 출처

- [Palantir, Workspace security](https://www.palantir.com/docs/foundry/code-workspaces/security)
- [Palantir, Interact with data](https://www.palantir.com/docs/foundry/code-workspaces/data)
- [Palantir, External systems](https://www.palantir.com/docs/foundry/code-workspaces/external-systems)
- [Palantir, JupyterLab](https://www.palantir.com/docs/foundry/code-workspaces/jupyterlab)
- [Palantir, Workspace troubleshooting](https://www.palantir.com/docs/foundry/code-workspaces/troubleshooting)

## 관련 문서

- [[Palantir-Security-and-Governance|Foundry policy]]
- [[Palantir-Checkpoint-Scope-and-Evidence|사용자 interaction 감사]]
- [[Palantir-Workspace-Data-and-Model-Integration|Input과 output 의미]]
