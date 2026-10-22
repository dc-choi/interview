---
tags: [ai, design, prototype, claude-code, handoff, frontend, impeccable, license, design-system]
status: done
verified_at: 2026-10-12
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Design Handoff", "AI 디자인과 구현 인계", "Impeccable", "AI 디자인 기본값 수렴", "Taste Skill", "생성 UI 외부 자원 출처 확인", "DESIGN.md", "oh-my-design", "AnimateIcons", "Tween UI", "Minimal Gallery", "React Frontend Skills"]
---

# AI 디자인 시스템과 구현 인계

AI로 만든 화면을 구현에 넘길 때는 이미지뿐 아니라 디자인 시스템, 선택한 화면 상태와 동작 의도를 함께 전달한다. 시각 시안과 실행 가능한 서비스의 완료 조건은 별도로 확인한다.

## 디자인 시스템에서 출발한다

색상, 타이포그래피와 컴포넌트 규칙을 공유하면 화면마다 스타일을 다시 설명하는 일을 줄일 수 있다. Claude Design은 코드베이스와 디자인 파일을 읽어 디자인 시스템을 구성하고, 이를 후속 프로젝트에 적용하는 흐름을 제공한다. 텍스트뿐 아니라 이미지, 문서와 웹 캡처를 입력으로 사용할 수 있다.

시스템에 넣을 자료는 사용 권한과 공개 범위를 확인한다. 만들어진 컴포넌트가 기존 코드의 실제 API와 맞는지는 구현 단계에서 대조한다.

디자인 시스템을 코딩 에이전트에 넘기는 파일로 프로젝트에 `DESIGN.md`를 두는 방식도 쓰인다. 같은 파일명을 쓰는 명세 가운데 아래 두 형식은 파일 구조가 달라 이름만으로는 어느 형식인지 알 수 없다. 2026-10-12 각 저장소의 README와 명세 원문 기준이며 바뀔 수 있다.

- **Google Labs 형식:** google-labs-code/design.md는 코딩 에이전트에 시각적 정체성을 설명하는 형식 명세(Apache-2.0)다. 형식 버전은 alpha이고 명세, 토큰 스키마와 CLI가 개발 중이라 형식이 바뀔 수 있다. 파일 맨 위 YAML front matter에 `colors`, `typography`, `rounded`, `spacing`, `components` 같은 디자인 토큰을 두고 이 값을 규범으로 삼는다. Markdown 본문은 그 값이 있는 이유와 적용 방법을 설명하며, `##` 절은 생략할 수 있지만 쓰는 절은 Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts 순서를 따른다.
- **Google 형식의 CLI:** `npx @google/design.md lint DESIGN.md`는 명세 구조, 정의되지 않은 토큰 참조, 컴포넌트 배경색과 글자색 쌍의 WCAG AA(4.5:1) 대비를 검사해 에이전트가 다룰 수 있는 구조화된 JSON으로 보고한다. `diff`는 두 판의 토큰 단위 변화를 비교하고, `export`는 Tailwind v3 설정 JSON, Tailwind v4 `@theme` CSS와 W3C Design Tokens 형식(`dtcg`)으로 내보내며, `spec`은 에이전트 프롬프트에 넣을 형식 명세를 출력한다. `lint`는 error가 있을 때만 종료 코드 1을 내고 대비 부족(`contrast-ratio`)은 warning 등급이라, `lint`의 종료 코드만 보는 CI 단계는 대비 부족만으로는 실패하지 않는다. 검사 대상은 DESIGN.md 파일이므로 생성된 코드가 그 토큰을 지키는지는 [[Design-System-Lint|디자인 시스템 lint]] 같은 코드 검사로 따로 확인한다.
- **oh-my-design Core v2:** 아래 외부 자원 절의 oh-my-design이 정한 DESIGN.md Core v2는 초안 상태의 상호운용 계약으로, Google의 공식 형식이나 같은 명세라고 주장하지 않는다. `DESIGN.md`는 YAML front matter로 시작하면 안 되고(MUST NOT), experience부터 governance까지 일곱 개의 고정 앵커를 정해진 순서로 둔다. Google 형식 문서는 호환 입력으로 분류해 가져오지만 작성기는 Core v2만 쓴다.

적용 제안: 검증기와 내보내기 도구를 고르기 전에 파일이 어느 명세를 따르는지 확인하고, 프로젝트에서 쓸 형식을 에이전트 지시 파일에 적어 둔다.

## 탐색, 선택과 세부 조정을 나눈다

1. 대상 사용자, 핵심 과업과 필요한 화면을 정한다.
2. 탐색할 차이를 레이아웃, 정보 밀도와 탐색 방식처럼 구체적인 축으로 제한한다.
3. 여러 시안 중 하나를 선택한 뒤 텍스트, 간격과 상태별 표시를 조정한다.
4. 선택한 시안과 남은 결정 사항을 구현 담당자에게 전달한다.

이 순서는 도구 사용을 위한 작업 기준이다. Claude Design은 대화, 요소별 코멘트, 직접 편집과 조절 도구를 지원하지만, 그 기능만으로 요구사항의 누락을 판단해 주지는 않는다.

## 생성 UI가 같은 기본값으로 모이는 문제

이 절은 2026-10-11 Anthropic의 공식 글과 frontend-design 스킬, Impeccable 저장소와 문서, GitHub 제품 페이지를 대조한 부분 검증이다.

지침 없이 LLM에 랜딩 페이지를 맡기면 Inter 글꼴, 흰 배경 위 보라 그라데이션, 최소한의 애니메이션으로 거의 매번 수렴한다는 관찰이 있다(2025-11 Anthropic 글 기준). 이는 분포 수렴(distributional convergence)으로 설명된다. 어디에나 무난한 디자인 선택이 웹 학습 데이터의 다수를 차지하고, 방향을 주지 않으면 모델이 그 확률 높은 중심에서 고른다는 것이다. 당시 제시된 대응은 글꼴, 색과 테마, 움직임, 배경을 구체적으로 지시하는 약 400토큰 분량의 지침을 스킬로 두고 필요할 때만 불러오는 방식이며, 현재 스킬 본문은 이후 개정으로 이보다 길다.

기본값은 시점에 따라 바뀐다. frontend-design 스킬의 2026-06 개정은 AI 생성 디자인이 몰리는 모습으로 따뜻한 크림 배경에 획 대비가 큰 세리프 제목과 테라코타 강조색을 쓴 조합, 거의 검은 배경에 밝은 애시드 그린이나 주홍색 강조색 하나를 둔 조합, 신문형 레이아웃을 들었고, 2026-09-03 개정은 같은 모양의 둥근 카드로 내용을 나누는 SaaS 카드 구성과 주제와 무관한 템플릿 장식을 더했다. 이런 특징은 브리프에 따라 정당한 선택일 수 있지만 이유 없이 나타나면 선택이 아니라 기본값이다.

Impeccable은 지침과 결정적 검사를 묶은 사례다. Paul Bakaus가 Anthropic의 frontend-design 스킬에서 출발해 만든 도구로, 공개된 스킬, 명령, CLI와 탐지 엔진은 Apache-2.0 오픈소스다. 프로젝트 루트에서 `npx impeccable install`로 설치한다.

- **지침:** 스킬은 방향을 정한 뒤 UI를 편집하기 직전에 `reference/craft-floor.md`를 읽도록 지시한다. 이 문서는 품질 하한, 절대 금지 항목과 탐지기가 잡지 못하는 습관을 담고, 계획만 하는 작업에서는 읽지 않는다. 모델이 따르는 지시라 강제는 아니며, 읽었는지 확인하는 장치는 없다. 기계적으로 검사할 수 있는 항목만 훅이 켜져 있을 때 검사된다([[Harness-Gate-Placement|게이트 배치]]).
- **결정적 탐지:** CLI와 브라우저 확장은 LLM과 API 키 없이 규칙으로 파일이나 URL을 검사한다. URL 검사는 로컬에 설치된 Chrome, Chromium 또는 Edge를 쓰며, CORS를 허용하지 않는 교차 출처 CSS는 읽지 못한다. 규칙 수는 자주 바뀐다. README는 2026-09-07 판에서 61개였고, 2026-10-05와 2026-10-07에 규칙을 하나씩 은퇴시켜 2026-10-11 확인 기준 59개다.
- **훅:** Claude Code, Codex, GitHub Copilot과 Grok Build에서는 프로젝트 훅이 편집 뒤 탐지 결과를 에이전트에 돌려준다. 이 훅들은 편집을 막지 않으며 Grok Build는 턴이 끝날 때 결과를 전달한다. Cursor는 편집 뒤 검사 대신 쓰기 전에 제안된 내용을 검사해, 문제를 찾으면 그 쓰기를 막고 에이전트가 고치게 한다. Codex는 `/hooks`에서 프로젝트 훅을 승인해야 하고, Grok Build는 `/hooks-trust`나 `--trust`로 프로젝트 훅을 신뢰해야 하며, GitHub Copilot CLI는 `.github/hooks/impeccable.json`이 기본 브랜치에 커밋된 뒤에 훅을 실행한다. 설치나 업데이트 때 `--no-hooks`를 주면 그 실행에서만 훅 설치를 건너뛰고, 이미 설치된 검사는 `/impeccable hooks off`로 끄며, 각 도구 설정의 훅 항목까지 지우려면 `/impeccable hooks reset`을 쓴다.
- **명령:** 2026-10-11 README 기준 audit, bolder, quieter 등 24개 명령이 있다(예: `/impeccable audit`, 2026-10-01 `generate` 추가 전에는 23개). 웹 프로젝트에서 audit은 접근성, 성능, 테마, 반응형, 구현 무결성 5개 영역을 각각 0~4점(합계 20점)으로 매겨 심각도 순 보고서를 내고 코드는 고치지 않는다. 총점이 높아도 출시를 막을 수준의 문제가 남을 수 있다. 네이티브 앱은 플랫폼별 항목으로 검사한다.
- **제공 경로:** GitHub Copilot 앱에는 Impeccable 디자인 스킬이 실험 기능으로 들어 있어 Settings의 Experimental 탭에서 켠다. 소개 페이지는 탐지기와 훅을 언급하지 않는다.

한 기본값을 피하도록 지시하면 다른 기본값으로 옮겨 갈 수 있다. Impeccable의 변경 기록은 2026-04-30에 SaaS 크림 룩에서 벗어날 때마다 잡지 표지풍으로 기우는 2차 반사를 막는 항목을 넣었고, 2026-05에 이탤릭 세리프 제목(05-04)과 크림 배경(05-28)을 잡는 탐지 규칙을 더했다. 2026-05-28에는 약 190개 표본 분석으로 스킬 자신의 문구가 결함을 만든다고 보고, 극단적 자간과 이탤릭 세리프 히어로를 유도하던 범주별 미감 레시피를 걷어냈다.

다음은 위 동작을 바탕으로 한 운영 제안이다.

- 탐지 결과는 이미 알려진 흔적에 대한 회귀 검사로 쓰고 디자인 품질 판정으로 쓰지 않는다. 브리프가 의도한 선택이면 이유를 남기고 예외로 둔다. Impeccable은 `npx impeccable ignores`로 규칙, 파일, 값 단위 예외를 기록하고, 값 단위 예외에는 `--reason`으로 사유를 남긴다.
- 이 탐지기는 프로젝트와 무관하게 미리 정한 규칙으로 패턴을 찾는다. 프로젝트가 정한 테마 토큰과 컴포넌트 계약을 코드가 지키는지는 [[Design-System-Lint|디자인 시스템 lint]]처럼 프로젝트 규칙을 검사하는 도구로 따로 확인한다.
- 설치는 지원 도구에 프로젝트 훅을 함께 넣고, 엔진이 실행기 옆에 없으면 처음 실행 때 네이티브 엔진을 `~/.impeccable/bin/`에 내려받는다. Claude Code에서는 설치된 명령 훅이 모델 도구 승인과 별개로 돌아, 실행기 명령을 거부해도 첫 편집이나 Stop 이벤트에서 엔진을 내려받을 수 있다. 외부 스킬과 플러그인을 들일 때처럼 설치되는 파일, 훅이 실행하는 명령과 끄는 방법을 먼저 확인한다([[Agent-Skills#설치 경로와 신뢰 — 표면마다 따로, 출처는 먼저|스킬 설치의 신뢰 경계]], [[Claude-Code-Customization#플러그인 — 확장을 묶어 설치하는 단위|플러그인의 보안 경계]]).
- 이번에 확인한 개선 근거는 제작자 쪽 분석이고 GitHub 소개 문구에도 측정값이 없다. 독립 평가는 찾지 못했으므로 자기 화면에서 적용 전후를 비교하고 사람이 브리프와 대조해 판정한다.

## 생성 UI를 다듬는 외부 자원과 납품 전 출처 확인

지침 스킬, 코드 작성 스킬, 컴포넌트, 아이콘, 레퍼런스 갤러리와 디자인 시스템 카탈로그는 다듬는 대상이 다르고 출처와 라이선스를 남기는 방법도 다르다. 아래 개수와 라이선스는 2026-10-12에 각 공식 사이트, 저장소와 LICENSE 원문을 대조한 기준이며 바뀔 수 있다.

- **지침 스킬:** Taste Skill의 2026-10-23 README는 저장소에 `design-taste-frontend` 하나를 두고, 기존 스킬은 별도 저장소로 이동하거나 통합했다고 설명한다. 설치는 `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`로 안내하며, 스크립트 실행에는 Node 22 이상과 설치된 Chrome, Edge 또는 Chromium이 필요하다. 이미지 탐색에는 네트워크 접근이 필요하다. 기존 `redesign-existing-projects`는 기본 스킬의 기존 화면 검토 흐름으로 통합됐다. 2026-10-12에 확인한 13개 스킬 묶음, 세 다이얼과 출력 전 체크리스트만으로 현재 v2를 설명하지 않는다. 설치 전 확인은 [[Agent-Skills#설치 경로와 신뢰 — 표면마다 따로, 출처는 먼저|스킬 설치의 신뢰 경계]]를 따른다.
- **코드 작성 스킬:** 시각 지침이 아니라 코드 작성 지침을 담은 묶음도 있다. React Frontend Skills(MIT)는 React, Next.js, TypeScript, Tailwind, shadcn, TanStack Query, Zod, Vitest, Playwright 등 18개 스킬을 React 19.3 기준으로 묶고, 프로젝트가 다른 버전을 고정했으면 그 버전의 공식 문서를 따르라고 적는다. Claude Code 전용이 아니라 Codex와 Cursor 같은 여러 에이전트를 대상으로 하며, skills CLI의 `-s` 옵션으로 필요한 스킬만 골라 설치할 수 있다. 스킬 파일은 Markdown뿐이고 훅과 스크립트는 없다. 다만 react, nextjs 같은 스킬 본문이 `npx -y @pymodel/react-frontend-skills detect` 같은 동반 CLI 실행을 지시하고 MCP 서버 안내도 `npx -y`를 써서, 원격 패키지를 확인 없이 실행하게 된다. `web-design-guidelines` 스킬은 리뷰마다 커밋으로 고정한 외부 지침을 내려받는다.
- **컴포넌트:** Colorlib의 Velora UI는 React, Tailwind CSS 4와 shadcn/ui용 애니메이션 컴포넌트 100개와 블록 31개를 MIT로 공개한다. README 기준 100개 중 51개는 런타임 의존성이 없고 나머지는 Motion만 쓴다. 출시 예정인 유료 Pro 등급은 가격표에 MIT가 아닌 Commercial로 표시되므로 어느 등급에서 받은 항목인지 함께 기록한다. Tween UI(StaticMania, MIT)는 GSAP과 CSS로 움직이는 React 19, Tailwind v4용 컴포넌트 23개와 블록 33개를 패키지 없이 shadcn 레지스트리로 배포하며(README는 아직 16개, 20개로 적는다), 항목에 따라 gsap, @gsap/react, swiper 같은 의존성이 함께 들어온다. SHIUI는 React 요소 112개와 Astro 블록 24개를 소스 복사 방식으로 제공한다. 블록은 Astro라 React 프로젝트에 바로 넣을 수 없다. SHIUI는 README와 package.json에 ISC를 선언했지만 저장소에 LICENSE 파일이 없고 두 파일에 저작권자 표기도 없다.
- **아이콘:** heroicons-animated는 Tailwind Labs의 Heroicons를 Motion으로 움직이게 만든 개인 프로젝트(Aniket Pawar, MIT)로 316개를 표시한다. 이 저장소의 LICENSE에는 Aniket Pawar의 저작권 고지만 있으므로 원본 Heroicons LICENSE의 고지(Copyright (c) Tailwind Labs, Inc.)도 함께 보존하는 편이 안전하다. 2026-10-12 확인한 이전 Taste Skill 기본 스킬은 아이콘 허용 목록을 Phosphor, HugeIcons, Radix, Tabler로 두고 프로젝트마다 한 계열만 쓰라고 지시하므로, Heroicons 계열을 쓸 프로젝트라면 그 선택을 프로젝트 지침에 적어 둔다. 당시 같은 저장소의 redesign 스킬은 Phosphor, Heroicons나 자체 세트를 권해 두 스킬의 지시가 다르다. AnimateIcons(Avijit Dey, MIT)는 Lucide 스타일 669개와 Hugeicons 스타일 501개, 모두 1170개의 움직이는 React 아이콘을 npm 패키지(`@animateicons/react`), shadcn 레지스트리와 자체 CLI로 배포한다. 저장소의 THIRD_PARTY_NOTICES는 아이콘 모양이 Lucide(ISC), Feather(MIT), Hugeicons(MIT)에 기반하고 그 라이선스가 아이콘 복제물에 저작권 고지를 남기도록 요구한다고 밝힌다. npm 패키지에는 LICENSE와 THIRD_PARTY_NOTICES가 들어 있지만 shadcn 레지스트리로 받은 소스에는 라이선스 헤더가 없다.
- **레퍼런스 갤러리:** refs.gallery는 영상 설명 기준 사이트 레퍼런스 모음이며, 2026-10-12에는 HTTP 429로 페이지가 열리지 않아 내용과 이용 조건을 확인하지 못했다. Minimal Gallery는 2013년부터 운영된 웹사이트 디자인 영감 모음으로 2026년에 인수됐다. 이용 조건(2026-05 표시)에 따르면 갤러리는 소개한 사이트의 소유권을 주장하지 않고 스크린샷과 썸네일을 자기 소유로 둔다. 열람과 북마크 같은 제한된 개인 이용만 허용하고, 상업적이거나 공개적인 목적의 복제와 배포에는 사전 서면 허락을 요구한다. 레퍼런스 갤러리를 쓸 때는 갤러리 이용 조건이 원래 사이트의 이미지, 문구와 일러스트 사용까지 허락한다고 가정하지 않고, 위계, 섹션 순서와 정보 밀도를 참고한 뒤 표면 시각은 브리프에 맞게 새로 만든다([[AI-Work-Tool-Selection|참고와 복제의 구분]]).
- **디자인 시스템 카탈로그:** oh-my-design은 실제 회사의 디자인 시스템을 코딩 에이전트용 DESIGN.md로 다시 쓴 카탈로그다. 2026-10-12 사이트 기준 18개국 521개 회사를 싣고 근거 수준으로 등급을 나눈다. 사이트 정의로는 verified 299개는 모든 값이 운영 중인 제품이나 공식 문서의 캡처로 추적되고, partial 109개는 캡처했지만 일부 값이나 출처가 빠졌거나 오래됐으며, legacy 113개는 근거 캡처 이전에 작성돼 증거가 아닌 출발점이다. `npx oh-my-design-cli@latest`는 Claude Code, Codex, Cursor와 OpenCode에 스킬 28개와 오프라인 카탈로그를 설치한다. README는 기본 설치가 감지된 모든 에이전트를 대상으로 한다고 적고, 비대화형으로 한 채널만 설치하려면 `install-skills --agent <이름> --all` 하위 명령을 안내한다. README 기준 Claude Code에는 스킬과 하위 에이전트 20개, 훅이 들어가고, Codex와 OpenCode에도 하위 에이전트 역할이 들어가며, Cursor에는 하위 에이전트와 훅 없이 호환되는 스킬 27개가 들어간다. 설치 전 확인은 [[Agent-Skills#설치 경로와 신뢰 — 표면마다 따로, 출처는 먼저|스킬 설치의 신뢰 경계]]를 따른다. 저장소는 MIT이며 README는 레퍼런스가 각 회사에 속하고 교육용 참고로 재현했다고 밝힌다.

### Taste Skill v2의 방향 선택과 검수

2026-10-23 공개 README와 스킬 본문 기준이다. 다음은 스킬이 에이전트에 지시하는 절차이며, 이 문서에서 로컬 실행이나 디자인 품질을 재현한 결과가 아니다.

1. 브리프와 고객 고유의 자료에서 화면의 주제를 정한다. 스크립트가 제시한 디자인 방향 후보 중 하나를 고르고, 공개 이미지와 영상을 사용하면 출처를 남긴다.
2. `lint.mjs`로 소스 패턴을 검사하고, `inspect.mjs`로 실제 브라우저의 1440, 768, 390픽셀 너비에서 대비, 넘침과 레이아웃 등을 검사한다. 결과 스크린샷은 `.taste-skill/inspect/`에 남기도록 되어 있다.
3. 검사 통과 뒤에도 스크린샷을 보고 주요 문제 세 가지를 고치는 검토를 최대 세 차례 수행하도록 한다. 기계적 검사에서 금지 패턴을 찾지 못했다는 사실과 화면의 품질은 별개다. README의 v2.1은 앱 화면에 별도 흐름과 `inspect.mjs --app`을 안내한다.

납품 적용 제안: 대상 사용자, 실제 문구와 목적을 먼저 전달하고, 최종 화면의 가독성, 버튼 동작과 상태별 표시를 별도로 확인한다. 다른 자원의 기존 날짜와 라이선스까지 재검증한 것은 아니므로 문서의 `verified_at`은 유지한다.

### 컴포넌트와 글꼴 탐색 및 출처 인계

컴포넌트와 글꼴을 찾는 경로도 구분한다. 다음 세 자원의 역할과 제공 방식은 2026-10-21 공식 페이지를 대조했다. 기존 자원의 개수와 라이선스를 다시 검증한 것은 아니므로 문서의 기존 `verified_at`은 유지한다.

- **21st:** 여러 제작자의 React 컴포넌트, 템플릿과 테마를 모은 레지스트리다. 공식 안내는 컴포넌트의 프롬프트를 코딩 도구에 전달하거나 shadcn CLI로 소스를 프로젝트에 추가하는 방식을 제공한다. 라이브러리 하나를 의존성으로 가져오는 것과 소스를 복사해 직접 수정하는 것을 구분한다.
- **affectUI:** 채팅 입력, 인용 답변과 도구 호출 카드 같은 React UI를 제공한다. 컴포넌트는 스타일을 포함한 TSX 파일로 추가하며, 문서는 용도, props, 키보드와 접근성 동작을 설명한다. Pro 항목의 미리보기와 문서는 공개돼도 소스 접근에는 Pro가 필요하다. MCP는 검색, 문서 조회와 소스 조회를 나누어 제공한다.
- **Best Free Fonts:** 글꼴을 serif, sans serif, display, script와 monospace로 분류한 카탈로그다. 컴포넌트 동작을 가져오는 도구가 아니라 타이포그래피 후보를 찾는 경로로 쓴다.

적용 제안: 화면의 부족한 부분이 정보 위계인지, 컴포넌트 상태인지, 글꼴인지 먼저 정하고 자원을 고른다. 카탈로그의 소개 문구만으로 개별 자산과 의존성의 사용 조건이 확인됐다고 보지 않는다. affectUI의 승인 카드나 도구 호출 카드를 배치한 사실도 실제 승인 정책, 도구 실행이나 데이터 연동을 구현한 증거가 아니다.

고객 사이트로 납품할 때는 다음을 확인한다. 원문 조건을 납품에 적용한 제안이며 법률 판단을 대신하지 않는다. 라이선스별 조건은 [[Open-Source-License-Review|오픈소스 라이선스 검토]], 인계 범위는 [[Dev-Outsourcing-Engagement|개발 외주의 계약과 수주]]를 따른다.

- shadcn 레지스트리 방식은 npm 패키지 대신 컴포넌트 소스를 프로젝트에 넣는다. 2026-10-12에 확인한 Velora UI의 marquee와 heroicons-animated의 academic-cap 항목 소스에는 라이선스 주석이 없고, 이렇게 받은 컴포넌트 자체는 패키지 의존성 목록에 나타나지 않는다. 항목이 선언한 `motion` 같은 npm 의존성만 추가된다. Velora UI README는 shadcn MCP로 에이전트가 이름만으로 컴포넌트를 찾아 설치하는 방법도 안내하므로, 받은 항목, 레지스트리 URL, 받은 날짜와 LICENSE 사본을 인계 자료에 남긴다.
- Velora UI README의 출처 표기 불필요(no attribution required) 안내와 별개로 MIT LICENSE 원문은 소프트웨어의 모든 복제물 또는 실질적인 부분에 저작권 고지와 허가 고지를 포함하라는 조건을 둔다. 화면의 출처 표기와 소스, 고지 파일의 고지를 구분하고 후자는 지우지 않는다.
- 원본 아이콘 세트의 라이선스가 고지 보존을 요구하면 파생 프로젝트의 LICENSE만으로 고지가 끝나지 않는다. AnimateIcons를 shadcn으로 받았다면 Lucide(ISC), Feather(MIT), Hugeicons(MIT)의 고지까지 고지 파일에 옮긴다.
- LICENSE 파일이 없는 SHIUI는 선언된 ISC와 받은 커밋을 기록하거나 작성자에게 확인하고, 바닥글에 들어 있는 견본 저작권 문구(© 2026 SHIUI Press)도 고객 표기로 바꾼다. Tween UI 문서가 납품 전에 바꾸라고 안내하는 샘플 이미지처럼 데모용 사진은 고객 자산으로 교체한다.
- 스킬의 라이선스와 스킬이 쓰게 하는 패키지의 라이선스는 별개다. 2026-10-12 확인한 이전 Taste Skill 기본 스킬은 고정(pin)과 스크럽(scrub) 같은 스크롤 연출에 GSAP과 ScrollTrigger 코드 골격을 제시하는데, GSAP은 MIT가 아닌 Webflow의 Standard No Charge GSAP License를 따른다. 이 라이선스는 상업적 사용을 허용하지만 서면 동의 없이 Webflow의 시각적 애니메이션 제작 기능과 경쟁하는 노코드 도구에 쓰는 것은 금지한다(2025-05-30 개정판 기준). 컴포넌트 저장소가 MIT여도 Tween UI처럼 gsap을 의존성으로 들이는 항목은 이 조건을 함께 따른다.
- 카탈로그 저장소의 라이선스와 그 안에 재현된 회사 디자인 시스템의 권리도 별개다. oh-my-design 저장소가 MIT여도 README는 레퍼런스가 각 회사에 속한다고 밝히므로, MIT를 그 디자인 시스템의 이용 허락으로 읽지 않는다. 고객 사이트에는 카탈로그 항목을 절 구성과 작성 방식의 참고로만 쓰고, DESIGN.md는 고객의 로고, 색과 글꼴 같은 자체 브랜드 자산에서 새로 작성한다. 공공 서비스라면 [[Service-Design-Principles#디자인 시스템|KRDS]] 같은 공개 디자인 시스템이 출발점 후보다. 저장소 안의 모든 파일이 MIT인 것도 아니다. 스킬 번들의 인라인 라이브러리 라이선스 목록은 GSAP 3.15.0 파일을 GSAP Standard License로 표시하므로, 생성한 HTML에 이 파일이 들어가면 앞 항목의 GSAP 조건을 함께 확인한다.

## 내보내기와 구현 인계

Claude Design은 PDF, PowerPoint와 HTML로 내보내거나 Canva 등 연결된 도구로 전달할 수 있다. Claude Code에는 디자인을 인계해 기존 작업을 이어 가는 흐름을 제공한다. 2026-10-06 확인한 공식 안내에는 `/design-sync`를 통한 디자인 시스템 반영과 `/design`을 통한 디자인 프로젝트 생성, 편집과 동기화가 설명돼 있다. 로컬 환경에서 해당 기능을 직접 실행해 확인한 기록은 아니다.

다음 구분은 결과 검토에 사용할 기준이다.

| 전달물 | 확인할 내용 |
|---|---|
| PDF, PowerPoint | 페이지 넘침, 글꼴, 정렬과 편집 필요성 |
| HTML 또는 인터랙티브 프로토타입 | 화면 전환과 표시 상태, 테스트용 데이터의 범위 |
| 구현 인계 자료 | 선택한 컴포넌트, 반응형 규칙, 실제 API와 연결할 지점 |

클릭 시 화면이 바뀌는 것만으로 인증, 데이터 저장이나 외부 결제가 구현됐다고 판단하지 않는다. 프로토타입에서 가정한 동작을 실제 코드, API와 테스트로 이어서 확인한다.

## 웹 애니메이션을 영상으로 인계하기

브라우저에서 움직이는 시안과 배포할 영상 파일은 별도 산출물이다. Remotion으로 옮기는 경우에는 React 컴포넌트에 화면 크기, FPS와 길이를 지정한 composition을 만들고 렌더링한다. 기존 HTML을 전달한 사실만으로 이 변환이 끝났다고 보지 않는다.

- **시간 기준:** Remotion 애니메이션은 `useCurrentFrame()`에서 얻은 프레임으로 상태를 계산한다. CSS `animation`, `transition`이나 `setTimeout`에 의존한 움직임은 렌더링 시 깜빡임이나 잘못된 진행 상태를 만들 수 있어 그대로 옮기지 않는다.
- **자막 입력:** `@remotion/captions`의 `parseSrt()`로 기존 SRT를 읽을 수 있다. 음성과 시간 정보가 있는 자막을 함께 전달하면 장면을 맞출 기준이 생긴다. 이 입력만으로 문맥에 맞는 연출이 자동 보장되지는 않는다.
- **결과 확인:** Studio나 CLI에서 렌더링한 파일을 직접 재생해 자막 시점, 음성과 장면 전환, 글꼴과 줄바꿈을 확인한다. 미리보기에서 보였다는 사실과 최종 파일의 검수 완료를 구분한다.

위 흐름은 디자인 인계에 Remotion의 공식 렌더링 원리를 적용한 작업 제안이다. Claude Design과 Remotion 사이의 자동 변환이나 특정 내보내기 기능을 보장하는 설명은 아니다. 2026-10-06에 Remotion의 composition, 자막 가져오기와 렌더링 문서를 대조했으며 실제 영상 제작 성능은 측정하지 않았다.

### HTML 기반 영상과 재현 조건

HyperFrames는 장면, 시간과 움직임을 HTML 프로젝트로 관리하며 에이전트, Studio와 렌더러가 같은 소스를 사용한다. `data-start`, `data-duration` 같은 속성으로 시간을 표현하고, 특정 시점으로 이동해 프레임을 캡처한다. React composition을 쓰는 Remotion과 소스 형식이 같다고 가정하지 않는다.

같은 시점의 재현 조건은 소스뿐 아니라 미디어와 설정도 같아야 한다는 것이다. 현재 시각, 시드 없는 난수와 렌더링 중 네트워크 요청에 의존하지 않도록 구성한다. 이는 동일한 프로젝트 상태를 재현하는 원리이며, 모든 환경에서 최종 영상 파일의 바이트가 같다는 보장으로 확대하지 않는다.

납품 제안: 편집 가능한 HTML과 자원, 사용한 설정을 함께 보존한다. `npx hyperframes check`로 검사한 뒤 `npx hyperframes render --output video.mp4`로 출력하고, 완성 파일의 자막, 음성 동기화와 줄바꿈을 직접 확인한다. 2026-10-20 공식 프로젝트 모델과 개발자 안내를 대조했으며 로컬 렌더링 성능과 결과의 동일성은 시험하지 않았다.

## 구현 전 확인할 경계

- 로딩, 빈 결과, 권한 부족과 오류 상태가 정의됐는가?
- 화면 크기가 바뀌거나 텍스트가 길어져도 핵심 과업을 수행할 수 있는가?
- 키보드 이동, 초점과 레이블을 포함한 접근성을 확인했는가?
- 디자인에서 사용한 예시 데이터와 운영 데이터의 구분이 명확한가?
- 브리프가 요구하지 않은 흔한 기본값(글꼴, 배경, 카드 중첩)을 이유 없이 그대로 쓰지 않았는가?
- 외부에서 받은 컴포넌트, 아이콘과 그 의존성의 출처, 받은 날짜와 라이선스 고지를 인계 자료에 남겼는가?
- 인계 후 남은 요구사항과 완료 증거를 코드 변경 단위로 설명할 수 있는가?

위 항목은 구현 검토 기준이며 디자인 도구가 자동으로 보장하는 기능 목록은 아니다. 발표 자료와 서비스 구현은 각각의 완료 조건으로 검수한다.

## 출처

- [21st](https://21st.dev/) — 레지스트리와 소스 복사, 프롬프트 전달 방식
- [affectUI, Introduction](https://www.affectui.com/docs/introduction) — TSX 파일, 컴포넌트 문서와 Free/Pro 접근 범위
- [affectUI, Using with AI](https://www.affectui.com/docs/ai) — MCP의 검색, 문서 조회와 소스 조회 도구
- [Best Free Fonts](https://bestfreefonts.com/) — 글꼴 분류와 카탈로그
- [Introducing Claude Design by Anthropic Labs — Anthropic](https://www.anthropic.com/news/claude-design-anthropic-labs)
- [Claude Design now stays on brand for daily work — Anthropic](https://claude.com/resources/articles/claude-design-stays-on-brand-for-daily-work)
- [google-labs-code/design.md — GitHub](https://github.com/google-labs-code/design.md) — 2026-10-12 README의 front matter와 절 순서, CLI 명령, lint 규칙 등급과 종료 코드, alpha 상태 확인
- [kwakseongjae/oh-my-design — GitHub](https://github.com/kwakseongjae/oh-my-design) — README의 에이전트별 설치 범위, MIT와 레퍼런스 귀속 고지
- [DESIGN.md Core v2 — GitHub, kwakseongjae/oh-my-design](https://github.com/kwakseongjae/oh-my-design/blob/main/spec/design-md-core-v2.md) — YAML front matter 금지와 Google 형식과의 관계
- [oh-my-design — oh-my-design.kr](https://oh-my-design.kr) — 2026-10-12 회사 수, 국가 수, 등급별 개수와 정의, CLI 설치 범위
- [Inline library licenses — GitHub, kwakseongjae/oh-my-design](https://github.com/kwakseongjae/oh-my-design/blob/main/.claude/skills/omd-aphrodite/docs/design-excellence/fx-library/scroll-gsap/lib/LICENSES.md) — GSAP 3.15.0 파일의 GSAP Standard License 표시
- [Remotion, Composition](https://www.remotion.dev/docs/terminology/composition)
- [Remotion, Don't use CSS animations in Remotion](https://www.remotion.dev/docs/troubleshooting/css-animations)
- [Remotion, Importing .srt subtitles into Remotion](https://www.remotion.dev/docs/captions/importing)
- [Remotion, Render your video](https://www.remotion.dev/docs/render)
- [HyperFrames, How a HyperFrames project works](https://hyperframes.heygen.com/concepts)
- [HyperFrames, Build on HyperFrames](https://hyperframes.heygen.com/developers)
- [Improving frontend design through Skills — Anthropic](https://claude.com/blog/improving-frontend-design-through-skills)
- [frontend-design SKILL.md, 2026-09-03 판 — GitHub, anthropics/skills](https://github.com/anthropics/skills/blob/41bbe19d/skills/frontend-design/SKILL.md)
- [Update frontend-design skill (#1293) — GitHub, anthropics/skills](https://github.com/anthropics/skills/commit/2235be7c) — 2026-06 개정
- [pbakaus/impeccable — GitHub](https://github.com/pbakaus/impeccable)
- [pbakaus/impeccable README, 2026-09-07 판 — GitHub](https://github.com/pbakaus/impeccable/blob/ec0928d7/README.md) — 규칙 61개 시점
- [Retire the layout-transition rule (#978) — GitHub, pbakaus/impeccable](https://github.com/pbakaus/impeccable/commit/d98b0be4e18321903b13e69c2f2b5df064cb7623)
- [impeccable SKILL.md — GitHub, pbakaus/impeccable](https://github.com/pbakaus/impeccable/blob/main/.claude/skills/impeccable/SKILL.md)
- [craft-floor.md — GitHub, pbakaus/impeccable](https://github.com/pbakaus/impeccable/blob/main/.claude/skills/impeccable/reference/craft-floor.md)
- [hooks.md — GitHub, pbakaus/impeccable](https://github.com/pbakaus/impeccable/blob/main/.claude/skills/impeccable/reference/hooks.md)
- [Impeccable, FAQ](https://impeccable.style/faq)
- [Changelog — Impeccable](https://impeccable.style/changelog)
- [Impeccable, Automatic design checks](https://impeccable.style/docs/hooks)
- [Impeccable, Run a detector scan](https://impeccable.style/docs/detector)
- [Impeccable, audit](https://impeccable.style/docs/audit)
- [GitHub Copilot app — GitHub](https://github.com/features/ai/github-app)
- [Impeccable Kills AI Design Slop — Better Stack](https://www.youtube.com/watch?v=J1RYxganY20) — 2026-10-10 업로드, 규칙 수 61개는 당시 README의 59개와 다르며 효과 주장의 근거로 사용하지 않음
- [Taste Skill — tasteskill.dev](https://tasteskill.dev)
- [Leonxlnx/taste-skill — GitHub](https://github.com/Leonxlnx/taste-skill) — 2026-10-23 README의 v2/v2.1 흐름, 실행 요건과 기존 스킬 이동 확인
- [design-taste-frontend SKILL.md — GitHub, Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md) — 2026-10-23 v2의 lint, 브라우저 검사와 스크린샷 검토 지시 확인
- [이전 design-taste-frontend 보존본 — GitHub, Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/blob/2b44c81bbe36ac8a8a6bdd1c9ff593f28b8728f4/skills/taste-skill-v2-experimental/SKILL.md) — 이전 아이콘 허용 목록과 GSAP/ScrollTrigger 코드 골격의 근거
- [redesign-existing-projects SKILL.md 보존본 — GitHub, Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/blob/2b44c81bbe36ac8a8a6bdd1c9ff593f28b8728f4/skills/redesign-skill/SKILL.md) — 이전 redesign 절차와 아이콘 선택의 근거
- [GSAP, Standard No Charge GSAP License](https://gsap.com/standard-license) — 2025-05-30 개정판
- [ColorlibHQ/velora-ui — GitHub](https://github.com/ColorlibHQ/velora-ui)
- [Pricing — Velora UI](https://velora.colorlib.com/pricing) — Free는 MIT, 출시 예정 Pro는 Commercial로 표시
- [marquee 레지스트리 항목 — Velora UI](https://velora.colorlib.com/r/marquee.json) — 2026-10-12 확인, 소스에 라이선스 주석 없음
- [heroicons-animated — Aniket Pawar](https://www.heroicons-animated.com)
- [LICENSE — GitHub, Aniket-508/heroicons-animated](https://github.com/Aniket-508/heroicons-animated/blob/main/LICENSE)
- [academic-cap 레지스트리 항목 — heroicons-animated](https://www.heroicons-animated.com/r/academic-cap.json) — 2026-10-12 확인, 소스에 라이선스 주석 없음
- [LICENSE — GitHub, tailwindlabs/heroicons](https://github.com/tailwindlabs/heroicons/blob/master/LICENSE)
- [shadcn/ui, Introduction](https://ui.shadcn.com/docs)
- [refs.gallery](https://www.refs.gallery/info) — 2026-10-12 접속 제한(HTTP 429)으로 본문과 이용 조건을 확인하지 못함
- [vercel-labs/skills — GitHub](https://github.com/vercel-labs/skills) — README의 `--all` 설치 옵션
- [바이브 코딩 결과물 다듬는 무료 자료 5곳 — 코딩 수익화 : 투더제이 TTJ](https://www.youtube.com/watch?v=9mtacFyZD8Q) — 2026-10-10 업로드, 자원 목록의 출발점이며 개수와 라이선스는 공식 사이트와 LICENSE 원문으로 다시 확인함
- [AnimateIcons — animateicons.in](https://animateicons.in) — 2026-10-12 아이콘 1170개(Lucide 669개, Huge 501개)
- [Avijit07x/animateicons — GitHub](https://github.com/Avijit07x/animateicons) — LICENSE(MIT)와 THIRD_PARTY_NOTICES의 Lucide, Feather, Hugeicons 고지
- [lu-x 레지스트리 항목 — AnimateIcons](https://animateicons.in/r/lu-x.json) — 2026-10-12 확인, 소스에 라이선스 헤더 없음
- [@animateicons/react — npm](https://www.npmjs.com/package/@animateicons/react) — 0.12.0, 패키지에 LICENSE와 THIRD_PARTY_NOTICES 포함
- [StaticMania/tween-ui — GitHub](https://github.com/StaticMania/tween-ui) — MIT, shadcn 레지스트리 설치
- [Tween UI — tween-ui.vercel.app](https://tween-ui.vercel.app) — 2026-10-12 컴포넌트 23개, 블록 33개
- [cta-photo-headline 레지스트리 항목 — Tween UI](https://tween-ui.vercel.app/r/cta-photo-headline.json) — 납품 전 샘플 이미지 교체 안내
- [psychosomat/ShiUI — GitHub](https://github.com/psychosomat/ShiUI) — README와 package.json의 ISC 선언, LICENSE 파일 없음, 요소 112개와 Astro 블록 24개
- [SHIUI — shi-ui.vercel.app](https://shi-ui.vercel.app) — 2026-10-12 확인, 사이트 안의 요소와 블록 수 표시가 서로 다름
- [Minimal Gallery — minimal.gallery](https://minimal.gallery)
- [About — Minimal Gallery](https://minimal.gallery/about/) — 2013년 시작, 2026년 인수 표기
- [Legal — Minimal Gallery](https://minimal.gallery/legal/) — 2026-05 표시 이용 조건
- [PyModel/react-frontend-skills — GitHub](https://github.com/PyModel/react-frontend-skills) — 스킬 18개, React 19.3 기준, MIT, 설치 명령
- [AI 티 안 나는 웹사이트 만들기, 무료 웹 UI 자료 5곳 — 코딩 수익화 : 투더제이 TTJ](https://www.youtube.com/watch?v=9zpd2YuL5u0) — 2026-10-11 업로드, 두 번째 자원 목록의 출발점이며 개수와 라이선스는 공식 사이트와 저장소로 다시 확인함

## 관련 문서

- [[Claude-Code-Business-Automation|문서와 시각 산출물 자동화]]
- [[Claude-Code-Workflows|개발 워크플로우와 완료 조건]]
- [[Agent-Spec-Writing|에이전트에 전달할 요구사항 작성]]
- [[AI-Slop-Quality-Gate|AI 슬롭과 판단 관문]] — 정적 규칙과 사람 판정의 한계
- [[Design-System-Lint|디자인 시스템 lint]] — 테마 토큰과 컴포넌트 계약의 정적 검사
- [[Agent-Skills|에이전트 스킬]] — 필요할 때 불러오는 지침
- [[Open-Source-License-Review|오픈소스 라이선스 검토]] — MIT 고지 보존과 외부 자산의 이용 조건
