---
tags: [nextjs, migration, upgrade]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js migration과 version upgrade의 순서"]
---

# Next.js migration과 version upgrade의 순서

## 두 종류의 변경을 나누기

migration은 기존 CRA/Vite SPA 또는 Pages Router의 구조를 Next/App Router로 옮기는 일이다. upgrade는 이미 사용하는 Next 버전의 변경 계약을 적용하는 일이다. Next package를 올렸다고 Pages를 반드시 App으로 바꿔야 하는 것은 아니다. 반대로 App folder를 만들었다고 모든 React code가 Server Component로 안전하게 옮겨지는 것도 아니다.

공식 migration index는 Pages→App, CRA→Next, Vite→Next의 경로를 안내한다. upgrading index는 codemods와14/15/16의 release별 변경을 안내한다. index 자체에는 별도 runtime 계약이 없으므로 실제 상세 guide와 설치 버전의 API 문서로 판단한다.

## baseline, 기계 변경, 의미 변경

먼저 현재 Next/React/Node/TypeScript 버전과 bundler, hosting 방식(static/server), route 목록, auth/API, metadata, CSS, image/font, tests, CI 명령을 확인한다. 동작하는 baseline build와 주요 UI 흐름이 있어야 바뀐 원인을 구별할 수 있다. 이 문서의 명령은 실제 project 작업 승인이 아니라 절차 예시다.

1. target version과 version-matched docs를 정한다. 옛 guide의 latest 명령을 과거 major pin으로 오해하지 않는다.
2. package/lockfile과 기계적으로 바꿀 import/file/config를 codemod로 적용한다.
3. diff를 읽어 unresolved marker, auth/cache/rendering 의미 변경을 직접 수정한다.
4. lint/type/build뿐 아니라 direct load, client navigation, form/Action, cookies, error/redirect와 배포 형태를 검증한다.
5. baseline와 비교한 결과를 기록하고 obsolete 파일은 callers와 rollout 상태를 확인한 뒤 제거한다.

route별 점진 전환은 provider/style/data ownership을 나누어 수행한다. 한 번에 framework version, router, cache model, CSS system, auth를 모두 바꾸면 한 실패의 원인을 구별하기 어렵다. 순서는 실제 필요와 dependency에 맞춰 결정한다.

## 현재와 역사적 guide 읽기

Next14 guide의 Node18.17/React18, Next15의 temporary synchronous Request API, Next13 migration의 fetch force-cache 기본은 당시의 계약이다. Next16의 최소 Node20.9와 async-only Request API,16.3 Cache Components/Partial Prefetching 계약에 그대로 적용하지 않는다.

React19 peer dependency를 ignore하는 역사적 안내를 현재 package conflict 해결의 기본으로 삼지 않는다. 불일치 package의 실제 support range를 확인한다. tool의 success code나 codemod 파일 수만으로 app behavior가 그대로라는 결론을 내리지 않는다.

## AI agent와 설치 버전의 문서

Next16 upgrade guide는 editing 전에 AGENTS.md가 설치 버전에 맞는 docs를 가리키도록 하라고 안내한다.16.2+의 bundled docs는 node_modules/next/dist/docs이며 monorepo에서는 AGENTS 위치에서 해당 package를 실제로 resolve해야 한다. agents-md codemod는 관리 block을 작성할 수 있고 next dev가 block을 다시 생성할 수 있다.

upgrade 뒤에도 docs pointer를 다시 확인한다. pre-upgrade .next-docs가 있다면 모든 reference가 bundled docs로 옮겨졌는지 확인한 뒤 제거한다. 관리 block의 framework 안내와 project/user의 기존 지침은 각각의 범위를 존중한다.

16.3+ Turbopack 환경의 next-dev-loop skill이 있으면 dev indicator, browser/server logs와 핵심 interactive states를 반복 확인하는 runtime workflow에 사용할 수 있다. tool이 없으면 next dev, browser, production build의 실제 관찰로 보완하고 확인하지 못한 환경은 분리해 기록한다.

## upgrade agent에 전달할 실행 조건

다음은 실제 프로젝트에 맞게 재작성해서 전달할 prompt 예제다. 이 학습 노트 자체가 다른 저장소 변경을 승인하지는 않는다.

```text
이 앱을 Next.js 16으로 업그레이드한다.
편집 전에 AGENTS.md가 설치 버전 문서를 가리키는지 확인하고 지침과 공식 upgrade guide를 읽는다.
계획을 짧게 설명한 후 codemod와 package upgrade를 적용하고 diff를 검토한다.
프로젝트별 판단, 파괴적 변경, 누락된 자격 증명/환경 또는 불명확한 변환은 별도로 확인한다.
업그레이드 범위를 유지하고 관련 검사와 후속 breaking change를 수정한다.
Next 16.3+ Turbopack의 next-dev-loop가 있으면 사용한다.
없으면 next dev, browser, build로 핵심 interactive state, dev indicator와 browser/server log를 확인한다.
완료 전에 AGENTS.md의 bundled docs pointer를 다시 확인한다.
변경점, 검증 결과와 미검증 범위를 보고한다.
```

```bash
npx @next/codemod@canary agents-md
```

AGENTS의 관리 block은 BEGIN:nextjs-agent-rules / END:nextjs-agent-rules marker로 구분한다. 버전의 API/convention/file structure가 기존 지식과 다를 수 있으므로 편집 전 bundled guide와 deprecation을 읽으라는 계약이다. 경로는 AGENTS 위치에서 resolve하고 monorepo root에서 next package가 보이는지 확인한다. block은 next dev가 작성/복원하며 구현 위치는 `node_modules/next/dist/server/lib/generate-agent-files.js`다. 단순히 diff에서 제거하면 uncommitted 변경이 다시 생길 수 있으므로 프로젝트 정책에 맞게 관리한다.

수동 흐름은 agent docs 준비, upgrade codemod(또는 수동 설치), breaking change 확인과 검사 순서다. upgrade codemod가 async Request API까지 모두 수행하지 않으므로 sync compatibility 사용이 남아 있으면 next-async-request-api도 적용한다.

## 이해 확인

1. Next version upgrade와 App Router migration을 함께 강제할 이유가 있는가?
2. source가 latest를 쓰는데 guide 제목이 version15이면 실제 설치 major는 어떻게 확인하는가?
3. build pass만으로 form/auth/cache가 보존되었다고 말할 수 없는 이유는?

## 출처

- [Next.js, migrating](https://nextjs.org/docs/app/guides/migrating)
- [Next.js, upgrading](https://nextjs.org/docs/app/guides/upgrading)

## 관련 문서

- [[NextJS-Pages-to-App-Migration]]
- [[NextJS-SPA-to-App-Migration]]
- [[NextJS-Codemods]]
- [[NextJS-Upgrade-14-and-15]]
- [[NextJS-Upgrade-16]]
