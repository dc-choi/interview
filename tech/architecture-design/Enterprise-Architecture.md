---
tags: [architecture, enterprise-architecture, togaf, it-governance, public-sector]
status: done
verified_at: 2026-11-14
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Enterprise Architecture", "엔터프라이즈 아키텍처", "정보기술아키텍처", "Information Strategy Planning", "정보화 전략 계획", "TOGAF"]
---

# 엔터프라이즈 아키텍처(EA)와 ISP

## 정의

엔터프라이즈 아키텍처(EA)는 조직의 업무, 데이터, 애플리케이션과 기술 기반이 지금 어떤 모습인지(baseline, as-is), 어떤 모습이어야 하는지(target, to-be), 그 사이를 어떤 단계로 옮길지(transition plan)를 기술하고 유지하는 관리 체계다. 미국 OMB Circular A-130(2016)은 연방 기관에 baseline, target과 전환 계획을 담은 EA를 만들고 기관의 IRM 전략 계획에 맞추도록 요구한다.

ISP(Information Strategy Planning, 정보화 전략 계획)는 James Martin 계열 정보공학(Information Engineering) 방법론에서 업무 영역 분석 앞에 두는 첫 단계로, 조직의 정보 요구를 위에서 넓게 보고 청사진을 만들어 여러 업무 영역 분석으로 나누는 계획 작업이다. 원래는 기업 전체 범위였지만, 국내 공공과 금융의 정보화 사업에서는 시스템 구축 사업 앞에 붙는 일회성 컨설팅 단계로 쓰이는 경우가 많다(발표 기준).

## 두 방식의 차이

| 구분 | 국내 실무의 ISP(발표 기준) | EA |
| --- | --- | --- |
| 수행 형태 | 개별 구축 사업의 첫 단계, 기간이 정해진 프로젝트 | 담당 조직이 상시로 수립, 점검, 갱신하는 운영 업무 |
| 범위 | 대상 사업에 필요한 정보 요구와 계획 | 조직 전체의 업무, 데이터, 애플리케이션, 기술 |
| 산출물의 수명 | 사업 착수와 함께 소비된다 | baseline과 target을 계속 갱신하며 투자 결정의 기준이 된다 |
| 경영 전략과의 연결 | 사업 단위로 해석 | 전략 변경이 target과 전환 계획에 반영된다 |

상시 운영과 일회성 계획이라는 대비는 발표에서 제시된 것이다(발표 기준). 이 대비는 A-130이 baseline, target과 전환 계획을 담은 EA를 수립하고 IRM 전략 계획에 맞추도록 한 요구와 어긋나지 않는다(해석). ISP의 딜레마도 같은 구조에서 나온다. 기한이 정해진 사업 앞단에서 깊이 분석할수록 뒤 단계는 체계적이 되지만 착수가 늦어지고, 얕게 하면 개발 단계가 산출물을 무시한다(발표 기준). EA는 이 분석을 평소에 쌓아 두어 사업마다 처음부터 다시 하지 않게 하려는 시도다(해석).

## 네 가지 아키텍처 도메인

TOGAF는 EA를 네 도메인으로 나눈다.

- **Business**: 경영 전략, 업무 프로세스와 조직이 갖춰야 할 역량
- **Data**: 조직이 쓰고 새로 확보할 데이터의 구조와 관리
- **Application**: 업무를 지원하는 애플리케이션과 그 사이의 관계
- **Technology**: 애플리케이션을 받치는 플랫폼과 인프라

전략이 바뀌면 Business target이 먼저 바뀌고, 그것을 달성할 데이터와 애플리케이션, 그 아래 기술 기반이 순서대로 다시 계획된다(발표 기준, TOGAF ADM은 이 단계를 반복한다). 생성형 AI처럼 비정형 텍스트를 업무 데이터로 끌어오는 변화는 Data와 Application 도메인을 함께 흔들므로, 기술만 먼저 들이고 업무와 데이터의 target을 정하지 않으면 전환 계획이 생기지 않는다(해석).

## 프레임워크와 제도

### TOGAF

TOGAF(The Open Group Architecture Framework)는 벤더 중립 컨소시엄 The Open Group이 관리한다. 현재판은 2022년 4월 발표한 TOGAF Standard 10th Edition으로, 핵심 내용(Fundamental Content)과 주제별 Series Guides로 나뉜다. 중심은 EA를 단계적으로 개발하고 사용하는 반복 절차 ADM(Architecture Development Method)이다. TOGAF 9 초안 정의 기준으로 용어는 기존 아키텍처를 baseline, 미래 상태를 target, 그 사이의 단계별 상태를 transition architecture로 부른다.

### 미국 연방정부

- **Clinger-Cohen Act(1996)**: 연방 기관 CIO에게 건전하고 통합된 IT 아키텍처의 개발, 유지와 이행을 맡겼다. 현재 조문은 40 U.S.C. 11315(b)(2)이며 2004년 개정으로 secure가 더해졌다.
- **예산 연계**: 같은 해 OMB 메모 M-97-02(Raines' Rules)는 연방, 기관과 하부 조직의 정보 아키텍처와의 일치를 포함한 8개 기준을 충족하는 주요 시스템 투자에만 원칙적으로 신규, 계속 예산을 권고한다고 밝혔다. 이 메모는 2000년 11월 A-130 개정(Transmittal Memorandum No. 4)으로 폐지되고 EA 일치를 포함한 같은 취지의 투자 기준이 Circular 8.b(1)(b)에 들어갔으며, 현행 2016년판 A-130도 EA와 함께 예산 편성과 집행에 연결된 IT 투자 관리 절차를 요구한다.
- **FEAF**: 연방 CIO Council이 1999년 Federal Enterprise Architecture Framework를 만들었고, OMB의 2012년 Common Approach, 2013년 FEAF version 2로 이어졌다.
- **교육과 인증**: FEAC 인증 프로그램은 2002년 CIO Council의 지원으로 대학이 개발하고 비영리 FEAC Institute가 운영을 맡을 예정이었다(2002년 5월 기사 기준). 정부가 직접 만든 자격은 아니다.

### 한국

- 2005년 제정된 「정보시스템의 효율적 도입 및 운영 등에 관한 법률」(법률 제7816호)이 공공기관에 정보기술아키텍처(ITA) 도입을 의무화했다(연구 논문 기준, 시행일과 대상 범위는 법령 연혁 원문으로 확인하지 못함).
- 이 법은 2010년 전자정부법 전부개정(법률 제10012호) 부칙 제2조로 폐지됐고, 이후 근거는 전자정부법이다. 2010년 원문과 2022년 KLRI 영문 법령 기준으로 법 제45조는 행정안전부장관의 정보기술아키텍처 기본계획 수립, 제46조는 대통령령으로 정하는 대상기관의 도입계획 수립과 제출, 제47조는 도입과 운영의 촉진을 정한다(시행령 조문 번호는 다르다). 최신 개정 조문은 국가법령정보센터에서 다시 확인한다.
- 한국정보화진흥원(현 한국지능정보사회진흥원, NIA)이 2013년 EA 실태조사와 성숙도 측정 보고서를 낸 사실은 연구 논문의 참고문헌으로 확인된다. 현재도 매년 하는지는 확인하지 못했다.

## 제도가 형식화되는 조건

법으로 EA를 의무화해도 담당 조직이 모델링 방법과 산출물 활용을 모르면, 평가 시점에 외부 컨설팅으로 산출물을 맞추는 형식 이행이 되기 쉽다(발표 기준의 관찰). 실제로 작동하게 하려면 다음을 함께 둔다(해석).

- 도메인별 역할(업무, 데이터, 애플리케이션, 기술 아키텍트)을 정하고 그 역할을 교육한다.
- 예산과 투자 심사가 EA의 target과 전환 계획을 실제 판단 근거로 쓰게 한다. 산출물이 의사결정에 쓰이지 않으면 갱신도 멈춘다.
- 산출물을 발표용 그림이 아니라 모델링 도구와 표준 표기(예: ArchiMate)로 유지해 다음 사업이 그대로 이어 쓸 수 있게 한다.
- 효과가 나오기까지 수년이 걸리므로 단기 성과로 평가받는 경영진보다 장기 책임을 지는 의사결정자가 후원해야 유지된다.

## 적용 점검

- 새 구축 사업이 ISP부터 시작한다면, 이미 있는 EA 산출물로 baseline을 대신할 수 있는지 먼저 확인한다.
- AI 도입 같은 기술 변화는 Business와 Data target 변경, 전환 단계와 투자 우선순위까지 정의됐는지로 계획의 완성도를 본다.
- 외주로 EA나 ISP 산출물을 만들 때는 납품 뒤 누가 어떤 주기로 갱신하는지를 계약 범위에 포함한다.

## 출처

- [90년대 개발 방식으로 AI 시대를 버틸 수 있을까? — 토크아이티(Talk IT), 박준성](https://www.youtube.com/watch?v=Qdx4HSVD2G8)
- [Cornell LII, 40 U.S. Code 11315 - Agency Chief Information Officer](https://www.law.cornell.edu/uscode/text/40/11315)
- [OMB, M-97-02 Funding Information Systems Investments](https://clintonwhitehouse5.archives.gov/OMB/memoranda/m97-02.html)
- [OMB, Circular A-130 Transmittal Memorandum No. 4 (2000)](https://clintonwhitehouse5.archives.gov/OMB/circulars/a130/a130trans4.html)
- [OMB, Circular A-130 Managing Information as a Strategic Resource (2016)](https://obamawhitehouse.archives.gov/sites/default/files/omb/assets/OMB/circulars/a130/a130revised.pdf)
- [OMB, Federal Enterprise Architecture](https://obamawhitehouse.archives.gov/node/17927)
- [CMS, Federal Enterprise Architecture Framework](https://www.cms.gov/data-research/cms-information-technology/enterprise-architecture/federal-enterprise-architecture-framework)
- [Agencies expand EA knowledge — Nextgov](https://www.nextgov.com/people/2002/05/agencies-expand-ea-knowledge/204685/)
- [The Open Group Announces the Launch of the TOGAF Standard, 10th Edition — The Open Group](https://www.opengroup.org/open-group-announces-launch-togaf-standard-10th-edition)
- [The Open Group, TOGAF Standard](https://www.opengroup.org/togaf)
- [The Open Group, TOGAF 9 Definitions (초안)](https://www.opengroup.org/architecture/doc-review/protected-d3/htmlclean/chap03.html)
- [위키문헌, 전자정부법 (법률 제10012호) 비공식 사본](https://ko.wikisource.org/wiki/전자정부법_(제10012호))
- [한국법제연구원, 전자정부법 영문 법령 (Act No. 18744, 2022)](https://elaw.klri.re.kr/kor_service/lawViewTitle.do?hseq=60309)
- [공공부문 EA 서비스요인과 성과에 관한 연구 — 정보화연구, 신다울, 박주석, 박재홍](https://koreascience.kr/article/JAKO201407954588679.page?lang=ko)
- [정보기술아키텍처 활용이 조직의 정보기술역량과 정보화성과에 미치는 영향관계: 공공기관을 대상으로 — 한국IT서비스학회지, 오승운, 김종우](https://koreascience.kr/article/JAKO200824556527011.page)
- [Dynamic method for connecting a client to a server application, 배경 설명(2차 근거) — Google Patents](https://patents.google.com/patent/US6073177A/en)

## 관련 문서

- [[ADR|ADR (Architecture Decision Record)]] — 개별 아키텍처 결정의 기록
- [[Architecture-Styles|아키텍처 스타일]] — 애플리케이션 아키텍처 수준의 선택지
- [[Tech-Debt-Management|기술 부채 관리]] — 전환 계획과 부채 상환의 우선순위
