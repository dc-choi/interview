---
tags: [palantir, pipeline, review, checkpoint]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 파이프라인 실행과 검토 경계"]
---

# 파이프라인 실행과 검토의 경계

한 graph의 여러 output이 같은 실행과 실패 단위를 갖는 것은 아니다. 아래는 2023년 7~9월 도입 공지의 실행 모델과 검토 교훈이다. 현재 job/engine 조건은 전용 문서로 대조한다.

## Job grouping과 checkpoint는 다른 최적화다

2023년 7월 Pipeline Builder는 성공한 deployment마다 하나의 build를 시작하며 batch는 output별 독립 job, streaming은 모든 output을 단일 Flink job에 묶는 기본값을 안내했다. 따라서 batch output은 개별 실패하고 기본 streaming output은 함께 성공/실패하는 경계였다.

Job grouping은 batch output을 묶거나 streaming output을 분리하고 group별 compute profile을 정하는 기능이다. Checkpoint는 여러 output이 공유하는 중간 계산을 저장해 한 번만 계산하도록 한다. Failure isolation, cluster 수와 중간 materialization 비용은 다른 결정이므로 같은 최적화 toggle로 취급하지 않는다.

Contour의 대부분 분석을 Pipeline Builder로 변환하는 경로는 탐색을 production pipeline으로 옮기는 출발점이다. Equivalent graph 생성 이후에도 incremental 조건, output schema, job grouping과 branch review를 확인한다. HyperAuto V2는 SAP metadata join, cleaning과 changelog deduplication을 Builder pipeline으로 생성하고 설정 변경은 proposal 승인을 거쳐 배포하도록 했다. 자동 생성과 자동 배포는 다르다. 당시 SAP streaming에는 SLT Replication Server가 필요했다.

## 환경 설치와 checks를 구분한다

Code Repositories Task Runner의 package 설치는 current workspace 환경 위에 설치하며 test 환경을 함께 바꾸지 않았다. Run에서 import가 성공했다고 test lockfile까지 맞아진 것으로 보지 않는다. Conda/ZST cache와 중복 압축 제거는 checks 시간 개선의 원인으로 소개됐지만 공지의 내부 P95 수치를 모든 고객의 성능 보장으로 확대하지 않는다.

Preview의 최대 row 증가도 전체 dataset 검증과 다르다. Local macOS/Windows preview, cross-platform `noarch` library와 `conda-forge` 지원은 dependency의 target platform 차이를 제거하지 않는다. Arbitrary Java UDF는 versioned shared logic이지만 별도 enablement와 runtime 호환성을 확인한다.

## Review 대상과 승인자를 명시한다

Pipeline custom approval policy는 none, edit-permission 기반과 지정 user/group을 구분했다. Proposal comment/reject reason은 변경의 근거를 남긴다. Ontology proposal도 branch의 승인과 실제 Ontology 저장 단계를 구분하며 당시 cross-org collaboration ontology에는 enablement 제한이 있었다.

Code Repository의 merged source branch 자동 삭제는 신규 repository의 기본값 변경이었고 기존 repository에는 그대로 적용되지 않았다. Module version description을 뒤에 수정하면 timestamp/editor와 edited 상태가 남고 revert도 새 설명을 만들었다. 기록의 수정과 기존 실행 이력을 같은 것으로 보지 않는다.

## 계산 엔진과 저장 위치를 고른다

2023년 11월 Lightweight transform은 single-node에서 Pandas/Polars 등으로 Spark orchestration 비용을 줄이는 경로로 도입됐다. `@lightweight` 실행에서는 Spark method에 접근할 수 없다. 단순 filter와 memory-friendly 처리의 benchmark를 복잡한 대규모 shuffle의 성능 보장으로 확대하지 않는다. 당시 unmarking/external/incremental 지원의 미완료는 역사적 조건이므로 현재 전용 문서와 대조한다.

2023년 10월 Virtual Table은 원본 pointer를 등록하고 sync는 Foundry에 복사하는 경로였다. 당시 S3/ADLS Delta/Parquet과 BigQuery/Snowflake table/view 지원, manual/automatic registration 차이가 있었다. Source를 복사하지 않는다는 사실과 downstream Foundry output을 만들지 않는다는 것은 다르다. 11월 Builder의 direct object/link output도 backing dataset 표시와 lineage를 바꾸는 경로였다.

Marketplace는 input mapping과 customization으로 installation별 데이터를 바꾸고 release channel, maintenance window와 자동 upgrade를 분리한다. Product가 GA라고 모든 installation이 같은 version이라는 뜻은 아니다. 2023년의 중앙 유료 store 계획을 현재 구매 가능 사실로 바꾸지 않는다. HyperAuto 자동 sync 생성도 source에서 보이는 table을 선택하고 기존 sync 기본값을 확인한 뒤 sync 생성/실행을 끝내고 pipeline을 deploy하는 순서였다.

2023년 12월 advanced PR approval은 수정한 file에 따라 필요한 user/group을 정하고 신규 PR에 적용됐다. YAML 정책 수정과 이미 열린 PR의 gate 변경을 같다고 가정하지 않는다. Python/TypeScript dependency 추가는 package manifest와 lockfile, workspace/test 환경을 함께 확인한다. Preview input sampling은 build의 전체 input 계산을 줄이는 설정이 아니다.

2024년 1월 `deploy without build`는 jobspec 게시와 실제 계산을 분리하고 target/job group만 선택하는 경로를 제공했다. Streaming replay도 별도로 선택했다. Deployment 성공을 output 갱신 증거로 쓰지 않는다. CPU architecture override도 library binary 호환성과 함께 보고 ARM capacity/compliance availability를 확인한다.

Lightweight는 2024년 1월 external transform, 2월 Arrow/Parquet 기반 DuckDB/Ibis/DataFusion/cuDF와 BYOC, 3월 incremental/unmarking으로 확장됐다. 초기 미지원 목록을 현재 제약으로 복사하지 않는다. Incremental의 added input 처리와 unmarking 권한은 decorator를 붙이는 것 외의 데이터/보안 계약을 유지한다. Code Assist/Checks 환경 cache 공유는 Task Runner 설치 경로에는 당시 적용되지 않았다.

2024년 4월 Builder output unmarking은 대상 marking의 Remove 권한, branch protection과 code approval을 요구했다. 설정 저장만으로 지워지는 것이 아니라 merge와 main build 후 output에 적용된다. Inherited marking 제거, 미래 유입 marking의 선제 제거와 제거 취소도 구분한다. Project constraint는 별도로 허용/금지 marking 조합을 제한한다.

Native accelerated Spark는 SQL 계열 처리를 저수준 엔진으로 최적화하고 UDF/RDD 중심 작업은 이점이 제한적일 수 있다. 실제 pipeline 전후를 비교한다. Preview cache는 비싼 upstream 결과를 downstream에서 재사용하지만 당시 node preview는 500행이었고 row-count 변화/join/aggregation/logic 변경에는 재사용 제약이 있었다. Python 3.11과 Hawk 도입도 신규 repository 기본값과 기존 upgrade를 나누고 logs의 실제 manager 실행을 확인한다.

JDBC table export는 source/target schema 일치가 필요하고 mirror, full snapshot, truncation, 미수출 transaction만 incremental, APPEND-only 실패 모드가 각각 다른 의미다. Truncate 후 unexported transaction만 보내는 모드는 full snapshot으로 복원하는 것과 다르다. 2024년 6월 initial availability는 custom JDBC direct/agent였으며 export task를 대체하는 이전 경로로 안내됐다.

2024년 8월 Builder unit test는 test input, 선택한 transform과 expected output을 비교하고 변경을 proposal에 포함했다. 지정한 sample case 통과와 source credential, 전체 데이터 품질은 다른 검증이다. 9월 multiple protected branch는 모두 같은 approval policy를 적용했다. Branch별 policy를 독립적으로 설정할 수 있다고 추정하지 않는다.

Coalesce는 partition을 줄일 때 shuffle 없이 기존 partition을 묶고 더 큰 수를 요청해도 늘리지 않았다. Partition 수만 줄여 throughput이 늘어난다고 보장할 수 없으며 parallelism/skew를 함께 확인한다. Graph node 숨김과 folder는 탐색 범위이며 실행 graph에서 node를 제거하지 않는다. Marketplace placeholder는 schema가 맞는 빈 dataset이며 실제 input remap과 데이터 검증을 뒤에 수행한다. Source-based external preview도 실제 network를 호출하는 경로라 단순 local mock과 구분한다.

2024년 Compute Module beta는 Docker image의 API/function, 내부 Foundry API와 외부 REST/WebSocket/SSE, replica scaling을 연결했다. 언어 자유도가 container의 network/security/runtime 제약을 없애는 것은 아니다. Python serverless와 deployed function도 구분한다. 당시 serverless는 호출별 비용과 version별 실행, 실행마다 새 환경을 제공했고 deployed는 지속 비용과 단일 version, restart를 견디는 local cache/external source 지원이 있었다. 현재 지원은 backend별 전용 문서로 확인한다.

Workflow Lineage는 logical reference와 property downstream usage, Action version과 permission view를 연결한다. Diagram에 없다는 이유만으로 외부 코드의 동적 사용이 없다고 단정하지 않는다. Builder source 생성 지원도 mandatory field만 필요한 지원 JDBC 설정과 batch sync 등 범위를 확인한다. Arbitrary JDBC driver property는 encrypted property가 필요한 비밀값을 평문 field에 두는 이유가 아니다.

Pseudocode view는 읽기 표현이며 code authoring이 아니고 diff/join/union/LLM node에 같은 표시가 적용되지 않았다. File wizard도 working tree에 코드를 만드는 단계이며 commit/check/deployment가 아니다. KNN Join은 왼쪽 각 row마다 오른쪽의 유사한 K개를 찾는 계산이며 equality join과 cardinality/품질 의미가 다르다.

2025년 React PR preview는 hosted Developer Console app의 committed branch/checks를 바탕으로 만든 시험 화면이며 당시 PR 생성 후 7일 만료였다. Website Viewer로 공유하면 code/config Editor 권한을 줄 필요는 없다. Frontend PR preview와 branch 격리된 backend data는 같은 기능이 아니다. VS Code의 full-dataset preview도 pipeline build와 저장/배포 계약이 다를 수 있다.

Workflow Lineage bulk upgrade는 모든 대상이 non-breaking이면 전부 진행하는 모드와 호환 대상만 진행하는 partial을 제공했다. Target 미지정이면 latest를 선택하므로 의도한 버전과 완료 목록을 확인한다. OSDK Template은 hostname/client/package/RID를 placeholder로 치환하고 설치 때 Developer Console/repository를 bootstrap한다. 원 Ontology resource를 그대로 포함하면 중복 resource와 API name 차이로 코드가 깨질 수 있어 공유 input mapping을 권장했다. Placeholder 때문에 template 자체 checks가 실패하는 단계와 설치 후 app 실패를 구분한다.

2025년 3월 enrollment-level Builder branch protection은 새 pipeline의 Main 기본값만 바꾸며 기존 pipeline에는 적용되지 않았다. Workflow Lineage의 function upgrade 후 bulk publish도 별도 단계다. Latest-published 자동 추적과 현재 latest가 수동 publish된 상태를 구분한다. Bulk delete proposal은 object/action뿐 아니라 연결 link type의 삭제 범위도 보여주므로 타입 개수만으로 영향 판단을 끝내지 않는다.

Find/replace는 column reference의 single/group/all replacement를 preview하는 경로다. Column의 이름이 같다는 이유로 같은 업무 의미까지 보장하지 않는다. Agent change history도 configuration/restart 요청/성공을 남기는 범위였고 모든 외부 시스템 변경의 감사 기록은 아니었다. Continue codebase context와 local VS Code extension은 metadata/SDK 입력, local preview enablement와 실제 remote/local 실행 위치를 나눠 확인한다.

Incremental preview의 2025년 4월 확장은 Spark/lightweight, output read/file transform과 build의 incremental resolution/flags를 맞추는 경로였다. Sample/full input과 output의 저장 상태는 여전히 나눈다. Split transform은 조건 True/False로 두 output을 만드므로 null condition의 처리는 전용 식 계약으로 확인하며 단순 예시에서 임의 보완하지 않는다.

2025년 6월 function version range는 Workshop/Action/Automate가 runtime에 자동 upgrade하도록 했다. Tag의 backward-compatibility check와 semantic version을 맞추며 타입 호환성과 업무 행동 동일성을 별도로 검증한다. Version pin, range resolution과 실제 deployment version을 함께 기록한다.

Virtual Table output은 Foundry에서 논리를 작성하고 외부에 output을 저장하는 경로다. 외부 storage와 compute pushdown은 다른 선택이다. 2025년 Databricks full federation은 같은 source의 virtual input/output과 Databricks Connect를 이용한 Python transform을 요구했다. 일반 Builder query와 pushdown을 명시하지 않은 transform은 compute가 양쪽에 나뉠 수 있었다. Connector/engine별 지원을 구분한다.

2025년 7월 Builder lightweight pipeline은 DataFusion 기반 batch/incremental beta로 소개됐고 Use LLM/media/geospatial은 당시 제외됐다. Python lightweight transform의 지원 목록과 같지 않다. Convert 시 compatibility 경고와 preview/build output을 대조하고 성능을 비교한다. VS Code code-defined input filter는 지정 순서대로 적용하고 workspace 재시작/`.maestro` 삭제 때 설정이 초기화됐다. Structured input은 Spark/lightweight, raw file은 Spark만 지원한 범위도 구분한다.

Checkpoint strategy는 output마다 고른다. 2025년 8월 안내의 기본 short-term disk, memory, output dataset 저장은 재사용 범위와 실패 위험이 다르다. Memory는 빠르지만 OOM 위험을 높이고, dataset 저장은 첫 deployment에 생성한 dataset의 latest transaction을 사용한다. 여러 output을 가진 node도 각 output의 전략을 따로 정한다.

2025년 9월 Python lightweight는 single-node Polars/pandas, incremental/media/external/model을 포함한 기본 권장 경로로 확대되고 `transforms.using(...)` API를 안내했다. 공지의 2억 행/50GB와 특정 shape의 TB 사례는 모든 transform의 용량 보장이 아니다. Lazy execution, memory telemetry와 실제 workload로 Spark 분산 실행과 비교한다. Spark/lightweight를 한 pipeline에 섞는 것도 가능하다.

Jemma code scanning은 enrollment에서 켜면 commit마다 scan하고 findings가 있으면 기본 checks 실패, 관리자 설정에 따라 warning 후 계속하는 경로였다. Scan 실행, warning, build gate 통과와 실제 vulnerability 부재를 구분한다.

2025년 10월 lightweight VS Code preview는 build와 같은 execution code path를 사용하고 PySpark 초기화를 제거했다. 이 변경은 별도 preview 구현의 schema 차이를 줄이는 개선이며 sample 입력, 권한, 실제 전체 데이터와 job 자원의 차이까지 없애지는 않는다. 성능 개선 수치는 해당 workload에서 다시 측정한다.

Builder의 inherited organization 제거는 protected Main에서 만든 branch와 필요한 권한을 전제로 input별 상속을 제거한다. 해당 org를 가진 모든 input에서 제거해야 output에서 빠지고, 당시 기능은 현재 organization에만 적용돼 미래 source org 변경은 자동 제거하지 않았다. Project-level organization 접근 조건도 계속 남는다.

SAP add-on package는 source 설정에서 target NetWeaver에 맞는 파일과 release notes를 받는다. 새 package 배너와 실제 SAP 측 설치는 다른 상태다. 2025년 10월 공지의 SP35 제목과 본문 SP32 표기가 달라 patch level은 package/release notes를 다시 확인한다. HANA secondary read의 HINT 설정과 STXL 처리도 connector/server version의 조합을 따른다.

DuckDB native Python binding은 incremental/partitioned output과 memory/parallelism 설정을 제공하는 single-node SQL 경로다. 2025년 11월의 도입을 Spark 분산 실행의 모든 workload 대체로 해석하지 않는다. External Builder pipeline의 Databricks pushdown은 virtual input/output과 compute가 같은 source여야 하는 조건이었다. Snowflake/Polaris Iceberg, Databricks Iceberg/Delta를 Jupyter에서 직접 읽고 쓰는 기능도 저장/실행 위치와 credential을 분리해 확인한다.

Dataset rollback은 Editor가 transactional dataset의 성공한 transaction으로 되돌리는 작업이다. Retention으로 지운 transaction에는 돌아갈 수 없지만 이전 rollback이 제거한 transaction에는 돌아갈 수 있었다. OSv2 backing dataset을 돌려도 object reindex가 따로 필요하다. Force snapshot은 다음 build에 snapshot을 예약하며 즉시 복원/실행과 다르고 당시 undo 불가 확인을 요구했다.

2025년 12월 Builder lightweight는 DataFusion 기반 Faster pipelines로 GA/명칭 변경됐다. 15분 미만 pipeline을 우선 후보로 안내했지만 더 큰 workload에도 비교 가능하며 conversion checks가 미지원 transform/expression을 보여준다. 초기 7월 beta의 미지원 목록을 현재의 고정 목록으로 사용하지 않는다.

같은 달 code-defined preview filter는 Spark/Polars/Lazy Polars/pandas와 boolean/int/float/string parameter, 순서별 중간 결과와 file regex/glob/limit/select를 지원했다. Local config가 재개방 때 복원되는 계약으로 확장됐으므로 7월의 workspace restart 초기화 설명은 당시 조건이다. Filtered preview를 full production input 검증과 구분한다.

Active preview는 첫 preview 후 enable하고 code save마다 재실행하며 filter 결과/project resource/dependency cache를 재사용한다. 2026년 1월 안내의 자동 갱신은 full input build나 resource publish가 아니다. Source data만 바뀐 경우 cache/refresh 조건과 선택한 preview input을 확인한다.

Require incremental execution은 incremental로 지정한 output이 snapshot으로 fallback하면 실패하도록 하는 gate다. 2026년 3월 Builder는 job grouping과 무관하게 모든 incremental output에 적용하고 incremental input/output이 없으면 True 설정의 deploy가 실패했다. State break를 요구하는 변경은 확인 후 snapshot 가능한 예외다. Default No value와 Python `require_incremental=True`를 구분한다.

Enrollment preview confirmation은 기본값이며 사용자가 preference로 override할 수 있었다. 2026년 3월 공지의 제목 Enforce를 강제 불변 정책으로 읽지 않는다. Node-level comment의 Resolve도 검토 대화의 상태이며 check/approval 통과를 의미하지 않는다.

Virtual/Iceberg table의 health check는 key unique/non-null, last-update, schema/column, 최근 build/job 상태를 각각 검사한다. 2026년 3월 Databricks/Snowflake/BigQuery 지원 도입을 모든 source의 임의 query 품질 검증으로 확대하지 않는다.

Parameterized transform의 standard schedule은 값을 직접 지정하고 parallelized schedule은 독립 run setup마다 다른 값을 관리한다. 2026년 5월 도입은 Action parameter를 schedule로 넘겨 재계산을 trigger하는 경로를 제공했다. 다수 run의 동시 실행과 한 transaction의 원자성은 다르며 Action 성공은 build 완료를 뜻하지 않는다.

2026년 6월 Python transform Code Repositories 편집은 legacy로 전환됐지만 지원/접근은 유지하고 신규 기능을 VS Code에 집중했다. Java/SQL 또는 VS Code가 없는 enrollment의 권장 경로와 구분한다. VS Code의 global branch 지원은 Python transform/TSv1 function이며 preview/build/development panel이 checkout branch를 따른다.

Faster pipeline의 media input/OCR/audio와 GeoExpression 지원은 초기 beta 제한을 확장했다. 2026년 6월 media upload는 새 media set에 transactional/권장 transactionless write mode를 선택하고 geo logical type은 output/downstream에 보존했다. Geo Preview는 지원 logical type의 선택 cell만 지도에 표시하는 진단이며 전체 geometry 품질 검증은 아니다.

Keyed CoProcess UDF는 두 input stream의 state를 공유하고 어느 input에서든 row를 처리/emit한다. 2026년 8월 도입의 이 계약은 두 stream이 반드시 동기적으로 쌍을 이뤄야 하는 join과 다르다. Key/state/retention과 event order를 고려하며 예시의 실시간 matching을 모든 out-of-order/누락 데이터 처리 보장으로 확대하지 않는다.

State-break cause view는 2026년 10월 streaming/incremental 변경을 원인/영향 entity별로 보여주고 해당 change로 이동/edit/revert한다. 이유가 표시된다는 사실과 state break를 허용하는 결정은 다르다. Require incremental의 state-break 예외를 승인하기 전 재계산 범위와 downstream 영향을 확인한다.

## 출처

- [Palantir, July 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-07)
- [Palantir, August 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-08)
- [Palantir, September 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-09)
- [Palantir, October 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-10)
- [Palantir, November 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-11)
- [Palantir, December 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-12)
- [Palantir, January 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-01)
- [Palantir, February 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-02)
- [Palantir, March 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-03)
- [Palantir, April 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-04)
- [Palantir, May 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-05)
- [Palantir, June 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-06)
- [Palantir, July 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-07)
- [Palantir, August 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-08)
- [Palantir, September 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-09)
- [Palantir, October 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-10)
- [Palantir, November 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-11)
- [Palantir, December 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-12)
- [Palantir, January 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-01)
- [Palantir, February 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-02)
- [Palantir, March 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-03)
- [Palantir, April 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-04)
- [Palantir, June 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-06)
- [Palantir, July 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-07)
- [Palantir, August 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-08)
- [Palantir, September 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-09)
- [Palantir, October 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-10)
- [Palantir, November 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-11)
- [Palantir, December 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-12)
- [Palantir, January 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-01)
- [Palantir, March 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-03)
- [Palantir, May 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-05)
- [Palantir, June 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-06)
- [Palantir, August 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-08)
- [Palantir, October 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-10)

## 관련 문서

- [[Palantir-Analytics-Reuse-and-Migration|탐색에서 운영으로 이전]]
- [[Palantir-Runtime-and-Policy-Migrations|Runtime 호환성]]
- [[Palantir-Compute-Profiles-and-Container-Governance|Compute profile]]
