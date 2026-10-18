---
tags: [palantir, osdk, package-management, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["OSDK bootstrap과 package 인증"]
---

# OSDK bootstrap과 package 인증

Generated SDK package는 app에 선택한 Ontology entity의 binding이며 platform SDK는 dataset/filesystem/admin/orchestration 등 platform API를 감싼다. SDK 설치 credential, 앱 runtime OAuth credential과 최종 data 권한을 분리한다.

## 언어별 설치와 client

2026-10-16 bootstrap 문서 기준 TypeScript는 Node 18+, Python은 3.10 이상 3.15 미만, Java OSDK는 17~21이다. Compute Module Java 예제의 21+와 같은 하나의 제품 요구사항으로 합치지 않는다. 실제 generated package의 지원 버전을 확인한다.

Npm은 app-specific registry와 scope를 .npmrc에 설정하고 FOUNDRY_TOKEN을 환경에서 주입한다. 404는 다른 registry override일 수 있으므로 project/user/global 설정과 실제 URL/token을 확인한다. 문서의 global registry 삭제 안내는 다른 프로젝트 영향도 확인한 뒤 적용한다. Certificate는 NODE_EXTRA_CA_CERTS 또는 Python SSL_CERT_FILE/REQUESTS_CA_BUNDLE로 chain을 맞춘다.

Python --trusted-host는 검증을 끄는 진단 경로이며 production/자동화의 상시 해결책이 아니다. Java는 application/generator Maven repository credential을 환경 token으로 제공한다. Token/.env/client secret을 source control에 넣지 않는다.

TypeScript create-app scaffolding은 앱 SDK의 generator version을 따른다. 새 CLI를 썼어도 OSDK1 generated package면 legacy FoundryClient/PublicClientAuth가 나올 수 있다. V2 SDK를 재생성하고 dependency/client API를 함께 옮긴다. Runtime의 createClient/createPublicOauthClient 조합과 generated package의 호환성을 확인한다.

기존 React 예제는 token 유무 조건이 뒤집힌 듯한 흐름과 refresh/login/fetch의 순서 문제가 있어 그대로 production auth controller로 쓰지 않는다. 성공한 sign-in/refresh 뒤 query, 실패 처리와 component 수명을 명시한다. Server-side confidential Next.js 예제도 auth.signIn 후 첫 page만 fetch하고 오류를 빈 배열로 숨기므로 zero results와 API failure를 구분하고 pagination을 설계한다.

Java는 UserTokenAuth 또는 ConfidentialClientAuth를 선택하고 다른 target Ontology API name은 client builder에서 override할 수 있다. 단순 override가 entity API name의 불일치를 자동 고치는 것은 아니다. Python user-token 예제도 최종 app의 OAuth identity/metrics 모델과 다를 수 있다.

## Node 버전은 CI와 개발에서 맞춘다

.nvmrc와 nvm install은 개발 runtime을 정한다. CI의 .jemma/settings.sh도 .nvmrc에서 읽도록 바꾸고 실제 lockfile/build 결과를 확인한다. 개발 기본 18.20.8과 CI 설정값이 다를 수 있으므로 .nvmrc 추가만으로 일치를 보고하지 않는다.

## Metrics는 현재 요청의 실시간 trace가 아니다

Beta application metrics는 약 24시간 지연, 최근 30일을 제공한다. 5일 이하 window는 hourly, 더 긴 window는 daily bucket이며 latency p50/p75/p95/p99를 볼 수 있다. 앱 OAuth flow 밖의 UserTokenAuth/API token 호출은 해당 application metrics에 수집되지 않는다. Metric 0건을 실제 API 사용 0건으로 단정하지 않는다.

## 출처

- [Palantir, Add OSDK to existing TypeScript application](https://www.palantir.com/docs/foundry/developer-console/how-to-add-to-existing-typescript)
- [Palantir, Bootstrap TypeScript application](https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-typescript)
- [Palantir, Bootstrap server-side TypeScript application](https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-server-side-typescript)
- [Palantir, Bootstrap Python application](https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-python)
- [Palantir, Bootstrap Java application](https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-java)
- [Palantir, Manage Node version](https://www.palantir.com/docs/foundry/developer-console/manage-node-version-in-foundry-code-repository)
- [Palantir, Application metrics](https://www.palantir.com/docs/foundry/developer-console/application-metrics)

## 관련 문서

- [[Palantir-Application-Restrictions-and-Identity|Scope와 identity]]
- [[Palantir-OSDK-Static-Website-Hosting|Frontend 배포]]
