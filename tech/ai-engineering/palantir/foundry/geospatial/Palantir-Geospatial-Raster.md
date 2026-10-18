---
tags: [palantir, foundry, geospatial]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Raster 처리와 지도 표시 한도

Raster media set은 TIFF/GeoTIFF, NITF, JPEG2000을 지원한다. 이 페이지의 raster workflow는 PNG/JPEG를 file-level 처리 대상으로 구분한다. 일반 image media 지원과 지리 raster schema 지원은 같지 않다.

적재한 media reference를 pipeline과 object property에 연결하고 Capabilities에서 backing media set을 선언한다. 지도에 표시하는 raster file은 67MB 초과를 지원하지 않는다고 명시한다. 저장 가능한 media item의 크기와 지도 renderer의 한도를 구분한다.

Rasterio/PIL 등으로 사전처리하고 MediaSetInput/MediaSetOutput으로 결과를 만들 수 있다. 원문 GeoTIFF 예제는 map(process_file, files)의 iterator를 소비하지 않아 Python3에서 처리가 실행되지 않을 수 있으며 output 작성도 비워 둔다. Temp file로 다운로드하고 flush 후 rasterio로 여는 아이디어만 참고하며 완성된 pipeline로 복사하지 않는다.

## 출처

- [Palantir, raster-data](https://www.palantir.com/docs/foundry/geospatial/raster-data)
- [Palantir, raster_data](https://www.palantir.com/docs/foundry/geospatial/raster_data)

## 관련 문서

- [[Palantir-Geospatial]]
- [[Palantir-Geotemporal-Series]]
- [[Palantir-Map]]
- [[Palantir-Media-Workflows]]
