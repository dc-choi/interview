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

## 갱신 성공과 적용 성공

발급 성공, 대상 저장소 갱신, 프로세스 재적재, 실제 TLS 응답 확인을 구분한다. 여러 서버에 배포한 인증서는 모든 대상의 적용 여부를 확인한다.

- **Certbot**: `certbot renew`의 종료 코드 0은 갱신 불필요인 경우도 포함한다. 성공한 갱신 뒤 배포 작업을 실행하려면 `--deploy-hook`을 사용한다. 명령 성공만으로 새 인증서 적용을 판정하지 않는다.
- **cert-manager**: Secret의 `tls.crt`와 `tls.key`가 바뀌어도 시작할 때만 읽는 애플리케이션은 새 인증서를 바로 사용하지 않는다. 변경 감지와 reload 또는 재시작이 필요하다. `rotationPolicy: Always`는 새 인증서 서명을 받은 뒤 Secret의 키를 교체하지만, 애플리케이션의 무중단 반영까지 보장하지 않는다.
- **관측**: 실제 종료 지점이 제공하는 인증서, 체인과 만료일을 확인하고 갱신 실패와 잔여 유효기간을 감시한다. 구체적인 연결 검사는 [[TLS-Config#검증|TLS 설정 검증]]을 따른다.

예를 들어 Kubernetes Secret에는 갱신본이 있지만 Pod가 이전 인증서를 메모리에 보관하면 발급 지표는 정상이어도 만료 장애가 날 수 있다. reload 설계와 외부 관측을 함께 두는 이유다.

## 실패와 복구 경계

이전 인증서로 되돌리는 조치는 그 인증서가 아직 유효하고 키가 안전한 경우에만 복구 후보가 된다. 만료되었거나 키 유출이 의심되는 인증서를 복구 수단으로 삼지 않는다. 키 유출 시에는 새 키와 인증서로 교체하고 기존 인증서 폐기를 처리한다.

cert-manager는 기본적으로 `Certificate` 삭제 시 대응 Secret을 지우지 않는다. 따라서 관리 리소스를 삭제해도 사용이 즉시 끝나지 않고 갱신만 멈출 수 있다. 서비스 종료 시 실제 참조와 잔존 Secret을 함께 확인한다.

## 운영 판단

작은 환경의 출발점은 기존 ACME 클라이언트, 배포 연결과 만료 감시다. 여러 CA와 배포 대상 때문에 소유자 누락이나 교체 실패가 반복될 때 중앙 인벤토리와 승인 흐름을 강화한다. 이는 적용 규모에 따른 설계 판단이며 특정 CLM 제품의 도입을 전제하지 않는다.

확인 질문: 인증서 갱신 작업이 성공했는데 외부 응답은 이전 인증서라면, 저장소 갱신, TLS 종료 위치와 프로세스 재적재 중 어느 증거부터 확인할 것인가?

## 출처

- [NIST, SP 1800-16B: TLS Server Certificate Management](https://www.nccoe.nist.gov/publication/1800-16/VolB/index.html)
- [CA/Browser Forum, Baseline Requirements for TLS Server Certificates](https://cabforum.org/working-groups/server/baseline-requirements/requirements/)
- [Certbot, User Guide: Renewing certificates](https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates)
- [cert-manager, Certificate resource](https://cert-manager.io/docs/usage/certificate/)

## 관련 문서

- [[ACME-Protocol|ACME 발급과 갱신]]
- [[TLS-Config|TLS 배포와 검증]]
- [[HSM-Key-Custody|HSM과 키 보관]]
- [[Secret-Management|시크릿 관리]]
