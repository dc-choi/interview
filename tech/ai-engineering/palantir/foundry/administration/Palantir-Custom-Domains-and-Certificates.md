---
tags: [palantir, domain, tls, certificate, migration]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry custom domain과 인증서"]
---

# Foundry custom domain과 인증서 전환

Custom domain self-service는 2026년 2월 기준 새 customer-managed domain에 제공되며 기존 support-managed domain과 일부 enrollment는 지원 요청이 필요하다. Enrollment Administrator/Information Security Officer의 관련 권한으로 Control Panel에서 CSR, 인증서와 domain을 관리한다. Palantir-owned domain은 self-service 변경 대상이 아니다.

2025년 3월 도입 공지는 기존 domain 제외 기준을 February 2025로 설명하지만 현재 전용 문서는 February 2026을 기준으로 적는다. 동일한 eligibility 기준이 유지됐다고 단정하지 않고 현재 enrollment의 전용 설정/지원 경로를 확인한다. 과거 announcement의 cutoff를 현재 운영 절차에 그대로 적용하지 않는다.

## CSR과 실제 인증서를 맞춘다

CSR에 CN/SAN과 필요 조직 정보를 입력하고 PEM CSR을 내려받아 외부 CA에서 서명한다. 업로드 인증서는 다음을 만족해야 한다.

- 30일 이내에 만료되지 않는다.
- PEM이며 CSR의 CN/SAN과 정확히 맞는다.
- SHA256withRSA와 Palantir가 승인한 root CA trust chain을 사용한다.
- 브라우저가 신뢰하고 intermediate chain이 빠지지 않는다.

Leaf와 intermediate 파일을 따로 내면 순서는 자유지만 합친 PEM 하나라면 leaf 다음 intermediate 순서다. Self-signed/custom CA, algorithm, CSR 불일치와 짧은 expiry는 서로 다른 검증 오류이므로 CA와 chain을 먼저 구별한다.

## DNS와 인증 provider 전환을 완료한다

Certificate 등록 뒤 platform access를 즉시 열거나 건너뛰고 나중에 domain을 구성할 수 있다. Registrar에서 안내 CNAME을 설정한다. Artifact website 전용 domain과 platform host의 용도도 구분한다.

기존 domain 설정 복사는 ingress allowlist와 조직 사용 목록을 가져오며 auth provider 연결은 선택적으로 추가한다. 예전 domain은 수동 삭제 전까지 동작한다. SAML metadata/OIDC redirect URL을 실제 IdP 쪽에서도 갱신한 뒤 Finish setup해야 전환을 완료한 상태가 된다. Foundry UI에서 생성만 성공했다고 사용자 로그인이 전환됐다고 판단하지 않는다.

Foundry를 apex domain과 그 subdomain에 동시에 host할 수 없다. Subdomain host에는 해당 CN의 인증서가 필요하고 apex용 wildcard만으로 대체할 수 없다. Artifact subdomain용 wildcard와 enrollment host 인증서를 구별한다.

## 갱신과 삭제의 의존 관계를 확인한다

Expiry 30일 전 Control Panel banner와 enrollment admin 이메일로 안내한다. Renew는 CSR/서명 단계를 다시 거쳐 기존 인증서를 교체한다. 별도 active certificate 선택도 가능하다.

Domain이 organization, authentication provider supported host 또는 active subdomain/open registration request에 쓰이면 삭제할 수 없다. 삭제를 먼저 시도하기보다 실제 소비자의 전환과 로그인을 확인한다. 인증서 제출 요건과 target domain DNS, 인증 provider 변경은 서로 다른 완료 조건이다.

## 출처

- [Palantir, Configure domains and certificates](https://www.palantir.com/docs/foundry/administration/configure-domains-and-certificates)
- [Palantir, March 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-03)

## 관련 문서

- [[Palantir-Organization-and-Session-Controls|Ingress와 조직 접근]]
- [[Palantir-Network-Egress-and-Private-Connectivity|외부 연결용 인증서]]
