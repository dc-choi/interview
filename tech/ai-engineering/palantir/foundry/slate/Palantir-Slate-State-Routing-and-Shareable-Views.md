---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Slate 페이지, URL과 저장 상태"]
---

# Slate 페이지, URL과 저장 상태

## 수명과 범위

실제 application page는 UI, query, variable, function과 event에 독립 범위를 주며 따로 로드된다. Shared variable은 페이지 간 상태를 전달하고 local variable은 해당 페이지 범위다. 일반 변수는 재로드하면 기본값으로 돌아간다. User storage는 사용자별 앱 상태를 세션 너머 보존하며 10 kB 한도다.

URL query parameter는 기본값보다 우선하고 대소문자를 구분한다. 값은 숫자/불리언처럼 보여도 문자열이므로 경계에서 명시적으로 변환한다. Environment `$global`과 user storage는 URL로 설정할 수 없다. Shared 이름은 페이지와 모든 컴포넌트에 걸쳐 충돌하지 않아야 한다.

## 공유 보기는 앱 전체 복제가 아니다

Shareable view는 widget interaction property와 local variable의 현재 값을 보존하고 기본값을 덮어쓴다. 현재 계약은 홈 페이지에 한정되며 shared variable은 저장하거나 복원하지 않는다. 이름이나 widget type을 바꾸면 해당 저장 상태를 복원하지 못할 수 있다. 앱 버전 자체에는 고정되지 않아 다른 버전에서도 이름과 타입이 유지되면 적용된다.

`saveView` 이후 `viewSaved`의 문자열 view ID를 받아 `loadView`에 전달한다. 이 상태 링크가 원본 데이터의 시점 고정이나 접근 권한 부여를 의미하지 않는다.

## 정형 상태와 입력 유효성

Tabular variable은 `{columnName: [cells...]}` 모양이며 모든 배열 길이가 같아야 한다. 행 객체 배열은 Table 편집 모드가 활성화되는 형식이 아니다. CSV와 base64 리소스도 앱 JSON 크기에 포함되며 기본 2,000,000 UTF-8 bytes를 넘으면 저장이 실패할 수 있다.

선택 widget에 raw/display 값이 따로 있으면 reset 시 둘을 함께 맞춘다. Repeating container 안의 입력은 인스턴스 내부 범위에 있어 앱 바깥에서 모든 입력을 모으는 임의 동적 폼으로 사용할 수 없다. 제출용 검증 결과는 데이터와 메시지를 반환하되 서버 권한/중복 검증을 대체하지 않는다.

Textarea는 문서상 0.5초 debounce 때문에 마지막 입력 직후 제출하면 일부 텍스트만 읽힐 수 있다. Slider의 Slide 갱신은 100 ms throttle이며 Release와 다르다. UI 값 변경과 영속 저장 시점을 분리한다.

## 출처

- [Palantir slate, slate](https://www.palantir.com/docs/foundry/slate)
- [Palantir slate, applications-create](https://www.palantir.com/docs/foundry/slate/applications-create)
- [Palantir slate, applications-debug-problems](https://www.palantir.com/docs/foundry/slate/applications-debug-problems)
- [Palantir slate, applications-dependencies](https://www.palantir.com/docs/foundry/slate/applications-dependencies)
- [Palantir slate, applications-import-export](https://www.palantir.com/docs/foundry/slate/applications-import-export)
- [Palantir slate, applications-merging](https://www.palantir.com/docs/foundry/slate/applications-merging)
- [Palantir slate, applications-pages](https://www.palantir.com/docs/foundry/slate/applications-pages)
- [Palantir slate, applications-style-text](https://www.palantir.com/docs/foundry/slate/applications-style-text)
- [Palantir slate, applications-types](https://www.palantir.com/docs/foundry/slate/applications-types)
- [Palantir slate, applications-versioning](https://www.palantir.com/docs/foundry/slate/applications-versioning)
- [Palantir slate, applications-writeback](https://www.palantir.com/docs/foundry/slate/applications-writeback)
- [Palantir slate, best-practices-app-functionality](https://www.palantir.com/docs/foundry/slate/best-practices-app-functionality)
- [Palantir slate, best-practices-complex-layouts](https://www.palantir.com/docs/foundry/slate/best-practices-complex-layouts)
- [Palantir slate, best-practices-user-interaction](https://www.palantir.com/docs/foundry/slate/best-practices-user-interaction)
- [Palantir slate, concepts-events](https://www.palantir.com/docs/foundry/slate/concepts-events)
- [Palantir slate, concepts-events-and-actions-index](https://www.palantir.com/docs/foundry/slate/concepts-events-and-actions-index)
- [Palantir slate, concepts-foundry-functions](https://www.palantir.com/docs/foundry/slate/concepts-foundry-functions)
- [Palantir slate, concepts-functions](https://www.palantir.com/docs/foundry/slate/concepts-functions)
- [Palantir slate, concepts-handlebars](https://www.palantir.com/docs/foundry/slate/concepts-handlebars)
- [Palantir slate, concepts-object-context](https://www.palantir.com/docs/foundry/slate/concepts-object-context)
- [Palantir slate, concepts-object-sets](https://www.palantir.com/docs/foundry/slate/concepts-object-sets)
- [Palantir slate, concepts-osdk](https://www.palantir.com/docs/foundry/slate/concepts-osdk)
- [Palantir slate, concepts-queries](https://www.palantir.com/docs/foundry/slate/concepts-queries)
- [Palantir slate, concepts-styles](https://www.palantir.com/docs/foundry/slate/concepts-styles)
- [Palantir slate, concepts-variables](https://www.palantir.com/docs/foundry/slate/concepts-variables)
- [Palantir slate, faq](https://www.palantir.com/docs/foundry/slate/faq)
- [Palantir slate, logic-overview](https://www.palantir.com/docs/foundry/slate/logic-overview)
- [Palantir slate, marketplace-slate](https://www.palantir.com/docs/foundry/slate/marketplace-slate)
- [Palantir slate, navigation](https://www.palantir.com/docs/foundry/slate/navigation)
- [Palantir slate, overview](https://www.palantir.com/docs/foundry/slate/overview)
- [Palantir slate, public-applications-data-upload](https://www.palantir.com/docs/foundry/slate/public-applications-data-upload)
- [Palantir slate, read-write-overview](https://www.palantir.com/docs/foundry/slate/read-write-overview)
- [Palantir slate, references-convert-rows-columns](https://www.palantir.com/docs/foundry/slate/references-convert-rows-columns)
- [Palantir slate, references-helpers](https://www.palantir.com/docs/foundry/slate/references-helpers)
- [Palantir slate, references-indexes](https://www.palantir.com/docs/foundry/slate/references-indexes)
- [Palantir slate, references-query-perf](https://www.palantir.com/docs/foundry/slate/references-query-perf)
- [Palantir slate, references-writeback](https://www.palantir.com/docs/foundry/slate/references-writeback)
- [Palantir slate, style-overview](https://www.palantir.com/docs/foundry/slate/style-overview)
- [Palantir slate, styles-global-stylesheet](https://www.palantir.com/docs/foundry/slate/styles-global-stylesheet)
- [Palantir slate, widgets-advanced](https://www.palantir.com/docs/foundry/slate/widgets-advanced)
- [Palantir slate, widgets-chart](https://www.palantir.com/docs/foundry/slate/widgets-chart)
- [Palantir slate, widgets-container](https://www.palantir.com/docs/foundry/slate/widgets-container)
- [Palantir slate, widgets-control](https://www.palantir.com/docs/foundry/slate/widgets-control)
- [Palantir slate, widgets-platform](https://www.palantir.com/docs/foundry/slate/widgets-platform)
- [Palantir slate, widgets-text](https://www.palantir.com/docs/foundry/slate/widgets-text)
- [Palantir slate, widgets-time](https://www.palantir.com/docs/foundry/slate/widgets-time)
- [Palantir slate, widgets-visualization](https://www.palantir.com/docs/foundry/slate/widgets-visualization)

## 관련 문서

- [[Palantir-Slate]]
