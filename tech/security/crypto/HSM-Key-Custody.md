---
tags: [security, cryptography, hsm, key-management, digital-signature, aws]
status: done
verified_at: 2026-07-31
category: "Security - 암호"
aliases: ["HSM Key Custody", "Hardware Security Module", "서명 키 관리", "개인키 보관"]
---

# HSM과 서명 키 관리

서명 키 관리의 목표는 개인키 파일을 더 강한 저장소로 옮기는 데서 끝나지 않는다. 개인키를 내보낼 수 없게 하고, 허가된 주체가 허가된 데이터에 대해서만 서명 연산을 요청하게 만드는 것이 핵심이다.

HSM(Hardware Security Module)은 암호 키를 보안 경계 안에서 생성, 보관하고 암호 연산을 수행하는 전용 장치다. 애플리케이션에는 키 원문 대신 연산 결과만 반환하도록 구성할 수 있다.

## 시크릿 저장소만으로 부족한 이유

Secrets Manager나 Vault는 저장 시 암호화, 접근 제어와 감사를 제공한다. 그러나 읽기 권한을 얻은 주체에게는 결국 평문 개인키를 반환할 수 있다. 공격자가 키를 한 번 복사하면 권한을 회수한 뒤에도 다른 환경에서 서명을 계속할 수 있다.

비추출 키를 사용하는 HSM은 원시 키 대신 `Sign` 같은 암호 연산만 노출한다. 키를 복사해 오프라인에서 악용하는 위험을 줄이고, 네트워크와 사용자 권한을 차단하면 이후 서명도 멈출 수 있다.

| 구분 | 추출 가능한 개인키 | 비추출 HSM 키 |
|---|---|---|
| 애플리케이션이 받는 것 | 개인키 원문 | 서명 결과 |
| 권한 탈취 영향 | 키 복사 후 장기 악용 가능 | 접근 가능한 동안 서명 요청 가능 |
| 권한 회수 효과 | 이미 복사된 키에는 영향 없음 | 새 서명 요청 차단 가능 |
| 남는 핵심 위험 | 키 유출, 무단 서명 | 서명 서비스 악용, HSM 사용자 탈취, 운영 오류 |

HSM도 허용된 요청의 업무 정당성은 판단하지 못한다. 침해된 애플리케이션이 HSM을 서명 오라클처럼 사용할 수 있으므로, 호출자와 서명 가능한 데이터의 정책은 HSM 앞단에서 강제해야 한다.

## 서명 경로의 mental model

```text
호출자
  -> 서명 정책 계층
     -> 주 경로: HSM 서명
     -> 장애 대안: 별도 서명 백엔드
  <- 서명된 JWT와 kid

검증자 -> JWKS에서 kid에 맞는 공개키 선택 -> 서명 검증
```

서명 정책 계층은 호출자 인증, 허용된 토큰 종류와 claim, audience, 만료 시간, rate limit과 감사 정보를 검사한다. HSM은 개인키 연산만 수행하고 서명을 반환한다. 검증자는 공개키만 필요하며, 서명은 무결성과 발급자 진위를 확인할 뿐 payload를 암호화하지 않는다.

## 키 수명 주기

1. **용도를 분리한다.** 서명, 암호화와 키 래핑처럼 목적이 다른 연산은 키도 분리한다.
2. **보안 경계 안에서 생성한다.** 서명 키는 HSM이나 KMS 안에서 만들고, 필요한 알고리즘과 `SIGN` 권한만 부여한다.
3. **비추출성을 명시한다.** AWS CloudHSM 키는 기본값이 extractable이다. 서명 키를 만들 때 `EXTRACTABLE=false`로 설정하고 실제 속성을 확인한다. 비추출 키는 나중에 추출 가능 상태로 바꿀 수 없다.
4. **관리와 사용 권한을 나눈다.** 관리자는 사용자와 정책을 관리하고, 애플리케이션용 사용자는 지정된 키의 서명만 수행하게 한다.
5. **공개키를 먼저 배포한다.** 새 `kid`와 공개키를 JWKS에 게시하고 검증자 캐시가 갱신된 뒤 새 키로 서명한다.
6. **중첩 기간을 둔다.** 이전 키로 발급한 토큰의 최대 TTL과 JWKS 캐시 시간을 지나기 전에는 이전 공개키를 제거하지 않는다.
7. **폐기와 복구를 시험한다.** 키 삭제는 이미 발급한 토큰을 무효화하지 않는다. 발급 차단, 검증 신뢰 제거, 백업 복구를 각각 시험한다.

## AWS CloudHSM의 실행 경계

AWS CloudHSM은 고객 전용 단일 테넌트 HSM 클러스터를 제공한다. 클러스터를 만들 때 선택한 VPC 서브넷에는 HSM과 통신할 ENI가 생성되고, 실제 HSM은 같은 가용영역의 서비스 VPC에 위치한다.

애플리케이션은 CloudHSM Client SDK의 PKCS #11, JCE, OpenSSL Provider나 Windows KSP를 통해 암호 연산을 요청한다. IAM은 클러스터 생성 같은 AWS 제어 평면을 통제하고, 실제 키 연산은 별도의 HSM 사용자 자격 증명과 키 공유 권한으로 통제한다.

| AWS가 담당 | 고객이 담당 |
|---|---|
| HSM 하드웨어와 서비스 인프라 운영 | 클러스터 규모와 가용영역 구성 |
| 클러스터 내부 키 동기화 기능 | HSM 사용자, 자격 증명과 quorum |
| 암호화된 주기적 클러스터 백업 | 키 속성, 공유, 회전과 삭제 |
| HSM별 CloudWatch 감사 로그 전달 | 클라이언트 배포, 용량과 복구 시험 |

HSM을 쓴다는 사실만으로 더 안전해지는 것은 아니다. 관리형 서비스의 운영 책임을 직접 통제로 바꾸는 선택이며, 비추출 속성, 권한 분리와 복구 절차를 올바르게 구성해야 이점이 생긴다.

규제 준수가 목적이라면 선택한 HSM 유형, 클러스터 모드, 알고리즘과 리전이 요구하는 FIPS 검증 범위에 포함되는지 현재 공식 문서로 확인한다. CloudHSM 사용 자체가 규제 준수를 증명하지는 않는다.

## 다계층 접근 제어

서명은 호출자, 워크로드, 네트워크, HSM 사용자와 키 권한을 모두 통과할 때만 성공해야 한다. 한 계층의 자격 증명이 유출돼도 다른 계층이 서명 오라클 접근을 막도록 서로 다른 강제 지점을 둔다.

| 경계 | 통제 예시 | 막으려는 위험 |
|---|---|---|
| 호출자 | 서비스 간 인증, 허용 목록, 토큰 정책 | 허가되지 않은 업무 요청 |
| 워크로드 | 전용 서비스 계정, IAM 역할, admission과 scheduling 정책 | 다른 Pod의 자격 증명 사용과 전용 노드 진입 |
| 네트워크 | 전용 보안 그룹, 최소 포트, mTLS | HSM에 직접 연결하는 비인가 클라이언트 |
| HSM 사용자 | Admin, 키 소유 Crypto User, 서명 전용 Crypto User 분리 | 사용자 관리, 키 관리와 서명 권한의 집중 |
| 키 | `SIGN=true`, `EXTRACTABLE=false`, 필요하면 `DESTROYABLE=false`, 소유자와 공유 대상 제한 | 키 반출과 의도하지 않은 삭제 |
| 감사 | 애플리케이션 발급 로그, CloudWatch Logs의 HSM 감사 로그, CloudTrail 제어 평면 이벤트 | 누가 무엇을 서명했는지 모르는 상태 |

CloudHSM CLI에 별도 read-only 역할이 있는 것은 아니다. 애플리케이션도 Crypto User지만, 키 소유자가 키를 공유하면 공유받은 사용자는 암호 연산만 수행하고 키 삭제, 반출, 재공유와 속성 변경은 할 수 없다. 이 권한 모델과 애플리케이션 정책을 함께 써야 서명 전용 계정이 된다. `DESTROYABLE=false`는 삭제만 막으며, 속성까지 동결하려면 `MODIFIABLE=false`를 별도로 검토한다. 두 설정 모두 보존, 회전과 폐기 절차에 미치는 영향을 먼저 확인한다.

mTLS는 HSM 사용자 암호와 독립된 클라이언트 인증 계층이다. 현재 `hsm2m.medium`에서 지원되고 KMS용 CloudHSM Custom Key Store에는 지원되지 않으므로 HSM 유형을 확인한다. 인증서는 겹치는 유효기간으로 갱신하고 만료 잔여 시간을 경보해 자동 갱신을 새 SPOF로 만들지 않는다. 클러스터 강제 적용은 기존 non-mTLS 연결을 끊으므로 모든 클라이언트를 먼저 전환한다.

PKCS #11 연결은 일반 HTTP 프록시와 같은 방식으로 가정하지 않는다. 먼저 `configure-pkcs11 --cluster-id`처럼 Client SDK가 지원하는 클러스터 탐색 경로를 사용하고, 서비스 메시 프록시나 자체 DNS 계층은 세션 안정성과 장애 전환을 실제 환경에서 검증한 뒤 추가한다.

## Secrets Manager, KMS와 CloudHSM 선택

| 선택지 | 적합한 상황 | 주의할 점 |
|---|---|---|
| Secrets Manager | 애플리케이션이 실제 값을 읽어야 하는 자격 증명과 시크릿 | 읽기 권한이 있으면 값을 추출할 수 있음 |
| AWS KMS 비대칭 키 | 관리형 API, IAM과 키 정책으로 서명하고 운영 부담을 줄일 때 | 요청 quota, 지원 알고리즘과 요청당 비용 확인 |
| AWS CloudHSM 직접 연동 | 단일 테넌트 HSM, 표준 HSM 인터페이스, 직접 사용자와 키 제어가 필요할 때 | 클러스터, 사용자, SDK, 가용성과 비용을 고객이 운영 |

대부분의 일반 서명 워크로드는 KMS부터 검토한다. 특정 인터페이스나 알고리즘, 단일 테넌트 요건, 높은 지속 처리량의 비용 구조가 운영 부담을 정당화할 때 CloudHSM 직접 연동을 검토한다.

### CloudHSM Custom Key Store와 직접 서명은 다르다

AWS KMS의 CloudHSM Custom Key Store는 현재 AES 대칭 암호화 KMS 키만 지원한다. 비대칭 KMS 키와 `Sign`은 지원하지 않으므로, CloudHSM에서 비대칭 서명을 수행하려면 애플리케이션이 Client SDK로 HSM을 직접 호출해야 한다.

CloudHSM과 KMS에서 각각 비추출 키를 생성하면 서로 다른 키와 API를 가진 두 서명 경로가 된다. Custom Key Store 하나로 두 경로가 합쳐지지 않으며, 대안 경로를 쓰려면 검증자가 두 공개키를 신뢰해야 한다.

## 대규모 서명 시스템 설계

### 용량과 가용성

- 평균이 아니라 피크와 장애 시점으로 산정하고, HSM 한 대나 한 가용영역이 빠져도 목표 처리량을 만족하도록 N+1 여유를 둔다.
- AWS는 서로 다른 가용영역에 최소 2개 HSM을 둘 것을 권장한다. 여러 HSM이 있으면 클라이언트가 암호 연산을 자동 분산한다.
- 알고리즘, HSM 유형, Client SDK 버전, 동시성, 네트워크 위치와 메시지 전처리를 실제 조건과 같게 두고 부하 시험한다.
- 클러스터에 동기화되는 영구 token key를 사용한다. session key는 한 HSM에만 있으므로 HSM을 추가해도 해당 키의 처리량이 늘지 않는다.
- 새 키가 모든 필요한 HSM에 동기화된 것을 확인한 뒤 트래픽을 전환한다. 키 생성 직후의 동기화 지연도 실패 시나리오에 넣는다.

### 장애 대안 경로

- 대안 키의 공개키와 `kid`를 미리 JWKS에 배포하고, 검증자가 두 키를 모두 신뢰하는 중첩 기간을 확보한다.
- 가용성 오류에만 제한적으로 전환한다. 권한 거부나 잘못된 요청을 장애로 오인해 다른 백엔드로 우회하면 보안 정책이 무력화된다.
- 전환뿐 아니라 원래 경로로 복귀하는 절차, KMS quota와 CloudHSM 잔여 용량을 정기적으로 시험한다.
- 두 서명 백엔드가 공유하는 네트워크, 자격 증명, 배포와 JWKS 의존성도 확인해야 실제 장애 도메인이 분리된다.

### 비용 비교

```text
KMS 비용 = 서명 요청 수 × 요청 단가
CloudHSM 비용 = HSM 수 × 실행 시간 × 시간 단가 + 클라이언트와 운영 비용
```

호출이 적거나 변동이 크면 관리형 KMS가 유리할 수 있고, 지속적인 대량 서명은 고정 용량인 CloudHSM의 손익분기를 넘을 수 있다. 가격만이 아니라 가용성 여유, 관리 노드, 모니터링과 온콜 비용을 포함한 TCO로 비교한다.

2026년 공개된 한 JWT 사례에서는 하루 평균 6,500만 건, 6,000 RPS 이상을 목표로 삼았다. `hsm2m.medium` 4대에서 ES256 약 7,000 RPS를 측정했고, CloudHSM과 KMS의 지연 시간은 각각 p50 약 2ms와 5ms, p99 약 5ms와 30ms였다. 이는 해당 환경의 벤치마크이며 AWS의 일반 성능 보장이 아니다.

## 운영 체크리스트

- 비추출, 용도, 소유자와 공유 대상 등 키 속성을 생성 직후 검증한다.
- HSM 사용자 자격 증명을 IAM 자격 증명과 별도로 보호하고, 관리자 2명 이상과 관리 작업 quorum을 구성한다.
- 클러스터와 HSM 상태, 가용 처리량, 키 동기화, 서명 오류와 지연을 관측한다.
- HSM 감사 로그와 애플리케이션 발급 로그를 함께 보관한다. HSM 로그만으로는 어떤 업무 요청과 claim이 서명됐는지 알 수 없다.
- 백업 보존 기간과 리전 간 복사 요건을 정하고, 복원한 클러스터로 실제 서명이 가능한지 시험한다.
- 지원되는 Client SDK를 유지하고, 키 회전과 장애 대안 전환을 정기적으로 연습한다.

## 면접 체크포인트

### HSM이면 무단 서명을 막을 수 있는가

- **의도**: 키 비추출성과 서명 권한 통제를 구분하는지 확인한다.
- **핵심 답변**: 키 복사는 막을 수 있지만 허가된 호출자의 악성 서명 요청은 별도 정책 계층이 막아야 한다.
- **흔한 오답**: HSM에 넣으면 키 유출과 오용 문제가 모두 해결된다고 답한다.
- **꼬리질문**: 서명 서비스에서 어떤 claim, caller와 rate limit을 검증할 것인가?

### KMS 대신 CloudHSM을 언제 선택하는가

- **의도**: 보안 등급의 단순 우열이 아니라 통제와 운영 책임의 교환을 이해하는지 확인한다.
- **핵심 답변**: KMS를 기본으로 검토하고, 단일 테넌트, 표준 HSM 인터페이스, 특정 알고리즘이나 지속 처리량 요건이 운영 부담을 정당화할 때 CloudHSM을 선택한다.
- **흔한 오답**: CloudHSM이 항상 더 안전하거나 더 저렴하다고 답한다.
- **꼬리질문**: 비추출 속성, N+1 용량, 키 회전과 JWKS 전환을 어떻게 검증할 것인가?

## 관련 문서

- [[HSM-Signing-Operations|HSM 서명 시스템 운영과 무중단 키 전환]]
- [[Public-Key-Cryptography|공개키 암호와 디지털 서명]]
- [[JWT|JWT와 서명 검증]]
- [[KMS|AWS KMS]]
- [[Secrets-Manager|AWS Secrets Manager]]
- [[Secret-Management|시크릿 관리]]
- [[IAM|AWS IAM]]
- [[CloudTrail-Config|AWS 감사 로그]]

## 출처

- [당근이 AWS CloudHSM으로 대규모 서명키 관리 시스템을 구축한 방법, 1부 — AWS 기술 블로그](https://aws.amazon.com/ko/blogs/tech/how-karrot-built-a-large-scale-signing-key-management-system-with-aws-cloudhsm-part1/)
- [당근이 AWS CloudHSM으로 대규모 서명키 관리 시스템을 구축한 방법, 2부 — AWS 기술 블로그](https://aws.amazon.com/ko/blogs/tech/how-karrot-built-a-large-scale-signing-key-management-system-with-aws-cloudhsm-part2/)
- [Choosing an AWS cryptography service — AWS](https://docs.aws.amazon.com/decision-guides/latest/cryptography-on-aws-how-to-choose/guide.html)
- [Client SDKs for AWS CloudHSM — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/client-tools-and-libraries.html)
- [Set up mutual TLS between client and AWS CloudHSM — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/getting-started-setup-mtls.html)
- [Add a cluster with PKCS #11 multi-slot functionality — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/pkcs11-multi-slot-add-cluster.html)
- [AWS CloudHSM cluster architecture — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/cluster-architecture.html)
- [AWS CloudHSM cluster high availability and load balancing — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/cluster-high-availability-load-balancing.html)
- [AWS CloudHSM cluster synchronization — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/understand-key-sync.html)
- [AWS CloudHSM key management best practices — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/bp-hsm-key-management.html)
- [AWS CloudHSM user management best practices — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/bp-hsm-user-management.html)
- [Share a key using CloudHSM CLI — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/cloudhsm_cli-key-share.html)
- [Supported attributes for CloudHSM CLI — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/cloudhsm_cli-key-attributes-table.html)
- [AWS CloudHSM FIPS validation — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/fips-validation.html)
- [AWS CloudHSM cluster backups — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/backups.html)
- [Viewing AWS CloudHSM audit logs in CloudWatch Logs — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/understand-audit-logs.html)
- [Working with AWS CloudTrail and AWS CloudHSM — AWS](https://docs.aws.amazon.com/cloudhsm/latest/userguide/get-api-logs-using-cloudtrail.html)
- [AWS CloudHSM key stores — AWS KMS](https://docs.aws.amazon.com/kms/latest/developerguide/keystore-cloudhsm.html)
- [Asymmetric keys in AWS KMS — AWS](https://docs.aws.amazon.com/kms/latest/developerguide/symmetric-asymmetric.html)
