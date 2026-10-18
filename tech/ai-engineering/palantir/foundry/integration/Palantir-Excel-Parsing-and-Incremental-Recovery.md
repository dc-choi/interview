---
tags: [palantir, excel, parsing]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Excel 파싱과 incremental 복구

## 파싱 경로

Excel을 tabular dataset으로 읽는 방법에는 Pipeline Builder, Python/openpyxl, Java/POI가 있다. transforms-excel-parser는 POI를 감싸 불일치 header, 여러 sheet/table과 form-style field를 처리한다. 원본 spreadsheet를 보존하는 source-of-truth workflow에는 spreadsheet media set을 별도로 검토한다.

Java Maven library는 transforms-excel-parser-bundle을 backing repository로 선택하고 build.gradle dependency를 추가한다. 이름에 eddie가 있는 bundle은 Pipeline Builder 내부 용도이므로 일반 repository dependency로 선택하지 않는다. 문서의 다운로드 javadoc version을 현재 배포 library의 latest version으로 간주하지 않는다.

지원 형식은 xls/xlt/xltm/xltx/xlsx/xlsm이며 xlsb는 미지원이다. Code Assist preview에서 동일 class의 서로 다른 loader 때문에 두 번째 실행이 실패하는 현상은 build-time 실패와 구분하고 browser refresh를 시도할 수 있다.

## Schema와 추출

SimpleHeaderExtractor는 skip row를, MultilayerMergedHeaderExtractor는 header cell 범위를 지정한다. FormParser는 sheet selector와 cell/인접 label assertion으로 비정형 field를 읽는다. Key별 parser를 하나의 TransformsExcelParser에 등록하면 파일을 한 번 메모리에 열어 여러 output을 만들 수 있다.

기본 인터페이스가 부족하면 custom HeaderExtractor 등으로 header 위치를 동적으로 찾는다. 예제의 고정 header 높이/폭, 마지막 row 경계와 RID placeholder는 실제 입력에 맞게 검증한다. 예제 전체를 그대로 production 코드로 채택하지 않는다.

## 오류와 incremental 처리

ParseResult의 dataframe 부재는 오류와 같지 않다. Sheet selector가 아무 sheet도 고르지 않으면 데이터가 없지만 errorDataframe에도 오류가 없을 수 있다. 기대한 sheet가 필수라면 별도 검증을 둔다.

UNPROCESSED 파일만 읽는 incremental pipeline에서는 errorDataframe을 별도 output으로 쓰고 성공 처리하면 잘못 읽은 파일이 자동 재시도되지 않을 수 있다. Fail-fast를 선택하거나 오류 파일 재업로드/명시적 snapshot 재처리를 계획한다. 출력의 dummy transaction으로 snapshot을 유도하는 복구는 전체 재계산 영향을 확인한다.

Header case를 lower/upper로 정규화하면 incremental batch 사이의 열 대소문자 차이를 줄인다. writeAppendingIfPossible은 파일 변경 유형에 따라 APPEND 또는 merge-and-replace SNAPSHOT을 고르므로 항상 append한다고 해석하지 않는다.

## 메모리

압축된 Excel 파일 크기는 POI의 in-memory footprint와 다르다. 작은 파일도 task당 메모리가 부족할 수 있고 Spark module failure 또는 장시간 정체로 나타날 수 있다. 10분/파일이라는 문서 단서는 한 task가 여러 파일을 처리하는 상황에서는 직접 적용하기 어렵다.

Executor memory를 늘리거나 core/task 동시성을 줄여 task당 메모리를 확보할 수 있다. 기본 zip-bomb/max-byte-array 설정을 라이브러리가 다룬다는 설명을 무제한 안전성 보장으로 확대하지 않는다. 실제 파일 규모와 실패 위치를 확인한다.

## 출처

- [Palantir Foundry, Transforms Excel Parser](https://www.palantir.com/docs/foundry/microsoft-excel/transforms-excel-parser/)

## 관련 문서

- [[Palantir-Foundry-Data-Integration]]
- [[Palantir-Foundry-Performance]]
