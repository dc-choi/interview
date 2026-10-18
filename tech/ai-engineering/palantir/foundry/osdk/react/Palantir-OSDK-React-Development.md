---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# OSDK React의 provider, 개발과 hosting

React 앱은 OSDK client와 OsdkProvider를 root에 두고 useOsdkClient로 접근한다. @osdk/react는 typed hook, normalized shared cache, Action validation/optimistic update와 관련 객체 동기화를 제공한다. @osdk/react-components는 그 위에 table/filter/action form/media viewer를 구성하고 CSS custom property/layer로 theme을 조정한다.

이 일반 library 기능과 아래 advanced To-do 예제의 custom SWR hook 동작을 동일하게 취급하지 않는다. 실제 library hook 옵션과 install/provider는 문서가 링크한 공식 React guide/Storybook을 현재 version에 맞춰 확인한다.

## bootstrap와 환경

Developer Console의 client-facing app과 Code Repository를 만들면 React/auth/OSDK template을 얻는다. Workspace에서 lint/test/build를 확인한 뒤 release tag와 checks를 거쳐 hosting version을 배포하는 절차다. 이 문서는 실제 repository 생성, tag/push나 배포를 실행한 기록이 아니다.

routing은 BASE_URL basename과 `/auth/callback`을 맞춘다. `.env`, development/production/code-workspaces의 Foundry URL/client ID/ontology RID/redirect를 HTML meta에 넣어 client가 읽는 예제다. HTML/meta/VITE 값은 browser에 공개되므로 secret을 숨기는 저장소가 아니다.

workspace 임시 CSP는 해당 사용자에게만 적용되고 pause/restart 때 만료한다. production Developer Console CSP를 별도로 반영해야 한다. 외부 resource 실패는 CSP와 CORS, source 권한을 나눠 진단한다.

## PR preview와 package

PR preview Beta는 Foundry code repository와 Developer Console web hosting 조건이다. PR 생성 후7일 내 preview가 유효하다는 문서 조건을 확인한다. app Owner/Editor와 hosted-website Viewer 공유를 구별하고 preview에서 production data를 호출하는 권한도 별도로 본다.

Code Repositories package는 backing artifact repository에 명시돼야 한다. generated SDK repository, common OSDK bundle과 npmjs mirror를 구별한다. npm E401은 mirror network 실패일 수도 있으므로 password만 바꾸지 않는다. lockfile/node_modules 삭제는 source가 제시한 복구 선택지이며 재현 가능한 version 보존을 고려해 필요한 범위에서 판단한다.

## advanced 예제 구조

예제는 data-service hook과 presentation UI를 나누고 project의 derived task count를 server에서 계산한다. 인터페이스 OsdkITask와 coding/learning concrete type을 쓰고 metadata로 display name을 표시한다. underlying concrete properties를 미리 포함하면 `$as`로 바꿀 때 별도 fetch를 줄일 수 있다.

media/reference handling, user batch cache와 subscription은 실제 예제 구현/한계를 함께 읽는다. metadata가 바뀐다고 모든 frontend가 코드 변경 없이 새로운 task type/field를 처리하는 것은 아니다.

## 출처

- [Palantir, ontology-sdk-react-applications](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications)
- [Palantir, overview](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/overview)
- [Palantir, development](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/development)
- [Palantir, troubleshooting](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/troubleshooting)
- [Palantir, osdk-react](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/osdk-react)
- [Palantir, osdk-react-components](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/osdk-react-components)
- [Palantir, advanced-todo-application-overview](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/advanced-todo-application-overview)
- [Palantir, advanced-todo-application-architecture](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/advanced-todo-application-architecture)

## 관련 문서

- [[Palantir-OSDK-React]]
- [[Palantir-OSDK-Hosting]]
- [[Palantir-OSDK-React-Task-Cache]]
