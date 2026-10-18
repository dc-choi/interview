---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# OSDK 앱 생성, 기존 앱 추가와 패키지 설치

Developer Console app에서 사용할 Ontology/resources와 SDK generation version을 선택하고 첫 SDK를 생성한다. backend 문서는 생성 뒤 Ontology를 바꿀 수 없다는 조건을 명시한다. resources는 generated type와 app token scope 양쪽에 영향을 준다.

## TypeScript

bootstrap/기존 앱 추가 문서는 Node18 이상을 요구한다. `@osdk/create-app`의 prefilling 값은 application RID, Foundry URL, hosting URL, client ID, SDK package/registry를 구분한다. 실제 프로젝트에서는 지원 중인 Node 버전과 생성 package 요구를 다시 확인한다.

v2 생성기는 createClient/createPublicOauthClient, legacy1.x는 FoundryClient/PublicClientAuth를 출력한다. 구버전 코드가 나오면 SDK versions에서 v2를 생성하고 dependency/bootstrapping을 갱신한다.

이미 OSDK 없이 bootstrapped된 앱은 ontology RID meta tag와 모든 environment file을 추가하고 createPlatformClient→createClient(foundryUrl, ontologyRid, auth)로 바꾼다. SDK package dependency와 local `.npmrc`의 scope registry를 맞춘다. registry scope에는 `/sdk` suffix를 넣지 않는다.

`.npmrc` token placeholder는 `${FOUNDRY_TOKEN}`이며 공백이 있으면 인증 오류가 난다. token은 환경변수로 두고 저장소에 넣지 않는다. 404는 package 미존재만 아니라 다른 registry override, 401/E403은 token/인증, workspace E401은 npmjs mirror 도달성도 확인한다.

사설 CA는 NODE_EXTRA_CA_CERTS로 신뢰 chain을 추가한다. Code Repositories에서는 backing artifact repository에 dependency를 명시해야 한다. private package는 해당 artifact repository에 제공돼야 한다.

## Python과 Java

현재 Python 영어 참조는 >=3.10,<3.15(3.10~3.14)를 안내한다. pip index는 generated package의 실제 index URL을 사용하고 FOUNDRY_TOKEN을 노출하지 않는다. SSL_CERT_FILE/REQUESTS_CA_BUNDLE에 올바른 CA chain을 둔다. `--trusted-host`는 검증을 끄는 일회 진단일 뿐 운영/자동 설치 설정으로 유지하지 않는다.

Java bootstrap은 확보된 중국어 미검증 번역에서 Java17~21, Maven/Gradle의 application/generator repository와 환경변수 token을 설명한다. 현재 영어 Java runtime 지원 범위를 독립 확인한 것으로 쓰지 않는다.

## 다른 언어

Application API → SDK generation → Other languages에서 OpenAPI를 export할 수 있다. source의 name/description이 포함되며 OpenAPI generator로 client를 만들 수 있다. `any`로 표현되는 타입은 schema/format을 수동 정의해야 하므로 compile 성공만으로 의미가 보존되는 것은 아니다.

## 출처

- [Palantir, add-osdk-to-bootstrapped-repository](https://www.palantir.com/docs/foundry/ontology-sdk/add-osdk-to-bootstrapped-repository)
- [Palantir, create-a-new-osdk (미검증 기계번역 alias)](https://palantir.com/docs/kr/foundry/ontology-sdk/create-a-new-osdk/)
- [Palantir, how-to-add-to-existing-typescript](https://www.palantir.com/docs/foundry/ontology-sdk/how-to-add-to-existing-typescript)
- [Palantir, how-to-bootstrapping-typescript](https://www.palantir.com/docs/foundry/ontology-sdk/how-to-bootstrapping-typescript)
- [Palantir, how-to-bootstrapping-python](https://www.palantir.com/docs/foundry/ontology-sdk/how-to-bootstrapping-python)
- [Palantir, how-to-bootstrapping-java (미검증 기계번역 alias)](https://palantir.com/docs/zh/foundry/ontology-sdk/how-to-bootstrapping-java/)
- [Palantir, generate-osdk-for-other-languages](https://www.palantir.com/docs/foundry/ontology-sdk/generate-osdk-for-other-languages)

## 관련 문서

- [[Palantir-OSDK]]
- [[Palantir-OSDK-Authentication]]
- [[Palantir-OSDK-Compatibility]]
