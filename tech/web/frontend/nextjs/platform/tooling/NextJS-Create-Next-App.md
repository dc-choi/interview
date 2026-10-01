---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["create-next-app CLI 선택과 재현성", "NextJS-Create-Next-App"]
---

# create-next-app CLI 선택과 재현성

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## create-next-app

새 앱에 default template 또는 공개 GitHub example을 복사하는 CLI다. 기본 TypeScript, Tailwind, App Router와 Turbopack 선택을 시작점으로 제공하고 저장된 preferences를 재사용할 수 있다. 사용 예시는 아래와 같으며 지식 문서 작성 과정에서 실제 프로젝트 scaffold를 만들 필요는 없다.

```sh
npx create-next-app@latest catalog --ts --app --use-pnpm --eslint
```

## 옵션

| 옵션 | 역할/기본 |
| --- | --- |
| --help/-h, --version/-v | 도움말, CLI 버전 |
| --no-* | default negation, 예: --no-ts |
| --ts/--typescript, --js/--javascript | 언어 선택, TS 기본 |
| --tailwind | Tailwind 구성, 기본 선택 |
| --react-compiler | React Compiler 활성화 |
| --eslint, --biome, --no-linter | lint/format 도구 선택 |
| --app, --api | App Router 또는 Route Handler 전용 |
| --src-dir | src 아래 생성 |
| --turbopack, --webpack | package scripts의 bundler 선택 |
| --import-alias | alias 설정, 기본 @/* |
| --empty | 빈 template |
| --use-npm/--use-pnpm/--use-yarn/--use-bun | package manager 명시 |
| --example/-e | official example 이름 또는 public GitHub URL |
| --example-path | repository 내 example 경로 분리 |
| --reset-preferences | 저장된 preferences 초기화 |
| --skip-install | package installation 생략 |
| --disable-git | Git 초기화 생략 |
| --agents-md | AGENTS.md/CLAUDE.md 포함, 현재 기본 |
| --yes | 저장된 preference 또는 defaults 사용 |

## template와 example

interactive prompt의 recommended defaults는 CLI 버전과 이전 preference에 따라 달라질 수 있다. CI와 팀 template에서는 version, flags, package manager를 명시하고 생성 결과 package.json/config를 확인한다. --yes는 모든 설정을 내가 선택한 값으로 고정한다는 의미가 아니다.

public GitHub example은 app뿐 아니라 scripts/dependencies를 포함하므로 source와 installation steps를 검토한다. branch path에 slash가 있으면 example-path로 repository와 directory 해석을 분리한다. --skip-install 사용 뒤에는 lockfile과 실제 dependency 설치를 별도로 수행한다.

## linter 선택

ESLint는 Next-specific plugin rules를 제공하고 Biome은 통합 lint/format과 React/Next domain 지원을 제공한다. no-linter는 검사 도구를 생성하지 않는 선택이다. 어떤 것을 선택해도 type checking, tests, security와 production build를 대체하지 않는다.

## 대화형 선택과 example 명령

기본 prompt는 project name 뒤 recommended defaults(TypeScript, ESLint, Tailwind, App Router, AGENTS.md), previous settings 재사용, customize 세 선택을 제시한다. customize는 언어, ESLint/Biome/None, React Compiler, Tailwind, src, App Router, alias 및 agent 지침 포함 여부를 차례로 정한다. 설정 뒤 project 이름 폴더를 만들고 의존성을 설치한다. 공식 example은 npx create-next-app@latest --example [example-name] [project-name], 공개 repo는 --example https://github.com/.../ [project-name]이다. example 목록과 설치 지침은 Next.js repository examples에서 확인한다.

## 출처

- [Next.js, app/api-reference/cli/create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app)
- [Next.js, pages/api-reference/cli/create-next-app](https://nextjs.org/docs/pages/api-reference/cli/create-next-app)

## 관련 문서

- [[NextJS-ESLint]]
- [[NextJS-CLI]]
