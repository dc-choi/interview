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

## 권한과 승인 경로

4월 organization-level OAuth consent는 사용자가 직접 Foundry와 상호작용하지 않는 앱에서 조직 관리자가 동의를 대신하는 기능이다. 5월 third-party Marking restriction과 7월 CORS origin 설정은 각각 데이터 접근 범위와 브라우저 cross-origin 호출을 제한한다. 세 제어가 서로를 대체하지 않는다.

6월 Project Owner는 새 folder/file 직접 role grant를 막을 수 있게 됐지만 기존 grant는 영향을 받지 않았다. UI toggle을 끈 것만으로 기존 접근을 회수했다고 보고하지 않는다. Data-flow Administrator, cloud identity permission 관리, Access Graph와 Check access 확장은 권한 관리/가시성의 변화다.

Checkpoint는 group/Marking/reference/role 변경, namespace, login, workspace import/export/log export, Notepad data lock, Marketplace static dataset 패키징 등으로 넓어졌다. 7월에는 synchronous action에 checkpoint가 있으면 asynchronous request에도 justification을 요구하도록 바뀌었다. 비동기 경로가 승인 통제를 우회하지 않는지 확인하는 사례다.

Action notification은 7월부터 권한 없는 recipient를 무시하고 권한 있는 recipient에게만 보내는 옵션을 지원했다. 모든 수신자에게 실패하던 기존 방식과 구분한다. Approvals 요청 편집 권한과 실제 승인 권한, request creator의 discover 권한도 별도다.

## 출처

- [Palantir, 2023 release notes](https://www.palantir.com/docs/foundry/release-notes/2023)
- [Palantir, 2023 announcements release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2023)

## 관련 문서

- [[Palantir-Platform-Evolution-2023]]
- [[Palantir-Foundry]]
