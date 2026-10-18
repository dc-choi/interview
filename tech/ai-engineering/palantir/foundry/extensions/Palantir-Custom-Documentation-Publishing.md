---
tags: [palantir, custom-docs, documentation, publishing]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry custom documentation 발행"]
---

# Foundry custom documentation 발행

Custom documentation은 Documentation template의 Code Repository를 정본으로 플랫폼 내부에 발행한다. Application launcher/help 또는 /workspace/documentation에서 접근하고, 별도로 AIP Assist indexing에 연결할 수 있다. 이 앱의 core documentation이 모두 custom repository에서 나온 것은 아니다.

## Bundle과 navigation의 계약

`docs/<product-id>/` 아래에 bundle을 두고 overview.md와 ordering.md를 만든다. Product ID는 folder name이며 공백 없는 고유 이름을 사용한다. Overview에는 @name/@description, 일반 page에는 @title을 선언한다. Filename은 URL, @title은 page/TOC 표기, 선택적 @toc는 짧은 TOC label을 정한다.

Ordering은 확정된 @quickstart/@howto/@tutorial/@concept/@resource/@api/@reference 중 section과 extension 없는 page name을 나열한다. 같은 section 안의 순서도 이 파일을 따른다. Overview는 기본 진입점이므로 목록에 넣지 않는다.

일반 page는 ordering에 포함해야 하지만 child page는 예외다. Parent의 @child에 순서대로 선언하면 parent만 ordering에 있어도 child가 발행된다. 같은 bundle에서는 @child가 권장되며 @parent는 parent가 child를 알 수 없는 다른 bundle 확장 등에 쓴다. 둘을 동시에 선언할 필요는 없다. FAQ의 모든 page 목록 요구를 child 예외까지 없애는 규칙으로 읽지 않는다.

## Markdown preview와 발행 결과는 다르다

Code Repositories의 split/Toggle render Markdown은 vanilla preview다. @annotation, navigation과 HTML callout 최종 모양을 그대로 보여주지 않는다. Custom callout은 pt-callout과 success/warning/danger class를 사용하며 HTML div 안에서는 Markdown 대신 strong 등 HTML을 쓴다.

Image는 Blobster resource 또는 dataset file URL을 참조할 수 있다. 큰 GIF/video는 성능과 이해 부담을 고려한다. `@product-id/page#heading` 링크는 enrollment의 bundle로 resolve하며 대상이 없으면 plain text가 될 수 있다. Preview에서 link text가 보이는 것만으로 발행 대상 존재를 검증하지 않는다.

## Publish는 master build의 전체 현재 상태다

Repository를 생성한 뒤 enrollment administrator가 Control Panel Documentation에서 allowlist해야 한다. 첫 자동 check의 PERMISSION_DENIED는 생성 이전 allowlist가 불가능한 순서 때문에 발생할 수 있으며 allowlist 후 check를 다시 실행한다.

Branch에서 작성할 수 있지만 발행은 master branch의 build에서만 수행된다. Commit 자체로 발행되지 않으며 build status를 확인한다. Build는 repository에 현재 남은 content만 발행하고 이전 발행본에서 없어진 page를 제거한다. 새 bundle 발행이 기존 content에 단순 추가되는 누적 저장소가 아니다.

기존 page 수정은 발행 후 즉시 보이고 page 추가/삭제와 navigation 구조는 service recompile까지 지연될 수 있다. 기본 compile 간격은 1시간이며 관리자 조정이 가능하다. 삭제된 page 본문과 home/TOC 항목의 사라지는 시점도 다를 수 있다.

## 삭제와 읽기 권한

Custom docs의 독자는 해당 code repository의 View 권한을 따른다. Repository 위치와 filesystem 권한으로 제한된 audience를 운영한다. 발행 allowlist 권한과 문서 읽기 권한을 별도로 확인한다. Platform title은 docs application 제목에도 반영되며 기본 Palantir/미설정이면 Custom documentation을 사용한다.

Repository를 삭제하는 것만으로 이미 발행한 docs가 제거되지 않는다. 먼저 docs content를 제거하고 다시 publish해 unpublish를 확인한 후 repository를 삭제한다. Changelog는 현재 custom docs 기능으로 지원되지 않으므로 repository history와 공개 docs의 변경 기록을 혼동하지 않는다.

## 출처

- [Palantir, In-platform custom documentation](https://www.palantir.com/docs/foundry/custom-docs)
- [Palantir, Callouts](https://www.palantir.com/docs/foundry/custom-docs/add-callouts)
- [Palantir, Add images or media](https://www.palantir.com/docs/foundry/custom-docs/add-images)
- [Palantir, Add links](https://www.palantir.com/docs/foundry/custom-docs/add-links)
- [Palantir, Add a new bundle](https://www.palantir.com/docs/foundry/custom-docs/add-new-bundle)
- [Palantir, Add new pages](https://www.palantir.com/docs/foundry/custom-docs/add-new-pages)
- [Palantir, Create custom documentation repository](https://www.palantir.com/docs/foundry/custom-docs/create-custom-docs-repository)
- [Palantir, Bundle structure](https://www.palantir.com/docs/foundry/custom-docs/custom-docs-bundle-structure)
- [Palantir, Permissions](https://www.palantir.com/docs/foundry/custom-docs/custom-docs-permissions)
- [Palantir, FAQ](https://www.palantir.com/docs/foundry/custom-docs/faq)
- [Palantir, Preview Markdown](https://www.palantir.com/docs/foundry/custom-docs/preview-markdown)
- [Palantir, Publish custom docs](https://www.palantir.com/docs/foundry/custom-docs/publish-custom-docs)

## 관련 문서

- [[Palantir-Assist-Content-and-Context|Assist 지식 입력]]
- [[Palantir-Repository-Review-and-Scope|Repository review 경계]]
