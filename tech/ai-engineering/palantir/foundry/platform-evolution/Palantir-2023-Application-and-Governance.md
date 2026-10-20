---
tags: [palantir, foundry, releases]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 2023 앱 분석과 권한 통제의 변화

이 문서는 2023년 release 기록의 의미를 보존한다. UI 개선, 계산 결과 수정, 권한 변경과 향후 계획을 같은 종류의 기능으로 합치지 않는다.

## 계산과 화면 결과를 검증할 지점

Quiver의 5월 linear aggregation 수정은 차트가 상속 interpolation을 사용하면서 계산은 고정 interpolation을 쓰던 불일치를 고쳤다. 7월 categorical series interpolation이 none일 때 점으로 표시하도록 수정했고, 9월 끝이 없는 series의 definite 계산은 먼저 시간 범위를 제한하도록 오류를 내게 됐다. 차트 모양과 계산 의미를 함께 검사해야 한다.

3월 pivot 경고는 property별 1,000 bucket cutoff와 approximate 결과를 설명한다. 여러 property를 조합하면 전체 행/열은 1,000을 넘을 수 있으므로 표 전체 크기 한도로 바꾸면 안 된다. 1월 multi-time-series search의 transform table 1,000행 한도와도 별개다.

날짜 입력의 timezone 무시, 상대 날짜 필터의 inclusive/exclusive 경계 무시, aggregate sort 순서, null timestamp의 epoch 표시, linked time-series의 null 표시 같은 수정은 시각적 결함처럼 보여도 분석 결과를 바꾼다. 10월 unit override와 실제 unit conversion도 다른 작업이다. Coalesce가 Error까지 건너뛰도록 바뀐 3월 동작은 실패 값이 정상 대체값으로 감춰지는 조건을 확인하게 한다.

Contour는 path/board 탐색, parameter와 PDF export를 확장했다. 중복 pivot column 경고, stale export 상태 초기화, timezone 일치와 Restricted View 원천 dataset parameter 선택 차단도 포함됐다. Dashboard에서 parameter를 숨기거나 analysis 진입을 제한하는 UI 설정을 데이터 권한 통제로 확대하지 않는다.

## 앱 조합과 저장 상태

Slate는 async/Promise 지원과 runner queue, postMessage 기반 window 간 통신, URL redirect target, deep watch, globals와 dependency graph를 추가했다. Async 지원이 외부 API 호출 권한을 부여하는 것은 아니다. 5월 query constraint 수정은 조건이 true가 아닌 상태에서도 실행되던 동작을 true일 때만 실행하도록 바로잡았다.

4월 Viewer의 app 복제 허용, 6월 신규 toolbar 생성 중단, 3월 URL 구조 변경은 기존 app 이관/접근에 영향을 준다. Embedded actions 메뉴 숨김이나 widget 표시 여부는 서버 권한을 대신하지 않는다. Workshop은 variable transforms, chart 계산, iframe/Slate 입력출력, widget 복사와 version description을 추가했다. 과거 버전으로 revert한 기록과 수정된 description의 편집자/시간을 구분한다.

Notepad는 template value/LaTeX/조건부 section, 예약 배포와 PDF 품질 개선을 추가했다. 1월 export 경고는 PDF 다운로드 성공 중에도 widget rendering timeout이 있을 수 있음을 드러낸다. Artifact 생성 성공과 데이터 완전성을 따로 확인한다. Quiver clip, dashboard와 visualization 구조 변경도 저장된 분석 전체를 snapshot으로 만드는 기능은 아니다.

## 언어, locale과 식별자

2023년 기록은 표시 언어, 값의 형식과 식별자의 문자 집합을 서로 다른 변경으로 다뤘다.

- 1월 12일 Ontology Management는 Foundry locale을 직접 지정한 사용자의 경우 action의 시간 parameter에서 그 지정이 브라우저 locale보다 우선하도록 고쳤다. 해당 사용자에게 날짜를 해석하는 locale과 표시하는 locale이 달랐던 문제다.
- 4월 10일 Slate는 사용자가 Foundry 세션에서 정한 언어를 읽는 `$global.locale` 변수를 추가했다. 같은 날 Ontology Management는 일본어 같은 비라틴 문자를 API name에 쓸 수 있다고 발표했다.
- 7월 31일 Pipeline Builder는 기존 일본어와 한국어에 더해 프랑스어, 독일어, 우크라이나어와 스페인어로 백엔드 국제화를 넓혔다.
- 8월 7일 Control Panel은 Foundry의 우크라이나어 번역을 beta로 발표했고, 2023-10-02 게시된 2023년 10월 발표에서 이 번역의 GA를 공지했다.
- 9월 14일 Ontology Management는 Actions의 timestamp picker가 선택기와 입력란에 같은 locale 형식을 쓰게 했고, 12시간제 locale의 action form에는 AM/PM 선택을 더했다.

현행 언어 설정은 [[Palantir-Platform-Experience-and-Distribution|플랫폼 언어 설정]]에 둔다. 2026-10-21 확인한 공식 문서에 따르면 관리자는 Platform experience 확장으로 영어 외의 언어를 열 수 있다. 브라우저 언어를 따르는 두 옵션 가운데 하나를 켜면 처음에는 사용할 수 있는 언어 중 브라우저 설정에서 우선순위가 가장 높은 언어로 보인다. 둘 다 켜지 않으면 사용자가 sidebar의 locale switcher로 바꾸기 전까지 영어로 보인다. 일부 위젯과 Workshop Translations는 브라우저 언어를 따르므로, 사용자가 브라우저와 다른 언어를 고르면 같은 화면 안에서도 언어의 기준이 다를 수 있다([[Palantir-Workshop-Design-Mobile-and-Localization|Workshop 현지화]], [[Palantir-2024-Application-State-and-Analytical-Meaning#번역 지원과 표시 언어|2024 발표와 현행 번역 동작]]). Slate 현행 문서도 `$global.locale`을 사용자 세션의 언어 locale로 설명한다.

2026-10-21 확인한 Object type 생성 문서의 Naming guidelines는 object type API name을 대문자로 시작하는 영숫자 PascalCase로, property API name을 소문자로 시작하는 영숫자 camelCase로 안내한다. 같은 문서의 Troubleshooting 점검 목록은 object type API name에 영숫자와 underscore를, property API name에 유효한 Unicode를 요구해 범위를 더 넓게 적는다. 2023년 Unicode API name 발표나 어느 한 절만으로 비라틴 문자 API name의 사용 가능 여부를 판정하지 않고, [[Palantir-Object-Identity-and-Creation|객체 식별과 생성]]의 기준대로 실제 validator와 생성 SDK로 확인한다.

## 권한과 승인 경로

4월 organization-level OAuth consent는 사용자가 직접 Foundry와 상호작용하지 않는 앱에서 조직 관리자가 동의를 대신하는 기능이다. 5월 third-party Marking restriction과 7월 CORS origin 설정은 각각 데이터 접근 범위와 브라우저 cross-origin 호출을 제한한다. 세 제어가 서로를 대체하지 않는다.

6월 Project Owner는 새 folder/file 직접 role grant를 막을 수 있게 됐지만 기존 grant는 영향을 받지 않았다. UI toggle을 끈 것만으로 기존 접근을 회수했다고 보고하지 않는다. Data-flow Administrator, cloud identity permission 관리, Access Graph와 Check access 확장은 권한 관리/가시성의 변화다.

Checkpoint는 group/Marking/reference/role 변경, namespace, login, workspace import/export/log export, Notepad data lock, Marketplace static dataset 패키징 등으로 넓어졌다. 7월에는 synchronous action에 checkpoint가 있으면 asynchronous request에도 justification을 요구하도록 바뀌었다. 비동기 경로가 승인 통제를 우회하지 않는지 확인하는 사례다.

Action notification은 7월부터 권한 없는 recipient를 무시하고 권한 있는 recipient에게만 보내는 옵션을 지원했다. 모든 수신자에게 실패하던 기존 방식과 구분한다. Approvals 요청 편집 권한과 실제 승인 권한, request creator의 discover 권한도 별도다.

## 출처

- [Palantir, 2023 release notes](https://www.palantir.com/docs/foundry/release-notes/2023)
- [Palantir, 2023 announcements release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2023)
- [Palantir, October 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-10) — 우크라이나어 GA
- [Palantir, Configure the platform experience](https://www.palantir.com/docs/foundry/administration/configure-platform-experience) — 2026-10-21 언어 절의 현행 동작만 대조했다.
- [Palantir, Workshop Translations](https://www.palantir.com/docs/foundry/workshop/translations) — 2026-10-21 브라우저 locale 확인
- [Palantir, Store values in variables](https://www.palantir.com/docs/foundry/slate/concepts-variables) — 2026-10-21 Slate `$global.locale` 확인
- [Palantir, Create an object type](https://www.palantir.com/docs/foundry/object-link-types/create-object-type) — 2026-10-21 API name 규칙 확인

## 관련 문서

- [[Palantir-Platform-Evolution-2023]]
- [[Palantir-Foundry]]
- [[Palantir-Platform-Experience-and-Distribution]]
- [[Palantir-Workshop-Design-Mobile-and-Localization]]
- [[Palantir-Object-Identity-and-Creation]]
- [[Palantir-2024-Application-State-and-Analytical-Meaning]]
