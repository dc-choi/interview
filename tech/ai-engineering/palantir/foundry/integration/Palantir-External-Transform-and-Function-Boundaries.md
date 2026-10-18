---
tags: [palantir, external-transforms, webhooks, egress]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["External transform/function 경계"]
---

# External transform/function 경계

External transform은 batch sync/export/media sync 등 Python pipeline에서 source의 network/credentials를 사용한다. External function은 interactive function에서 미리 정의한 webhook을 호출한다. 이름이 비슷해도 임의 HTTP 실행과 권한을 공유하는 하나의 기능은 아니다.

## Source-based external transform

Python repository에 transforms-external-systems를 설치하고 Code import를 허용한 source를 Editor 이상으로 import한다. @external_systems에 Source RID를 선언하고 get_secret 또는 get_https_connection/client를 사용한다. REST source가 여러 domain을 담으면 import할 수 없으므로 domain마다 source를 분리한다.

Foundry worker/direct connection이 기본 경로다. Agent worker source와 outbound application 인증 source는 지원하지 않는다. Private network는 direct source에 agent proxy egress policy를 연결하는 경로를 사용할 수 있으며 legacy agent proxy runtime과 구분한다. 해당 routing/certificate가 필요한 경우 built-in client를 사용한다. os.chdir로 certificate/env-relative path를 깨뜨리지 않는다.

Source가 HTTPS client를 제공하지 않으면 password 같은 secret 외 hostname 등 non-secret attribute를 읽지 못할 수 있다. 자체 client/SDK를 쓸 때 이를 source에 저장된 모든 configuration을 자동 조회할 수 있다는 의미로 확대하지 않는다.

## Foundry input과 열린 connection이 함께 있으면 export다

Dataset/media/stream input 또는 해당 source의 virtual table을 같은 job에서 읽으려면 Enable exports와 exportable Marking/Organization을 설정한다. 실제 외부 request에 그 data를 넣지 않아도 유출 가능성이 있으므로 export control을 요구한다. 이 설정에는 해당 Marking/Organization을 제거할 권한이 필요하다.

Credentials/egress/export configuration은 source에서 중앙 관리하고 code version 변경 없이 다음 build 시작 때 반영한다. 이미 실행 중인 build에는 바뀌지 않는다. Compute Module source의 restart/rolling upgrade 규칙과 섞지 않는다.

Legacy @use_external_systems에서 source-based decorator로 자동 migration하는 경로는 없다. 기존 credentials/egress/Marking을 source로 옮기고 branch에서 검증한다. 한 transform에 둘을 섞을 수 없고 필요하면 transform 단위를 나눈다. Lightweight single-node도 지원한다.

## 예제의 IO와 memory 한계

HTTP 예제는 status/timeout/retry, empty response와 malformed JSON을 보강해야 한다. Null fallback은 전체 요청 성공을 보장하지 않는다. Sidecar Flask 예제에는 request import 누락과 placeholder source 정보가 있으므로 그대로 실행하지 않는다.

BufferedParquetWriter는 buffer를 flush해 전체 record accumulation을 피하지만 첫 row 크기로 이후 모든 row를 추정한다. 가변 크기 row, Arrow 변환 중 추가 memory와 한 row가 threshold를 넘는 경우를 고려한다. fetch_records_from_source는 구현할 placeholder다. Replace mode에서 0개 file일 때 metadata finalization을 생략하는 의미와 filename 충돌도 확인한다.

CSV export 예제는 output file을 만드는 단계다. 그 file을 외부 시스템에 전송하는 Data Connection export는 별도다. Polars 전체 materialization과 row iteration이 대규모 export의 memory 보장을 제공하지 않는다.

## Function은 webhook read/write 의미를 따른다

TypeScript v1은 source/webhook API name을 import해 wrapper logic을 쓸 수 있다. TypeScript v2/Python은 webhook을 Ontology function으로 publish하고 OSDK로 호출하는 경로를 사용한다. 미리 webhook으로 정의하지 않은 arbitrary external API call은 이 기능의 지원 경로가 아니다.

Read API는 query 또는 OntologyEditFunction에서 쓸 수 있고 Write API는 OntologyEditFunction에서만 사용한다. Query는 외부 변경을 포함한 side effect가 없어야 한다. HTTP GET이라는 이름만으로 실제 외부 operation이 read-only라고 확정하지 않는다. 외부 write와 Ontology edit를 하나의 원자적 rollback으로 취급하지 않고 실패/재시도/idempotency를 설계한다.

## 출처

- [Palantir, Connecting to data](https://www.palantir.com/docs/foundry/data-integration/connecting-to-data)
- [Palantir, External transforms](https://www.palantir.com/docs/foundry/data-integration/external-transforms)
- [Palantir, Source-based external transforms](https://www.palantir.com/docs/foundry/data-integration/external-transforms-source-based)
- [Palantir, External Functions](https://www.palantir.com/docs/foundry/data-integration/external-functions)

## 관련 문서

- [[Palantir-Compute-Sources-and-Storage|Compute source 변경 반영]]
- [[Palantir-Virtual-Table-Execution-and-Detection|Virtual table source 권한]]
- [[Palantir-Action-External-Effects|외부 부수효과]]
