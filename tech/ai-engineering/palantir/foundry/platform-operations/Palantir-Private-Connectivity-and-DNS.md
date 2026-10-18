---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 사설 연결과 DNS 계약"]
---

# Foundry 사설 연결과 DNS 계약

Private link는 고객 cloud network와 Foundry network 사이의 경로를 cloud backbone으로 바꾼다. Foundry 관점의 ingress와 egress는 서로 다른 연결이며 한쪽 설정이 다른 방향을 자동 구성하지 않는다. 사설 연결과 공개 Internet ingress도 allowlist 설정에 따라 병존할 수 있다.

## Provider별 책임

AWS/Azure ingress는 Palantir가 제공하는 endpoint service name 또는 alias와 고객 측 endpoint, subnet/security group, Foundry enrollment/Org 식별자의 연결이 필요하다. AWS HTTPS는 port 443을 허용해야 한다. AWS account ID의 선행 0도 보존한다. AWS federated token이나 non-Palantir VPC peering을 대체 경로로 제공하지 않는다고 명시한다.

Overview는 모든 provider의 cross-region을 표시하지만 AWS 상세는 출발/목적 region 조합의 제한을 별도 확인하도록 한다. 표의 Available을 모든 조합의 무조건 지원으로 해석하지 않는다. AWS/Azure egress는 별도 Control Panel 경로가 있고 GCP ingress/egress는 담당자를 통한 설정이다. GCP overview의 Not Documented 표시는 상세한 self-service 절차가 없다는 범위로 읽는다.

## Gateway와 DNS

모든 service에 custom PrivateLink가 필요한 것은 아니다. AWS S3 same-region policy, 지원을 통한 DynamoDB gateway endpoint, Azure Storage policy는 별도 gateway 경로다. Storage 정책으로 허용할 수 없는 기관 요구가 있을 때 custom egress를 구분한다.

Endpoint 생성만으로 hostname resolution이 바뀌지 않는다. AWS는 Foundry domain을 endpoint universal DNS로, Azure는 endpoint private IP로 가리키는 DNS record가 필요하다. 고객 소유 domain은 내부 container service용 secondary domain과 동일 endpoint를 향한 DNS, CSR 서명과 certificate 설정을 추가한다.

문서의 모든 traffic 경로 전환 설명은 이 DNS와 enrollment/Org 설정을 완료한 network 문맥에 한정한다. 이 문서는 endpoint 생성, DNS 조회, TLS 연결이나 Internet 차단을 실제 검증하지 않았다.

## 출처

- [Palantir private-link, private-link](https://www.palantir.com/docs/foundry/private-link)
- [Palantir private-link, aws-private-link](https://www.palantir.com/docs/foundry/private-link/aws-private-link)
- [Palantir private-link, azure-private-link](https://www.palantir.com/docs/foundry/private-link/azure-private-link)
- [Palantir private-link, customer-owned-domain-private-link](https://www.palantir.com/docs/foundry/private-link/customer-owned-domain-private-link)
- [Palantir private-link, gcp-private-service-connect](https://www.palantir.com/docs/foundry/private-link/gcp-private-service-connect)
- [Palantir private-link, overview](https://www.palantir.com/docs/foundry/private-link/overview)

## 관련 문서

- [[Palantir-Platform-Operations]]
