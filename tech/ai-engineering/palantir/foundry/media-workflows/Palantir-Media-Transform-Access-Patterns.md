---
tags: [palantir, foundry, media-sets-advanced-formats]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Media 변환과 주문형 access pattern

Pipeline Builder는 OCR, transcription와 일반 media/LLM 변환에 적합하고 Code Repositories는 외부 library, 비media input과 세밀한 제어에 적합하다. 두 도구 모두 media input/output과 dataset output을 사용할 수 있다. 해당 문서는 media의 incremental read/write와 tabular input 활용을 Code Repositories 전용으로 제한하므로 일반 pipeline 증분 지원과 구분한다.

Access pattern은 media schema에 따른 주문형 변환이다. PDF thumbnail, waveform, geospatial tile처럼 표시할 때 계산할 수 있다. 매 요청 재계산, 첫 요청 후 영구 저장, 일정 기간 cache라는 persistence 선택이 있다. 비용/지연과 보존을 함께 설계한다.

기본 access pattern은 set schema로 정해지고 추가 pattern 등록은 API로 한다. Multimodal item은 schema 검증/필터 뒤 지원 pattern을 사용한다. Viewer preview가 원본 파일 다운로드와 같은 처리 비용을 갖는다고 가정하지 않는다.

## 출처

- [Palantir, transforming-media](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/transforming-media)

## 관련 문서

- [[Palantir-Media-Workflows]]
- [[Palantir-Document-Intelligence]]
