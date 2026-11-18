---
tags: [security, network, utm, waf, firewall, public-ip, perimeter, edge-device, end-of-support]
status: done
category: "보안(Security)"
aliases: ["Network Perimeter Security", "네트워크 경계 보안", "UTM", "공인 IP 배치", "Edge Device Security", "경계 장비 보안"]
---

# 네트워크 경계 보안 — 공인 IP는 누가 갖는가

공인 IP는 **인터넷에서 직접 접속되는 지점에만** 부여한다. 판단 기준은 장비의 종류가 아니라 **외부 클라이언트가 최초로 접속하는 장비가 무엇인가**다. UTM이 로드밸런서보다 앞단에 있으면 공인 IP는 UTM이 갖고, 로드밸런서와 뒤쪽 서버는 사설 IP로 운영하는 것이 일반적이다.

## DNS가 알려주는 IP는 최종 서버가 아닐 수 있다

DNS가 응답하는 IP는 실제 웹 서버가 아니라 로드밸런서, CDN, WAF, UTM 같은 **앞단 장비의 IP**일 수 있다. 사용자는 웹 서버에 접속한다고 생각하지만 실제 첫 접속 지점은 보안 장비나 부하분산 장비다. 설계 순서도 여기서 나온다 — **먼저 트래픽 흐름을 그리고, 그다음 DNS가 어떤 IP를 알려줘야 하는지 결정**한다. (전체 접속 흐름은 [[Browser-URL-Flow|브라우저 URL 입력 프로세스]])

## 웹 서비스 계층과 로드밸런서 위치

- **웹 서버** — 요청 수신, 정적 콘텐츠, HTTP 처리
- **WAS** — 로그인, 결제 같은 비즈니스 로직
- **DB** — 데이터 저장, 조회

로드밸런싱은 주로 웹 서버나 WAS 앞단에서 요청을 분산한다. 사용자는 하나의 서비스 IP만 알고, 뒤의 서버 대수는 알 필요가 없다. 로드밸런서 자체도 장애 대비 **Active-Standby 이중화**가 일반적 ([[Load-Balancer]]).

## UTM — 통합 위협 관리

UTM(Unified Threat Management)은 방화벽, IPS, VPN, 안티바이러스, 웹 필터링 등 **여러 보안 기능을 한 장비에 통합**한 것.

- 장점: 여러 보안 기능을 한 번에 적용, 관리 단순
- 한계: 트래픽이 많거나 정책이 복잡한 대규모 시스템에서는 하나에 다 맡기기 어려움 → 방화벽, IPS, WAF, SSL 처리 장비를 **분리 구성**

## 배치 순서 — 보안 장비가 로드밸런서보다 앞

로드밸런서도 보호해야 할 대상이므로, 인터넷 트래픽은 보안 장비를 먼저 거친다. 흔한 흐름:

인터넷 → UTM 또는 방화벽 → WAF 또는 SSL 처리 장비 → 로드밸런서 → 웹 서버

이 구조에서 외부 사용자가 직접 만나는 장비는 UTM이므로 **공인 IP는 UTM에** 부여하는 것이 자연스럽다. 이 체인의 장비는 모두 트래픽이 통과하는 인라인 배치이며, 사본만 보는 아웃오브패스 센서와의 구분은 [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치]].

## 프록시 방식 WAF와 공인 IP

WAF가 프록시 방식으로 동작하면 클라이언트는 실제 웹 서버가 아니라 **WAF와 직접 TCP 연결**을 맺는다. SSL 인증서도 WAF에 올라가고(SSL 종료), DNS가 알려주는 공인 IP는 WAF의 IP가 된다. 즉 공인 IP의 위치는 고정 규칙이 아니라 **누가 외부 접속의 첫 종착지인가**에 따라 달라진다. (리버스 프록시 원리는 [[Reverse-Proxy]], AWS 관리형 구현은 [[Shield-WAF-NetworkFirewall|Shield, WAF, Network Firewall]])

## 공인 IP 배정 원칙

- 인터넷에서 직접 접근해야 하는 지점에만 공인 IP
- 내부에서만 접근하는 로드밸런서, 서버는 **사설 IP**
- 공인 IP는 노출 범위와 관리 비용을 키우므로 **외부 노출 최소화**, 내부 장비는 사설망 안에

## 클라우드에서의 같은 원칙

클라우드에서는 UTM, 방화벽이 물리 장비가 아니라 가상 네트워크 기능(가상 방화벽, 관리형 로드밸런서, WAF 서비스)으로 제공된다. 원칙은 동일 — **인터넷에서 가장 먼저 받는 구성 요소가 공인 IP를 갖고, 뒤쪽 리소스는 사설 IP로 보호**한다 (퍼블릭/프라이빗 서브넷 구분과 같은 축).

## 원격 제어 장비의 관리 화면도 경계 보안 대상이다

공개 웹 서비스와 설비의 관리 화면은 노출 목적이 다르다. 냉장 설비처럼 물리 장치를 제어하는 OT(Operational Technology)의 관리 접속은 유지보수에 필요하더라도 인터넷에 직접 공개해야 하는 것은 아니다.

2026-10-27 대조한 CERT-FR 공지(CERTFR-2026-ALE-012, 2026-10-16 개정)는 Danfoss AK-SM/AK-SC, Copeland xweb과 Dixell xweb 원격 냉장 제어기의 다수 침해를 확인했다. 이 공지로 영상에 나온 피해 금액, 실제 도달 온도나 다른 유통업체 장애와의 연관성까지 확인한 것은 아니다.

- **노출과 복구를 함께 고친다:** 해당 장비의 인터넷 노출을 제거하고 안전한 VPN이나 보호된 망으로 접근을 복구한다. 냉장 유지보수 업체로 보내는 데이터 연결을 끊기 전에는 보험 계약 조건도 확인하라는 공지의 단서를 함께 적용한다.
- **침해 여부에 따라 점검을 나눈다:** 미침해 장비는 제상 시간대를 포함한 전체 설정을 확인한다. 침해 장비는 공지의 재시작 또는 초기화, 재설정 절차와 제조사 지침을 따른다. 보안 패치가 없는 장비를 다시 공개하면 초기화만으로 재침해를 막을 수 없다.
- **긴급 통제를 영구 대책으로 삼지 않는다:** 유지보수 업체의 출발지 IP만 허용하는 방화벽 필터는 공지에서 긴급 임시책으로 다룬다. 펌웨어, 기본 비밀번호와 제조사 보안 설정도 확인한다.

일반 OT 원격 접속에는 CISA, FBI 등의 2025-05-06 공동 권고가 사설 IP 연결, VPN, 강한 비밀번호와 피싱 저항 MFA, 역할별 최소 권한 및 휴면 계정 비활성화를 제시한다. IT와 OT 망을 나누고 수동 운전과 복구 능력을 시험하는 것까지 포함한다. VPN 설치만으로 장비 설정과 복구 검증을 끝내지 않는다. 이 절의 공식 권고만 부분 대조했으며 기존 배치 설명 전체를 재검증한 것은 아니다.

## 경계 장비 자체가 침투 경로가 된다

방화벽, VPN, 라우터처럼 망의 경계에 있고 공공 인터넷에서 접근할 수 있는 경계 장비는 내부를 지키는 장비이면서 그 자체가 공격 표적이다. 스위치와 무선 AP도 경계에 놓여 인터넷에서 닿으면 같은 범주에 든다. 다음 성질이 겹친다.

- **인터넷 어디서든 닿는다.** 경계 장비는 대개 인터넷에 연결되어 공인 IP를 갖고, 업무 PC와 달리 밤과 주말에도 외부 요청을 받는다.
- **들여다보기 어렵다.** 네트워크 장비 상당수는 침해 조사에 쓸 기록과 기능을 제한적으로만 제공하고, VPN과 라우터 같은 장비에는 대개 일반 EDR 텔레메트리가 없다. 로그를 외부로 보내지 않으면 침해를 늦게 알아차리기 쉽다.
- **내부로 가는 길목에 있다.** 안팎의 통신이 장비를 지나므로 장비 하나를 장악하면 내부 서버와 PC로 옮겨 갈 발판이 생긴다.
- **패치가 늦어지기 쉽다(운영상 해석).** 보안 패치는 대기 장비나 시험 장비에서 안정성을 확인한 뒤 가능한 한 빨리 설치하라는 것이 권고지만, 이중화가 없거나 절체를 미리 시험해야 하는 구성에서는 작업 시간 확보가 필요하다. 공격은 취약점 공개 직후부터 시작될 수 있어 이 지연이 곧 노출 기간이 된다.

통계로도 이 흐름이 보인다. Verizon 2025 DBIR 발표는 초기 침투 단계로서 취약점 악용이 34% 늘어 침해의 20%가 됐고, 경계 장비와 VPN을 노린 제로데이 악용이 두드러졌다고 밝혔다. 2026 DBIR(Verizon 공식 페이지 기준 2024-11-01부터 2025-10-31까지 발생한 사건)에서는 취약점 악용이 31%로 가장 흔한 초기 침투 경로가 됐고, 이전 1위였던 자격 증명 악용은 13%로 내려갔다. 같은 보고서 요약본은 CISA KEV(실제 악용이 확인된 취약점 목록)에 오른 취약점을 치명 취약점으로 정의하는데, 조직이 이를 완전히 고친 비율은 26%(전년 38%)였고 완전 해결까지 걸린 중앙값은 43일(전년 32일)이었다. 31%는 오류와 오용을 뺀 침해 중 초기 침투 경로가 알려진 건 기준이며, 2026년 수치는 경계 장비만이 아니라 DBIR 보고 데이터셋 전체와 전체 KEV 취약점에 대한 값이다. 요약본 본문은 수집 기간을 2024-10부터 2025-11까지로 적어 공식 페이지 FAQ와 표기가 다르다.

### 지원 종료 장비는 패치를 기다릴 수 없다

제조사 지원이 끝난(EOS, End of Support) 하드웨어는 새 취약점이 나와도 보안 업데이트가 나오지 않으므로 교체 대상이다. 지원 중인 하드웨어가 지원이 끝난 소프트웨어 버전을 돌리는 경우는 지원 버전으로 올리면 된다. 교체 전까지는 인터넷 노출을 줄이는 통제가 위험을 낮출 뿐이다.

미국 CISA의 구속력 있는 운영 지침 BOD 26-02(2026-02-05 발령)는 연방 민간 행정기관(FCEB)에 다음을 요구한다. 대상 경계 장비는 기관망의 경계에 있고 공공 인터넷에서 접근할 수 있는 장비로, 로드밸런서, 방화벽, 라우터, 스위치, 무선 AP, 네트워크 보안 어플라이언스 등이며 OT 장비와 OMB M-24-15가 범위 밖으로 정한 FedRAMP 인가 클라우드 제품과 서비스는 제외한다.

| 기한(발령일 기준) | 요구 사항 |
| --- | --- |
| 즉시 | 지원 중인 장비가 EOS 소프트웨어를 돌리면 지원 버전으로 올린다 (핵심 업무에 지장이 없는 범위) |
| 3개월 | CISA EOS 경계 장비 목록에 해당하는 장비를 조사해 CISA에 보고 |
| 12개월 | CISA 목록 장비 중 그 시점까지 EOS인 것을 퇴역시키고 보고, 환경 내 EOS이거나 다음 12개월 안에 EOS가 될 경계 장비 전체를 조사해 CISA에 보고 |
| 18개월 | 확인된 EOS 경계 장비를 기관망에서 모두 퇴역 |
| 24개월 | 경계 장비를 지속적으로 찾는 절차를 갖추고 EOS 날짜 전에 퇴역시킨다 |

이 지침은 연방기관에만 구속력이 있지만, CISA, FBI와 영국 NCSC는 이 지침과 함께 낸 공동 팩트시트에서 다른 조직에도 이 지침을 따르라고 권고했다. 민간 조직도 같은 순서(인벤토리, EOS 날짜 확인, 교체 계획)를 빌려 쓸 수 있다.

### 점검 순서

1. **펌웨어와 OS가 최신 보안 업데이트까지 올라가 있는가.** 방화벽, VPN, 스위치, 무선 AP를 장비별로 확인하고, 늦었으면 작업 일정부터 잡는다.
2. **관리 화면이 인터넷이나 직원용, 손님용 무선망에서 열리지 않는가.** 인터넷에 노출된 관리 인터페이스를 없애거나 정책 집행 지점을 두는 제로 트러스트 방식으로 대신하고, 관리 접속은 별도의 대역 외(out-of-band) 관리망에서만 받는다. 경로를 나누는 원리는 [[Network-Separation|망분리]]와 같다. 클라우드 관리형 스위치와 AP처럼 관리 포털을 인터넷으로 쓰도록 설계된 제품은 관리자 계정의 MFA와 접속 기록을 함께 확인한다.
3. **EOS 장비가 남아 있는가.** 지원 종료 날짜를 인벤토리에 기록하고 그 전에 교체를 계획한다.

이 절은 2026-11-19 BOD 26-02, DBIR 공식 자료와 아래 정부 지침만 부분 대조했으며 문서의 기존 배치 설명 전체를 재검증한 것은 아니다.

## 확장 주제

경계 보안만으로 웹 인프라 전체를 이해할 수 없다. WAS 다중화와 세션 유지([[Session]], [[Load-Balancer]] 세션 분산), 장애 조치, DB 샤딩과 파티셔닝, 인증과 키 관리까지 **트래픽이 어디서 시작해 어디서 끝나는지 계층별로** 그릴 수 있어야 한다.

## 면접 체크포인트

- 공인 IP 배정 기준 한 문장 — 외부 클라이언트가 최초로 접속하는 장비
- DNS 응답 IP ≠ 실제 웹 서버 IP인 이유
- UTM의 정의와 대규모에서 장비를 분리하는 이유
- 보안 장비를 로드밸런서보다 앞에 두는 이유 (로드밸런서도 보호 대상)
- 프록시 방식 WAF에서 SSL 종료와 공인 IP가 WAF로 가는 구조
- 클라우드의 퍼블릭/프라이빗 구분이 같은 원칙의 논리적 구현이라는 연결
- 경계 장비가 공격 표적이 되는 구조적 이유와 지원 종료 하드웨어가 패치로 해결되지 않는 이유

## 출처

- [CISA, BOD 26-02: Mitigating Risk From End-of-Support Edge Devices](https://www.cisa.gov/news-events/directives/bod-26-02-mitigating-risk-end-support-edge-devices) — 2026-11-19 적용 대상, 경계 장비 정의와 단계별 기한 대조
- [CISA, Reducing the Attack Surface for End-of-Support Edge Devices](https://www.cisa.gov/resources-tools/resources/reducing-attack-surface-end-support-edge-devices) — 2026-11-19 CISA, FBI, NCSC의 비연방 조직 권고 대조
- [CISA, Edge Device Security](https://www.cisa.gov/topics/cybersecurity-best-practices/edge-device-security) — 2026-11-19 관리 인터페이스 제거 또는 제로 트러스트 정책 집행 지점 권고 대조
- [Canadian Centre for Cyber Security, Security considerations for edge devices (ITSM.80.101)](https://www.cyber.gc.ca/en/guidance/security-considerations-edge-devices-itsm80101) — 2026-11-19 경계 장비의 인터넷 노출과 공인 IP, 시험 후 신속 패치, 대역 외 관리망 권고 대조
- [Making forensic observability the norm for network devices — NCSC](https://www.ncsc.gov.uk/blogs/making-forensic-observability-the-norm-for-network-devices) — 2026-11-19 네트워크 장비의 제한적인 침해 조사 지원 대조
- [M-Trends 2026 — Google Cloud Blog, Mandiant](https://cloud.google.com/blog/topics/threat-intelligence/m-trends-2026) — 2026-11-19 VPN과 라우터에 일반 EDR 텔레메트리가 대개 없다는 서술 대조
- [2026 Data Breach Investigations Report Executive Summary — Verizon Business](https://www.verizon.com/business/resources/executivebriefs/2026-dbir-executive-summary.pdf) — 2026-11-19 초기 침투 경로 비율과 KEV 해결 비율 대조
- [2026 Data Breach Investigations Report — Verizon Business](https://www.verizon.com/business/resources/reports/dbir/) — 2026-11-19 FAQ의 수집 기간 대조
- [Verizon's 2025 Data Breach Investigations Report: Alarming surge in cyberattacks through third-parties — Verizon News](https://www.verizon.com/about/news/2025-data-breach-investigations-report) — 2026-11-19 취약점 악용 증가와 경계 장비, VPN 제로데이 대조
- [Incident de sécurité ciblant les contrôleurs à distance des installations de réfrigération — CERT-FR](https://www.cert.cyber.gouv.fr/alerte/CERTFR-2026-ALE-012/) — 2026-10-27 침해 대상, 노출 제거와 침해 여부별 복구 권고 대조
- [Primary Mitigations to Reduce Cyber Threats to Operational Technology — CISA, FBI, EPA, DOE](https://www.ic3.gov/CSA/2025/250506.pdf) — 2026-10-27 원격 접속, 망 분리와 수동 복구 권고 대조
- [로드밸런서와 UTM 구성에서 공인 IP 배치 — YouTube 강의](https://www.youtube.com/watch?v=PdKr9_VQ0m0&list=PLXvgR_grOs1DEoZFABFCjo7dsXt1BhVih&index=39)

## 관련 문서

- [[Load-Balancer|Load Balancer (분산 알고리즘, GSLB, 세션 분산)]]
- [[Reverse-Proxy|Reverse Proxy]]
- [[Shield-WAF-NetworkFirewall|AWS Shield, WAF, Network Firewall]]
- [[Browser-URL-Flow|브라우저 URL 입력 프로세스]]
- [[DNS|DNS 구조]]
- [[Session|Session (세션 유지)]]
- [[Inline-vs-Out-of-Path|인라인과 아웃오브패스 배치 (IDS와 IPS, 포트 미러링)]]
- [[AI-Accelerated-Threat-Defense|악용 시간 단축과 AI 공격에 대비하는 방어 (BOD 26-04 대응 기한)]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔 (CVSS, EPSS, KEV 우선순위)]]
- [[네트워크보안(NetworkSecurity)|네트워크 보안 인덱스]]
