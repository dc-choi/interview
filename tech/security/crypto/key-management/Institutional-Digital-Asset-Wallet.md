---
tags: [security, key-management, digital-asset, wallet, verifiable-credentials, vlei, mpc, blockchain]
status: done
verified_at: 2026-11-23
category: "Security - 암호"
aliases: ["Institutional Digital Asset Wallet", "기관용 디지털자산 월렛", "통합 월렛", "온체인 금융", "vLEI", "verifiable LEI", "검증 가능한 법인식별자", "서명 라우팅"]
---

# 기관용 디지털자산 월렛의 자격증명과 키 관리

기관이 스테이블코인, 토큰증권, 예금토큰 같은 디지털자산을 다루면 월렛은 잔액을 보여 주고 자산을 보내는 앱에 머물지 않는다. 거래를 요청한 사람이 그 업무를 할 자격이 있는지 확인하고, 거래 조건을 검사한 뒤, 그 서비스에 묶인 키로 서명해 대상 체인에 보내는 통제 계층이 된다. 이 문서는 그 계층을 자격증명 모델(누가 무엇을 할 수 있는가)과 키 관리 모델(어떻게 서명하는가)로 나눠 정리한다.

HSM의 비추출 키와 서명 오라클 위험은 [[HSM-Key-Custody|HSM과 서명 키 관리]], VC의 일반 구조와 검증 흐름은 [[Decentralized-Identity-Credentials|탈중앙 신원과 검증 가능한 자격증명]]에 있다.

## 기관 간 허가형 원장과 온체인 금융

| 구분 | 기관 간 허가형 원장 | 온체인 금융 |
|---|---|---|
| 주된 목적 | 기관 간 데이터 공유와 원장 무결성 확보 | 디지털자산의 발행, 거래 같은 금융서비스 구현 |
| 관리 대상 | 원장의 거래 데이터 | 디지털자산과 관련 정보 전반 |
| 참여 주체 | 네트워크에 참여한 기관 | 법인과 개인 고객, 법인 안의 업무 담당자 |
| 통제 범위 | 시스템 접근과 데이터 관리 | 신원 인증부터 거래 확정까지 전체 과정 |

설명을 위해 단순화한 구분이다. 통제 범위가 거래 전 과정으로 넓어지면 누가 시스템에 들어올 수 있는지만 따져서는 부족하고, 거래 하나하나가 요청자의 권한과 거래 조건에 맞는지 검사해야 한다. 허가형 원장의 참여자 신원 관리와 규제 토큰 표준의 이전 제한은 [[Security-Tokens-and-Fractional-Investment#5. 분산원장이 맡는 기능과 전자등록 체계의 경계|분산원장이 맡는 기능]]에 있다.

### 월렛 밖의 두 축: 상호운용성과 검증, 감사

월렛은 디지털자산의 소유와 통제(신원, 권한, 키 관리)를 맡는다. 2026년 9월 삼성SDS 발표 자료는 온체인 금융에 함께 필요한 기술 영역으로 둘을 더 든다. 여러 블록체인과 기존 금융시스템을 잇는 상호운용성(체인 간 연결, 온체인과 오프체인 API), 그리고 거래 이력, 정책 집행 기록과 모니터링으로 자산과 거래를 검증하는 감사 영역이다. 감사 영역의 예로 든 PoRL(Proof of Reserve and Liability)은 보유 자산과 고객 부채를 함께 검증해 준비자산이 부채를 충족하는지 확인하는 방식이다(발표 자료의 정의). 보유 자산만 보여 주는 준비금 증명으로는 그 자산이 갚아야 할 부채를 알 수 없으므로 부채 쪽까지 봐야 충족 여부를 말할 수 있다(해석). 스테이블코인 준비자산의 일반 구조는 [[Stablecoin-Value-and-Redemption|스테이블코인 가치와 상환]]에 있다. 월렛이 남기는 단계별 판정과 거부 사유가 이 감사 영역의 입력이 된다(해석).

### 제도 흐름 (2026-11-23 기준)

| 관할 | 내용 | 자세히 |
|---|---|---|
| EU | MiCA(Regulation (EU) 2023/1114). 자산준거토큰(ART)과 전자화폐토큰(EMT)을 다루는 제3편과 제4편은 2024-06-30, 그 밖의 조항은 대부분 2024-12-30부터 적용(제149조) | - |
| 미국 | GENIUS Act(Public Law 119-27, 2025-07-18 제정). 결제용 스테이블코인 | [[Stablecoin-Value-and-Redemption#보유 이자 금지와 제3자 보상의 경계|발행사 이자 금지와 시행일]] |
| 한국 | 가상자산이용자보호법. 2023-07-18 제정, 2024-07-19 시행 | [[Virtual-Asset-Exchange-Registration|가상자산사업자 신고 제도]] |
| 한국 | 토큰증권 도입을 위한 전자증권법, 자본시장법 개정안 2026-01-15 국회 통과, 2027-02-04 시행 예정(조항별 시행일은 오른쪽 문서) | [[Security-Tokens-and-Fractional-Investment#4. 규제 흐름|토큰증권 규제 흐름]] |

## 월렛이 맡는 다섯 단계

1. **신원 인증**: 개인은 국가별 개인 식별 체계로, 법인은 LEI 같은 국제 표준 법인 식별자로 시작한다.
2. **자격과 권한 검증**: 요청자가 그 서비스에서 그 업무를 할 자격이 있는지 자격증명과 그 발급 체인으로 확인한다.
3. **실시간 정책 판단**: 거래 한도, 제재 대상 목록(블랙리스트), 업무 유형처럼 거래마다 달라지거나 자주 바뀌는 조건은 거래 시점에 정책 엔진이 판단한다.
4. **키 관리와 서명**: 1~3을 통과한 요청만 그 서비스에 묶인 키로 서명한다.
5. **온체인 실행**: 대상 체인이 요구하는 형식과 서명 방식으로 보내고 확정 여부를 기록한다.

접근 제어 구조로 보면 2와 3은 정책 결정 지점(PDP), 서명 계층은 정책 집행 지점(PEP)에 해당한다(해석, [[Access-Control-Models#정책 평가 아키텍처|정책 평가 아키텍처]]). HSM의 키 연산이나 MPC 프로토콜 자체는 허용된 요청의 업무 정당성을 판단하지 못하므로 1~3의 검사는 키 연산 앞에서 강제한다.

공통 계층으로 두는 이유는 일관성이다. 서비스마다 인증, 권한, 서명을 따로 만들면 새 자산 서비스가 늘 때마다 보안 정책이 갈라지고 운영이 복잡해진다. 대신 공통 계층은 모든 서비스의 서명 권한이 모이는 표적이 된다(해석). 내부 서명 서비스에 무단 접근해 정상 출금 밖의 거래와 위임 메시지까지 서명받은 사고는 [[HSM-Key-Custody#유효한 서명과 허가된 거래를 구분한다|유효한 서명과 허가된 거래]]에 있다.

## 자격증명 모델: 누가 무엇을 할 수 있는가

### LEI와 vLEI

- **LEI**: ISO 17442를 따르는 20자리 영숫자 법인 식별자로 법인마다 하나다. 누가 누구인지(who is who)와 누가 누구를 소유하는지(who owns whom)의 참조 데이터로 이어진다. GLEIF가 운영하고 LEI 발급기관(LOU)이 발급하며 ROC(Regulatory Oversight Committee)가 감독한다.
- **vLEI**: 법인을 대리해 행동하는 사람의 신원, 권한과 역할을 상대방이 사람 개입 없이 암호로 자동 검증할 수 있게 하는 탈중앙 디지털 신원이다. 특정 역할의 특정 사람에게 자격증명을 발급하고, 암호로 보호한 자격증명 체인을 거쳐 Global LEI Index의 LEI 기록까지 거슬러 올라가 확인한다. GLEIF는 ISO 17442-3(2024)이 vLEI를 디지털 자격증명으로 표준화했다고 설명한다.
- **신뢰 체인**: GLEIF, QVI, 법인, OOR 보유자, ECR 보유자로 이어진다(vLEI 생태계 거버넌스 프레임워크 v4.0, 2026-03-25). GLEIF가 자격을 준 QVI(Qualified vLEI Issuer)가 법인 vLEI 자격증명, 공식 역할(OOR, Official Organizational Role) 자격증명, 업무 맥락 역할(ECR, Engagement Context Role) 자격증명을 발급한다. ECR은 법인이 직접 발급하고 폐기할 수도 있다. 법인의 권한 있는 대표(LAR)가 QVI에 역할 자격증명의 발급과 폐기를 지시하는 AUTH 자격증명도 역할 자격증명 체인의 일부가 된다.
- **기술 기반**: GLEIF의 루트 AID(autonomic identifier)와 위임 AID에서 출발하고, 자격증명은 ACDC(Authentic Chained Data Container) 형식이며 KERI 인프라 요구사항을 따른다. 프레임워크는 관리상의 신뢰 루트를 암호학적 신뢰 루트로 바꾸는 것을 목표로 두고, 디지털 지갑, 디지털자산 관리와 탈중앙 금융을 사용 사례로 든다.

### 자격증명을 계층으로 나눈다

- 하나의 자격증명에 모든 권한을 주지 않는다. 법인 수준의 루트 자격 아래에 업무 유형과 서비스별 자격증명을 따로 발급해 연결하면, 서비스 하나의 자격을 폐기해도 다른 서비스는 그대로이고 한 자격증명이 유출돼도 피해가 그 서비스로 좁아진다(설계 판단).
- 검증할 때는 제시된 자격증명 하나가 아니라 체인 전체를 본다. 단계마다 서명, 루트까지의 발급자 연결, 폐기 상태, 제시자가 정당한 보유자인지를 따로 확인한다. 일반 순서는 [[Decentralized-Identity-Credentials#검증 흐름|VC 검증 흐름]]과 같다.
- 자격증명이 판단하지 않을 것을 정한다. 역할처럼 비교적 오래 유지되는 사실은 자격증명에, 한도 소진액이나 제재 목록처럼 거래 시점마다 다른 조건은 정책 엔진에 둔다(설계 판단). 역할이 바뀐 뒤 자격증명 폐기가 서명 거부로 이어지기까지의 시간을 잰다.

## 키 관리 모델: 어떻게 서명하는가

### 자격증명과 키를 묶는다

vLEI 자격증명에 연결한 서비스 자격증명에 키 식별자, 공개키, 키 용도와 서비스 범위를 넣으면 요청을 서명한 키가 그 자격의 키인지 확인할 수 있다(설계 판단). 보유자 공개키를 자격증명에 넣어 제시자를 확인하는 VC의 보유자 결합(holder binding)과 같은 원리다. 자격증명 제시와 소유 증명에 쓰는 서명과 디지털자산 거래 서명은 목적이 다른 연산이므로 키를 나누고, 자격증명에 각 키의 용도를 적는다(설계 판단, [[HSM-Key-Custody#키 수명 주기|용도 분리]]의 적용).

### 서비스별 키와 수명 주기

- 고객마다 키 하나가 아니라 서비스와 업무 유형마다 키를 나눈다(예: 발행, 수탁, 전송). 한 키의 침해나 폐기가 다른 서비스로 번지지 않고, 키마다 다른 사용 정책을 붙일 수 있다.
- 발급, 사용 정책, 폐기, 복구의 수명 주기를 키마다 관리한다. 일반 절차는 [[HSM-Key-Custody#키 수명 주기|키 수명 주기]]를 따른다.
- 체인 위의 키 교체는 비용이 다르다. Ethereum 외부 소유 계정(EOA)의 주소는 공개키 Keccak-256 해시의 마지막 20바이트이므로 키를 바꾸면 주소도 바뀐다. 교체 계획에 자산 이전 거래와 거래 상대의 주소 갱신을 넣는다(해석). MPC의 조각 재분배는 공개키와 주소를 그대로 둔 채 조각만 바꾸고, 멀티시그나 스마트 계정 같은 컨트랙트 계정은 주소를 유지한 채 소유자 키를 바꿀 수 있어 이 비용이 다르다.

### 키 보호 수단: KMS, HSM, MPC

| 수단 | 키가 있는 곳 | 서명을 허가하는 것 | 주의 |
|---|---|---|---|
| 클라우드 KMS | 관리형 키 서비스 안. AWS KMS는 서명용 개인키가 암호화되지 않은 채 서비스 밖으로 나오지 않는다고 설명한다 | IAM과 키 정책 | 지원하는 곡선과 서명 방식, 결과 형식이 제품마다 다르다 |
| 전용 HSM | 조직이 쓰는 장비의 보안 경계 안 | HSM 사용자와 키 권한 | 클러스터와 사용자를 직접 운영하고 백업과 복구는 제품별 책임 분담을 확인한다 |
| MPC 기반 임계값 서명 | 여러 구성요소나 당사자에 나뉜다 | 정한 수 이상의 참여자 | 위임 철회 같은 비상 서명에도 여러 참여자가 필요하다 |

NIST IR 8214는 임계값 방식을 여러 구성요소가 연산에 함께 참여해 n개 중 f개가 침해돼도 키 비밀성과 무결성, 가용성 같은 목표를 지키는 구현으로 설명한다. Solana 문서는 관리형 MPC 월렛을 키를 공급자 인프라에 나누거나 맡겨 두고 고객 정책에 따라 공급자가 공동 서명하는 방식으로 구분한다. 어느 수단이든 키가 어디 있는가와 누가 서명을 허가하는가는 따로 묻는다. MPC hot wallet에 단일 개인키가 없어 악성 위임 철회가 늦어진 사례는 [[HSM-Key-Custody#유효한 서명과 허가된 거래를 구분한다|위임 철회와 출금 중단]]에 있다.

### 체인마다 다른 서명 방식과 서명 라우팅

| 대상 | 곡선과 서명 방식 |
|---|---|
| Ethereum 외부 소유 계정 | secp256k1 곡선의 ECDSA |
| Bitcoin | secp256k1의 ECDSA, 같은 곡선의 64바이트 Schnorr 서명(BIP 340) |
| Solana | 서명자마다 64바이트 Ed25519 서명. 주소는 32바이트 Ed25519 공개키 또는 PDA |

서명 라우팅은 거래 대상 체인과 업무 유형마다 곡선, 서명 방식, 키를 둔 백엔드와 결과 형식을 고르는 계층이다. 보호 수단이 지원하는 조합과 체인이 요구하는 조합이 어긋나는 지점을 미리 찾는다. AWS KMS 문서(2026-11-23 확인)를 예로 든다.

- secp256k1(`ECC_SECG_P256K1`)의 `ECDSA_SHA_256`과 Ed25519(`ECC_NIST_EDWARDS25519`) 서명은 지원하지만 서명 알고리즘 목록에 BIP 340 Schnorr는 없다. 이 서명이 필요한 거래는 다른 백엔드로 보내거나 거부한다(해석).
- ECDSA 서명은 DER 인코딩으로 돌려준다. Ethereum 거래에 쓰려면 r과 s를 꺼내고, s가 secp256k1n/2를 넘는 서명은 무효이므로(EIP-2) 낮은 s로 맞춘다. v는 서명에 대응하는 곡선 점의 y 패리티인데 Sign 응답에는 이 값이 없으므로, v 후보 둘로 공개키를 복구해 KMS 공개키와 일치하는 쪽을 쓴다(레거시 거래는 EIP-155 공식대로 체인 ID도 넣는다).
- Ethereum의 서명 대상은 Keccak-256 해시다. 이 32바이트 다이제스트를 `MessageType=DIGEST`로 넘긴다. `RAW`로 넘기면 서명 과정에서 SHA-256으로 다시 해시돼 체인에서 검증되지 않는 서명이 나온다.

같은 곡선이라도 서명 방식과 형식이 다르므로 곡선 이름만으로 호환을 판단하지 않는다.

## 예시: 법인 담당자의 스테이블코인 전송

1. 담당자의 vLEI 역할 자격증명으로 소속 법인, 직위나 업무 역할과 전송 업무 권한을 확인한다.
2. 정책 엔진이 거래 한도, 제재 대상 목록과 업무 유형 조건을 검사한다.
3. 통과하면 전송 서비스에 묶인 키로 서명한다. 서명 라우팅이 대상 체인의 곡선, 서명 방식과 형식을 고른다.
4. 거래를 보내고 확정 여부를 기록한다. 단계별 거부 사유(자격 없음, 정책 위반, 서명 거부)도 남겨야 어디서 막혔는지 나중에 설명할 수 있다.

발표 자료의 시연(2026년 9월)은 이 구조를 다음처럼 구체화했다. 시연 화면 기준이며 운영 시스템의 동작은 확인하지 않았다.

- **고위험 업무를 별도 자격증명으로 나눈다**: 개인 사용자의 고액 전송 자격과 국경 간 전송 자격은 기본 전송 자격과 따로 발급받게 나뉘어 있다. 시연의 17,700원 전송에서는 두 자격을 발급받지 않았고 정책 엔진이 둘 다 불필요로 판정했다(판정 기준은 화면에 없다).
- **제시할 때 필요한 클레임만 고른다**: 전송 자격 ID, 일일 한도와 건당 한도는 필수로, 전송 목적과 허용 목적지 국가는 선택으로 두었다. 한도 같은 상한은 자격증명에, 거래마다 바뀌는 소진액은 정책 엔진에 두는 위의 설계 판단과 맞는다(해석).
- **키를 용도별로 나눈다**: 개인 시연에서는 자격증명 제시의 소유 증명이 P-256 기반 ES256, 거래 키가 secp256k1 기반 ES256K(RFC 8812)로 나뉘었다. 법인 시연에서는 인증 키와 서비스 키가 모두 EdDSA였고 제시의 소유 증명도 EdDSA(Ed25519)였다.
- **허용 판정과 실행 사이에 승인을 둔다**: 법인 시연에서는 법인이 ECR 권한으로 직접 발급한 vLEI 역할 자격증명을 바탕으로 서비스 자격증명을 받았고, 발행 계획 자격증명의 상위 자격증명은 발행 자격(Issuance Entitlement) 자격증명이었다. 정책 엔진이 허용한 스테이블코인 발행 요청도 승인 대기 상태로 넘겨 별도 승인을 거치게 했다.

## 트레이드오프

- **자격증명 세분화**: 피해 범위는 줄지만 발급, 폐기, 상태 조회의 운영 부담과 검증 지연이 는다.
- **실시간 정책 판단**: 거래마다 정책 엔진을 거치면 지연과 가용성 의존이 생긴다. 정책 엔진이 응답하지 않을 때 거래를 거부할지 미리 정한다(설계 판단).
- **MPC와 HSM**: MPC는 한곳의 키 탈취에 강하지만 위임 철회 같은 비상 서명도 여러 참여자의 협력이 필요하다. HSM은 키가 한 보안 경계 안에 있어 구조가 단순한 대신, 그 경계에 서명을 요청할 수 있는 자격 증명과 관리 작업의 quorum을 따로 지켜야 한다([[HSM-Key-Custody#다계층 접근 제어|다계층 접근 제어]]).

## 점검 체크포인트

- 자격 검증, 정책 판단, 서명이 서로 다른 검사로 나뉘어 있고 각 결과와 거부 사유가 기록되는가
- 역할 자격증명을 폐기하면 얼마 뒤에 서명이 거부되는가
- 키가 서비스와 용도(자격증명 제시, 거래 서명)별로 나뉘어 있는가
- 백엔드마다 지원하는 곡선, 서명 방식과 결과 형식의 목록이 있고 지원하지 않는 조합을 거부하는가
- 위임 철회 같은 비상 서명 절차를 백엔드별로 시험했는가
- 키 교체가 주소를 바꾸는 계정인지 구분하고, 바뀌면 자산 이전을 함께 계획했는가

## 출처

- [2027년 금융의 규칙을 바꾸는 두 가지 변곡점: 망분리 완화와 온체인 금융의 확산 — 삼성SDS REAL Summit 2026 세션 브리프](https://image.samsungsds.com/resource/kr/pdf/Session%20Brief_2027%EB%85%84%20%EA%B8%88%EC%9C%B5%EC%9D%98%20%EA%B7%9C%EC%B9%99%EC%9D%84%20%EB%B0%94%EA%BE%B8%EB%8A%94%20%EB%91%90%20%EA%B0%80%EC%A7%80%20%EB%B3%80%EA%B3%A1%EC%A0%90.pdf) — 계기 자료. 비교 표, 다섯 단계, 자격증명과 키 관리 모델의 구성은 이 자료를 일반화했고, 제도와 표준, 체인별 서명 방식은 아래 공식 자료로 대조했다
- [2027년 금융 혁신을 위한 준비: 망분리에서 온체인까지 — 삼성SDS REAL Summit 2026 발표 자료, 삼성SDS](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/Track%208-4%202027%EB%85%84%20%EA%B8%88%EC%9C%B5%20%ED%98%81%EC%8B%A0%EC%9D%84%20%EC%9C%84%ED%95%9C%20%EC%A4%80%EB%B9%84_%20%EC%9E%A5%EC%9A%A9%EB%AF%BC_%EA%B9%80%EC%83%81%ED%98%84%20FN%200904_%EB%B0%B0%ED%8F%AC%EB%B3%B8.pdf) — 2026년 9월 발표. 온체인 금융의 3대 기술 영역과 PoRL 정의, 개인과 법인 시연의 자격증명 구성
- [GLEIF, Introducing the verifiable LEI (vLEI)](https://www.gleif.org/en/organizational-identity/introducing-the-verifiable-lei-vlei) — vLEI 정의, 신뢰 루트, ISO 17442-3
- [GLEIF, vLEI Ecosystem Governance Framework v4.0 Primary Document v1.2](https://www.gleif.org/organizational-identity/become-a-vlei-issuer-qvi/vlei-ecosystem-governance-framework/2026-03-25_vlei-egf-v4.0-primary-document_v1.2_final.pdf) — 2026-03-25. 이해관계자, 신뢰 체인, 자격증명 종류와 발급 주체, AID, ACDC, KERI, 사용 사례
- [GLEIF, Introducing the Legal Entity Identifier (LEI)](https://www.gleif.org/en/about-lei/introducing-the-legal-entity-identifier-lei)
- [ESMA, Interactive Single Rulebook, MiCA Article 149](https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-149-entry-force-and-application) — 적용일
- [GovInfo, Public Law 119-27 (GENIUS Act)](https://www.govinfo.gov/content/pkg/PLAW-119publ27/html/PLAW-119publ27.htm)
- [내일(7.19일)부터 「가상자산이용자보호법」이 시행됩니다 — 금융위원회](https://www.fsc.go.kr/no010101/82682) — 2024-07-17. 제정일과 시행일
- [토큰증권 도입 및 투자계약증권 유통을 위한 전자증권법, 자본시장법 개정안 국회 본회의 통과 — 금융위원회](https://www.fsc.go.kr/no010101/86064) — 2026-01-15
- [민관 합동 토큰증권 협의체 Kick-off 회의 개최 — 금융위원회](https://www.fsc.go.kr/no010101/86371) — 2026-03-04. 2027-02-04 시행 예정
- [ethereum.org, Ethereum accounts](https://ethereum.org/en/developers/docs/accounts/) — 주소 도출
- [ethereum.org, Post-quantum cryptography on Ethereum](https://ethereum.org/roadmap/security/quantum-resistance/) — 계정 서명의 secp256k1 ECDSA
- [Ethereum Improvement Proposals, EIP-2: Homestead Hard-fork Changes](https://eips.ethereum.org/EIPS/eip-2) — 높은 s 값 무효
- [Ethereum Improvement Proposals, EIP-155: Simple replay attack protection](https://eips.ethereum.org/EIPS/eip-155) — v 계산식
- [Bitcoin Improvement Proposals, BIP 340: Schnorr Signatures for secp256k1](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)
- [Solana, Transactions](https://solana.com/docs/core/transactions) — Ed25519 서명 크기. 웹 페이지가 HTTP 429여서 공식 문서 원본 저장소(solana-foundation/solana-com)로 대조
- [Solana, Accounts](https://solana.com/docs/core/accounts) — 주소 형식, 같은 방식으로 대조
- [Solana, Signing in Production](https://solana.com/docs/core/transactions/signing-in-production) — 키 위치와 서명 허가 주체에 따른 백엔드 구분, 같은 방식으로 대조
- [AWS KMS, Key spec reference](https://docs.aws.amazon.com/kms/latest/developerguide/symm-asymm-choose-key-spec.html) — ECC 키 사양과 서명 알고리즘
- [AWS KMS API Reference, Sign](https://docs.aws.amazon.com/kms/latest/APIReference/API_Sign.html) — ECDSA 서명의 DER 인코딩
- [NIST, IR 8214: Threshold Schemes for Cryptographic Primitives](https://csrc.nist.gov/pubs/ir/8214/final) — 2019-03
- [IETF, RFC 8812: CBOR Object Signing and Encryption (COSE) and JSON Object Signing and Encryption (JOSE) Registrations for Web Authentication (WebAuthn) Algorithms](https://www.rfc-editor.org/rfc/rfc8812.html) — 2020-08. secp256k1 ECDSA의 ES256K 식별자

## 관련 문서

- [[HSM-Key-Custody|HSM과 서명 키 관리]] — 비추출 키, 서명 오라클, MPC hot wallet의 위임 철회
- [[HSM-Signing-Operations|HSM 서명 시스템 운영과 무중단 키 전환]]
- [[Decentralized-Identity-Credentials|탈중앙 신원과 검증 가능한 자격증명]] — 검증 흐름과 보유자 결합
- [[Access-Control-Models|접근 제어 모델]] — PDP와 PEP
- [[Security-Tokens-and-Fractional-Investment|토큰증권과 조각투자]]
- [[Stablecoin-Value-and-Redemption|스테이블코인 가치와 상환]]
- [[Tokenized-Bonds-and-Wholesale-CBDC|국채 토큰화와 기관용 CBDC]] — 예금토큰과 결제자산
- [[Virtual-Asset-Exchange-Registration|가상자산사업자 신고 제도]]
- [[Hardware-Wallet-Physical-Trust|하드웨어 지갑의 물리적 신뢰 경계]]
- [[Public-Key-Cryptography|공개키 암호와 디지털 서명]]
- [[Key-Management|키 관리 인덱스]]
