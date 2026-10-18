---
tags: [palantir, power-bi, gateway, identity]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry Power BI 연결과 게시"]
---

# Power BI 연결과 게시의 identity

Power BI Desktop에서 작성자의 권한으로 dataset을 읽는 것과 Service에 게시한 보고서가 refresh하는 것은 다른 실행이다. 게시 후에는 gateway credential과 Power BI 공유 권한까지 검토해야 한다.

## Import, DirectQuery와 REST

인증된 Foundry Power Query connector는 Power BI Desktop June 2020 이후 버전과 gateway를 통한 Service 연결을 지원한다. Desktop의 built-in connector 외에도 Foundry ODBC driver를 설치한다.

| 모드 | 동작과 선택 조건 |
|---|---|
| Import | 데이터를 Power BI로 복사한다. 상호작용이 빠르지만 수동/예약 refresh 사이의 변경은 반영되지 않는다 |
| DirectQuery | 상호작용 때 backend로 query한다. 큰 원본에서 필요한 결과를 읽을 수 있지만 지연, query 수와 결과 한도를 고려한다 |
| Composite | 자주 보는 집계는 Import하고 상세 조회는 DirectQuery로 분리한다 |
| REST fallback | 작은 데이터의 Import 용도다. DirectQuery를 지원하지 않는다 |

REST custom connector를 설치하는 경로는 `.mez`와 unsigned extension 허용 설정을 요구한다. Built-in 연결과 동일한 배포 계약으로 취급하지 않는다. 반대 방향인 XMLA를 통한 Power BI 데이터 ingest도 별도 통합이다.

큰 데이터를 무조건 Import하기보다 사전 집계, 불필요한 column 제거와 연도별 분할을 검토한다. Dataset 경로를 참조한 report는 이동/개명으로 refresh가 깨질 수 있으므로 가능한 RID 기반 식별을 사용한다. Navigator에 보이지 않는 dataset도 parent folder 권한 부족일 수 있어 RID로 직접 지정할 수 있다.

## 게시 후 credential

Desktop의 OAuth는 individual developer flow이며 third-party application을 활성화해야 한다. Token 인증도 가능하다. Service는 gateway의 저장 credential로 refresh하며 report viewer의 Foundry identity를 자동 전달하는 것은 아니다. Power BI에서 report를 공유할 때 Foundry의 사용자별 접근과 별개로 복사된 데이터의 공개 범위를 결정한다.

확인일의 공식 페이지 사이에는 인증 안내 차이가 있다. Getting started는 confidential third-party application의 client credentials를 Service에 권장하며 OSDK 없이 service user에 dataset 권한을 부여하도록 안내한다. FAQ는 gateway의 token-only/OAuth 미지원 경로를 설명한다. 따라서 gateway의 모든 버전이 token만 지원한다거나 interactive OAuth가 Service에서도 된다고 단정하지 않는다. 배포할 connector/gateway 버전의 credential 선택지와 해당 안내를 대조한다.

Dataflow에서 기존 gateway connection을 먼저 구성하는 우회는 Service의 연결 생성 문제에 대한 안내다. Base URL은 trailing slash까지 connection과 일치시킨다. Custom DSN `FoundrySql`의 추가 설정은 사용할 수 있지만 server/auth 값은 connector가 덮어쓴다.

## 장애 확인

Token 만료나 cache 문제는 Power BI의 Foundry connection credential을 지우고 다시 인증한다. 다운로드한 report가 빈 화면일 때는 Edit Queries의 구체적인 오류를 확인한다. Desktop 성공만으로 gateway host의 driver, network, credential과 refresh 권한을 검증한 것은 아니다.

## 출처

- [Palantir, Power BI overview](https://www.palantir.com/docs/foundry/analytics-connectivity/power-bi-overview)
- [Palantir, Power BI setup](https://www.palantir.com/docs/foundry/analytics-connectivity/power-bi-setup)
- [Palantir, Power BI getting started](https://www.palantir.com/docs/foundry/analytics-connectivity/power-bi-getting-started)
- [Palantir, Power BI FAQs](https://www.palantir.com/docs/foundry/analytics-connectivity/power-bi-faqs)
- [Palantir, Power BI REST connector](https://www.palantir.com/docs/foundry/analytics-connectivity/power-bi-rest)

## 관련 문서

- [[Palantir-SQL-Drivers-and-BI-Connectivity|Driver와 인증 계약]]
- [[Palantir-Tableau-Publication|Tableau의 게시 방식]]
