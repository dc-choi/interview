---
tags: [palantir, custom-endpoints, api, release-management]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Custom endpoint release 계약"]
---

# Custom endpoint release 계약

Custom Endpoints는 Ontology function/action에 HTTP route와 request/response shape를 연결하는 관리형 API 계층이다. 기존 기업 API 규약에 맞추기 위한 middleware 역할을 플랫폼에서 구성한다. Beta 기능으로 enrollment 지원과 실제 configuration 가능 범위를 확인한다.

## Endpoint definition과 권한

Endpoint set은 관련 definition을 묶는 Compass resource이며 parent Project/folder 권한을 상속한다. 개발자의 view/edit/publish/deploy 권한과 API caller의 backing Ontology operation 실행 권한을 구분한다.

Definition은 GET/POST/PUT/DELETE/PATCH와 path/query/header/body를 underlying function/action parameter에 매핑한다. Optional parameter도 모두 매핑해야 하며 일부 JSON parameter는 requestBody에만 연결할 수 있다. Body shape는 POST/PUT/PATCH/DELETE에서 구성한다. 정의 저장만으로 endpoint가 노출되지는 않는다.

기업 URL에 맞춘 GET remapping 예제를 side effect가 있는 모든 action에 GET을 사용해도 된다는 API 설계 권장으로 해석하지 않는다. 실제 backing operation의 읽기/쓰기 의미, cache/retry와 consumer의 호출 계약을 함께 검토한다.

## Publish, deploy와 routing version

Publish는 현재 set의 immutable semantic-version snapshot을 만든다. Release는 수정하지 못하지만 삭제할 수 있다. Publish와 deploy는 별도이며 Tag without deploying이면 endpoint가 accessible해지지 않는다.

Endpoint set의 Overview에서 subdomain을 요청하고 enrollment administrator 승인 후 Domain ready를 확인한다. Set마다 연결된 subdomain이 필요하며 Control Panel에서 독립적으로 만든 standalone subdomain을 그대로 쓰는 경로는 지원하지 않는다. 대기 중에도 definition 구성/test를 준비할 수 있다.

여러 release를 같은 subdomain에 동시에 deploy할 수 있다. Caller는 `endpoint-api-version` header로 deployed version을 선택하며 없으면 latest deployed로 간다. 안정적인 consumer는 version selection을 명시하고 새 release deploy가 header 없는 caller를 바꾸는 영향을 확인한다. 최신 published와 최신 deployed는 다를 수 있다.

## API 통합은 별도 인증과 backing 접근을 요구한다

2026-10-16 기준 custom endpoint 통합은 Developer Console의 unrestricted application만 지원한다. Restricted application 지원을 전제하지 않는다. 동시에 backing function/action resource 접근을 설정해야 하므로 unrestricted라는 이름을 모든 resource 접근 허가로 읽지 않는다. 현재 앱 유형과 resource configuration UI에서 실제 권한을 확인한다.

승인 subdomain에 publish/deploy한 뒤 Versions의 example request와 설정을 검토하고 token을 사용해 호출한다. Version별 path/parameter/output과 negative authorization을 확인한다. Consumer Public Application의 unauthenticated proxy나 Compute Module의 OpenAPI server integration과 별도 기능이며 해당 제약을 섞지 않는다.

## 출처

- [Palantir, Custom Endpoints](https://www.palantir.com/docs/foundry/custom-endpoints)
- [Palantir, Core concepts](https://www.palantir.com/docs/foundry/custom-endpoints/core-concepts)
- [Palantir, Create an endpoint set](https://www.palantir.com/docs/foundry/custom-endpoints/create-endpoint-set)
- [Palantir, Define custom endpoints](https://www.palantir.com/docs/foundry/custom-endpoints/define-endpoints)
- [Palantir, Publish and deploy](https://www.palantir.com/docs/foundry/custom-endpoints/publish)
- [Palantir, Use custom endpoints](https://www.palantir.com/docs/foundry/custom-endpoints/use-custom-endpoints)

## 관련 문서

- [[Palantir-Consumer-Identity-and-Application-Models|OAuth app과 service identity]]
- [[Palantir-Compute-Function-Schemas-and-Clients|Compute OpenAPI integration]]
- [[Palantir-Public-Applications-and-Export-Boundaries|Unauthenticated public proxy]]
