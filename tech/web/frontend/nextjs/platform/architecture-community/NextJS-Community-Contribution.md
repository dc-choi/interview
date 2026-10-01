---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js community와 문서 기여 계약", "NextJS-Community-Contribution"]
---

# Next.js community와 문서 기여 계약

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## community

공식 기여 경로는 docs, runnable examples와 core codebase다. 질문은 GitHub Discussions, Discord, Reddit 등의 community 공간에서 다룬다. bugs는 reproduction과 next info/version, expected/actual behavior를 제공한다. Code of Conduct에 따라 참여하며 download 수와 community 규모를 기술 선택의 correctness 근거로 삼지 않는다.

## documentation contribution

공개 vercel/next.js repository의 docs MDX를 편집하고 PR로 검토받는다. 실제 docs website implementation은 별도 private codebase와 sync되므로 repository만 clone해 website를 완전히 local preview할 수 있다고 가정하지 않는다. VS Code의 *.mdx markdown language association은 본문 기본 preview를 돕지만 custom site renderer와 동일하지 않다. pnpm prettier-fix로 formatting을 확인한다.

## filesystem routing

docs files/folders가 URL, navigation과 breadcrumbs를 구성한다. 기본 alphabetical order 또는 00- 같은 two-digit prefix로 학습 순서를 정한다. 별도 manifest를 수동 유지하는 대신 file structure와 navigation을 연결한다. 이동 시 source/related relative route links도 함께 확인한다.

## metadata

required title은 h1/SEO/OG, description은 meta description이다. nav_title은 긴 title의 navigation label override, source는 shared page 원본, related는 logical next documents, version은 experimental/legacy/unstable/RC 같은 stage 표현이다. fetched docs의 version 16.3.8 header와 MDX stage field를 동일 schema로 해석하지 않는다.

## App와 Pages 공유

02-app/03-pages는 router differences를 구분한다. shared page는 source field로 다른 page를 참조하고 source 원본을 수정한다. 특정 block은 AppOnly/PagesOnly로 분리한다. Link의 shallow처럼 한 router만의 옵션을 공유 prose에서 모든 router의 계약으로 적지 않는다.

```yaml
source: app/api-reference/components/link
related:
  description: 관련 route APIs
  links:
    - app/api-reference/file-conventions/page
```

related.links는 leading slash 없는 relative docs paths다. title/description optional nested fields로 cards 설명을 조절할 수 있다. shared page 원본과 output에 공통 내용이 있다고 router 차이가 없다는 의미는 아니다.

## code examples

minimum working example에 imports/file convention과 필요한 setup을 포함하고 local execution으로 확인한다. language와 filename을 표시한다. JSX 포함 JS는 jsx/.js, TS는 tsx/.tsx, JSX 없는 코드는 js/.js 또는 ts/.ts다. package prop으로 manager별 CLI example을 표시할 수 있다. TS/JS switcher는 TS를 먼저 두고 두 block에 switcher를 지정한다.

line highlight는 single/multiple/range를 표시하고 surrounding example을 작동 가능한 형태로 유지한다. notes에는 Good to know 형태를 사용할 수 있다. available components는 Image, AppOnly, PagesOnly, Check와 Cross이며 raw HTML은 details 외에 허용되지 않는 docs convention이다. diagrams는 private site public assets에 있어 issue로 변경을 제안할 수 있다.

## 작성 방식

conceptual 문서는 원리/사용 흐름, reference는 API inputs/outputs와 조건에 집중한다. 첫 문단은 feature와 사용 목적, 이후 최소 예시, conventions, API table, use cases와 related links를 연결한다. 쉬움/단순함 같은 subjective 판단 대신 구체적인 행동과 실패 조건을 설명한다. active voice와 명확한 subject를 쓰고 문장마다 필요한 claim만 둔다.

## Rspack

community next-rspack plugin은 Rspack 팀과의 협업에서 제공되는 실험 integration이다. Next.js 공식 기본 bundler로 안정화된 것이 아니며 production 권장 상태가 아니다. 실제 compatibility는 plugin docs/example와 discussion을 확인한다. webpack() customization이나 Turbopack 설정을 그대로 호환된다고 가정하지 않는다.

## 문서 metadata와 편집 UI의 세부 계약

title은 2~3단어, description은 1~2문장이 권장되며 related.links는 필수 배열, nested title은 기본 Next Steps, description은 선택이다. child page가 있으면 related cards를 자동 생성할 수 있다. nav_title 미지정 시 title을 사용한다. 공개 docs 직접 GitHub 편집이나 clone 수정 모두 가능하고 Next.js/Developer Experience 팀이 feedback 뒤 merge한다. 오타, 혼란스러운 절, 빠진 주제도 기여 대상이다. VS Code command palette의 Preferences: Open User Settings (JSON)에서 files.associations의 *.mdx=markdown을 넣고 Markdown: Preview File/Open Preview to the Side를 실행한다. MDX extension은 syntax/IntelliSense, Prettier는 format-on-save를 돕는다. Quick Open에서 installation 같은 slug를 검색한다.

## MDX 표현과 문체 예제

~~~mdx
<Check size={18} />
<Cross size={18} />
~~~

문서에서는 emoji 대신 이 두 icon을 사용한다. line highlight의 속성은 highlight={1}, highlight={1,3}, highlight={1-5}다. 원문의 single-line code 예시에는 {1}만 붙어 있어 일관된 highlight 속성을 사용할 때 site renderer 문법을 확인한다. 단일/여러 줄 Good to know blockquote는 핵심 흐름을 방해하지 않는 보조 정보를 담는다.

TS/JS switcher는 두 block을 수동 연결하는 현재 계약이고 자동 TS->JS 변환은 미래 계획이다. 변환 보조도구를 사용하더라도 JS에만 추가된 기능을 지우지 않고 실행 결과를 확인한다. Figma/Vercel design guide의 diagram은 private site /public에 있어 공개 repo에서 직접 바꾸기보다 docs-request issue로 제안한다. 신규 React component도 issue로 제안한다.

conceptual은 설명/you 중심, API reference는 create/update/accept 같은 직접적 기술 문체를 쓴다. 긴 comma 문장은 나누고 utilize보다 use 같은 단순 단어, 모호한 this 대신 명확한 주어, passive 대신 active voice를 선택한다. easy/quick/simple/just와 부정 지시를 줄이고 Link로 이동을 만들 수 있다는 긍정 행동으로 안내한다. gender-neutral developers/users/readers를 쓰며 code example은 format과 실행을 확인한다. 추가 학습은 Google Technical Writing Course로 연결된다.

community 페이지의 주간 500만 download는 원문의 시점별 규모 정보다. X의 @nextjs와 Vercel YouTube 채널은 update/video, GitHub Discussions/Discord/Reddit은 질문/도움 경로다. Rspack은 discussion 77800, 공식 with-rspack example과 Rspack Next integration 문서에서 실험 문제를 확인한다.

## 출처

- [Next.js, community](https://nextjs.org/docs/community)
- [Next.js, community/contribution-guide](https://nextjs.org/docs/community/contribution-guide)
- [Next.js, community/rspack](https://nextjs.org/docs/community/rspack)

## 관련 문서

- [[NextJS-Turbopack]]
- [[NextJS-ESLint]]
- [[NextJS-Adapter-Validation]]
