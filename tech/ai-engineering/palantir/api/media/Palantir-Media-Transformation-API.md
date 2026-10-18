---
tags: [palantir, foundry, api, media, ocr, vlm]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 비동기 Media 변환과 추출 결과의 계약

Preview `POST /api/v2/mediasets/{mediaSetRid}/items/{mediaItemRid}/transform`은 transformation을 받아 jobId와 status를 반환한다. `api:mediasets-transform` scope 외에 원본을 읽을 `api:mediasets-read` 또는 MediaItemReadToken이 필요하다. transform scope만 있다고 임의 원본을 변환할 수 있는 것은 아니다.

같은 item의 `/transformationJobs/{transformationJobId}`로 상태를 읽고 `/result`로 완료 결과의 binary content를 받는다. status는 PENDING/FAILED/SUCCESSFUL이다. 성공 완료 전 result 요청은 오류다. 세 endpoint 모두 preview=true와 transform scope를 사용한다. 반환 binary의 내용은 operation에 따라 이미지, JSON, 텍스트나 archive가 될 수 있으므로 HTTP stream 형식과 내부 형식을 구별한다.

명세에는 결과 유효기간, polling 간격, 변환 중복 방지, 완료 결과의 Media Set 자동 저장이 별도 보장되어 있지 않다. jobId 수신을 처리 완료로 기록하지 않는다.

## 이미지 연산은 목록 순서로 적용한다

image transformation은 jpg/tiff/png/webp encoding과 ordered operations를 받는다. crop 뒤 resize와 resize 뒤 crop은 같은 요청이 아니다.

| 연산 | 입력과 경계 |
|---|---|
| rotate | 시계 방향, DEGREE_90/180/270 또는 UNKNOWN enum |
| resize | width/height, 한쪽만 있으면 비율 유지, optional autoOrient |
| resizeToFitBoundingBox | 필수 width/height, 비율 유지해 최대한 맞춤 |
| crop | 좌상단 기준 xOffset/yOffset과 width/height pixel |
| grayscale | grayscale 변환 |
| contrast | equalize, rayleigh의 sigma 0~1, binarize의 optional threshold 0~255 |
| tile | zoom/x/y, EPSG 3857 Slippy tile, geo TIFF/NITF만, 최대 1억 pixel |
| encrypt/decrypt | polygon 영역, cipherLicenseRid, commutative encryption |
| annotate | boundingBox, optional label/RGBA/thickness/fontSize |

binarize threshold를 빼면 자동 계산한다. polygon은 인접 pixel 좌표를 연결하고 마지막에서 처음으로 닫는다. pixel 원점은 좌상단 (0,0)이다. annotation RGB는 0~255지만 alpha는 0~1이다. 같은 범위의 정수로 처리하지 않는다.

## OCR와 V2 텍스트 추출

imageToText의 extractTextV2는 결합 텍스트와 페이지별 텍스트를 담은 JSON이다. extractLayoutAwareTextV2는 block과 bounding box를 담은 구조화 JSON이다. format의 TEXT/MARKDOWN/HTML은 각 block content 표현을 정하며 결과 전체가 그 문자열 형식이 되는 것은 아니다.

documentToText의 V2 두 연산은 PDF만 지원하며 config의 format/mode/languages와 optional pageRange를 받는다. mode는 AUTO/ELECTRONIC/SCAN이다. layout-aware 결과는 page별 block/bounding box JSON이고 일반 V2는 page별 text다.

legacy extractLayoutAwareContent는 deprecated이며 image와 document 모두 V2 전환 시 결과 schema가 달라진다. operation 이름만 교체하고 이전 parser를 유지하면 안 된다. OCR 언어/문자 체계는 language 또는 script union이며 한국어는 KOR/KOR_VERT, HANGUL/HANGUL_VERT를 포함한다. legacy layout-aware parameters의 languages는 language enum 목록으로 형태가 다르다.

ocr는 필수 outputFormat hocr/text와 optional language/script 목록을 받는다. document의 ocrOnPage/ocrOnPages와 extractUnstructuredTextFromPage는 pageNumber를 받는다. pageNumber의 zero-based 여부를 해당 설명 없이 모든 OCR 연산에 일반화하지 않는다.

## 페이지 범위와 VLM 전처리

PDF slicePdfRange의 startPageInclusive/endPageExclusive는 0-based 반열림 구간이다. strictlyEnforceEndPage는 기본 true라 문서 끝을 넘으면 오류, false면 끝에서 자른다. V2 pageRange도 start 포함/end 제외이며 생략하면 문서 시작/끝이다. 반면 extractTextFromPagesToArray는 zero-based endPage를 **포함**한다. 범위를 공통 helper로 바꿀 때 이 차이를 유지한다.

extractAllText는 PDF 전체 text를 포함하지만 DOCX는 일반 paragraph만 포함한다. 이를 DOCX의 table/header 등을 빠짐없이 추출하는 계약으로 확대하지 않는다. 다른 연산으로 PDF form field, 목차, point 단위 page dimensions를 얻을 수 있다.

extractVlmText는 chat llmSpec이 필수다. modelLocator는 model API name 또는 registeredModelRid이며 systemPrompt/userPrompt, optional maxTokens를 넣는다. preprocessingConfiguration은 layoutAware 또는 extractText이고 layoutAware에는 optional table cropping prompt가 있다. imageSpec은 resizing mode, MIME format과 width/height를 정한다. outputFormat은 MARKDOWN이고 optional pageRange가 있다. 이는 VLM 기반 추출 요청 계약이며 정확성이나 표 복원 성공을 보장하는 문구가 아니다.

## 음성, 영상과 기타 변환

| 입력/출력 | 지원 작업과 인자 |
|---|---|
| audio | channel 선택, chunkDurationMilliseconds/chunkIndex, convert, mp3/wav/ts encoding |
| audioToText | transcribe 또는 waveform |
| video | mp4/mov/mkv/ts transcode 또는 지정 duration/index의 chunk |
| videoToAudio | 첫 audio stream 추출, mp3/wav/ts encoding |
| videoToImage | 첫 full scene frame 또는 timestamp(초) frame, optional width/height |
| videoToArchive | scene frame 이미지를 TAR로 묶음, image encoding과 sceneScore |
| videoToText | scene frame timestamp JSON, sceneScore |
| imageToDocument | createPdf |
| documentToDocument | PDF 변환 또는 page slice |
| documentToImage | zero-based pageNumber, 기본 첫 page, 비율 유지 resize/bounding box |
| dicomToImage | renderImageLayer, layer 생략 시 가운데 layer |
| spreadsheetToText | 필수 sheetName으로 sheet JSON 변환 |
| emailToText | email body를 TEXT/HTML로 추출 |
| emailToAttachment | attachmentIndex와 metadata에 일치하는 mimeType으로 bytes 추출 |
| imageToEmbedding | modelId GOOGLE_SIGLIP_2 |

WAV의 sampleRate 기본값은 44,100 Hz, channel 수 기본값은 2다. video chunk 마지막 조각은 지정 길이보다 짧을 수 있다. sceneScore는 MORE_SENSITIVE/STANDARD/LESS_SENSITIVE다. video frame timestamp는 초지만 chunk duration은 밀리초다.

transcribe language 생략 시 처음 30초로 자동 감지한다. diarize 기본 false이며 MORE_ECONOMICAL에서는 지원하지 않는다. 출력은 optional plainTextNoSegmentData(addTimestamps 필수), JSON 또는 PTTML이다. waveform은 peaksPerSecond 1~1,000을 받아 0~1 amplitude JSON을 반환한다.

공개 schema와 설명을 확인했으며 실제 변환, 모델 가용성, 추출 품질이나 실행 성능을 시험하지 않았다. Preview 변경과 공통 오류는 [[Palantir-API-Client-Contract]]를 함께 확인한다.

## 출처

- [Palantir, Transform Media Item](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/transform-media-item)
- [Palantir, Get Transformation Job Status](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/get-transformation-job-status)
- [Palantir, Get Transformation Job Result](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/get-transformation-job-result)
