---
tags: [palantir, data-connection, sync, virtualization]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 데이터 연결 Capability와 코드 사용의 경계

같은 source에서도 데이터를 복사하는 sync, 외부에 남기는 virtualization과 외부 상태를 바꾸는 export는 다른 계약이다. 아래는 Core concepts의 공식 설명이며 실제 실행 검증은 아니다.

## 수집과 외부 쓰기

| Capability | 결과와 범위 |
| --- | --- |
| File/table batch sync | 스키마 없는 파일 또는 타입을 매핑한 표를 Foundry dataset에 쓴다. |
| Iceberg sync | 표준 dataset 대신 Foundry Iceberg table로 쓴다. Foundry worker와 지원 connector가 필요하다. |
| Streaming sync | 메시지 큐 등의 데이터를 stream으로 받는다. |
| CDC sync | Stream에 변경 이력 metadata를 함께 전파한다. |
| Media sync | PDF, 이미지와 영상 등을 media set에 가져온다. |
| HyperAuto | 시스템 schema와 파이프라인, Ontology 구성을 자동화한다. 읽은 문서는 SAP만 지원한다고 명시한다. |
| File/table/stream export | Dataset의 파일, schema 있는 행 또는 stream record를 외부 대상에 쓴다. |
| Webhook | 외부 시스템에 구조화된 요청을 보낸다. |
| Virtual table/media | 외부 데이터를 등록해 사용한다. 특히 virtual media는 파일을 Foundry로 복사하지 않는다. |
| Exploration | 외부 데이터와 schema, 연결과 권한을 대화형으로 살핀다. |

Batch sync 한 번은 출력 dataset의 단일 transaction으로 기록된다. 실행 중 실패하면 abort하여 해당 실행의 부분 데이터가 commit되지 않고 이전 상태를 유지한다. 이 보장을 여러 dataset이나 외부 export까지의 분산 transaction으로 해석하지 않는다.

## 코드 경로의 차이

Foundry worker source는 코드에서 사용할 수 있지만 legacy agent worker source는 사용할 수 없다. Core concepts는 cloud identity, outbound application과 OIDC 같은 일부 자격 증명 유형도 코드에서 사용할 수 없을 수 있다고 주의한다. 실제 선택한 유형의 전용 문서와 런타임 지원을 다시 확인한다.

| 코드 경로 | 문서의 역할 |
| --- | --- |
| External transforms | Python으로 batch 수집/export, media sync와 virtual 자원 등록을 구현한다. |
| External functions | 기존 webhook을 감싸거나 TypeScript fetch/Python requests로 직접 요청한다. |
| Compute modules | 장시간 연산과 여러 언어를 사용하며 streaming/CDC/webhook의 코드 대안이 된다. |
| External models, Code Workspaces | 해당 개념 문서에서는 source 직접 import 대신 egress policy 사용으로 설명한다. |
| Code Workbooks | 해당 개념 문서는 외부 연결을 지원하지 않는다고 설명한다. |

연결 가능한 코드 실행 환경과 가져올 수 있는 자격 증명은 다른 조건이다. 다른 제품 문서가 지원을 확대했을 수 있으므로 이 표를 모든 버전에 고정된 기능 목록으로 사용하지 않는다.

구체적인 OIDC 및 Sources in Python 문서는 S3 Cloud Identity/OIDC와 BigQuery, Databricks, Snowflake OIDC의 세션 credential 접근을 제공한다. Core concepts의 포괄적 주의와 이 구체적 지원 목록을 함께 읽는다. [[Palantir-Source-Identity-and-Code|Source의 신뢰 관계와 코드 접근]]에서 차이를 다룬다.

## 탐색과 Marketplace 재사용

Source exploration은 수집 전 sample과 테이블 관계, 파일 후보를 미리 보는 기능이다. 모든 table source에 관계 graph가 제공되지는 않으며 table 기반 REST API처럼 관계가 명확하지 않은 경우 graph가 없다. Sample preview를 전체 데이터 검증으로 취급하지 않는다.

Marketplace에는 batch/streaming sync와 export를 제품에 포함할 수 있다. Virtual table도 포장할 수 있지만 개별 Source 자체와 auto-registration을 켠 Source의 포장은 지원하지 않는다고 문서는 명시한다. 설치 대상 Source에는 원본과 같은 위치와 schema의 table이 있어야 한다. 제품 설치가 외부 원천 table까지 복제한다는 뜻은 아니다.

기존 Java plugin의 custom task는 sunset 단계다. 문서는 신규 개발을 중단했지만 지원은 남아 있고 향후 deprecated될 예정이라고 설명한다. 이를 이미 실행 불가능한 기능으로 바꿔 적지 않는다. 새 흐름은 코드 기반 연결로 이전할 것을 권고한다.

## 출처

- [Palantir, Core concepts](https://www.palantir.com/docs/foundry/data-connection/core-concepts)
- [Palantir, Source exploration](https://www.palantir.com/docs/foundry/data-connection/source-exploration)
- [Palantir, Marketplace syncs and exports](https://www.palantir.com/docs/foundry/data-connection/marketplace-data-connection)
- [Palantir, Marketplace virtual tables](https://www.palantir.com/docs/foundry/data-connection/marketplace-virtual-tables)

## 관련 문서

- [[Palantir-Connection-Architecture|Worker와 네트워크 경로]]
- [[Palantir-Data-Connectivity|데이터 연결]]
