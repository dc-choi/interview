---
tags: [palantir, foundry, python, transforms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Python media 변환의 식별자, 행수와 실패"]
---

# Python media 변환의 식별자, 행수와 실패

transforms-media는 MediaSetInput/Output 선언을 runtime handle로 바꾼다. Tabular input/output과 혼합할 수 있으며 single-node listing은 pandas 등, Spark listing은 DataFrame을 쓴다. Code Repositories media preview는 미지원이다.

## Identity와 write

Path listing과 transform(deduplicate_by_path=True)은 같은 path의 최신 media item만 남긴다. 전체 item history가 필요하면 명시적으로 dedup을 끈다. get_media_item/by_path는 random access 없는 stream이며 metadata 조회는 전체 item download와 별개다. Reference column typeclass {kind: reference, name: media_reference}가 참조 해석을 돕는다.

Fast-copy는 download/re-upload를 피한다. put_dataset_files는 schema mismatch 시 기본 실패하고 ignore_items_not_matching_schema=True이면 누락시킨다. Spark distributed API라 lightweight에는 미지원이다. Output basename만 쓰는 예제는 다른 directory의 동일 filename 충돌을 해결하지 않는다.

Transactional media output 기본 replace와 transactionless 기본 modify를 구분한다. Transactionless는 branch를 empty로 reset할 수 없어 replace 불가다. set_write_mode는 첫 item upload 전에 호출한다. 새 media set annotation은 첫 build에 생성한 뒤 수정하지 않는다고 안내한다. 증분 mode는 별도 연결 문서를 따른다.

## Fluent transform과 반환 형태

Media→media 메서드는 MediaSetInputTransform을 반환하고 chain한 뒤 output.write한다. Text/metadata extraction은 whole set에서 DataFrame, 단일 item에서는 str/list 등 서로 다른 shape를 반환한다. Whole-set write(return_dataframe=True)는 media_item_rid/path/media_reference를 돌려주며 lazy evaluation이므로 action과 side effect를 구분한다. Multi-item output의 path에는 crop parameter/page 같은 식별값이 추가될 수 있다.

output.write의 suppress_errors 기본False는 build 실패이고 True면 오류가 reference column에 들어갈 수 있다. OCR/raw text/embedding/transcription 같은 extraction은 suppress_errors 기본True인 API가 많다. 비어 있는 text와 실패를 구분해 error row를 검토해야 한다. Single-item과 whole-set에 적용되는 옵션도 다르다.

## Document, image와 좌표

Page range는 zero-based start inclusive/end exclusive다. Slice는 end가 page 수를 넘으면 기본 strict fail하고 False일 때 마지막 page까지 자른다. OCR은 scan/image에, raw text는 electronic PDF에 권한다. Layout-aware V2는 pages array의 block별 type/confidence/id/bounding box/text/page number를 돌려주며 TEXT/MARKDOWN/HTML과 ELECTRONIC/SCAN/AUTO 설정이 있다. OCR/VLM extraction은 정확성 평가를 거친다.

Resize는 기본1024와 aspect ratio 유지, crop은 top-left offset/width/height를 쓴다. Binarize는 threshold 이상255/미만0, rotate는90/180/270 enum이다. Rayleigh sigma는0~1이라고 안내하지만 분포 설명을 통계학의 보편 정의로 채택하지 않는다. Encrypt/decrypt는 polygon과 Cipher license resource 권한이 필요하며 단순 image 변환과 보안 해제를 구분한다.

Tile은 EPSG3857 Slippy tile, georeferenced TIFF/NITF와 최대1억pixel 제약을 갖는다. z≥0,0≤x,y<2^z이고 x는 서→동,y는 북→남이다. Dynamic crop/tile/frame parameter를 df/on으로 넘기면 media set과 DataFrame의 intersection만 처리한다. Join key 중복과 missing item 때문에 원래 item 수가 보존된다고 보장하지 않는다.

## Audio, video와 metadata

Chunk duration은 양수 milliseconds이고 기본10000이다. Audio chunk는 TS만 지원한다고 명시한다. Frame-at-timestamp는 seconds여서 chunk duration과 단위를 혼동하지 않는다. Scene frame은 sensitivity enum으로 선택하고 추출 image는 TAR에 담길 수 있다. Waveform은 normalized0~1, peaks_per_second는1~1000이다.

Form fields/TOC/page dimensions/embedding/scene timestamps/email/spreadsheet extraction은 JSON을 담은 str일 수 있어 바로 typed vector/struct로 가정하지 않는다. Image embedding 기본 GOOGLE_SIGLIP_2는 source 시점의 기본값이다. Filter schema/format 목록은 지원 안내이지 모든 파일 내용의 valid parse 보장이 아니다. 메서드 표의 .../원문 코드 typo를 완전한 실행 schema로 보장하지 않으며 실제 media job은 실행하지 않았다.

## 출처

- [Palantir Python transforms, media-set-transforms-api](https://www.palantir.com/docs/foundry/transforms-python/media-set-transforms-api)
- [Palantir Python transforms, media-sets](https://www.palantir.com/docs/foundry/transforms-python/media-sets)

## 관련 문서

- [[Palantir-Python-Transforms]]
- [[Palantir-Code-Transforms]]
- [[Palantir-Python-Spark-Incremental-Batches]]
- [[Palantir-Python-Incremental-Media-Contracts]]
