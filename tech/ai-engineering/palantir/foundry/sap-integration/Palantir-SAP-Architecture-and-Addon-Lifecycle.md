---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-11-14
category: "AI엔지니어링(AIEngineering)"
aliases: ["SAP 연결 경로와 애드온 수명주기"]
---

# SAP 연결 경로와 애드온 수명주기

## 연결과 실행 주체

Foundry SAP Connector는 SAP 애플리케이션 계층의 HTTPS 서비스를 통해 읽고 쓴다. ABAP에 등록한 HANA 외부 뷰를 읽는 경로도 SAP 데이터베이스에 직접 접속하는 커넥터와 구분한다. 아키텍처 문서의 세 패턴은 애드온을 어디에 설치하고 원본 SAP 시스템에 어떻게 닿는지를 나눈다. 네트워크 경로인 SAP Data Accelerator는 Cloud Connector를 거쳐 이렇게 설치한 애드온으로 트래픽을 보내므로, 이 설치 패턴 선택과는 별개의 축이다(해석, Data Accelerator 문서가 네트워크 경로만 바뀐다고 설명하는 점에 근거).

| 패턴 | 애드온 위치 | 원본 접근 |
| --- | --- | --- |
| 직접 연결 | 읽을 데이터나 실행할 function/query가 있는 ERP 또는 BW 시스템 | 같은 시스템 안에서 읽는다 |
| SLT 경유 | SAP SLT Replication Server | SLT와 원본 ERP 사이 RFC 연결. 원본 테이블마다 데이터베이스 트리거로 SLT의 ODQ에 복제한다 |
| 게이트웨이 경유 | 최소 요건을 만족하는 게이트웨이 애플리케이션 서버에 주 컴포넌트 | 게이트웨이와 원본 ERP 사이 RFC 연결. 원본 ERP에 설치한 remote agent 컴포넌트가 읽기와 실행을 맡는다 |

게이트웨이 패턴은 원본 ERP가 설치 최소 요건(아키텍처 문서 기준 SAP_BASIS 7.4 SP5 이상)을 만족하지 못할 때 쓴다. 2026-11-13 확인한 아키텍처 문서는 이 패턴을 legacy로 표시하지 않는다.

- PALANTIR는 기반 컴포넌트, PALCONN은 주 커넥터, PALAGENT는 원격 연결용이다. SLT의 OData 경로에는 PALODATA가 필요하다.
- 컴포넌트의 support package 수준을 맞춘다. Support package는 SPAM, 해당 SP용 fix pack은 STMS 경로를 사용한다. 업데이트 중 동기화와 housekeeping이 잠금을 만들 수 있다.
- 설치를 수행하는 대화형 관리자와 서비스 호출용 기술 사용자는 다르다. 기술 사용자는 비대화형 System(Type B)이며 OAuth writeback에도 이 사용자 유형이 요구된다.
- 기본 지원 전제와 원격 시스템의 전제는 동일하지 않다. 원격 6.20 설치 안내를 현재 주 커넥터의 최소 버전으로 해석하지 않는다. 설치 문서는 원본 ERP가 SAP_BASIS 7.0 SP32 미만일 때 ERP 4.6C/4.7(620/640)용 Remote Agent 안내를 따르게 한다. SLT OData는 SAP_BASIS 7.50 SP09 이상이라는 별도 조건을 갖는다.
- 설치 시나리오마다 다룰 수 있는 객체가 다르다. 원본 시스템에 직접 설치(stand-alone)하면 테이블과 뷰, InfoProvider, BEx query, Business Content extractor, Function/BAPI, ABAP 기반 CDS view와 SAP Function writeback(선택적으로 OAuth 2.0 사용자 귀속)을 지원한다. SLT Replication Server에 설치하면 SLT 객체 유형만 지원한다(2026-11-13 설치 문서 기준). 이 목록은 설치 문서가 시나리오별로 든 유형이며, 아래 개요 문서의 추출 대상(SAP 데이터 모델, HANA information view 포함)과 범위가 다르다.
- 설치 문서는 개발이나 sandbox 시스템에 먼저 설치해 충분히 시험한 뒤 운영에 설치하도록 권한다.

## 네트워크 경계

신규 연결은 Foundry worker를 권장하며 agent worker는 legacy로 표시된다. 사용자 인증, egress 정책, SAP 서버 인증서 신뢰는 별도 조건이다. 인증서 기반 agent 인증에 쓰는 No authentication 선택지를 SAP 서비스의 무인증 공개로 해석하지 않는다.

SAP Data Accelerator는 SAP가 관리하는 연결 서비스로, Foundry 트래픽을 고객의 SAP Cloud Connector를 거쳐 사내 SAP 시스템으로 전달한다. 2026-11-13 확인한 공식 문서에서는 이전의 beta 표시가 빠졌고, 이 경로를 SAP가 승인한(SAP-endorsed) Palantir 연동 아키텍처로 소개하며 권장 경로로 둔다. 신규 연결만이 아니라 기존 SAP ERP, SAP SLT, SAP (Custom source) 소스도 이 경로로 돌리도록 안내한다. Data Connection agent와 secure tunnel을 쓰는 연결은 참고용 legacy 모델로만 남아 있다. 공식 문서는 사용에 추가 요금이 붙을 수 있다며 Palantir Support 문의를 안내한다. 현재 문서에 GA 표기가 있는 것은 아니므로 enrollment별 사용 가능 여부는 따로 확인한다(해석).

- 이 경로는 네트워크 경로만 바꾼다. 동기화한 데이터, SAP 애드온 인증과 동기화 설정은 그대로이므로 SAP 객체의 권한과 동기화 의미를 대체하지 않는다. 백엔드 SAP 시스템은 Cloud Connector 뒤의 사설망에 둘 수 있다.
- SAP ERP, SAP SLT와 SAP (Custom source) 소스를 이 경로로 돌릴 수 있다. 사용자 권한으로 쓰는 writeback은 SAP ERP 소스에 토큰 발급과 갱신 webhook을 만들어 outbound application에 연결한다.
- Foundry worker 소스에서만 지원하므로 agent worker 소스는 먼저 Foundry worker로 옮긴다.
- 설정 책임이 나뉜다. Data Accelerator 프로비저닝, Palantir가 발급한 클라이언트 인증서로 Foundry를 파트너 시스템으로 등록하는 일, Cloud Connector의 가상 host/port 매핑은 SAP 관리자가 SAP 도구에서 한다. Foundry 쪽은 같은 인증서를 소스에 붙이고, 소스의 host/port를 가상 값으로 두고, 제어 평면 URL과 선택적 Location ID(같은 테넌트에 Cloud Connector가 여럿일 때만)를 넣는다. SAP (Custom source)는 이 값들을 소스의 YAML 구성으로 넣는다.
- egress는 제어 평면 host와 연결마다 하위 도메인을 동적으로 할당하는 데이터 평면 wildcard 모두에 443을 열어야 한다. 엔드포인트 인증서가 공개 CA 서명이 아니면 서버 인증서도 소스에 추가한다.

### SAP 인증 기한과 전환 요구

2026-11-14 확인한 FAQ는 애드온이 2023-04-18에 SAP integration certificate를 받았고 그 유효 기간이 2026-12-31까지라고 적는다. FAQ가 링크한 인증서는 RISE with SAP의 애드온 배포 시나리오로 S/4HANA Cloud, private edition 2022에 배포하는 것을 인증한다. 인증 기능 목록은 namespace 할당, 애드온 패키징, SAINT 배포와 기술적 제거 시험, Solution Manager Ready, S/4HANA와 RISE 호환성 등이며 데이터 추출이나 연동 기능은 들어 있지 않다. Foundry 데이터 연동 전체나 ECC, BW 사용을 인증한 것으로 넓혀 읽지 않는다.

SAP Architecture Center의 Palantir 연동 레퍼런스 아키텍처(페이지 표시 갱신일 2026-10-30)는 Palantir 네이티브 SAP 커넥터의 기존 사용자가 2026-12-31까지 Data Accelerator 아키텍처로 전환해야 한다고 적는다. 이 기한 문장에는 시나리오 제한이 없다. 같은 문서의 개요는 SAP API Policy가 다루는 복제 시나리오에 Data Accelerator를 쓰도록 하고, Foundry의 writeback도 Data Accelerator를 거친다고 적는다.

- 기존 Foundry Connector 설치는 재설치나 재구성 없이 유지할 수 있다. 다만 트래픽은 Data Accelerator를 거쳐야 하고, 커넥터가 Foundry에 직접 연결하거나 이 아키텍처를 우회하는 데 쓰이면 안 된다고 SAP 문서가 적는다. 위 표의 설치 패턴(직접 연결, SLT 경유, 게이트웨이 경유)은 그대로 두고 네트워크 경로만 바꾸는 요구로 본다(해석, Data Accelerator 문서가 네트워크 경로만 바뀐다고 설명하는 점에 근거). 게이트웨이 패턴이 Data Accelerator와 함께 동작하는지를 명시한 문서는 확인하지 못했다.
- 따라서 Data Accelerator를 거치지 않고 Foundry에 연결되는 기존 소스(agent worker, 또는 Data Accelerator를 설정하지 않은 Foundry worker)는 이 기한 안의 일정으로 전환한다(운영 제안). 첫 단계로 enrollment의 Data Accelerator 사용 가능 여부와 추가 요금을 Palantir Support에 확인한 뒤, Foundry worker 이전과 Data Accelerator 설정을 진행한다.
- 인증서 만료 뒤의 갱신 여부와, 기한 뒤 우회 연결이 기술적으로 막히는지는 FAQ, 인증서, SAP 레퍼런스 아키텍처와 Palantir Data Accelerator 문서에 없어 미확인이다. 계약과 라이선스 영향은 SAP API Policy를 기준으로 SAP 담당자와 Palantir Support에 확인한다.

## 개요 문서의 지원 범위

개요 문서는 연결을 ABAP 애드온 설치, Data Accelerator 설정, SAP 환경에 맞는 Foundry worker 소스 구성의 세 단계로 정리한다. 소스 커넥터는 ECC와 S/4HANA(온프레미스와 Cloud Private Edition)용 SAP ERP, 실시간 스트리밍 동기화를 포함한 SLT Replication Server 경유 연결용 SAP SLT로 나누고, BW와 기존 연동은 SAP (Custom source)로 안내한다.

- 애드온 이름은 Palantir Foundry Connector 2.0 for SAP Applications이며 Diskover Limited와 함께 개발했다. SAINT로 설치하고 SICF 웹 서비스로 HTTPS 접근을 연다. 데이터베이스에 직접 접근하지 않고 SAP ABAP platform의 애플리케이션 계층과 SAP 사용자 권한으로 읽는다. 추출 전에 시스템 부하 기준을 확인하고 맞지 않으면 중단한다.
- 기능 상태(문서 확인 기준 2026-11-13): bulk import, interactive exploration, webhooks는 일반 제공, streaming import는 beta, bulk export는 개발 중이다.
- 추출 대상은 애플리케이션 테이블, BW InfoProvider, SLT, BEx query, ERP extractor, Function/BAPI, SAP 데이터 모델, CDS view, HANA information view다.
- 최소 버전은 SAP_BASIS 7.4 SP5 이상 또는 7.5(SP 무관)이며 SAP_BASIS 8.x 기반 S/4HANA도 지원한다. 7.4 SP5 미만은 Remote Agent 설치를 쓴다.

## 패키지 배포 경로

애드온 패키지와 release notes는 Foundry enrollment의 Data Connection에서 받는다. 기존 설치는 SAP 소스의 Connection settings 탭의 Download packages 단계, 신규 설치는 SAP ERP나 SAP SLT 타일로 소스를 만드는 마법사의 두 번째 단계에서 찾는다. 대상 시스템의 SAP_BASIS 버전에 맞는 묶음을 받아 설치와 업데이트를 맡는 팀(예: SAP Basis 팀)에 넘긴다.

- SAP Solutions Extension(SolEx)으로 라이선스를 받았으면 Foundry 대신 SAP Software Download Center에서 ABAP 애드온 설치 패키지를 받는다.
- 게이트웨이 패턴은 게이트웨이와 원본 양쪽에 설치하므로 패키지 두 개를 받는다. 다운로드 문서와 FAQ는 이 조건을 SAP_BASIS 7.4 미만으로 적고, 아키텍처, 개요와 설치 문서는 7.4 SP5 미만으로 적는다. 7.4 SP0~SP4 시스템도 게이트웨이 대상으로 보고, Download packages 화면의 버전별 구분과 release notes로 확인한다(해석). 게이트웨이 서버 자체의 요건도 FAQ는 SAP_BASIS 7.4 이상, 아키텍처 문서는 최소 요건(7.4 SP5 이상) 충족으로 적으므로 7.4 SP5 이상을 안전한 기준으로 둔다(해석).

## 상태를 가진 설치

SP13 이후 백업 ZIP에는 커넥터 테이블과 증분 포인터가 들어간다. 재설치 후 상태 복원은 연결 정보만 다시 입력하는 것과 다르며, 백업에는 민감 데이터 설정(CFG_02)과 암호화 키(ENC_01)가 포함된다. 제거 시 기반 PALANTIR보다 종속 컴포넌트들을 먼저 제거하거나 함께 제거한다.

백업과 복원은 시스템 이전이나 제거 전후에 쓰는 트랜잭션 코드 한 쌍이다(2026-11-13 확인). `/n/palantir/backup`은 커넥터 테이블 전체와 내용을 ZIP으로 만들어 파일 시스템에 내려받고, 재설치 뒤 `/n/palantir/restore`가 같은 ZIP에서 테이블을 되살린다. 문서는 복원 뒤 구성 매개변수와 테이블 내용을 다시 확인하라고만 안내한다.

| 테이블 | 담는 상태 | 다룰 때의 의미 |
| --- | --- | --- |
| `/PALANTIR/AGT_01`, `AGT_02` | remote agent의 ID와 설명, agent로 가는 RFC 연결, resource check 설정과 page size | 게이트웨이 패턴의 RFC 대상이 이전 뒤 바뀌면 복원값을 그대로 쓸 수 없다(해석) |
| `/PALANTIR/CFG_01` | extractor 기본값, 객체 유형 설정, resource check 같은 커넥터 매개변수 | 시스템 부하 기준이 함께 돌아온다 |
| `/PALANTIR/CFG_02` | 객체와 필드 단위의 마스킹, 해싱, 암호화 설정 | 민감 데이터 보호 규칙 |
| `/PALANTIR/CFG_03` | Foundry sync 필터와 별개로 커넥터에 거는 객체별 사전 필터 | 빠지면 추출 범위가 조용히 넓어진다(해석) |
| `/PALANTIR/ENC_01` | 암호화 키 | ZIP 자체를 비밀 자료로 보관한다(해석) |
| `/PALANTIR/INC_01`, `INC_02` | 증분 필드와 유형, Foundry가 요청한 과거 증분 값과 성공 여부 | 문서는 추출을 이어가려면 커넥터 포인터와 시스템 설정을 복원해야 한다고만 적는다. 이 두 테이블이 그 포인터인지, 빠지면 어떻게 동작하는지는 명시되지 않았다 |
| `/PALANTIR/JOB`, `PAG_01` | page ID별 예정 job과 page 헤더 | 페이지 단위 추출의 진행 상태로 보인다(해석) |

이 목록은 커넥터가 SAP 쪽에 들고 있는 상태의 지도이기도 하다. Foundry 쪽 데이터셋과 sync 설정은 이 백업에 들어 있지 않으므로 둘의 증분 상태가 어긋나지 않게 맞춘다(해석).

이 문서는 공식 문서의 계약을 대조한 기록이다. 실제 SAP 설치, 네트워크 연결과 복원 시험은 수행하지 않았다.

## 출처

- [Palantir sap, sap](https://www.palantir.com/docs/foundry/sap)
- [Palantir sap, addon-parameters](https://www.palantir.com/docs/foundry/sap/addon-parameters)
- [Palantir sap, architecture](https://www.palantir.com/docs/foundry/sap/architecture)
- [Palantir sap, authorization-roles](https://www.palantir.com/docs/foundry/sap/authorization-roles)
- [Palantir sap, backup-restore](https://www.palantir.com/docs/foundry/sap/backup-restore)
- [Palantir sap, configure-bex-query](https://www.palantir.com/docs/foundry/sap/configure-bex-query)
- [Palantir sap, configure-custom-authorizations](https://www.palantir.com/docs/foundry/sap/configure-custom-authorizations)
- [Palantir sap, configure-extractors](https://www.palantir.com/docs/foundry/sap/configure-extractors)
- [Palantir sap, configure-functions](https://www.palantir.com/docs/foundry/sap/configure-functions)
- [Palantir sap, configure-sap-slt](https://www.palantir.com/docs/foundry/sap/configure-sap-slt)
- [Palantir sap, configure-tcode-extraction](https://www.palantir.com/docs/foundry/sap/configure-tcode-extraction)
- [Palantir sap, create-sap-rfc-connection](https://www.palantir.com/docs/foundry/sap/create-sap-rfc-connection)
- [Palantir sap, data-accelerator](https://www.palantir.com/docs/foundry/sap/data-accelerator)
- [Palantir sap, download-sap-addon](https://www.palantir.com/docs/foundry/sap/download-sap-addon)
- [Palantir sap, extract-long-text](https://www.palantir.com/docs/foundry/sap/extract-long-text)
- [Palantir sap, faq](https://www.palantir.com/docs/foundry/sap/faq)
- [Palantir sap, housekeeping](https://www.palantir.com/docs/foundry/sap/housekeeping)
- [Palantir sap, ingest-hana-views](https://www.palantir.com/docs/foundry/sap/ingest-hana-views)
- [Palantir sap, install-sap](https://www.palantir.com/docs/foundry/sap/install-sap)
- [Palantir sap, install-sap-connector](https://www.palantir.com/docs/foundry/sap/install-sap-connector)
- [Palantir sap, install-sap-fixpack](https://www.palantir.com/docs/foundry/sap/install-sap-fixpack)
- [Palantir sap, install-sap-remote-agent](https://www.palantir.com/docs/foundry/sap/install-sap-remote-agent)
- [Palantir sap, install-sap-remote-agent-620](https://www.palantir.com/docs/foundry/sap/install-sap-remote-agent-620)
- [Palantir sap, install-sap-support-package](https://www.palantir.com/docs/foundry/sap/install-sap-support-package)
- [Palantir sap, oauth2-writeback](https://www.palantir.com/docs/foundry/sap/oauth2-writeback)
- [Palantir sap, overview](https://www.palantir.com/docs/foundry/sap/overview)
- [Palantir sap, sap-cockpit](https://www.palantir.com/docs/foundry/sap/sap-cockpit)
- [Palantir sap, sap-dynamic-filters](https://www.palantir.com/docs/foundry/sap/sap-dynamic-filters)
- [Palantir sap, sap-exploration](https://www.palantir.com/docs/foundry/sap/sap-exploration)
- [Palantir sap, sap-incremental-syncs](https://www.palantir.com/docs/foundry/sap/sap-incremental-syncs)
- [Palantir sap, sap-object-types](https://www.palantir.com/docs/foundry/sap/sap-object-types)
- [Palantir sap, sap-source-setup](https://www.palantir.com/docs/foundry/sap/sap-source-setup)
- [Palantir sap, sap-streaming-sync-setup](https://www.palantir.com/docs/foundry/sap/sap-streaming-sync-setup)
- [Palantir sap, sap-sync-setup](https://www.palantir.com/docs/foundry/sap/sap-sync-setup)
- [Palantir sap, uninstall-sap](https://www.palantir.com/docs/foundry/sap/uninstall-sap)
- [SAP Architecture Center, SAP Data Accelerator Integration with Palantir Foundry](https://architecture.learning.sap.com/docs/ref-arch/968090)
- [SAP, Palantir Foundry Connector 2.0 for SAP Applications Certificate](https://sapblobs.blob.core.windows.net/csd-live/palantir-foundry-connector-20-for-sap-applications-certificate-a3d8f100-3749-11f1-9de2-05335378c217)

## 관련 문서

- [[Palantir-SAP-Integration]]
