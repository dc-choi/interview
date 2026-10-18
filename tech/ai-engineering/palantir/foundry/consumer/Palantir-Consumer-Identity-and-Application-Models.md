---
tags: [palantir, consumer-mode, oauth, authorization]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Consumer application 인증 주체"]
---

# Consumer application 인증 주체

Consumer mode는 외부 사용자에게 특정 application과 필요한 resource만 제공하도록 Foundry를 구성하는 방식이다. 하나의 제품 switch보다 application/role/API/organization visibility와 login UX의 조합에 가깝다.

| 구성 | 호스팅과 인증 | 권한 책임 |
|---|---|---|
| In-platform | Workshop/Slate/Carbon, Foundry login | 소비자 사용자 권한과 플랫폼 접근 제한 |
| Foundry-hosted OAuth | Foundry subdomain의 pro-code OSDK, authorization grant | public client와 개별 사용자 권한, OAuth restrictions/scopes |
| Client credentials | 외부 backend hosting, client ID/secret | 서비스 계정 권한, 외부 앱의 인증/인가 구현 |
| Public Application | Foundry subdomain, 사용자 login 없음 | 제약된 unauthenticated proxy와 서비스 계정, 공개 승인 |

개별 사용자마다 다른 data scope가 필요하면 사용자 권한 모델과 비교한다. Client credentials는 모든 호출을 같은 service user로 수행하므로 외부 앱이 사용자와 tenant별 인가를 책임진다. Foundry에 개인 사용자가 로그인하지 않는 것과 외부 앱 자체의 login이 불필요하다는 것은 다르다.

## Client credentials는 backend credential이다

Developer Console에서 Backend service/Application permissions를 선택하면 service user가 만들어진다. Secret은 생성 시 한 번만 보이므로 안전하게 보관하고 공개 frontend/source에 넣지 않는다. 노출되면 회전한다. 기본 service user에는 resource 접근이 없으며 필요한 Project/object type/action/dataset과 API operation 권한을 부여해야 한다.

앱 restriction은 permission grant와 별개 상한이다. Unrestricted는 생성 후 OAuth & restrictions에서 선택할 수 있지만 모든 앱에 필수인 설정으로 보지 않는다. 필요한 predefined Project/operation 범위로 충분한지 먼저 확인한다. Scope, restriction과 service user 권한을 모두 대조하고 실제 token 발급과 API 호출을 나눠 검증한다.

403이나 resource not found는 credential 실패와 resource 접근 실패를 구분해 조사한다. 소비자가 호출한 backend token의 유효성만 확인하고 data authorization을 생략하지 않는다. Client credentials만 쓰는 경우 Foundry 사용자용 consumer organization setup은 생략할 수 있다.

## Foundry-hosted OAuth는 사용자별 접근이다

Frontend OSDK app을 public client로 구성하고 application restriction을 정한 뒤 subdomain에 배포한다. Consumer group에 deployed website 접근을 주는 것과 앱이 사용하는 모든 resource 접근을 주는 것은 별도다. Check Access에서 둘 다 확인하고 requested OAuth scopes도 맞춘다.

Default IDP host redirect와 다중 IDP의 `?_realm=<realmId>`는 login 화면 반복을 줄이는 UX 설정이다. 권한을 추가하거나 인증 없이 실행하게 하는 설정이 아니다. Consumer 플랫폼 관리 수용량 안내는 사용자 500,000+와 신규 5,000명/시간, 기본 organization 5개이며 계약/환경 검증 없이 무제한 또는 SLA로 해석하지 않는다. 외부 client credentials도 API limits를 따른다.

## 출처

- [Palantir, Consumer mode](https://www.palantir.com/docs/foundry/consumer-mode)
- [Palantir, Client credentials applications](https://www.palantir.com/docs/foundry/consumer-mode/client-credentials-setup)
- [Palantir, Foundry-hosted OAuth applications](https://www.palantir.com/docs/foundry/consumer-mode/oauth-application-setup)

## 관련 문서

- [[Palantir-Consumer-Isolation-and-Release|Organization 격리와 role]]
- [[Palantir-Public-Applications-and-Export-Boundaries|공개 proxy의 제한]]
- [[Palantir-Compute-Execution-and-Identity|Compute application service user]]
