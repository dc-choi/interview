---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 Media IO, 문서 변환과 annotation의 변화

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## 저장, 변환과 읽기 지원을 분리하기

- 2월 PDF media set에 PPTX 입력을 허용하면 upload 시 PDF로 변환했다. 11월 multimodal media set은 여러 형식을 저장하지만 preview 지원 형식만 화면에서 열고 나머지는 download하는 조건이 있었다.
- 2월 Pipeline Builder는 media-to-media output을 추가했고 5월 media transform/output을 확대했다. 11월 multimodal media의 모든 Pipeline Builder 기능은 아직 향후 범위가 섞여 있었다.
- 2월 `MediaSetOutput` annotation으로 repo에서 media set 생성을 정의하고 첫 build 때 실제 생성한다. 생성 후 annotation field를 편집하지 않는 조건이 있었다.
- 2월 TypeScript OSDK/Platform API media는 beta package 기능 활성화가 필요했다. metadata/content 읽기, upload한 MediaReference를 Action에 넘기는 경로였다. 당시 unstable 함수와 잘못된 변수/await가 섞인 공지 예제는 실행 가능한 정본으로 복사하지 않는다.
- 10월 XLSX media GA는 upload/render/JSON extraction, Pipeline Builder/Python/TypeScript 1/Workshop annotation을 묶었다. 특정 formatting edge case는 남아 있었다.
- 10월 Python media transformation은 전체 media set/item/chaining, page 선택과 병렬 media/tabular IO를 제공했다. 최신 Functions media/OSDK 버전 계약은 별도 정본과 대조한다.

## 문서 추출과 사람의 검토

- 4월 layout-aware OCR은 text/table/bounding box와 Markdown table을 다뤘다. feature enablement 여부를 확인해야 했다.
- 6월 DocumentsExtractorInput은 PDF 전체 page conversion/resize/encode와 기본 prompt 경로, PageExtractor는 custom preprocessing 경로로 구분됐다. OCR 없는 extraction 옵션과 media reference 타입을 확인한다.
- 10월 Document Intelligence 베타는 OCR raw/layout/VLM preprocessing을 비교하고 sample의 quality/speed/token을 확인해 Python에 배포했다. text/table Markdown 추출이 중심이며 entity/engineering diagram은 향후 계획이었다.
- 4월 PDF Viewer는 hovered annotation Action, 단일 annotation scroll, text/area selection event, page number와 selection coordinate output을 추가했다. 4월 media 화면에도 annotation seek/page 이동이 확대됐다.
- 10월 audio widget은 text와 millisecond start/end, 선택적 speaker, waveform/Gantt/search, segment Action와 seek를 연결했다. Pipeline Builder는 speaker recognition와 segment array explode를 제공했다.
- 9월 media Action write는 submission criteria를 따랐다. 12월 media modify Action은 reference/static 선택과 다른 media set으로의 재upload를 구분했다.
- 4월 Action log는 media reference 변경은 기록하지만 media 내용 자체를 보관하는 로그는 아니었다. 속성 전후 비교는 edit history와 별도로 확인한다.

## 운영 판단

지원 형식, 변환 후 형식, 원본 보존, preview, extraction와 Action write를 각각 시험한다. 추출 quality를 sample에서 확인한 결과를 모든 문서의 품질로 일반화하지 않는다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [October 21, 2025, New audio transcription capabilities in Workshop and Pipeline Builder — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#44f473b2-4c6a-46ce-aa0f-8c913c193513)
- [October 2, 2025, Spreadsheets are now supported as a media set schema type — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#f23fd3d7-fbc5-4099-88e3-fff4629f838c)
- [October 8, 2025, Extract and analyze document context with AIP Document Intelligence — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#f4d3e48c-4f29-465a-a0da-603d896f8c8f)
- [November 18, 2025, Upload multiple media types using multimodal media sets — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#8b464698-7cf6-4c99-96d3-663049d58374)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
