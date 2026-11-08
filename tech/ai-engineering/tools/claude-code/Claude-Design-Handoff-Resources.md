---
tags: [ai, design, frontend, claude-code, skills, shadcn, license, design-system]
status: done
verified_at: 2026-10-12
category: "AI엔지니어링(AIEngineering)"
aliases: ["Generative UI Resources", "생성 UI 외부 자원 출처 확인", "Taste Skill", "Hallmark", "oh-my-design", "AnimateIcons", "Tween UI", "Minimal Gallery", "React Frontend Skills", "Colorion Text Effects", "design-agent-skills", "Glimpse", "MiniDev UI", "Kibo UI"]
---

# 생성 UI를 다듬는 외부 자원과 납품 전 출처 확인

[[Claude-Design-Handoff|AI 디자인 시스템과 구현 인계]]에서 분리한 외부 자원 문서다. 디자인 시스템과 DESIGN.md, 생성 UI의 기본값 수렴과 Impeccable, 내보내기와 구현 인계는 그 문서에 두고, 여기서는 생성 UI를 다듬는 스킬, 컴포넌트, 아이콘, 글자 효과, 시각 캔버스와 레퍼런스의 역할, 제공 방식과 라이선스, 고객 사이트 납품 전 출처 확인을 다룬다.

## 범주별 역할과 라이선스

지침 스킬, 코드 작성 스킬, 컴포넌트, 아이콘, 레퍼런스 갤러리와 디자인 시스템 카탈로그는 다듬는 대상이 다르고 출처와 라이선스를 남기는 방법도 다르다. 아래 개수와 라이선스는 2026-10-12에 각 공식 사이트, 저장소와 LICENSE 원문을 대조한 기준이며 바뀔 수 있다. 2026-10-21과 2026-10-26에 확인한 컴포넌트와 글꼴, 스킬 카탈로그, 글자 효과와 시각 캔버스, 2026-11-08에 확인한 Taste Skill 2.5와 Hallmark는 아래 별도 절에 있다.

- **지침 스킬:** Taste Skill(MIT)과 Hallmark(MIT)는 방향을 먼저 배정하고 브라우저로 검사하는 지침 스킬이며, 2026-11-08 확인한 절차, 설치와 외부 요청은 아래 별도 절에 있다. Taste Skill의 2026-11-08 README도 저장소에 `design-taste-frontend` 하나를 두고, 기존 스킬은 taste-skill-classics와 imagegen-skills 같은 별도 저장소로 옮겼다고 밝힌다. 2026-10-23과 2026-11-08 README 모두 기존 `redesign-existing-projects`를 바꾸기 전에 실제 브라우저에서 기존 페이지를 점검하는 기본 스킬의 일부로 적는다. 2026-10-12에 확인한 13개 스킬 묶음, 세 다이얼과 출력 전 체크리스트만으로 현재 판을 설명하지 않는다. 설치 전 확인은 [[Agent-Skills#설치 경로와 신뢰 — 표면마다 따로, 출처는 먼저|스킬 설치의 신뢰 경계]]를 따른다.
- **코드 작성 스킬:** 시각 지침이 아니라 코드 작성 지침을 담은 묶음도 있다. React Frontend Skills(MIT)는 React, Next.js, TypeScript, Tailwind, shadcn, TanStack Query, Zod, Vitest, Playwright 등 18개 스킬을 React 19.3 기준으로 묶고, 프로젝트가 다른 버전을 고정했으면 그 버전의 공식 문서를 따르라고 적는다. Claude Code 전용이 아니라 Codex와 Cursor 같은 여러 에이전트를 대상으로 하며, skills CLI의 `-s` 옵션으로 필요한 스킬만 골라 설치할 수 있다. 스킬 파일은 Markdown뿐이고 훅과 스크립트는 없다. 다만 react, nextjs 같은 스킬 본문이 `npx -y @pymodel/react-frontend-skills detect` 같은 동반 CLI 실행을 지시하고 MCP 서버 안내도 `npx -y`를 써서, 원격 패키지를 확인 없이 실행하게 된다. `web-design-guidelines` 스킬은 리뷰마다 커밋으로 고정한 외부 지침을 내려받는다.
- **컴포넌트:** Colorlib의 Velora UI는 React, Tailwind CSS 4와 shadcn/ui용 애니메이션 컴포넌트 100개와 블록 31개를 MIT로 공개한다. README 기준 100개 중 51개는 런타임 의존성이 없고 나머지는 Motion만 쓴다. 출시 예정인 유료 Pro 등급은 가격표에 MIT가 아닌 Commercial로 표시되므로 어느 등급에서 받은 항목인지 함께 기록한다. Tween UI(StaticMania, MIT)는 GSAP과 CSS로 움직이는 React 19, Tailwind v4용 컴포넌트 23개와 블록 33개를 패키지 없이 shadcn 레지스트리로 배포하며(README는 아직 16개, 20개로 적는다), 항목에 따라 gsap, @gsap/react, swiper 같은 의존성이 함께 들어온다. SHIUI는 React 요소 112개와 Astro 블록 24개를 소스 복사 방식으로 제공한다. 블록은 Astro라 React 프로젝트에 바로 넣을 수 없다. SHIUI는 README와 package.json에 ISC를 선언했지만 저장소에 LICENSE 파일이 없고 두 파일에 저작권자 표기도 없다.
- **아이콘:** heroicons-animated는 Tailwind Labs의 Heroicons를 Motion으로 움직이게 만든 개인 프로젝트(Aniket Pawar, MIT)로 316개를 표시한다. 이 저장소의 LICENSE에는 Aniket Pawar의 저작권 고지만 있으므로 원본 Heroicons LICENSE의 고지(Copyright (c) Tailwind Labs, Inc.)도 함께 보존하는 편이 안전하다. 2026-10-12 확인한 이전 Taste Skill 기본 스킬은 아이콘 허용 목록을 Phosphor, HugeIcons, Radix, Tabler로 두고 프로젝트마다 한 계열만 쓰라고 지시하므로, Heroicons 계열을 쓸 프로젝트라면 그 선택을 프로젝트 지침에 적어 둔다. 당시 같은 저장소의 redesign 스킬은 Phosphor, Heroicons나 자체 세트를 권해 두 스킬의 지시가 다르다. AnimateIcons(Avijit Dey, MIT)는 Lucide 스타일 669개와 Hugeicons 스타일 501개, 모두 1170개의 움직이는 React 아이콘을 npm 패키지(`@animateicons/react`), shadcn 레지스트리와 자체 CLI로 배포한다. 저장소의 THIRD_PARTY_NOTICES는 아이콘 모양이 Lucide(ISC), Feather(MIT), Hugeicons(MIT)에 기반하고 그 라이선스가 아이콘 복제물에 저작권 고지를 남기도록 요구한다고 밝힌다. npm 패키지에는 LICENSE와 THIRD_PARTY_NOTICES가 들어 있지만 shadcn 레지스트리로 받은 소스에는 라이선스 헤더가 없다.
- **레퍼런스 갤러리:** refs.gallery는 영상 설명 기준 사이트 레퍼런스 모음이며, 2026-10-12에는 HTTP 429로 페이지가 열리지 않아 내용과 이용 조건을 확인하지 못했다. Minimal Gallery는 2013년부터 운영된 웹사이트 디자인 영감 모음으로 2026년에 인수됐다. 이용 조건(2026-05 표시)에 따르면 갤러리는 소개한 사이트의 소유권을 주장하지 않고 스크린샷과 썸네일을 자기 소유로 둔다. 열람과 북마크 같은 제한된 개인 이용만 허용하고, 상업적이거나 공개적인 목적의 복제와 배포에는 사전 서면 허락을 요구한다. 레퍼런스 갤러리를 쓸 때는 갤러리 이용 조건이 원래 사이트의 이미지, 문구와 일러스트 사용까지 허락한다고 가정하지 않고, 위계, 섹션 순서와 정보 밀도를 참고한 뒤 표면 시각은 브리프에 맞게 새로 만든다([[AI-Work-Tool-Selection|참고와 복제의 구분]]).
- **디자인 시스템 카탈로그:** oh-my-design은 실제 회사의 디자인 시스템을 코딩 에이전트용 DESIGN.md로 다시 쓴 카탈로그다. 2026-10-12 사이트 기준 18개국 521개 회사를 싣고 근거 수준으로 등급을 나눈다. 사이트 정의로는 verified 299개는 모든 값이 운영 중인 제품이나 공식 문서의 캡처로 추적되고, partial 109개는 캡처했지만 일부 값이나 출처가 빠졌거나 오래됐으며, legacy 113개는 근거 캡처 이전에 작성돼 증거가 아닌 출발점이다. `npx oh-my-design-cli@latest`는 Claude Code, Codex, Cursor와 OpenCode에 스킬 28개와 오프라인 카탈로그를 설치한다. README는 기본 설치가 감지된 모든 에이전트를 대상으로 한다고 적고, 비대화형으로 한 채널만 설치하려면 `install-skills --agent <이름> --all` 하위 명령을 안내한다. README 기준 Claude Code에는 스킬과 하위 에이전트 20개, 훅이 들어가고, Codex와 OpenCode에도 하위 에이전트 역할이 들어가며, Cursor에는 하위 에이전트와 훅 없이 호환되는 스킬 27개가 들어간다. 설치 전 확인은 [[Agent-Skills#설치 경로와 신뢰 — 표면마다 따로, 출처는 먼저|스킬 설치의 신뢰 경계]]를 따른다. 저장소는 MIT이며 README는 레퍼런스가 각 회사에 속하고 교육용 참고로 재현했다고 밝힌다.

## 브랜드 분석 파일과 공식 디자인 시스템을 구분한다

DESIGN.md를 고를 때는 파일 형식과 작성 주체를 따로 확인한다. 공개 화면을 분석해 만든 색, 글꼴, 간격과 컴포넌트 지침은 구현 참고자료이며, 해당 회사가 배포하거나 승인한 디자인 시스템이라는 뜻은 아니다.

2026-11-03 확인한 getdesign.md는 이런 분석 파일을 제공하는 카탈로그다. BMW 항목은 공개적으로 관찰할 수 있는 패턴의 독립 분석이고 영감을 위한 출발점이며, BMW와 제휴하거나 승인을 받은 자료가 아니라고 명시한다. 페이지에는 DESIGN.md 다운로드와 프로젝트에서 사용할 설치 명령이 안내된다. 이는 제공 방식의 확인이며 명령 실행, 파일 설치나 생성 화면의 품질 검증은 하지 않았다.

적용 제안: 회사 이름과 설치 수만으로 파일의 정확도나 프로젝트 적합성을 판단하지 않는다. 분석한 사이트와 시점을 확인하고 고객의 색, 글꼴과 콘텐츠로 지침을 다시 작성한다. 웹 UI 지침을 발표 자료에 참고할 때도 슬라이드 비율, 본문 크기와 도표의 읽기 순서는 별도로 설계한다. DESIGN.md를 확보했다는 사실을 PowerPoint 파일 생성이나 렌더링 검증 완료로 보지 않는다.

이번에는 카탈로그의 역할과 BMW 항목의 출처 성격만 대조했다. 기존 자원 전체를 재검증하지 않아 문서의 `verified_at`은 유지한다.

## Taste Skill과 Hallmark의 방향 선택과 검수

2026-11-08 공개 README, CHANGELOG, 스킬 본문과 스크립트 소스 기준이다. 다음은 스킬이 에이전트에 지시하는 절차와 설치 동작이며, 이 문서에서 로컬 실행이나 디자인 품질을 재현한 결과가 아니다. 2026-10-23에 확인한 Taste Skill v2의 `lint.mjs`, `inspect.mjs`와 스크린샷 검토 흐름은 2.5.0에서 바뀌었다.

- **Taste Skill 2.5의 절차:** README(tasteskill 2.5.1)는 코딩 에이전트가 회사 웹사이트를 만들거나 다시 설계하게 하는 스킬로 소개한다. 2.5.0(2026-11-05)은 2.1.x의 방향 시트와 앱 화면 흐름, `lint.mjs`, `inspect.mjs`를 `consistency.mjs`, `shoot.mjs`, `photos.mjs` 등으로 바꿨고, 2.5.1(2026-11-07)은 마무리 관문 `gate.mjs`와 브라우저 없이 문구의 AI 티를 세는 `copy-lint.mjs`를 더했다. 스킬은 사이트의 종류, 파는 것, 사는 사람과 주된 행동 하나를 먼저 적고 문구를 쓴 뒤, 팔레트, 글꼴 조합과 히어로 배치를 취향으로 고르지 않고 이력이 남는 명령으로 배정(deal)한다. 관문은 1440, 390픽셀 너비를 검사하고 320픽셀에서 페이지를 훑으며, 고칠 수 있는 FAIL이 없어질 때까지 기본 설정에서 최대 세 차례 마무리를 보류한다. 사용자가 멈추거나 그대로 내라고 하면 그 말을 넘겨 `gate.mjs --done`으로 빌드를 닫고 남은 FAIL을 보고하며, 에이전트가 스스로 충분하다고 판단해 닫지 않는다.
- **Taste Skill의 설치와 훅:** skills CLI(`npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`) 외에 Claude Code와 Codex의 플러그인 마켓(`taste-skill@taste-skill`)이나 클론의 `./install.sh`로 설치한다. Node 22 이상과 Chrome, Edge 또는 Chromium이 필요하고 API 키는 필요 없으며, 추가 사진과 아이콘을 받을 때 네트워크를 쓴다. Claude Code에서는 스킬 frontmatter가 관문을 Stop 훅(제한 시간 600초)으로 등록하고, Codex와 Antigravity는 자체 훅 파일에서 같은 명령을 실행한다. Claude Code는 스킬 frontmatter의 훅을 스킬을 부른 뒤 세션 끝까지 유지한다(공식 Hooks 문서, `once: true`를 둔 훅은 첫 성공 실행 뒤 제거).
- **Hallmark의 절차:** Together AI가 만든 디자인 스킬(SKILL.md와 package.json 2.0.0, 릴리스 태그 없음)로, README는 Claude Code, Codex, Cursor와 OpenCode를 대상으로 적고 Impeccable, frontend-design과 Taste Skill 등을 영감으로 밝힌다. 방문자가 하려는 일(구독, 예약, 구매 등)은 배정 전 단계에서 먼저 정한다. `theme.mjs deal`이 테마 50개의 카탈로그에서 최근 세 빌드에 쓴 테마와 직전 빌드와 같은 조합(바탕, 제목 글꼴, 강조색 계열)을 빼고 프롬프트에 맞는 세 개를 배정하면(검사 결과는 보지 않는다), 에이전트가 세 테마의 완성 페이지 그림을 보고 하나를 골라 그 이유를 밝히고 페이지를 짠다. 사용자가 세 후보를 보고 고르는 단계는 스킬 본문에 없다. 검사는 세 등급이다. Floor(대비, 초점, 움직임 줄이기, 지어낸 사실, 깨진 휴대폰 레이아웃)를 어기면 내보내지 않고, 모델이 빠지는 기본값인 Reflex는 이유를 기록하면 넘을 수 있으며, Finish는 내보내기를 막지 않는 마감 점검이다. `sloplint.mjs --render`가 8개 너비에서 페이지를 검사한 뒤 새 컨텍스트에서 검토한다. Claude Code와 OpenCode는 하위 에이전트가 검토하고, 하위 에이전트가 없는 Codex CLI는 같은 대화 안에서 검토하며 그렇다고 밝히게 한다(flow.md). 기존 디자인에는 사용자가 `/hallmark redesign <경로>`(내용과 연결을 유지한 전면 재설계)처럼 Hallmark를 지목할 때만 쓰고 `/hallmark audit <경로>`는 보고서를 내며, 그 밖의 기존 디자인 수정은 프로젝트의 기존 체계로 하라고 지시한다. README에 효과를 측정한 수치는 없다.
- **Hallmark의 설치와 외부 요청:** `npx skills add nutlope/hallmark -g`는 모든 프로젝트에 쓰도록(Claude Code는 `~/.claude/skills/hallmark`, Codex CLI는 `~/.agents/skills/hallmark`) 설치하고, `-g`를 빼면 현재 프로젝트에, `--agent`를 주면 한 도구에만 설치한다. Claude Code 플러그인 마켓(`hallmark@hallmark`)이나 클론의 `install.mjs`로도 설치한다. Node 18 이상이 필요하고, 브라우저 검사와 스크린샷에는 전역 `puppeteer-core`와 Chrome이 더 필요하다. 스킬 문서는 편집 시점 Floor 검사 훅의 설치 방법만 안내하고 설치를 지시하지 않으며, 플러그인 매니페스트에도 훅 선언이 없다. `install-hook.mjs`를 실행하면 Claude Code 프로젝트 설정 `.claude/settings.json`(`--global`이면 사용자 설정)에 Write, Edit, MultiEdit 뒤 PostToolUse 훅이 더해지고, `--remove`로 지운다. 이 훅은 Hallmark 표시(주석이나 `.hallmark` 폴더)가 있는 파일의 Floor FAIL을 에이전트 컨텍스트로 돌려줄 뿐이다. PostToolUse 훅은 도구가 실행된 뒤에 돌아 편집 자체를 막지 못하고, 2026-11-08 소스 기준 이 훅은 종료 코드 0으로만 끝난다. 셸에 `TOGETHER_API_KEY`가 있으면 사전 점검이 시안(comp) 단계를 켜고, `imagegen.mjs`가 레이아웃, 아이디어, 색 같은 시안 설명을 Together AI 이미지 생성 API(기본 모델 FLUX.1.1-pro)로 보낸다. 시안은 `.hallmark/comps/`에 두는 참고용이라 페이지에 넣지 않으며, 페이지에 쓸 이미지 생성은 사용자가 요청했거나 사진 라이브러리에 없는 주제일 때만 한다. 키가 없으면 시안 단계를 건너뛴다.
- **두 스킬의 사진:** Hallmark의 사진 라이브러리는 Wikimedia Commons에 있는 사진 755장의 목록일 뿐 이미지 파일을 담지 않고, 사진마다 CC0, 퍼블릭 도메인, CC BY, CC BY-SA 라이선스를 따르며 쓴 사진은 바닥글에 출처를 적는다. Unsplash, Pexels, Pixabay 같은 스톡 사이트는 쓰지 않는다. `theme.mjs photos`는 기본적으로 Commons 썸네일의 원격 주소를 `<img>`로 출력하고, `--save <폴더>`를 줄 때만 내려받는다. Taste Skill은 검증한 사진 라이브러리(Wikimedia Commons WebP 묶음과 Unsplash 사진)에서 업종에 맞는 대체 사진을 배정하고, 2.5.1의 `photos.mjs search`는 Commons에서 NC와 ND를 뺀 CC0, CC BY, CC BY-SA와 퍼블릭 도메인 JPEG를 찾는다. 대체 사진은 보고서에 나열하고 바닥글에 출처 한 줄을 적으며, 고객의 제품, 사람이나 장소처럼 보이게 쓰지 않는다.

적용 제안: 새 고객 사이트는 방향을 배정하고 브라우저로 검사하는 Taste Skill이나 Hallmark로 시작할 수 있다. 기존 페이지는 Hallmark가 사용자가 지목한 redesign과 audit에서 먼저 렌더링해 기록하고, Taste Skill은 README와 스킬 설명이 재설계와 검토를 다룬다고 적지만 2.5.1 본문에는 바꾸기 전 기존 페이지 점검 단계가 없다. 이미 만든 화면을 Impeccable의 명령과 탐지로 다듬을지는 기존 디자인 체계를 얼마나 유지할지로 정한다. frontend-design은 스크립트와 훅 없이 계획과 자기 검토를 지시하는 지침이라 외부 스킬을 들이기 전의 기준선으로 쓸 수 있다([[Claude-Design-Handoff#생성 UI가 같은 기본값으로 모이는 문제|Impeccable과 frontend-design]]). 스킬마다 사진 출처와 검사 기준이 달라 한 프로젝트에서 쓸 스킬을 정해 에이전트 지시 파일에 적는다. Taste Skill을 부른 Claude Code 세션에서는 열린 빌드에 고칠 FAIL과 남은 차례가 있으면 Stop 훅이 멈춤을 보류하므로, 작업을 멈추려면 사용자의 멈춤 지시를 넘겨 `gate.mjs --done`으로 빌드를 닫는다. 어느 스킬이든 대상 사용자, 실제 문구와 목적을 먼저 전달하고, 최종 화면의 가독성, 버튼 동작과 상태별 표시를 별도로 확인한다. 다른 자원의 기존 날짜와 라이선스까지 재검증한 것은 아니므로 문서의 `verified_at`은 유지한다.

## 컴포넌트와 글꼴 탐색

컴포넌트와 글꼴을 찾는 경로도 구분한다. 다음 세 자원의 역할과 제공 방식은 2026-10-21 공식 페이지를 대조했다. 기존 자원의 개수와 라이선스를 다시 검증한 것은 아니므로 문서의 기존 `verified_at`은 유지한다.

- **21st:** 여러 제작자의 React 컴포넌트, 템플릿과 테마를 모은 레지스트리다. 공식 안내는 컴포넌트의 프롬프트를 코딩 도구에 전달하거나 shadcn CLI로 소스를 프로젝트에 추가하는 방식을 제공한다. 라이브러리 하나를 의존성으로 가져오는 것과 소스를 복사해 직접 수정하는 것을 구분한다.
- **affectUI:** 채팅 입력, 인용 답변과 도구 호출 카드 같은 React UI를 제공한다. 컴포넌트는 스타일을 포함한 TSX 파일로 추가하며, 문서는 용도, props, 키보드와 접근성 동작을 설명한다. Pro 항목의 미리보기와 문서는 공개돼도 소스 접근에는 Pro가 필요하다. MCP는 검색, 문서 조회와 소스 조회를 나누어 제공한다.
- **Best Free Fonts:** 글꼴을 serif, sans serif, display, script와 monospace로 분류한 카탈로그다. 컴포넌트 동작을 가져오는 도구가 아니라 타이포그래피 후보를 찾는 경로로 쓴다.

적용 제안: 화면의 부족한 부분이 정보 위계인지, 컴포넌트 상태인지, 글꼴인지 먼저 정하고 자원을 고른다. 카탈로그의 소개 문구만으로 개별 자산과 의존성의 사용 조건이 확인됐다고 보지 않는다. affectUI의 승인 카드나 도구 호출 카드를 배치한 사실도 실제 승인 정책, 도구 실행이나 데이터 연동을 구현한 증거가 아니다.

## 글자 효과, 스킬 카탈로그, 시각 캔버스와 컴포넌트

다음 다섯 자원의 역할, 제공 방식과 라이선스는 2026-10-26 각 공식 사이트, README와 LICENSE 원문을 대조했고, 설치와 데몬 동작 일부는 설치 스크립트, 데몬 스크립트, CLI 소스, 변경 기록, 레지스트리 항목, 효과 CSS 소스와 커밋으로 확인했다. 개수는 그날 표시 기준이며 바뀔 수 있다. 기존 자원의 개수와 라이선스를 다시 검증한 것은 아니므로 문서의 `verified_at`은 유지한다.

- **글자 효과:** Colorion Text Effects는 순수 CSS로 만든 글자 효과 123개를 그라데이션, 글리치, 네온, 타이핑, 3D 등 8개 범주로 나눈 모음이다. JavaScript와 의존성이 없어 설치 단계 없이 효과마다 CSS를 복사하며, 같은 효과를 다시 만들라는 코딩 에이전트용 지시문을 복사하거나 입력한 문구로 효과를 시험하는 생성기를 쓸 수도 있다. 복사한 CSS는 `--ink`, `--ink-2`, `--ink-3` 색 토큰을 덮어써 프로젝트 색에 맞춘다. 사이트와 README는 모든 효과가 `prefers-reduced-motion`을 따른다고 적지만, 사이트에서 이를 맡는 전역 규칙은 효과 블록 밖에 있어 복사되지 않는다. 2026-10-26 복사용 CSS 데이터에서 `prefers-reduced-motion: reduce` 규칙이 들어 있는 효과는 100~123번 24개이고 01~99번에는 없다. 에이전트용 지시문은 이 설정에서 애니메이션을 끄라고 요구한다. 사이트와 README는 MIT라고 밝히지만 저장소에는 LICENSE 파일이 없고 package.json에도 license 필드가 없다.
- **스킬 카탈로그:** design-agent-skills(podo, MIT)는 Claude Code, Cursor, Codex, OpenCode 등 30개가 넘는 코딩 에이전트를 대상으로 디자인 스킬 160개를 모은 카탈로그다(README와 package.json 2.10.0 기준). README 표에서 160개는 저장소가 직접 관리하는 라우터 6개와 원 저장소에서 받는 구현 항목 154개로 나뉘지만, 같은 README의 Tier 2 설명은 구현 항목을 160개로 적는다. 항목에는 official, community, experimental 등급이 붙고 라우터에도 등급이 있다. README의 등급별 수(34개, 72개, 60개)를 더한 166개(계산값)는 라우터 6개와 Tier 2 설명의 160개를 더한 값이자 2.10.0 변경 기록이 언급한 stub 166개와 같다. 따라서 소개의 160개는 라우터를 뺀 구현 항목 수로 읽히고, 다른 수와 맞지 않는 것은 표의 구성(라우터 6개와 구현 항목 154개)이다. `npx skills add podo/design-agent-skills`로 프로젝트에, `-g`를 붙여 사용자 범위에 설치하며, 자체 CLI `npx design-agent-skills`는 범주별 대표 24개(`--picks`), 약 96개(`--essentials`)와 experimental까지 포함한 전체(`--all`) 프로필을 제공한다. 라우터는 도메인별 요청을 알맞은 스킬로 보내고, 구현 항목은 스킬의 역할과 원 저장소에서 받는 방법을 적은 안내다. 에이전트는 그 스킬이 필요할 때 안내대로 원 스킬을 받으며, 받는 방법은 README의 유형 표에 따라 다르다. skill 유형은 안내에 적힌 `npx skills add <원 저장소> --skill <이름> -y`로 원 스킬 하나를 설치하고, package 유형은 한 원 저장소의 여러 스킬을 함께 받거나 문서화된 수동 경로를 따르며, platform 유형(예: nimbalyst-skills)은 skills CLI로 설치할 수 없어 수동 절차를 거친다. skills CLI에서 `-y`는 모든 확인 질문을 건너뛴다. README는 원 저장소가 버전 릴리스나 고정 SHA를 내지 않아 설치 전에 고정할 수 없다고 밝히고, 더 강한 보장이 필요하면 특정 커밋에서 만든 포크를 항목의 `upstream`에 지정하라고 안내한다. README가 아니라 소스로 확인한 범위에서, 카탈로그의 `install.sh`는 설치할 때 에이전트별 skills 폴더를 만들고(`mkdir -p`) 저장소의 스킬을 심볼릭 링크(`ln -s`)로 걸 뿐이고, `bin/cli.mjs`는 설치를 `npx skills`에 맡기며 `--picks`, `--essentials` 설치에 `-y`를 붙인다. 두 파일 모두 에이전트 설정과 훅을 직접 바꾸지 않는다. 다만 `install.sh`의 `update` 하위 명령은 원 스킬로 바뀐 항목(package, platform 유형 제외)의 SKILL.md를 확인 질문 없이 다시 받아 덮어쓰고(덮어쓰기 전 SKILL.md.bak 백업), 해시는 받은 뒤 lock 파일에 기록할 뿐이다. 받는 브랜치는 stub의 version이 latest이면 원 저장소 main이고, `--frozen`은 다시 받지 않고 lock 해시와 비교해 경고한다. 설치를 맡는 skills CLI는 익명 사용 데이터를 수집하며 `DISABLE_TELEMETRY=1`이나 `DO_NOT_TRACK=1`로 이 수집과 보안 감사 요청을 끈다. 카탈로그의 MIT는 원 스킬에 미치지 않는다. 항목마다 원 저장소의 라이선스를 따로 적으며, animate-skill 항목은 원 저장소에 LICENSE 파일이 없다고 표시한다. 설치 전 확인은 [[Agent-Skills#설치 경로와 신뢰 — 표면마다 따로, 출처는 먼저|스킬 설치의 신뢰 경계]]를 따른다.
- **시각 캔버스:** Glimpse(MIT)는 코딩 에이전트가 만든 도식, 표와 데모를 HTML 페이지로 올려 로컬 대시보드에 보여 주는 시각 캔버스다. 대시보드는 Chrome DevTools Protocol(CDP)로 조종하는 별도 Chrome 창에 열린다. 사용자는 문단을 강조해 질문하고, 에이전트는 `glimpse ask`로 승인과 거절 같은 질문을 내거나 실행 중인 웹 앱을 읽고 클릭한다. 저장소를 클론해 `./install.sh`를 실행하면 CLI는 `~/.local/bin`, 캔버스는 `~/.glimpse`, 스킬 세 개(canvas, chrome-cdp, explain)는 `~/.claude/skills`에 들어간다. `--no-skills`는 스킬 설치를 건너뛴다. `--mcp claude`는 Claude Code 사용자 범위에, `--mcp codex`는 Codex 설정에 제3자 MCP 서버를 `npx chrome-devtools-mcp@latest`로 버전 고정 없이 등록하며, 사용 통계와 CrUX 전송을 끄는 옵션은 넣지 않는다. 설치 스크립트는 클론한 저장소의 git hooks 경로(`core.hooksPath`)도 저장소 안의 `.githooks`로 바꾼다. Node 22 이상과 Chrome 또는 Chromium이 필요하다. README는 계정, 호스팅 서버와 텔레메트리가 없고 정적 서버(기본 4321)와 CDP 포트(기본 9222)를 loopback에 묶는다고 밝힌다. README 기준 Glimpse 자체 기능 중 기기 밖으로 나가는 것은 선택해서 켜는 두 가지다. `glimpse share`는 사본을 ht-ml.app에 올리고, 상시 실행 데몬은 강조한 문단, 질문과 산출물 텍스트 약 8KB까지를 LLM 프록시로 보낸다. 데몬의 전송 주소는 `GLIMPSE_PROXY_URL`, 없으면 `ANTHROPIC_BASE_URL`에 `/v1/messages`를 붙인 주소, 둘 다 없을 때 `http://127.0.0.1:8787/v1/messages` 순으로 정해지고, 키는 `GLIMPSE_API_KEY`, `POE_API_KEY`, `ANTHROPIC_API_KEY` 순으로 가져온다. 주소와 키는 각각 따로 대체값을 고르므로, 예를 들어 `GLIMPSE_API_KEY`가 없고 `POE_API_KEY`가 있으면 `ANTHROPIC_API_KEY`가 함께 있어도 Poe 키가 `ANTHROPIC_BASE_URL`로 간다. 셸에 설정된 값에 따라 이 주소는 원격일 수 있다. 소스(`lib/glimpse-bridge.mjs`)로 보면 데몬은 같은 강조 구간(같은 문구와 출현 위치)에 대한 이전 질문과 답변도 함께 보내고(질문 2000자, 답변 4000자씩 자름), 산출물 텍스트는 8000자에서 잘라 한글 본문은 README의 약 8KB보다 바이트로 커질 수 있다. `--mcp`로 등록한 chrome-devtools-mcp는 앞의 두 기능(`glimpse share`와 데몬)에 들지 않는다. 그 README는 Google 사용 통계 수집이 기본으로 켜져 있고(`--no-usage-statistics`로 끔) 성능 도구가 trace URL을 CrUX API로 보낼 수 있다(`--no-performance-crux`로 끔)고 밝힌다. 내보낸 HTML도 Mermaid와 Tailwind의 CDN 참조는 네트워크 링크로 남긴다. CDP 창은 전용 프로필을 써 평소 브라우저의 로그인과 탭에 접근하지 않지만, 그 창에 띄운 내용은 에이전트가 읽고 조작할 수 있다. Kibo UI에도 링크 미리보기용 Glimpse 컴포넌트가 있어 이름만으로 구분하지 않는다.
- **화면 컴포넌트:** MiniDev UI(MiniDev, MIT)는 React와 Tailwind CSS v4용 컴포넌트 모음이다. 사이트 통계는 UI 컴포넌트 397개, 전체 페이지 블록 43개, 모션 108개와 템플릿 8개를 표시하며, npm 설명의 548개는 앞의 세 수를 합친 값이다. 제공 방식은 셋이다. README는 shadcn 레지스트리 디렉터리에 등록돼 있어 `npx shadcn@latest add @minidev/<이름>`을 별도 설정 없이 쓸 수 있다고 적는다. npm 패키지 `minidev-ui-kit`(0.6.0)는 React 18 이상과 `@base-ui/react` 1.x 등을 peer dependency로 요구하고, 전역 CSS에 패키지 스타일 import와 `@source` 경로를 더해야 한다. 컴포넌트가 파일 하나씩이라 소스를 복사해 쓸 수도 있다. 모션 컴포넌트는 저장소의 premium 폴더에 있지만 README는 다른 항목처럼 무료라고 적는다.
- **조합 컴포넌트:** Kibo UI(shadcnblocks, MIT)는 shadcn/ui와 함께 쓰도록 만든 조합형 컴포넌트 레지스트리다. 옛 저장소 주소 haydenbleasel/kibo는 shadcnblocks/kibo로 이어지고, 2025-10-29 Acquisition 커밋 이후 license.md의 저작권자는 원 작성자에서 shadcnblocks로 바뀌었다. 사이트는 컴포넌트 41개, 블록 28개와 shadcn/ui로 만든 패턴 1101개를 표시한다. `npx kibo-ui add <이름>`이나 shadcn CLI로 소스를 `@/components/kibo-ui/` 또는 shadcn 설정의 컴포넌트 폴더에 넣고, 필요한 의존성도 CLI가 함께 설치한다. Node.js 18 이상, React 18 이상과 초기화된 shadcn/ui가 필요하며 테마는 shadcn/ui의 CSS 변수 모드만 지원한다([[Design-System-Lint#테마가 퍼지는 구조와 어긋나는 두 경로|shadcn 테마 토큰]]). 항목마다 의존성이 달라, gantt 항목은 @dnd-kit/core, date-fns, jotai 등 npm 패키지 7개(개발 의존성 @types/lodash.throttle 별도)와 shadcn의 card, context-menu를 함께 요구한다. 블록 페이지는 shadcnblocks.com의 premium 블록도 안내한다.

적용 제안: 스킬 카탈로그는 카탈로그 저장소가 아니라 실제로 설치될 원 스킬을 검토 단위로 삼고, `update`를 실행했다면 lock 파일의 해시 변화로 바뀐 SKILL.md를 다시 검토한다. Glimpse로 고객 화면이나 내부 도식을 띄울 때는 `glimpse share`와 데몬을 켜기 전에 그 자료를 외부 서비스나 원격 모델로 보내도 되는지 계약의 공개 범위를 확인한다. `GLIMPSE_PROXY_URL`이 없으면 데몬은 셸의 `ANTHROPIC_BASE_URL`을 따라가므로 데몬을 켜기 전에 그 값이 가리키는 주소와 함께 선택될 키가 그 주소의 제공자 것인지 확인하고, 되도록 `GLIMPSE_PROXY_URL`과 `GLIMPSE_API_KEY`를 함께 명시한다. `--mcp`로 chrome-devtools-mcp를 등록했다면 사용 통계와 CrUX 전송을 끌지도 정한다. 글자 효과는 01~99번처럼 개별 규칙이 없는 CSS를 복사하면 움직임 줄이기 규칙을 직접 더하고, 복사한 CSS마다 그 설정에서 애니메이션이 멈추는지 확인한다.

## 고객 사이트 납품 전 확인

고객 사이트로 납품할 때는 다음을 확인한다. 원문 조건을 납품에 적용한 제안이며 법률 판단을 대신하지 않는다. 라이선스별 조건은 [[Open-Source-License-Review|오픈소스 라이선스 검토]], 인계 범위는 [[Dev-Outsourcing-Engagement|개발 외주의 계약과 수주]]를 따른다.

- shadcn 레지스트리 방식은 npm 패키지 대신 컴포넌트 소스를 프로젝트에 넣는다. 2026-10-12에 확인한 Velora UI의 marquee와 heroicons-animated의 academic-cap 항목 소스에는 라이선스 주석이 없고, 이렇게 받은 컴포넌트 자체는 패키지 의존성 목록에 나타나지 않는다. 항목이 선언한 `motion` 같은 npm 의존성만 추가된다. Velora UI README는 shadcn MCP로 에이전트가 이름만으로 컴포넌트를 찾아 설치하는 방법도 안내하므로, 받은 항목, 레지스트리 URL, 받은 날짜와 LICENSE 사본을 인계 자료에 남긴다.
- Velora UI README의 출처 표기 불필요(no attribution required) 안내와 별개로 MIT LICENSE 원문은 소프트웨어의 모든 복제물 또는 실질적인 부분에 저작권 고지와 허가 고지를 포함하라는 조건을 둔다. 화면의 출처 표기와 소스, 고지 파일의 고지를 구분하고 후자는 지우지 않는다.
- 2026-10-26 확인한 Kibo UI의 gantt 항목 소스와 Colorion 글자 효과의 복사용 CSS에도 라이선스나 출처 주석이 없다. MiniDev UI README의 출처 표기 불필요 안내도 MIT LICENSE의 고지 조건과 구분한다.
- Kibo UI는 license.md의 저작권자가 바뀐 이력이 있으므로 받은 커밋의 license.md 고지를 그대로 옮긴다. Kibo 블록 페이지가 안내하는 shadcnblocks.com의 premium 블록은 Kibo의 MIT가 아니라 shadcnblocks.com의 유료 라이선스 대상이므로 받은 곳과 조건을 따로 기록한다.
- 원본 아이콘 세트의 라이선스가 고지 보존을 요구하면 파생 프로젝트의 LICENSE만으로 고지가 끝나지 않는다. AnimateIcons를 shadcn으로 받았다면 Lucide(ISC), Feather(MIT), Hugeicons(MIT)의 고지까지 고지 파일에 옮긴다.
- LICENSE 파일이 없는 SHIUI는 선언된 ISC와 받은 커밋을 기록하거나 작성자에게 확인하고, 바닥글에 들어 있는 견본 저작권 문구(© 2026 SHIUI Press)도 고객 표기로 바꾼다. Tween UI 문서가 납품 전에 바꾸라고 안내하는 샘플 이미지처럼 데모용 사진은 고객 자산으로 교체한다.
- 사이트와 README로만 MIT를 밝히고 LICENSE 파일이 없는 Colorion 글자 효과도 그 표기와 복사한 날짜를 기록하거나 제작자에게 확인한다.
- 스킬의 라이선스와 스킬이 쓰게 하는 패키지의 라이선스는 별개다. 2026-10-12 확인한 이전 Taste Skill 기본 스킬은 고정(pin)과 스크럽(scrub) 같은 스크롤 연출에 GSAP과 ScrollTrigger 코드 골격을 제시하는데, GSAP은 MIT가 아닌 Webflow의 Standard No Charge GSAP License를 따른다. 이 라이선스는 상업적 사용을 허용하지만 서면 동의 없이 Webflow의 시각적 애니메이션 제작 기능과 경쟁하는 노코드 도구에 쓰는 것은 금지한다(2025-05-30 개정판 기준). 컴포넌트 저장소가 MIT여도 Tween UI처럼 gsap을 의존성으로 들이는 항목은 이 조건을 함께 따른다.
- 카탈로그 저장소의 라이선스와 그 안에 재현된 회사 디자인 시스템의 권리도 별개다. oh-my-design 저장소가 MIT여도 README는 레퍼런스가 각 회사에 속한다고 밝히므로, MIT를 그 디자인 시스템의 이용 허락으로 읽지 않는다. 고객 사이트에는 카탈로그 항목을 절 구성과 작성 방식의 참고로만 쓰고, DESIGN.md는 고객의 로고, 색과 글꼴 같은 자체 브랜드 자산에서 새로 작성한다([[Claude-Design-Handoff#디자인 시스템에서 출발한다|DESIGN.md 형식 구분]]). 공공 서비스라면 [[Service-Design-Principles#디자인 시스템|KRDS]] 같은 공개 디자인 시스템이 출발점 후보다. 저장소 안의 모든 파일이 MIT인 것도 아니다. 스킬 번들의 인라인 라이브러리 라이선스 목록은 GSAP 3.15.0 파일을 GSAP Standard License로 표시하므로, 생성한 HTML에 이 파일이 들어가면 앞 항목의 GSAP 조건을 함께 확인한다.
- 스킬 카탈로그의 라이선스와 카탈로그가 설치하게 하는 원 스킬의 라이선스도 별개다. design-agent-skills가 MIT여도 실제로 설치된 원 스킬의 저장소, 받은 날짜, 받은 커밋이나 lock 파일 해시와 라이선스를 따로 기록하고, LICENSE 파일이 없다고 표시된 원 스킬의 파일이나 자산은 납품물에 복사하기 전에 작성자에게 확인한다.
- 2026-11-08 확인한 Taste Skill과 Hallmark의 대체 사진은 고객 사진으로 바꾸는 것을 기본으로 한다. 남기는 사진은 원본 페이지, 작성자와 라이선스를 사진마다 인계 자료에 기록하고 바닥글 출처를 지우지 않는다. CC BY와 CC BY-SA는 출처, 라이선스 링크와 변경 여부의 표시를 요구하고 CC BY-SA 사진을 고쳐 만든 결과물은 같은 라이선스로 배포해야 하므로, 스킬이 만든 출처 문구와 사진의 편집 여부를 함께 확인한다. Taste Skill 라이브러리의 Unsplash 사진은 Commons 사진과 출처가 달라 Unsplash의 현재 약관 원문으로 따로 확인한다(이번에 대조하지 않음). Hallmark의 기본 출력처럼 Commons 주소를 직접 불러오는 이미지는 고객 사이트가 외부 호스트에 기대게 되므로 `--save`로 내려받아 넣을지 정한다.
- 스킬이 프로젝트에 남기는 파일과 설정도 인계 범위로 정리한다. Hallmark는 `.hallmark/`(사전 점검, 빌드 기록, 시안과 이미지 캐시)와 테마로 만든 `tokens.css`, `base.css`를 남기고, `install-hook.mjs`를 실행했다면 커밋될 수 있는 `.claude/settings.json`에 작성자 PC의 스킬 경로를 쓴 훅 항목이 생긴다. Impeccable은 `.impeccable/config.json`과 도구별 훅 파일(`.cursor/hooks.json`, `.github/hooks/impeccable.json` 등)을 둘 수 있다. Taste Skill은 `.taste-skill/`에 관문 상태, 배정 이력과 사진 검색 결과를 남기고 Chrome 프로필을 둘 수도 있다. 인계한 저장소에 프로젝트 훅 설정이 남으면 고객 쪽 에이전트에서도 실행될 수 있으므로 지우거나 인계 문서에 적는다(적용 제안). 빈 폴더에서 Taste Skill로 정적 페이지를 만들면 `<skill>/assets` 키트 전체를 프로젝트 `assets`로 복사해 쓰지 않은 번들 사진과 `photos.json`도 들어온다. 이 사진은 MIT가 아니라 `photos.json`에 사진마다 적힌 라이선스를 따르므로 쓰지 않는 사진은 지운다. 키트의 `assets/layout/hero-<id>.html`에서 복사하는 히어로처럼 스킬 저장소에서 옮긴 코드는 그 저장소의 MIT 고지 조건을, `icons.mjs`로 받은 아이콘은 `icons-credits.json`의 라이선스와 상표 표시를 함께 인계한다.
- 외부 요청은 작업 전에 정한다. Impeccable은 새 디자인을 시작할 때 impeccable.style에서 방향 후보를 받아 오고 텔레메트리를 꺼도 그 요청은 남는다([[Claude-Design-Handoff#생성 UI가 같은 기본값으로 모이는 문제|Impeccable의 외부 요청]]). Hallmark는 셸에 `TOGETHER_API_KEY`가 있으면 Claude Code에서는 문서상 확인 단계 없이 시안 설명을 Together AI로 보낸다. Codex CLI는 기본 `workspace-write` 샌드박스에서 네트워크가 꺼져 있어 `imagegen.mjs`에 명시적 요청과 승인이 필요하다고 flow.md가 적는다. 생성 이미지의 비용과 이용 조건은 밝히지 않는다. 계약이 외부 전송이나 생성 이미지를 제한하면 작업 셸에서 키를 빼고 텔레메트리와 버전 확인(`IMPECCABLE_NO_UPDATE_CHECK=1`)을 끈 뒤 시작하되, Impeccable의 방향 후보 요청은 텔레메트리를 꺼도 남으므로 이 요청을 허용할지 먼저 정한다.

## 출처

- [getdesign.md](https://getdesign.md/) — 2026-11-03 DESIGN.md 카탈로그의 역할과 색, 글꼴, 간격, 컴포넌트 지침 확인.
- [Design System Analysis: BMW — getdesign.md](https://getdesign.md/bmw/design-md) — 2026-11-03 다운로드 및 설치 안내, 독립 분석과 비제휴 고지 확인. 설치와 PPT 생성은 수행하지 않았다.
- [21st](https://21st.dev/) — 레지스트리와 소스 복사, 프롬프트 전달 방식
- [affectUI, Introduction](https://www.affectui.com/docs/introduction) — TSX 파일, 컴포넌트 문서와 Free/Pro 접근 범위
- [affectUI, Using with AI](https://www.affectui.com/docs/ai) — MCP의 검색, 문서 조회와 소스 조회 도구
- [Best Free Fonts](https://bestfreefonts.com/) — 글꼴 분류와 카탈로그
- [kwakseongjae/oh-my-design — GitHub](https://github.com/kwakseongjae/oh-my-design) — README의 에이전트별 설치 범위, MIT와 레퍼런스 귀속 고지
- [oh-my-design — oh-my-design.kr](https://oh-my-design.kr) — 2026-10-12 회사 수, 국가 수, 등급별 개수와 정의, CLI 설치 범위
- [Inline library licenses — GitHub, kwakseongjae/oh-my-design](https://github.com/kwakseongjae/oh-my-design/blob/main/.claude/skills/omd-aphrodite/docs/design-excellence/fx-library/scroll-gsap/lib/LICENSES.md) — GSAP 3.15.0 파일의 GSAP Standard License 표시
- [Taste Skill — tasteskill.dev](https://tasteskill.dev)
- [Leonxlnx/taste-skill — GitHub](https://github.com/Leonxlnx/taste-skill) — 2026-10-23 README의 v2/v2.1 흐름과 기존 스킬 이동, 2026-11-08 README(2.5.1)의 설치 경로, 실행 요건, 사진 라이브러리와 LICENSE(MIT)
- [design-taste-frontend SKILL.md — GitHub, Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md) — 2026-11-08 확인, 2.5.1의 Stop 훅 frontmatter, 배정 절차, 마무리 관문, 정적 페이지의 키트 복사, `.taste-skill/` 기록과 대체 사진 지시(2026-10-23에 확인한 v2의 lint와 브라우저 검사 지시는 2.5.0에서 교체)
- [CHANGELOG.md — GitHub, Leonxlnx/taste-skill](https://raw.githubusercontent.com/Leonxlnx/taste-skill/main/CHANGELOG.md) — 2026-11-08 확인, 2.5.0(2026-11-05)의 스크립트 교체와 2.5.1(2026-11-07)의 관문, Stop 훅, 사진 검색
- [Claude Code, Hooks reference](https://code.claude.com/docs/en/hooks) — 스킬 frontmatter 훅을 스킬 호출 뒤 세션 끝까지 유지하는 범위와 `once`
- [Nutlope/hallmark — GitHub](https://github.com/Nutlope/hallmark) — 2026-11-08 README의 대상 도구, 테마 50개, 검사 등급, 설치 경로와 요구 사항, 사진 755장의 라이선스, 영감 목록, LICENSE(MIT)
- [hallmark SKILL.md — GitHub, Nutlope/hallmark](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/SKILL.md) — 2026-11-08 확인, 2.0.0, 테마 배정과 에이전트의 선택, 기존 디자인에 쓰는 조건, 사전 점검의 `TOGETHER_API_KEY`와 `.hallmark/` 기록
- [package.json — GitHub, Nutlope/hallmark](https://github.com/Nutlope/hallmark/blob/main/package.json) — 2026-11-08 확인, 버전 2.0.0
- [Tags — GitHub, Nutlope/hallmark](https://github.com/Nutlope/hallmark/tags) — 2026-11-08 릴리스 태그 없음
- [flow.md — GitHub, Nutlope/hallmark](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/flow.md) — 편집 시점 훅의 문서 안내, 도구별 하위 에이전트와 네트워크 지원
- [comp.md — GitHub, Nutlope/hallmark](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/comp.md) — 시안 단계의 실행 조건, 프롬프트 구성과 참고용 시안
- [install-hook.mjs — GitHub, Nutlope/hallmark](https://raw.githubusercontent.com/Nutlope/hallmark/main/skills/hallmark/scripts/install-hook.mjs) — 2026-11-08 소스 확인, PostToolUse 훅의 등록 위치, `--global`과 `--remove`
- [lint-hook.mjs — GitHub, Nutlope/hallmark](https://raw.githubusercontent.com/Nutlope/hallmark/main/skills/hallmark/scripts/lint-hook.mjs) — 2026-11-08 소스 확인, 검사 대상 파일, Floor FAIL 전달과 종료 코드 0
- [imagegen.mjs — GitHub, Nutlope/hallmark](https://raw.githubusercontent.com/Nutlope/hallmark/main/skills/hallmark/scripts/imagegen.mjs) — 2026-11-08 소스 확인, Together AI 이미지 생성 API, 기본 모델과 키가 없을 때의 종료
- [theme.mjs — GitHub, Nutlope/hallmark](https://raw.githubusercontent.com/Nutlope/hallmark/main/skills/hallmark/scripts/theme.mjs) — 2026-11-08 소스 확인, 사진의 원격 주소 출력, `--save` 내려받기와 출처 문구
- [.claude-plugin — GitHub, Nutlope/hallmark](https://github.com/Nutlope/hallmark/tree/main/.claude-plugin) — plugin.json과 marketplace.json에 훅 선언 없음
- [Creative Commons, Attribution-ShareAlike 4.0 International Deed](https://creativecommons.org/licenses/by-sa/4.0/deed.en) — 출처, 라이선스 링크와 변경 표시, 동일 라이선스 배포 조건
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
- [vercel-labs/skills — GitHub](https://github.com/vercel-labs/skills) — README의 익명 사용 데이터 수집과 끄는 환경 변수(텔레메트리와 보안 감사 요청)
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
- [Colorion Text Effects — text-effects.colorion.co](https://text-effects.colorion.co) — 2026-10-26 효과 123개와 8개 범주, CSS와 에이전트용 지시문 복사, 모든 효과의 prefers-reduced-motion 준수와 MIT 표시
- [ckissi/colorion-text-effects — GitHub](https://github.com/ckissi/colorion-text-effects) — README의 색 토큰, prefers-reduced-motion 준수와 MIT 표기, LICENSE 파일과 package.json license 필드 없음
- [effectCss.ts — GitHub, ckissi/colorion-text-effects](https://github.com/ckissi/colorion-text-effects/blob/main/src/utils/effectCss.ts) — global.css의 효과 블록만 잘라 만드는 복사용 CSS, 라이선스와 출처 주석 없음, 에이전트용 지시문의 prefers-reduced-motion 요구
- [global.css — GitHub, ckissi/colorion-text-effects](https://github.com/ckissi/colorion-text-effects/blob/main/src/styles/global.css) — 효과 블록 밖의 전역 움직임 줄이기 규칙과 100~123번 블록의 개별 규칙
- [effect-data.json — Colorion Text Effects](https://text-effects.colorion.co/effect-data.json) — 2026-10-26 확인, 복사용 CSS 중 100~123번에만 prefers-reduced-motion 규칙
- [podo/design-agent-skills — GitHub](https://github.com/podo/design-agent-skills) — 2026-10-26 README의 스킬 160개(표의 라우터 6개와 구현 항목 154개, Tier 1 라우터 6개와 Tier 2 설명의 160개)와 등급별 수(합 166개), 포인터 유형별 설치 방법, 설치 프로필, 필요할 때 받는 원 스킬과 고정 불가 안내, LICENSE(MIT)
- [CHANGELOG.md — GitHub, podo/design-agent-skills](https://raw.githubusercontent.com/podo/design-agent-skills/main/CHANGELOG.md) — 2026-10-26 확인, 2.10.0의 스킬 160개와 stub 166개 언급
- [install.sh — GitHub, podo/design-agent-skills](https://raw.githubusercontent.com/podo/design-agent-skills/main/install.sh) — 2026-10-26 소스 확인, 설치는 skills 폴더 생성(`mkdir -p`)과 심볼릭 링크(`ln -s`), `update`의 재다운로드와 받은 뒤 lock 파일 해시 기록, `--frozen`
- [design-catalogue/stub.yaml — GitHub, podo/design-agent-skills](https://raw.githubusercontent.com/podo/design-agent-skills/main/skills/design-catalogue/stub.yaml) — 2026-10-26 확인, 라우터 항목의 type: router와 tier: official
- [bin/cli.mjs — GitHub, podo/design-agent-skills](https://raw.githubusercontent.com/podo/design-agent-skills/main/bin/cli.mjs) — 2026-10-26 소스 확인, `npx skills` 위임과 `--picks`, `--essentials` 설치의 `-y`
- [animate-skill 항목 — GitHub, podo/design-agent-skills](https://github.com/podo/design-agent-skills/blob/main/skills/animate-skill/SKILL.md) — `-y`를 붙인 원 스킬 설치 명령과 원 저장소 LICENSE 없음 표시
- [commands.md — GitHub, vercel-labs/skills](https://github.com/vercel-labs/skills/blob/main/docs/commands.md) — `skills add`의 `-y`(모든 확인 질문 생략)와 설치 범위
- [YushengAuggie/glimpse — GitHub](https://github.com/YushengAuggie/glimpse) — 2026-10-26 README의 설치 경로, 요구 사항, loopback 포트와 외부 전송 기능, 데몬의 전송 주소와 키 환경 변수, LICENSE(MIT)
- [bin/glimpse — GitHub, YushengAuggie/glimpse](https://raw.githubusercontent.com/YushengAuggie/glimpse/main/bin/glimpse) — 2026-10-26 소스 확인, 데몬 전송 주소와 API 키의 적용 순서
- [lib/glimpse-bridge.mjs — GitHub, YushengAuggie/glimpse](https://raw.githubusercontent.com/YushengAuggie/glimpse/main/lib/glimpse-bridge.mjs) — 2026-10-26 소스 확인, 산출물 텍스트 8000자 제한과 같은 강조 구간의 이전 질문과 답변 동봉
- [install.sh — GitHub, YushengAuggie/glimpse](https://raw.githubusercontent.com/YushengAuggie/glimpse/main/install.sh) — 2026-10-26 소스 확인, `--mcp`의 chrome-devtools-mcp 등록 명령과 `core.hooksPath` 설정
- [ChromeDevTools/chrome-devtools-mcp — GitHub](https://github.com/ChromeDevTools/chrome-devtools-mcp) — README의 기본 사용 통계 수집과 `--no-usage-statistics`, CrUX API 전송과 `--no-performance-crux`
- [MiniDev UI — ui.minidev.pro](https://ui.minidev.pro) — 2026-10-26 컴포넌트 397개, 블록 43개, 모션 108개, 템플릿 8개 표시
- [amankaushik481/minidev-ui — GitHub](https://github.com/amankaushik481/minidev-ui) — README의 shadcn 레지스트리, npm 설치와 CSS 설정, 출처 표기 불필요 안내, LICENSE(MIT)
- [minidev-ui-kit — npm](https://www.npmjs.com/package/minidev-ui-kit) — 0.6.0, peer dependency와 548개 설명
- [Kibo UI — kibo-ui.com](https://www.kibo-ui.com) — 2026-10-26 컴포넌트 41개, 블록 28개, 패턴 1101개
- [Kibo UI, Setup](https://www.kibo-ui.com/docs/setup) — Node.js와 React 18 이상, shadcn/ui CSS 변수 모드, 설치 위치
- [Kibo UI, Glimpse](https://www.kibo-ui.com/components/glimpse) — 링크 미리보기 컴포넌트
- [shadcnblocks/kibo — GitHub](https://github.com/shadcnblocks/kibo) — license.md(MIT, shadcnblocks), 옛 haydenbleasel/kibo 주소에서 이어짐
- [Acquisition (#287) — GitHub, shadcnblocks/kibo](https://github.com/shadcnblocks/kibo/commit/bf81e0ad33e39d14bfd754389fb0c7b19f49f9df) — 2025-10-29, license.md 저작권자 변경
- [gantt 레지스트리 항목 — Kibo UI](https://www.kibo-ui.com/r/gantt.json) — 2026-10-26 확인, 소스에 라이선스 주석 없음, npm 의존성 7개, 개발 의존성 1개와 shadcn 의존 항목
- [Kibo UI, Roadmap](https://www.kibo-ui.com/blocks/roadmap) — 블록 페이지의 shadcnblocks.com premium 블록 안내
- [Shadcnblocks, License](https://www.shadcnblocks.com/license) — 유료 블록에 적용되는 MIT가 아닌 상용 라이선스
- [바이브코딩 디자인 — 화면 제작 5곳 모음 — 코딩 수익화 : 투더제이 TTJ](https://www.youtube.com/watch?v=o4Cm3gqK_Es) — 2026-10-19 업로드, 세 번째 자원 목록의 출발점이며 역할, 개수와 라이선스는 공식 사이트, README와 LICENSE 원문으로 다시 확인함

## 관련 문서

- [[Claude-Design-Handoff|AI 디자인 시스템과 구현 인계]] — 디자인 시스템, 생성 UI의 기본값 수렴과 구현 인계
- [[Open-Source-License-Review|오픈소스 라이선스 검토]] — MIT 고지 보존과 외부 자산의 이용 조건
- [[Dev-Outsourcing-Engagement|개발 외주의 계약과 수주]] — 납품 인계 범위
- [[Agent-Skills|에이전트 스킬]] — 스킬 설치 경로와 신뢰 경계
- [[AI-Work-Tool-Selection|AI 업무 도구 선택]] — 레퍼런스의 참고와 복제의 구분
- [[Design-System-Lint|디자인 시스템 lint]] — shadcn 테마 토큰과 컴포넌트 계약
- [[Agent-Browser-Task-Boundaries|브라우저 에이전트의 작업과 권한 경계]] — 에이전트가 조작하는 브라우저의 계정과 데이터 범위
