---
tags: [palantir, foundry, pilot, migration]
status: done
verified_at: 2026-11-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pilot Project Import", "Pilot 외부 프로젝트 가져오기"]
---

# Pilot 외부 프로젝트 가져오기

Foundry 밖에서 만든 애플리케이션의 source code를 ZIP으로 올리면 Pilot이 코드를 읽고 사용자와 migration 계획을 세운 뒤 React, Vite와 Ontology SDK(OSDK)를 쓰는 Pilot application으로 다시 만든다. Django나 Electron처럼 다른 framework로 만든 프로젝트도 이 기술로 변환한다. 원본의 page, flow와 visual design은 유지하고 data model은 Ontology로 옮긴다. 변환이 끝난 앱은 다른 Pilot application과 같은 방식으로 다듬고 배포한다.

필요한 파일은 앱으로 옮기지만 구조는 다시 만든다. Pilot은 원본 앱을 실행하지 않고, server-side code나 secret이 필요한 기능은 Foundry equivalent나 not supported로 분류하며, table을 그대로 옮기지 않고 Ontology 모델로 바꾼다. 인증 코드를 지우고 sign-in을 Foundry에 맡기는 것은 공식 예시 prompt가 정한 규칙이다.

## ZIP 준비

- 크기는 10 MB까지다. Source code, asset, Pilot이 모델링할 database schema나 data file을 넣는다.
- `node_modules`, `.git`, 가상 환경과 build output은 뺀다.
- Production 데이터와 secret은 넣지 않는다.

## 가져오기 절차

Pilot welcome screen에서 진행한다.

1. **Type** 선택지가 보이면 **OSDK application**을 고른다.
2. Migration prompt를 쓴다. 공식 예시는 ZIP을 `/tmp`에 풀어 data file은 schema와 일부 행만 읽고, 데이터가 실제인지 sample인지, 먼저 만들 page, Pilot이 실행할 수 없는 integration의 대체 수단을 묻게 한다. 이어 page, feature table, object type을 담은 계획을 쓰고 각 feature에 migrates, uses a Foundry equivalent, not supported 중 하나의 상태를 붙인 뒤 `- [ ]` checklist로 끝내게 한다. 승인되면 `docs/migration-plan.md`에 저장하고, 필요한 파일만 앱으로 복사하며(풀어 둔 폴더는 임시다), 항목을 끝낼 때마다 checklist를 표시하게 한다.
   같은 prompt의 규칙으로 sign-in은 Foundry가 맡으니 인증 코드를 지우고, secret을 복사하지 않고, 사용자는 Foundry user ID로 나타내고, data model은 Ontology에 맞게 바꾸되 기존 object type을 가능하면 재사용하고, 원본의 asset, 색과 font를 유지하게 한다. 관리자 page 제외 같은 자체 규칙이나 원본 source를 `reference/`에 참고용으로 복사하라는 규칙을 더할 수 있고, 원본 주요 page의 screenshot을 첨부하면 design을 맞추는 데 도움이 된다.
3. **Add context**에서 **Add files**로 ZIP을 첨부하거나 prompt 입력란에 끌어 놓는다.
4. **Theme**에서 원본 design을 유지하려면 **Custom components**, Foundry 스타일 interface로 바꾸려면 **Blueprint components**를 고른다.
5. **Ontology** field 아래의 Ontology permissions를 확인한다. 새 type 생성을 허용하려면 **Modify Ontology permissions**에서 **Allow Pilot to create new object types**와 **Allow Pilot to create new action types**를 켜고 저장한다.
6. **Create application**을 누른다.

## 계획 검토와 중단 후 재개

첫 prompt는 Act mode로 실행돼 ZIP을 임시 폴더에 풀 수 있지만 원본 프로젝트는 실행하지 않는다. Pilot은 질문을 하고 page, feature와 object type을 담은 계획을 쓴다. 결제, 이메일, 예약 작업처럼 server-side code나 secret이 필요한 feature는 Foundry equivalent 사용이나 not supported로 표시된다.

Chat panel에서 답하고 수정을 요청한다. 승인하면 계획이 `docs/migration-plan.md`에 저장되고 Pilot이 checklist를 따라 작업하며 **Preview** tab이 page마다 갱신된다. 올린 ZIP은 session을 넘어 유지되지 않는다. Migration이 멈추면 `Continue the migration in docs/migration-plan.md`라고 입력해 이어 간다. 풀어 둔 폴더도 임시라서, 새 session에는 앱으로 복사한 파일과 계획 파일만 남는다고 보는 편이 안전하다(공식 문서의 세 진술을 조합한 추론이다). 원본 source를 계속 참고하려면 `reference/`로 복사하라는 규칙을 처음 prompt에 넣는다.

## 데이터는 Ontology 모델로 바뀐다

Pilot은 database schema, ORM model, JSON, CSV, SQLite 파일 같은 원본 데이터의 schema와 몇 행을 읽고 다음처럼 대응시킨다.

| 원본 프로젝트 | Ontology |
| --- | --- |
| Table, model, record 집합 | Object type |
| Column, field | Property |
| Foreign key, 중첩 record | Link type |
| 데이터를 생성, 수정, 삭제하는 operation | Action type |

기존 object type을 가능하면 재사용하고, 새 type은 Ontology permissions가 허용할 때만 만든다. 특정 type을 쓰게 하려면 welcome screen의 **Add context**에서 **Add object types**나 **Add action types**로 지정한다.

Preview용으로 Pilot은 원본 데이터를 seed data로 최대한 비슷하게 재현하려 하며, 원본이 실제 데이터면 값을 옮기는 대신 같은 구조의 seed data를 생성할 수 있다. Seed data는 배포되지 않는다. Production에서 데이터를 쓰려면 Pipeline Builder 등으로 Foundry에 따로 들여와야 한다. 따라서 preview에서 앱이 원본처럼 보이는 것을 production 데이터 이관 완료로 보지 않는다. Seed와 production preview의 경계는 [[Palantir-Pilot-Data-and-Agent-Context-Boundaries|Pilot 데이터와 agent context의 경계]]를 따른다.

## 점검할 것

- ZIP에 production 데이터와 secret(secret이 든 `.env` 같은 설정 파일 포함)이 들어가지 않았는가
- Feature table의 not supported와 Foundry equivalent 항목을 실제 대체 수단과 함께 결정했는가
- 새 object type, action type 생성 허용이 의도한 범위인가, 재사용할 기존 type을 지정했는가
- Production 데이터 파이프라인을 앱 이관과 별도 작업으로 계획했는가

## 출처

- [Palantir, Import an existing project from outside Foundry](https://www.palantir.com/docs/foundry/pilot/import-a-project)

## 관련 문서

- [[Palantir-Pilot]]
- [[Palantir-Pilot-Data-and-Agent-Context-Boundaries|Pilot 데이터와 agent context의 경계]]
- [[Palantir-Pilot-Application-and-Widget-Release|Pilot 앱과 widget 발행]]
