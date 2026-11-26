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

## 페이지 story와 네트워크 mock

페이지도 입력(서버 응답, 권한, 대상의 상태)이 같으면 같은 화면을 그리는 큰 컴포넌트로 볼 수 있다. 그래서 페이지의 상태마다 story를 두면 테스트 계정이나 특정 조건의 데이터를 만들지 않고도 화면을 확인할 수 있다. 문제는 응답을 어디서 바꾸느냐다.

아래 비교는 사례 발표의 설명을 일반화한 것이다.

| 방식 | 결과 |
|---|---|
| 페이지 코드에 mock 데이터와 `mock` 같은 props를 넣는다 | 실제 요청을 막는 분기와 로딩, 오류, 데이터별 분기가 늘고, story용 코드가 서비스 번들에 함께 배포된다 |
| 네트워크 계층에서 요청을 가로챈다(MSW) | 페이지는 실제 서비스와 같은 요청을 보내고, Storybook에서만 handler가 mock 응답을 돌려준다. handler와 mock 데이터는 Storybook 설정과 story 파일에 둔다 |

발표 밖의 주의점으로, worker 스크립트를 앱과 같은 static 폴더(예: Vite의 `public/`)에 만들면 그 파일은 앱 빌드 결과에도 복사된다.

MSW(Mock Service Worker)는 브라우저에서 Service Worker로 요청을 가로채 handler가 정한 응답을 돌려준다. Storybook에서는 `msw-storybook-addon`으로 연결한다. addon 저장소 main의 README와 MIGRATION(3.x 기준), Storybook의 network mocking 문서를 2026-11-26에 대조한 순서는 다음과 같다.

1. `npx msw init <static 폴더> --save`로 worker 스크립트(`mockServiceWorker.js`)를 만들고, Storybook 설정의 `staticDirs`가 그 폴더를 포함하게 한다. 스크립트를 제공하지 못하면 Service Worker 등록이 404나 MIME type 오류로 실패한다.
2. worker 하나를 여러 story가 함께 쓰도록 등록한다. CSF Next는 `definePreview({ addons: [addonMsw()] })`를 쓴다. CSF 3.0은 `.storybook/main`의 `addons`에 `msw-storybook-addon`을 넣고 `.storybook/preview`에 `loaders: [mswLoader()]`(`msw-storybook-addon/csf3`)를 두는데, 이 loader API는 3.x에서 deprecated이며 다음 major에서 제거될 예정이다. deprecated인 것은 addon의 loader API이지 CSF 3 형식 자체가 아니며, CSF Next는 Storybook 10.6 문서에서 Preview 기능이다. CSF 3의 TypeScript 프로젝트는 `msw-storybook-addon/csf3`를 `compilerOptions.types`에 더한다. 이전 story의 handler는 story마다 초기화되어 다음 story로 새지 않는다.
3. story별 응답은 `beforeEach({ msw }) { msw.use(...) }`로 덮어쓴다. 2.x까지 쓰던 `parameters.msw`는 3.x에서 deprecated이고, CSF 3.0 구성에서만 동작하며 CSF Next에서는 지원하지 않고, 다음 major에서 제거될 예정이다.

다음은 가상의 endpoint로 쓴 예시다. `HttpResponse.error()`는 네트워크 오류 응답을 만든다. 서버 오류(5xx)를 재현하려면 `HttpResponse.json(body, { status: 500 })`처럼 상태 코드를 준다.

```ts
import { http, HttpResponse } from 'msw'

export const StatusRequestFailed: Story = {
  beforeEach({ msw }) {
    msw.use(
      http.get('/api/example/status', () => HttpResponse.error()),
    )
  },
}
```

실서버에서는 일부러 만들기 어려운 오류 응답이나 신청 뒤에만 생기는 업무 상태도 응답 값 하나로 재현된다. 다만 mock 응답이 실제 API 계약과 어긋나면 story가 통과해도 연동에서 깨지므로, 응답 형태를 API 계약 문서나 타입과 함께 관리하는 편이 낫다(적용 제안).

사례로, 2012년 JSP로 만든 뒤 React와 Vue 화면을 JSP 화면 안에 iframe으로 덧붙여 온 관리도구를 개편하면서 문서는 낡았거나 거의 없고 담당자는 떠난 상황에서 AI가 여러 저장소의 코드를 페이지 단위로 읽어 정책, 화면, 데이터 문서로 기획서를 역추출하고, 그 결과를 상태별 story로 옮겨 검증한 발표가 있다(NAVER Engineering Day 발표 기준). 특수한 계정이나 연동 상태에서만 보이던 정책(예: 비즈센터에 연동된 카페는 폐쇄할 수 없음)이 story로 드러났고, 프런트엔드가 화면에 필요한 데이터로 API 응답 계약을 먼저 정의해 서버 구현을 기다리지 않는 방식으로 협업 순서를 바꿨다고 한다. 레거시 분석 일반은 [[AI-Assisted-Legacy-Onboarding|AI를 활용한 레거시 온보딩과 변경]]을 본다.

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
- [Storybook, Mocking network requests](https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-network-requests)
- [MSW, Browser integration](https://mswjs.io/docs/integrations/browser)
- [MSW, HttpResponse](https://mswjs.io/docs/api/http-response)
- [MSW, init](https://mswjs.io/docs/cli/init)
- [MSW Storybook Addon README — mswjs](https://github.com/mswjs/msw-storybook-addon/blob/main/README.md)
- [MSW Storybook Addon MIGRATION — mswjs](https://github.com/mswjs/msw-storybook-addon/blob/main/MIGRATION.md)
- [카페 관리도구 개편기: 문서는 낡았고, 사람은 떠났고, 코드만 남았다 — NAVER D2](https://www.youtube.com/watch?v=RnRZR-rz5ks) — 2026-11-16 업로드, 페이지 story와 MSW 적용 사례
- [프론트 스택 2편. 개발 스택 선정: Lit과 Storybook을 선택한 이유 — 하찮은오후](https://www.youtube.com/watch?v=TEFl9Y3bFDQ) — 2026-11-04 업로드, 정리의 계기. 사실은 위 1차 출처로 대조

## 관련 문서

- [[Web-Components|웹 컴포넌트]] — Lit으로 작성하는 웹 컴포넌트의 반응형 속성과 이벤트
- [[Atomic-Design|Atomic Design과 컴포넌트 계층 규칙]]
- [[Design-System-Lint|디자인 시스템 lint]]
- [[Agent-Friendly-Websites|에이전트 친화적 웹사이트]] — 접근성 트리와 화면 의미의 일치
