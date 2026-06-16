---
tags: [security, privacy, age-assurance, identity, biometrics]
status: done
category: "보안(Security)"
aliases: ["Age Assurance Methods", "연령 검증 방법론", "Facial Age Estimation", "얼굴 연령추정", "Privacy-Preserving Age Verification"]
---

# 검증 방법론과 PET

연령 보증과 신원 검증은 자기신고부터 하드 신분증까지 정확도와 마찰, 프라이버시를 맞바꾸는 스펙트럼이다. 연령 보증은 verification(문서), estimation(얼굴 ML), inference(통신사, 이메일) 세 갈래로 나뉘고, 어느 쪽이든 결과를 임계 충족 여부라는 불리언으로 환원하는 것이 데이터 최소화의 핵심이다.

## 방식 비교

| 방식 | 동작 | 강도 | 마찰, 한계 |
|---|---|---|---|
| 자기신고 | 생년월일 입력 | 거의 없음 | 정직성 의존, 대부분 규제에서 불인정 |
| DB/신용/통신사 조회 | 신용기관, 통신사 회선으로 성인 여부 | 중 | 미성년, 선불폰, thin file에 약함, 불리언 반환 가능 |
| 얼굴 연령추정 | 셀카 ML로 나이 추정 | 중 | 생체 처리, 오차밴드, 인구통계 편향 |
| 문서 검증(hard ID) | 신분증 스캔 + 라이브니스 | 높음 | 높은 이탈률, 신원 노출, 위변조 대응 필요 |
| 재사용 디지털 ID | 발급된 크리덴셜 재제시 | 높음 | 발급기관 의존, 토큰 추적 표면 |

## 문서 검증 스택

하드 신분증 검증은 여러 겹으로 위변조를 거른다. OCR로 기재정보를 읽고 MRZ와 바코드로 교차검증하며, 전자여권은 NFC 칩을 서버 측에서 인증한다. 홀로그램, OVI, UV/IR 같은 보안 요소를 확인하고, 라이브니스로 사진 재생, 인쇄물, 영상 주입, 마스크 공격을 막는다. 라이브니스 강도는 ISO/IEC 30107 PAD로 APCER(공격 통과율)와 BPCER(정상 거부율)로 측정한다.

## 얼굴 연령추정의 정확도와 편향

얼굴 연령추정의 평균절대오차(MAE)는 10대에서 약 3~5년(NIST 2024)이다. 오차밴드 때문에 게이트는 보수적으로 설계된다. 95% 정확도의 18+ 게이트는 사실상 21세 이상만 통과시키고, 13+ 게이트는 13세의 약 22%를 과잉 거부하며 95% TPR은 16세에서야 도달한다. 어두운 피부톤은 학습 데이터가 적어 오탐이 커지므로, 단일 집계 정확도가 아니라 피부톤과 연령대, 성별로 분해한 FPR/FNR을 SLO로 관측해야 공정성 문제가 드러난다.

## 제공업체 지형

연령 추정 진영(Yoti, Unissey, Privately)과 신원 검증 진영(iProov, IDVerse, GBG)으로 갈리고, OCR과 라이브니스를 묶은 IDV(Onfido, Veriff, Incode)가 그 사이를 메운다. 영국 2025년 시험에서 검증 29곳, 추정 13곳이 평가됐다.

## 프라이버시 보존 검증 (PET)

강한 검증과 데이터 최소화를 동시에 만족시키는 열쇠는 발급과 사용의 분리다. 신뢰 앵커가 연령 크리덴셜을 발급하고, 검증 시점에는 over-18 신호만 제시한다. 발급기관은 어느 사이트에 쓰였는지 모르고 사이트는 신원을 모르는 double-blind 구조이며, zk-SNARK나 zk-STARK 같은 영지식증명으로 unlinkable한 1회용 증명을 만든다. IEEE 2089.1-2024는 이를 asserted부터 strict까지 4단계 보증 수준으로 표준화했다. 다만 앵커 의존, 폐기(revocation), 상호운용성은 미해결 과제로 남는다.

## 면접 체크포인트

- 연령 보증을 불리언 분류기로 보고, false positive(미성년 통과)와 false negative(성인 차단) 중 무엇이 더 비싼지를 정책으로 정한 뒤 임계 부근 불확실성을 step-up과 버퍼로 흡수한다. 임계는 모델 정확도가 아니라 제품과 규제가 정한다.
- 데이터 최소화는 파트너가 raw PII 대신 불리언만 반환하도록 API 경계를 설계하고, 토큰 발급과 제시를 분리해 double-blind를 만들며 로그에 PII를 남기지 않는 것이다.
- step-up을 상태머신으로 본다. 추정 신뢰도가 버퍼존에 떨어지면 더 강한 검증으로 라우팅하고, 각 방식의 지연과 비용, 이탈률로 폴백 순서를 정한다.
- 생성형 AI 위협(딥페이크, 주입)에 수동 라이브니스로 충분한지, 능동 라이브니스나 하드웨어 어테스테이션을 더할지 PAD 등급(ISO 30107)으로 벤더 기준을 세운다.

## 관련 문서

- [[연령신원검증(AgeIdentityVerification)|연령/신원 검증 (개요)]]
- [[Age-Verification-Regulation|규제 지형 (검증 강도를 강제하는 법)]]
- [[Identity-Verification-Processor-Risk|제3자 위탁 리스크 (수집한 데이터를 어디에 두나)]]
- [[FIDO-Seminar|FIDO, 패스키 (생체 로컬 처리)]]

## 출처

- [Age verification methods — AVPA](https://avpassociation.com/avmethods/)
- [Age assurance tech trial — Biometric Update](https://www.biometricupdate.com/202509/age-assurance-tech-trial-highlights-providers-for-verification-estimation)
- [Facial age estimation — Wikipedia](https://en.wikipedia.org/wiki/Facial_age_estimation)
- [ID Document Liveness Detection — Regula](https://regulaforensics.com/blog/id-document-liveness-detection/)
- [IEEE 2089.1-2024 Standard for Online Age Verification](https://ieeexplore.ieee.org/document/10542699)
- [Exploring Privacy-Preserving Age Verification: Zero-Knowledge Proofs — New America OTI](https://www.newamerica.org/oti/briefs/exploring-privacy-preserving-age-verification/)
- [The limits of zero-knowledge for age-verification — Brave](https://brave.com/blog/zkp-age-verification-limits/)
