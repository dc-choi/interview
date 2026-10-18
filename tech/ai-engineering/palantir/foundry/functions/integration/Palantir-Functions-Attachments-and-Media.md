---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Attachment와 Media의 생성, 수명과 메타데이터

Attachment와 Media는 별도 타입이다. v2의 Media upload 지원을 Attachment upload 지원으로 확대하지 않는다. 문서는 Attachment 생성은 v1/Python에서 지원하고 v2에서는 미지원이라고 구분한다.

v1의 128MB 메모리를 고려해 attachment는 20MB 이하를 권장한다. 이 권장치는 서버의 모든 파일 한도와 같지 않다. 업로드한 임시 attachment/media는 객체에 실제 편집으로 연결되기 전 uploader 중심 접근과 정리 수명에 주의한다. 함수 반환만으로 영구 보존을 보장하지 않는다.

## Media SDK 버전

- v2 Media upload는 TypeScript 2.16/Python 2.198 이상 조건을 확인한다.
- TypeScript generator 2.20에서 MediaReference에서 Media wrapper로 바뀐 계약을 확인한다.
- TypeScript full metadata는 client 2.56.0 이상이며 optional method 유무도 확인한다.
- TypeScript beta 변환은 `@osdk/api` 2.55.0 이상에서 `transformAndWait` 경로를 설명한다. 이전 experimental helper 이름과 mediaReference 매개변수를 그대로 섞지 않는다.

`fetchContents()`의 Response는 성공 상태를 확인한 뒤 bytes를 읽는다. slim metadata와 type-specific full metadata는 다르다. unknown variant가 오래된 SDK 때문인지, 실제 untyped media인지 구분한다.

## 변환과 문서 검색

v2/Python의 beta 변환은 poll interval과 전체 timeout을 분리하며 failed 상태와 기다림 만료도 구분한다. 결과 bytes/Response를 Media로 지속 사용하려면 upload와 객체 연결이 추가로 필요하다. v1은 기존 media reference를 활용하고 같은 upload 계약을 전제하지 않는다.

Functions PDF 범위는 0 기반 시작 포함/끝 제외다. Pipeline Builder의 다른 page 번호 계약과 섞지 않는다. OCR hOCR의 bbox와 렌더링 이미지 좌표/해상도를 맞춰야 하며 예제의 생략된 parser를 구현 완료로 보지 않는다. 페이지 전체 병렬 처리에는 함수 메모리/시간과 API rate limit에 맞춘 동시성 제한이 필요하다.

한국어 PDF handling은 media ingest, 텍스트 추출, chunk, object media reference와 PDF viewer를 연결하는 흐름이다. 중국어 api-media는 이전 문서이므로 최신 beta 지원과 같은 시점으로 보지 않는다. 원문 PDF의 위치를 다시 열 수 있게 유지해야 검색 답변의 근거를 확인할 수 있다.

## 출처

- [Palantir, api-attachments](https://www.palantir.com/docs/foundry/functions/api-attachments)
- [Palantir, attachments](https://www.palantir.com/docs/foundry/functions/attachments)
- [Palantir, media](https://www.palantir.com/docs/foundry/functions/media)
- [Palantir, api-media](https://palantir.com/docs/zh/foundry/functions/api-media/)
- [Palantir, pdf-handling](https://palantir.com/docs/kr/foundry/functions/pdf-handling/)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
