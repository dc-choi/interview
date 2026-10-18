---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Slate 공개 앱과 업로드 토큰"]
---

# Slate 공개 앱과 업로드 토큰

## 공개 범위와 배포

Public Slate는 Foundry 계정이 없는 사람이 입력과 파일을 제출하도록 하는 앱이다. 앱 외부의 object/dataset/Action/file을 읽을 수 없으므로 필요한 정적 리소스는 앱 안에 포함해야 한다. 일반 통합 앱의 리소스 접근을 익명 사용자에게 그대로 열어 주는 형태가 아니다.

공개 앱 생성/편집에는 조직의 Manage public Slate applications 권한이 추가로 필요하다. Project에 생성하며 private folder와 template은 지원하지 않는다. 같은 Foundry 네트워크에서 호스팅되므로 제한망 인스턴스가 자동으로 인터넷 공개되는 것은 아니다.

저장과 publish는 별개다. 공개 앱은 매번 의도한 버전을 확인해 발행해야 하며 자동 publish를 지원하지 않는다. 한 버전만 공개되고 익명 사용자는 tagged 개발 버전에 접근할 수 없다. 기본 검색엔진 비색인은 인증이나 접근통제의 대체 수단이 아니다.

## 업로드 권한의 수명

Public upload는 channel/token을 관리하는 secure-upload 또는 secure-upload-raw-oauth source와, token으로 JSON blob을 올리는 secure-upload-raw source를 구분한다. Channel은 대상 dataset, 선택적 blob byte 한도와 JSON 형식을 정한다. Token의 expiry 상한은 enrollment 설정이며 문서의 count:1 예제를 전체 사용량 보장으로 일반화하지 않는다.

토큰 값은 생성 응답에서 한 번만 보이고 삭제에도 그 값이 필요하므로 보호된 위치에 보관해야 한다. 업로드 데이터는 원래 dataset 옆 `_buffer_v2`에 content와 메타데이터로 들어간다. 폼 필드를 추가해도 이전 제출에 새 값이 생기지 않는다.

공개 앱 unpublish는 익명 화면만 숨긴다. 기존 token을 지우지 않으면 공개 secure-upload endpoint 호출이 계속 가능하다고 명시된다. 제출을 중단하려면 공개 버전 해제와 token 폐기를 함께 관리한다. TokenSecurity:InvalidToken 결과 확인은 문서의 검증 절차이며 여기서 실제 token을 생성하거나 폐기하지 않았다.

필드 값은 문자열을 요구하는 설명과 중첩 JSON 예제가 함께 있다. 실제 허용 schema를 검증 없이 단순화하지 않는다. UI validation과 token의 capability 범위도 별도 경계다.

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
