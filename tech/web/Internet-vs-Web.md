---
tags: [web, internet, www, http, hypertext]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Internet vs Web", "인터넷과 웹", "World Wide Web", "월드 와이드 웹"]
verified_at: 2026-10-05
---

# 인터넷과 웹

인터넷은 여러 네트워크를 IP 기반으로 연결하는 통신 인프라이고, 웹은 그 인프라 위에서 URI와 HTTP를 이용해 문서와 리소스를 연결하고 전달하는 응용 시스템이다. 둘은 기반과 서비스의 관계이지 같은 말이 아니다.

## 핵심 구분

| 구분 | 인터넷 | 웹 |
|---|---|---|
| 역할 | 네트워크 사이에서 데이터를 전달 | 연결된 리소스를 식별하고 요청, 응답으로 공유 |
| 핵심 요소 | IP 주소, 라우팅, TCP/UDP, 물리 및 논리 네트워크 | URI/URL, HTTP/HTTPS, HTML과 다양한 웹 리소스 |
| 대표 구현 | 라우터, 해저 케이블, ISP, 사설망 | 브라우저, HTTP 클라이언트, 웹 서버 |
| 관계 | 웹 외의 여러 서비스를 운반 | 인터넷 또는 사설 IP 네트워크 위에서 동작 |

인터넷에는 웹만 있는 것이 아니다. 이메일은 SMTP와 IMAP, 파일 전송은 FTP나 SFTP, 게임과 메신저는 각자의 응용 프로토콜을 사용할 수 있다. 반대로 웹은 브라우저에만 묶이지 않는다. `curl`, 모바일 앱, 서버 프로그램도 HTTP로 웹 리소스와 API를 사용할 수 있다.

공개 웹은 보통 인터넷을 통해 접근하지만, 사내 인트라넷처럼 외부 인터넷과 분리된 IP 네트워크에서도 같은 웹 기술을 사용할 수 있다. 따라서 인터넷 선이 끊기면 모든 웹이 원리상 사라진다기보다, 공개 인터넷에 있는 웹 리소스로 가는 경로를 잃는다고 이해하는 편이 정확하다.

## 인터넷의 물리 경로와 사업자 연결

브라우저의 요청은 대략 다음 경로로 다른 사업자의 망에 있는 서버에 닿는다.

1. 단말에서 유선이나 Wi-Fi로 공유기에 간다. 가정용 공유기는 라우터, 스위치, AP와 DHCP 서버를 겸한다([[IPv4-NAT-and-Traversal|공유기와 NAT]]).
2. 공유기는 통신사의 모뎀이나 광 종단 장치(ONT)에 연결된다. 공동주택에서는 흔히 세대 단자함, 층별 중간 배선반과 건물 전체의 주 배선반을 거쳐 ISP의 접속망으로 나간다.
3. ISP 안에서는 대용량 전송 전용 장비인 코어 라우터들을 광 회선으로 엮은 백본이 트래픽을 나른다.
4. 목적지가 다른 사업자의 망에 있으면 사업자 간 연결로 넘어간다. 피어링은 두 망이 서로의 고객 트래픽만 주고받는 계약으로 보통 무정산이고, 트랜짓은 요금을 받고 인터넷 나머지로의 도달성을 제공하는 계약이다. 사업자는 둘을 섞어 쓴다. 여러 망이 한곳에서 트래픽을 교환하는 IX(인터넷 교환 지점)는 지역 트래픽을 국제 회선 대신 가까이에서 교환해 비용과 지연을 줄인다.
5. 트랜짓을 사지 않고 피어링만으로 인터넷 전체에 닿는 망을 Tier 1, 일부를 트랜짓으로 사는 망을 Tier 2라 부르는 업계 관행이 있다. 상위 사업자의 트랜짓에 기대어 지역 고객에게 접속을 파는 사업자를 Tier 3로 부르기도 한다. 표준이 정한 분류가 아니고 계약도 공개되지 않아 특정 사업자의 등급을 외부에서 단정하기 어렵다. Internet Society는 상호접속 주체를 등급 대신 역할로 나눠, 설비를 소유하거나 재판매해 가정과 기업에 접속을 주는 ISP, ISP 등에 먼 망으로의 접근을 파는 지역과 글로벌 트랜짓 사업자, 콘텐츠 사업자, CDN 등으로 설명한다.

### 캐시 서버의 경제성

큰 콘텐츠를 매번 해외 원본에서 가져오면 느리고, 국제 구간의 트랜짓 비용이 사업자에게 쌓인다. 그래서 콘텐츠 사업자는 ISP 망 안이나 IX에 캐시를 둔다. 캐시에 있으면 바로 응답하고, 없으면 원본에서 가져와 저장한 뒤 전달한다. Google Global Cache는 ISP가 자기 망 안에서 구글 콘텐츠 일부를 직접 제공하게 해 피어링과 트랜짓 링크의 트래픽을 줄이고, Netflix Open Connect도 같은 접근이다([[Video-Streaming-System-Design|영상 스트리밍 설계]], [[CDN]]).

망 비용을 누가 낼지는 나라마다 다르고 분쟁이 이어지는 쟁점이다. 한국은 2016년부터 ISP 사이에서 트래픽을 보내는 쪽이 비용을 내는 상호접속 기준을 시행했고, 2020년 법 개정으로 일정 규모 이상의 콘텐츠 사업자에게 서비스 안정성 조치 의무를 지웠다. Internet Society의 2022년 분석은 이 규칙이 비싼 트랜짓 의존을 키웠다고 보고, 서울의 트랜짓 비용을 프랑크푸르트, 런던 같은 유럽 거점의 약 10배로 제시하며, 콘텐츠를 해외에 두는 편이 유리해져 국내 사용자의 지연이 늘 수 있다고 평가한다. 이는 한 기관의 정책 분석이며 사업자별 계약과 비용은 공개 자료로 확인되지 않는다.

## 웹이 해결하려던 문제

초기 인터넷에도 원격 접속, 채팅과 파일 전송은 있었지만 정보가 기종과 파일 형식, 저장 위치마다 흩어져 있었다. 연구자들은 서로 다른 컴퓨터를 사용했고, 다른 사람이 만든 문서와 연구 결과를 찾고 열고 연결하기 어려웠다.

웹은 이 문제를 인터넷과 하이퍼텍스트를 결합해 풀었다.

1. 리소스마다 주소를 부여한다.
2. 문서 안의 링크로 다른 리소스를 연결한다.
3. 클라이언트가 HTTP로 리소스를 요청한다.
4. 서버가 HTML 같은 표현을 응답한다.

이 구조 덕분에 사용자는 상대방의 컴퓨터 기종이나 파일 저장 위치를 직접 알지 않아도 링크를 따라 정보를 탐색할 수 있다.

### 트리 대신 링크: 요구사항이 만든 설계

1989년 제안서(Information Management: A Proposal)는 CERN의 문서 시스템, Unix 파일 시스템과 VMS 도움말처럼 정보를 트리로 저장하는 계층 구조를 문제로 짚었다. 트리는 모든 노드에 고유한 이름을 주지만 현실의 관계를 표현하지 못한다. 잎까지 내려갔는데 다른 가지의 잎을 보라는 안내만 있으면 시스템을 나왔다가 다시 들어가야 한다. 필요한 것은 노드에서 노드로 바로 가는 링크였고, 제안서가 내건 CERN의 요구사항이 웹의 구조를 정했다. 설계 결정은 이 제안서와 1990년 11월의 공식 제안서에 걸쳐 구체화됐다.

| 요구사항 (1989 제안서) | 설계 결정 | 오늘의 대응 |
|---|---|---|
| 네트워크를 통한 원격 접근 | 정보를 저장하는 소프트웨어와 보여 주는 소프트웨어를 잘 정의된 인터페이스로 분리하고, 그 경계를 사용자와 원격 데이터베이스 머신 사이의 물리적 경계에 맞춤 | 브라우저와 웹 서버, 그 사이의 HTTP |
| 이기종 시스템(VM/CMS, Macintosh, VAX/VMS, Unix)에서 같은 데이터 접근 | 인터페이스만 지키면 플랫폼마다 표시 프로그램을 따로 만들 수 있게 하고, 표시 형식은 브라우저와 서버가 협상 | 여러 브라우저와 HTTP 클라이언트, 콘텐츠 협상 |
| 중앙 통제나 조정 없이 기존 시스템끼리 연결 | 링크를 서버에 닿는 방법을 담은 문자열로 정의하고, 서버는 다른 서버를 몰라도 되게 함 | URL과 단방향 하이퍼링크 |
| 기존 데이터에 접근 | 기존 데이터베이스를 하이퍼텍스트처럼 보여 주는 게이트웨이 서버 | 요청 시점에 저장소에서 HTML이나 JSON 표현을 만드는 동적 서버 |

1989년 제안서는 이 인터페이스를 정의하는 일을 설계의 중요한 단계로 보고, 정의가 끝나면 여러 표시 프로그램과 서버를 병렬로 개발할 수 있다고 봤다. 경계가 되는 계약을 먼저 고정하면 양쪽 구현이 따로 진화할 수 있다는 판단은 오늘의 API 설계에도 그대로 통한다.

웹보다 앞선 1980년의 개인용 도구 Enquire는 정보 조각을 `includes`처럼 유형이 붙은 링크로 이었다. 첫 버전은 한 파일 시스템 안의 파일 사이에도 링크를 걸 수 있었지만, 다른 시스템으로 옮긴 다음 버전은 외부 링크를 만들 수 없었고 이것이 치명적인 한계가 됐다. 그래서 웹은 외부 링크를 내부 링크만큼 쉽게 만드는 것을 요구사항으로 삼았고, 그러려면 링크가 단방향이어야 했다. 링크를 거는 쪽만 고치면 되므로 두 정보망이 전체 변경 없이 하나로 합쳐지지만, 대상은 자신을 가리키는 링크를 모르므로 대상이 옮겨지거나 사라지면 링크가 끊긴다(404). 탈중앙 확장을 얻고 링크 무결성을 내준 선택이다.

1990년 11월의 공식 제안서(WorldWideWeb: Proposal for a HyperText Project)는 링크를 브라우저가 적절한 서버에 연락할 방법을 알아낼 수 있는 ASCII 문자열로 정의했다. 링크를 따라가면 브라우저가 그 서버에 직접 요청하므로 서버는 다른 서버나 다른 웹을 알 필요가 없어 단순하게 유지된다. 어떤 링크를 지나왔고 어떻게 돌아갈지는 브라우저가 기억하고, 서버는 사용자가 어느 노드를 방문했는지 모른다는 분담도 이때 적혀 있다. 서버가 탐색 이력을 들고 있지 않는 이 분담은 HTTP의 무상태 설계와 같은 방향이다([[HTTP-Semantics-and-Messages|HTTP 의미와 무상태]]).

### 세 기둥의 역할

| 요소 | 역할 | 없으면 생기는 문제 |
|---|---|---|
| URI | 리소스를 전 세계에서 하나로 식별하는 주소 | 링크가 가리킬 대상을 정할 수 없다 |
| HTTP | 주소로 리소스를 요청하고 표현을 돌려받는 전송 규칙 | 기종과 네트워크마다 다른 전송 절차를 각자 구현해야 한다 |
| HTML | 문서의 구조와 링크 위치를 기계가 읽을 수 있게 표기하는 형식 | 문서 안에서 어디가 링크인지 프로그램이 알 수 없다 |

세 요소는 각각 식별, 전송, 표현을 맡는다. HTTP가 문서를 나르고 HTML이 문서 안의 링크를 표현하더라도, 링크가 가리킬 대상을 하나로 정하는 URI가 없으면 연결망은 완성되지 않는다. RFC 9110은 HTTP를 분산, 협업 하이퍼텍스트 정보 시스템을 위한 무상태 애플리케이션 수준 프로토콜로 정의한다. 웹을 위해 태어났지만 오늘날에는 HTML 문서뿐 아니라 JSON을 주고받는 API 전송에도 널리 쓰인다.

### 이름의 유래

전 세계 하이퍼텍스트 시스템의 이름은 무엇이든 무엇에나 연결할 수 있는 탈중앙 구조를 강조하려고 정해졌다. 문서가 다른 문서로, 그 문서가 또 다른 문서로 이어지는 연결 구조는 수학적으로 그래프이고, 이를 그물에 빗댄 말이 웹(web)이다. 후보였던 Information Mesh는 mess와 비슷하게 들려 제외됐고 World Wide Web이 남았다. 인터넷이라는 인프라 위에 논리적으로 연결된 문서들이 그물처럼 얽힌 모습이 이름 그대로의 실체다.

### 역사 사례: 첫 웹 구현

팀 버너스리는 CERN에서 연구 정보를 연결하기 위해 1989년 3월 정보 관리 제안을 냈다. 당시 이 시스템의 이름은 Mesh뿐이었고 World Wide Web이라는 이름은 1990년 코드를 쓰며 정했다. 1990년 11월 Robert Cailliau와 함께 낸 공식 제안서가 WorldWideWeb이라는 하이퍼텍스트 프로젝트를 정리했고, 그해 말 NeXT 컴퓨터에서 첫 웹 서버와 브라우저 겸 편집기를 돌려 제안이 실제로 동작함을 보였다. 첫 웹 사이트 주소는 info.cern.ch였다. 링크가 가리킬 주소는 처음에 UDI(Universal Document Identifier)라 불렸고 이후 URL, URI로 이름이 바뀌었으며, UDI, HTML과 HTTP의 명세는 첫 서버에 공개됐다. 첫 브라우저의 이름도 WorldWideWeb이었는데, 웹이라는 정보 공간 자체와 헷갈리지 않도록 나중에 Nexus로 바꿨다. 1991년에는 거의 모든 컴퓨터에서 도는 line-mode 브라우저와 서버 소프트웨어가 공개됐고, 8월에는 인터넷 뉴스그룹에 프로젝트가 알려졌다. 개념, 프로토콜과 구현체를 함께 만든 이 흐름이 웹의 출발점이 됐다.

첫 구현은 소프트웨어가 보통 갖추는 세 요소인 인터페이스, 제어 로직, 데이터를 모두 담았다.

| 요소 | 첫 웹 구현 | 현대 웹의 대응 |
|---|---|---|
| 인터페이스 | NeXT 컴퓨터에서 동작한 브라우저 겸 편집기 WorldWideWeb | 브라우저, 모바일 앱, HTTP 클라이언트 |
| 제어 | 요청을 받아 문서를 돌려주는 웹 서버와 HTTP 규칙 | 웹 서버, 애플리케이션 서버, API |
| 데이터 | 링크를 담은 HTML 문서 | HTML, JSON, 이미지와 스트림 |

낯선 시스템을 볼 때도 어떤 문제를 풀려는지, 그리고 인터페이스, 제어 로직, 데이터가 어떻게 맞물리는지를 먼저 조망하면 개별 기능을 외우는 것보다 빨리 구조를 잡을 수 있다. 세 요소를 더 세분한 현대의 계층 구조는 [[Layered-Clean-Hexagonal]]에서 다룬다.

## 초기 웹 서비스의 구조: 문서 뷰어 모델

초기 웹은 브라우저가 서버에 문서를 요청하고 받은 HTML을 화면에 그리는 문서 뷰어 시스템이었다. 한 번의 요청과 응답은 다음 순서로 흐르고, 오늘의 웹도 이 골격 위에 기능을 덧붙인 것이다.

| 단계 | 동작 | 상세 문서 |
|---|---|---|
| 주소 해석 | 클라이언트가 URL의 호스트를 DNS로 IP 주소로 바꾼다 | [[Browser-URL-Flow]] |
| 연결 | TCP/IP 위에서 서버와 연결한다. HTTPS면 TLS 핸드셰이크가 더해진다 | [[TCP-Handshake]], [[HTTPS-TLS]] |
| 요청 | GET으로 리소스를 요청한다. 각 요청은 다른 요청과 독립적으로 해석되는 무상태 메시지다 | [[HTTP-Semantics-and-Messages]] |
| 응답 | 서버가 HTML 같은 표현을 돌려준다 | [[HTTP-Core]] |
| 파싱과 렌더링 | 브라우저의 파서가 HTML 텍스트를 DOM 트리로 만들고 렌더링 엔진이 화면에 그린다 | [[Browser-URL-Flow]] |

이 모델의 단순함이 이후 진화의 이유를 설명한다. 문서 하나에 이미지와 스크립트가 늘면서 요청 수가 많아졌고, 무상태 요청 위에 로그인과 장바구니 같은 애플리케이션 상태를 얹어야 했으며, 문서 뷰어였던 브라우저는 애플리케이션 실행 환경이 됐다. 다중화와 헤더 압축은 [[versions|HTTP 버전]], 무상태 위의 상태 복원은 [[Cookie]]와 [[Session]], 문서에서 앱으로의 변화는 [[Web-Service-Structure]]에서 이어진다.

## 개방 표준이 만든 확장성

웹은 특정 회사의 전용 네트워크나 폐쇄형 프로그램으로 배포되지 않았다. 1993년 4월 30일 CERN이 웹 소프트웨어를 퍼블릭 도메인으로 내놓아 소스 코드를 로열티 없이 쓸 수 있게 하면서 누구나 서버와 브라우저를 구현하고 문서를 게시할 수 있었다. 구현체끼리 같은 주소, 전송과 문서 표준을 지키면 연결될 수 있었고, 이 상호운용성이 웹의 빠른 확산을 만들었다.

## 흔한 오해

- 인터넷과 웹은 같은 계층이다: 인터넷은 데이터 전달 기반이고 웹은 그 위의 응용 시스템이다.
- 웹은 HTML만 전송한다: 초기 중심은 하이퍼텍스트 문서였지만 현대 웹은 JSON, 이미지, 영상과 스트림도 전달한다.
- 브라우저가 없으면 인터넷을 쓸 수 없다: 브라우저는 웹 클라이언트 중 하나이며 비웹 인터넷 서비스도 많다.
- 웹을 쓰려면 전 세계 인터넷이 필요하다: 같은 웹 표준을 사설망 안에서도 사용할 수 있다.

## 면접 체크포인트

- 인터넷과 웹의 차이를 기반 인프라와 응용 시스템으로 구분할 수 있는가
- 가정에서 ISP 백본과 다른 사업자 망까지 가는 경로, 피어링과 트랜짓의 차이, ISP 안의 캐시가 비용과 지연을 줄이는 이유, Tier 분류가 표준이 아닌 업계 관행이라는 점을 설명할 수 있는가
- 웹 외의 인터넷 서비스와 브라우저 외의 웹 클라이언트를 예로 들 수 있는가
- 하이퍼텍스트, 주소와 HTTP가 정보 공유 문제를 어떻게 해결했는지 설명할 수 있는가
- 1989년 제안서의 요구사항(원격 접근, 이기종, 비중앙화, 기존 데이터 접근)이 저장과 표시의 분리, URL, 단방향 링크, 게이트웨이 서버로 이어진 과정과 단방향 링크의 대가(끊긴 링크)를 설명할 수 있는가
- 개방 표준과 상호운용성이 웹 확산에 기여한 이유를 설명할 수 있는가
- URI, HTTP, HTML이 각각 식별, 전송, 표현을 맡는다는 역할 구분을 설명할 수 있는가
- 웹이라는 이름이 문서 연결 구조(그래프)에서 왔음을 설명할 수 있는가
- 첫 구현의 인터페이스, 제어, 데이터를 현대 웹 구성 요소에 대응시킬 수 있는가
- 초기 웹의 요청과 응답 한 사이클(DNS, TCP/IP, GET, HTML, DOM 렌더링)을 순서대로 설명하고 그 단순함이 이후 HTTP 진화의 이유가 된 점을 말할 수 있는가

## 출처

- [A short history of the Web — CERN](https://home.cern/science/computing/the-birth-of-the-web/short-history-web/)
- [인터넷 = 웹?... 같은 말 아닌가요? — 코딩하는기술사](https://www.youtube.com/watch?v=zQPegnx3HRI)
- [웹은 누가? 왜 만들었나? — 코딩하는기술사](https://www.youtube.com/watch?v=bWmDAXiubbw)
- [웹 서비스를 만드신 분에 대하여... — 널널한 개발자 TV](https://www.youtube.com/watch?v=mrNg1RnOGgU&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=9)
- [Frequently asked questions by the Press — W3C, Tim Berners-Lee](https://www.w3.org/People/Berners-Lee/FAQ.html)
- [초창기 웹 서비스 구조 — 널널한 개발자 TV](https://www.youtube.com/watch?v=4Sfned8HLzk&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=10)
- [Policy Brief: Internet Interconnection — Internet Society](https://www.internetsociety.org/policybriefs/internetinterconnection/)
- [Policy Brief: Internet Exchange Points (IXPs) — Internet Society](https://www.internetsociety.org/policybriefs/ixps/)
- [Internet Impact Brief: South Korea's Interconnection Rules — Internet Society](https://www.internetsociety.org/resources/doc/2022/internet-impact-brief-south-koreas-interconnection-rules/)
- [Google Global Cache (GGC) — Google Peering Help](https://support.google.com/interconnect/answer/9058809)
- [인프런, 감자, 구글을 검색하면 어떤 일이 일어날까요?](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160781)
- [인프런, 감자, 라우터](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160808)
- [인프런, 감자, Proxy 서버](https://www.inflearn.com/courses/lecture?courseId=331036&unitId=160834)
- [Information Management: A Proposal — W3C, Tim Berners-Lee](https://www.w3.org/History/1989/proposal.html)
- [WorldWideWeb: Proposal for a HyperText Project — W3C, Tim Berners-Lee, Robert Cailliau](https://www.w3.org/Proposal.html)
- [The World Wide Web: A very short personal history — W3C, Tim Berners-Lee](https://www.w3.org/People/Berners-Lee/ShortHistory.html)
- [The birth of the Web — CERN](https://home.cern/science/computing/the-birth-of-the-web)
- [RFC 9110: HTTP Semantics — IETF](https://www.rfc-editor.org/rfc/rfc9110.html)
- [YouTube, 쉬운코드, World Wide Web의 개념과 발명 과정](https://www.youtube.com/watch?v=1JjUYaoxJ9Y)
- [YouTube, 쉬운코드, 네트워크와 인터넷 개념, 인터넷 동작 방식과 ISP](https://www.youtube.com/watch?v=oFKYzp6gGfc)

## 관련 문서

- [[HTTP|HTTP와 API]]
- [[URI-URL-URN|URI, URL, URN]]
- [[Browser-URL-Flow|브라우저 URL 입력 흐름]]
- [[HTTP-Semantics-and-Messages|HTTP 의미와 무상태]]
- [[OSI-7-Layer|OSI 7계층]]
- [[Web-Technology-Evolution|웹 기술의 진화와 퇴장 패턴]]
- [[Web-Service-Structure|웹 서비스의 구조 (역할 분리, 상태 저장, 진화 단계)]]
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal (인터페이스, 제어, 데이터를 세분한 계층 구조)]]
