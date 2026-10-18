---
tags: [palantir, foundry, pipeline-builder, parsing, media]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 파일 파싱과 미디어 참조"]
---

# Pipeline Builder 파일 파싱과 미디어 참조

파일을 테이블로 바꿀 때 한 파일이 한 행인지 여러 행인지, schema와 원본 위치가 무엇인지 먼저 정한다. 미디어 참조 생성은 내용을 파싱한 것과 다르다. 아래는 2026-10-16 공개 transform 계약이며 실제 파일을 업로드하거나 파싱하지 않았다.

## 입력 형식과 행 생성 단위

| 입력 | 행을 만드는 기준 |
|---|---|
| 일반 텍스트 | 파일마다 한 행 |
| 이메일 | `.eml`, `.emltpl`, `.msg` 파일마다 한 행, 추출할 metadata/본문 선택 |
| CSV | 지정 Struct schema로 CSV record 파싱 |
| JSON | 지정 Struct schema로 JSON record 파싱, multiline 여부 별도 |
| XML | 지정 tag마다 한 행, attribute prefix와 value tag 선택 |
| Excel | 선택 sheet와 header/skip 설정으로 행 생성 |
| 파일 metadata | 파일 내용 대신 크기, 수정 시각, dataset/branch 등 metadata를 행으로 읽음 |

파일 수를 최종 행 수로 그대로 추정하지 않는다. 이메일의 본문, 수신 정보와 첨부 목록은 선택 항목이며 추출은 접근 권한이나 개인정보 공개 허용을 뜻하지 않는다.

## CSV, JSON과 XML 설정

CSV의 header와 multiline 기본값은 false다. 기본 delimiter는 comma이고 quote는 큰따옴표다. Quote를 빈 문자열로 설정하면 quotation을 끄며, 이미 quote된 값 안의 quote escape는 별도 문자다. 파일 확장자만 보고 header나 escaping을 추정하지 않는다.

JSON의 multiline=false는 JSON record 하나가 한 줄 안에 있어야 한다는 조건이다. True는 record가 여러 줄에 걸칠 수 있다는 조건이며 CSV의 multiline과 같은 파서를 의미하지 않는다. XML의 row tag, attribute prefix와 value tag도 서로 다른 schema 결정을 나타낸다.

각 파서가 제공하지 않은 malformed record 정책을 임의의 전체 실패나 부분 성공으로 통일하지 않는다. 선언 schema, 입력 framing과 원본 추적을 함께 확인한다.

## Excel의 header 매칭과 메모리

Excel은 `.xls`, `.xlt`, `.xltm`, `.xltx`, `.xlsx`, `.xlsm`을 지원한다. Sheet pattern은 regex substring 매칭이고 빈 문자열은 모든 sheet다. 정확히 하나의 이름과 맞추려면 시작과 끝 anchor를 사용한다.

Skip 뒤 첫 행을 header로 사용하면 header 이름으로 schema를 대응시킨다. Sheet마다 순서가 달라도 되고 일부 열이 없어도 된다. 매칭은 대소문자를 무시하고 금지 문자/공백 정리, underscore 병합과 끝 underscore 제거를 적용한다. 빈 이름은 `_untitled_column`, 중복 이름은 두 번째부터 `_2` 같은 suffix로 구분한다.

Header를 사용하지 않으면 ordered schema와 위치의 대응을 확인하고 skip 수에 실제 header도 포함한다. File path, sheet name과 1부터 시작하는 원본 row number를 추가하면 파싱 결과를 추적할 수 있다.

개별 Excel 파일 처리는 여러 Spark executor로 분산되지 않는다. 정확히 한 파일이면 local Spark 사용을 권장하며, 큰 파일은 executor 또는 local Spark driver 메모리가 필요할 수 있다. Preview가 실패해도 적절한 build 설정으로 deploy가 성공할 수 있다는 설명을 양쪽의 동일한 메모리 보장으로 해석하지 않는다.

## 공간 파일의 framing과 CRS

GeoJSON file 파서는 한 파일 전체가 multiline FeatureCollection이거나 한 줄마다 완전한 Feature인 두 모드를 설명한다. Multiline 옵션을 이에 맞춰야 한다. Geometry와 `_error`, `_file`, 선택한 property 열을 만들며 property schema가 없으면 전체 properties를 문자열 한 열로 추출한다.

Shapefile은 같은 이름의 `.shp`, `.shx`, `.dbf` 세 파일이 필요하고 다른 확장자는 무시한다. Point, polyline, polygon과 multipoint를 지원한다. Property 이름과 값의 encoding은 UTF-8만 지원하며 다른 encoding을 지정한 `.cpg`도 무시한다.

GeoJSON과 shapefile의 source CRS 기본값은 WGS 84(EPSG:4326)다. 원천이 다르면 명시해 downstream 좌표를 표준화한다. 파일 이름이나 확장자만으로 CRS를 판정하지 않는다.

Raw KML file 파서는 파일마다 typed geometry list를 만든다. `Include raw KML` 기본값은 true이며 큰 파일에서는 full content를 행에 넣다가 메모리 부족이 날 수 있다. False여도 `raw_kml` 열은 schema 안정성을 위해 남고 값만 null이다. Prepare 기본값은 true다. Geometry expression의 KML fragment 파서와 이 파일 파서를 구분한다.

## 압축 해제, 빈 입력과 미디어

Gzip/tar/zip transform은 파일 집합을 풀며 zip은 비 zip 파일을 무시한다. 해제 transform과 downstream preview에는 editor permission이 필요하다는 조건이 있다. Preview 권한과 파일의 실제 파싱 성공은 별개다. Union files와 Filter files는 테이블 행 union/filter와 다른 Files 입력을 사용한다.

Empty file은 선택 read mode를, Empty media set file은 String schema와 snapshot read mode를 사용한다. Empty table의 Struct schema 계약과 같은 타입으로 처리하지 않는다.

Dataset의 Get media references는 파일 참조와 기본 metadata를 만든다. MIME type을 강제로 지정하지 않으면 각 파일을 읽어 탐지한다. 강제 지정은 해당 형식의 내용이 유효하다고 검증하는 기능이 아니다.

Media set을 table rows로 바꾸는 변환도 reference와 metadata를 반환한다. Path 기준 dedup은 snapshot mode에서만 지원한다. 공개 V1/V2 페이지 본문은 같은 계약이지만 이름만 보고 모든 버전 동작이 영구히 동일하다고 보장하지 않는다.

파일 parser, 압축 해제와 media reference 변환 대부분은 Batch다. 파일 metadata는 Batch/Faster, Empty media set file은 Batch/Streaming이다. 일부 enum 목록과 공개 예시는 `...`로 생략되어 전체 값 목록이나 재현 가능한 입력을 제공하지 않는다.

## 번역 경로로 보존한 Files/Media 계약

영어 경로를 확보하지 못한 `filesTextBlockV1`, `mediaTextBlockV1`, `transformMediaSetV1`, `parseExcelV1`은 공식 중국어 AIP 미검증 번역본으로 대조했다. Files/Media Text block은 각각 Files/Media input과 optional string 설명을 받고 데이터를 바꾸지 않으며 Batch/Streaming을 지원한다.

Transform media set V1은 Batch에서 Media 입력의 각 항목에 Media reference expression을 적용한다. 이를 media body 파싱이나 table row 반환으로 해석하지 않는다. Excel V1은 Batch, 형식 목록, sheet regex substring, ordered schema와 header 정규화 규칙을 설명하지만 V2의 원본 row-number/메모리 안내를 명시하지 않는다. 두 버전의 parameter 집합을 같은 것으로 확정하지 않는다.

## 출처

- [Palantir, Extract rows from a dataset of text files](https://www.palantir.com/docs/foundry/pb-functions-transform/parseTextFileV1)
- [Palantir, Extract rows from a dataset of email files](https://www.palantir.com/docs/foundry/pb-functions-transform/extractEmailDataAsRowsV1)
- [Palantir, Extract file metadata from dataset as rows](https://www.palantir.com/docs/foundry/pb-functions-transform/extractFileMetadataAsRowsV1)
- [Palantir, Extract rows from a CSV file](https://www.palantir.com/docs/foundry/pb-functions-transform/parseCsvV1)
- [Palantir, Extract rows from a JSON file](https://www.palantir.com/docs/foundry/pb-functions-transform/parseJsonV1)
- [Palantir, Extract rows from an XML file](https://www.palantir.com/docs/foundry/pb-functions-transform/xmlTagExtractV1)
- [Palantir, Extract rows from an Excel file](https://www.palantir.com/docs/foundry/pb-functions-transform/parseExcelV2)
- [Palantir, Extract rows from a GeoJSON file](https://www.palantir.com/docs/foundry/pb-functions-transform/parseGeoJsonV1)
- [Palantir, Extract rows from shapefile](https://www.palantir.com/docs/foundry/pb-functions-transform/parseShapefileV1)
- [Palantir, Parse KML files into geometry lists](https://www.palantir.com/docs/foundry/pb-functions-transform/parseKmlFilesV1)
- [Palantir, Decompress gzip files](https://www.palantir.com/docs/foundry/pb-functions-transform/ungzipFilesV1)
- [Palantir, Decompress tar files](https://www.palantir.com/docs/foundry/pb-functions-transform/untarFilesV1)
- [Palantir, Unzip files](https://www.palantir.com/docs/foundry/pb-functions-transform/unzipFilesV1)
- [Palantir, Filter files](https://www.palantir.com/docs/foundry/pb-functions-transform/filterFilesV1)
- [Palantir, Union files](https://www.palantir.com/docs/foundry/pb-functions-transform/unionFilesV1)
- [Palantir, Empty file](https://www.palantir.com/docs/foundry/pb-functions-transform/emptyFileV1)
- [Palantir, Empty media set file](https://www.palantir.com/docs/foundry/pb-functions-transform/emptyMediaSetFileV1)
- [Palantir, Get media references datasets](https://www.palantir.com/docs/foundry/pb-functions-transform/loadMediaReferencesV1)
- [Palantir, Convert media set to table rows V1](https://www.palantir.com/docs/foundry/pb-functions-transform/loadMediaSetReferencesV1)
- [Palantir, Convert media set to table rows V2](https://www.palantir.com/docs/foundry/pb-functions-transform/loadMediaSetReferencesV2)

- [Palantir, filesTextBlockV1 (중국어 AIP 미검증 번역)](https://palantir.com/docs/zh/foundry/pb-functions-transform/filesTextBlockV1/)

- [Palantir, mediaTextBlockV1 (중국어 AIP 미검증 번역)](https://palantir.com/docs/zh/foundry/pb-functions-transform/mediaTextBlockV1/)

- [Palantir, parseExcelV1 (중국어 AIP 미검증 번역)](https://palantir.com/docs/zh/foundry/pb-functions-transform/parseExcelV1/)

- [Palantir, transformMediaSetV1 (중국어 AIP 미검증 번역)](https://palantir.com/docs/zh/foundry/pb-functions-transform/transformMediaSetV1/)

## 관련 문서

- [[Palantir-Geospatial-Coordinates-and-Formats|Geometry 파싱과 CRS]]
- [[Palantir-Pipeline-Row-and-Schema-Transforms|Schema와 열 보존]]
- [[Palantir-Pipeline-Transforms|테이블과 파일 변환 지도]]
