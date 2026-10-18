---
tags: [security, crypto, tls, certificate, operations]
status: done
verified_at: 2026-10-07
category: "Security - 암호"
aliases: ["Certificate Lifecycle Management", "CLM", "인증서 수명주기 관리"]
---

# 인증서 수명주기 관리

인증서 수명주기 관리(CLM)는 TLS 서버 인증서의 발견, 발급, 배포, 갱신과 폐기를 책임과 함께 관리하는 운영 체계다. [[ACME-Protocol|ACME]]는 발급 자동화 규약이고, CLM은 배포된 인증서의 위치와 실제 사용 상태까지 다룬다.

## 인벤토리와 발견 범위

인증서마다 도메인, 발급자, 만료일, 설치 위치와 담당 역할을 연결한다. CA 발급 목록, 서버와 로드밸런서 조회, 네트워크 스캔을 조합한다. 알려진 CA의 목록만으로 다른 CA의 인증서나 실제 배포 상태까지 확인했다고 볼 수 없다.

인벤토리는 인증서 메타데이터를 관리하고 개인키 원문을 모으는 저장소로 쓰지 않는다. 개인키 보호는 [[HSM-Key-Custody|키 보관]]와 [[Secret-Management|시크릿 관리]]에서 별도로 다룬다.

## 공인 TLS 인증서 유효기간 단축

CA/Browser Forum TLS Baseline Requirements 2.3.1의 6.3.2절 기준이다. 발급일에 따라 적용되는 **최대 유효기간**이며, 모든 CA가 그 기간만큼 발급한다는 뜻은 아니다.

| 발급 시점 | 최대 유효기간 |
| --- | --- |
| 2026-03-15 이전 | 398일 |
| 2026-03-15 이상, 2027-03-15 미만 | 200일 |
| 2027-03-15 이상, 2029-03-15 미만 | 100일 |
| 2029-03-15 이상 | 47일 |

이 일정은 공개적으로 신뢰되는 TLS 서버 인증서에 적용된다. 내부 전용 PKI의 사설 인증서 전체에 같은 상한을 적용하는 규정은 아니다. CA 프로필의 더 짧은 수명과 내부 PKI 정책은 별도로 확인한다.

인증서 유효기간과 도메인 검증 데이터의 재사용 가능 기간도 다르다. 같은 규격 4.2.1절의 도메인/IP 검증 데이터 재사용 상한은 2029-03-15부터 10일이다. 예전 도메인 검증 결과만으로 계속 재발급할 수 있다고 가정하지 않는다.

## Let's Encrypt 기본 프로필의 단계적 단축

2026-10-16 공식 발표 부분 대조. CA/Browser Forum의 최대 허용 기간과 특정 CA의 발급 정책을 구분한다.

- Let's Encrypt는 2027-02-10부터 기본 인증서의 신규 발급과 갱신에 64일을 적용한다. 이미 유효한 인증서를 이 전환 때문에 폐기하지 않는다. 더 짧은 프로필을 선택한 경우는 별도다.
- 스테이징 전환 예정일은 2026-10-14로 발표됐다. 실제 클라이언트의 스테이징 발급은 여기서 시험하지 않았다.
- 자동 갱신과 ARI 지원을 함께 확인한다. 고정 일수로 실행한다면 전체 수명의 약 2/3 시점에 갱신하도록 조정하라는 공식 권고를 적용한다. 실행 주기와 갱신 대상 판정은 구분한다.
- 2028년 기본 45일 전환도 예정돼 있다. 검증 결과 재사용 기간은 30일에서 10일, 2028년에는 7시간으로 줄어드는 별도 변화다.

확인 대상은 클라이언트의 ARI 구현, cron의 고정 일수, 도메인 검증 자동화, 갱신본 배포와 reload, 외부 만료 감시다. 2026-10-10 GeekNews 발췌의 일정을 이 발표와 대조했으며 기존 다른 제품의 설명까지 재검증하지는 않았다.

## 갱신 성공과 적용 성공

발급 성공, 대상 저장소 갱신, 프로세스 재적재, 실제 TLS 응답 확인을 구분한다. 여러 서버에 배포한 인증서는 모든 대상의 적용 여부를 확인한다.

- **Certbot**: `certbot renew`의 종료 코드 0은 갱신 불필요인 경우도 포함한다. 성공한 갱신 뒤 배포 작업을 실행하려면 `--deploy-hook`을 사용한다. 명령 성공만으로 새 인증서 적용을 판정하지 않는다.
- **cert-manager**: Secret의 `tls.crt`와 `tls.key`가 바뀌어도 시작할 때만 읽는 애플리케이션은 새 인증서를 바로 사용하지 않는다. 변경 감지와 reload 또는 재시작이 필요하다. `rotationPolicy: Always`는 새 인증서 서명을 받은 뒤 Secret의 키를 교체하지만, 애플리케이션의 무중단 반영까지 보장하지 않는다.
- **관측**: 실제 종료 지점이 제공하는 인증서, 체인과 만료일을 확인하고 갱신 실패와 잔여 유효기간을 감시한다. 구체적인 연결 검사는 [[TLS-Config#검증|TLS 설정 검증]]을 따른다.

예를 들어 Kubernetes Secret에는 갱신본이 있지만 Pod가 이전 인증서를 메모리에 보관하면 발급 지표는 정상이어도 만료 장애가 날 수 있다. reload 설계와 외부 관측을 함께 두는 이유다.

## 설치 도구와 인증 방식에 맞춘 갱신

2026-10-13 AWS Knowledge Center와 Certbot 공식 가이드 부분 대조 기준. Lightsail의 Bitnami 스택에서는 같은 Let's Encrypt 인증서라도 발급 도구가 다를 수 있다. 먼저 실제 서버 인증서와 로컬 인증서 목록을 대조한다. `/opt/bitnami/letsencrypt`는 bncert-tool 또는 Lego, `/etc/letsencrypt`는 Certbot의 단서이며 경로만으로 확정하지 않는다.

- **도구 확인**: Lego의 `list` 또는 `certbot certificates` 결과로 대상 인증서를 식별한 뒤 해당 도구의 갱신 절차를 따른다.
- **인증 방식 확인**: Certbot은 기존 발급에 사용한 플러그인과 옵션을 갱신에 재사용한다. 갱신 설정의 `authenticator`와 자동화 hook 유무를 확인한다.
- **수동 DNS 인증**: hook 없는 `--manual` 발급은 새 TXT 값을 사람이 반영해야 하므로 cron에 같은 명령을 넣는 것만으로 무인 갱신되지 않는다. `--manual-auth-hook`으로 챌린지를 자동 처리하거나 자동 갱신을 지원하는 다른 플러그인을 쓰는 경로는 별도로 검토한다. 수동 방식을 유지한다면 TXT 전파를 확인한 뒤 검증을 진행한다.

AWS의 Bitnami 복구 예제는 서비스 중지, 갱신, 재시작 순서를 포함한다. 이를 모든 ACME 갱신의 필수 절차로 일반화하지 않는다. 서비스 중단 필요성은 인증 플러그인과 배포 방식에 맞춰 판단하고, 재시작 뒤 외부 TLS 응답도 확인한다. 이 절만 추가 대조했으며 기존 본문 전체의 검증일은 유지한다.

## 실패와 복구 경계

이전 인증서로 되돌리는 조치는 그 인증서가 아직 유효하고 키가 안전한 경우에만 복구 후보가 된다. 만료되었거나 키 유출이 의심되는 인증서를 복구 수단으로 삼지 않는다. 키 유출 시에는 새 키와 인증서로 교체하고 기존 인증서 폐기를 처리한다.

cert-manager는 기본적으로 `Certificate` 삭제 시 대응 Secret을 지우지 않는다. 따라서 관리 리소스를 삭제해도 사용이 즉시 끝나지 않고 갱신만 멈출 수 있다. 서비스 종료 시 실제 참조와 잔존 Secret을 함께 확인한다.

## 운영 판단

작은 환경의 출발점은 기존 ACME 클라이언트, 배포 연결과 만료 감시다. 여러 CA와 배포 대상 때문에 소유자 누락이나 교체 실패가 반복될 때 중앙 인벤토리와 승인 흐름을 강화한다. 이는 적용 규모에 따른 설계 판단이며 특정 CLM 제품의 도입을 전제하지 않는다.

확인 질문: 인증서 갱신 작업이 성공했는데 외부 응답은 이전 인증서라면, 저장소 갱신, TLS 종료 위치와 프로세스 재적재 중 어느 증거부터 확인할 것인가?

## 출처

- [64-Day Certificate Lifetimes Coming Feb 2027 — Let's Encrypt](https://letsencrypt.org/2026/10/07/64-day-certs)

- [How do I renew a Let's Encrypt SSL certificate in a Bitnami stack hosted on a Lightsail instance? — AWS Knowledge Center](https://repost.aws/knowledge-center/lightsail-bitnami-renew-ssl-certificate)
- [Certbot, User Guide: Manual](https://eff-certbot.readthedocs.io/en/stable/using.html#manual)
- [NIST, SP 1800-16B: TLS Server Certificate Management](https://www.nccoe.nist.gov/publication/1800-16/VolB/index.html)
- [CA/Browser Forum, Baseline Requirements for TLS Server Certificates](https://cabforum.org/working-groups/server/baseline-requirements/requirements/)
- [Certbot, User Guide: Renewing certificates](https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates)
- [cert-manager, Certificate resource](https://cert-manager.io/docs/usage/certificate/)

## 관련 문서

- [[ACME-Protocol|ACME 발급과 갱신]]
- [[TLS-Config|TLS 배포와 검증]]
- [[HSM-Key-Custody|HSM과 키 보관]]
- [[Secret-Management|시크릿 관리]]
