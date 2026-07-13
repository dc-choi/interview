---
tags: [security, privacy, compliance, regulation, age-assurance, biometrics]
status: done
category: "보안(Security)"
aliases: ["Age Verification Regulation", "연령 검증 규제", "Online Safety Act", "COPPA", "BIPA", "Compute KYC"]
---

# 규제 지형

온라인 서비스의 연령과 신원 확인은 2025~2026년 사이 권고에서 강제로 전환됐다. 한 축은 미성년 보호와 성인 콘텐츠, 오남용을 겨냥한 검증 의무화이고, 다른 축은 그 검증이 수집하는 생체와 신분 정보를 옥죄는 프라이버시 법이다. 두 축이 서로를 당겨, 강한 검증을 요구할수록 생체 프라이버시 위반 리스크가 커지는 구조적 긴장이 생긴다.

## 검증 의무화

> 조회일 2026-07-13 기준 정리. 연령, 신원 검증 규제는 관할별로 개정, 시행 연기, 소송 결과에 따른 변동성이 크다. 아래 시행일과 조항은 방향 파악용이며, 실제 컴플라이언스 판단 전에는 각 1차 규제기관(Ofcom, European Commission, FTC, eSafety 등)의 원문을 반드시 재확인한다.

| 관할 | 핵심 의무 | 시행 | 벌칙 |
|---|---|---|---|
| 영국 OSA | highly effective age assurance(HEAA), 자기신고 불인정. Ofcom 4기준(정확성, 견고성, 신뢰성, 공정성) | 성인 콘텐츠 2025-07-25 | 최대 £18M 또는 글로벌 매출 10%, ISP 차단 |
| EU | DSA Art.28 미성년 보호 + AVMSD, eIDAS 2.0 연계 연령확인 블루프린트(over-18 proof, ZKP, EUDI Wallet 사양) | 블루프린트 2025-07-14, 5개국 파일럿 | DSA 일반 벌칙 |
| 미국 | Free Speech Coalition v. Paxton 합헌. 성인 콘텐츠 1/3 이상 사이트 18세 확인, intermediate scrutiny 적용, 검색엔진 면제 | 대법원 2025-06-27 | 주별, 20여 개 주 유사법 |
| 호주 | 16세 미만 SNS 금지, reasonable steps와 waterfall, 자기신고 단독 금지 | 2025-12-10 | 최대 A$50M |
| 미국 COPPA | 13세 미만. 개정으로 생체 식별자와 정부발급 식별자를 개인정보에 포함, 제3자 공유에 별도 부모동의 | 발효 2025-06-23, 준수 2026-04-22 | FTC 제재 |

## 생체정보 프라이버시 충돌

검증 의무를 이행하려 얼굴을 캡처하면 생체 프라이버시 법과 충돌한다. 일리노이 BIPA는 얼굴 기하학 추출 자체를 규제해 위반당 1,000~5,000달러를 물리고, GDPR Art.9는 고유 식별 목적의 생체정보를 특수범주로 금지하며, 한국 개인정보보호법은 생체인식정보를 민감정보로 별도 동의 대상으로 둔다. 얼굴 연령추정이 식별 목적이 아니라는 해석은 다수설이나, EU AI Act 고위험 분류 가능성과 함께 아직 미확정 쟁점이다. 연령확인법 준수가 생체보호법 위반을 유발하는 법 충돌이 실제 소송으로 번진다.

## 데이터 최소화와 목적 제한

GDPR Art.5의 데이터 최소화는 목적 제한의 직접 귀결이다. 연령만 필요한데 생년월일 전체를 받으면 위반이고, 검증 방법은 처리 리스크에 비례해야 한다. 규제는 강한 검증과 최소 수집을 동시에 요구하는 이중 압력을 만들며, 영지식증명과 토큰화, 검증 후 즉시 폐기가 이 둘을 화해시키는 기술적 전제가 된다.

## 프론티어 AI의 신원 게이팅

AI 제공자가 신원 게이팅을 도입하는 동인은 오남용 리스크와 규제 압박 두 축이다. 연령 불확실 시 미성년 경험으로 default하는 보수적 설계가 한쪽 끝이고, 성인 전용 기능을 신원 검증 뒤에 두는 게이트가 다른 끝이다. 검증 결함이 청소년을 노출시킬 위험 때문에 성인 모드 출시가 연기된 사례가 이 긴장을 보여준다. 인프라 층위에서는 컴퓨트 제공자에 은행권 KYC를 유추 적용해, 임계 컴퓨트 초과 시 실소유자(beneficial owner)를 식별하고 고위험 프로파일을 보고하며 접근을 즉시 차단하자는 거버넌스 제안(KYC for compute)이 나와 있다.

## 면접 체크포인트

- 연령확인을 백엔드 설계로 보면 핵심은 검증 강도와 데이터 최소화를 동시에 만족시키는 아키텍처다. 신원제공자(생년월일 보유)와 서비스(over-18 불리언만 수신)를 분리하는 double-blind와 1회용 토큰은, ORM과 캐시에서 PII를 절대 영속화하지 않는 보존정책 설계와 같은 사고축이다.
- 규제 충돌(BIPA와 연령확인법)을 인지하고 설계로 회피하는 것이 리드의 판단값이다. 왜 생년월일 대신 over-18 proof만 저장하는지를 비용과 법적 트레이드오프로 설명한다.
- 컴퓨트 KYC를 IAM 문제로 환원하면 실소유자 검증, 고위험 프로파일 보고, 즉시 폐기(revocation)라는 표준 인증과 인가 패턴이 된다.

## 관련 문서

- [[연령신원검증(AgeIdentityVerification)|연령/신원 검증 (개요)]]
- [[Age-Assurance-Methods|검증 방법론과 PET (규제가 요구하는 검증 강도의 구현)]]
- [[Identity-Verification-Processor-Risk|제3자 위탁 리스크 (수집 후 데이터 거버넌스)]]
- [[Least-Privilege-IAM|최소 권한 IAM (컴퓨트 KYC = 접근 제어)]]

## 출처

- [UK Online Safety Act — Age Assurance Deadline — National Law Review](https://natlawreview.com/article/you-must-be-tall-click-online-safety-act-and-age-appropriate-access)
- [Ofcom — Age assurance duties under the Online Safety Act](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/age-assurance)
- [European Commission — age-verification blueprint](https://digital-strategy.ec.europa.eu/en/news/commission-makes-available-age-verification-blueprint)
- [Texas Age Verification Law Upheld (Free Speech Coalition v. Paxton) — Sidley](https://datamatters.sidley.com/2025/07/08/texas-age-verification-law-upheld-u-s-supreme-court-balances-free-speech-and-child-protection-in-the-digital-age/)
- [Australia's Social Media Ban — DLA Piper](https://privacymatters.dlapiper.com/2026/02/australias-social-media-ban-and-the-esafety-commissioners-social-media-minimum-age-regulatory-guidance/)
- [FTC — COPPA Rule 2025 amendments — Federal Register](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)
- [Age Verification Compliance 2026: BIPA, CUBI, Paxton — Promise Legal](https://blog.promise.legal/age-verification-biometric-privacy-compliance-2026)
- [Oversight for Frontier AI through a KYC Scheme for Compute Providers — GovAI](https://www.governance.ai/research-paper/oversight-for-frontier-ai-through-kyc-scheme-for-compute-providers)
