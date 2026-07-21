---
tags: [security, secrets, vault, kubernetes]
status: done
verified_at: 2026-07-21
category: "보안(Security)"
aliases: ["Secret Management", "시크릿 관리", "Vault", "HashiCorp Vault"]
---

# 시크릿 관리 (Secret Management)

DB 비밀번호, API 키, 인증서 같은 시크릿을 코드, 설정과 분리해 안전하게 저장하고 런타임에 주입하며 필요 시 회수하는 문제. 누출은 보통 두 지점에서 일어난다.

## 두 가지 누출 지점

- Git 평문 커밋: 시크릿이 버전 관리에 평문으로 들어가면 히스토리에서 완전히 지우기 어렵다. 한 번 push되면 회수 불가로 봐야 한다.
- K8s Secret 오브젝트: 값은 base64 인코딩일 뿐 그 자체가 암호화는 아니다. API 서버의 Encryption at Rest 설정은 Secret 같은 API 리소스를 etcd에 저장하기 전에 암호화해 저장 매체 유출 위험을 줄인다. 다만 API 접근 권한은 별개이므로 RBAC상 Secret을 읽을 수 있는 사용자는 API를 통해 복호화된 값을 받을 수 있다.

## 도구 선택: 요건이 도구를 결정

| 방식 | Git 평문 제거 | K8s Secret 제거 | 동작 |
|---|---|---|---|
| Sealed Secrets | O | X | 암호화본을 Git에 커밋, 컨트롤러가 일반 K8s Secret 생성 |
| SOPS | O | 배포 방식에 따름 | 임의 파일을 암호화하고 CI/CD 또는 GitOps 도구에서 복호화 |
| Vault + CSI | O | O | 외부 저장소에 보관, Pod에 직접 마운트 |

Sealed Secrets 컨트롤러는 최종적으로 K8s Secret을 만든다. SOPS는 파일 암호화 도구라 복호화 결과가 K8s Secret인지 다른 설정 파일인지는 배포 파이프라인이 결정한다. K8s Secret 오브젝트 자체를 없애야 한다면 외부 저장소에서 Pod 볼륨이나 파일로 직접 주입하는 Vault CSI 같은 방식을 선택할 수 있다. 요건과 위협 모델이 도구와 아키텍처를 결정한다.

## Vault 도입 전 설계 4항목

1. 스토리지 백엔드 — 운영은 Integrated Storage(Raft) 권장. 외부 DB 의존 없이 클러스터 자체 합의 알고리즘으로 동작한다.
2. Seal/Unseal — Vault는 재시작하면 항상 Sealed 상태로 뜬다. Auto Unseal(AWS KMS, GCP Cloud KMS 연동)을 걸지 않으면 예기치 못한 재시작에서 수동 Unseal 전까지 서비스가 마비된다.
3. 인증 방법(Auth Method) — Kubernetes Auth는 Pod의 ServiceAccount JWT를 검증한다. 클러스터 밖 CI/CD, VM은 AppRole, 사람 접근은 OIDC/LDAP를 쓴다.
4. Policy — 최소 권한 원칙. 경로 규칙 `secret/<환경>/<서비스>/<키>`로 서비스별 권한을 격리한다. 초기 설계가 중요한데, 경로를 바꾸면 Policy, SecretProviderClass, 앱 설정이 연쇄로 수정돼야 한다.

## 시크릿 주입 4방식

| 방식 | K8s Secret 생성 | 동작 시점 | 자동 갱신 | 특징 |
|---|---|---|---|---|
| CSI Provider | 선택(기본 미생성) | Pod 기동 시 | 제한적 | 볼륨 직접 마운트, SecretProviderClass CRD로 GitOps |
| Agent Injector | 미생성 | Pod 기동 시 | O(사이드카 지속) | Mutating Webhook으로 사이드카 자동 주입 |
| AVP(Argo CD Vault Plugin) | 입력 manifest에 따름 | Argo CD 렌더링 시 | 재동기화 필요 | manifest의 플레이스홀더를 치환하며 출력 리소스 종류는 입력 manifest가 결정 |
| ESO(External Secrets Operator) | 항상 생성 | 주기 동기화 | O | ExternalSecret으로 K8s Secret 자동 동기화 |

핵심 분기는 K8s Secret 오브젝트를 만드느냐다. CSI Provider와 Agent Injector는 볼륨이나 파일에 직접 주입할 수 있고, ESO는 K8s Secret을 동기화한다. AVP는 입력 manifest의 플레이스홀더를 치환할 뿐 리소스 종류를 강제하지 않는다. 입력이 `Secret`이면 K8s Secret이 생성되고, `Deployment`의 환경 변수나 다른 리소스면 그 형태로 출력된다. GitOps 렌더링 로그와 Argo CD 접근 권한도 별도 위협 모델에 포함한다.

## 단계적 도입

| Phase | 내용 | 효과 |
|---|---|---|
| 1(필수) | Vault KV + K8s Auth + CSI Provider | Git 평문 제거 + K8s Secret 제거 동시 달성 |
| 2 | AVP | Argo CD 렌더링 단계의 플레이스홀더 치환이 필요한 예외에 적용 |
| 3 | Audit Log + logrotate + 토큰 감사 | 추적성, 회수 체계 |
| 4 | OIDC Provider | 사용자 접근 통합 |
| 5 | Agent Injector | 동적 시크릿 + 자동 로테이션 |

Phase 1만 완료해도 보안 수준이 대폭 오른다. 이후는 필요에 따라 확장한다.

## 운영 필수 항목

- Audit Log — 모든 인증 요청과 시크릿 접근을 빠짐없이 기록한다. 인시던트 대응, 감사의 근거. logrotate로 로그 디스크를 관리한다.
- 토큰 회수 — TTL을 걸어도 만료 전 활성 토큰이 누적된다. `vault token lookup`으로 감사하고 `vault token revoke`로 명시 회수한다. 퇴사자 발생 시 즉시 회수 프로세스를 돌린다.
- userpass 비활성화 — userpass Auth는 만료 개념이 없어 방치되면 영구 유효하다. HR 퇴사 프로세스와 연동해 정기적으로 비활성화한다.

## 동적 시크릿과 로테이션

정적 시크릿은 한 번 발급하면 회수 전까지 같은 값이라 유출 시 피해가 길다. Vault의 동적 시크릿은 요청 시점에 단명 자격증명(예: DB 계정)을 즉석 발급하고 TTL이 지나면 자동 폐기한다. Phase 5의 Agent Injector 사이드카가 만료 전 갱신을 맡아 자동 로테이션을 구현한다. DB 비밀번호처럼 주기적 교체가 필요한 시크릿에 적합하다.

## Vault를 신원 허브로 확장

Vault는 시크릿 저장소를 넘어 OIDC Identity Provider 역할까지 한다. 서비스 간 JWT 기반 신원을 발급하고, Okta, Google Workspace 같은 외부 IdP와 SSO로 묶고, 개발자 개인 접근(LDAP, GitHub)도 Vault OIDC로 통일한다. 결과적으로 조직 전체 신원 허브가 된다. → [[OAuth2]], [[JWT]]

## 트레이드오프

- Vault는 별도 인프라를 직접 운영하는 부담이 있다. HA 구성과 Auto Unseal이 사실상 필수인데, Vault가 다운되면 CSI Driver가 시크릿을 못 받아 Pod 기동 자체가 막히기 때문이다.
- 그래서 K8s Secret 제거가 진짜 요건일 때만 Vault를 들이고, 아니면 SOPS로 끝낸다. Zero Trust 관점에서 K8s Secret 오브젝트를 아예 없애 신뢰 지점을 줄이는 것이 Vault 도입의 본질적 이득이다.

## 면접 포인트

Q. K8s Secret이 왜 안전하지 않나?
- base64는 암호화가 아니다. Encryption at Rest는 API 리소스를 etcd에 기록하기 전에 암호화하지만 API 권한을 대신 통제하지 않으므로, 최소 권한 RBAC와 감사 로그를 함께 적용해야 한다.

Q. Sealed Secrets, SOPS 대신 Vault를 쓰는 이유는?
- Sealed Secrets는 일반 Secret을 만들고, SOPS는 복호화 결과가 배포 설계에 달려 있다. 외부 저장소, 단명 자격증명, 동적 갱신이나 K8s Secret 없는 직접 마운트가 필요하면 Vault + CSI를 검토한다.

Q. CSI Provider와 Agent Injector, AVP의 차이는?
- CSI는 볼륨 마운트, Injector는 사이드카 파일 렌더링과 갱신에 적합하다. AVP는 Argo CD가 manifest의 플레이스홀더를 치환하며 K8s Secret 생성 여부는 입력 manifest가 결정한다.

Q. Vault 도입 시 가장 먼저 설계할 것은?
- 스토리지 백엔드(Raft), Auto Unseal(KMS), Auth Method, 최소 권한 Policy 네 가지. 특히 Auto Unseal 없으면 재시작에서 서비스가 마비된다.

## 관련 문서
- [[OAuth2|OAuth2 (OIDC 신원 허브 확장)]]
- [[JWT|JWT (ServiceAccount, 서비스 간 신원 토큰)]]
- [[EKS|EKS (Kubernetes 기반 주입 환경)]]
- [[CICD-Tool-Selection|CI/CD 도구 선택 (ArgoCD GitOps, AVP)]]

## 출처
- [도입전략 Git 시크릿 관리와 Vault 도입으로 보안 강화하기 — KT Cloud Tech](https://tech.ktcloud.com/entry/2026-06-ktcloud-git-vault-secrets-%EB%B3%B4%EC%95%88-%EA%B0%95%ED%99%94)
- [Kubernetes Encrypting Confidential Data at Rest](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)
- [Argo CD Vault Plugin documentation](https://argocd-vault-plugin.readthedocs.io/en/stable/)
