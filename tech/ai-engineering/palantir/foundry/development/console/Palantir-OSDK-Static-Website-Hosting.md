---
tags: [palantir, osdk, hosting, csp]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["OSDK static website hosting"]
---

# OSDK static website hosting

Developer Console website hosting은 HTML/CSS/JavaScript 등 static assets만 실행한다. Backend server/SSR를 실행하지 않는다. Client-facing public client에서만 사용할 수 있으며 같은 app을 Backend service로도 설정해 confidential client가 되면 hosting option이 나타나지 않는다.

## Asset upload와 production 전환

Production build content를 ZIP root에 두고 dist 같은 바깥 folder는 포함하지 않는다. 기본 limit은 1,000 files/20MB다. Upload 후 Preview와 Deploy to production은 별도이며 production 선택은 모든 사용자에게 그 version을 제공한다.

일부 enrollment는 asynchronous asset/vulnerability scanning을 요구한다. site.uploadOnly=true면 upload만 하고 scan 완료 후 배포할 수 있다. 기본 false에서는 upload 성공 후 즉시 deploy 시도가 실패해 tag check가 failed일 수 있다. Failed tag만 보고 upload도 실패했다고 단정하지 않는다. Initial ScanningInProgress는 scan 상태와 완료를 확인한 뒤 재배포한다.

## Domain 승인과 환경 설정

Subdomain request는 제출 후 이름 수정이 안 되므로 cancel/close 후 재신청한다. ISO 승인 뒤 Domain ready까지 기다린다. Custom domain은 사전에 certificate가 있어야 하고 DNS도 Foundry 환경으로 설정해야 한다. Login한 domain의 ingress/auth provider 설정이 custom domain에 연결되며, custom domain 아래 subdomain을 신청하려면 그 domain으로 login해야 한다.

외부 관리 domain, air-gapped, IL5/FedRAMP 등 환경은 wildcard DNS/TLS/network ingress/지원 enablement를 별도 조정할 수 있다. UI만으로 모든 enrollment의 hosting availability를 전제하지 않고 support-status/configuration을 확인한다.

App runtime의 redirect와 Developer Console allowed redirect를 같은 HTTPS callback으로 맞춘다. HTTP를 자동 HTTPS로 올려 주지 않는다. Website View와 backing data 권한은 별도이며 legacy Share hosted website 절차와 Compass custom website-only role을 구분한다. Public Application은 별도 unauthenticated 구성이다.

## Routing과 browser policy

404.html이 없으면 unmatched path를 root index.html로 보내 SPA routing을 지원한다. Root에 404.html을 두면 이 fallback이 꺼진다. file.html은 /file와 /file/ 모두 대응할 수 있지만 both.html과 both/index.html이 있으면 /both와 /both/가 서로 다른 file로 간다. Canonical route로 자동 redirect하지 않는다.

CSP는 default에 추가 rule을 merge하며 field validation이 없다. 이미지/외부 call/Wasm 등 필요한 directive만 추가하고 배포 후 실제 browser policy를 확인한다. Custom widget의 고정 CSP와 다른 기능이다.

Microfrontend의 parent가 child remoteEntry.js 등을 읽으면 child hosted subdomain의 CORS에 parent origin을 허용한다. Parent CSP와 child CORS는 각각 확인해야 한다. CORS 추가가 사용자 인증/authorization을 없애는 설정은 아니다.

## 출처

- [Palantir, Host an OSDK application on Foundry](https://www.palantir.com/docs/foundry/developer-console/deploy-custom-application-on-foundry)
- [Palantir, Permissions](https://www.palantir.com/docs/foundry/developer-console/permissions)

## 관련 문서

- [[Palantir-Developer-Application-Permissions-and-Migration|Website-only 권한]]
- [[Palantir-Public-Applications-and-Export-Boundaries|Public website/API]]
- [[Palantir-Custom-Widget-State-and-Security|Widget iframe CSP]]
