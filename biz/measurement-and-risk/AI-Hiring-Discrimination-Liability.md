---
tags: [business, ai, hiring, discrimination, litigation, risk]
status: done
verified_at: 2026-11-01
category: "비즈니스&제품(Business&Product)"
aliases: ["AI Hiring Discrimination Liability", "채용 AI의 차별 책임", "Mobley v. Workday", "AI 채용 집단소송"]
---

# 채용 AI의 차별 책임 — 도구 공급자가 고용주의 대리인이 될 수 있는 경우

채용 지원서를 AI로 점수화, 정렬, 순위화하거나 자동으로 걸러 내는 기능은 고용주만의 도구가 아니다. 고용주가 전통적인 채용 기능을 맡기면 도구 공급자도 차별금지법상 책임을 다툴 대상이 될 수 있다. 미국 연방법원에서 진행 중인 Mobley v. Workday 사건(캘리포니아 북부지방법원, 3:23-cv-00770)이 이 질문을 다룬다.

2026-11-01 법원 결정문과 EEOC 의견서로 확인한 범위다. 소송 진행 단계의 판단이며 차별이 있었다는 사실 판단이나 판결은 아직 없다. 국내에서 채용은 AI 기본법이 정한 고영향 AI 영역의 하나다([[AI-Basic-Act-Scope-and-Obligations#고영향 AI 해당 여부를 먼저 검토한다|고영향 AI 해당 여부]]).

## 원고의 주장

- 원고는 2017년부터 Workday의 선별 도구를 쓰는 회사의 100개가 넘는 자리에 지원해 거절됐고, 인종, 40세 이상의 나이와 장애 때문에 불리하게 걸러졌다고 주장했다(1차 수정 소장, 2024-07-12 결정문의 요약 기준).
- 지원서를 낸 지 1시간이 안 돼 새벽에 거절 통보를 받은 사례도 주장에 들어 있다. 법원은 소장 단계에서 이 주장이 결정이 자동화됐다는 타당한 추론을 낳는다고 봤지만, 사실로 인정한 것은 아니다.

## 2024-07-12 결정: 대리인 이론은 남고 고용알선기관 이론은 기각됐다

Workday의 소 각하 신청에 대해 법원은 일부만 받아들였다.

| 이론이나 청구 | 결과 |
|---|---|
| 고객 고용주의 대리인(agent) | 주장이 충분해 Title VII, ADEA, ADA의 고용주 정의에 들어갈 수 있다고 봄 |
| 고용알선기관(employment agency) | 수정 기회 없이 기각 |
| 차별적 영향(disparate impact) 청구(Title VII, ADEA, ADA) | 각하 신청 기각, 진행 |
| 고의적 차별 청구(Title VII, ADEA, Section 1981) | 수정 기회 없이 기각. 증거개시에서 고의의 증거가 나오면 다시 추가를 신청할 수 있음 |
| 캘리포니아 FEHA 청구 | 수정 기회를 주고 기각 |

- 법원은 연방 차별금지법의 문언과 판례가 기능을 자동화된 대리인에게 맡기는 것과 사람에게 맡기는 것을 구분하지 않는다고 보고, 소프트웨어와 사람 의사결정자를 인위적으로 구분하면 현대의 차별금지법이 무력해질 수 있다고 적었다.
- 같은 결정은 전통적인 채용 기능을 위임받지 않은 많은 소프트웨어 공급자는 대리인이 아니라고 선을 그었다(예: 스프레드시트). 대리인(고용주) 해당 여부를 가르는 기준은 AI를 썼는지가 아니라 어떤 채용 기능을 맡았는지다. 같은 결정은 지원자도 ADEA로 차별적 영향 청구를 할 수 있다고 봤다(각주 4).
- EEOC는 2024-04-09 의견서에서 고용알선기관, 간접 고용주, 대리인 세 이론 모두 주장이 충분하다는 원고 쪽 의견을 냈다. 법원은 대리인 이론만 받아들였고 간접 고용주 이론은 판단하지 않았다.
- 2026-06-22 결정도 앞서 기각된 청구는 기각 상태로 남는다고 확인했다.

## 2025-05-16 결정: 연령 차별의 opt-in 집단을 예비 인증했다

- 인증된 집단은 2020-09-24부터 현재까지 Workday의 지원 플랫폼으로 지원했다가 채용 추천을 받지 못한 40세 이상의 모든 사람이다. 추천을 받지 못했다는 것은 Workday의 AI가 지원서를 점수화, 정렬, 순위화하거나 선별했고, 그 결과가 채용 추천이 아니었으며, 결과가 고용주에게 전달됐거나 Workday가 자동으로 거절한 경우다.
- ADEA 사건은 공정근로기준법(FLSA) 216(b)의 절차를 따른다. 같은 법 위반을 주장하고 비슷한 처지(similarly situated)에 있으며 스스로 참여에 동의(opt-in)한 사람이 함께 소송한다. 두 단계 중 예비 인증 단계의 심사 기준은 소송 단계에 맞춰 타당성 기준과 느슨하게 비슷하다.
- 법원은 Workday의 AI 추천 시스템으로 지원자를 점수화, 정렬, 순위화, 선별한 것을 단일 정책(unified policy)으로 충분히 주장했다고 봤다. Workday는 나중 단계에서 시스템이 통일적으로 작동하지 않는다는 증거를 내고 인증 취소(decertification)를 구할 수 있으며, 결정문은 원고가 본안에서 차별적 영향을 증명하는 데 어려움을 겪을 수 있다고도 적었다.
- 2025-07-29 결정은 예비 인증 단계의 집단 범위에 HiredScore AI 기능(Spotlight, Fetch)으로 처리된 지원자도 포함된다고 정했다.

## 2026-11-01 기준 진행 상황

- 법원이 승인한 통지 계획상 동의서 제출 기한은 2026-03-07이었다. 기한 뒤에도 500건이 넘는 동의서가 들어오자 법원은 2026-04-14까지 낸 사람의 참여를 허용했다.
- 2026-07-02 법원은 지원자도 ADEA(29 U.S.C. § 623(a)(2))로 차별적 영향 청구를 할 수 있다는 기존 판단에 대해, 중간 항소를 할 수 있도록 28 U.S.C. § 1292(b) 인증(certification)을 해 달라는 Workday의 신청을 기각했다. 같은 결정문은 Workday의 인증 취소 신청 기한이 한 달이 채 남지 않았다고 적었다.
- 2026-10-07 결정 기준 ADEA 집단에 15,000명 넘게 참여했다. 원고들은 2026-09-14 집단(class) 인증을 신청했고, 결정문은 원고들이 Title VII, ADA와 캘리포니아 FEHA(Fair Employment and Housing Act) 청구를 Rule 23 집단을 대표해 주장한다고 적었다. Workday의 반대 의견 기한은 2026-11-10이다.
- 인증 취소 신청의 제출과 결과, 약식판결, 화해와 재판 기일은 확인하지 못했다. 사건 기록(docket)의 항목 본문은 열지 못해 결정문과 제출 문서로만 확인했다.

## 적용 제안

아래는 결정문의 쟁점을 바탕으로 한 이 문서의 운영 제안이며 법률 자문이 아니다.

- **공급자:** 점수화, 순위화나 자동 거절처럼 채용 판단의 일부를 맡는 기능은 단순한 도구가 아니라 고용주의 대리인으로 다퉈질 수 있다. 출시 전에 보호 집단별 결과 차이를 측정하고, 고객사별 설정, 자동 거절 여부와 판단 이력을 남긴다.
- **이용 기업:** AI 결과로 자동 거절하는지, 사람이 어느 단계에서 검토하는지, 공급자에게 영향 분석 자료를 요청할 수 있는지를 계약과 운영 문서에 적는다. 국내 고영향 AI의 개발사와 이용사업자 분담은 [[AI-Basic-Act-Scope-and-Obligations|AI 기본법의 사업자 의무]]를 따른다.
- **지원자:** 거절 통보 시각만으로 자동 거절이나 차별을 단정하지 않는다. 이 사건의 쟁점은 개별 거절 하나가 아니라 같은 시스템이 보호 집단에 불균형한 결과를 냈는지다.

## 출처

- [Mobley v. Workday, Order Granting in Part and Denying in Part Motion to Dismiss (ECF 80) — CourtListener RECAP](https://storage.courtlistener.com/recap/gov.uscourts.cand.408645/gov.uscourts.cand.408645.80.0.pdf) — 2024-07-12, 대리인과 고용알선기관 이론, 차별적 영향과 고의적 차별 청구의 판단, 1차 수정 소장의 주장 요약
- [Mobley v. Workday, Order Granting Preliminary Collective Certification (ECF 128) — govinfo](https://www.govinfo.gov/content/pkg/USCOURTS-cand-3_23-cv-00770/pdf/USCOURTS-cand-3_23-cv-00770-1.pdf) — 2025-05-16, 집단 정의, FLSA 216(b) 절차와 단일 정책 판단
- [Mobley v. Workday, Order re HiredScore Dispute (ECF 158) — govinfo](https://www.govinfo.gov/content/pkg/USCOURTS-cand-3_23-cv-00770/pdf/USCOURTS-cand-3_23-cv-00770-3.pdf) — 2025-07-29, HiredScore AI 기능의 집단 범위 포함
- [Mobley v. Workday, Order Approving Notice Plan (ECF 211) — govinfo](https://www.govinfo.gov/content/pkg/USCOURTS-cand-3_23-cv-00770/pdf/USCOURTS-cand-3_23-cv-00770-9.pdf) — 2025-12-02, 동의서 제출 기한
- [Mobley v. Workday, Order Regarding Joinder of ADEA Plaintiffs (ECF 305) — govinfo](https://www.govinfo.gov/content/pkg/USCOURTS-cand-3_23-cv-00770/pdf/USCOURTS-cand-3_23-cv-00770-14.pdf) — 2026-04-14, 기한 뒤 동의서의 참여 허용
- [Mobley v. Workday, Order Granting in Part and Denying in Part Motion to Dismiss Third Amended Complaint (ECF 360) — govinfo](https://www.govinfo.gov/content/pkg/USCOURTS-cand-3_23-cv-00770/pdf/USCOURTS-cand-3_23-cv-00770-17.pdf) — 2026-06-22, 기각된 청구의 유지
- [Mobley v. Workday, Order Denying Motion for Certification under 28 U.S.C. § 1292(b) (ECF 376) — govinfo](https://www.govinfo.gov/content/pkg/USCOURTS-cand-3_23-cv-00770/pdf/USCOURTS-cand-3_23-cv-00770-21.pdf) — 2026-07-02, 중간 항소 인증 신청 기각과 인증 취소 신청 기한
- [Mobley v. Workday, Discovery Order (ECF 435) — govinfo](https://www.govinfo.gov/content/pkg/USCOURTS-cand-3_23-cv-00770/pdf/USCOURTS-cand-3_23-cv-00770-24.pdf) — 2026-10-07, 참여자 수, Rule 23 인증 신청과 반대 의견 기한
- [Brief of the EEOC as Amicus Curiae, Mobley v. Workday (ECF 60-1) — U.S. Equal Employment Opportunity Commission](https://www.eeoc.gov/sites/default/files/2024-04/Mobley%20v%20Workday%20NDCal%20am-brf%2004-24%20sjw.pdf) — 2024-04-09, 세 이론에 대한 EEOC의 의견

## 관련 문서

- [[AI-Basic-Act-Scope-and-Obligations|AI 기본법의 적용 범위와 사업자 의무]] — 채용을 포함한 고영향 AI의 사전 검토와 개발사, 이용사업자 분담
- [[Resume-Reviewer-Perspective|서류 검토자의 시선]] — 사람이 하는 서류 판정 절차와의 비교
- [[Dev-Outsourcing-Engagement|개발 외주의 계약과 수주]] — AI 기능을 넣는 외주 계약의 책임 범위
