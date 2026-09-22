---
tags: [infrastructure, network, dns]
status: done
category: "Infrastructure & Cloud"
aliases: ["DNS", "DNS 구조", "도메인 네임 시스템"]
verified_at: 2026-09-22
---

# DNS (Domain Name System)

도메인 이름을 IP 주소를 비롯한 리소스 레코드로 해석하는 인터넷의 분산 디렉터리. 단순 변환기가 아니라 전 세계 수억 개의 도메인을 한 서버에 몰지 않고 루트 → TLD → 권한 네임서버로 이어지는 계층 구조로 나눠 관리하는 시스템이다. 사람은 `google.com`을 기억하고, DNS는 그 이름에 해당하는 `142.250.207.46` 같은 주소를 찾아 준다. AWS의 구현(호스팅 영역, 라우팅 정책, Alias)은 [[Route53]] 참고.

## 도메인 이름 구조

`lecture.awsclass.kr.`을 오른쪽에서 왼쪽으로 읽으면 계층이 드러난다.

- `.` (맨 끝, 보통 생략) — 루트. 생략되지 않은 완전한 형태를 FQDN(Fully Qualified Domain Name)이라 한다.
- `kr` — TLD(최상위 도메인)
- `awsclass.kr` — 등록된 도메인(레지스트런트가 소유하는 단위)
- `lecture` — 서브도메인(레이블)

용어 정리:

- **에이펙스 도메인**(zone apex, 루트 도메인) — 한 존의 최상위 이름. `example.com`뿐 아니라 별도 위임된 `dev.example.com`도 자기 존의 에이펙스가 될 수 있음
- **서브도메인** — `www.example.com`, `mail.example.com`처럼 앞에 레이블이 붙은 형태
- `example.com`, `example.org`은 RFC 2606에서 문서/예제용으로 예약된 도메인이라 실제 서비스에 쓰지 않는다

## DNS 레코드

레코드는 도메인이 어떤 정보와 연결되는지를 정의하는 한 줄짜리 규칙이다. 한 도메인이 여러 레코드를 가질 수 있다(`example.com`은 웹 서버 A 레코드, `mail.example.com`은 MX 레코드 식).

| 타입 | 연결 대상 |
|------|-----------|
| A | 도메인 → IPv4 주소 |
| AAAA | 도메인 → IPv6 주소 |
| CNAME | 도메인 → 다른 도메인(별칭). 같은 이름에 다른 레코드와 공존할 수 없고, 에이펙스는 SOA와 NS가 필요하므로 표준 CNAME을 둘 수 없음 |
| MX | 도메인 → 메일 서버 |
| NS | 도메인 → 그 존을 관리하는 권한 네임서버 (위임의 핵심) |
| SOA | 존의 시작 레코드(관리 정보, 시리얼, 갱신 주기) |
| TXT | 임의 텍스트(SPF, DKIM, 도메인 소유 검증) |
| PTR | 역방향 DNS 이름 → 도메인 이름. IP 주소의 역방향 조회 등에 사용 |

라우팅 정책별 레코드와 AWS 전용 Alias 레코드는 [[Route53]]에 상세히 정리.

## 존(Zone)과 존 파일

- **도메인 존** — 한 도메인에 속한 DNS 레코드들의 집합. `example.com`의 A, MX, `www` 레코드가 모두 한 존이다.
- **존 파일** — 그 존 정보를 담은 텍스트 데이터. 권한 네임서버는 이 존 파일을 근거로 질의에 답한다.

위임이 일어나면 한 도메인이 여러 존으로 쪼개질 수 있다(상위 존이 NS 레코드로 하위 존을 다른 네임서버에 위임).

## 계층 구조: 루트 → TLD → 권한 네임서버

모든 도메인 정보를 한 서버에 두면 성능, 장애, 관리가 모두 한계에 부딪힌다. 그래서 DNS는 책임을 계층으로 나눈다.

- **루트 서버** — 탐색의 시작점. 일반적인 웹 도메인 조회에서는 `.kr`을 어느 TLD 서버에 물어야 하는지 위임 정보를 알려 준다. 논리적으로 13개(`a`~`m.root-servers.net`)이며, 초기 IPv4 DNS의 UDP 512바이트 패킷 제한 안에 모든 루트 주소를 담으려는 제약에서 비롯됐다. 실제로는 애니캐스트로 전 세계 여러 물리 인스턴스에 분산돼 안정성과 응답속도를 확보한다. 리졸버는 루트 서버 목록(**루트 힌트 파일**)을 미리 내장한다.
- **TLD 서버** — `.com`, `.kr` 같은 최상위 도메인을 담당. 개별 도메인의 IP가 아니라 그 도메인을 관리하는 권한 네임서버가 누구인지(NS 레코드)를 알려 준다. `.com`/`.net`은 Verisign, `.kr`은 한국인터넷진흥원(KISA) 계열이 운영한다.
- **권한 네임서버**(authoritative name server) — 도메인의 실제 레코드를 보유한 최종 응답자. `awsclass.kr`의 권한 네임서버가 Route 53이면 `lecture.awsclass.kr`, `www.awsclass.kr` 레코드가 그 안에 있다.

루트와 TLD도 각각 자기 존의 권한 서버다. 일반적인 웹 도메인 탐색에서는 위임 경로를 안내하고, 대상 존의 권한 서버가 요청한 레코드를 답한다.

루트 서버 장애가 곧 모든 인터넷 통신의 즉시 중단을 뜻하지는 않는다. 리졸버에 캐시된 응답과 위임 정보를 재사용할 수 있고, 이미 연결된 IP 통신은 매번 DNS를 다시 조회하지 않는다. 장애가 길어지고 캐시가 만료되면 새 이름 해석의 실패가 확산될 수 있다. 2002년 루트 서버 대상 DDoS는 실제 사건이지만 전 세계 인터넷이 일제히 멈춘 사례로 설명해서는 안 된다.

## DNS 리졸버와 조회 흐름

클라이언트가 직접 전 세계 서버를 뒤지지 않는다. 대신 **리졸버**(recursive resolver)가 대신 찾아온다. 보통 ISP가 운영하며, 공용 리졸버로 Google `8.8.8.8`, Cloudflare `1.1.1.1`이 있다.

질의에는 두 종류가 있다.

- **재귀 질의**(recursive) — 클라이언트의 스텁 리졸버가 리졸버에게 "끝까지 찾아서 답만 달라"고 요청
- **반복 질의**(iterative) — 리졸버가 루트 → TLD → 권한 서버를 순회. 각 서버는 답을 모르면 "저기 물어봐"라는 referral로 응답

관련 응답과 위임 캐시가 없는 경우의 `lecture.awsclass.kr` 조회 흐름:

1. 클라이언트 → 리졸버: "이 주소의 IP 줘" (재귀)
2. 리졸버 → 루트: 루트가 "`.kr`은 이 TLD 서버에" 응답
3. 리졸버 → `.kr` TLD: "`awsclass.kr`은 이 네임서버가 관리" 응답
4. 리졸버 → 권한 네임서버: "`lecture.awsclass.kr`은 이 IP" 최종 응답
5. 리졸버 → 클라이언트로 결과 전달, 브라우저가 그 IP로 접속

전통적인 DNS는 UDP/TCP 53번 포트를 사용한다. EDNS가 없는 UDP 응답의 크기 한도는 512바이트이고, EDNS에서는 요청자가 수용할 UDP 크기를 알린다. 응답이 잘려 TC 비트가 설정되면 TCP로 다시 조회할 수 있다. 512바이트를 넘는 모든 응답이 자동으로 같은 전송 경로를 따르는 것은 아니다.

## 캐싱과 TTL

같은 질의를 매번 루트부터 반복하지 않도록 브라우저, OS와 재귀 리졸버 등이 결과를 캐싱한다. `hosts` 파일과 캐시의 조회 순서는 OS, 애플리케이션과 설정에 따라 다르며, 브라우저가 자체 DNS/DoH 경로를 사용할 수도 있다. DNS 응답 캐시의 유효 기간은 레코드의 **TTL**(Time To Live, 초)을 기준으로 한다.

- TTL이 길면 — 질의 부하/비용 절감, 변경 반영은 느림
- TTL이 짧으면 — 새 응답을 받은 캐시의 만료가 빨라지지만, 이미 저장한 이전 응답을 즉시 무효화하지는 않음. 질의 부하는 증가
- 레코드 변경(서버 이전, 페일오버)을 앞두면 기존 TTL보다 충분히 먼저 TTL을 낮추고, 이전 캐시가 만료된 뒤 변경해 전파 지연을 줄인다

## DNS 보안: 응답 검증과 전송 보호

캐시 오염은 리졸버 등에 위조 응답을 저장시켜 잘못된 목적지로 연결하게 한다. 공유기의 DNS 설정이나 단말의 `hosts` 파일 변조는 이름 해석 경로 자체를 바꾸는 별도 공격이다. 올바른 도메인을 입력했다는 사실만으로 올바른 서버에 도달했다고 판단하지 않는다.

| 수단 | 보호하는 것 | 한계 |
|---|---|---|
| DNSSEC | 신뢰 사슬과 서명을 검증해 DNS 데이터의 출처와 무결성 확인 | 질의 내용을 암호화하지 않으며, 서명과 검증이 구성돼야 함 |
| DoT/DoH | TLS/HTTPS로 클라이언트와 선택한 DNS 서버 사이의 전송 보호 | 리졸버 자체의 정직성이나 웹사이트의 안전성을 보장하지 않음 |
| HTTPS 인증서 검증 | 웹 연결 상대가 요청한 도메인에 대해 유효한 인증서를 제시하는지 확인 | DNSSEC와 별개이며 인증서 경고를 무시하면 보호가 약해짐 |

공개 DNS 주소를 `8.8.8.8`이나 `1.1.1.1`로 바꾸는 것만으로 질의가 암호화되지는 않는다. 공용 Wi-Fi에서는 인증된 암호화 DNS 연결과 HTTPS를 사용하고, 공유기 관리 권한과 설정도 보호한다. 회사 VPN이나 내부 도메인은 조직의 DNS 정책을 따라야 하므로 공개 DNS로 무조건 바꾸지 않는다.

## 도메인 등록과 위임

도메인을 쓰려면 **레지스트라**(등록 대행: 가비아, 카페24, GoDaddy, Route 53)를 통해 등록한다. 등록의 본질은 "이 도메인의 DNS는 어느 네임서버가 관리하는가"를 TLD에 NS 레코드로 등록하는 것, 즉 **위임**이다.

- **레지스트리**(Registry) — TLD 존을 운영하는 주체(`.com` = Verisign, `.kr` = KISA)
- **레지스트라**(Registrar) — 레지스트리와 사용자 사이에서 도메인을 판매/등록 대행
- **레지스트런트**(Registrant) — 도메인 소유자

`mydomain.com`을 사고 카페24 네임서버로 등록하면 `.com` TLD는 그 요청을 카페24로 안내한다. 도메인은 다른 곳에서 사고 DNS 관리만 Route 53에서 하려면, 레지스트라 설정 화면에서 Route 53 호스팅 영역이 제공한 네임서버 주소를 NS로 등록하면 된다. 네임서버가 자기 도메인 하위에 있을 때(`ns1.mydomain.com`이 `mydomain.com`의 네임서버)는 순환 참조를 막기 위해 상위 TLD에 그 IP를 **글루 레코드**로 함께 등록한다.

## 트러블슈팅

도메인 연결이 안 되면 보통 세 곳을 본다.

1. 레지스트라에 권한 네임서버(예: Route 53 NS)가 제대로 등록됐는가 — `dig NS example.com`으로 위임 확인
2. 권한 네임서버(호스팅 영역)에 필요한 레코드(A, CNAME, MX)가 정확히 있는가
3. DNS 캐시 — 변경이 즉시 반영되지 않는다. TTL만큼 기다리거나 미리 낮춰 둔다

`dig +trace example.com`은 루트부터 권한 서버까지 위임 경로 전체를 추적해 어느 단계가 끊겼는지 짚어 준다.

Windows CMD/PowerShell에서 현재 설정된 DNS 서버의 응답은 다음과 같이 확인한다.

```text
nslookup naver.com
nslookup -type=AAAA naver.com
```

출력의 서버 정보는 질의에 사용한 DNS 서버이고, 응답의 주소는 조회 결과다. 별칭은 CNAME이 있는 경우에 나타날 수 있다. `nslookup`은 DNS 서버에 직접 질의하는 도구이므로 브라우저 캐시, `hosts` 파일과 애플리케이션의 전체 이름 해석 경로를 재현하지 않는다.

## 면접 체크포인트

- 브라우저 URL 입력 시의 이름 해석 경로, 캐시 적중과 DoH 설정에 따른 차이 ([[Browser-URL-Flow]])
- 재귀 질의(클라이언트↔리졸버) vs 반복 질의(리졸버↔각 권한 서버)의 차이
- 루트가 13개인 이유(UDP 512바이트 제약) + 실제는 애니캐스트 분산
- 레지스트리/레지스트라/레지스트런트 구분과 NS 위임의 의미
- 에이펙스 도메인에 CNAME을 못 거는 이유 → AWS는 Alias로 우회([[Route53]])
- TTL과 변경 전파 지연 — 마이그레이션 전 TTL을 낮추는 운영 패턴

## 출처

이번 참고 영상은 제공된 메모를 바탕으로 반영했으며 영상 본문과 자막은 직접 확인하지 못했다. 보완한 기술 설명은 아래 공식 자료와 대조했다.

- [RFC 4033, DNS Security Introduction and Requirements](https://www.rfc-editor.org/rfc/rfc4033.html)
- [RFC 7858, Specification for DNS over Transport Layer Security](https://www.rfc-editor.org/rfc/rfc7858.html)
- [RFC 8484, DNS Queries over HTTPS](https://www.rfc-editor.org/rfc/rfc8484.html)
- [RFC 6891, Extension Mechanisms for DNS](https://www.rfc-editor.org/rfc/rfc6891.html)
- [RFC 7766, DNS Transport over TCP](https://www.rfc-editor.org/rfc/rfc7766.html)
- [Root Server Operators, Root Server System](https://root-servers.org/)
- [Nameserver DoS Attack October 2002 — CAIDA](https://www.caida.org/projects/dns/oct02dos/)
- [Microsoft Learn, nslookup](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup)
- [DNS의 구조와 보안 — YouTube, 제공 메모의 참고 영상](https://www.youtube.com/watch?v=XXzxetbAIfA&list=PLXvgR_grOs1BFH-TuqFsfHqbh-gpMbFoy&index=30)

- [RFC 2181, Clarifications to the DNS Specification](https://www.rfc-editor.org/rfc/rfc2181)
- [RFC 9499, DNS Terminology](https://www.rfc-editor.org/rfc/rfc9499)
- [AWS Route 53 이해를 위한 DNS 기초 — YouTube](https://www.youtube.com/watch?v=pEtbC6dYaiA&list=PLfth0bK2MgIYuFahPhXTpTomkwVx5Fl-v&index=5)

## 관련 문서

- [[Route53]]
- [[CDN]]
- [[Load-Balancer]]
- [[Browser-URL-Flow]]
