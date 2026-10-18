---
tags: [palantir, workspace, data, osdk, model]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workspace 데이터와 모델 통합"]
---

# Workspace 데이터와 모델 통합

Dataset/model alias는 resource RID와 `.foundry`의 mapping이다. File 이름이나 UI 이름을 hardcode하는 대신 등록한 alias를 사용한다. 기본 dataset read는 workspace와 같은 branch, 없으면 master로 fallback하며 개별 input branch를 pin할 수 있다.

## Logical table과 file collection

Schema가 있으면 `read_table`/SQL이 여러 backing file을 logical table로 읽는다. 파일 수/동적 이름 때문에 raw file로 바꿀 필요는 없다. Arrow/Pandas/Polars/lazy-polars/path는 필요한 package와 memory 의미가 다르며 lazy-polars의 filter 제한을 확인한다.

Non-tabular는 filename→local path map을 받아 전체 item을 순회한다. Local path는 변할 수 있어 map key를 기준으로 한다. File metadata(path/size/transaction/time) filter를 적용하면 여러 개별 download보다 병렬 경로를 활용할 수 있다. 예제의 Python/R 변수 혼용과 괄호 오류는 그대로 실행하지 않는다.

Single node memory에 맞게 column/row pushdown 또는 SQL로 줄인다. Parquet만 row filter를 지원하는 direct read 경로와 CSV column filter를 구분한다. `limit/head`는 다른 filter 전에 적용되는 의미이므로 filter 후 N개의 결과와 다를 수 있다. R select는 filter에 쓰는 column도 포함해야 한다.

SQL executor는 지원되는 dataset/view/Iceberg/virtual table을 조회하고 PyArrow로 결과를 받는다. 한 SELECT당 하나의 dataset과 기본 백만 행 제한을 명시한다. Parallel query를 합쳐도 최종 result가 local memory에 들어가야 한다. Dataset view는 직접 import 미지원 안내와 SQL-query 지원을 구분한다.

## Write transaction과 sandbox

Interactive table write는 호출당 SNAPSHOT, file upload는 UPDATE가 기본이다. Script를 transform으로 등록하면 interactive write는 `code-workspace-sandbox/` branch에 쓰고 실제 transform run이 current branch를 갱신한다. Script 전체 실행은 여러 SDK write여도 transaction 하나이며 기본 SNAPSHOT, incremental 설정이면 APPEND다. 일반 비교표의 incremental 미지원 설명보다 등록 transform의 세부 범위를 확인한다.

Output 등록은 alias/변수 또는 file path와 snippet을 만들 뿐 실제 write가 아니다. Publish CI/JobSpec 등록 뒤에도 실제 build output을 확인한다. Notebook의 자동 input/output 추론은 검토 가능한 제안이며 틀리면 수동 수정한다.

## Workspace SDK는 생성과 설치가 별도다

Workspace당 하나의 Ontology SDK와 여러 version을 만들 수 있다. Package name은 publish 뒤 바꿀 수 없고 Ontology 변경은 선택한 object/action/link 범위를 초기화한다. Action에 필요한 object와 backing source Project import도 포함한다. SDK status Published를 확인한 뒤 해당 version을 설치하고 client를 초기화한다.

Backing source를 추가하는 확인 창은 해당 데이터가 현재 Project의 다른 사용자에게 보일 수 있다고 경고한다. 따라서 SDK에 객체를 추가할 때는 생성 패키지의 범위뿐 아니라 자동으로 가져오는 원천과 Project의 공유 대상도 검토한다. [원천 가져오기 화면](https://www.palantir.com/docs/resources/foundry/code-workspaces/backing-data-source-dialog.png) (2026-10-18 화면 대조)

같은 가이드의 초기 SDK 설정 이미지에는 Ontology 선택을 되돌릴 수 없다는 문구가 남아 있지만, 본문의 `Change the selected Ontology` 절은 변경 후 범위 초기화와 새 버전 생성을 설명하고, 변경 선택기 이미지의 tooltip도 Ontology를 바꾸면 현재 선택이 지워진다고 안내한다. 초기 화면 문구만으로 현재 변경을 금지하지 않는다. Developer Console에서 생성한 OSDK의 Ontology 고정 규칙과도 구별한다. [Workspace 가이드](https://www.palantir.com/docs/foundry/code-workspaces/ontology), [Developer Console 앱 생성](https://www.palantir.com/docs/foundry/developer-console/create-application) (2026-10-18 이미지와 본문 간 차이 확인, 실제 변경 미시험)

RV-backed entity/query function은 해당 workspace 가이드에서 미지원이다. R은 reticulate로 Python SDK를 쓰며 integer가 필요한 인자에는 `1L` 같은 명시 type이 필요하다. Action validation 성공과 실제 apply는 다른 호출이다. 예제의 validation/apply 값이 달라지면 검증한 요청과 실행 요청이 달라진다. Time-series property는 OSDK object에서 foundryts로 연결한다.

## Model version과 추론 deployment

Jupyter model asset은 alias와 별도 `.py` adapter를 사용한다. Alias를 바꾸거나 adapter를 옮기면 generated import/class명을 수정한다. ModelOutput.publish는 새 model version을 만들고 ModelInput은 current/지정 branch latest 또는 exact version RID를 선택한다. Downloaded weights와 adapter code/dependency도 함께 재현해야 한다.

Workspace inference deployment는 model version당 공유되며 여러 session이 같은 deployment를 사용한다. Modeling Objective live deployment와 별개이고 기본 20분 idle shutdown이다. 40MB 단일 요청 제한과 dataset 하나만 지원하는 chunking을 확인한다. Readiness 대기/scale/predict/disable의 실제 client 변수도 맞춘다. 이 경로를 대규모 production inference로 확대하지 않는다.

Model output notebook도 dataset과 함께 transform으로 등록하고 schedule할 수 있다. Palantir-provided chat/embedding model은 AIP enable, import와 `palantir_models` library가 필요하다. 문서의 gpt_v4/ada-002 예제는 모든 enrollment의 현재 model 가용성 보장이 아니다. Embedding PCA 2D plot은 시각화이며 retrieval 품질이나 원래 공간의 거리 보존을 검증하지 않는다.

## 출처

- [Palantir, Workspace data](https://www.palantir.com/docs/foundry/code-workspaces/data)
- [Palantir, Ontology in Workspaces](https://www.palantir.com/docs/foundry/code-workspaces/ontology)
- [Palantir, Train and interact with models](https://www.palantir.com/docs/foundry/code-workspaces/training-models)
- [Palantir, Palantir-provided models](https://www.palantir.com/docs/foundry/code-workspaces/palantir-provided-models)
- [Palantir, JupyterLab](https://www.palantir.com/docs/foundry/code-workspaces/jupyterlab)

## 관련 문서

- [[Palantir-Workspace-Security-and-Egress|Lineage와 policy]]
- [[Palantir-Workspace-Applications-and-Environments|실행 환경과 publish]]
- [[Palantir-Data-and-Model-Integration|모델 운영 지식]]
