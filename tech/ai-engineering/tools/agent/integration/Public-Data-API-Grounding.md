---
tags: [ai, agent, integration, open-api, public-data, grounding]
status: done
verified_at: 2026-11-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Public Data API Grounding", "공공 데이터 API 근거 연결", "원천 데이터 API 연동"]
---

# 공공 데이터 API로 에이전트 답변의 근거 연결

공시, 통계, 법령, 사업자 상태, 실거래가, 학술 문헌처럼 데이터를 관리하는 기관이나 여러 원천을 모아 공개하는 공식 서비스의 Open API를 에이전트의 도구로 연결해, 모델의 기억이나 웹 검색 결과 대신 그 시스템의 응답을 근거로 답하게 하는 구성이다. 도구 호출 자체의 구조는 [[LLM-Workflow-Patterns-Function-Calling|Function Calling]]과 [[MCP|MCP]], 환각 통제에서의 위치는 [[LLM-Workflow-Patterns-Data-and-Operations|근거 기반 답변]]을 따른다.

## 웹 검색과 무엇이 다른가

- **원천에 가깝다:** 검색 결과는 원천 데이터를 옮겨 적은 2차 페이지일 수 있다. 원천 기관이 운영하거나 공식 포털이 중계하는 API는 2차 페이지보다 옮겨 적는 단계가 적어 그 과정의 오류가 줄고, 응답에 남은 조회 조건(코드, 기간)으로 같은 조회를 다시 실행해 비교할 수 있다. 다만 통계는 개정되고 공시는 정정되므로 같은 조건이라도 나중에 값이 달라질 수 있어, 조회 시각이나 FRED의 `realtime_start`, `realtime_end` 같은 시점 기준을 함께 기록한다.
- **검색되지 않는 데이터에 닿는다:** 사업자등록번호 같은 식별자를 입력해야 조회되는 원천 시스템의 결과는 검색 엔진이 색인하기 어렵다. 제3자가 옮겨 둔 사본이 검색되더라도 그것은 위의 2차 페이지에 해당한다.
- **구조화된 값이 온다:** 숫자와 코드가 필드로 오므로 모델이 문장에서 숫자를 추출하지 않고 바로 계산과 비교에 넘길 수 있다.

반대로 다음은 API 연결만으로 보장되지 않는다.

- **실시간과 최신은 다르다:** 포털의 갱신 주기 표시와 실제 반영 시점이 다를 수 있다. 국세청 사업자 상태조회는 포털 메타데이터가 실시간으로 표시되지만 본문 설명은 30분 주기 갱신이며 신규 사업자는 반영까지 1~2일이 걸린다고 밝힌다(2026-11-16 공공데이터포털 기준). 실거래가처럼 신고에 기반한 데이터는 거래 시점과 신고, 공개 시점 사이에도 차이가 생긴다.
- **원천의 정확성 이상을 보장하지 않는다:** API는 기관에 신고되거나 공시된 값을 돌려줄 뿐이며, 그 값의 정정과 누락은 원천의 문제다. 공공데이터포털의 API는 포털 게이트웨이를 거치거나 원천과 주기적으로 동기화한 저장소에서 응답할 수 있다. FRED나 OpenAlex처럼 여러 원천을 모아 제공하는 집계 서비스는 중계와 가공 단계가 더 있다. OpenAlex는 저자 식별을 기계학습으로 처리한다고 밝히므로, 이런 필드는 원천에 보고된 값이 아니라 집계 서비스의 추정으로 다룬다.
- **모델의 요약 오류는 남는다:** 도구가 정확한 값을 돌려줘도 모델이 단위, 기간이나 항목을 바꿔 옮길 수 있다. 수치는 도구 응답에서 그대로 인용하고, 계산은 코드로 하게 하며, 답에 조회 조건을 함께 남긴다.

## 영역별 공식 API 예시

2026-11-16 각 기관 공식 페이지에서 확인한 범위다. 한국은행 ECOS 행은 공식 페이지 본문을 읽지 못해 서비스 이름만 확인했고 제공 범위와 접근 조건은 확인 범위에서 제외한다. 이용 한도와 조건은 바뀌므로 연결 전 해당 포털에서 다시 확인한다.

| 영역 | 제공처 | 제공 범위 | 접근 조건 |
|---|---|---|---|
| 국내 공시와 재무 | OPEN DART(금융감독원) | 공시보고서 원문, 사업보고서 주요항목과 주요재무계정, 지분보고서, 주요사항보고서, 증권신고서 정보 | 인증키 신청 메뉴로 키 발급 |
| 국내 경제 통계 | 한국은행 ECOS Open API | 미확인 | 미확인 |
| 경제 시계열 | FRED API(세인트루이스 연준, 집계 서비스) | 국내외 여러 공공, 민간 원천에서 모은 시계열 | 모든 요청에 API 키 필요, 일부 시계열은 제3자 소유로 저작권 제한이 있을 수 있음 |
| 미국 공시 | SEC EDGAR API(`data.sec.gov`) | 제출 이력(`submissions`), XBRL 재무 사실(`companyfacts`, `companyconcept`, `frames`) | 키 없음, 요청 헤더에 User-Agent 선언, 최대 초당 10건 |
| 법령과 판례 | 국가법령정보 공동활용(법제처) | 법령, 행정규칙, 자치법규, 법령해석례, 법원판례, 헌재결정례, 행정심판례, 조약, 영문번역 법령 등 | Open API 사용 신청 |
| 사업자 상태 | 국세청 사업자등록정보 진위확인 및 상태조회(공공데이터포털) | 사업자번호로 휴업, 폐업 상태와 과세유형, 폐업일자 조회, 등록 정보 진위확인 | 서비스키 필요, 1회 100건과 1일 100만 건 제한, 무료 |
| 부동산 거래 | 국토교통부 아파트 매매 실거래가 자료(공공데이터포털) | 법정동코드 앞 5자리와 계약년월(월 단위)별 아파트 매매 실거래가 | 서비스키 필요, 무료 |
| 학술 문헌 | OpenAlex(집계 서비스) | Crossref, ORCID, PubMed 등에서 모은 연구 문헌 색인, 레코드는 CC0 | 키 없이 기본 조회 가능, 무료 키는 일일 사용 한도를 10배로 올리고 첫 페이지 이후 커서 페이지 조회에 필요 |

공공데이터포털(`data.go.kr`)에는 이 밖에도 기관별 Open API가 모여 있어, 특정 업무 영역의 원천을 찾을 때 출발점으로 쓸 수 있다.

## 도구로 연결할 때의 설계

아래 설계와 판단은 위 표의 이용 조건에서 도출한 운영 지침이며, 특정 출처가 제시한 규칙은 아니다.

- **입력을 원천의 식별 체계로 받는다:** 법정동코드, 사업자등록번호, SEC의 CIK, 시계열 ID처럼 원천이 쓰는 식별자를 도구 입력으로 둔다. 회사명이나 지역명 같은 자연어를 코드로 바꾸는 단계는 별도 조회 도구로 분리하고, 후보가 여럿이면 모델이 임의로 고르지 않고 되묻게 한다.
- **키는 서버 쪽에 둔다:** 인증키와 서비스키는 도구 실행 환경의 비밀 값으로 보관하고 프롬프트, 도구 설명과 응답에 넣지 않는다. 에이전트 도구의 권한 경계는 [[MCP-Security-Boundaries|MCP 보안 경계]]를 따른다.
- **원천의 이용 규칙을 코드로 지킨다:** 일일 호출 한도와 초당 요청 수를 도구 쪽에서 제한하고, 같은 조건의 반복 조회는 캐시한다. SEC처럼 User-Agent 선언을 요구하는 원천은 요청 헤더를 도구 구현에 고정한다.
- **결과 없음과 실패를 구분한다:** 조회 결과 0건, 인증 오류, 한도 초과, 원천 점검 중을 서로 다른 응답으로 돌려준다. 실패를 빈 결과로 넘기면 모델이 없다고 단정한다.
- **출처를 응답에 붙인다:** 원천 이름, 조회 조건과 조회 시각을 도구 응답에 넣어 답변이 그 값을 인용할 수 있게 한다. 데이터의 기준 시점(공시일, 통계 기준기간, 신고일)은 조회 시각과 따로 남긴다.
- **재사용 조건을 확인한다:** 데이터 라이선스와 재배포 조건은 원천마다 다르다. OpenAlex처럼 CC0로 밝힌 경우가 아니면 각 포털의 이용약관을 확인한 뒤(FRED 이용약관은 제3자 소유 시계열을 개인 용도 밖에서 쓰려면 데이터 소유자의 허락을 받으라고 하며, 저작권 있는 시계열은 설명에 Copyright 표기가 붙는다) 결과를 저장하거나 고객에게 제공한다.

## 업무에 붙일 때의 판단

- 반복 조회가 많고 원천이 정해진 업무부터 연결한다. 거래처 사업자 상태 확인, 관심 기업의 공시 모니터링, 거시 지표 대시보드처럼 같은 질의가 주기적으로 반복되는 업무는 정기 수집 작업으로 두고, 에이전트는 수집된 값을 해석하게 하는 편이 호출 한도와 비용 관리에 유리하다.
- 법률, 세무, 의료처럼 오류 비용이 큰 영역은 원문 조회 결과를 근거로 제시하되 최종 판단을 사람이 확인하는 단계를 둔다. 판례와 법령 원문을 가져와도 사안에 적용하는 해석은 별개다.
- 여러 원천을 결합할 때는 기준 시점이 서로 다른 값을 한 표에 섞지 않는다. 섞어야 하면 열마다 기준일을 붙인다.

## 체크포인트

- 이 도구의 응답에 원천 이름, 조회 조건, 기준 시점이 들어 있는가
- 결과 0건과 오류, 한도 초과를 모델이 구분할 수 있는가
- 인증키가 프롬프트나 로그에 노출되지 않는가
- 원천의 호출 한도와 이용약관을 도구가 지키는가
- 모델이 옮긴 수치를 도구 응답과 대조하는 검증이 있는가

## 출처

- [금융감독원, OPEN DART 소개](https://opendart.fss.or.kr/intro/main.do)
- [SEC, EDGAR Application Programming Interfaces](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
- [SEC, Accessing EDGAR Data](https://www.sec.gov/os/accessing-edgar-data)
- [Federal Reserve Bank of St. Louis, FRED API Keys](https://fred.stlouisfed.org/docs/api/api_key.html)
- [Federal Reserve Bank of St. Louis, FRED API Terms of Use](https://fred.stlouisfed.org/docs/api/terms_of_use.html)
- [Federal Reserve Bank of St. Louis, FRED Real-Time Periods](https://fred.stlouisfed.org/docs/api/fred/realtime_period.html)
- [Federal Reserve Bank of St. Louis, What is FRED](https://fred.stlouisfed.org/help/about/about-fred/what-is-fred/)
- [한국은행, ECOS Open API 서비스](https://ecos.bok.or.kr/api/)
- [법제처, 국가법령정보 공동활용](https://open.law.go.kr/LSO/main.do)
- [법제처, OPEN API 활용방법](https://open.law.go.kr/LSO/openApi/guideList.do)
- [공공데이터포털, 국세청 사업자등록정보 진위확인 및 상태조회 서비스](https://www.data.go.kr/data/15081808/openapi.do)
- [공공데이터포털, 국토교통부 아파트 매매 실거래가 자료](https://www.data.go.kr/data/15126469/openapi.do)
- [OpenAlex, Authentication](https://help.openalex.org/api/authentication/)
- [OpenAlex, Pricing](https://help.openalex.org/access/pricing/)
- [OpenAlex, How it's built](https://help.openalex.org/data/how-its-built/)

## 관련 문서

- [[Agent-Integration|에이전트와 업무 시스템 연결]]
- [[Agent-Ready-Data|에이전트용 데이터 준비]]
- [[Agent-Data-Analysis-Workflow|에이전트 데이터 분석과 보고서]]
- [[LLM-Workflow-Patterns-Function-Calling|Function Calling과 스킬 시스템]]
- [[LLM-Workflow-Patterns-Data-and-Operations|환각 통제와 운영]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
