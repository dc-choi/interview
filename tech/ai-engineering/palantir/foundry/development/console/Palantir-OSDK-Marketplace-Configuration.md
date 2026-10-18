---
tags: [palantir, osdk, marketplace, deployment]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["OSDK Marketplace configuration"]
---

# OSDK Marketplace configuration

Developer Console application packaging은 metadata/OAuth client/restrictions와 website asset을 배포한다. Source-code packaging은 repository template을 전달하는 경로다. Production/Singleton은 app packaging, 새 destination app과 코드를 만들 목적은 source template과 비교한다.

## 배포 artifact를 먼저 확인한다

App은 최신 deployed asset을 기본 package하고 없으면 latest undeployed asset을 사용한다. 변경한 website를 source에서 deploy한 뒤 product version을 만들어야 기대한 asset이 들어간다. App과 source를 모두 묶어도 production installed website는 packaged asset을 따르므로 설치 source를 수정했다고 live website가 바뀌지 않는다.

Destination에서는 Developer Console resource/OAuth를 만들고 subdomain approval이 별도로 필요하다. Confidential client secret은 package하지 않아 설치 후 destination에서 새 secret을 생성하고 backend에 주입한다. Standalone OAuth client와 version-pinned function은 이 packaging 경로의 지원 대상이 아니다. Function은 latest를 사용해야 한다.

## Runtime configuration과 entity API name을 구분한다

Foundry URL/client ID/redirect/Ontology RID/API name 같은 application parameter는 index.html meta tag를 읽는 구조여야 target 값으로 remap된다. Create-app 2.1.3+ 등의 template은 이를 기본 지원하지만 오래된 code는 client 초기화를 meta tag 기반으로 바꿔야 한다. Bundled JS 안에 원본 값을 고정하면 자동 치환을 보장하지 않는다.

Object/action 같은 entity API name은 자동 remap되지 않는다. Bootstrap collision의 suffix/prefix가 generated OSDK code와 어긋날 수 있으므로 source API name 보존 옵션과 target collision을 확인한다. App parameter의 Ontology API name remap과 entity API name remap을 같은 기능으로 보지 않는다.

같은 concrete entity를 배포하면 namespace를 가진 API name과 Singleton 또는 별도 space/Ontology를 고려한다. 서로 다른 implementation을 같은 구조로 처리해야 하면 interface를 product contract로 삼을 수 있다. 동일 entity의 이름을 수동 변경할 때는 기존 caller를 조사한다. Interface를 쓰더라도 배포된 interface API name과 실제 implementation 계약이 맞아야 한다.

## Source template은 compiled website와 다른 경로다

일반 source packaging은 environment parameter를 source code에서 자동 바꾸지 않는다. Experimental templating은 {{variable}}를 install-time input으로 바꾸지만 JSX inline style의 double brace도 template으로 오인한다. Codebase를 대조하고 reserved variable의 허용 file/값을 따른다.

Reserved 값은 Foundry hostname/client ID/app package/app RID/repository RID/Ontology RID다. Package name에는 @ 또는 끝의 /sdk를 넣지 않고 SDK version은 latest 또는 0.1.0이어야 template 초기 흐름과 맞는다. 이런 placeholder code는 설치 전 type check에 실패할 수 있어 같은 package에 compiled website asset을 묶는 경로와 호환되지 않는다.

복잡한 entity name substitution보다 product input mapping으로 대상 resource를 명시하는 방식을 비교한다. Application Compass migration도 이전 설치본에 자동 전파되지 않으므로 installation마다 permission/location 상태를 검증한다.

## 출처

- [Palantir, Install Developer Console application with Marketplace](https://www.palantir.com/docs/foundry/developer-console/marketplace-installation)
- [Palantir, Bootstrap server-side TypeScript application](https://www.palantir.com/docs/foundry/developer-console/how-to-bootstrapping-server-side-typescript)
- [Palantir, Permissions](https://www.palantir.com/docs/foundry/developer-console/permissions)

## 관련 문서

- [[Palantir-OSDK-Static-Website-Hosting|배포 asset]]
- [[Palantir-Developer-Application-Permissions-and-Migration|설치별 권한 migration]]
- [[Palantir-Custom-Widget-Development-and-Distribution|Widget product 배포]]
