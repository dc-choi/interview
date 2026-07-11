---
tags: [database, search, opensearch, security, tls, rbac]
status: done
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Security", "OpenSearch Production Checklist", "OpenSearch 보안"]
---

# OpenSearch 보안과 프로덕션 체크리스트

Security plugin은 transport 암호화, 인증, 권한, 감사 기능을 제공한다. 그러나 저장 장치와 snapshot 암호화, network 방화벽, secret rotation, backup 정책은 별도 계층의 책임이다.

이 문서의 node certificate, `nodes_dn`, admin certificate와 `securityadmin.sh` 절차는 self-managed OpenSearch 기준이다. Amazon OpenSearch Service domain은 AWS 관리 TLS와 IAM 및 fine-grained access control을, Serverless는 encryption, network, data access policy를 사용한다.

## TLS

- Transport TLS는 node 간 통신과 cluster 형성의 필수 경계다.
- 운영에서는 REST API도 TLS로 암호화한다.
- Demo certificate와 demo password를 production에 사용하지 않는다.
- 자체 PKI를 사용하고 certificate SAN과 실제 hostname을 맞춘다.
- 일반 인증서는 모든 node의 `nodes_dn`을 정확히 관리한다. SAN에 지원되는 node OID가 포함된 인증서는 예외다.
- Admin certificate와 key는 최소한의 관리 host에만 둔다.
- Hostname verification을 편의 때문에 끄지 않는다.

At-rest encryption은 Security plugin이 자동 해결하지 않는다. Volume, filesystem, snapshot repository의 암호화를 따로 구성한다.

## 인증

지원되는 backend에는 HTTP basic, client certificate, JWT, OpenID Connect, SAML, LDAP와 Active Directory, proxy 기반 인증 등이 있다.

권장 방향:

- 사용자: 조직의 OIDC 또는 SAML SSO
- Machine-to-machine: client certificate나 짧은 수명의 token
- 비상 운영: 사용과 감사를 제한한 break-glass 계정
- Dashboards service account와 일반 사용자 role 분리

Authentication backend는 순서대로 평가된다. 인증 성공 뒤 role mapping이 없으면 권한이 없다. 서로 다른 identity provider에서 같은 username이 충돌하지 않도록 subject namespace와 backend role을 설계한다.

## 권한 모델

권한은 REST URL이 아니라 내부 OpenSearch action 단위다.

- Cluster permission: cluster state와 관리 API
- Index permission: index pattern별 read, write, manage action
- Tenant permission: Dashboards saved object 공간
- Backend role mapping: 외부 identity group을 OpenSearch role에 연결

`all_access`와 service용 광범위 role을 사람에게 주지 않는다. 최소 권한 role을 만들고 파괴적 요청은 `perform_permission_check=true`로 실제 실행 전 검증한다.

## DLS와 FLS의 중요한 한계

### Document-level security

DLS는 role이 읽을 수 있는 문서를 Query DSL로 제한한다. 읽기 보안이며 쓰기를 제한하지 않는다.

- DLS role에 write 권한이 있으면 보이지 않는 문서도 수정하거나 삭제할 수 있다.
- 식별자는 analyzed `text`가 아니라 `keyword` exact match를 사용한다.
- 여러 role의 DLS 결합 규칙을 실제 사용자 조합으로 테스트한다.
- 복잡한 DLS query는 모든 검색에 추가 비용을 만든다.

### Field-level security

FLS는 읽을 수 있는 field를 include 또는 exclude한다. 역시 write를 막지 않는다.

- `title`만 숨기고 `title.keyword`를 남기면 값이 노출될 수 있다.
- `title*`처럼 subfield까지 포함하는 정책을 검토한다.
- Include와 exclude role을 섞으면 결합 결과가 직관과 다를 수 있다.
- DLS query가 사용하는 field를 FLS로 숨기면 정책이 올바르게 동작하지 않을 수 있다.

배포 전 `_plugins/_security/authinfo`와 대표 사용자별 query 회귀 테스트를 실행한다.

## Audit log

Audit는 기본 비활성이다. 필요한 category만 선택한다.

- Request body와 bulk subrequest 전체 기록은 민감 정보와 용량 위험이 있다.
- Authorization failure, authentication failure, security config change 등 목적을 먼저 정한다.
- 보존 기간, 접근 권한, masking, 외부 sink를 설계한다.
- 같은 cluster 내부 index만 sink로 쓰면 cluster 장애와 침해에 함께 영향을 받는다.
- 너무 많은 audit event는 indexing 부하와 disk 사용을 증가시킨다.

## Security 설정 변경

- YAML 파일은 초기 bootstrap에 사용하고 지속 변경은 REST API나 검증된 배포 절차로 관리한다.
- `securityadmin.sh` 실행 전 현재 구성을 backup한다.
- Patch Configuration API는 잘못된 부분 수정으로 전체 정책을 깨뜨릴 수 있다.
- Experimental configuration versioning을 production rollback 수단으로 단정하지 않는다.
- 설정, certificate, plugin 변경은 staging과 rolling 절차로 검증한다.

## Network와 API 노출

- REST endpoint를 public network에 직접 노출하지 않는다.
- Firewall, private network, reverse proxy, rate limit을 계층별로 둔다.
- CORS는 필요한 origin과 method만 허용한다.
- Anonymous authentication은 명시적인 공개 검색 use case가 아니면 끈다.
- Snapshot repository와 plugin download 권한도 별도 공급망 경계로 본다.
- Script와 destructive API 권한은 운영 role에서 최소화한다.

## 프로덕션 체크리스트

### 데이터 모델

- [ ] 핵심 field가 explicit mapping인가
- [ ] `text`, `keyword`, `nested`, `flat_object` 선택 근거가 있는가
- [ ] Dynamic mapping과 total field limit이 통제되는가
- [ ] `_source`를 유지하고 응답에서 filtering하는가
- [ ] Analyzer와 query corpus 회귀 테스트가 있는가

### 색인과 검색

- [ ] Bulk item별 실패를 검사하고 재처리하는가
- [ ] `refresh=true`를 반복하지 않는가
- [ ] Deep pagination은 PIT와 `search_after`를 쓰는가
- [ ] 사용자 wildcard, regexp, bucket 수를 제한하는가
- [ ] `_shards.failed`, timeout, partial result를 검사하는가

### 클러스터

- [ ] Manager quorum과 failure domain이 분리됐는가
- [ ] Node 또는 zone 하나를 잃어도 disk와 CPU 여유가 있는가
- [ ] Shard 크기와 수를 실제 workload로 benchmark했는가
- [ ] Allocation awareness와 disk watermark 알람이 있는가
- [ ] Reindex와 rollover 중 이중 저장 공간이 있는가

### 복구와 변경

- [ ] Snapshot이 외부 repository에 있고 restore 훈련을 했는가
- [ ] Alias 기반 rollback과 mapping migration runbook이 있는가
- [ ] Upgrade 전 plugin 호환성과 breaking change를 검증하는가
- [ ] ISM 실패와 마지막 성공 snapshot을 알람하는가
- [ ] 원본 DB 또는 이벤트에서 index 전체를 재생할 수 있는가

### 보안

- [ ] Transport와 REST TLS가 활성화됐는가
- [ ] Demo certificate를 자체 PKI로 교체하고 기본 password를 변경했는가. 사용하지 않는 demo identity는 제거하되 필수 service identity는 대체 설정을 준비했는가
- [ ] 사용자와 service role이 분리되고 최소 권한인가
- [ ] DLS와 FLS role 조합을 회귀 테스트했는가
- [ ] Audit 범위와 보존, 민감 정보 masking이 정의됐는가
- [ ] Volume과 snapshot at-rest encryption이 적용됐는가

## 관련 문서

- [[OpenSearch-Cluster-Reliability|가용성과 복구]]
- [[OpenSearch-Performance-Troubleshooting|운영 관측과 장애 대응]]
- [[OpenSearch-Index-Lifecycle|인덱스 변경 절차]]
- [[OpenSearch-Service|Amazon OpenSearch Service 보안 경계]]

## 출처

- [Security - OpenSearch Documentation](https://docs.opensearch.org/latest/security/)
- [Security best practices - OpenSearch Documentation](https://docs.opensearch.org/latest/security/configuration/best-practices/)
- [TLS certificates - OpenSearch Documentation](https://docs.opensearch.org/latest/security/configuration/tls/)
- [Defining users and roles - OpenSearch Documentation](https://docs.opensearch.org/latest/security/access-control/users-roles/)
- [Document-level security - OpenSearch Documentation](https://docs.opensearch.org/latest/security/access-control/document-level-security/)
- [Field-level security - OpenSearch Documentation](https://docs.opensearch.org/latest/security/access-control/field-level-security/)
- [Audit logs - OpenSearch Documentation](https://docs.opensearch.org/latest/security/audit-logs/index/)
