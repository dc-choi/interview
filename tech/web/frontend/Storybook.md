---
tags: [web, frontend, storybook, design-system, component, testing, accessibility, web-components]
status: done
verified_at: 2026-11-15
category: "웹&네트워크(Web&Network)"
aliases: ["Storybook", "스토리북", "Component Workshop", "컴포넌트 워크숍"]
---

# Storybook

Storybook은 UI 컴포넌트와 페이지를 앱의 나머지 부분과 떼어 놓고 개발, 문서화, 테스트하는 프런트엔드 워크숍이다. 디자인 시스템에서는 컴포넌트의 상태별 모습, 공개 속성과 이벤트를 한곳에서 보여 주는 살아 있는 명세로 쓰인다. 이 문서의 API와 동작은 Storybook 10 문서(context7에 색인된 v10.6.5)를 2026-11-15에 대조한 기준이다.

## 동작 모델

- **Story**: 컴포넌트의 한 가지 상태다. 스토리 파일은 CSF(Component Story Format)를 따르며, default export(meta)에 대상 `component`를, named export마다 하나의 story를 둔다.
- **Args**: story에 넘기는 입력값이다. meta에 둔 args는 그 파일의 모든 story에 적용되고, story별 args로 덮어쓴다.
- **ArgTypes와 Controls**: meta의 `component`를 지정하면 Storybook이 컴포넌트 정의와 args의 초기값에서 argTypes를 추론하고, UI의 Controls 패널에서 값을 바꿔 즉시 다시 그린다. 직렬화할 수 없는 값(템플릿, 아이콘 요소)은 `options`에 직렬화 가능한 이름을 두고 `mapping`으로 실제 값에 연결한다.
- **Parameters와 tags**: parameters는 addon 설정 같은 정적 메타데이터, tags는 문서 생성 같은 기능의 대상 지정에 쓴다. 둘 다 프로젝트(`.storybook/preview.*`), 컴포넌트(meta), story 수준에서 정할 수 있다.

## 문서화: Autodocs

CSF 파일의 story 하나라도 `autodocs` tag를 가지면 그 컴포넌트의 문서 페이지가 생성된다. 프로젝트 전체에 켜려면 `.storybook/preview`의 `tags`에, 특정 컴포넌트만 켜려면 meta의 `tags`에 둔다. 특정 story는 `tags: ['!autodocs']`로 문서 페이지에서 뺀다.

문서 페이지는 argTypes에서 속성 표를 만들기 때문에, 컴포넌트 정의를 Storybook이 읽을 수 있어야 속성 설명과 Controls가 채워진다. 다음 절의 웹 컴포넌트가 대표적인 경우다.

## 웹 컴포넌트와 Lit에 적용

웹 컴포넌트는 `@storybook/web-components-vite` framework를 쓴다. story의 렌더 결과는 Lit의 `html` 템플릿으로 쓰고, meta의 `component`에는 클래스가 아니라 `'demo-button'` 같은 태그 이름을 넣는다.

```ts
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import './password-input'; // custom element 등록

const meta: Meta = {
  component: 'password-input',
  tags: ['autodocs'],
  args: { label: '비밀번호', required: false },
  render: (args) => html`
    <password-input label=${args.label} ?required=${args.required}>
      <span slot="helper-text">숫자를 포함해 8자 이상</span>
    </password-input>`,
};
export default meta;

export const Default: StoryObj = {};
export const Required: StoryObj = { args: { required: true } };
```

매니페스트가 없어도 story args에 적은 속성은 초기값을 보고 Controls가 붙는다. 그러나 args에 없는 속성, 속성 설명과 타입, 문서 페이지의 속성 표처럼 컴포넌트 정의에서 읽어야 하는 정보는 `custom-elements.json`(Custom Elements Manifest)이 있어야 채워진다. 이 파일은 직접 쓸 수도 있지만 보통 생성하며, v1.0.0 스키마는 `@custom-elements-manifest/analyzer`로 만든다. 만든 파일은 `.storybook/preview`에서 `setCustomElementsManifest()`로 등록한다. 매니페스트를 빌드 단계에서 다시 만들지 않으면 컴포넌트에 추가한 속성이 문서에 나타나지 않는다(운영 제안).

## 테스트

- **Interaction test**: story의 `play` 함수가 받는 `canvas`와 `userEvent`로 사용자 조작을 재현하고, `storybook/test`에서 가져온 `expect`로 결과를 검증한다. 같은 모듈의 `fn()`으로 만든 args 콜백은 호출 여부를 검사할 수 있다.
- **Accessibility test**: `@storybook/addon-a11y`는 Deque의 axe-core 위에서 동작한다. Storybook 문서는 자동 검사가 WCAG 문제의 최대 57%를 잡는다는 Deque 연구를 인용하므로, 자동 검사 통과를 접근성 완료로 보지 않고 키보드 조작과 스크린리더 확인을 따로 둔다. Vitest addon이나 test-runner로 실행할 때 `parameters.a11y.test`가 위반의 처리를 정한다.

| 값 | 동작 |
|---|---|
| `'off'` | 자동 검사를 실행하지 않는다. addon 패널에서 수동 확인은 가능하다 |
| `'todo'` | 검사하되 위반을 Storybook UI의 경고로 보여 준다 |
| `'error'` | 위반을 UI와 CLI, CI에서 실패한 테스트로 처리한다 |

Storybook 문서가 권하는 도입 순서는 프로젝트 기본값을 `'error'`로 두고, 현재 실패하는 컴포넌트만 `'todo'`로 낮춘 뒤 고칠 때마다 표시를 지우는 방식이다. 기존 컴포넌트가 많은 디자인 시스템에서는 이렇게 하면 새 컴포넌트의 위반은 막으면서 남은 부채를 목록으로 유지할 수 있다.

## 트레이드오프

| 장점 | 비용 |
|---|---|
| 앱 화면을 거치지 않고 오류, 빈 값, 비활성 같은 경계 상태를 재현한다 | story가 실제 사용 방식과 어긋나면 문서가 틀린 명세가 된다 |
| 디자이너, 기획자와 같은 화면으로 컴포넌트 계약을 합의한다 | `.storybook` 설정과 addon 버전을 관리해야 한다. Vite builder는 앱의 Vite 설정을 자동으로 병합한다 |
| 접근성과 상호작용 검사를 컴포넌트 단위로 CI에 붙인다 | 데이터 조회 같은 부수 효과가 있는 컴포넌트는 mock이 필요하다 |

부수 효과가 없는 표현 컴포넌트일수록 story로 고립시키기 쉽다. 데이터 조회 책임을 상위 계층에 두는 이유와 맞닿아 있다([[Atomic-Design|Atomic Design]]의 순수 컴포넌트 계층).

## 면접 체크포인트

- Story, args, argTypes의 관계와 Controls가 값을 추론하는 근거를 설명할 수 있는가.
- 웹 컴포넌트에서 Controls와 문서 속성 표가 비어 있을 때 Custom Elements Manifest를 먼저 의심하는 이유를 말할 수 있는가.
- 자동 접근성 검사가 보장하는 범위와 `a11y.test`의 `todo`, `error`를 단계적 도입에 쓰는 방법을 설명할 수 있는가.

## 출처

- [Storybook, Controls](https://storybook.js.org/docs/essentials/controls)
- [Storybook, Automatic documentation and Storybook](https://storybook.js.org/docs/writing-docs/autodocs)
- [Storybook, Accessibility tests](https://storybook.js.org/docs/writing-tests/accessibility-testing)
- [Storybook, Interaction tests](https://storybook.js.org/docs/writing-tests/interaction-testing)
- [Storybook, Storybook for Web components with Vite](https://storybook.js.org/docs/get-started/frameworks/web-components-vite)
- [Storybook, Vite](https://storybook.js.org/docs/builders/vite)
- [Storybook, Storybook Docs for Web Components](https://github.com/storybookjs/storybook/blob/v10.6.5/code/addons/docs/docs/frameworks/WEB_COMPONENTS.md)
- [Custom Elements Manifest analyzer — open-wc](https://github.com/open-wc/custom-elements-manifest/tree/master/packages/analyzer)
- [프론트 스택 2편. 개발 스택 선정: Lit과 Storybook을 선택한 이유 — 하찮은오후](https://www.youtube.com/watch?v=TEFl9Y3bFDQ) — 2026-11-04 업로드, 정리의 계기. 사실은 위 1차 출처로 대조

## 관련 문서

- [[Web-Components|웹 컴포넌트]] — Lit으로 작성하는 웹 컴포넌트의 반응형 속성과 이벤트
- [[Atomic-Design|Atomic Design과 컴포넌트 계층 규칙]]
- [[Design-System-Lint|디자인 시스템 lint]]
- [[Agent-Friendly-Websites|에이전트 친화적 웹사이트]] — 접근성 트리와 화면 의미의 일치
