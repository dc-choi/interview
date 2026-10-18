---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["SuperRepo bundle과 배포의 완료 조건"]
---

# SuperRepo bundle과 배포의 완료 조건

## 산출물을 만드는 단계

단일 product의 bundle은 semantic project version으로 reproducible Marketplace artifact를 만든다. 여러 product는 각 bundle name과 component, osdkOutput, apiNamespace를 선언하고 명령마다 --product를 지정한다. includeInBundle 기본 true이며 false로 제외할 수 있다.

다중 product는 product별 bundle product를 실행해 build/<name>/blockset.zip을 만들고 bundle store로 build/store.zip을 모은다. 제품별 version을 독립적으로 줄 수 있다. 단일 bundle 명령은 다중 product에서 실패하며 deploy는 bundle을 암묵적으로 만들지 않는다. 빠진 product artifact도 store 조립을 실패시킨다.

Component를 이동하면 path만이 아니라 import metadata와 osdkOutput 경로도 바뀐다. Node dependency 설치는 run-with-auth로 credential 환경을 제공해야 하며 직접 orchestration을 바꾸더라도 이 경계를 유지한다.

## 설치와 웹 공개는 다르다

env.yml은 input mapping, namespace/project/domain과 선택적 store를 정한다. 내부 CI의 semantic tag는 build/release/deploy를 트리거하며, 외부 CI는 DevOps 발행 권한 credential을 요구한다. 두 경로가 같은 env.yml을 사용한다.

Marketplace 설치 성공 뒤에도 Developer Console의 domain 승인과 최신 website asset의 production deployment가 필요할 수 있다. Tag 생성, CI 통과, bundle 업로드, 설치와 사용자 URL의 도달 가능성을 한 상태로 보고하지 않는다.

CSP additions는 APP이 있는 product별 설정이며 preview proxy와 달리 배포 website의 외부 origin 허용을 정한다. connect/frame/img/media/script/style/font/frame-ancestors 등 허용 directive를 정확히 지정한다.

## 도구와 repository의 수명

CLI installer에 쓰는 token/FOUNDRY_URL과 설치 뒤 foundry login credential은 다르다. Installer token을 폐기해도 로그인한 CLI 자체가 자동 무효화되는 것은 아니다. In-platform 설치 흐름은 더 제한된 설치 token을 제공한다고 명시한다.

Scaffold template은 생성 후 managed upgrade되지 않는다. Repository dependency/build/config/generated file 유지보수는 소유자의 책임이며 CLI self update만으로 template 전체가 갱신되지 않는다. 문서의 minCliVersion/runtime 예시는 고정된 현재 최신 버전 주장으로 사용하지 않았다. 실제 artifact 생성이나 배포는 수행하지 않았다.

## 출처

- [Palantir superrepo, superrepo](https://www.palantir.com/docs/foundry/superrepo)
- [Palantir superrepo, advanced-workflows](https://www.palantir.com/docs/foundry/superrepo/advanced-workflows)
- [Palantir superrepo, core-concepts](https://www.palantir.com/docs/foundry/superrepo/core-concepts)
- [Palantir superrepo, create-a-superrepo](https://www.palantir.com/docs/foundry/superrepo/create-a-superrepo)
- [Palantir superrepo, faq](https://www.palantir.com/docs/foundry/superrepo/faq)
- [Palantir superrepo, foundry-cli](https://www.palantir.com/docs/foundry/superrepo/foundry-cli)
- [Palantir superrepo, in-development](https://www.palantir.com/docs/foundry/superrepo/in-development)
- [Palantir superrepo, overview](https://www.palantir.com/docs/foundry/superrepo/overview)
- [Palantir superrepo, prepare-first-deploy](https://www.palantir.com/docs/foundry/superrepo/prepare-first-deploy)
- [Palantir superrepo, tutorial-develop-with-a-superrepo](https://www.palantir.com/docs/foundry/superrepo/tutorial-develop-with-a-superrepo)

## 관련 문서

- [[Palantir-Developer-Tools]]
