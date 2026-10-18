---
tags: [palantir, osdk, global-branching, preview]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["OSDK branch context와 preview"]
---

# OSDK branch context와 preview

Developer Console global branch는 application SDK resource, Ontology definition과 source code를 같은 branch에서 개발하는 흐름이다. Git branch만 만들거나 화면 branch selector를 바꾼 것으로 runtime request가 분리된다고 보장하지 않는다. 설정이 빠지면 Main 또는 다른 branch로 read/action을 보낼 수 있다.

## 지원과 SDK synchronization

2026-10-16 기준 TypeScript SDK/npm/Vite 6/7/8 경로만 지원한다. App은 Compass Project에 있고 Main에 이미 OSDK가 있어야 하며 branch Ontology가 app Ontology와 같아야 한다. Branch에서 OSDK를 처음 추가하는 경로는 지원하지 않는다.

기존 SDK entity로 branch data만 읽을 때는 새 SDK가 필요 없지만 변경 schema/new resource를 쓰려면 branch SDK를 생성하고 npm install로 dependency를 갱신한다. Action이 수정하는 모든 object type을 branch에 index하고 완료를 기다린다. Branch action edit는 test용이며 Main으로 merge되지 않는다.

Local과 Foundry workspace 모두 실제 global branch가 만든 repository Git branch name을 checkout한다. postinstall의 osdk branch sync가 그 이름으로 latest branch SDK를 선택하고 package/lockfile을 바꾼다. Server 시작 후 branch를 바꾸면 dev server restart/install이 필요하다. Generated branch SDK version을 수동 복사해 고정하는 흐름과 다르다.

## Template upgrade와 manual 설정 모두 필요하다

Osdk-react-app-v2 template은 0.291.0 이상이 필요하고 다른 template은 각각 minimum을 확인한다. Npm dependency만 바꾸면 template check를 통과하지 못한다. Upgrade는 ci.yml/.jemma sync script를 제공하지만 existing package.json/lock/vite config를 자동 수정하지 않는다.

Client와 branch plugin은 2.77.0+, CLI는 0.104.0+가 필요하다. Postinstall에 osdk branch sync를 추가하고 root vite.config.ts의 inline plugins array에 named import branchPlugin()을 직접 호출한다. Vite .js/.mts 또는 helper로 만든 plugins array는 configuration checker가 인식하지 못한다. 기존 plugin/script는 보존한다.

설정을 repository default/master에 merge한 뒤 global branch에 추가한다. Foundry는 그 branch의 lockfile/vite/template을 검사한다. Upgrade 후 CI/lint/build 성공, branch SDK dependency와 network request의 branch query parameter(name/RID)를 확인한다. Setup 완료 주장은 실제 request target 검증과 연결한다.

## Restriction은 branch별 sandbox가 아니다

Application restriction은 모든 branch/Main이 공유한다. Non-default branch는 필요한 Ontology resource 상한에 추가할 수 있지만 제거할 수 없다. Platform Project/operation/Marking/OAuth setting은 read-only다. Main에서 unused restriction을 지우기 전 다른 SDK version/branch 사용을 확인한다.

## Embedded app은 Main 쓰기 위험을 확인한다

OSDK app 안에 다른 OSDK app을 넣는 형태는 global branch context를 상속하지 않는다. 지원 embedded 경로는 Workshop의 Bidirectional Iframe이며 custom widget 통합은 이 기능의 대상이 아니다.

Bidirectional 설정 외에도 repository 준비, client 2.77.0+, createPublicOauthClient options의 useHistory:false, explicit branch override 없음이 모두 필요하다. 미충족하면 Main으로 무경고 요청하고 action도 Main을 수정할 수 있다. 실제 browser network의 branch query RID를 확인한다.

Host branch 변경은 iframe URL의 deployed website와 bundled SDK를 바꾸지 않는다. 그 SDK와 branch schema가 호환되어야 하며 incompatible schema test는 새 SDK로 build한 별도 compatible deployment를 가리켜야 한다. Host branch 선택이 SDK regeneration/deploy를 자동 수행하지 않는다.

## Proposal preview와 production release

Proposal은 source PR과 branch-aware preview를 만들 수 있다. Hosting/config/template/check가 준비된 preview에서 branch에만 있는 data와 network branch RID를 확인해 공유한다. Global branch에서는 release tag/production publish가 막히고 proposal merge도 production website를 배포하지 않는다. Default branch에서 별도 release한다.

SDK resource rebase의 Keep this version은 해당 side의 전체 resource set을 선택한다. 일부 entity만 자동 union하는 것으로 보지 않는다. Rebase/save 후 branch SDK 재생성, install, package/lock commit과 재검증이 필요하다. Proposal check는 latest SDK resource로 생성된 SDK를 요구한다.

## 출처

- [Palantir, Branching Developer Console applications](https://www.palantir.com/docs/foundry/developer-console/branching-integration)
- [Palantir, Global Branching integrations](https://www.palantir.com/docs/foundry/global-branching/integrations)

## 관련 문서

- [[Palantir-Global-Branch-Proposals-and-Lifecycle|Approval와 branch retention]]
- [[Palantir-Application-Restrictions-and-Identity|공유되는 OAuth 상한]]
- [[Palantir-OSDK-Static-Website-Hosting|Preview와 production 배포]]
