---
tags: [security, crypto, post-quantum, pqc, crypto-inventory, cbom, crypto-agility, ai-agent]
status: done
verified_at: 2026-11-23
category: "Security - 암호"
aliases: ["PQC Discovery and Execution", "Cryptographic Discovery", "암호 발견", "암호 인벤토리 레코드", "CBOM 기반 통합 인벤토리", "Agentic Crypto Migration", "에이전트 기반 암호 전환"]
---

# PQC 전환 실행: 암호 발견, 통합 인벤토리와 에이전트 기반 전환

PQC 전환의 실행은 교체가 아니라 발견에서 시작한다. 찾지 못한 암호는 바꿀 수도 없고, 바꿨는지 확인할 수도 없다. 이 문서는 [[PQC-Migration|양자내성암호(PQC) 전환]]의 실행 구조 중 발견, 인벤토리와 자동화된 전환을 구체화한다. 위협 모델, 전환 일정, 우선순위 기준과 하이브리드 판단은 그 문서에 있다.

2026-11-23 아래 출처의 표준과 정부 문서를 대조했다. 인벤토리 필드, 수명주기별 발견과 에이전트 기반 전환의 단계 구성은 2026년 9월 삼성SDS 발표 자료의 구조를 일반화했다.

## 자산 목록은 암호 목록이 아니다

NIST CSF 2.0의 ID.AM-02는 조직이 관리하는 소프트웨어, 서비스와 시스템의 목록을 유지하라고 요구한다. SAM, CMDB, SBOM과 SCA는 이 목록을 구성요소, 버전, 공급자와 의존성 중심으로 채운다. 이 목록은 무엇이 있는지를 답하지만, 그 안에서 어떤 알고리즘을 어떤 키 길이로 어디에 쓰는지는 답하지 못한다. 그래서 기존 도구를 대체하지 않고 그 위에 암호 계층의 가시성을 더한다.

- **무엇을 암호 시스템으로 세는가**: 미국 OMB M-23-02(2022-11-18)는 암호 시스템을 암호화 키의 생성과 교환, 암호화된 연결, 디지털 서명의 생성과 검증 중 하나 이상을 제공하는 암호 알고리즘의 활성(active) 소프트웨어나 하드웨어 구현으로 정의하고, 인벤토리 시점에 쓰이지 않는 구현은 넣지 말라고 했다. 평소에는 쓰이지 않아도 레거시 클라이언트 지원처럼 운영 중 쓰일 수 있으면 사용 중으로 본다. 같은 메모는 연방기관에 국가안보시스템을 뺀 정보 시스템과 자산 가운데 양자 취약 암호 시스템을 가진 것의 우선순위 목록을 2023-05-04부터 2035년까지(후속 지침이 바꾸기 전까지) 매년 내게 했다.
- **구현과 사용은 다르다**: CycloneDX 1.6의 `dependencies.provides`는 암호 라이브러리가 어떤 알고리즘을 구현하는지 적는 필드다. 명세는 어떤 구성요소가 무엇을 구현한다는 사실이 그 구현이 쓰이고 있다는 뜻은 아니라고 명시한다. 라이브러리 목록만으로는 실제로 쓰이는 알고리즘을 알 수 없으므로 실행 중 관찰과 네트워크 관찰을 더한다(해석).

## 인벤토리 레코드에 담을 항목

항목 구성은 SW 인벤토리와 대비한 암호 인벤토리의 필드를 따랐고(발표 자료), 양자 보안 수준 행은 CycloneDX 필드에서 더했다. 담을 곳은 CycloneDX 1.6 JSON 명세와 대조했다.

| 항목 | 예 | CycloneDX 1.6에서 담는 곳 | 쓰임 |
|---|---|---|---|
| 알고리즘 | RSA, ECDSA, AES, SHA, ML-KEM | `cryptoProperties`의 algorithm 자산, primitive, 파라미터 세트 | 교체 대상 판정 |
| 키와 파라미터 | 키 길이, 곡선 | algorithm 속성, related-crypto-material(키) | 같은 알고리즘 안의 강도 차이 |
| 양자 보안 수준 | NIST 보안 범주 | `nistQuantumSecurityLevel`. 0은 어떤 범주도 충족하지 못한다는 뜻 | 양자 취약 표시 |
| 구현 라이브러리 | OpenSSL, JCA/JCE | 구성요소와 `dependencies.provides` | 라이브러리 교체로 끝나는지 |
| 위치와 연결 | 하드웨어, 소프트웨어, 서비스 | `bom-ref`로 잇는 의존 관계 | 영향 범위 |
| 프로토콜 | TLS, SSH, IPsec, IKE | protocol 자산의 type, version, cipherSuites | 협상 경로 |
| 인증서 | 발급자, 만료, 체인 | certificate 자산의 subjectName, issuerName, notValidBefore, notValidAfter, signatureAlgorithmRef | 인증서 교체 일정과 연동 |
| 용도 | 키 교환, 서명 | primitive(kem, signature 등)와 cryptoFunctions | 키 수립 먼저 원칙 적용 |
| 전환 평가 | 취약, 준비됨, 우선순위 | 표준 필드가 아니므로 조직의 확장 속성으로 둔다(운영 제안) | 전환 대상 선정 |

CycloneDX는 Ecma 표준이기도 하다. ECMA-424 2판(2025-12)은 CycloneDX 1.7을 정의하고 1판은 2024-06에 나왔으며, ISO/IEC DIS 27055로도 진행 중이다. 1.7에서 바뀐 암호 필드는 대조하지 않았다. 레코드를 어느 판에 맞출지 정하고, 도구가 내보내는 판을 확인한다(운영 제안).

## 관찰 위치를 합쳐 하나의 인벤토리로

개발부터 운영까지 단계마다 보이는 암호가 다르다. 호스트의 파일과 바이너리 스캔을 포함한 관찰 위치별 장단은 [[PQC-Migration#발견과 암호 인벤토리|발견과 암호 인벤토리]]의 표에 있고, 여기서는 수명주기 순서로 본다.

| 단계 | 관찰 대상 | 방법 | 새로 보이는 것 |
|---|---|---|---|
| 계획과 개발 | 개발자가 쓴 소스, 내려받은 라이브러리 | 소스의 암호 API 호출 정적 분석, 의존성 분석 | 자체 코드의 직접 호출과 라이브러리 버전 |
| 검증과 사전 운영 | 실행 중인 애플리케이션 | 실행 중 호출된 암호 API의 동적 분석(서드파티 포함) | 설정이나 서드파티가 실제로 고른 알고리즘과 파라미터 |
| 배포와 운영 | 접속할 수 있는 서비스 | 접속해 프로토콜 설정을 확인하는 능동 스캔 | 서버가 지원하는 프로토콜, 알고리즘과 인증서 |
| 감시 | 운영 네트워크의 패킷 | 수집한 패킷의 수동 분석 | 실제로 협상된 값 |

- **동적 분석이 메우는 틈(해석)**: 정적 분석은 설정 파일로 고르는 알고리즘과 소스 없는 서드파티 호출을 놓치고, 네트워크 관찰은 저장 데이터 암호화와 내부 서명 로직을 보지 못한다. 실행 중 호출을 기록하면 두 틈이 줄지만 시험이 실행한 경로만 보인다. NIST NCCoE SP 1800-38B 예비 초안(2023-12)도 애플리케이션 실행 중 암호 엔진과 알고리즘 사용을 동적으로 기록하는 도구를 발견 수단의 예로 든다.
- **능동과 수동의 정확도**: 같은 초안은 일부 TLS ALPN 식별자가 감시를 어렵게 하려고 겹쳐 쓰이므로(DNS over HTTPS가 HTTPS의 ALPN ID를 쓴다) 서버가 지원하는 응용 프로토콜은 능동 스캔이 수동 감시보다 정확하게 잰다고 본다. 실제로 무엇이 협상됐는지는 반대로 수동 관찰이 보여 준다(해석). 포트와 프로토콜도 일대일이 아니다. 초안은 한 프로토콜이 여러 포트에 나타날 수 있다며, 443은 HTTPS로 등록돼 있지만 HTTPS는 다른 등록 서비스 이름으로도 쓰이고 TLS는 HTTPS가 아닌 프로토콜에도 등록돼 있다는 예를 든다.
- **정규화**: 도구마다 결과 형식이 달라 같은 호스트를 `host.example.com:443`과 `host.example.com`으로 다르게 적는다. 초안은 스키마 대신 비교할 데이터 요소를 정했다. IP 주소, 목적지 포트, 호스트 이름, 서비스 이름이나 TLS ALPN ID로 적는 응용 계층 프로토콜, CPE 2.3으로 적는 응용 소프트웨어와 OS와 장비 제조사다. 발견 결과는 EDR 같은 기존 보안 제품의 보고와 묶어 전사 대시보드에서 위험을 판단하게 했다.

## 에이전트로 전환을 가속하고 발견으로 검증한다

자동화 구조는 다음 순서로 돈다(발표 자료).

1. **거버넌스와 암호 정책**: 표준(허용 알고리즘과 파라미터), 우선순위와 일정, 예외, 준수 규칙을 정한다. 이 정책이 두 에이전트의 입력이다.
2. **발견과 지속 감시 에이전트**: LLM에 스킬과 발견 도구를 붙여 위 관찰 위치의 결과를 모으고 정책 위반을 찾는다.
3. **전환 에이전트**: 코드 에이전트에 스킬과 전환 도구를 붙여 코드와 설정을 바꾼다.
4. **결과 검증과 지속 감시**: 바뀐 결과를 다시 발견 단계로 돌려 확인하고, 새로 들어온 취약 알고리즘을 계속 찾는다.

설계할 때 볼 것(설계 판단):

- **바꾼 주체와 확인하는 관찰을 나눈다**: 전환 에이전트의 보고로 완료 처리하지 않고, 정적 분석, 실행 중 기록과 네트워크 관찰로 실제로 협상되는 알고리즘이 바뀌었는지 본다. 수행과 검증을 분리하는 일반 원칙은 [[Vulnerability-Operations-AI-Agents|취약점 운영과 AI 에이전트]]와 [[Agentic-Verification|에이전트 검증]]에 있다.
- **에이전트가 정책을 만들지 않게 한다**: 허용 알고리즘, 하이브리드 여부와 예외는 거버넌스 정책에서만 온다. 에이전트가 호환성 문제를 이유로 예외를 스스로 추가하지 못하게 하고, 예외에는 승인자와 만료일을 둔다.
- **코드로 끝나지 않는 일을 따로 센다**: 상대 시스템과의 협상, 인증서 체인 재발급, HSM과 KMS의 키 유형, 하드웨어 교체는 코드 에이전트가 고칠 수 없다. 이런 항목은 별도 작업 목록과 담당자로 관리한다([[Certificate-Lifecycle-Management|인증서 수명주기 관리]], [[HSM-Signing-Operations|HSM 서명 운영]]).
- **되돌림 경로를 함께 남긴다**: 크기와 성능 영향으로 실패할 수 있으므로 변경마다 되돌리는 방법을 같이 기록한다.

목표는 한 번의 PQC 전환이 아니라 계속 도는 암호 민첩성(crypto agility) 운영이다. 정의와 구현 조건은 [[PQC-Migration#지속적인 암호 민첩성|지속적인 암호 민첩성]]에 있다.

## 시작 순서

첫 실행은 마스터 플랜, 암호 인벤토리, 파일럿의 세 단계로 시작한다(발표 자료).

| 단계 | 할 일 |
|---|---|
| 마스터 플랜 | 보안, IT 기획, 개발과 운영, 구매가 함께하는 협업 체계, 전환 우선순위, 로드맵과 예산 |
| 암호 인벤토리 | IT 시스템 전 주기의 암호 사용 현황 분석, 지속 감시 체계 |
| 파일럿 | 신규 도입 SW와 HW에 PQC 요구, 신규 개발 SW에 PQC 탑재, 기존 시스템의 PoC와 파일럿 |

공식 문서의 첫 단계도 같은 방향이다. EU 조율 이행 로드맵(Part 1, 1.1판, 2025-06-11)은 2026년 말까지 마칠 First Steps로 이해관계자 확인과 참여, 성숙한 암호 자산 관리, 의존성 지도, 양자 위험 분석, 공급망 포함, 인식 제고와 소통 프로그램, 지식 공유, 일정과 이행 계획을 든다. 미국 OMB M-26-15는 연방기관에 메모 발행 뒤 120일 안에 PQC 전환 계획을 OMB와 ONCD에 내게 했고, 첫 단계(2026~2027)를 전략, 계획과 발견으로 둔다.

## 암호가 숨어 있는 곳

발견 범위를 잡을 때 쓰는 점검표다. 업무 흐름의 예는 발표 자료에서 가져왔고, 교체 대상 구분은 NIST IR 8547의 기준(양자 취약 공개키는 교체하고 128비트 이상의 대칭 알고리즘과 해시는 교체 대상에 넣지 않는다, [[PQC-Migration#무엇이 언제 위험한가|무엇이 언제 위험한가]])을 적용한 해석이다.

| 업무 흐름 | 쓰이는 암호의 예 | 교체 대상 | 그대로 둘 수 있는 것 |
|---|---|---|---|
| 로그인과 SSO | 인증서, FIDO 인증기 서명, Kerberos PKINIT | 인증서와 인증기의 공개키 서명, PKINIT의 공개키 | 패스워드 해시, 대칭키 기반 Kerberos 티켓 |
| 메일과 메신저 | TLS, S/MIME, 종단 간 암호화의 키 합의 | 키 합의와 서명 | 본문의 대칭 암호화 |
| 업무 시스템 | HTTPS, JWT, OAuth | TLS 키 교환, 비대칭 서명 JWT(RS256, ES256) | HMAC 서명 JWT(HS256) |
| 파일 저장과 공유 | 저장 데이터 AES, 전송 TLS | 전송 구간 키 교환, 데이터 키를 감싼 공개키 | AES 데이터 암호화 |
| 네트워크와 클라우드 | IPsec과 IKE, VPN, 클라우드 KMS | IKE 키 교환, KMS의 비대칭 키 | 대칭 데이터 키 |
| 배포와 업데이트 | 코드 서명, 펌웨어 서명, secure boot | 서명 키와 검증 키 전부 | 서명에 쓰는 해시 함수 |

## 사례: 삼성SDS 발표 (2026년 9월)

- 개발 단계의 정적 분석, 운영 단계의 웹 서버와 WAS, DB와 스토리지, 서버와 클라우드에 대한 동적 분석, 네트워크 프로토콜 분석과 패킷 파일 분석 결과를 CBOM 기반 통합 인벤토리로 모으는 자사 플랫폼을 소개했다. 탐지율이나 처리 규모 같은 성과 수치는 발표에 없다.
- NIST NCCoE의 Migration to PQC 프로젝트에 초기부터 참여했다고 밝혔다. SP 1800-38B 예비 초안의 저자와 기술 협력 기관 목록에 삼성SDS가 있음을 확인했다. 발표의 아시아 유일과 참여사 약 60곳이라는 표현은 대조하지 않았다.

## 확인 질문

- 인벤토리가 구성요소 목록에서 멈췄는가, 알고리즘, 파라미터, 프로토콜, 인증서와 용도까지 내려갔는가?
- 라이브러리가 구현한 알고리즘과 실제로 호출되거나 협상된 알고리즘을 구분해 기록하는가?
- 도구별 결과를 같은 호스트와 서비스로 묶는 정규화 규칙이 있는가?
- 전환 에이전트의 변경을 누가 어떤 관찰로 확인하는가? 에이전트가 예외를 만들 수 있는가?
- 코드 밖의 전환 작업(상대 시스템, 인증서, HSM, 하드웨어)에 담당자와 일정이 있는가?
- 신규 도입 계약과 신규 개발에 PQC 요구가 들어가 전환 대상이 늘지 않게 막고 있는가?

## 출처

- [Making PQC REAL — 삼성SDS REAL Summit 2026 발표 자료, 삼성SDS](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/AX%EC%A0%84%EB%9E%B5_1-7_Making%20PQC%20REAL_%EC%9C%A4%ED%9A%A8%EC%A7%84%EC%83%81%EB%AC%B4_%EB%B0%B0%ED%8F%AC%EB%B3%B8.pdf) — 2026년 9월 발표. 암호 인벤토리 필드, 수명주기별 발견, 에이전트 기반 전환 구조, 시작 순서와 점검표의 업무 흐름 예
- [CycloneDX, CycloneDX v1.6 JSON Reference](https://cyclonedx.org/docs/1.6/json/) — 2026-11-23 cryptoProperties의 algorithm, certificate, protocol 속성, nistQuantumSecurityLevel, dependencies.provides 대조
- [Ecma International, ECMA-424: CycloneDX Bill of materials specification](https://ecma-international.org/publications-and-standards/standards/ecma-424/) — 2판 2025-12(CycloneDX 1.7), 1판 2024-06
- [NIST NCCoE, SP 1800-38B Preliminary Draft: Quantum Readiness: Cryptographic Discovery](https://www.nccoe.nist.gov/sites/default/files/2023-12/pqc-migration-nist-sp-1800-38b-preliminary-draft.pdf) — 2023-12. 4.1.3, 4.1.4절의 능동과 수동 발견, 정규화 데이터 요소, 동적 수집 도구 예, 협력 기관 목록
- [NIST, The NIST Cybersecurity Framework (CSF) 2.0](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) — Appendix A의 ID.AM-02
- [OMB, M-23-02: Migrating to Post-Quantum Cryptography](https://bidenwhitehouse.archives.gov/wp-content/uploads/2022/11/M-23-02-M-Memo-on-Migrating-to-Post-Quantum-Cryptography.pdf) — 2022-11-18. 암호 시스템 정의와 연간 우선순위 인벤토리
- [OMB, M-26-15: Execution of the Migration to Post-Quantum Cryptography](https://www.whitehouse.gov/wp-content/uploads/2026/06/M-26-15-Execution-of-the-Migration-to-Post-Quantum-Cryptography.pdf) — 2026-06-24. 120일 안의 전환 계획 제출과 1단계
- [EU NIS Cooperation Group, A Coordinated Implementation Roadmap for the Transition to Post-Quantum Cryptography](https://digital-strategy.ec.europa.eu/en/library/coordinated-implementation-roadmap-transition-post-quantum-cryptography) — Part 1, 1.1판(2025-06-11), 2025-06-23 공개. Milestone 1의 First Steps
- [IETF, RFC 4556: Public Key Cryptography for Initial Authentication in Kerberos (PKINIT)](https://www.rfc-editor.org/rfc/rfc4556.html)
- [IETF, RFC 7518: JSON Web Algorithms (JWA)](https://www.rfc-editor.org/rfc/rfc7518.html) — HS256, RS256, ES256

## 관련 문서

- [[PQC-Migration|양자내성암호(PQC) 전환 (위협, 일정, 우선순위, 하이브리드)]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캐닝 (SBOM과 SCA)]]
- [[Certificate-Lifecycle-Management|인증서 수명주기 관리]]
- [[HSM-Signing-Operations|HSM 서명 운영과 무중단 키 전환]]
- [[Vulnerability-Operations-AI-Agents|취약점 운영과 보안팀의 AI 에이전트 활용]]
- [[Agentic-Verification|에이전트 검증]]
- [[TLS-Config|TLS 설정 (하이브리드 키 교환)]]
- [[Public-Key|공개키 암호 인덱스]]
