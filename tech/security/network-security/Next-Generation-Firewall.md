---
tags: [security, network-security, firewall, ngfw, tls-inspection, microsegmentation, benchmarking]
status: done
verified_at: 2026-11-23
category: "Security - 네트워크 보안"
aliases: ["Next-Generation Firewall", "NGFW", "차세대 방화벽", "TLS Inspection", "TLS 검사", "HTTPS 가로채기", "RFC 9411", "방화벽 성능 측정"]
---

# 차세대 방화벽(NGFW): 앱과 사용자 인지, TLS 검사와 성능 수치 읽기

방화벽은 패킷 필터에서 시작해 연결 상태를 기억하는 stateful inspection, 응용 프로토콜을 해석하는 검사(일부 벤더는 DPI라 부른다), 사용자 신원 기반 정책으로 넓어졌고, 여러 기능을 한 장비에 묶은 UTM도 나왔다(NIST SP 800-41 Rev. 1, 2009). 차세대 방화벽(NGFW)은 이런 기능을 트래픽 경로 위의 한 장비에서 함께 돌리는 장비군의 이름이다. IETF의 성능 측정 방법론 RFC 9411(2023-03)도 NGFW의 정의는 외부 설명에 맡기고, 측정할 때 켤 기능만 정한다. 권장 기능은 TLS 검사, IDS/IPS, 안티스파이웨어, 안티바이러스, 안티봇넷, 회피 방지, 애플리케이션 식별이고 웹 필터링, DLP, DDoS 방어와 인증서 검증은 선택이다. UTM과 보안 장비의 배치 순서는 [[Network-Perimeter-Security|네트워크 경계 보안]]에 있다.

2026-11-23 아래 표준과 공식 문서를 대조했다. AI 시대 방화벽의 역할 변화는 2026년 9월 시큐아이 발표 자료의 구조를 일반화했다.

## 포트 기반 통제가 놓치는 것

- **포트는 응용을 말해 주지 않는다**: 포트 443 하나에 웹, SaaS, 외부 LLM API와 터널이 함께 얹힌다. NIST NCCoE SP 1800-38B 예비 초안은 DNS over HTTPS가 HTTPS의 ALPN ID를 쓰는 것처럼 일부 ALPN 식별자가 감시를 어렵게 하려고 겹쳐 쓰여, 서버가 지원하는 응용 계층 프로토콜은 수동 감시보다 능동 스캔이 정확하게 잰다고 본다. 같은 초안은 한 프로토콜이 여러 포트에 나타날 수 있다며, 443은 HTTPS로 등록돼 있지만 HTTPS는 다른 등록 서비스 이름으로도 쓰이고 TLS는 HTTPS가 아닌 프로토콜에도 등록돼 있다는 예를 든다. IP와 포트 규칙은 같은 목적지로 가는 허용된 업무와 섀도 AI를 구분하지 못하므로 응용 식별이 필요하다(해석).
- **사용자를 보지 못한다**: 전통적인 패킷 필터는 트래픽 안의 사용자 신원을 보지 못해 사용자 기반 정책을 걸 수 없다. 사용자 기반 정책을 집행하는 방화벽은 접속한 IP만이 아니라 사용자 신원도 로그에 남겨야 한다(SP 800-41 Rev. 1의 4.3절).
- **기기 상태를 보지 못한다**: NAC는 사용자 자격 증명과 단말 상태 점검(health check) 결과로 접근을 허용하고, 자격은 있지만 점검에 실패한 단말에는 복구용 제한 접근만 줄 수 있다(같은 문서 2.1.7절).

## 암호화된 트래픽과 TLS 검사

- **볼 수 없는 트래픽의 처리 규칙이 먼저다**: 방화벽은 암호화된 응용 데이터를 읽지 못하고, 이해하지 못하는 트래픽을 어떻게 다룰지는 규칙이 정한다. SP 800-41 Rev. 1은 암호화가 허가되지 않은 암호화 트래픽을 허용할지 막을지 정책으로 정하라고 한다.
- **TLS 검사의 대가**: 검사 장비가 TLS를 끊고 다시 맺으면 클라이언트는 장비와의 연결만 검증할 수 있고 서버 인증서 검증은 장비에 맡긴다. CISA 경보 TA17-075A(2017)는 많은 HTTPS 검사 제품이 서버 인증서 체인을 제대로 검증하지 않거나 검증 오류를 클라이언트에 전하지 않았고, 서버 쪽으로 폐기된 프로토콜 버전이나 약한 암호를 허용할 수 있다고 지적했다. 보관 문서지만 점검 항목은 그대로 쓸 수 있다.
- **시험할 것(운영 제안)**: 장비의 서버 인증서 검증, 서버 쪽 허용 프로토콜과 암호 스위트, 복호화 제외 대상(인증서를 고정한 앱, 민감 정보가 많은 범주)을 시험한다. TLS 키 교환에 PQC 하이브리드가 들어오고 있으므로([[TLS-Config|TLS 설정]]) 검사 장비가 이를 지원하는지, 지원하지 않으면 연결을 고전 키 교환으로 낮추는지도 확인한다.
- 네트워크 인라인 검사와 애플리케이션이 부르는 검사 API의 차이는 [[Inline-vs-Out-of-Path#AI 런타임 검사: API 판정과 실제 차단|AI 런타임 검사 위치]]에 있다.

## AI 사용이 바꾸는 트래픽과 방화벽의 역할

AI 사용이 늘면 외부 LLM API로 나가는 트래픽과 온프레미스와 클라우드 사이 트래픽이 늘고, 내부 시스템과 AI 에이전트 사이의 East-West 교환이 늘며, 암호화 트래픽이 일반화돼 가시성을 얻기 어렵다(발표 자료). 같은 장의 비율 수치(데이터센터 East-West 비중 등)는 출처가 적혀 있지 않아 옮기지 않았다.

- **에이전트 사이 트래픽**: Gartner는 2026년 말까지 기업 애플리케이션의 40%가 작업 특화 AI 에이전트를 통합하고(2025년 5% 미만), 2027년에는 에이전틱 AI 구현의 3분의 1이 애플리케이션과 데이터 환경 안에서 서로 다른 기술의 에이전트를 묶어 쓰고, 2028년에는 여러 애플리케이션에 걸친 에이전트 생태계로 간다고 전망했다(2025-08-26 발표, 전망치).
- **경계 한 곳에서 내부 구간으로**: 내부 East-West가 커지면 경계 한 곳의 차단보다 구간마다의 정책 집행 지점이 중요해진다. NIST SP 800-207 3.1.2절은 마이크로 세그멘테이션의 정책 집행 지점(PEP)의 하나로 NGFW를 든다. 이 인용은 [[Network-Separation#판단: 경계 모델의 위치|경계 모델과 제로 트러스트]]에서 원문과 대조한 문장을 옮긴 것이며, 이 문서에서는 원문을 다시 대조하지 않았다. 구성의 예로는 인사 시스템(AD, LDAP)의 사용자 정보, 필수 소프트웨어와 보안 업데이트, 백업과 암호화 같은 PC 보안 설정, 기기 정보를 묶어 개발망과 업무망 사이를 가상 시스템과 VRF로 나누는 방식이 있다(발표 자료).
- **시그니처 너머의 탐지**: 시그니처는 알려진 위협만 잡으므로 탐지를 위협 종류별로 나눈다. 알려진 위협은 장비의 IPS, 안티바이러스, URL 필터링이 위협 인텔리전스 DB와 연동해 막고, 변종 악성코드는 장비 안의 경량 인라인 AI 엔진이 판정하되 모델은 장비 밖에서 학습해 배포하며, 알려지지 않은 신규 위협은 파일과 URL을 뽑아 외부 AI 분석에 요청한 결과로 대응하고, 이상 행위는 증거를 모아 SIEM과 SOAR로 보내 대응한다(발표 자료). 인라인 판정의 지연과 오탐은 곧 정상 통신의 지연과 차단이 되고, 외부 분석으로 보내는 파일은 데이터 반출 경계가 된다(해석, [[Inline-vs-Out-of-Path|인라인 배치의 대가]]).
- **사람 손보다 빠른 공격**: CrowdStrike 2026 Global Threat Report(2026-02-24)는 2025년 eCrime의 평균 breakout time(최초 접근에서 다른 시스템으로 측면 이동하기까지)이 29분, 가장 빠른 사례가 27초였다고 밝혔다. 벤더 자체 관측값이다. 같은 29분이 발표 자료에는 출처 없이 최초 침투 후 내부망 이동 평균 시간으로 적혀 있다. 사람 중심의 수동 대응을 자동화된 대응 체계로 바꿔야 한다는 결론은 이 수치가 아니라 AI 모델의 공격 능력을 다룬 다른 장에서 나온다(발표 자료). 그 장의 공격 능력 주장은 대조하지 않았다. 자동 대응의 권한 경계는 [[AI-Accelerated-Threat-Defense#AI에게 방어를 맡길 때의 권한 경계|AI 방어 자동화의 권한 경계]]를 따른다.

## 전용 프로세서와 평면 분리

UTM처럼 한 장비가 여러 기능을 맡으면 장비는 모든 기능을 감당할 CPU와 메모리를 가져야 한다(SP 800-41 Rev. 1의 2.1.8절). CPU 기반 장비의 병목은 NIC와 CPU 사이의 패킷 처리, 앱 식별을 위한 다수의 패턴 매칭, 프록시와 암복호화에서 생긴다(발표 자료).

- **평면 분리**: 설정, 모니터링, 로그와 위협 분석 같은 관리 기능(control plane)과 패킷 전달, 패턴 매칭, 암복호화 같은 처리(data plane)를 나누고, 처리 쪽을 FPGA나 DPU 같은 전용 하드웨어로 넘긴다. 암호화 하드웨어 가속은 오래된 방식이며, SP 800-41 Rev. 1도 많은 방화벽이 VPN 처리의 영향을 줄이려 암호화 가속 하드웨어를 넣는다고 적는다.
- **대가(해석)**: 새 프로토콜과 알고리즘 지원이 하드웨어나 펌웨어 갱신에 묶일 수 있다. PQC처럼 알고리즘을 바꿔야 할 때 장비가 소프트웨어 업데이트로 따라갈 수 있는지 구매 시점에 확인한다([[PQC-Migration#지속적인 암호 민첩성|암호 민첩성]]).

## 성능 수치를 읽는 법

RFC 9411은 측정 조건을 이렇게 정한다.

- 장비는 인라인 모드로 두고, 실제 배포와 같은 보안 기능을 모든 시험에서 같게 켠다. 권장 기능을 끄면 그 이유와 성능에 영향이 있을 수 있다는 점을 보고에 적고, 켠 기능의 요약을 결과와 함께 공개한다.
- 응용 트래픽 구성의 처리량, HTTP와 HTTPS의 처리량, 초당 TCP 또는 QUIC 연결 수, 동시 연결 수, 트랜잭션 지연을 잰다. 트래픽 구성에는 암호화 비율, 쓴 암호 스위트와 키, 응용별 객체 크기를 적는다.
- 머신러닝이나 행위 분석에 의존하는 보안 장비는 이 방법론의 대상이 아니고, 장비에 그런 기능이 있으면 끄고 잰다(3절).

그래서 64바이트 패킷의 방화벽 처리량과 64KB 객체의 위협 방어 처리량은 서로 다른 질문이다. 작은 패킷은 초당 처리 패킷 수를, 큰 객체는 대역폭을 시험한다(해석). 데이터시트를 비교할 때는 켠 기능, 패킷이나 객체 크기, TLS 복호화 여부와 트래픽 구성을 같은 조건으로 맞추고, 인라인 AI 엔진을 켠 상태의 처리량과 지연은 RFC 9411 방식의 수치로 알 수 없으므로 시험 조건을 따로 받아 확인한다(운영 제안).

## 방화벽 자체도 표적이다

방화벽과 VPN 같은 경계 장비는 인터넷에서 닿고 내부로 가는 길목에 있어 그 자체가 공격 대상이다. 지원 종료 장비의 교체 기준과 관리 화면 노출 점검은 [[Network-Perimeter-Security#경계 장비 자체가 침투 경로가 된다|경계 장비 자체가 침투 경로가 된다]]에 있다.

## 사례: 시큐아이 발표 (2026년 9월)

- 차세대 방화벽을 차단 목적의 단순 접근 제어가 아니라 AI 시대의 연결을 안전하게 허용하는 고성능, 지능형 네트워크 보안 플랫폼으로 정의했다. 패킷 처리와 패턴 매칭용 FPGA, 암복호화용 DPU를 넣고 관리 평면과 처리 평면을 나눈 자사 장비를 소개했다.
- 기존 자사 장비 대비 레거시 방화벽 제품군은 최대 16배(64바이트 처리 기준), 차세대 방화벽 제품군은 최대 3배(64KB 처리 기준)라는 비교를 냈고, 이름을 밝히지 않은 경쟁사 값도 함께 그렸다. 패킷이나 객체 크기 말고는 켠 보안 기능, 트래픽 구성과 시험 주체를 공개하지 않아, RFC 9411 기준으로 다른 제품과 비교할 수 있는 값은 아니다.
- 조직 내 AI 사용률 75%는 Microsoft Work Trend Index(2024-05-08)의 지식 노동자 업무 AI 사용 비율과 일치한다. 같은 장에 인용한 기업당 AI 앱 700개 이상과 인가된 AI 사용률 25%는 원문을 찾지 못해 옮기지 않았다.

## 점검 질문

- 방화벽 정책이 IP와 포트가 아니라 응용, 사용자와 기기 상태를 기준으로 쓰여 있는가? 로그에 사용자 신원이 남는가?
- 복호화하지 않는 트래픽과 복호화 제외 대상을 어떻게 처리할지 정책으로 정했는가?
- TLS 검사 장비가 서버 인증서를 제대로 검증하는지, PQC 하이브리드 키 교환을 처리하는지 시험했는가?
- 내부 구간(개발망과 업무망, 에이전트 사이)에도 정책 집행 지점이 있는가?
- 인라인 AI 판정이 실패하거나 느릴 때 fail-open과 fail-closed 중 무엇으로 동작하는가?
- 성능 비교에 켠 기능, 패킷이나 객체 크기, 복호화 여부가 같은 조건으로 적혀 있는가?

## 출처

- [AI 시대 차세대 방화벽의 역할 — 삼성SDS REAL Summit 2026 발표 자료, 시큐아이](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/Track%207-7%20AI%20%EC%8B%9C%EB%8C%80%20%EC%B0%A8%EC%84%B8%EB%8C%80%20%EB%B0%A9%ED%99%94%EB%B2%BD%EC%9D%98%20%EC%97%AD%ED%95%A0_%EC%A1%B0%EC%9B%90%EC%9A%A9%20fn_20260910.pdf) — 2026년 9월 발표. AI 사용이 바꾼 트래픽, 기존 방화벽의 한계, 평면 분리와 전용 프로세서, 인라인 AI와 외부 분석, 마이크로 세그멘테이션 구성
- [NIST, SP 800-41 Rev. 1: Guidelines on Firewalls and Firewall Policy](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-41r1.pdf) — 2009-09. 2.1절의 방화벽 기술, 2.1.7절 NAC, 2.1.8절 UTM, 4.3절 사용자 신원 정책, 암호화 트래픽 처리
- [IETF, RFC 9411: Benchmarking Methodology for Network Security Device Performance](https://www.rfc-editor.org/rfc/rfc9411.html) — 2023-03. 3절의 머신러닝 기반 기능 제외, 권장과 선택 보안 기능, 인라인 측정, 설정 공개, 시험 항목과 트래픽 구성 보고
- [HTTPS Interception Weakens TLS Security — CISA](https://www.cisa.gov/news-events/alerts/2017/03/16/https-interception-weakens-tls-security) — 2017-03-16, TA17-075A, 보관 문서
- [NIST NCCoE, SP 1800-38B Preliminary Draft: Quantum Readiness: Cryptographic Discovery](https://www.nccoe.nist.gov/sites/default/files/2023-12/pqc-migration-nist-sp-1800-38b-preliminary-draft.pdf) — 2023-12. 4.1.4.1절의 포트 443과 ALPN 설명
- [2026 CrowdStrike Global Threat Report: AI Accelerates Adversaries and Reshapes the Attack Surface — CrowdStrike](https://www.crowdstrike.com/en-us/press-releases/2026-crowdstrike-global-threat-report/) — 2026-02-24. breakout time 29분과 27초
- [Gartner Predicts 40% of Enterprise Apps Will Feature Task-Specific AI Agents by 2026, Up from Less Than 5% in 2025 — Gartner](https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025) — 2025-08-26 발표, 2025-09-05 갱신. 다섯 단계 전망
- [AI at Work Is Here. Now Comes the Hard Part — Microsoft WorkLab](https://www.microsoft.com/en-us/worklab/work-trend-index/ai-at-work-is-here-now-comes-the-hard-part) — 2024-05-08

## 관련 문서

- [[Network-Perimeter-Security|네트워크 경계 보안 (UTM, 경계 장비)]]
- [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치]]
- [[Network-Separation|망분리와 망연계 (제로 트러스트, 마이크로 세그멘테이션)]]
- [[Shield-WAF-NetworkFirewall|AWS Shield, WAF, Network Firewall]]
- [[TLS-Config|TLS 설정]]
- [[Host-Outbound-Firewall|호스트의 앱별 아웃바운드 통제]]
- [[Cloud-Security-Posture-and-AI-Assets|클라우드 보안 태세와 AI 자산 (섀도 AI와 egress)]]
- [[AI-Accelerated-Threat-Defense|악용 시간 단축과 AI 공격에 대비하는 방어]]
- [[네트워크보안(NetworkSecurity)|네트워크 보안 인덱스]]
