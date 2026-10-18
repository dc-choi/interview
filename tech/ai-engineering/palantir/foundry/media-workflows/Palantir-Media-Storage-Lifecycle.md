---
tags: [palantir, foundry, media-sets-advanced-formats]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Media set의 저장, transaction과 삭제

Media set은 schema type과 primary format으로 파일을 관리한다. PDF, image, audio/video, DICOM, EML와 XLSX 등을 지원하지만 protected/encrypted/signed PDF, 일부 복잡한 XLSX formula/embedded file은 제한된다. DOCX/PPTX/TXT는 PDF primary format의 additional input으로 변환하며 모든 primary format이 추가 형식을 지원하는 것은 아니다.

Multimodal set은 여러 형식을 받지만 preview와 access pattern은 supported schema만 가능하다. Virtual multimodal의 additional input format preview도 제한된다. 업로드 허용이 모든 변환 지원을 뜻하지 않는다.

## Transaction 경계

Transactionless는 쓰자마자 읽히며 rollback이 없고 실패한 build의 성공한 item도 남는다. 여러 client가 동시에 쓸 수 있으나 branch를 empty view로 reset할 수 없고 modify만 지원한다. Transactional은 branch에 open transaction 하나, commit 때 전체 공개, abort 때 해당 item 삭제, build 실패 시 변경 없음이며 replace/modify를 지원한다. 한 transaction은 최대10,000 items다.

Set의 총 item 수 한도는 없다고 설명하지만 item은 최대50GB, path는 최대256자다. 대량작업은 429/503 QoS에 retry/backoff가 필요하며 일부 transforms-media helper가 retry를 내장한다. 원문의 usage 예제에는 중복 function parameter와 output_files 이름 불일치가 있어 그대로 실행 가능한 예제로 취급하지 않는다.

## 참조와 보존

같은 path를 overwrite해도 기존 media reference는 이전 item을 가리킨다. Media item reference와 dataset file reference는 다른 종류다. 후자는 metadata 연결에는 쓸 수 있으나 Pipeline Builder media transform 입력이 되지 않으므로 먼저 media set에 적재한다.

UI Delete는 soft deletion이며 직접 link로 원본에 접근할 수 있다. Build pipeline으로 갱신하는 set은 item 삭제를 지원하지 않는다. 영구 삭제는 upload 후 경과 기간 또는 overwritten/soft-deleted 후 경과 기간 정책으로 제어하며 둘 중 먼저 도래한 조건을 적용한다. Retention 단축은 이미 기준을 넘은 item을 즉시 접근 불가로 만들고 연장/never delete로 바꿔도 만료 item을 복구하지 않는다.

## 비용 단위

Preview와 download도 연산을 발생시킨다. 공개 표는 compute-seconds/GB이며 가격이 아니다. Download/stream2, resize/rotate/PDF-page-render40, crop/geo-tile/audio 처리와 raw-text75, OCR/transcription/embedding 및 여러 video 변환275 등의 구분을 둔다. VLM extraction275는 모델 사용량에 추가된다. Text-only raw75와 Markdown/HTML275도 구분한다. 계약별 실제 비용은 별도 확인한다.

## 출처

- [Palantir, media-sets-advanced-formats](https://www.palantir.com/docs/foundry/media-sets-advanced-formats)
- [Palantir, media-overview](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/media-overview)
- [Palantir, media-set-settings](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/media-set-settings)
- [Palantir, media-usage-limits](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/media-usage-limits)

## 관련 문서

- [[Palantir-Media-Workflows]]
- [[Palantir-Document-Intelligence]]
