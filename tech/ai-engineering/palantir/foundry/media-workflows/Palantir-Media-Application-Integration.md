---
tags: [palantir, foundry, media-sets-advanced-formats]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Workshop와 OSDK에서 Media 사용

Workshop은 Media preview, Audio recorder와 Image annotation 외에 PDF/Spreadsheet/Video/Audio+Transcription 전용 widget을 제공한다. Upload는 media reference parameter를 가진 Action에 연결하고 Button group으로 호출한다. File picker는 drag/drop, Text input은 reference 입력이며 Form은 단일, Table은 여러 upload에 사용할 수 있다.

OSDK 문서는 TypeScript media support를 beta로 명시하며 Developer Console package 설정에서 beta를 활성화한다. 객체 property의 fetchMetadata/fetchContents로 가져오고 Response의 성공 여부와 optional property 부재를 처리한다. 예제의 optional chaining 뒤 response.ok 접근은 response undefined 가능성을 별도로 막아야 한다.

Ontology edit function의 uploadMedia는 TypeScript OSDK2.6+, Python2.145+ 조건으로 설명한다. 반환한 MediaReference를 object edit batch 또는 Action parameter에 넘긴다. 페이지의 uploadMedia() 무인자 예제는 설명용 축약이므로 실제 import/signature와 auth client를 생성 SDK에 맞춘다. 여기서 해당 SDK를 실행 검증한 것은 아니다.

OSDK에서도 reference list property는 미지원이다. Upload 성공, Action 성공과 원본 접근 권한은 각각 확인하며 개인 파일을 URL이나 object 화면에 표시하는 것만으로 권한이 전파됐다고 추정하지 않는다.

## 출처

- [Palantir, media-in-workshop](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/media-in-workshop)
- [Palantir, upload-media](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/upload-media)
- [Palantir, use-media-in-osdk](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/use-media-in-osdk)

## 관련 문서

- [[Palantir-Media-Workflows]]
- [[Palantir-Document-Intelligence]]
