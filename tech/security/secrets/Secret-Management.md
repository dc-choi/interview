---
tags: [security, secrets, vault, kubernetes]
status: done
verified_at: 2026-10-03
category: "보안(Security)"
aliases: ["Secret Management", "시크릿 관리", "Vault", "HashiCorp Vault"]
---

# 시크릿 관리 (Secret Management)

DB 비밀번호, API 키, 인증서 같은 시크릿을 코드, 설정과 분리해 안전하게 저장하고 런타임에 주입하며 필요 시 회수하는 문제. Git과 Kubernetes Secret은 주요 점검 지점이며, 주입 뒤의 앱 메모리, 로그와 운영자 접근도 보호해야 한다.

## 두 가지 누출 지점

- Git 평문 커밋: 시크릿이 버전 관리에 평문으로 들어가면 히스토리에서 완전히 지우기 어렵다. 공유된 사본을 모두 회수했다고 보장할 수 없으므로 노출된 자격증명을 먼저 폐기하거나 교체한다. Git 히스토리 정리만으로 기존 자격증명의 권한이 사라지지는 않는다.
- K8s Secret 오브젝트: 값은 base64 인코딩일 뿐 그 자체가 암호화는 아니다. API 서버의 Encryption at Rest 설정은 Secret 같은 API 리소스를 etcd에 저장하기 전에 암호화해 저장 매체 유출 위험을 줄인다. 다만 API 접근 권한은 별개이므로 RBAC상 Secret을 읽을 수 있는 사용자는 API를 통해 복호화된 값을 받을 수 있다.

## 도구 선택: 요건이 도구를 결정

| 방식 | Git 평문 제거 | K8s Secret 제거 | 동작 |
|---|---|---|---|
| Sealed Secrets | O | X | 암호화본을 Git에 커밋, 컨트롤러가 일반 K8s Secret 생성 |
| SOPS | O | 배포 방식에 따름 | 임의 파일을 암호화하고 CI/CD 또는 GitOps 도구에서 복호화 |
| Vault + CSI | O | 선택 가능 | 외부 저장소에서 직접 마운트, K8s Secret 동기화는 별도 선택 |

Sealed Secrets 컨트롤러는 최종적으로 K8s Secret을 만든다. SOPS는 파일 암호화 도구라 복호화 결과가 K8s Secret인지 다른 설정 파일인지는 배포 파이프라인이 결정한다. K8s Secret 오브젝트 자체를 없애야 한다면 외부 저장소에서 Pod 볼륨이나 파일로 직접 주입하는 Vault CSI 같은 방식을 선택할 수 있다. 직접 마운트도 앱이 읽을 평문을 없애지는 않는다. Pod와 노드 접근, 파일 권한과 로그 노출을 함께 통제한다. 요건과 위협 모델이 도구와 아키텍처를 결정한다.

## Vault 도입 전 설계 4항목

1. 스토리지 백엔드 — HashiCorp는 대부분의 용도에 Integrated Storage(Raft)를 권장한다. 외부 스토리지 의존을 줄이지만 백업, 복구와 quorum 운영은 여전히 필요하다.
2. Seal/Unseal — 서버는 시작 시 sealed 상태다. Shamir seal은 필요한 키 조각으로 수동 해제하고, Auto Unseal은 KMS 같은 외부 서비스에 의존해 해제한다. 해제 전 새 시크릿 조회는 불가능하지만 기존 앱 전체가 즉시 중단되는지는 보유 자격증명과 갱신 시점에 달려 있다.
3. 인증 방법(Auth Method) — Kubernetes Auth, 클라우드 신원, JWT/OIDC, AppRole, LDAP 등에서 실행 환경이 증명할 수 있는 신원과 운영 조건에 맞게 선택한다. CI/CD나 VM이라고 AppRole만 가능한 것은 아니다.
4. Policy — 최소 권한 원칙. 경로 규칙 `secret/<환경>/<서비스>/<키>`로 서비스별 권한을 격리한다. 초기 설계가 중요한데, 경로를 바꾸면 Policy, SecretProviderClass, 앱 설정이 연쇄로 수정돼야 한다.

Auto Unseal은 키 관리 책임을 없애지 않는다. 의존하는 KMS 키가 영구 삭제되면 백업과 recovery key만으로 복구할 수 없는 경우가 있다. 키 삭제 방지와 복구 절차를 함께 설계한다.

## 시크릿 주입 4방식

| 방식 | K8s Secret 생성 | 동작 시점 | 자동 갱신 | 특징 |
|---|---|---|---|---|
| CSI Provider | 선택 | Pod 기동과 설정된 갱신 시 | driver/provider 설정에 따름 | 볼륨 마운트, 선택적으로 K8s Secret 동기화 |
| Agent Injector | 직접 파일 주입 | Pod 생성 시 주입 | 지속 실행 Agent 설정에 따름 | init/sidecar Agent가 공유 볼륨에 파일 렌더링 |
| AVP(Argo CD Vault Plugin) | 입력 manifest에 따름 | Argo CD 렌더링 시 | 값 변경 시 재렌더링 후 Sync | manifest의 플레이스홀더를 치환하며 출력 리소스 종류는 입력 manifest가 결정 |
| ESO(External Secrets Operator) | `creationPolicy`에 따름 | `refreshPolicy`에 따름 | 주기, 변경 시, 일회성 구분 | 기본 `Owner`는 생성, `Merge`는 기존 Secret에 병합, `None`은 생성/갱신하지 않음 |

핵심 분기는 K8s Secret 오브젝트를 만드느냐다. CSI Provider와 Agent Injector는 볼륨이나 파일에 직접 주입할 수 있다. ESO의 기본 `Owner` 정책은 K8s Secret을 생성하고 동기화하지만, `Merge`는 기존 Secret에만 병합하고 `None`은 Secret을 생성하거나 갱신하지 않는다. AVP는 입력 manifest의 플레이스홀더를 치환할 뿐 리소스 종류를 강제하지 않는다. 입력이 `Secret`이면 K8s Secret이 생성되고, `Deployment`의 환경 변수나 다른 리소스면 그 형태로 출력된다. GitOps 렌더링 로그와 Argo CD 접근 권한도 별도 위협 모델에 포함한다.

AVP에서 Git 변경 없이 외부 시크릿 값만 바뀌면 Argo CD의 Hard Refresh로 플러그인을 재실행해 manifest를 재생성한 뒤 수동 Sync로 적용한다. Auto Sync를 쓴다면 최근 성공한 동기화와 같은 Git SHA 및 애플리케이션 파라미터에서 재동기화하려면 `selfHeal: true`가 필요하다. Hard Refresh만으로 배포되거나, 재렌더링 없는 일반 Sync만으로 새 값이 반영됐다고 가정하지 않는다.

## 단계적 도입

다음은 운영 요건에 맞춰 선택하는 순서다. Vault나 특정 주입 방식 자체를 모든 서비스의 필수 단계로 삼지 않는다.

1. 자격증명의 소유자, 접근 주체, 노출 위치와 폐기 방법을 정한다.
2. Git 암호화만 필요한지, 중앙 접근 통제와 단명 자격증명까지 필요한지 나누어 도구를 고른다.
3. 실제 사용 전 인증, 최소 권한, 감사 로그, 백업과 장애 시 복구를 함께 준비한다.
4. 앱의 새 자격증명 재읽기와 연결 재생성을 포함해 갱신, 폐기와 장애 상황을 확인한다.
5. OIDC Provider, AVP나 추가 주입 도구는 별도 요구가 있을 때 도입한다.

## 운영 필수 항목

- Audit Log — 새 클러스터에서는 기본 비활성이다. 활성화한 audit device는 일부 제외 API를 빼고 요청과 응답을 기록한다. 활성 장치 중 어느 곳에도 기록하지 못하면 해당 API 요청을 처리하지 못하므로, 로그 용량과 쓰기 실패를 감시하고 복수 장치의 기록을 함께 확인한다. 민감 문자열의 기본 HMAC 처리가 모든 필드의 비밀성을 보장하지는 않는다.
- 토큰 회수 — `vault token lookup`은 지정 토큰이나 현재 토큰의 상태 조회이며 전체 활성 토큰 목록 감사가 아니다. TTL과 최대 TTL을 설계하고 퇴사, 침해 시 관련 토큰과 발급된 자격증명을 식별해 회수한다.
- userpass 관리 — 사용자명/비밀번호와 로그인으로 발급되는 토큰의 수명은 다르다. userpass도 `token_ttl`, `token_max_ttl` 등을 지원한다. 퇴사자의 사용자 항목 삭제만으로 기존 토큰과 외부 시스템 자격증명까지 모두 폐기됐다고 가정하지 않는다.

## 동적 시크릿과 로테이션

**Lease 갱신은 유효기간 연장이며 자격증명 값 교체와 다르다.** 동적 시크릿은 엔진이 자격증명을 발급하고 lease를 관리한다. Agent는 종류와 설정에 따라 lease를 갱신하거나 새 값을 조회한다. KV에 저장한 정적 비밀번호를 다시 읽는 것만으로 외부 DB의 비밀번호가 바뀌지는 않는다. DB static role의 비밀번호 교체도 엔진 설정과 연결해 확인한다.

Lease 만료나 회수 요청은 외부 시스템에서의 폐기가 성공했다는 증거가 아니다. DB 연결 실패 등으로 회수가 실패할 수 있어 로그와 대상 시스템을 확인해야 한다. `-force`로 lease 기록을 제거하는 작업도 대상 자격증명의 폐기를 대신하지 않는다.

CSI의 마운트 내용 갱신은 Secrets Store CSI Driver의 rotation 설정과 provider 지원을 확인한다. 파일이 바뀌어도 앱이 다시 읽어야 하며, K8s Secret을 환경 변수로 주입한 경우 새 값을 반영하려면 Pod 재시작이 필요하다. Agent의 파일 렌더링도 앱의 연결 풀이나 이미 메모리에 읽은 값을 자동 교체하지 않는다.

## Vault를 신원 허브로 확장

Vault의 OIDC Provider는 Vault identity와 인증 방법을 이용해 외부 OIDC 클라이언트가 최종 사용자를 인증하도록 지원한다. 외부 IdP로 Vault에 로그인하는 OIDC Auth와는 방향이 다르다. OIDC Provider를 켰다는 사실만으로 모든 서비스 간 인증이나 조직 SSO가 통합되는 것은 아니며, 클라이언트 등록과 신원 연결, claim과 접근 정책을 별도로 설계한다. [[OAuth2]], [[JWT]]와 연결한다.

## 트레이드오프

- 자체 운영 Vault는 가용성, 백업, unseal과 자격증명 갱신의 운영 부담을 추가한다. CSI가 시크릿을 읽지 못하면 새 Pod 기동이 막힐 수 있다. 기존 Pod의 지속 가능 시간은 현재 자격증명과 갱신 의존성에 따라 확인한다.
- Git 파일 암호화가 중심이면 SOPS나 Sealed Secrets가 후보이고, 중앙 정책과 감사, 동적 자격증명이 필요하면 Vault나 관리형 시크릿 저장소를 비교한다. K8s Secret 제거는 선택 기준 하나다. 오브젝트를 없애도 신뢰가 Vault, CSI와 앱으로 이동하므로 그 자체를 Zero Trust 달성으로 보지 않는다.

## 면접 포인트

Q. K8s Secret이 왜 안전하지 않나?
- base64는 암호화가 아니다. Encryption at Rest는 API 리소스를 etcd에 기록하기 전에 암호화하지만 API 권한을 대신 통제하지 않으므로, 최소 권한 RBAC와 감사 로그를 함께 적용해야 한다.

Q. Sealed Secrets, SOPS 대신 Vault를 쓰는 이유는?
- Sealed Secrets는 일반 Secret을 만들고, SOPS는 복호화 결과가 배포 설계에 달려 있다. 외부 저장소, 단명 자격증명, 동적 갱신이나 K8s Secret 없는 직접 마운트가 필요하면 Vault + CSI를 검토한다.

Q. CSI Provider와 Agent Injector, AVP의 차이는?
- CSI는 볼륨 마운트, Injector는 사이드카 파일 렌더링과 갱신에 적합하다. AVP는 Argo CD가 manifest의 플레이스홀더를 치환하며 K8s Secret 생성 여부는 입력 manifest가 결정한다.

Q. Vault 도입 시 가장 먼저 설계할 것은?
- 스토리지와 복구, seal 방식과 키 의존성, 실행 환경의 신원, 최소 권한 Policy를 먼저 정한다. 수동 unseal과 자동 unseal의 운영 조건을 비교하고 새 조회와 기존 앱의 장애 영향을 나누어 확인한다.

## 관련 문서
- [[OAuth2|OAuth2 (OIDC 신원 허브 확장)]]
- [[JWT|JWT (ServiceAccount, 서비스 간 신원 토큰)]]
- [[EKS|EKS (Kubernetes 기반 주입 환경)]]
- [[CICD-Tool-Selection|CI/CD 도구 선택 (ArgoCD GitOps, AVP)]]
- [[Hardcoded-Credentials|하드코딩된 자격증명]] — 코드에 박힌 키가 만드는 폭발 반경과 증폭 요인

## 출처

2026-10-03에 아래 공식 문서로 주입 대상, userpass 토큰 TTL, 감사 로그, lease와 값 교체의 차이, seal 의존성과 OIDC 역할을 대조했다. 특정 클러스터의 버전 조합, 설정이나 무중단 갱신 성공을 검증한 것은 아니다. 도입 순서는 공개 기능을 연결한 설계 제안이다.

- [도입전략 Git 시크릿 관리와 Vault 도입으로 보안 강화하기 — KT Cloud Tech](https://tech.ktcloud.com/entry/2026-06-ktcloud-git-vault-secrets-%EB%B3%B4%EC%95%88-%EA%B0%95%ED%99%94)
- [Kubernetes Encrypting Confidential Data at Rest](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)
- [Argo CD Vault Plugin documentation](https://argocd-vault-plugin.readthedocs.io/en/stable/)
- [External Secrets Operator API Specification](https://external-secrets.io/latest/api/spec/)
- [GitHub, Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Kubernetes, Good practices for Kubernetes Secrets](https://kubernetes.io/docs/concepts/security/secrets-good-practices/)
- [Sealed Secrets — Bitnami](https://github.com/bitnami/sealed-secrets)
- [SOPS documentation](https://getsops.io/docs/)
- [External Secrets Operator, Lifecycle](https://external-secrets.io/latest/guides/ownership-deletion-policy/)
- [HashiCorp Vault, Storage configuration](https://developer.hashicorp.com/vault/docs/configuration/storage)
- [HashiCorp Vault, Seal/Unseal](https://developer.hashicorp.com/vault/docs/concepts/seal)
- [HashiCorp Vault, Auth methods](https://developer.hashicorp.com/vault/docs/auth)
- [HashiCorp Vault, Vault Secrets Store CSI provider](https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi)
- [HashiCorp Vault, Vault Agent Injector](https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector)
- [Secrets Store CSI Driver, Secret Auto Rotation](https://secrets-store-csi-driver.sigs.k8s.io/topics/secret-auto-rotation)
- [HashiCorp Vault, Audit logging](https://developer.hashicorp.com/vault/docs/audit)
- [HashiCorp Vault, token lookup](https://developer.hashicorp.com/vault/docs/commands/token/lookup)
- [HashiCorp Vault, Userpass auth method API](https://developer.hashicorp.com/vault/api-docs/auth/userpass)
- [HashiCorp Vault, Lease, renew, and revoke](https://developer.hashicorp.com/vault/docs/concepts/lease)
- [HashiCorp Vault, Use Vault Agent templates](https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template)
- [Troubleshoot irrevocable leases — HashiCorp](https://developer.hashicorp.com/vault/tutorials/monitoring/troubleshoot-irrevocable-leases)
- [HashiCorp Vault, lease revoke](https://developer.hashicorp.com/vault/docs/commands/lease/revoke)
- [HashiCorp Vault, OIDC provider](https://developer.hashicorp.com/vault/docs/concepts/oidc-provider)
- [Argo CD Vault Plugin, Refreshing values from Secrets Managers](https://argocd-vault-plugin.readthedocs.io/en/stable/usage/#refreshing-values-from-secrets-managers)
- [Argo CD, Automated Sync Semantics](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/#automated-sync-semantics)
