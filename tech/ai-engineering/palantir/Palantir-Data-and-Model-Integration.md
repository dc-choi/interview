---
tags: [palantir, foundry, data-integration, multimodal, mlops]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 데이터와 모델 통합", "Multimodal Data Plane"]
---

# Palantir 데이터와 모델 통합

데이터 통합은 원천의 데이터를 분석과 운영에 쓸 수 있게 연결하고 변환하는 과정이다. 모델 통합은 추론 로직과 실행 계약을 같은 업무 흐름에 넣는 과정이다. Ontology는 이 자산을 업무 객체와 행동에 연결한다. 객체 개념 자체는 [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프]]에서 다룬다.

2026-10-16 공식 문서 대조 기준이며 실제 Foundry 환경에서 연결, 추론이나 권한을 시험한 기록은 아니다.

## 데이터, 연산과 업무 의미를 분리한다

Multimodal Data Plane(MMDP)은 저장 형식, 연산 엔진과 모델을 하나의 조합으로 고정하지 않는 데이터와 연산 아키텍처다. 공식 구조는 Iceberg 테이블과 외부 virtual catalog/table, 미디어, 문서, 스트림과 시공간 데이터를 포괄한다. 연산에는 Spark, Flink와 단일 노드 엔진, Compute Modules와 외부 연산 연계를 포함한다. 모든 커넥터가 모든 기능을 같은 방식으로 지원한다는 뜻은 아니다. ([MMDP](https://www.palantir.com/docs/foundry/architecture-center/multimodal-data-plane))

공식 파이프라인 도표의 Pushdown Compute 영역은 DataFusion이 선택된 상태이며 Flink, Databricks, Snowflake와 Spark도 선택지로 표현한다. 파이프라인의 논리와 실제 연산 엔진을 나누는 개념을 설명하는 그림이다. 특정 변환이 모든 엔진에서 같은 의미와 성능으로 실행된다는 호환성 표로 사용하지 않는다. [MMDP 연산 도표](https://www.palantir.com/docs/resources/foundry/architecture-center/mmdp-pipeline-compute.png) (2026-10-18 이미지 확인)

| 경계 | 관리하는 것 | 혼동하면 생기는 문제 |
|---|---|---|
| 원천 시스템 | 업무 기록, 외부 파일과 외부 모델 | Foundry의 객체 변경이 원천에도 반영됐다고 생각함 |
| 데이터 통합 | 연결, 버전, 변환, 품질과 파이프라인 | 수집 성공을 업무 데이터의 정확성으로 간주함 |
| 모델 통합 | 입력/출력 계약, 추론 실행과 모델 배포 | 모델 등록을 정확도 검증으로 간주함 |
| Ontology | 객체, 관계와 업무 행동 | 의미 모델을 원시 데이터 저장소와 동일시함 |

표는 경계를 이해하기 위한 설계 해석이다. 실제 색인과 사용자 편집의 저장 책임은 [[Palantir-Object-Backend]]에서 구분한다.

## 연결과 변환은 운영 계약까지 포함한다

Foundry 데이터 연결은 구조화, 반구조화와 비구조화 원천 및 batch, micro-batch와 streaming 방식을 다룬다. 변환 단계에는 버전 계보, 보안, 스케줄, 변경 관리와 품질 관리가 연결된다. 파이프라인을 만들 수 있다는 사실과 운영 배포를 허용하는 조건은 별개다. 필요한 health check와 release 절차를 구성하고, 실패 시 진단과 재처리 지점을 정한다. ([Data integration](https://www.palantir.com/docs/foundry/data-integration/overview))

예를 들어 설비 센서 값, 정비 문서와 고장 예측을 함께 쓸 때는 센서 유입 주기, 문서 버전과 예측 기준 시각을 맞춰야 한다. 이 예시는 설계 적용이며 특정 워크플로우의 성능 보장이 아니다.

## 가상화는 모든 파생 저장을 없애지 않는다

MMDP의 외부 테이블 가상화는 데이터 활용을 위해 원천 전체를 먼저 복제해야 한다는 제약을 줄인다. 이것을 객체 색인, 변환 산출물과 사용자 편집도 저장되지 않는다는 주장으로 확대하지 않는다. ([MMDP](https://www.palantir.com/docs/foundry/architecture-center/multimodal-data-plane), [[Palantir-Object-Backend|객체 색인의 저장 책임]])

Virtual media set은 파일을 Foundry backing store로 복사하지 않고 외부 원천에서 읽는다. 2026-10-16 문서 기준 주요 조건은 다음과 같다. ([Virtual media sets](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/virtual-media-sets))

- 지원 원천은 Amazon S3와 OneLake/ABFS다. S3는 access key/secret 방식만 지원하고 STS role은 지원하지 않는다.
- Agent connection으로 virtual media set sync를 만들 수 없다.
- 원천 파일의 수정과 삭제를 자동으로 인지하지 않는다. 삭제된 파일의 항목이 남아도 실제 파일을 읽을 수 없을 수 있다.
- 미디어에 변환을 적용하면 변환 결과는 Foundry에 저장되며 저장 비용이 발생한다.

따라서 무복제 여부, 원천 변경 감지, 접근 권한과 파생 데이터 보존을 각각 확인해야 한다. 미디어 참조 속성과 실제 미디어 자원의 권한도 별도다([[Palantir-Security-and-Governance]]).

Media Set은 공통 schema의 파일 collection이며 transactional과 transactionless ingestion을 구분한다. 2024년 1월 도입 공지는 audio/image/PDF, schema-specific 변환과 DICOM preview 등을 설명하고 video는 roadmap으로 뒀다. 당시 지원 목록을 현재 목록으로 고정하지 않는다. 2024년 3월 deployment의 media selector는 model API가 media reference를 포함할 때 나타나는 조건부 입력이었다. ([January 2024](https://www.palantir.com/docs/foundry/announcements/2024-01), [March 2024](https://www.palantir.com/docs/foundry/announcements/2024-03))

## 모델은 실행 계약을 가진 자산이다

Foundry 모델은 머신러닝 로직을 담는 자산이며 파이프라인, Ontology와 앱에서 사용한다. 플랫폼 안에서 학습하거나 외부 파일, 라이브러리, 컨테이너와 API를 연결할 수 있다. Modeling Objective는 특정 문제의 모델 후보 평가, 검토, release와 배포를 관리하는 단위다. 등록과 배포 관리가 특정 업무의 품질을 대신 입증하지는 않는다. ([Model integration](https://www.palantir.com/docs/foundry/model-integration/overview))

모델을 통합할 때는 다음 둘을 나눈다. ([Model adapters](https://www.palantir.com/docs/foundry/integrate-models/model-adapter-overview))

- Artifact: 가중치, 파라미터, 파일, 컨테이너나 외부 연결 자격 증명 등 실행 대상.
- Adapter: 대상의 로드와 초기화, 의존성, 입력/출력 이름과 타입, `predict()` 구현 등 플랫폼과의 계약.

Transform 환경에는 adapter 의존성이 필요하다. 충돌을 격리할 때는 `ModelInput`의 `use_sidecar = True`로 별도 컨테이너에서 실행할 수 있다. 모든 모델을 같은 환경에 억지로 설치하는 대신 실행 환경의 경계를 확인한다.

Model Training template의 PyPI dependency bundling과 adapter `auto_serialize`는 packaging 구현을 줄이는 도구다. Serialization 기본값이 임의 객체의 환경 호환성이나 예측 품질을 보장하지는 않는다. 모델 preview도 선택한 소규모 입력으로 빠르게 확인하는 경로이며 unit test/check/full build를 대신하지 않는다. ([January 2024](https://www.palantir.com/docs/foundry/announcements/2024-01), [February 2024](https://www.palantir.com/docs/foundry/announcements/2024-02))

2025년 2월 adapter는 OSDK의 Object/Object Set을 API input으로 받아 query/deployment function에서 사용할 수 있게 됐다. `predict`/`transform` 안의 FoundryClient로 객체/함수/LLM을 호출하는 경로도 있어 adapter가 순수한 가중치 계산만 수행한다고 가정하지 않는다. 모델의 실행 identity와 동적 data read를 함께 추적한다. 같은 달 media upload는 media reference 생성과 그 reference를 받은 Action의 객체 연결을 나눴다. Upload 성공만으로 Ontology property가 수정된 것은 아니다. ([February 2025](https://www.palantir.com/docs/foundry/announcements/2025-02))

`use_sidecar`의 2025년 6월 도입은 model dependency와 adapter를 Spark transform의 별도 container에 보존하고 CPU/memory/GPU를 지정하는 경로였다. 당시 lightweight와 sidecar ModelInput preview는 미지원으로 명시했다. 기존 모델 dependency를 main environment에 수동으로 합치는 것과 다른 격리 방식이며 현재 호환성은 ModelInput 전용 문서로 확인한다. ([June 2025](https://www.palantir.com/docs/foundry/announcements/2025-06))

Vision extraction의 document input은 PDF를 page로 분할하고 image 변환/resize/encoding/default prompt를 묶는다. Page extractor는 custom split/image processing을 원하는 경우의 더 낮은 단위다. Extracted Markdown이 표/그림의 의미를 모두 보존했는지는 실제 source page와 대조한다. Media transform/output 지원과 virtual table output도 각각 media/외부 table 저장 경계를 유지한다.

## 외부 모델은 관리 방식과 권한 위임을 고른다

외부 모델을 Foundry 모델로 감싸면 모델 버전, lineage, 권한과 Modeling Objective 관리에 연결할 수 있다. 다만 일반 목적 LLM이나 별도 모델 관리가 필요 없는 호출은 Data Connection source와 egress policy를 통해 직접 API를 호출하거나 AIP 모델 등록을 선택할 수 있다. ([Externally hosted models](https://www.palantir.com/docs/foundry/integrate-models/external-model-connection))

2026-10-16 기준 externally hosted model의 `Batch deployment`는 지원되지 않는다. 외부 모델을 호출하는 Python transform 경로와 구분한다. 연결에는 접속 정보, adapter와 허용된 egress policy가 필요하다. 일반 connection configuration은 암호화되지 않고 모델 메타데이터에 노출될 수 있으므로 비밀값은 encrypted credentials configuration에 둔다.

모델 접근자는 자신의 외부 모델 계정 권한과 무관하게 등록된 자격 증명으로 추론할 수 있다. 따라서 외부 계정의 권한을 그대로 사용자별로 보존한다고 가정하지 않고, Foundry 모델 공유 범위를 권한 위임으로 검토한다.

## 적용 점검

다음은 실행으로 확인할 항목이며 이 문서에서 시험한 결과가 아니다.

1. 원천 변경부터 파이프라인, 객체 색인과 모델 입력까지 버전과 시각이 추적되는가?
2. 가상화한 파일이 바뀌거나 삭제되었을 때 누락과 오래된 참조를 감지하는가?
3. 외부 호출의 데이터 반출, 자격 증명과 사용자별 모델 접근 범위가 의도와 맞는가?
4. 모델 후보를 같은 평가 데이터로 비교하고 release, 실패와 복구 상태를 확인하는가?

## 출처

- [Palantir, Data connectivity and integration](https://www.palantir.com/docs/foundry/data-integration/overview)
- [Palantir, Multimodal Data Plane](https://www.palantir.com/docs/foundry/architecture-center/multimodal-data-plane)
- [Palantir, Virtual media sets](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/virtual-media-sets)
- [Palantir, Model connectivity and development](https://www.palantir.com/docs/foundry/model-integration/overview)
- [Palantir, Model adapter overview](https://www.palantir.com/docs/foundry/integrate-models/model-adapter-overview)
- [Palantir, Integrate an externally hosted model](https://www.palantir.com/docs/foundry/integrate-models/external-model-connection)
- [Palantir, January 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-01)
- [Palantir, February 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-02)
- [Palantir, March 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-03)
- [Palantir, February 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-02)
- [Palantir, June 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-06)

## 관련 문서

- [[Palantir-Data-Pipeline-Operations|수집, 변환과 배포의 운영 계약]]
- [[Palantir-Model-Deployment-and-Monitoring|모델 평가, 배포와 운영 관측]]

- [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프]]
- [[Palantir-Object-Backend|객체 색인과 저장]]
- [[Palantir-Security-and-Governance|보안과 거버넌스]]
- [[GraphRAG-Retrieval|GraphRAG 검색]]
