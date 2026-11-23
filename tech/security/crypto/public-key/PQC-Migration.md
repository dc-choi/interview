---
tags: [security, crypto, post-quantum, pqc, migration, crypto-agility, cbom, public-key]
status: done
verified_at: 2026-11-23
category: "Security - 암호"
aliases: ["PQC Migration", "Post-Quantum Cryptography Migration", "양자내성암호 전환", "PQC 전환", "Crypto Agility", "암호 민첩성", "CBOM", "Cryptographic Bill of Materials", "암호 인벤토리", "Harvest Now Decrypt Later", "Q-Day"]
---

# 양자내성암호(PQC) 전환: 위협 모델, 일정, 인벤토리와 단계적 마이그레이션

양자내성암호(Post-Quantum Cryptography, PQC) 전환은 충분한 규모의 양자 컴퓨터에 깨지는 공개키 알고리즘을 양자 내성 알고리즘으로 바꾸는 조직 단위의 작업이다. 바꿀 알고리즘은 NIST FIPS 203~205(2024-08-13 발행)로 정해졌다. 실무의 중심은 어디에 어떤 암호가 쓰이는지 찾고, 무엇부터 바꿀지 정하고, 바꾼 뒤에도 다시 바꿀 수 있는 상태를 유지하는 일이다. 알고리즘 원리는 [[Public-Key-Cryptography#양자 위협을 구분하는 기준|공개키 암호]]에, 양자키분배(QKD)와의 비교는 [[Quantum-Key-Distribution|양자키분배]]에 있다.

2026-11-23 아래 출처의 표준, 정부 문서와 기업 발표 원문을 대조했다. 일정과 표준 상태는 이날 기준이며, 정부 원문을 찾지 못한 한국의 2023 마스터플랜만 삼성SDS 세션 브리프 인용으로 남긴다. 행정명령 번호는 Federal Register 게재본(2026-06-25)의 14412호를 따른다. 미 국방부 보도자료(2026-06-23)는 같은 제목의 명령을 14409호로 적었다.

## 무엇이 언제 위험한가

- **깨지는 대상**: 충분한 규모의 양자 컴퓨터는 Shor 알고리즘으로 소인수분해와 (타원곡선) 이산로그를 풀 수 있다. 그 위에 선 RSA, Diffie-Hellman과 ECDH, MQV, DSA, ECDSA와 EdDSA가 교체 대상이다. 키를 늘려도 양자 내성이 되지 않으며, NIST는 승인된 키 길이 전부를 같은 일정으로 퇴출한다(아래 일정).
- **대칭 암호와 해시**: NIST는 128비트 이상의 고전 보안 강도를 주는 승인 대칭 알고리즘과 해시가 양자 공격에 훨씬 덜 취약하다고 보고 교체 대상에 넣지 않는다. 112비트 수준의 일부 대칭 표준은 2030년에 금지되므로 이번에 함께 정리한다. Grover 알고리즘의 한계는 [[Cryptographic-Randomness|암호학적 난수]]에 있다.
- **기밀성은 이미 위험하다**: 공격자는 지금 암호화된 트래픽과 데이터를 모아 두었다가 암호 해독이 가능한 양자 컴퓨터(CRQC, cryptographically relevant quantum computer)가 나온 뒤 복호화할 수 있다. 이를 HNDL(harvest now, decrypt later)이라 한다. 키 합의와 키 전송으로 보호한 데이터 중 오래 비밀이어야 하는 것이 먼저다.
- **서명은 위조가 미래지만 교체는 지금 시작한다**: 서명은 HNDL의 대상이 아니다. 그래도 전환 기간이 길고 맞춰야 할 당사자가 많다. 출고 뒤 서명 검증 코드를 바꿀 수 없는 장치가 CRQC 이후에도 쓰일 수 있다면 처음부터 양자 내성 서명을 요구하게 설계해야 하므로, 펌웨어 서명과 신뢰의 뿌리가 가장 급하다. 일부 자료는 이 위험을 HNDL과 짝지어 Trust Now, Forge Later라고 부른다. 위조에 필요한 것은 지금 모아 둔 서명이 아니라 이미 공개된 검증 키이므로, 위험의 크기는 CRQC 이후에도 그 공개키를 믿는 검증자와 오래 유효해야 하는 서명 문서가 남는가로 정해진다(해석).
- **시점은 모른다**: CRQC가 나오는 시점, 흔히 Q-Day라 부르는 날은 확정할 수 없다. 미국 OMB는 CRQC가 아직 알려지지 않았지만 향후 10년 안에 나올 수 있다고 본다. 과거 암호 전환은 표준화부터 정착까지 10~20년이 걸렸다.
- **필요 자원 추정은 내려가고 있다**: 2026-03-31 Google은 256비트 타원곡선 이산로그(ECDLP-256)를 푸는 Shor 회로를 논리 큐빗 1,200개 미만과 Toffoli 게이트 9천만 개, 또는 논리 큐빗 1,450개 미만과 7천만 개로 컴파일했고, 표준적인 하드웨어 가정에서 초전도 방식 물리 큐빗 50만 개 미만으로 몇 분 안에 실행할 수 있다고 추정했다. 필요 물리 큐빗을 약 20분의 1로 줄인 값이며, 공격 회로는 공개하지 않고 영지식 증명으로 주장을 검증할 수 있게 했다. 같은 날 Caltech과 Oratomic은 재배치 가능한 중성 원자 큐빗 1만 개로도 암호에 의미 있는 규모의 Shor 알고리즘을 돌릴 수 있고, 2만 6천 개면 P-256 이산로그를 며칠 만에 풀 수 있다고 추정했다(RSA-2048 소인수분해는 10~100배 더 걸림). 둘 다 아직 없는 장치에 대한 추정이므로 Q-Day 날짜가 아니라 Z를 줄여 잡을 근거로 쓴다(해석).

Mosca 부등식이 이 판단을 식으로 쓴다. 데이터를 지켜야 하는 기간을 X, 전환에 걸리는 시간을 Y, CRQC가 나오기까지를 Z라 할 때 X + Y가 Z를 넘기 전에 전환을 시작해야 한다. Z는 몰라도 X와 Y는 조직이 추정할 수 있으므로 우선순위의 입력이 된다.

## 바꿀 알고리즘과 크기 변화

| 용도 | 기존 예(바이트) | PQC 표준 | PQC 크기(바이트) |
|---|---|---|---|
| 키 수립 | X25519 공개값 32 | ML-KEM(FIPS 203), NIST 기본 권장은 ML-KEM-768 | 캡슐화 키 1,184, 암호문 1,088 |
| 서명 | Ed25519 공개키 32, 서명 64 | ML-DSA(FIPS 204) | ML-DSA-65 공개키 1,952, 서명 3,309 |
| 해시 기반 서명 | 위와 같음 | SLH-DSA(FIPS 205) | SLH-DSA-SHA2-128s 공개키 32, 서명 7,856 |
| 예비 KEM | 해당 없음 | HQC(2025-03 선정) | 2026-10 기준 FIPS 작성 중 |

HQC는 ML-KEM의 격자와 다른 오류 정정 부호에 기반한 예비 알고리즘이며 ML-KEM을 대체하지 않는다. NIST는 HQC를 고르면서도 2024년 표준으로 계속 전환하라고 권했다.

크기가 커지면 다음이 영향을 받는다.

- TLS와 SSH 핸드셰이크, 인증서 체인의 길이와 지연. 키 합의는 하이브리드 방식(TLS의 X25519MLKEM768, SSH의 mlkem768x25519-sha256)이 이미 여러 기본 설정에 들어왔다([[TLS-Config#버전 정책|TLS 설정]], [[Application-Layer-Protocols#양자 내성 알고리즘은 키 교환부터 들어왔다|SSH]]).
- 메시지 크기 제약이 있는 프로토콜. NSA는 IKEv2의 암호화되지 않은 초기 메시지 크기 문제로 ML-KEM-1024를 그대로 넣을 수 없어, 작은 고전 키 수립 뒤 암호화된 추가 키 수립으로 ML-KEM-1024를 더하는 IETF 방식을 승인했다.
- 고정 길이 DB 컬럼, 토큰과 헤더 크기, HSM과 KMS의 키 유형 지원, 저전력 장치의 메모리와 연산 여유(해석).

## 전환 일정 (2026-11-23 기준)

| 주체와 문서 | 대상 | 시한 |
|---|---|---|
| NIST IR 8547 최종판(2026-10) | NIST 표준과 지침 | 양자 취약 공개키 알고리즘은 2030년 이후 deprecated(위험을 감수하고 사용 가능), 2035년 이후 disallowed |
| 미국 행정명령 14412호(2026-06-22), OMB M-26-15(2026-06-24) | 연방 민간 시스템, 국가안보시스템(NSS) 제외 | 고가치자산(HVA)과 고영향 시스템은 키 수립 2030-12-31, 서명 2031-12-31까지 PQC. 나머지는 2035년까지 |
| NSA CNSA 2.0 FAQ 2.2판(2026-10), CNSSP 15 | NSS | 2027-01-01부터 신규 도입에 CNSA 2.0 요구, 2030-12-31까지 미지원 장비와 서비스 퇴출, 2031-12-31까지 CNSA 2.0 사용 의무화 |
| 미 국방부(전쟁부) PQC 전략(2026-04 서명, 2026-06-23 공개) | 국방부의 모든 시스템 | 2030-12-31까지 PQC 지원 또는 퇴출, 2031-12-31까지 PQC 사용 |
| 영국 NCSC 이행 일정(2025-03-20) | 대규모 조직과 국가 핵심 기반시설 중심, 핵심 일정은 모든 조직 | 2028 목표 정의, 전체 발견, 초기 계획. 2031 최우선 전환 완료. 2035 전체 전환 |
| EU NIS 협력그룹 조율 이행 로드맵 Part 1, 1.1판(2025-06-11 작성, 2025-06-23 공개) | EU 회원국의 국가 전환. 이용 사례를 위험 수준별로 나눈다 | 2026년 말 First Steps와 국가 로드맵, 고위험과 중위험의 계획과 파일럿 착수. 2030년 말 고위험 전환 완료와 양자 안전 SW, 펌웨어 업데이트 기본값. 2035년 말 중위험 완료, 저위험은 가능한 범위까지 |
| 한국 양자과학기술 및 양자산업 육성에 관한 법률 제18조의2(2026-11-20 시행) | 중앙행정기관, 지방자치단체, 공공기관, 주요정보통신기반시설 관리기관 | 정부가 양자보안체계 구축 계획의 수립과 시행을 요구할 수 있고 요구받은 기관은 따라야 한다. 기술지침은 과기정통부가 국정원과 협의해 마련한다. 법에 연도 시한은 없다. 법의 양자보안 정의는 양자과학기술과 암호기술을 모두 포함하므로 PQC 요구 범위는 기술지침으로 확인한다 |

- **OMB 단계**: 2026~2027 전략, 계획과 발견, 2027~2028 파일럿과 초기 전환, 2028~2030 우선 시스템의 키 수립, 2031 서명, 2035 나머지 전체. 우선 시스템에는 HVA와 고영향 시스템 외에 고민감 데이터를 다루거나 CRQC 공격에 특히 취약하다고 판단한 시스템도 들어간다. 행정명령은 적용 대상 연방 계약자에게 2030-12-31까지 PQC를 포함한 FIPS 준수를 요구하는 FAR 개정안을 180일 안에 내게 했다.
- **CNSA 2.0 판 차이**: 2022-09 발표문은 분야별로 2030~2033년까지 CNSA 2.0만 쓰게 했다. CNSSP 15 개정을 반영한 FAQ 2.2판의 시한과 섞어 인용하지 않는다.
- **출발점**: 미국 NSM-10(2022-05-04)이 2035년까지 양자 위험을 가능한 한 줄인다는 목표를 세웠고, OMB M-23-02(2022-11-18)가 연방기관에 양자 취약 암호 시스템의 우선순위 인벤토리를 2023-05-04부터 매년 내게 했다. EU 로드맵은 NIST IR 8547 초안의 2035년이 NSM-10 목표에서 왔고 영국 NCSC도 2035년을 잡았다는 점을 자기 2035년 마일스톤의 근거로 든다.
- **EU 하이브리드 기준**: 같은 로드맵은 표준화되고 시험된 하이브리드를 권하고, 고위험 이용 사례는 2030년 말, 중위험은 2035년 말 이후 양자 취약 공개키 방식을 단독으로 쓰지 않게 했다. 오래 지켜야 하는 기밀성과 소프트웨어 업데이트 서명을 고위험의 예로 들어 늦어도 2030년 말까지 전환을 마치라고 한다.
- **한국 마스터플랜**: 2023-07 범국가 양자내성암호 전환 마스터플랜은 2030년까지 전환 이행 기반을 마련하고 2035년까지 기술과 정책 지원체계를 갖춰 안전한 암호체계를 구현한다는 계획으로 소개됐다(삼성SDS 세션 브리프 인용, 정부 원문 미대조).
- **기업 목표**: Google은 PQC 전환 시점을 2029년으로 잡고 인증 서비스를 우선했다(2026-03). Cloudflare는 인증을 포함한 전면 전환을 2029년 목표로 밝히며 자사로 들어오는 사람 트래픽의 65% 이상이 이미 양자 내성 암호화로 보호된다고 했다(2026-04). Microsoft는 2029년 조기 도입, 2033년 완료(2025-08) 계획을 제품과 서비스의 2029년 전환으로 앞당겼다(2026-06).

시한마다 적용 범위가 다르다. 우리 조직과 고객, 상위 공급망이 각각 어느 범위에 걸리는지 따로 확인한다. 미국 연방 조달이나 NSS 납품에 걸린 공급사는 국내 제도보다 먼저 요구를 받을 수 있다.

## 실행 구조: 거버넌스, 발견, 마이그레이션, 지속적 민첩성

네 갈래는 순서대로 끝내는 단계가 아니라 함께 굴리는 작업이다. 발견 결과가 우선순위를 바꾸고, 새 시스템이 들어오면 다시 발견한다.

### 거버넌스

- **책임**: 보안팀만의 과제가 아니다. OMB M-26-15는 CIO와 CISO만이 아니라 리더십과 시스템 소유자 모두에게 책임을 나누고, CFO가 전환 비용을 예산 요청에 반영하는 역할 예시를 든다. IT 기획, 개발과 운영, 구매가 함께 움직인다.
- **정책**: 허용 알고리즘과 파라미터, 하이브리드 사용 여부, 예외 승인, 위험 평가 기준을 정한다.
- **조달**: 신규 하드웨어와 소프트웨어 요구사항에 PQC 지원과 교체 가능성을 넣어 전환 대상이 늘어나지 않게 한다. 펌웨어 업데이트 경로처럼 구매 뒤 바꿀 수 없는 기능은 구매 시점에 양자 내성인지 확인한다.
- **공급사와 클라우드**: 상용 제품, 오픈소스와 클라우드의 전환 계획을 파악한다. 관리형 서비스는 공유 책임 모델에서 PQC 전환 책임의 경계를 정하고, 서비스 제공자도 같은 평가를 하는지 확인한다.

### 발견과 암호 인벤토리

암호 인벤토리는 조직의 시스템이 어떤 암호를 어디에 쓰는지 기술한 기록이다. 찾지 못한 암호는 우선순위를 정할 수도 옮길 수도 없다. HW/SW 자산 목록에서 멈추지 않고 실제로 쓰는 알고리즘, 파라미터, 키와 인증서, 프로토콜까지 내려간다. 관찰 위치마다 보이는 범위가 달라 여러 방법을 겹친다. 인벤토리 레코드에 담을 항목, 실행 중 동적 분석과 에이전트 기반 전환 자동화는 [[PQC-Discovery-and-Execution|PQC 전환 실행]]에 있다.

| 관찰 위치 | 방법 | 잘 보이는 것 | 놓치기 쉬운 것(해석) |
|---|---|---|---|
| 개발 파이프라인 | 소스 정적 분석, 의존성 SCA와 SBOM, 빌드 산출물 검사 | 직접 호출, 라이브러리 버전, 머지 전 새 취약 암호 | 설정으로 고르는 알고리즘, 소스 없는 서드파티 |
| 운영 중 호스트와 애플리케이션 | 파일시스템과 바이너리 스캔, EDR 연동 | 서드파티 바이너리와 번들 라이브러리, 설치된 키와 인증서 | 실제로 협상되는 알고리즘 |
| 네트워크 | TLS, SSH 서버 능동 스캔, 미러링과 패킷 캡처의 수동 분석 | 실제 협상된 프로토콜과 알고리즘, 오가는 인증서 | 저장 데이터 암호화, 내부 서명 로직 |

도구마다 결과 형식이 달라 같은 호스트도 다르게 표기하므로 정규화가 필요하다. 암호 자산을 기술하는 공통 형식이 CBOM(Cryptographic Bill of Materials)이다.

- CycloneDX 1.6(2024-04)이 CBOM을 도입했다. 암호 자산 유형은 algorithm, certificate, protocol, related-crypto-material(키 등)이고, 알고리즘에는 primitive(kem, signature, key-agree 등), 파라미터 세트와 NIST 양자 보안 범주를 기록한다. 구성요소와의 의존 관계로 어느 소프트웨어가 어느 암호를 쓰는지 잇는다.
- SBOM이 무엇이 들어 있는지의 목록이라면 CBOM은 그 안에서 어떤 암호를 어떻게 쓰는지의 목록이다. SBOM 운영은 [[Dependency-Vulnerability-Scanning|의존성 취약점 스캐닝]]에 있다.
- 미국 행정명령 14412호는 CISA와 NIST에 자동 평가가 가능한 CBOM 최소 요소 지침을 270일 안에 공개하게 했다.
- 인벤토리는 한 번 만드는 문서가 아니라 자동으로 계속 갱신하는 데이터다. OMB는 자동 수집 결과를 중앙 CBOM과 대시보드로 모으도록 권고한다. NCSC는 발견을 공식 자산 대장 작성이 아니라 시스템의 성격, 버전과 패치 수준을 파악하는 일로 본다.

### 우선순위

전사 인벤토리를 다 만든 뒤에 시작하지 않는다. 아래 기준으로 먼저 볼 시스템을 고르고, 그 시스템부터 인벤토리를 만들어 범위를 넓힌다. 쌓인 인벤토리가 무엇을 먼저 바꿀지의 근거가 된다.

| 기준 | 높게 보는 경우 | 근거 |
|---|---|---|
| 데이터 보호 기간(Mosca의 X) | 장기 기밀 데이터, 2030년에도 임무상 민감할 것으로 예상되는 데이터 | HNDL, OMB M-26-15 |
| 업무 중요도 | 고가치자산, 기밀성, 무결성, 가용성 중 하나라도 영향도가 high인 시스템, 핵심 통신 | 행정명령 14412호, NCSC |
| 외부 노출 | 공용망을 지나는 트래픽과 외부 접점 | 수집이 쉬움(해석) |
| 신뢰의 뿌리 | 공개키 기반 접근 제어와 PKI, 펌웨어와 코드 서명 | OMB M-26-15, NSA |
| 교체 소요(Mosca의 Y) | 업데이트할 수 없는 장치, 하드웨어 교체가 필요한 시스템, 공급사 계획이 없는 제품 | OMB는 PQC나 하이브리드를 지원하지 못하는 시스템을 교체나 폐기 우선 대상으로 지정하게 한다 |

### 마이그레이션

1. **영향 분석**: 크기 증가가 닿는 지점, 상대 시스템과 클라이언트의 지원 여부, 성능 예산을 확인하고 되돌림 계획을 세운다.
2. **PoC와 파일럿**: 대표 경로에서 성능과 상호운용성을 시험한다.
3. **키 수립 먼저**: HNDL 때문에 키 합의를 먼저 옮기고 서명이 뒤따른다. 행정명령 14412호도 키 수립(2030)과 서명(2031)의 시한을 나눴다. 기밀성만 옮기고 인증을 남긴 상태는 완료가 아니며, 미 국방부 전략은 이런 해법을 완전한 PQC로 보지 않는다.
4. **서명과 PKI**: NSA는 해시 함수 교체나 RSA에서 ECC로의 전환 때처럼 기존 PKI에 알고리즘을 덧붙이기보다 새 알고리즘의 병렬 PKI를 세워 옮기는 방식을 관례로 든다. 인증서 일괄 교체 역량은 [[Certificate-Lifecycle-Management#긴급 교체와 감사 기록|인증서 수명주기 관리]]와 같은 축이다.
5. **단계 적용과 감시**: 우선순위가 높은 시스템부터 정책을 반영하고 자동화 도구로 옮긴 뒤, 인벤토리로 누락과 새로 들어온 취약 알고리즘을 계속 찾는다.

하이브리드(고전 알고리즘과 PQC를 함께 쓰는 방식)는 둘 중 하나만 안전해도 보호가 유지되도록 하는 위험 분산이다. 대신 구현이 복잡해지고 PQC 단독으로 넘어가는 두 번째 전환이 남는다. NIST와 OMB는 이를 일시적 수단으로 보고 비용과 복잡도를 따지라고 하며, NSA는 NSS에 하이브리드를 요구하지 않는다. TLS 키 합의처럼 하이브리드가 이미 널리 배포된 경로와 서명처럼 선택이 남은 경로를 나눠 판단한다.

### 지속적인 암호 민첩성

암호 민첩성(crypto agility)은 보안과 운영을 유지하면서 프로토콜, 애플리케이션, 소프트웨어, 하드웨어, 펌웨어와 인프라의 암호 알고리즘을 교체하고 조정하는 능력이다(NIST CSWP 39upd1). 새 표준(HQC 등)의 추가, 일정 문서의 개정, 구현 결함, 하이브리드에서 PQC 단독으로의 이동 때문에 전환은 한 번으로 끝나지 않는다.

- 알고리즘을 바이너리에 박지 않고 설정으로 고른다. OpenSSL 3의 provider나 Java JCA/JCE처럼 구현을 끼워 넣을 수 있는 라이브러리를 쓴다.
- 프로토콜은 알고리즘을 협상하되, 다운그레이드를 막도록 허용한 알고리즘만 쓰게 설정할 수 있어야 한다.
- KMS와 HSM이 ECC 키와 PQC 키를 함께 생성, 보관, 관리할 수 있어야 한다. 서명 키 전환 운영은 [[HSM-Signing-Operations|HSM 서명 운영과 무중단 키 전환]]에 있다.
- 장비는 새 알고리즘을 소프트웨어 업데이트로 받을 만큼 메모리와 연산 여유를 둔다.
- 새 시스템 도입, 표준 개정, 정책 변경 때 발견부터 다시 돈다. 계속 갱신되는 인벤토리가 이 반복의 입력이다.

## 확인 질문

- 지금 수집당하면 안 되는 데이터는 무엇이고 몇 년 동안 비밀이어야 하는가? 그 데이터를 보호하는 키 합의는 어디서 일어나는가?
- 업데이트로 서명 검증 알고리즘을 바꿀 수 없는 장치나 신뢰의 뿌리는 어디에 있는가?
- 인벤토리가 자산 목록에서 멈췄는가, 실제 알고리즘과 파라미터까지 내려갔는가? 소스, 호스트, 네트워크 중 어느 관찰이 비어 있는가?
- 우리 조직, 고객과 공급망에 걸린 시한은 어느 문서의 어느 범위인가?
- 하이브리드를 쓴다면 PQC 단독으로 넘어가는 두 번째 전환 계획이 있는가?
- RSA 키 길이를 늘리거나 [[Quantum-Key-Distribution|QKD]]를 들이는 것으로 전환을 대신하려 하지 않는가?

## 출처

- [양자컴퓨팅 시대, 이미 시작된 위협: 기업은 어디서부터 점검해야 할까 — 삼성SDS REAL Summit 2026 세션 브리프](https://image.samsungsds.com/resource/kr/pdf/Session_Brief_%EC%96%91%EC%9E%90%EC%BB%B4%ED%93%A8%ED%8C%85_%EC%8B%9C%EB%8C%80_%EC%9D%B4%EB%AF%B8_%EC%8B%9C%EC%9E%91%EB%90%9C_%EC%9C%84%ED%98%91__%EA%B8%B0%EC%97%85%EC%9D%80_%EC%96%B4%EB%94%94%EC%84%9C%EB%B6%80%ED%84%B0_%EC%A0%90%EA%B2%80%ED%95%B4%EC%95%BC_%ED%95%A0%EA%B9%8C.pdf)
- [NIST, FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism Standard](https://csrc.nist.gov/pubs/fips/203/final) — 2024-08-13 발행, 표 3의 키와 암호문 크기
- [NIST, FIPS 204: Module-Lattice-Based Digital Signature Standard](https://csrc.nist.gov/pubs/fips/204/final) — 2024-08-13 발행, 표 2의 키와 서명 크기
- [NIST, FIPS 205: Stateless Hash-Based Digital Signature Standard](https://csrc.nist.gov/pubs/fips/205/final) — 2024-08-13 발행, 파라미터 세트별 서명 크기
- [NIST, IR 8547: Transition to Post-Quantum Cryptography Standards](https://csrc.nist.gov/pubs/ir/8547/final) — 2026-10 최종판, 퇴출 일정, Mosca 부등식, 하이브리드, ML-KEM-768 기본 권장
- [NIST Selects HQC as Fifth Algorithm for Post-Quantum Encryption — NIST](https://www.nist.gov/news-events/news/2025/03/nist-selects-hqc-fifth-algorithm-post-quantum-encryption) — 2025-03-11
- [NIST, CSWP 39upd1: Considerations for Achieving Crypto Agility: Strategies and Practices](https://csrc.nist.gov/pubs/cswp/39/upd1/considerations-for-achieving-crypto-agility/final) — 2025-12-19 발행, 2026-06-29 갱신
- [NIST NCCoE, SP 1800-38B Preliminary Draft: Quantum Readiness: Cryptographic Discovery](https://www.nccoe.nist.gov/sites/default/files/2023-12/pqc-migration-nist-sp-1800-38b-preliminary-draft.pdf) — 2023-12 예비 초안, 관찰 위치별 발견 구조
- [NIST NCCoE, Migration to Post-Quantum Cryptography FAQ](https://pages.nist.gov/nccoe-migration-post-quantum-cryptography/FAQ/) — SP 1800-38 시리즈의 2차 초안과 최종판 계획 없음(2026-11-18 갱신본)
- [The White House, Executive Order 14412: Securing the Nation Against Advanced Cryptographic Attacks](https://www.whitehouse.gov/presidential-actions/2026/06/securing-the-nation-against-advanced-cryptographic-attacks/) — 2026-06-22 서명, 2026-06-25 Federal Register 게재
- [OMB, M-26-15: Execution of the Migration to Post-Quantum Cryptography](https://www.whitehouse.gov/wp-content/uploads/2026/06/M-26-15-Execution-of-the-Migration-to-Post-Quantum-Cryptography.pdf) — 2026-06-24, 우선순위, 5단계, 부록 A의 하이브리드, 암호 민첩성과 자동 인벤토리
- [NSA, Announcing the Commercial National Security Algorithm Suite 2.0](https://media.defense.gov/2025/May/30/2003728741/-1/-1/0/CSA_CNSA_2.0_ALGORITHMS.PDF) — 2022-09 Ver. 1.0, 분야별 2030~2033년 일정
- [NSA, Commercial National Security Algorithm Suite 2.0 and Quantum Computing FAQ](https://media.defense.gov/2022/Sep/07/2003071836/-1/-1/1/CSI_CNSA_2.0_FAQ_.PDF) — 2026-10 Ver. 2.2, CNSSP 15 시한, 펌웨어 서명, 하이브리드, 병렬 PKI, IKEv2
- [U.S. Department of War, Post Quantum Cryptography Strategy](https://dowcio.war.gov/Portals/0/Documents/Library/DoW-PQC-Strategy.pdf) — 2026-04-01 서명
- [Securing Global Dominance: DoW Unleashes Quantum Defense Strategy to Harden Networks and Empower the Joint Force — U.S. Department of War](https://www.war.gov/News/Releases/Release/Article/4524599/securing-global-dominance-dow-unleashes-quantum-defense-strategy-to-harden-netw/) — 2026-06-23 공개
- [NCSC, Timelines for migration to post-quantum cryptography](https://www.ncsc.gov.uk/guidance/pqc-migration-timelines) — 2025-03-20 Ver. 1.0
- [국가법령정보센터, 양자과학기술 및 양자산업 육성에 관한 법률 개정문(법률 제21649호)](https://www.law.go.kr/LSW/lsRvsDocInfoR.do?lsiSeq=286075) — 2026-05-19 공포, 2026-11-20 시행, 제18조의2
- [CycloneDX v1.6 Released — OWASP CycloneDX](https://cyclonedx.org/news/cyclonedx-v1.6-released) — 2024-04-09
- [CycloneDX, CycloneDX v1.6 JSON Reference](https://cyclonedx.org/docs/1.6/json/) — cryptoProperties의 assetType과 algorithmProperties
- [IETF, RFC 7748: Elliptic Curves for Security](https://www.rfc-editor.org/rfc/rfc7748.html)
- [IETF, RFC 8032: Edwards-Curve Digital Signature Algorithm (EdDSA)](https://www.rfc-editor.org/rfc/rfc8032.html)
- [Quantum frontiers may be closer than they appear — Google](https://blog.google/innovation-and-ai/technology/safety-security/cryptography-migration-timeline/) — 2026-03-25
- [Cloudflare targets 2029 for full post-quantum security — Cloudflare](https://blog.cloudflare.com/post-quantum-roadmap/) — 2026-04-07
- [Quantum-safe security: Progress towards next-generation cryptography — Microsoft Security Blog](https://www.microsoft.com/en-us/security/blog/2025/08/20/quantum-safe-security-progress-towards-next-generation-cryptography/) — 2025-08-20
- [Microsoft advances quantum-safe security as the risk timeline shifts — Microsoft Security Blog](https://www.microsoft.com/en-us/security/blog/2026/06/30/microsoft-advances-quantum-safe-security-as-the-risk-timeline-shifts/) — 2026-06-30
- [Making PQC REAL — 삼성SDS REAL Summit 2026 발표 자료, 삼성SDS](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/AX%EC%A0%84%EB%9E%B5_1-7_Making%20PQC%20REAL_%EC%9C%A4%ED%9A%A8%EC%A7%84%EC%83%81%EB%AC%B4_%EB%B0%B0%ED%8F%AC%EB%B3%B8.pdf) — 2026년 9월 발표. Trust Now, Forge Later 구분, 자원 추정과 EU 로드맵 항목의 계기. 일정과 수치는 아래 원문으로 대조했다
- [Safeguarding cryptocurrency by disclosing quantum vulnerabilities responsibly — Google Research](https://research.google/blog/safeguarding-cryptocurrency-by-disclosing-quantum-vulnerabilities-responsibly/) — 2026-03-31. ECDLP-256 회로의 논리 큐빗과 Toffoli 게이트 수, 물리 큐빗 50만 개 미만과 몇 분, 영지식 증명 공개
- [Caltech Team Finds Useful Quantum Computers Could Be Built with as Few as 10,000 Qubits — Caltech](https://www.caltech.edu/about/news/caltech-team-finds-useful-quantum-computers-could-be-built-with-as-few-as-10000-qubits) — 2026-03-31
- [Shor's algorithm is possible with as few as 10,000 reconfigurable atomic qubits — arXiv:2603.28627, Caltech와 Oratomic](https://arxiv.org/abs/2603.28627) — 2026-03-30 제출. 초록의 2만 6천 큐빗과 P-256 며칠, RSA-2048 10~100배
- [EU NIS Cooperation Group, A Coordinated Implementation Roadmap for the Transition to Post-Quantum Cryptography](https://digital-strategy.ec.europa.eu/en/library/coordinated-implementation-roadmap-transition-post-quantum-cryptography) — Part 1, 1.1판(2025-06-11). 4장의 마일스톤, 하이브리드와 단독 사용 시한, 2035년의 근거
- [EU reinforces its cybersecurity with post-quantum cryptography — European Commission](https://digital-strategy.ec.europa.eu/en/news/eu-reinforces-its-cybersecurity-post-quantum-cryptography) — 2025-06-23 공개
- [The White House, National Security Memorandum on Promoting United States Leadership in Quantum Computing While Mitigating Risks to Vulnerable Cryptographic Systems (NSM-10)](https://bidenwhitehouse.archives.gov/briefing-room/statements-releases/2022/05/04/national-security-memorandum-on-promoting-united-states-leadership-in-quantum-computing-while-mitigating-risks-to-vulnerable-cryptographic-systems/) — 2022-05-04
- [OMB, M-23-02: Migrating to Post-Quantum Cryptography](https://bidenwhitehouse.archives.gov/wp-content/uploads/2022/11/M-23-02-M-Memo-on-Migrating-to-Post-Quantum-Cryptography.pdf) — 2022-11-18. 연간 우선순위 인벤토리

## 관련 문서

- [[PQC-Discovery-and-Execution|PQC 전환 실행 (인벤토리 레코드, 수명주기별 발견, 에이전트 기반 전환)]]
- [[Public-Key-Cryptography|공개키 암호 (양자 위협 구분, ML-KEM과 서명 표준)]]
- [[Quantum-Key-Distribution|양자키분배 QKD (PQC와의 비교)]]
- [[TLS-Config|TLS Config (하이브리드 키 교환 기본 그룹)]]
- [[Application-Layer-Protocols#양자 내성 알고리즘은 키 교환부터 들어왔다|SSH의 양자 내성 키 교환]]
- [[Certificate-Lifecycle-Management|인증서 수명주기 관리 (교체 역량과 암호 민첩성)]]
- [[HSM-Signing-Operations|HSM 서명 운영과 무중단 키 전환]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캐닝 (SBOM)]]
- [[Envoy-Upgrade-Behavior-Changes|Envoy 업그레이드 (기본 키 교환 곡선에 X25519MLKEM768 추가)]]
