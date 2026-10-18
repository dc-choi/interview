---
tags: [palantir, pipeline-builder, media, metadata]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 미디어 타입과 메타데이터의 의미

타입 메타데이터 확인, 실제 콘텐츠 변환과 콘텐츠 의미 추출은 서로 다른 작업이다. 공식 함수 레퍼런스의 선언을 정리했으며 실제 미디어 접근은 검증하지 않았다.

## Schema 검사와 cast

`hasMediaSchemaV1`은 미디어 schema와 format을 확인해 후속 타입별 변환의 필터로 사용할 수 있다. null 참조는 false이며 Batch 지원이다. `castMediaSchemaV1`은 실제 내용의 타입을 알고 있을 때 generic schema를 더 구체적인 schema/format으로 좁힌다. PNG로 cast한다고 파일의 픽셀이 PNG로 변환된다고 설명하지 않는다.

`getMimeTypeV1`은 참조의 IANA MIME type을 String으로 반환한다. Cast와 MIME type 함수의 Supported in 목록은 비어 있으므로 지원 엔진을 추정하지 않는다. 타입 확인이 파일 존재와 접근 권한을 보장한다는 설명도 없다.

출처: [Has media schema](https://www.palantir.com/docs/foundry/pb-functions-expression/hasMediaSchemaV1), [Cast media schema](https://www.palantir.com/docs/foundry/pb-functions-expression/castMediaSchemaV1), [MIME type](https://www.palantir.com/docs/foundry/pb-functions-expression/getMimeTypeV1)

## 선택한 필드만 반환한다

| 함수 | 선택 가능한 정보 | 지원 모드 |
| --- | --- | --- |
| `getAudioMetadataV1` | audio specification, bytes, format | Batch |
| `getDocumentMetadataV1` | bytes, author, title, page count | Batch/Faster |
| `getImageryMetadataV1` | attributes, bands, bytes, dimensions, EXIF 위치, format, geographic metadata, ICC profile | Batch/Streaming |

문서 메타데이터 함수는 필드를 하나도 선택하지 않으면 null인 예제를 보여 준다. 이미지에서 적용되지 않는 메타데이터는 null이다. 예를 들어 지리 맥락이 없는 이미지의 geographic metadata가 null인 것은 파일 처리 실패와 구분해야 한다. 문서 author와 title은 파일 메타데이터이지 작성자 신원이나 내용 진실성의 검증 결과가 아니다.

출처: [Audio metadata](https://www.palantir.com/docs/foundry/pb-functions-expression/getAudioMetadataV1), [Document metadata](https://www.palantir.com/docs/foundry/pb-functions-expression/getDocumentMetadataV1), [Imagery metadata](https://www.palantir.com/docs/foundry/pb-functions-expression/getImageryMetadataV1)

## 페이지와 영상의 단위

`getPdfPageDimensionsV1`은 페이지별 height/width의 Double struct 배열을 반환하며 단위는 point이다. 화면 픽셀과 바로 같게 사용하면 안 된다. `pdfTableOfContentsV1`은 문서 heading 기반의 level/title/page 배열을 반환한다. 둘 다 Batch/Faster 지원이다.

`getTimestampsForSceneFramesV1`은 장면 전환의 timestamp와 scene_score를 반환하지만 두 필드 모두 String으로 선언되어 있다. 수치 정렬과 계산 전 실제 값 형식을 확인해야 한다. 민감도가 높으면 작은 전환도 더 찾으며 Batch 지원이다. 감지된 전환을 실제 장면 의미의 정답으로 간주하지 않는다.

## 출처

- [Palantir, PDF page dimensions](https://www.palantir.com/docs/foundry/pb-functions-expression/getPdfPageDimensionsV1)
- [Palantir, PDF table of contents](https://www.palantir.com/docs/foundry/pb-functions-expression/pdfTableOfContentsV1)
- [Palantir, Scene frame timestamps](https://www.palantir.com/docs/foundry/pb-functions-expression/getTimestampsForSceneFramesV1)
- Schema와 메타데이터 함수의 공식 출처는 해당 본문에 연결했다.

## 관련 문서

- [[Palantir-Media-Extraction-Contracts|미디어 본문과 레이아웃 추출]]
- [[Palantir-Pipeline-Expressions|Pipeline Builder 표현식]]
