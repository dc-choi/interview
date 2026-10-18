---
tags: [palantir, foundry, api, media, metadata]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Media Item 정보와 형식별 Metadata

`GET /api/v2/mediasets/{mediaSetRid}/items/{mediaItemRid}`는 item info, 같은 경로의 `/metadata`는 media 종류별 상세 metadata다. 둘 다 `api:mediasets-read` scope를 요구한다. 본문 stream과 metadata 조회를 구별한다.

## 크기와 논리 시각

info는 viewRid, logicalTimestamp, sizeBytesLong이 필수이며 path, attribution, 원본/현재 MIME type이 추가될 수 있다. logicalTimestamp는 순서를 위한 양수 microsecond 값이며 clock drift/순서 조정을 받아 시스템 시계와 약간 다를 수 있다. 생성 시각 attribution.creationTimestamp와 같은 정확한 wall clock으로 취급하지 않는다. logicalTimestamp와 sizeBytesLong은 long format의 문자열이다.

sizeBytes는 deprecated다. info에서는 2 GiB 이상이면 필드가 빠진다. 형식별 metadata의 sizeBytes는 2,147,483,647에서 포화된다. 큰 파일의 정확한 크기는 sizeBytesLong으로 읽으며 두 endpoint의 deprecated 동작도 같다고 가정하지 않는다.

## 형식별 union을 유지한다

| 유형 | 주요 정보와 형식 |
|---|---|
| cad | STEP, optional units.lengthUnit |
| document | PDF/DOC/DOCX/TXT/PPTX/RTF, pages/title/author |
| imagery | BMP/TIFF/NITF/JP2K/JPG/PNG/WEBP, dimensions/bands/attributes/geo/pages/orientation |
| spreadsheet | CSV/XLSX, sheetNames/title/author |
| untyped | 알려진 media type이 아닌 항목, 크기 |
| audio | FLAC/MP2/MP3/MP4/NIST_SPHERE/OGG/WAV/WEBM, bitrate/duration/channel |
| model3d | LAS/PLY/OBJ, POINT_CLOUD 또는 MESH |
| video | MP4/MKV/MOV/TS/WEBM, bitrate/duration |
| dicom | metaInformation, mediaType, common/otherDataElements |
| email | EML, sender/date/attachmentCount/to/cc/subject/attachments |

CAD 단위명은 raw string이며 대소문자를 구별하지 않고 미지의 값도 허용하도록 설명한다. 읽은 문자열을 좁은 enum으로 강제해 버리지 않는다. 음성/영상 bitrate는 평균 초당 bit를 올림한 근사치, durationSeconds는 소수 두 자리까지 올림한 근사치다. 정확한 frame/sample 길이를 계산하는 근거로 과도하게 쓰지 않는다.

## 영상의 공간 정보와 방향

imagery bands는 datatype, color/palette interpretation과 unit/scale/offset을 제공할 수 있다. attributes는 domain에서 key/value map으로 연결되며 기본 domain key는 빈 문자열이다. 빈 domain을 누락 처리하면 header metadata를 잃는다. ICC profile은 base64 문자열이다.

geo에는 CRS의 WKT, affine geotransform의 x/y translate/scale/shear, GCP의 pixel/projected X/Y/Z, EXIF GPS가 포함될 수 있다. EXIF GPS와 좌표계 변환 정보를 같은 값으로 덮어쓰지 않는다. pages는 다중 TIFF처럼 1보다 클 수 있다. orientation은 rotationAngle과 flipAxis로 구분하며 UNKNOWN도 처리한다.

## DICOM과 이메일의 구조

DICOM metaInformation.v1은 SOP class/instance UID와 transfer syntax를 담는다. mediaType은 IMAGE/MULTI_FRAME_IMAGE/VIDEO/STRUCTURED_REPORT다. commonDataElements에는 frame 수, modality, patient/study/series 식별자와 study/series 시간이 있을 수 있고 나머지는 any 값 map이다. 모든 데이터 요소가 고정 schema로 평탄화된다고 전제하지 않는다.

email sender는 mailbox 목록이고 to/cc는 mailbox 또는 named group union이다. mailbox는 emailAddress와 optional displayName, group은 이름과 mailbox 목록이다. attachment에는 attachmentIndex와 검증된 MIME type, optional filename이 있다. 후속 attachment 변환은 이 MIME type과 index를 사용한다.

이 문서는 schema를 재사용하기 위한 기록이다. 실제 metadata 값과 개인 식별 정보를 저장한 것이 아니며, metadata 추출 성공률이나 모든 입력 형식을 실행 검증하지 않았다. [[Palantir-Media-Transformation-API]]에서 변환별 제약을 따로 확인한다.

## 출처

- [Palantir, Get Media Item Info](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/get-media-item-info)
- [Palantir, Get Media Item Metadata](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/get-media-item-metadata)
