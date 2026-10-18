---
tags: [palantir, foundry, security, governance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry identity, 복구와 공동 책임"]
---

# Foundry identity, 복구와 공동 책임

Fully managed Foundry와 self-hosted 설치는 보안 책임이 다르다. 관리형 제품의 보안 기능이 고객 데이터의 목적 적합성, source backup이나 사용자 권한 구성을 대신하지 않는다.

## Identity와 session

고객은 IdP/SSO 계정 lifecycle과 강한 MFA를 관리한다. Named account, 적절한 session lifetime, device posture와 조건부 재인증을 결합하고 IP 위치 하나만으로 신뢰하지 않는다. Service account에는 책임자, 최소 권한, credential 저장/회전과 사용 감시가 필요하다.

Central Auth는 Palantir가 관리하는 Entra ID 기반 대안이다. Provision/deprovision을 맡더라도 group/marking 등 플랫폼 권한은 고객이 관리한다. 장기 미사용 계정은 30일 이후 비활성화될 수 있다고 설명한다.

Emulation mode(Beta)는 기존 group/marking의 subset으로 session을 제한해 시험한다. Organization과 user attribute는 바꾸지 않으므로 임의의 다른 사용자를 완전히 impersonate하는 기능이 아니다. 빈 group 선택도 가능하며 inherited group/marking이 남을 수 있다.

## Token과 유출

User token은 사용자 문맥의 platform API 권한과 TTL을 갖지만 다른 user token을 만들 수 없다. 생성에는 session token이 필요하다. Session cookie의 기본 TTL 설명은 16시간이며 이것을 모든 정책/환경의 고정값으로 확대하지 않는다.

Data connector deployment archive에도 인증 material이 포함될 수 있고 agent에 source credential이 로컬 저장될 수 있다. Token을 script/명령행 인자/버전 관리에 넣지 않고 storage와 rotation 범위를 정한다. 유출 시 revoke와 incident 대응을 함께 수행한다.

GitHub 공개 repo 유출 감지 서비스는 자동 revoke를 시도하지만 설치가 네트워크에서 닿지 않으면 실패할 수 있고 알림을 보장하지 않는다. 자동 서비스가 있으므로 유출 대응이 완료되었다고 판단하지 않는다.

## HA와 backup

Fully managed cloud는 한 region의 여러 AZ active-active로 single-node/AZ 장애를 견디도록 구성한다. Region 전체 재해, 모든 운영 오삭제와 무중단 성능을 같은 보장으로 확장하지 않는다. 잘못된 삭제/손상도 replica에 전파될 수 있어 HA와 backup이 모두 필요하다.

Rescue backup은 catalog/Ontology metadata, object edits, code/app configuration 등의 platform state를 보호하고 기본 retention은 7일이며 요청으로 변경할 수 있다. 이 DB metadata backup이 object storage의 모든 customer file을 포함하는 것은 아니다. 해당 파일은 cloud-native durability/versioning 등 별도 수단으로 보호하며 고객 source system의 integrity/backup은 고객 책임이다.

Self-hosted는 physical/network isolation, storage encryption, egress allowlist, bastion/MFA, patching, host monitoring과 encrypted/offline backup을 고객 환경에서 검토한다. 공식 가이드의 TLS/patch interval 수치는 2026-10-16 제품 권고 범위이며 별도 일반 보안 표준을 검증한 문서는 아니다. Apollo 연결 여부에 따라 업데이트 책임도 달라진다.

## 파일, dependency와 대응

Foundry upload는 실행 격리 등을 제공하지만 위험 확장자를 blanket 차단하거나 모든 파일이 malware-free라고 보장하지 않는다. 고객 endpoint/network antimalware와 browser 보호를 함께 사용한다.

Palantir가 공통 package의 패치를 제공해도 user-authored dependency version 관리는 고객 책임이다. 극단적 취약점 대응은 breaking upgrade가 사전 통지 없이 적용될 수 있다. Hosted CIRT 모니터링과 고객의 업무 문맥 audit를 함께 운용한다.

진행 중 incident는 담당 지원 경로로 즉시 전달하고, 제품 취약점은 범위/재현 정보를 정리해 공식 disclosure 경로를 사용한다. 실제 token, account, backup 또는 통신을 변경하거나 대응 성공을 검증한 것은 아니다.

## 출처

- [Palantir Security, disaster-recovery](https://www.palantir.com/docs/foundry/security/disaster-recovery)
- [Palantir Security, emulation-mode](https://www.palantir.com/docs/foundry/security/emulation-mode)
- [Palantir Security, monitor-for-vulnerabilities](https://www.palantir.com/docs/foundry/security/monitor-for-vulnerabilities)
- [Palantir Security, protect-data-connector-installation](https://www.palantir.com/docs/foundry/security/protect-data-connector-installation)
- [Palantir Security, protect-foundry-installation](https://www.palantir.com/docs/foundry/security/protect-foundry-installation)
- [Palantir Security, protect-malicious-files](https://www.palantir.com/docs/foundry/security/protect-malicious-files)
- [Palantir Security, protect-phishing](https://www.palantir.com/docs/foundry/security/protect-phishing)
- [Palantir Security, protect-tokens-api-keys](https://www.palantir.com/docs/foundry/security/protect-tokens-api-keys)
- [Palantir Security, report-security-concerns](https://www.palantir.com/docs/foundry/security/report-security-concerns)
- [Palantir Security, shared-security-responsibility-model](https://www.palantir.com/docs/foundry/security/shared-security-responsibility-model)
- [Palantir Security, single-sign-on-security](https://www.palantir.com/docs/foundry/security/single-sign-on-security)

## 관련 문서

- [[Palantir-Security-Governance]]
- [[Palantir-Security-Control-Propagation|Foundry 접근 제어의 전파와 읽기 경계]]
- [[Palantir-Security-Projects-Roles-and-Collaboration|Foundry Project, role과 조직 경계]]
- [[Palantir-Security-Audit-Schema-and-Delivery|Foundry audit schema, 전달과 증거 해석]]
- [[Palantir-Security-Privacy-Downloads-and-Justification|Foundry 데이터 최소화, 다운로드와 정당화]]
- [[Palantir-Security-Code-Scanning-Contracts|Foundry code scanning의 규칙과 검증 범위]]
