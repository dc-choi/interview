---
tags: [aws, cloudfront, saas, multi-tenant, cdn, infrastructure]
status: done
verified_at: 2026-10-14
category: "Infrastructure - AWS"
aliases: ["CloudFront SaaS Manager", "CloudFront multi-tenant distribution", "CloudFront 멀티테넌트 배포", "distribution tenant"]
---

# CloudFront SaaS Manager — 여러 고객 도메인을 공통 템플릿 하나로 배포

> 상위 문서: [[CloudFront|Amazon CloudFront]]

CloudFront SaaS Manager는 고객마다 도메인이 다른 SaaS나 여러 브랜드 사이트를 공통 설정 하나로 운영하게 하는 CloudFront 기능이다. 고객 사이트가 늘 때마다 standard distribution을 따로 만들고 TLS 인증서, WAF와 캐시 설정을 각각 맞추는 운영 부담을 줄인다. AWS는 2025-04-28 출시를 발표했으며, 이 문서는 2026-10-14 CloudFront 개발자 가이드 기준이다.

## 구성 요소

| 구성 요소 | 역할 |
|---|---|
| multi-tenant distribution | origin, cache behavior, 보안 보호 같은 공통 설정을 담은 템플릿. routing endpoint가 없어 직접 트래픽을 받지 못한다 |
| distribution tenant | 시청자가 들어오는 도메인 단위의 입구. multi-tenant distribution 하나를 참조해 설정을 상속하고 일부만 바꾼다 |
| connection group | tenant 도메인이 가리킬 routing endpoint(예: `d123.cloudfront.net`)를 제공하고, IPv6와 Anycast static IP list 같은 연결 설정을 가진다 |
| parameter | origin 도메인 이름이나 origin path에 넣는 자리표시자. 값은 tenant마다 넣는다 |

- 사이트나 앱 하나만 운영하면 standard distribution이 맞다. standard distribution은 자기 endpoint로 직접 접근할 수 있지만 다른 배포의 템플릿으로 쓸 수 없다.
- multi-tenant distribution을 만들면 CloudFront가 기본 connection group을 만들고, 새 tenant를 여기에 자동으로 연결한다. 고객 도메인의 DNS는 connection group의 routing endpoint를 가리키게 한다. 하위 도메인은 CNAME을 쓰고, CNAME을 둘 수 없는 apex 도메인은 Route 53 alias 레코드를 권장한다.

## tenant가 바꿀 수 있는 설정

- **도메인**: tenant마다 도메인을 하나 이상 지정한다. standard distribution과 달리 alternate domain name을 distribution이 아니라 tenant에 둔다.
- **parameter**: multi-tenant distribution에서 parameter를 필수로 정의하면 tenant가 값을 반드시 넣어야 하고, 선택으로 정의하면 기본값이 상속된다. origin 도메인 이름과 origin path에 각각 두 개까지 쓸 수 있다. 예를 들어 origin path를 `/{{tenantName}}`로 정의하고 tenant마다 `tenantName` 값을 넣으면 S3 버킷 하나에서 고객별 경로를 나눠 제공한다.
- **WAF web ACL(V2)**: tenant에 별도 web ACL을 지정하면 multi-tenant distribution의 web ACL 대신 적용되고, tenant에서 상속을 끌 수도 있다. 공통으로 필요한 규칙이 tenant web ACL에서 빠지지 않았는지 확인한다(설계 점검). WAF 쪽 설계는 [[WAF-Bot-Control|WAF Bot Control]].
- **지역 제한**: tenant의 geo restriction이 multi-tenant distribution의 설정을 override한다.
- **TLS 인증서**: tenant용 ACM 인증서는 공통 인증서에 보태지며, 같은 도메인을 둘 다 덮으면 tenant 인증서를 쓴다.
- **invalidation**: tenant 단위로 경로를 지정해 캐시를 무효화한다.

## 인증서와 도메인 소유 확인

- tenant는 multi-tenant distribution의 공유 ACM 인증서를 상속하며, 그 인증서가 tenant 도메인을 덮어야 한다. 덮지 못하면 tenant에 인증서를 따로 둔다. 직접 지정하는 custom TLS 인증서는 US East (N. Virginia) 리전에 있어야 한다.
- 고객 도메인마다 인증서를 준비하기 어렵다면 tenant를 만들거나 수정할 때 CloudFront managed certificate를 요청한다. CloudFront가 ACM에서 HTTP 검증 인증서를 대신 받고 갱신도 자동으로 관리한다. 인증서는 계정 소유이지만 CloudFront 리소스에서만 쓸 수 있고 private key는 내보낼 수 없다.
- 검증 token을 누가 제공할지(`ValidationTokenHost`) 고른다. 트래픽이 없는 새 도메인이거나 DNS를 바로 CloudFront로 돌릴 수 있으면 CloudFront가 제공하게 하고(`cloudfront`), 기존 트래픽이 있는 도메인을 옮길 때는 기존 서버에 token 파일을 올리거나 ACM 검증 endpoint로 301 redirect를 걸어(`self-hosted`) DNS 전환 전에 인증서를 받는다.
- tenant당 대기 중인 인증서 요청은 하나뿐이다. wildcard 도메인은 공유 인증서나 기존 custom 인증서가 덮을 때만 tenant에 쓸 수 있다.
- 고객이 자기 DNS에 TXT 레코드를 넣지 않고 인증서를 발급받게 하려면, SaaS 제공자 도메인 아래 고객별 하위 도메인(예: `customer-123.example-saas-provider.com`)을 배정하고 제공자 DNS에 그 하위 도메인의 `_cf-challenge.` TXT 레코드(값은 routing endpoint)를 둔 뒤, 고객 도메인이 그 하위 도메인을 CNAME으로 가리키게 한다.
- 활성화된 도메인은 비활성으로 되돌릴 수 없고, 사용 중에는 다른 CloudFront 리소스에 연결할 수 없다. 다른 리소스로 옮길 때는 `UpdateDomainAssociation`을 쓴다.

## tier 설계와 connection group

- Origin Shield나 WAF 같은 기능 차이를 고객 등급(tier)으로 나눌 때는 등급마다 multi-tenant distribution을 만들고 tenant를 해당 distribution에 연결한다. 등급을 바꾸면 tenant가 참조하는 multi-tenant distribution(`UpdateDistributionTenant`의 `DistributionId`)을 바꾼다.
- 기본 connection group을 쓰는 것이 권장이다. 엔터프라이즈 고객을 격리하거나 tenant 묶음을 따로 관리해야 할 때 custom connection group을 만든다. 예를 들어 DDoS 공격을 받는 tenant를 별도 connection group으로 옮겨 다른 tenant로 영향이 번지지 않게 한다. custom connection group은 콘솔 Settings에서 Connection group 설정을 켠 뒤 만든다.
- tenant의 connection group을 바꿔도 트래픽은 계속 전달되지만, DNS를 새 routing endpoint로 바꾸기 전까지는 지연이 늘고 DNS가 가리키는 기존 endpoint의 설정으로 라우팅된다. 새 group의 Anycast static IP 같은 설정도 DNS를 바꾼 뒤에 적용된다.
- 기본 connection group은 끄거나 지울 수 없다.

## 쓸 수 없는 기능과 기본 quota

2026-10-14 개발자 가이드 기준이다.

- multi-tenant distribution에서는 continuous deployment, OAI(OAC를 쓴다), dedicated IP 방식 custom SSL과 dedicated IP 주소(SNI만 지원), WAF Classic(V1) web ACL, legacy standard logging, distribution의 Minimum, Default, Maximum TTL과 `ForwardedValues`, `PriceClass`, Trusted Signers, smooth streaming, IAM 서버 인증서, 최소 protocol SSLv3를 쓸 수 없다. IPv6와 Anycast static IP list는 distribution이나 tenant가 아니라 connection group에서 정한다.
- AWS Firewall Manager 정책은 아직 standard distribution에만 적용된다.
- 기본 quota는 계정당 tenant 10,000개, multi-tenant distribution 20개, connection group 100개이고, multi-tenant distribution과 tenant는 각각 parameter를 5개까지 쓴다. 모두 상향을 요청할 수 있다.

## 설계 체크포인트

- 사이트 하나면 standard distribution, 공통 설정을 공유하는 고객 도메인이 여럿이면 multi-tenant distribution을 검토한다.
- tenant 분리는 엣지 배포 설정의 분리다. 애플리케이션의 데이터, 권한과 캐시 키를 tenant별로 나누는 문제는 따로 설계한다([[NextJS-Multi-Tenant|Next.js Multi-Tenant 경계]]).
- 고객 도메인 온보딩(도메인 등록, 인증서 검증, DNS 전환, 활성화 확인)을 `CreateDistributionTenant`와 `UpdateDistributionTenant` API로 자동화할 수 있는지, 기존 트래픽이 있는 도메인은 `self-hosted` 검증으로 DNS 전환 전에 인증서를 받는지 확인한다(설계 제안).
- 기존 standard distribution을 옮길 때는 위의 미지원 기능을 쓰고 있는지 먼저 확인한다.

## 출처

- [Amazon CloudFront Developer Guide, Understand how multi-tenant distributions work](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html)
- [Amazon CloudFront Developer Guide, Distribution tenant customizations](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/tenant-customization.html)
- [Amazon CloudFront Developer Guide, Request certificates for your CloudFront distribution tenant](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/managed-cloudfront-certificates.html)
- [Amazon CloudFront Developer Guide, Create custom connection group](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-connection-group.html)
- [Amazon CloudFront Developer Guide, Create SaaS manager resources AWS SDK](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example_cloudfront_CreateSaasResources_section.html)
- [Amazon CloudFront Developer Guide, Quotas](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html)
- [Amazon CloudFront API Reference, UpdateDistributionTenant](https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_UpdateDistributionTenant.html)
- [AWS WAF Developer Guide, Using AWS WAF with Amazon CloudFront](https://docs.aws.amazon.com/waf/latest/developerguide/cloudfront-features.html)
- [Reduce your operational overhead today with Amazon CloudFront SaaS Manager — AWS News Blog](https://aws.amazon.com/blogs/aws/reduce-your-operational-overhead-today-with-amazon-cloudfront-saas-manager/)
- [Reduce your operational overhead today with Amazon CloudFront SaaS Manager — YouTube, Amazon Web Services](https://www.youtube.com/watch?v=rFNW4SDLRGY)

## 관련 문서

- [[CloudFront|Amazon CloudFront]]
- [[WAF-Bot-Control|WAF Bot Control (tenant web ACL의 override 점검)]]
- [[ACM|ACM (인증서 발급과 검증)]]
- [[Route53|Route 53 (apex 도메인 alias 레코드)]]
- [[NextJS-Multi-Tenant|Next.js Multi-Tenant 경계]]
