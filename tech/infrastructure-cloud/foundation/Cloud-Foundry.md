---
tags: [infrastructure, paas, cloud-foundry, buildpacks, service-broker, kubernetes, kind]
status: done
verified_at: 2026-11-14
category: "Infrastructure - 클라우드 기초"
aliases: ["Cloud Foundry", "클라우드 파운드리", "cf push", "Open Service Broker", "kind-deployment"]
---

# Cloud Foundry — 앱 단위로 배포하는 오픈소스 PaaS

Cloud Foundry는 개발자가 컨테이너나 서버가 아니라 앱을 단위로 다루게 하는 오픈소스 PaaS다. 개발자는 소스나 빌드 산출물을 `cf push`로 올리고, 플랫폼이 빌드, 실행, 라우팅과 서비스 연결을 맡는다. 이 문서의 `cf`는 Cloud Foundry CLI이며 [[Cloudflare-CF-CLI|Cloudflare의 cf CLI]]와 다른 도구다. PaaS가 추상화 계층에서 차지하는 위치는 [[Cloud-Service-Models|IaaS/PaaS/FaaS/SaaS]]에 있다.

## mental model: 앱, 서비스, 공간

- **앱:** 배포와 확장의 단위다. 개발자는 이미지 대신 앱 파일을 올린다.
- **서비스:** 데이터베이스나 메시지 큐처럼 앱이 쓰는 외부 자원이다. 마켓플레이스에서 만들어 앱에 바인딩한다.
- **org와 space:** 권한과 할당량의 경계다. 앱, 서비스와 라우트는 모두 space에 속한다.

## `cf push`가 앱을 실행하기까지

Cloud Foundry 문서의 스테이징 절차는 다음과 같다.

1. cf CLI가 Cloud Controller에 앱 레코드 생성을 요청하고, Cloud Controller가 앱 메타데이터를 저장한다.
2. CLI가 앱 파일을 올린다. 리소스 캐시에 이미 있는 파일은 빼고 올리며, Cloud Controller가 이를 앱 패키지로 묶어 blobstore에 저장한다.
3. 앱 시작을 요청하면 Cloud Controller가 Diego에 스테이징을 요청하고, Diego Cell이 스테이징 작업을 실행한다. 이 작업이 buildpack과 buildpack 캐시를 내려받아 앱을 컴파일하고 스테이징한다.
4. 결과물은 droplet이라는 tarball이며 buildpack 캐시와 함께 blobstore에 저장된다. 스테이징이 15분을 넘으면 실패한다.
5. Diego가 droplet을 하나 이상의 Diego Cell에서 장기 실행 프로세스(LRP)로 띄운다.

Docker 이미지를 push하는 경우의 문서 절차에는 buildpack 단계가 없다. 스테이징 작업이 이미지 메타데이터를 가져와 일부를 Cloud Controller에 돌려주고, Cloud Controller가 그것으로 Dockerfile의 시작 명령을 실행하는 LRP를 만든다.

### buildpack

- buildpack은 2011년 Heroku가 처음 고안한 방식으로, 언어 런타임마다 앱을 실행 가능한 형태로 만드는 절차를 묶은 것이다.
- Cloud Foundry는 Classic Buildpack과 Cloud Native Buildpack(CNB) 두 종류를 지원한다. CNB는 2018년 1월 Pivotal과 Heroku가 시작해 같은 해 10월 CNCF에 들어갔다.
- 문서는 부족한 기능을 Paketo에서 찾도록 안내한다. 예를 들어 GraalVM 기반 Java Native Image는 Paketo의 CNB로만 지원한다.
- CNB의 lifecycle 단계와 builder 신뢰 범위는 [[Cloud-Native-Buildpacks|Cloud Native Buildpacks]]에 있다.

## 서비스 연결

### 관리형 서비스와 Service Broker API

- 관리형 서비스는 API로 Cloud Foundry와 통합돼, 예약된 자원과 자격 증명을 필요할 때 만들어 준다.
- 연결 규약은 Service Broker API이고 Cloud Controller가 그 클라이언트다. 이 API는 Cloud Controller API와 따로 버전을 관리한다.
- broker는 서비스 상품과 플랜의 카탈로그를 알리고, provision, bind, unbind, deprovision 요청을 처리한다.
  - **provision:** 자원을 예약한다. 이 자원을 서비스 인스턴스라고 부른다.
  - **bind:** 앱이 그 자원에 접근하는 데 필요한 정보를 준다. 바인딩한 자격 증명은 환경 변수로 앱에 전달된다.
  - **service key:** 앱 밖의 클라이언트에 자격 증명을 줄 때 쓴다.

### 사용자 제공 서비스(user-provided service)

마켓플레이스에 없는 외부 서비스도 서비스 인스턴스로 등록해 같은 방식으로 바인딩할 수 있다. `cf create-user-provided-service`의 별칭은 `cf cups`다.

```bash
# 자격 증명을 JSON으로 전달
cf cups my-db -p '{"username":"admin","password":"<비밀값>"}'
# syslog drain(-l)과 route service(-r, https만 허용)
cf cups my-logs -l syslog-tls://logs.example.com:6514
```

`cf update-user-provided-service`(별칭 `uups`)는 자격 증명을 덮어쓰고 빠진 파라미터를 지운다. 바인딩한 앱은 재시작한 뒤에 바뀐 값을 본다.

## org, space와 역할

- **org:** 한 사람이나 여러 협업자가 소유하고 쓰는 개발 계정이다. 구성원은 할당량 플랜, 앱, 사용 가능한 서비스와 사용자 도메인을 공유한다.
- **space:** 앱 개발, 배포와 유지보수를 위한 공유 위치다.
- **역할:** 전역의 Admin, Admin Read-Only, Global Auditor, org의 Org Manager, Org Auditor, Org Billing Manager, Org User, space의 Space Manager, Space Developer, Space Auditor, Space Supporter(V3 API 전용)가 있다. Space Developer는 앱, 서비스와 space 범위의 service broker를 관리한다.
- space 역할을 주기 전에 org 역할을 먼저 줘야 한다. Org Manager는 space별로 메모리, 앱 인스턴스, 라우트, service key, 유료 서비스와 로그 양의 할당량을 정할 수 있다.

## 설치 형태 (2026-11-14 확인)

| 형태 | 기반 | 상태와 용도 |
|---|---|---|
| cf-deployment | BOSH 매니페스트 | 오픈소스 Cloud Foundry의 정식 배포 매니페스트. BOSH director, stemcell, cloud-config가 필요하고 v3.0부터 CredHub가 기본 자격 증명 저장소 |
| Korifi | Kubernetes custom resource로 CF V3 API 구현 | 2026-09-15 저장소 보관(read-only). README는 RFC-0060을 참조하라고 안내하며, 보관 전에도 모든 V3 API와 필터를 지원하지는 않았다 |
| kind-deployment | 로컬 kind 클러스터에 Helmfile로 배포 | 로컬에서 빠르고 싸게 시험하는 용도 |

### kind-deployment로 로컬에 띄우기

- **준비물:** README가 요구하는 것은 docker(또는 podman), docker-compose(또는 podman-compose)와 make다. Docker Desktop에는 메모리를 8GB 이상 배정해야 한다. Linux 호스트는 inotify 한도를 올리지 않으면 Envoy sidecar가 종료 코드 134로 죽는다.
- **시간:** FAQ 기준 첫 설치는 5~20분, 이후는 2~7분이다.
- **명령:**

```bash
make up          # 설치
make login       # cf CLI 로그인과 테스트 space 생성
make bootstrap   # Java, Node, Go, Binary buildpack 업로드
cf push -f examples/hello-js/manifest.yaml
make down        # 삭제
```

- **선택 구성요소:** `INSTALL_OPTIONAL_COMPONENTS=false`로 credhub, loggregator, routing-api 등 선택 구성요소를 빼고 설치할 수 있다.
- **한계:** kind에서는 IP가 다른 gateway를 둘 이상 둘 수 없어 routing isolation segment가 완전하지 않다. segment별 gorouter는 분리되지만 gateway는 분리되지 않는다.

## 트레이드오프

- **얻는 것:** 라우팅, 로드밸런싱과 TLS 종료를 플랫폼이 공통으로 맡는다. 도메인의 DNS는 Cloud Foundry 밖에서 라우터 앞의 로드밸런서로 연결해야 한다. 운영자가 shared domain을 이렇게 연결해 두면 그 아래 라우트는 앱마다 DNS를 따로 설정하지 않아도 된다(적용 판단). 반면 사용자 도메인은 DNS 제공자에 CNAME 같은 레코드를 따로 설정해야 한다. 서비스 수가 늘수록 이 공통화의 이득이 커진다(적용 판단). 셀프서비스 플랫폼의 설계 일반은 [[Internal-Developer-Platform|내부 개발자 플랫폼]]에 있다.
- **잃는 것:** 플랫폼 자체의 운영 부담이 크다. BOSH 기반 정식 배포는 별도 도구 체계를 요구하고, Kubernetes 위의 구현은 Korifi처럼 API 범위가 덜 채워진 채 보관될 수 있다.
- **로컬 개발 루프:** 공유 개발 space에서 통합 시험을 반복하면 다른 팀과 자원을 다툰다. 로컬 설치로 같은 `cf` 명령과 바인딩을 먼저 시험하면 공유 환경의 배포 횟수를 줄일 수 있다(적용 판단). 다만 로컬 구성은 선택 구성요소와 isolation segment에서 운영 환경과 다를 수 있다.
- 앱을 12 Factor 원칙에 맞추는 이전 조건은 [[Cloud-Migration-Strategies|클라우드 전환 전략]]과 함께 본다.

## 확인 질문

- `cf push`에서 droplet은 언제 어디서 만들어지고 어디에 저장되는가?
- 관리형 서비스와 사용자 제공 서비스는 자격 증명이 만들어지는 위치가 어떻게 다른가?
- 사용자에게 space 역할을 주기 전에 먼저 필요한 것은 무엇인가?

Cloud Foundry 공식 문서와 GitHub 저장소 README를 2026-11-14에 대조했다. 로컬 설치는 실행하지 않았다.

## 출처

- [Cloud Foundry Documentation, How Apps Are Staged](https://docs.cloudfoundry.org/concepts/how-applications-are-staged.html)
- [Cloud Foundry Documentation, Buildpacks](https://docs.cloudfoundry.org/buildpacks/)
- [Cloud Foundry Documentation, Services Overview](https://docs.cloudfoundry.org/services/overview.html)
- [Cloud Foundry Documentation, User-Provided Service Instances](https://docs.cloudfoundry.org/devguide/services/user-provided.html)
- [Cloud Foundry Documentation, Orgs, Spaces, Roles, and Permissions](https://docs.cloudfoundry.org/concepts/roles.html)
- [Cloud Foundry Documentation, Configuring Routes and Domains](https://docs.cloudfoundry.org/devguide/deploy-apps/routes-domains.html) — shared domain과 사용자 도메인의 DNS 설정, 로드밸런싱과 TLS 종료
- [cloudfoundry/cf-deployment — GitHub](https://github.com/cloudfoundry/cf-deployment)
- [cloudfoundry/korifi — GitHub](https://github.com/cloudfoundry/korifi) — 2026-09-15 보관 표시와 RFC-0060 안내를 2026-11-14 확인
- [cloudfoundry/kind-deployment — GitHub](https://github.com/cloudfoundry/kind-deployment) — README와 docs/faq.md의 준비물, 명령과 한계를 2026-11-14 대조
- [CloudFoundry: the Fastest Inner-Loop and the Fastest Path to Production — YouTube, Coffee + Software](https://www.youtube.com/watch?v=JJhhbkXkDUo) — 2026-11-03 업로드, 학습 계기. kind-deployment의 공개 시점과 Korifi 종료 공지 시점에 관한 발언은 1차 출처로 확인하지 못해 쓰지 않았다.

## 관련 문서

- [[Cloud-Service-Models|IaaS/PaaS/FaaS/SaaS]]
- [[Cloud-Native-Buildpacks|Cloud Native Buildpacks]]
- [[Internal-Developer-Platform|내부 개발자 플랫폼]]
- [[Cloud-Migration-Strategies|클라우드 전환 전략]]
