---
tags: [palantir, foundry, networking, egress, private-link]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 네트워크 egress"]
---

# Foundry의 외부 연결과 사설망 경계

Egress는 Foundry가 시작하는 연결이다. 데이터 방향은 양방향일 수 있으므로 sync와 export 모두 가능하다. 목적지에 도달하는 경로, 그 경로를 workload에 부여하는 권한과 원천 인증을 나눠 설계한다. 네트워크 허용이 데이터 읽기/쓰기 인가를 대신하지 않는다.

방화벽 규칙은 두 층이다. 고객별 egress policy는 컨테이너 네트워킹 기술(Cilium, eBPF)로 개별 workload에 적용되고, Palantir 정보보안 팀은 인프라 proxy 수준의 규칙을 따로 유지한다. 이 규칙이 다루는 workload에는 Foundry worker를 쓰는 Data Connection source, external transform과 external function, external streaming UDF, live 배포용 external model adapter와 Code Workbook이 포함된다. Palantir는 egress 경로를 여는 일을 항상 보안 위험으로 보고, enrollment의 정보보안 책임자가 신뢰하는 목적지만 열고 사용 권한을 신뢰하는 개발자 group으로 좁히며, 변경 관리 도구로 egress 변경을 신뢰하는 group이 검토하게 하고 egress 설정이 안전하게 유지되는지 확인하는 감사 절차를 두도록 권한다. 신뢰하는 외부 시스템도 악의적 행위자가 보안 통제를 우회하는 데 악용할 수 있으므로, 목적지를 신뢰하는 것만으로 egress 위험이 해소되지는 않는다.

## 경로를 workload 지원에 맞춘다

| 경로 | 동작 | 주요 제약 |
|---|---|---|
| Direct | Foundry 네트워크에서 목적지 연결 | 클라우드는 주로 인터넷, on-prem은 연결된 내부망 |
| Agent proxy | Foundry 요청을 agent host에서 목적지로 전달 | 외부 시스템은 agent host의 연결을 허용 |
| Secure tunnel | 내부 initiator가 연 outbound tunnel로 역방향 요청 전달 | Initiator 목적지 allowlist와 source policy 둘 다 필요 |
| Private link | 같은 cloud provider의 사설 연결 | 전용 domain 정책, wildcard 미지원 |
| Bucket endpoint | 같은 AWS region의 S3 endpoint 경로 | 현재 S3만 지원, source에 policy 연결 필요 |

Agent proxy는 first-class Data Connection, external transform, deployed function, streaming UDF, Code Workspaces와 Compute Modules에 지원되지만 virtual table과 OIDC 인증은 미지원이다. Transform preview는 VS Code 경로만 지원한다. Private link policy는 virtual table, Iceberg BYOB와 OIDC 인증에 미지원이며 bucket endpoint는 virtual table과 Iceberg BYOB에 미지원이다. 같은 네트워크 주소라도 호출 제품에 따라 지원을 확인한다.

Agent proxy policy에 agent를 여러 개 지정하면 traffic은 그중 하나에 무작위로 배정된다. Agent proxy policy의 주소에 `10.x.x.x` 같은 사설 IP 대역을 쓰면 Foundry 내부 인프라와 충돌할 수 있고 라우팅되지 않으므로, 사설 IP로만 닿는 원천은 agent의 host override로 placeholder domain을 사설 IP에 연결한다. Secure tunnel policy는 protocol로 TCP나 UDP를 받고, cluster에 연결된 initiator 사이에서 연결을 부하 분산한다.

Direct는 DNS/IPv4/CIDR, port 1~65535와 TLS/TCP/UDP를 설정한다. DNS에는 단일 port를 사용한다. Port 443은 기본 SNI 확인을 시도하므로 비HTTPS protocol을 이 포트에 쓰면 timeout/hang이 날 수 있다. 해당 policy의 SNI 검사를 조정하고, 80/443의 비HTTP(S)에는 TCP-level allowlisting을 켠다. 다른 port/경로에도 TCP-level allowlisting이 필요하다. TCP-level allowlisting을 쓰는지는 연결의 보안 수준을 바꾸지 않는다.

Palantir 클라우드에서 운영하는 Foundry가 직접 연결할 때의 egress IP 대역은 Control Panel의 network egress 관리 화면에 표시되므로, 목적지의 allowlist에는 그 CIDR을 넣는다. AWS에서 운영하는 Foundry의 같은 region S3는 VPC endpoint를, Azure에서 운영하는 Foundry의 Azure Storage는 subnet ID를 허용한다. Agent를 거치는 연결은 고객 인프라의 agent host에서 나가므로 agent와 목적지 사이의 연결은 고객이 맡는다. Secure tunnel도 Foundry가 목적지에 직접 연결하지 않으므로, 목적지는 Foundry의 연결 대신 initiator의 연결을 허용해야 한다.

Wildcard는 왼쪽 첫 label 하나로 한 단계 subdomain만 일치한다. `*.example.com`은 `a.example.com`과 일치하지만 apex나 `a.b.example.com`과는 다르다. Public suffix, 중간/다중 wildcard는 안 된다. Direct/agent proxy 지원 설명과 secure tunnel 표의 wildcard 설명은 전용 경로 설정을 함께 확인한다. Private link/bucket endpoint에는 사용하지 않는다.

## Policy의 사용 권한은 실행 능력이다

일반 사용자는 제안할 수 있고 enrollment의 관리 workflow가 승인/수정/revoke한다. View는 존재 조회, Import는 workload에서 사용 가능을 뜻한다. **Importer는 해당 목적지에 임의 코드를 실행해 통신할 수 있다.** 연결 하나의 용도만 허용한 비즈니스 인가로 오해하지 않는다.

승인과 생성, metadata 수정, revoke는 `Manage network egress configuration` workflow로 부여되며 기본으로 Enrollment Administrator와 Information Security Officer 역할이 가진다. 두 역할은 자기 project 접근 권한과 관계없이 policy가 어느 project에 import됐는지를 metadata로 볼 수 있어, revoke나 사용 제한 판단에 쓴다. 승인자는 View와 Import를 받을 사용자나 group을 정하고, 나중에 Manage Sharing으로 바꿀 수 있다. 이미 있는 policy와 같은 제안이 오면 거절, 거절하면서 기존 policy의 Importer 권한 부여, 중복 승인(비권장) 중 하나를 고른다.

목적지는 생성 뒤 바꿀 수 없고 policy는 삭제 대신 revoke한다. Pending은 workload에 연결할 수 있어도 실행은 실패하고, Active만 사용할 수 있으며 Paused/Revoked는 실패한다. 겹치는 다른 Active policy를 쓰는 workload는 계속 동작하므로 policy 하나 revoke가 목적지 전체 차단이라는 뜻은 아니다. Paused는 Palantir 정보보안 팀이 위험하다고 본 egress를 막은 상태이며, 정당한 policy가 잘못 멈췄다면 지원 티켓으로 요청한다. Palantir가 policy를 관리하는 enrollment는 만든 policy 정보를 Palantir 담당자에게 전달해 위험 평가를 받고, 완전 self-service enrollment에서는 policy가 방화벽에 자동 적용된다.

기본은 source/workload에 명시적으로 연결하는 opt-in이다. Code Workbook은 granular 관리 대신 global policy를 쓰므로 더 넓은 영향을 검토한다. Code resource/transform에는 source 최대 10개와 TCP-level policy 합계 최대 50개 제한이 있다.

## S3 endpoint와 원천 인증을 함께 적용한다

신형 bucket endpoint는 enrollment별 endpoint, source attachment와 최대 1,000개 policy를 제공한다. 구형 S3 bucket policy는 platform instance별 endpoint, source attachment 없는 즉시 전체 workload 적용과 최대 10개 제한으로 다르다. 구형 endpoint가 여러 Foundry instance에 공유될 수 있으므로 VPCE 출처만 허용해 데이터 인가를 끝내지 않는다. 신형도 여러 policy가 endpoint를 공유할 수 있어 AWS 인증/인가가 필요하다. 구형 same-region S3 bucket policy에서 고르는 `READ ONLY`와 `READ WRITE`는 VPC endpoint로 보장되는 최소 접근 수준이며, Palantir는 허용 bucket 목록을 넓히거나 `READ ONLY`를 `READ WRITE`로 올릴 수 있다. 그래서 S3 source에는 AWS 인증과 인가를 따로 둔다.

Azure Storage도 subnet ID 허용과 원천 인증/인가, Foundry egress policy를 함께 적용한다. Subnet 공유 가능성 때문에 network origin만을 신뢰하지 않는다. GCP-hosted Foundry의 BigQuery/GCS/PubSub 연결 추가 구성은 지원 요청 경로다.

## Cloud identity와 인증서를 따로 관리한다

Cloud identity UI는 AWS/Rubix-hosted enrollment에 제공되며 static credential 대신 생성 IAM role을 사용한다. 대상 AWS account에 별도 role, Foundry role을 허용하는 trust policy와 실제 resource permission policy를 둔 뒤 STS AssumeRole을 구성한다. IAM 허용만으로 network route가 열리는 것은 아니다.

공식 cloud identity 문서에는 2024년 4월 기준 15개/enrollment와 생성 후 삭제/개명 불가가 명시돼 있다. 이 수치를 새로운 보편 한도로 확대하지 않고 actual enrollment에서 확인한다. 같은 region S3는 일반 egress IP 대신 VPCE 경로를 함께 본다.

Egress client certificate는 mTLS 인증용 공개 인증서와 private key를 포함한다. PEM chain과 정확히 맞는 PKCS#8/RSA private key를 입력하고 read/import/manage 권한을 설정한다. Server certificate bundle은 private CA로 서명된 서버를 검증하는 공개 인증서 집합이며 client identity와 역할이 다르다.

## Private link는 생성, 승인과 policy가 모두 필요하다

한도는 enrollment당 20 links, link당 10 private domains다. AWS는 endpoint service name과 provider allowed principal에 Foundry account를 설정한다. Custom TLS domain은 CNAME mapping을 추가하고 사용할 default/zonal/private domain마다 egress policy를 만든다. Ready 상태만으로 source 설정이 끝나지는 않는다. AWS S3는 이 private link 경로로 지원하지 않으며 bucket endpoint 경로를 확인한다.

AWS Snowflake는 Foundry cloud account를 Snowflake 지원을 통해 allowlist하고 private link config/OCSP domains/ports를 반영한다. 일반 `SYSTEM$AUTHORIZE_PRIVATELINK`는 필요한 federated token이 사용자에게 없어 같은 방식으로 사용할 수 없다. Stage의 S3 경로도 별도로 허용한다.

Azure는 resource ID와 sub-resource를 정하고 custom service visibility/승인 또는 PaaS의 endpoint 승인 과정을 거친다. Standard link는 DNS가 없으면 endpoint IP를 직접 사용한다. Storage link는 선택한 blob/file/table/queue/dfs용 DNS를 자동 관리하며 변경할 수 없다. Link 생성 후에도 필요한 egress policy를 source에 연결한다.

## Secure tunnel은 두 단계 allowlist다

내부 initiator, Foundry control plane과 responder가 tunnel을 만든다. Initiator는 outbound 연결만 만들고 짧은 token을 자동 회전하며 TLS 상호 인증을 사용한다. 같은 cluster의 여러 node는 가용성과 분산을 제공한다. Data Connection agent나 Apollo Helm 관리가 restart/upgrade를 담당하고 운영자는 실행 환경, 플랫폼 egress와 목적지 allowlist를 마련한다.

Initiator allowlist는 CIDR/port/(선택)endPort이며 비어 있으면 전부 거부한다. 모든 주소/port를 허용해도 link-local과 cloud metadata endpoint는 차단한다. 이 allowlist와 Foundry의 cluster egress policy를 모두 통과해야 destination에 도달한다.

## Egress 성공은 원천 작업 성공이 아니다

2025년 9월 GA 공지는 agent proxy의 virtual table 활용도 언급하지만 확인일의 전용 egress 지원 표는 virtual table을 미지원으로 표시한다. 해당 조합은 공지의 포괄적 소개보다 실제 connector/현재 지원 표와 enrollment 확인을 우선한다. Agent worker와 Foundry worker+proxy도 compute 실행 위치가 다르다.

Source terminal은 source와 같은 network access에서 `dig`, `curl`, `netcat`, `openssl`로 DNS/TLS/firewall을 진단하는 경로다. Terminal의 연결 성공과 실제 sync/export credential, payload, watermark 처리는 다르다. 2025년 12월 안내의 feature 범위는 source egress policy를 사용하는 연결이었다.

Control Panel과 Builds telemetry의 로그는 policy/source/connection ID, byte 수와 duration을 연결한다. Direct 성공은 Foundry 밖으로 나갔다는 뜻, agent proxy 성공은 agent로 전달됐다는 뜻이다. 목적지 ingress firewall, TLS와 인증 실패는 그 뒤에도 가능하다. Observability는 TCP-level allowlisting policy에만 제공된다. 먼저 실패한 hop을 구분하고 DNS, policy attachment, agent health와 외부 인가를 확인한다.

2026-10-19 검증은 방화벽 두 층과 운영 권고, agent proxy와 secure tunnel policy 옵션, TCP-level allowlisting의 보안 영향, egress IP와 경로별 연결 책임, 권한 기본값과 승인 처리, Paused와 Palantir 관리 또는 self-service 적용, 구형 S3 접근 수준을 Palantir 공식 Configure network egress 문서와 대조한 범위에 한정한다. 나머지 내용의 확인일은 frontmatter의 날짜로 유지한다.

## 출처

- [Palantir, Configure network egress](https://www.palantir.com/docs/foundry/administration/configure-egress)
- [Palantir, Configure cloud identities](https://www.palantir.com/docs/foundry/administration/configure-cloud-identities)
- [Palantir, Configure egress certificates](https://www.palantir.com/docs/foundry/administration/configure-egress-certificates)
- [Palantir, Configure private link egress](https://www.palantir.com/docs/foundry/administration/configure-private-link-egress)
- [Palantir, Configure private link egress for AWS](https://www.palantir.com/docs/foundry/administration/configure-private-link-egress-aws)
- [Palantir, Configure private link egress for Azure](https://www.palantir.com/docs/foundry/administration/configure-private-link-egress-azure)
- [Palantir, Configure secure tunnels](https://www.palantir.com/docs/foundry/administration/secure-tunnels)
- [Palantir, Network egress observability](https://www.palantir.com/docs/foundry/administration/network-egress-observability)
- [Palantir, September 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-09)
- [Palantir, November 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-11)
- [Palantir, December 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-12)

## 관련 문서

- [[Palantir-Security-and-Governance|보안과 데이터 인가]]
- [[Palantir-Data-and-Model-Integration|외부 원천과 모델]]
- [[Palantir-Action-External-Effects|외부 쓰기의 실패 경계]]
