---
tags: [palantir, media-set, extraction, transcription, document-intelligence]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry media 추출과 근거 보존"]
---

# Media 추출과 근거 보존

문서, audio와 spreadsheet는 원본 media, 추출 결과와 업무 객체를 나눠 관리한다. 추출 성공은 내용의 정확성이나 후속 판단의 정당성을 보장하지 않는다. 아래는 2025년 10월 도입 공지의 기능과 설계 경계다.

## 문서 추출은 품질, 속도와 비용을 함께 고른다

Document Intelligence는 raw text/OCR/layout-aware OCR와 생성형 VLM, preprocessing 조합을 sample 문서에 실행하고 quality/speed/token cost를 비교하는 도구다. 선택한 전략을 Python transform으로 배포해 전체 media set을 처리한다. Sample preview, 선택한 추출 전략과 전체 build의 완료를 구분한다.

당시 beta는 text/table을 Markdown으로 추출했고 entity extraction과 복잡한 engineering diagram은 후속 계획이었다. 기능명이 Intelligence라고 문서의 모든 의미와 수치를 구조적으로 보존한다고 추정하지 않는다. Original media와 추출 위치/참조를 함께 유지한다.

Media transformation Python API는 schema별 method로 전체 set 또는 개별 item의 변환을 수행하고 media/dataset을 출력한다. Document slice 후 image 변환을 chain할 수 있지만 chain의 성공과 OCR 결과의 completeness는 다른 검증이다.

## Audio segment는 별도의 객체로 모델링한다

2026년 3월 Document Intelligence는 Markdown의 목록/표 구조를 고려한 chunking과 선택적 embedding 생성을 추가했다. Chunk 크기와 embedding context를 맞추고 검색/응답 품질을 실제 질문으로 평가한다. Chunking 기본값이 개선됐다는 소개만으로 기존 corpus의 retrieval 정확도가 올랐다고 확정하지 않는다.

2026년 2월 Document Intelligence GA는 AIP enrollment에서 기본 활성화하고 generated deployment를 Spark에서 lightweight로 바꿨다. Entity extraction과 Logic/function 직접 호출은 당시 후속 계획이었다. 2025년 beta 제약과 GA 실행 engine을 구분하며 속도 소개를 모든 문서의 fidelity 보장으로 읽지 않는다.

Transcribe audio의 speaker recognition은 More performant mode에서 diarization을 출력하는 조건이었다. Segment ID, 시작/끝 timestamp, text와 선택적 speaker ID가 있는 array를 explode하고 struct field를 추출해 segment object로 만든다.

Workshop Audio and Transcription Display는 millisecond timestamp와 text, 선택적 speaker ID를 사용해 waveform/scroll을 맞추고 Player/Gantt, full-text search와 seek를 제공한다. Selected segment로 Action의 수정 대상을 연결한다. Speaker 구분은 신원 확인과 다르며 사용자 교정 Action과 원 추출값을 구분해 보존한다.

## Spreadsheet는 원본 layout을 잃지 않게 다룬다

Spreadsheet media set의 XLSX preview는 미리 정한 정형 schema에 맞추기 어려운 vendor 문서/보고서를 보존하는 경로다. JSON text extraction을 LLM 입력으로 쓰고 Builder expression 또는 `transforms-media`로 처리한다. Merged cell/formatting을 활용하는 추출과 정규화 dataset의 column 계약은 다르다.

Workshop preview/annotation은 원본과 처리 결과를 함께 보여주는 수단이다. 당시 향상된 formatting extraction과 edge case 지원은 roadmap이었으므로 보이는 preview의 fidelity를 JSON 추출의 완전성으로 확대하지 않는다.

## 녹화 기반 문서는 검토할 산출물이다

Multimodal media set은 한 set에 서로 다른 schema와 미지원 format을 담는다. 2025년 11월 기능은 지원 schema만 preview하고 나머지는 download로 외부 열람했다. 저장 가능한 format과 in-platform preview/transform 가능한 format을 구분하며 다운로드는 별도 복제본의 접근/보존 경계를 만든다.

Flow Capture는 screenshot, 음성 전사와 업로드 media 중 context를 선택하고 model/prompt/template으로 Markdown을 생성한다. Screenshot censor/edit와 선택 과정에서 민감정보를 줄인 뒤 Walkthrough, Notepad, ZIP/PDF로 export한다. 녹화한 사용자 경로는 다른 권한/실패 경로의 동작 증거를 자동 제공하지 않는다.

Media path의 최신 표시와 build가 참조하는 item version은 다를 수 있다. 2026년 4월에는 같은 path upload의 version history와 overwritten/soft-deleted item의 영구삭제 기간을 설정하는 정책을 추가했다. Latest item은 덮이기 전까지 남고 과거 item의 retention 만료는 재현 가능성을 바꾼다.

Email media set은 `.eml` header/body/metadata와 attachment를 보존하고 supported attachment만 preview하며 나머지는 download한다. Attachment를 다른 media set으로 출력하거나 body를 text/HTML로 추출하는 것은 새 파생물 생성이다. 원본 메일의 권한/보존과 후속 추출물의 보호를 함께 정한다.

Builder incremental media input은 첫 build 전체, 이후 new/changed를 처리한다. 2026년 4월 최초 범위는 incremental dataset과 media input을 한 pipeline에 섞는 것과 incremental media output을 제외했다. Raw media가 incremental이라는 이유로 모든 transform/output이 같은 의미의 증분 실행을 한다고 가정하지 않는다.

Extract Text from PDF v2는 PyMuPDF raw/OCR와 layout 경로를 사용하고 text/Markdown/HTML을 출력한다. 2026년 5월의 전자 PDF 내부 benchmark와 큰 batch 개선을 scanned PDF 모든 형식의 우월성으로 확대하지 않는다. Feature flag의 신규 default 변경, 개별 v1 board Upgrade와 save/deploy는 별도 단계다. Extraction engine 변경 뒤 표/순서/수치의 회귀를 실제 문서로 대조한다.

2026년 7월 extraction strategy의 per-page Python function deployment는 batch pipeline 외에 Automate/Action 기반 event-driven workflow를 조합하는 경로다. Chunk size/overlap/embedding model을 설정하지만 function snippet 생성과 각 page의 중복/실패 재처리, 전체 문서의 완료 판정은 별도 workflow로 구성한다.

Function media API는 TSv2/Python의 `Media`와 TSv1의 `MediaItem`을 구분한다. 2026년 8월 upload한 media는 Ontology property에 붙여 edit가 apply되기 전까지 temporary였다. Bytes/full format metadata 조회, live preview 선택과 durable attachment를 별도 단계로 확인한다. Transformation helper는 job 제출/polling 후 bytes를 반환하며 당시 beta endpoint 직접 호출보다 SDK helper를 권장했다. Dense-page OCR은 function timeout을 넘길 수 있다.

Vulcan은 mesh GLB/GLTF/STL/OBJ/PLY/3MF, drawing DXF와 LAS/LAZ point cloud를 Ontology scene에 읽는다. 2026년 9월 beta 후 GA에서 저장한 annotation/measurement/section plane은 실제 Ontology object가 되고 color 변경은 Action을 사용했다. Workshop camera/selection/measurement의 양방향 variable 연결과 영속 저장은 구분한다. 형상을 보았다는 사실과 설계 검증/측정 정확성은 별도로 확인한다.

## Media set과 비정형 dataset의 처리 계약

비정형 dataset은 파일 집합이며 Python/Java filesystem API로 읽고 쓴다. Incremental, unit test와 schedule은 사용할 수 있지만 schema 없는 파일에는 tabular row/column 검증 기능을 그대로 적용할 수 없다. Parallel file 처리도 dataframe 변환과 다른 API를 사용한다.

Code Repositories의 media transform은 `transforms-media` library와 `@transform`, `MediaSetInput`/`MediaSetOutput`을 쓴다. Output media set은 참조 전에 만들어야 한다. Item RID/path로 읽은 객체는 순차 file-like stream이며 random access를 지원하지 않는다. Listing dataframe의 RID/path/mediaReference를 활용하되 전체 RID를 driver에 collect하는 튜토리얼을 대규모 자료의 기본 패턴으로 확장하지 않는다.

Pipeline Builder PDF 추출은 전자 문서의 raw text, scan의 OCR과 위치 정보가 필요한 layout-aware 경로를 고른다. Image 회전 같은 media transform 뒤에 추출을 chain할 수 있다. Transformed media reference는 dataset output의 유효 column이 아니므로 output schema에서 제거한다. Ontology object output이면 ontology, property mapping과 유효 primary key를 지정하고 deploy/initialization 완료 후 소비한다.

## 출처

- [Palantir, October 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-10)
- [Palantir, November 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-11)
- [Palantir, February 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-02)
- [Palantir, March 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-03)
- [Palantir, April 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-04)
- [Palantir, May 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-05)
- [Palantir, July 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-07)
- [Palantir, August 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-08)
- [Palantir, September 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-09)
- [Palantir, Pipelines on unstructured data](https://www.palantir.com/docs/foundry/building-pipelines/unstructured-overview)
- [Palantir, Media set batch pipeline with Code Repositories](https://www.palantir.com/docs/foundry/building-pipelines/create-batch-pipeline-cr-media-sets)
- [Palantir, Media set batch pipeline with Pipeline Builder](https://www.palantir.com/docs/foundry/building-pipelines/create-batch-pipeline-pb-media-set)

## 관련 문서

- [[Palantir-Data-and-Model-Integration|Media와 모델 통합]]
- [[Palantir-Workshop-Applications|업무 UI와 Action]]
- [[Palantir-AIP-Evaluation-Suites|추출과 판단 품질 평가]]
