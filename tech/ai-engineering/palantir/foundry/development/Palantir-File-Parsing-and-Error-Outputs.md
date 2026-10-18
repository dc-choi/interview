---
tags: [palantir, parsing, excel, filesystem]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 파일 parsing과 오류 결과"]
---

# 파일 parsing과 오류 출력

`filesystem().files()`는 file metadata dataframe이다. RDD map/flatMap에서 파일을 열고 row를 만들 수 있다. Path/size/modified와 처리 시각을 남겨 누락/재처리를 추적한다. 실패를 일반 문자열로 숨기는 대신 구조화된 error output을 검토한다. 아래는 공식 예제 대조이며 실제 runtime 실행은 확인하지 않았다.

## 분산 parsing과 driver collect는 다르다

Openpyxl/일반 파일 예제는 worker의 parsed Python object를 `.collect()`해 driver에서 dataframe으로 바꾼다. 모든 content가 driver memory에 모이므로 대규모 분산 출력과 같지 않다. `parse_workbook`, `convert_to_df`, `process_file_locally_and_return_python_object`는 사용자 구현 placeholder이며 Foundry API가 아니다.

Active sheet 첫 행 header 예제는 multi-sheet/merged header/formula 일반 해석을 보장하지 않는다. None/빈 파일과 파일 0개에서 union/reduce를 처리한다. 고정 schema는 empty RDD를 처리하지만 allowMissingColumns는 다른 type의 의미를 맞추지는 않는다. SAS 예제는 첫 matching file만 읽으며 package/runtime와 driver memory를 검증한다. ORC는 Hadoop path의 Spark reader 경로다.

## Excel 형식을 먼저 분류한다

Java parser는 SimpleHeaderExtractor(rowsToSkip), MultilayerMergedHeaderExtractor(cell 범위), FormParser(sheet selector와 FieldSpec/cell assertion)를 구분한다. ParseResult optional dataframe이 비었으면 0행과 오류를 구별하고 errorDataframe을 별도 보존한다.

ExcelJS object Function은 attachment bytes→header 검증→unit/target/property/value unpivot→object edit 흐름이다. 1-based cell 배열, 누락 header와 parseFloat NaN을 확인한다. 예제의 `value !== 0`은 유효한 0을 버릴 수 있다. Random UUID 생성도 upload 재실행에 중복 object를 만들 수 있어 upload key/version 기반 멱등성을 정한다.

Catch에서 upload status를 Failed로 바꾼다고 앞선 edits가 자동 취소된다는 보장은 없다. 검증을 쓰기 전에 마치고 apply/실패 원자성은 Action 계약과 대조한다. Non-null assertion은 attachment 필수 검증을 대신하지 않는다.

## Archive와 원본 bytes

Raw copy는 binary read/write로 bytes를 보존한다. 여러 regex 결과를 union하면 같은 path가 중복 선택되어 동시 write가 생길 수 있으므로 deduplicate한다. Gzip은 decompress 뒤 encoding을 명시한다. Zip CSV의 `line.split(',')`는 quoted comma/newline을 처리하는 CSV parser가 아니다.

Zip 전체 memory load, driver file-list collect, decompressed 크기/파일 수와 경로를 확인한다. Arbitrary binary를 text mode로 추출하지 않는다. Virtual filesystem의 `.name`이 로컬 path라는 가정 없이 zip stream 지원을 확인한다. DOCX 예제는 첫 번째 파일을 Document로 읽을 뿐 output/table/header/image 추출을 완성하지 않는다.

## 출처

- [Palantir, Raw file parsing transforms](https://www.palantir.com/docs/foundry/code-examples/raw-file-parsing-transforms)
- [Palantir, Object Functions parsing](https://www.palantir.com/docs/foundry/code-examples/functions-on-objects-functions-on-objects)
- [Palantir, Raw file parsing Functions](https://www.palantir.com/docs/foundry/code-examples/raw-file-parsing-functions-on-objects)

## 관련 문서

- [[Palantir-Media-Extraction-and-Evidence|원본과 추출]]
- [[Palantir-Transform-Identity-and-Algorithms|식별자와 재처리]]
