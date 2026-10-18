---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop media와 annotation 좌표 계약"]
---

# Workshop media와 annotation 좌표 계약

Media source는 URL/attachment/media reference/Blobster RID 등 widget별로 다르다. Dataset transaction URL은 고정 transaction을, branch view URL은 변하는 view를 가리킬 수 있다. External URL은 CSP 접근을 확인한다. Preview할 수 있다는 사실만으로 annotation이나 export가 저장된 것은 아니다.

## 좌표와 선택

| Widget | 계약 |
| --- | --- |
| Image Annotation | pixel upper-left/lower-right x1,y1,x2,y2 string, 최대1,000annotations/image |
| PDF | page property와 bounding-box JSON string array, 한 annotation이 여러 box 가능 |
| Markdown | zero-based start inclusive/end exclusive, negative미지원 |
| Spreadsheet | zero-based row/col, A1~B2의 end=(1,1)인 inclusive cell range |
| Audio/video seek | seconds, 범위 밖은 시작/끝으로 clamp |
| Audio transcript segment | beginning/end milliseconds |

PDF bbox coordinate 단위나 page index base를 이 widget 원문이 충분히 규정하지 않으므로 image pixel/Markdown offset 규칙을 그대로 적용하지 않는다. Area selection의 highlighted text는 empty string이다. Spreadsheet 없는 sheet는 no-op, 범위 밖은 sheet까지만 이동한다.

## Annotation persistence

Image rectangle는 variable에만 들어가며 Action으로 annotation object를 만들고 source image object와 link해야 보존된다. Existing annotation set을 현재 subject로 filter하지 않으면 다른 image box가 겹칠 수 있다. Scenario는 provisional what-if가 필요할 때만 사용하고 일반 writeback 필수 조건이 아니다.

PDF annotation-inclusive export는 widget의 built-in download만 지원한다. 외부 custom button으로 동일 annotated export를 호출한다고 보장하지 않는다. Source PDF embedded attachment는 일반 Media Preview에서 열 수 없다.

Markdown은 HTML을 render하지 않고 literal text로 보여 준다. ==highlight==는 fixed color이고 inline style로 바꿀 수 없다. Object reference는 objectType+primaryKey와 configured type 목록으로 해석하며 color/selection event는 widget 설정에서 정한다. Text index를 저장하면 원문 text 변경 시 alignment를 별도 관리한다.

## Upload와 녹음

Media Uploader의 File identifier는 dataset filename, Compass RID, media-set media reference로 destination마다 다르다. Multi-file upload는 각 file마다 Action을 실행하며 filename은 자동 생성된다. 상세 uploader 문서에는 media-set destination을 설명하지만 Actions-use 문서는 새 widget에서 해당 destination이 숨겨진 Legacy이고 Action form/Inline Action을 권한다. 이 지원 차이를 UI/배포에서 재확인한다.

Audio Recorder는 destination media set을 요구하고 web WEBM, mobile MP4/M4A 허용 format을 추가한다. Upload 후 Action의 media-reference parameter와 backing media set이 맞아야 한다. 녹음 종료, upload, Action success를 별도 상태로 다룬다. Video keyframe sampling/scene detection은 source frame 선택이며 media의 사건 정확성을 검증하지 않는다. 실제 파일/녹음/annotation은 실행하지 않았다.

## 출처

- [Palantir Workshop, widgets-audio-preview](https://www.palantir.com/docs/foundry/workshop/widgets-audio-preview)
- [Palantir Workshop, widgets-audio-recorder](https://www.palantir.com/docs/foundry/workshop/widgets-audio-recorder)
- [Palantir Workshop, widgets-image-annotation](https://www.palantir.com/docs/foundry/workshop/widgets-image-annotation)
- [Palantir Workshop, widgets-markdown](https://www.palantir.com/docs/foundry/workshop/widgets-markdown)
- [Palantir Workshop, widgets-media-preview](https://www.palantir.com/docs/foundry/workshop/widgets-media-preview)
- [Palantir Workshop, widgets-media-uploader](https://www.palantir.com/docs/foundry/workshop/widgets-media-uploader)
- [Palantir Workshop, widgets-pdf-viewer](https://www.palantir.com/docs/foundry/workshop/widgets-pdf-viewer)
- [Palantir Workshop, widgets-spreadsheet-display](https://www.palantir.com/docs/foundry/workshop/widgets-spreadsheet-display)
- [Palantir Workshop, widgets-video-preview](https://www.palantir.com/docs/foundry/workshop/widgets-video-preview)

## 관련 문서

- [[Palantir-Workshop]]
