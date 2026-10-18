---
tags: [palantir, pipeline-builder, media, ocr]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 미디어 추출의 타입, 페이지와 오류

미디어 참조를 문자열로 만드는 작업에서도 출력 구조와 오류 처리 방식이 다르다. 아래는 공식 표현식 레퍼런스를 읽고 비교한 내용이며 실제 파일 처리와 모델 실행은 검증하지 않았다.

## 일반 텍스트와 레이아웃

| 함수 | 반환 구조 | 사용 조건 |
| --- | --- | --- |
| `imageOcrV2` | String | 이미지의 OCR 결과이며 언어, 문자 체계와 출력 형식을 지정한다. |
| `imageLayoutAwareContentExtractionV2` | Array of block Struct | 블록 순서/ID/종류, 내용, bounding box, 언어와 confidence를 포함한다. |
| `pdfTextExtractionV2` | Array of String | PDF의 페이지별 raw text를 추출한다. |
| `pdfOcrV2` | Array of String | 페이지별 OCR 또는 digital text 방식을 선택한다. |
| `pdfLayoutAwareContentExtractionV2` | Array of Array of block Struct | 페이지와 블록 계층을 함께 보존한다. |

PDF 함수의 Start page 생략은 첫 페이지, End page 생략은 마지막 페이지이며 끝 페이지를 포함한다. Text extraction 예제의 1~2는 두 페이지 결과다. 출력 배열 위치와 원문 페이지 번호의 관계를 보존해야 후속 인용이 가능하다.

PDF OCR과 layout-aware 함수는 Digital Text, Full-page Scan, Conditional Scan을 구분한다. Conditional Scan은 digital text가 적거나 없는 페이지를 best effort로 찾아 스캔한다. 이미 들어 있는 텍스트가 정확한지까지 보장하는 판정은 아니다.

출력 형식은 Text/Markdown/HTML/hOCR을 선택할 수 있다. Layout block의 `bounding_box`는 String으로 선언되어 있다. 이름만 보고 좌표 struct라고 가정하지 않는다. PDF block은 `page` 필드도 포함한다.

공식 선언은 Error handling을 FAIL/NULL, Extract method를 사용자 친화적 명칭으로 표시하지만 예제는 `FAIL_FAST`, `AUTO`를 사용한다. 화면 명칭과 실제 enum 값을 같은 문자열이라고 가정하지 않는다. 실제 입력 인터페이스의 계약을 확인해야 한다. 이 다섯 함수는 Batch/Faster 지원이다.

출처: [Image OCR](https://www.palantir.com/docs/foundry/pb-functions-expression/imageOcrV2), [Image layout](https://www.palantir.com/docs/foundry/pb-functions-expression/imageLayoutAwareContentExtractionV2), [PDF text](https://www.palantir.com/docs/foundry/pb-functions-expression/pdfTextExtractionV2), [PDF OCR](https://www.palantir.com/docs/foundry/pb-functions-expression/pdfOcrV2), [PDF layout](https://www.palantir.com/docs/foundry/pb-functions-expression/pdfLayoutAwareContentExtractionV2)

## 음성과 임베딩

`audioTranscriptionV1`은 String 또는 `{ok, error}` struct를 반환한다. 언어를 주지 않으면 처음 30초에서 추정하며, 성능 모드를 생략하면 More economical이 기본이다. Batch/Faster 지원이다. 처음 30초의 언어가 이후 전체 파일을 대표하지 않는 자료는 언어 추정 결과를 별도 확인한다.

`cpuJsonAudioTranscriptionV1`과 `gpuJsonAudioTranscriptionV1`은 모두 JSON 내용이 담긴 String을 반환하며 Batch 지원이다. 이름에 JSON이 있어도 이미 파싱된 struct가 아니다. 두 문서의 segment 예제는 중간이 생략되어 있으므로 전체 JSON 스키마의 근거로 사용하지 않는다.

`imageToEmbeddingsV1`은 vision을 지원하는 모델이 필요하고 Batch에서 지원한다. Output mode 설명은 성공 `ok`, 오류 `errors`를 가진 구조를 말하지만 Output type은 Embedded vector로만 표시한다. With errors의 실제 스키마는 별도 확인해야 한다. null 입력은 null이라는 예제가 있으며 모델 간 차원과 벡터 공간이 같다는 보장은 없다.

출처: [Audio transcription](https://www.palantir.com/docs/foundry/pb-functions-expression/audioTranscriptionV1), [CPU JSON](https://www.palantir.com/docs/foundry/pb-functions-expression/cpuJsonAudioTranscriptionV1), [GPU JSON](https://www.palantir.com/docs/foundry/pb-functions-expression/gpuJsonAudioTranscriptionV1), [Image embeddings](https://www.palantir.com/docs/foundry/pb-functions-expression/imageToEmbeddingsV1)

## 이메일과 스프레드시트

`extractEmailBodyV1`은 이메일 미디어에서 plain text 또는 HTML 본문을 꺼내며 기본값은 plain text다. `spreadsheetJsonExtractionV1`은 모든 sheet의 내용을 `Map<String, Struct>`로 반환하고 Table과 Merged cells 필드를 선택한다. 두 함수 모두 FAIL/NULL 오류 정책과 Batch 지원으로 선언되어 있다. 이메일 첨부파일 추출이나 스프레드시트 수식 재계산을 이 함수 이름만으로 보장하지 않는다.

## 이전 버전 번역본의 경계

다음 출처는 공식 AIP 기계번역이며 정확성 미검증 경고가 있다. 현재 영어 문서와 같은 버전으로 취급하지 않는다.

Image OCR V1은 String, PDF OCR V1과 PDF text extraction V1은 페이지별 String 배열을 반환한다고 설명한다. PDF 범위는 1부터 시작하며 양 끝을 포함하고 end의 음수 index를 지원한다. OCR V1의 기본 오류 정책은 fail-fast이고 null 반환 옵션이 있다. 현재 버전의 추가 출력/엔진 옵션이 V1에도 있다고 가정하지 않는다.

## 출처

- [Palantir, imageOcrV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/imageOcrV1/)
- [Palantir, pdfTextExtractionV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/pdfTextExtractionV1/)
- [Palantir, pdfOcrV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/pdfOcrV1/)

- [Palantir, Extract email body](https://www.palantir.com/docs/foundry/pb-functions-expression/extractEmailBodyV1)
- [Palantir, Extract spreadsheet content](https://www.palantir.com/docs/foundry/pb-functions-expression/spreadsheetJsonExtractionV1)
- OCR, 음성과 임베딩 함수의 공식 출처는 해당 본문에 연결했다.

## 관련 문서

- [[Palantir-Model-Expression-Contracts|모델 호출의 오류와 입력 한도]]
- [[Palantir-Schema-Parsing-and-Cleaning|JSON 문자열 파싱]]
- [[Palantir-Pipeline-Expressions|Pipeline Builder 표현식]]
