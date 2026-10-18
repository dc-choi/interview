---
tags: [palantir, public-applications, ontology, security]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Public Applications 공개와 export 경계"]
---

# Public Applications 공개와 export 경계

Public Application은 login 없는 Foundry-hosted static website와 선택적으로 제한된 unauthenticated Ontology API proxy를 제공한다. 브라우저 OSDK의 요청은 Foundry proxy가 application service user로 인증하며 사용자에게 Foundry token을 전달하지 않는다. 접근 가능한 URL과 ingress 범위의 누구나 사용할 수 있다.

## 공개 API scope는 export 결정이다

Static website만 공개하거나 website와 API proxy를 함께 공개할 수 있다. API를 켜면 scope에 저장한 resource는 인증 없이 접근 가능한 대상이 된다. App resource restriction과 service user 가시성이 최대 노출 범위를 정한다. Resource를 추가하려면 해당 resource의 모든 Marking과 Organization Marking을 해제할 권한이 있어야 한다.

Resource마다 공개 가능한지 판단한다. UUID처럼 추측하기 어려운 URL identifier는 우발적 발견을 줄이는 수단이며 identity-based authorization이 아니다. 최종 사용자의 개별 신원이 없으므로 개인별 접근 제어나 누가 제출했는지에 대한 강한 attribution이 필요한 흐름에 그대로 쓰지 않는다.

## 지원 operation은 제한적이다

| Operation | 확인된 경계 |
|---|---|
| Ontology full/subset metadata | 정해진 metadata 조회 |
| Apply Action | non-function-backed만 가능, batch/webhook 불가 |
| Load Object Set | 여러 object, PK 단건, linked object 로드. SearchAround/FilteredObjectSets/orderBy 불가 |

Functions/query/function-backed actions, search/aggregation, 복잡한 search-around와 derived property, interface, attachment/media upload/download, time-series streaming은 지원하지 않는다. 일반 platform administration/model/schedule/chatbot API도 호출할 수 없다. OSDK를 넣었다는 이유로 모든 OSDK operation이 공개 proxy에서 동작하지 않는다.

Public dashboard 개념의 known dimension filter도 금지된 server-side FilteredObjectSets/search operation을 호출해 구현할 수 있다는 의미가 아니다. 공개할 precomputed data와 지원 operation을 먼저 설계한다. 무거운 작업은 non-function action으로 제출을 기록한 뒤 Foundry 내부 Automate에서 통제된 주기로 처리하는 패턴을 고려한다.

## 보호와 승인 경계

Unauthenticated traffic은 인증 치환 전에 application별 rate limit을 거치며 enrollment WAF/ingress 정책을 따른다. Default 보호는 개발자가 임의로 구성하지 못한다. 개별 application ingress configuration이 제공될 수 있으므로 public이라는 이름만으로 전 세계에서 접근 가능하다고 단정하지 않는다.

각 application은 Information Security Officer의 use-case review와 subdomain approval이 필요하다. 두 승인을 같은 역할이 수행하더라도 목적은 구분한다. Scope, 공개 audience와 위험 완화 근거를 준비하고 unauthenticated static hosting/API proxy 중 무엇을 켜는지 approval form에서 확인한다. 일반 subdomain approval만으로 모든 데이터 공개 판단이 끝나지 않는다.

Developer Console에서 Public application을 생성하고 domain과 optional API를 신청한다. 승인 후 Provisioning에서 Domain ready가 되는지 확인하고, 허용 resource 변경을 review/save한다. Authless code template으로 linked repository를 만들고 build 후 private browser에서 login 없이 접속되는지 검증한다. 이는 실제 배포를 수행했다는 기록이 아니다.

Enrollment 지원과 exception은 Support 확인이 필요하다. 더 넓은 observability/rate-limit 보호 후 기능을 확장한다는 roadmap을 현행 기능으로 쓰지 않는다. 이 경계는 2026-10-16 공식 문서 확인 기준이다.

## 출처

- [Palantir, What are Public Applications?](https://www.palantir.com/docs/foundry/consumer-mode/public-application-overview)
- [Palantir, Set up a Public Application](https://www.palantir.com/docs/foundry/consumer-mode/public-application-setup)
- [Palantir, Currently supported features](https://www.palantir.com/docs/foundry/consumer-mode/public-application-supported-features)

## 관련 문서

- [[Palantir-Consumer-Identity-and-Application-Models|사용자와 service identity]]
- [[Palantir-Automate-Conditions-and-Scheduling|비동기 후속 처리]]
- [[Palantir-Approval-Request-Lifecycle|승인 lifecycle]]
