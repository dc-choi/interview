---
tags: [palantir, foundry, media-sets-advanced-formats]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 음성, DICOM과 스프레드시트 업무 연결

Audio workflow는 media set을 transcribe하고 segment array를 explode해 id/begin/end/contents/speaker_id 객체로 만든 뒤 Workshop에서 표시한다. 언어 미지정 시 처음30초로 추론한다. Speaker recognition은 More performant 모드와 Segment details를 사용하는 예시다. Speaker ID를 이름으로 매핑하거나 Action으로 수정하는 것은 실제 화자 식별 검증과 별도다. 여러 파일을 합치면 segment ID의 전역 유일성도 확인한다.

DICOM은 batch media set에 .dcm을 넣고 Patient/Study metadata와 media item RID를 가진 객체로 만든다. RID를 primary key로 매핑해 preview/Workshop으로 연결한다. Contrast/exposure 조정과 파일 표시 지원이 임상 판독의 정확성 보장이 되는 것은 아니다.

## Spreadsheet 원본과 분석 표

구조가 일관된 spreadsheet는 Excel parser/connector나 row extraction으로 dataset 정규화한다. 원본 구조가 다양하거나 원본 파일이 근거여야 하면 .xlsx media set을 보존한다. Media reference와 item RID의 객체, 별도의 JSON cell-content branch를 구성한다. JSON은 sheet-name별 map과 선택한 Table/Merged cells를 가진다.

Annotation은 원본 spreadsheet를 바꾸는 대신 annotation ID, sheet name, JSON cell range와 spreadsheet link를 가진 객체로 저장한다. Cell range는0기반이라 A1은(0,0)이다. Workshop layer를 현재 spreadsheet로 filter하고 선택 range와 sheet, active object를 Action parameter에 매핑해야 다른 문서의 주석이 섞이지 않는다.

이 예시들은 media 적재, Ontology 모델링, 앱 표시와 수정 Action의 연결을 보여준다. 사용자의 실제 schema/권한에 맞는 type과 Action을 별도로 만들어야 하며 예시 resource가 모든 enrollment에 존재하는 것은 아니다.

## 출처

- [Palantir, add-audio-transcription](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/add-audio-transcription)
- [Palantir, add-dicom-media-set](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/add-dicom-media-set)
- [Palantir, display-annotate-spreadsheets](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/display-annotate-spreadsheets)
- [Palantir, media-workflows-overview](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/media-workflows-overview)

## 관련 문서

- [[Palantir-Media-Workflows]]
- [[Palantir-Document-Intelligence]]
