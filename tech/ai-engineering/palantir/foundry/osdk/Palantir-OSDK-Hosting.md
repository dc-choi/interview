---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Foundry static hosting, domain과 배포 상태

Developer Console hosting은 static HTML/CSS/JS와 browser SPA용이다. Node/Python server, SSR/backend 실행을 제공하지 않는다. Client-facing application의 public client가 대상이며 Backend service까지 함께 선택한 confidential client에는 hosting이 나타나지 않을 수 있다.

## asset와 route

production build directory 자체가 아니라 내용만 ZIP으로 압축한다. directory를 포함하면 URL path에도 들어간다. 확인일 문서는 최대1,000파일/총20MB를 안내한다.

custom404가 없으면 unmatched path는 root index.html로 SPA fallback한다. root404.html을 두면 이 fallback이 꺼진다. route 선호 형식으로 redirect하지 않는다. `/file`, `/file/`, `/file.html`은 file.html을, `/folder`는 folder/index.html을 제공한다. both.html과 both/index.html이 함께 있으면 `/both`는 앞 파일, `/both/`는 뒤 파일이라는 차이가 있다.

redirect URL은 HTTPS hosting domain+/auth/callback을 앱 코드와 Developer Console 양쪽에 맞춘다. HTTP를 자동 HTTPS로 바꾸지 않는다.

## domain과 환경

기본 enrollment subdomain 요청은 InfoSec 승인과 domain-ready를 기다린다. 제출 후 이름을 편집할 수 없으면 기존 request를 닫고 새로 요청한다. custom domain은 covering certificate, DNS와 승인 절차가 필요하다. custom domain 아래 subdomain을 등록하려면 해당 custom domain으로 Foundry에 로그인해야 한다.

custom domain은 로그인에 사용한 domain의 ingress/IdP 설정을 상속한다. palantirfoundry.com 밖의 외부관리/air-gapped 환경은 DNS/TLS/ingress와 hosting enablement를 별도로 조정한다. IL5/FedRAMP는 추가 승인/config가 필요할 수 있다. 옵션이 안 보인다는 이유만으로 모든 enrollment에서 불가능하다고 결론 내리지 않는다.

## upload와 production

UI/CLI로 upload한 asset은 preview와 production deploy를 구분한다. async vulnerability scan 환경은 upload 성공 뒤 즉시 deploy가 실패할 수 있다. `site.uploadOnly=true`로 업로드만 하고 scan 완료 뒤 명시적으로 배포한다. 기본 false면 업로드와 즉시 production 시도를 함께 한다.

ScanningInProgress에서는 scan 상태를 확인하고 완료 뒤 deploy를 재시도한다. failed tag가 upload도 실패했다는 뜻은 아니다. 실제 live version과 접근 가능 상태를 확인한다.

## 접근, CSP와 CORS

hosted website는 Foundry 로그인 사용자 대상이며 app 개발팀 권한과 Share hosted website를 나눠 설정한다. public-facing domain 이름을 썼다고 익명 public website가 되는 것은 아니다.

기본 CSP는 제한적이다. 추가 규칙은 default와 merge되지만 입력 validation이 없다는 문서 조건을 확인한다. 외부 리소스의 CSP와 cross-origin 요청의 CORS는 별도다. microfrontend parent가 child remoteEntry를 읽으면 child domain의 allowed origin에 parent origin을 추가한다.

이 문서는 배포 계약을 학습한 것으로 실제 ZIP upload, 승인 요청이나 production 배포를 실행하지 않았다.

## 출처

- [Palantir, deploy-osdk-application-on-foundry](https://www.palantir.com/docs/foundry/ontology-sdk/deploy-osdk-application-on-foundry)

## 관련 문서

- [[Palantir-OSDK]]
- [[Palantir-OSDK-React-Development]]
- [[Palantir-OSDK-Authentication]]
