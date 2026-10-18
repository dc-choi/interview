---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 media type, 문서 추출과 보존 정책

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## Type metadata와 실제 content

6월 Filter media set의 Has media schema 조건은 multimodal item을 좁히고 Cast media schema는 reference의 metadata type을 구체화해 PDF extraction/crop 같은 downstream 연산을 허용한다. **cast 자체를 파일 내용 변환으로 취급하지 않는다.** Faster pipeline media/geo 지원과 incremental input/output 제약은 각각 별도다.

4월 .eml media GA는 header/body/metadata/attachment를 preview하고 지원 형식의 첨부만 preview, 나머지는 download했다. Pipeline Builder/Python에서 attachment를 다른 media set으로 분리하고 body를 text/HTML로 추출한다.

4월 path version history는 같은 path의 최신 upload만 기본 화면에 보이더라도 이전 item이 build에서 처리될 수 있음을 드러냈다. overwritten 또는 soft-deleted item을 일정 후 영구 삭제하는 retention을 설정할 수 있고 최신 item은 overwrite 전까지 남는다. 화면에서 안 보이는 것과 영구 삭제는 다르다.

## 추출 전략과 배포

- 2월 4일 Document Intelligence GA/default AIP 공지는 OCR/VLM을 sample에서 quality/speed/cost로 비교하고 lightweight Python transforms를 생성했다. entity extraction와 Logic/Function 직접 호출은 당시 roadmap이었다.
- 3월 Markdown 구조를 고려한 bullet/table chunking과 optional embedding을 extraction→Python 경로에 추가했다. 기본 설정 개선 주장이 모든 문서의 RAG 정확도를 보장하지 않는다.
- 5월 Extract Text from PDF v2는 Tesseract/Docling을 PyMuPDF CPU raw/OCR 및 layout 경로로 교체했다. Markdown/HTML/plain output, type detection과 더 큰 batch를 제공했다.
- 약 10배 처리 속도와 정확도 개선은 electronic embedded-text PDF의 내부 benchmark 문맥이다. scanned/혼합/복잡한 표에도 같은 개선이 난다고 일반화하지 않는다.
- 새 v2 board 기본값은 feature flag가 필요하고 기존 v1은 Warnings에서 각 board Upgrade 후 save/deploy한다. output schema/format과 downstream chunking을 다시 비교한다.
- 4월 Action rule은 filename/media item RID 같은 metadata로 object property를 채울 수 있게 됐다. PDF annotation 내부 text, Function-backed media column(single/array), media preview picker도 확대됐다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [February 3, 2026, Deploy document extraction workflows with AIP Document Intelligence — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#a9bbe5f5-349d-4e74-8feb-7afc2b68c14f)
- [April 9, 2026, Ingest and transform emails with media sets — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#78548157-6f52-451a-8d36-953ff65b3a3d)
- [April 15, 2026, Media sets version history and path-based retention — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#658f82bd-3b28-48a6-9cb0-a0c8333d7d67)
- [May 19, 2026, Upgrade "Extract Text from PDF" boards in Pipeline Builder for improved performance — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#6069c621-bf5c-4b27-ab9b-9fc2cc2fdd1d)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
