---
tags: [web, frontend, design-system, lint, tailwind, ai-agent]
status: done
verified_at: 2026-10-06
category: "웹&네트워크(Web&Network)"
aliases: ["Design System Lint", "디자인 시스템 lint", "shadcn lint", "@shadcn/lint"]
---

# 디자인 시스템 lint

디자인 시스템 lint는 UI 코드가 테마 토큰과 공용 컴포넌트의 계약을 지키는지 정적 분석으로 검사한다. AI 에이전트에게 페이지 추가나 작은 수정을 맡길 때 색, 간격과 글꼴이 조금씩 어긋나는 문제를 기존 디자인에 맞춰 달라는 자연어 요청으로 되풀이해 다루지 않고, 위반 위치와 대신 쓸 토큰이나 variant를 알려 주는 진단으로 바꾼다. 이 문서는 Tailwind 기반 디자인 시스템을 검사하는 `@shadcn/lint`(2026-10-06 기준 npm 최신 0.2.0)를 구체 도구로 쓴다.

## 테마가 퍼지는 구조와 어긋나는 두 경로

shadcn/ui는 완성된 라이브러리를 설치하는 방식이 아니라 컴포넌트 소스를 프로젝트에 가져와 고쳐 쓰게 하는 방식이다. 기본 설정(`components.json`의 `cssVariables`)에서 색은 CSS 변수로 둔 테마 토큰으로 관리한다. 토큰은 값이 아니라 역할로 이름을 짓는다. `primary`와 `primary-foreground`처럼 짝을 이룬 토큰에서 기본 이름은 표면 색을, `-foreground`는 그 위의 글자와 아이콘 색을 정한다. Tailwind v4의 `@theme inline`에 `--color-primary: var(--primary)`로 등록하면 `bg-primary`, `text-primary` 같은 utility가 생기고, 다크 모드는 `.dark` 선택자에서 같은 토큰 값을 덮어쓴다. 그래서 `--primary` 값 하나를 바꾸면 이 토큰을 참조하는 utility를 쓴 곳이 함께 바뀐다.

이 전파는 사용처가 토큰과 컴포넌트를 거칠 때만 성립한다. 어긋나는 경로는 둘이다.

- 테마를 건너뛴 값: `bg-pink-500` 같은 Tailwind 기본 palette 색, `p-[13px]` 같은 임의 값, `style` 속성의 리터럴 값은 토큰을 참조하지 않으므로 테마를 바꿔도 그 자리에 남는다.
- 사용처의 컴포넌트 덮어쓰기: `<Button className="p-4 bg-pink-500">`처럼 공용 컴포넌트의 외관을 사용처에서 class로 바꾸면 컴포넌트가 정의한 variant와 size가 더는 단일 기준이 아니다. 같은 Button이 화면마다 다르게 보이고, 컴포넌트를 고쳐도 덮어쓴 곳은 따라오지 않는다.

`@shadcn/lint` 저장소의 eval에서 스타일 지시가 없는 조립 작업 8개를 lint 없이 생성하게 했을 때, 두 모델의 첫 초안에서 나온 위반은 모두 바깥에서 컴포넌트에 넘긴 외관 class였다. 토큰 어휘가 갖춰진 환경에서는 에이전트가 값을 지어내기보다 받은 컴포넌트를 덮어쓰는 쪽으로 어긋났다는 관찰이다. 이 eval의 조건과 한계는 아래 트레이드오프 절에 적는다.

## 여섯 규칙

| 규칙 | 보고하는 것 | 대신 쓰게 하는 것 |
|---|---|---|
| `no-restyle` | 인식된 디자인 시스템 컴포넌트에 `className`으로 넘긴 class. 옵션이 없으면 layout을 포함한 모든 class를 보고한다 | 컴포넌트의 variant와 size, 바깥 margin이나 부모의 gap |
| `no-raw-colors` | `bg-pink-500` 같은 palette 색, 테마에 선언되지 않은 토큰 이름, SVG `fill`과 `stroke` 같은 속성의 리터럴 색 | `bg-primary` 같은 선언된 토큰, `fill="currentColor"` |
| `no-arbitrary-values` | `p-[13px]`, `[padding:13px]`, `bg-[#333]` 같은 임의 값 | 같은 값의 scale class(`p-3.25`)나 테마 토큰(`rounded-lg`), 글자 크기와 radius처럼 맞는 값이 없으면 가까운 단계 |
| `no-inline-styles` | 모든 JSX 요소의 `style` 속성과 `<style>` 요소, custom property에 넣은 리터럴 색 | Tailwind class, 꼭 필요한 CSS 속성만 `allow` |
| `no-unknown-classes` | 프로젝트의 Tailwind가 CSS를 생성하지 못하는 class(`rounded-huge`, `hovr:flex`) | 철자 교정 제안, `@utility`로 선언한 class |
| `require-static-classes` | 인식된 컴포넌트에 넘긴 `bg-${color}`처럼 lint가 읽을 수 없는 동적 class | 정적 문자열, 완성된 class끼리의 삼항, `cn`으로 합친 지역 상수 |

판정 경계 몇 가지를 함께 기억한다. `white`, `black`, `transparent`, `current`, `inherit`는 `no-raw-colors`가 허용하고, `bg-[#333]` 같은 임의 색은 `no-arbitrary-values`가 맡는다. `data-[state=open]:flex` 같은 arbitrary variant와 `bg-(--brand)` 같은 CSS 변수 축약은 임의 값으로 보지 않는다. `style`에 넣은 custom property는 `--panel-width`처럼 동적 값이면 통과하고 `--label-color`에 `#ec4899` 같은 리터럴 색을 넣으면 보고된다. `no-unknown-classes`는 프로젝트의 Tailwind v4 compiler로 테마, custom utility와 plugin을 읽어 판정하므로 다른 규칙보다 비용이 크다.

## 진단이 수정 입력이 되는 구조

lint는 프로젝트를 읽어 무엇이 허용되는지 스스로 계산한다.

- 컴포넌트: `components.json`이 가리키는 UI 폴더의 export를 읽고 `@/` alias, tsconfig `paths`, package `imports`와 workspace `exports`를 따라 import를 해석한다. 이 파일이 없으면 가장 가까운 `package.json`을 기준으로 `components/ui`나 `src/components/ui`를 찾는다. 이름을 바꾼 re-export도 원래 컴포넌트로 추적한다.
- 테마: 테마 CSS의 `@import`를 따라가 `@theme`의 `--color-*` 선언을 읽는다. `--color-primary: var(--primary)`가 있으면 `bg-primary`는 허용되고 `bg-zinc-100`은 보고된다.
- variant: `cva`와 `tv` 정의, `variant?: "default" | "destructive"`처럼 문자열 union으로 타입을 준 prop에서 고를 수 있는 값을 읽는다.
- class 분류: 번들된 `cn` 문법의 class group으로 color, typography, spacing, shape, effects, motion, layout을 나눈다. `text-sm`은 typography, `text-primary`는 color, `text-center`는 layout이다.

그래서 오류 메시지가 고칠 방향까지 담는다. `no-raw-colors`는 선언된 토큰 목록, 가까운 색이나 철자 교정, 테마 파일 위치를 알려 주며, 가까운 색은 `:root`의 light 테마 값을 OKLab 공간에서 비교해 고른다. `no-restyle`은 그 컴포넌트에서 고를 수 있는 size와 variant를 제시한다.

```text
"p-4" is not allowed on <Button>: <Button> owns its spacing. Use a size (sm, lg), or margin here or gap on the parent for space around it.
```

에이전트는 이 진단을 그대로 수정 입력으로 쓴다. 디자인을 맞춰 달라는 막연한 요청과 달리 어느 파일의 어느 class를 무엇으로 바꿀지가 정해지므로 수정 범위가 위반 지점으로 좁혀진다. 저장소는 `AGENTS.md`에 변경 뒤 `npm run lint`를 실행하고 모든 오류를 고치라는 지시를 두도록 안내한다. 메시지는 규칙마다 바꿀 수 있고 `{{component}}`, `{{sizes}}`, `{{variants}}`, `{{file}}`, `{{tokens}}` 같은 placeholder를 쓴다. `settings.shadcn.note`에 넣은 문장은 모든 오류와 경고 뒤에 붙으므로 디자인 규칙 문서의 위치나 승인된 예외의 기준을 알리는 데 쓴다.

## 설정 예

shadcn/ui 없이 자체 Tailwind 컴포넌트와 테마에도 쓸 수 있다. 그때는 `settings.shadcn`의 `ui`(import 접두사)나 `componentImports`(정규식)로 디자인 시스템 컴포넌트의 위치를 지정한다. 아래는 ESLint flat config에서 컴포넌트 덮어쓰기는 layout만 허용하고, `CardTitle`에는 글꼴 조정까지 허용하며, palette 색을 막는 예다.

```js
import { plugin as shadcn } from "@shadcn/lint"
import tsParser from "@typescript-eslint/parser"
import { defineConfig } from "eslint/config"

export default defineConfig([
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { shadcn },
    rules: {
      "shadcn/no-restyle": ["error", {
        allow: ["layout"],
        contracts: [{ pattern: "^CardTitle$", allow: ["layout", "typography"] }],
      }],
      "shadcn/no-raw-colors": "error",
    },
  },
])
```

`contracts`는 이름이 정규식에 맞는 컴포넌트에만 다른 정책을 준다. 계약은 자기가 쓴 key만 바꾸고 나머지는 rule 설정을 물려받으며, 여러 계약이 맞으면 마지막 계약이 적용된다. `deny`는 `allow`가 열어 준 범위에서 `w-*` 같은 특정 class를 다시 막는다. Oxlint에서는 `.oxlintrc.json`의 `jsPlugins`에 `@shadcn/lint`를 등록하고 같은 rule 이름을 쓴다.

## 기존 프로젝트에 들이는 순서

1. 설치와 등록: 저장소의 `SETUP.md`는 에이전트가 읽고 실행하도록 쓴 절차다. 패키지 매니저와 monorepo 구조, 기존 ESLint나 Oxlint, 컴포넌트 폴더와 alias, Tailwind v4 테마를 먼저 찾고, 기존 rule, parser, script와 ignore를 보존한 채 plugin을 등록하고 필요할 때만 JSX와 TSX parser 설정을 더한다. 이 절차는 규칙을 켜지 않고 무엇을 허용할지를 사람에게 남긴다.
2. 규칙 하나부터: 한 규칙을 `warn`으로 켜고 흔한 위반을 고친 뒤 `error`로 올린다. 다음 규칙도 같은 방식으로 더한다.
3. 기준선: 위반이 많으면 현재 warning 수를 `eslint . --max-warnings <n>`의 상한으로 두고 CI에서 실행한다. 총량이 늘면 실패하고, 고칠 때마다 상한을 낮춘다. 새 코드 폴더는 `error`, legacy 폴더는 `warn`으로 나눠 적용할 수도 있다.
4. 의도한 예외: 넓은 패턴은 `allow`, 특정 컴포넌트는 `contracts`, 한 줄짜리 예외는 이유를 적은 `eslint-disable-next-line` 주석으로 남기고 `rg "eslint-disable.*shadcn/"`로 모아 감사한다. 도입 문서의 예는 디자인 시스템 컴포넌트를 정의하는 `components/ui/**`에서 사용처용 규칙(`no-restyle`, `no-arbitrary-values`, `require-static-classes`)을 끈다. 컴포넌트 정의 안의 class는 사용처의 덮어쓰기가 아니라 외관 자체를 정하는 코드다.
5. 반복 확인: 수정 뒤 lint를 다시 돌려 진단이 없어질 때까지 고친다. 이어서 테마 토큰 값을 바꾸거나 `.dark`로 전환해 따라 바뀌지 않는 영역을 찾는다. lint가 읽지 못한 동적 class나 자식 선택자 같은 사각지대가 이 확인에서 드러난다.

## 빌드 전 게이트로 연결

진단이 위반을 막으려면 실패 신호가 되어야 한다. ESLint는 lint 오류가 하나라도 있으면 종료 코드 1을 내지만, warning은 `--max-warnings` 상한을 넘을 때만 실패로 친다. 규칙을 `warn`으로만 두면 보고는 남아도 CI는 통과한다. 경고만 하는 디자인 규칙이 위반을 막지 못한 사례는 [[Harness-Gate-Placement|게이트 배치]]의 실증 표에 있다.

Next.js 16은 `next lint` 명령을 없앴고 `next build`는 더 이상 lint를 실행하지 않는다(Next.js 16.3.8 문서 기준). 빌드 성공이 lint 통과를 뜻하지 않으므로 lint를 CI의 독립 단계나 빌드 script 앞의 명시적인 단계로 둔다. 설정은 [[NextJS-ESLint|Next.js ESLint 규칙과 독립 검사]]를 따른다. 에이전트 지시 파일에 적은 lint 실행 요청은 잊힐 수 있는 요청 층이고 CI 단계가 강제 층이다. 둘을 함께 두면 에이전트는 작업 중에 진단을 받아 고치고, 놓친 위반은 머지 전에 걸린다.

## 트레이드오프와 한계

- 성숙도: 2026-10-06 기준 npm 최신은 0.2.0(2026-09-22 배포)이고 첫 배포는 2026-09-14다. 1.0 이전이라 규칙과 옵션이 바뀔 수 있으므로 버전을 고정하고 올릴 때 changelog를 확인한다. 같은 날 기준 ui.shadcn.com 문서 색인에는 lint 페이지가 없고, 문서는 GitHub 저장소의 README와 `docs/`에 있다.
- 요구 조건: Tailwind v4 프로젝트, Node.js 20.19 이상, ESLint 9.30 이상 또는 Oxlint 1.80 이상이 필요하다. Vue와 Svelte 지원은 0.2.0에서 추가됐다. ESLint는 framework parser로 template까지 읽지만 Oxlint는 `.vue`와 `.svelte`의 `<script>` 블록만 읽는다.
- 사각지대: `[&_button]:bg-primary` 같은 부모 선택자는 자식 컴포넌트까지 추적하지 않는다. class 값은 한 파일 안에서만 따라가고 import 너머로는 가지 않으며, 알 수 없는 함수 호출이나 해석하지 못한 template literal은 일부를 읽지 못한다. Vue와 Svelte의 `<style>` 블록은 일반 CSS라 분석하지 않으므로 CSS linter를 따로 쓴다. Vue의 `<component :is>`나 Svelte의 `<svelte:element>`처럼 lint 시점에 정체를 알 수 없는 요소에는 `no-restyle`이 적용되지 않고 토큰 규칙만 검사한다.
- 판단은 대신하지 않는다: lint는 정한 정책을 강제할 뿐 새 외관이 시스템에 들어갈 자격이 있는지는 결정하지 못한다. 같은 예외가 반복되면 `allow`를 넓히기보다 variant로 승격할지를 디자인 결정으로 다룬다.
- 측정의 한계: 저장소 eval은 진단을 받은 뒤 150회가 넘는 작업 실행 중 두 번을 빼고 위반이 0이 됐다고 보고한다. 다만 시험한 모델과 판정 모델이 모두 한 모델 계열이고 측정 사이에 규칙과 prompt가 바뀌었으며, 수정이 일과 비용을 더하고 연속 작업 측정에서 첫 초안 자체는 나아지지 않았다고 함께 적는다. lint는 첫 생성을 개선하는 장치가 아니라 생성 뒤의 교정 루프로 본다.
- 대안과 조합: Tailwind v4는 `@theme`에서 `--color-*: initial`로 기본 palette를 지우고 프로젝트 색만 남길 수 있다. 이는 CSS 생성 범위를 줄이는 방법이고, 어느 파일의 어느 class를 무엇으로 바꿀지 알려 주는 일은 lint 진단이 맡는다. 지운 palette를 쓰던 기존 코드는 해당 CSS를 잃으므로 사용처를 먼저 찾는다.

## 토큰 생성, 정적 검사와 화면 검증을 나눈다

디자인 토큰 생성기는 기준값을 코드에 옮기는 도구이고, lint는 코드가 그 기준을 따르는지 확인하는 도구다. 토큰이 일치해도 실제 화면의 가독성과 접근성이 충족되는지는 별도로 확인해야 한다.

- **기준과 코드 연결:** 확정한 토큰에서 CSS 변수를 생성하면 기준 파일과 구현에 값을 따로 입력하는 일을 줄일 수 있다. 생성 뒤에는 실제 컴포넌트가 해당 변수를 참조하는지도 확인한다.
- **검사 범위 구분:** 정적 분석 결과와 브라우저에서 측정한 결과를 나눠 남긴다. 브라우저 검사가 생략됐다면 정적 검사 통과를 화면 검증 완료로 기록하지 않는다.
- **대비 기준 구분:** WCAG 2.2의 텍스트 대비 기준은 일반 텍스트 4.5:1, 큰 텍스트 3:1이다. 큰 텍스트는 18pt 이상 또는 굵은 14pt 이상이며, 버튼이라는 이유만으로 큰 텍스트가 되지 않는다. 비활성 컨트롤, 순수 장식과 로고 등에는 예외가 있다.

2026-10-07 확인한 `design-studio-plugins`의 README는 `.design/tokens.json`에서 CSS 변수나 Tailwind `@theme`를 생성하는 흐름과 정적/실측 검사를 구분한다. 브라우저 도구가 없으면 실측을 생략했다고 보고한다. 다만 `contrastOn()` 소스는 흰색과 배경의 대비가 3:1 이상이면 흰색을 선택하므로, 자동으로 고른 `onPrimary`가 일반 크기 버튼 글자의 4.5:1 기준까지 보장하지는 않는다. 실제 글자 크기와 전경/배경 조합으로 다시 판정한다.

이 날짜의 확인 범위는 해당 저장소 README, 대비 계산 소스와 WCAG 텍스트 대비 기준이다. 플러그인 설치나 실행, 앞 절의 `@shadcn/lint` 버전과 전체 동작 재검증은 포함하지 않는다.

## 체크포인트

- 디자인을 맞춰 달라는 자연어 요청보다 lint 진단이 AI 수정에 유리한 이유(위반 위치와 대체 토큰, variant가 정해진다)
- 토큰을 쓰게 하는 규칙(`no-raw-colors`, `no-arbitrary-values`)과 컴포넌트를 덮어쓰지 않게 하는 규칙(`no-restyle`)이 따로 필요한 이유
- `warn`과 `error`의 차이, `--max-warnings` 기준선으로 레거시 위반을 안고 도입하는 방법
- `next build`가 lint를 실행하지 않는 Next.js 16에서 게이트를 어디에 두는가
- 의도한 예외를 `allow`, `contracts`, 주석 중 무엇으로 남기고 어떻게 감사하는가
- lint가 보지 못하는 영역과 테마 전환으로 보완하는 확인

## 출처

- [design-studio-plugins — GitHub](https://github.com/dbsxortime/design-studio-plugins) — 2026-10-07 토큰 생성과 정적/실측 검사 구분 확인
- [design-studio-plugins, tokens.mjs — GitHub](https://github.com/dbsxortime/design-studio-plugins/blob/main/design-check/scripts/lib/tokens.mjs) — 2026-10-07 `contrastOn()`의 3:1 선택 조건 확인
- [W3C WAI, Understanding SC 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [shadcn-ui/lint — GitHub](https://github.com/shadcn-ui/lint)
- [@shadcn/lint, SETUP.md](https://github.com/shadcn-ui/lint/blob/main/SETUP.md)
- [@shadcn/lint, How it works](https://github.com/shadcn-ui/lint/blob/main/docs/how-it-works.md)
- [@shadcn/lint, React](https://github.com/shadcn-ui/lint/blob/main/docs/react.md)
- [@shadcn/lint, Vue](https://github.com/shadcn-ui/lint/blob/main/docs/vue.md)
- [@shadcn/lint, Svelte](https://github.com/shadcn-ui/lint/blob/main/docs/svelte.md)
- [@shadcn/lint, Rules](https://github.com/shadcn-ui/lint/blob/main/docs/rules.md)
- [@shadcn/lint, no-restyle](https://github.com/shadcn-ui/lint/blob/main/docs/rules/no-restyle.md)
- [@shadcn/lint, no-raw-colors](https://github.com/shadcn-ui/lint/blob/main/docs/rules/no-raw-colors.md)
- [@shadcn/lint, no-arbitrary-values](https://github.com/shadcn-ui/lint/blob/main/docs/rules/no-arbitrary-values.md)
- [@shadcn/lint, no-inline-styles](https://github.com/shadcn-ui/lint/blob/main/docs/rules/no-inline-styles.md)
- [@shadcn/lint, no-unknown-classes](https://github.com/shadcn-ui/lint/blob/main/docs/rules/no-unknown-classes.md)
- [@shadcn/lint, require-static-classes](https://github.com/shadcn-ui/lint/blob/main/docs/rules/require-static-classes.md)
- [@shadcn/lint, Adoption](https://github.com/shadcn-ui/lint/blob/main/docs/adoption.md)
- [@shadcn/lint, Design systems](https://github.com/shadcn-ui/lint/blob/main/docs/design-systems.md)
- [@shadcn/lint, Evals](https://github.com/shadcn-ui/lint/blob/main/docs/evals.md)
- [@shadcn/lint CHANGELOG — GitHub](https://github.com/shadcn-ui/lint/blob/main/packages/lint/CHANGELOG.md)
- [@shadcn/lint — npm registry](https://registry.npmjs.org/@shadcn/lint)
- [shadcn/ui, Introduction](https://ui.shadcn.com/docs)
- [shadcn/ui, Theming](https://ui.shadcn.com/docs/theming)
- [Tailwind CSS, Theme variables](https://tailwindcss.com/docs/theme)
- [Next.js, How to upgrade to version 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [ESLint, Command Line Interface Reference](https://eslint.org/docs/latest/use/command-line-interface)

## 관련 문서

- [[AI-Native-System|AI 네이티브 시스템 (부탁이 아니라 강제, 실수를 시스템으로 흡수하는 루프)]]
- [[Harness-Gate-Placement|게이트 배치 (경고만 하는 디자인 규칙은 막지 못한다)]]
- [[Atomic-Design|Atomic Design과 컴포넌트 계층 규칙 (Atom의 variant 경계)]]
- [[React-Routing-and-Styling|React routing과 styling (token 저장 방식과 variant prop)]]
- [[React-Application-Design|React application 설계 (Button의 variant와 size 계약)]]
- [[NextJS-ESLint|Next.js ESLint 규칙과 독립 검사]]
- [[Agent-Skills|에이전트 스킬 (산출물 제약을 인코딩하는 스킬과 역할 토큰)]]
- [[Service-Design-Principles|서비스 설계 원칙 (디자인 시스템과 반복 판단)]]
