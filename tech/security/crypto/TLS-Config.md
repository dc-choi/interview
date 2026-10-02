---
tags: [security, crypto, tls, certificate, nginx]
status: done
category: "Security - 암호"
aliases: ["TLS Config", "TLS 설정", "cipher suite 설정", "ssl_protocols"]
verified_at: 2026-10-03
---

# TLS Config — TLS 설정 실무

서버와 프록시에서 운영자가 실제로 만지는 TLS 설정값을 다룬다. 버전 하한, cipher suite 선택, 인증서 배포, 세션 재개, mTLS, 배포 전 검증까지가 범위다.

2026-10-03에는 TLS RFC, Mozilla 6.0 설정, nginx와 Node 문서의 인증서 검증 경계, OpenSSL 확인 방법을 대조했다. 아래 예시는 설정 판단을 돕는 자료이며 특정 서버의 배포, 인증서 갱신 성공이나 클라이언트 호환성을 확인한 결과는 아니다.

핸드셰이크 절차와 cipher suite 문자열의 구성요소 해부는 [[HTTPS-TLS|HTTPS와 TLS 핸드셰이크]]에, 대칭과 비대칭 하이브리드 구조와 PKI 기초는 [[Public-Key-Cryptography|공개키 암호, PKI]]에 있다. 인증서를 어떻게 조달하고 자동 갱신하는지는 [[ACME-Protocol|ACME Protocol]]과 [[ACM|AWS Certificate Manager]]가 정본이라 여기서는 발급된 인증서를 서버에 어떻게 얹고 지키는지만 본다. HTTPS 강제는 TLS 설정이 아니라 헤더 계층이라 HSTS는 [[Security-Headers|보안 헤더]]로 넘긴다.

## 버전 정책

- **하한은 TLS 1.2, 우선은 TLS 1.3**이 현재 기본선이다. RFC 8996은 TLS 1.0과 TLS 1.1에 대해 MUST NOT을 규정하고, 어떤 버전에서든 이 둘로의 협상을 허용하지 말라고 못박았다. SSL 2.0은 RFC 6176, SSL 3.0은 RFC 7568에서 이미 폐기됐다.
- 근거는 SHA-1 의존, AEAD 스위트 부재, 다운그레이드 공격 내성 부족이다. 취향 문제가 아니라 규격이 금지한 범위다.
- Mozilla SSL Configuration 가이드라인 6.0 기준으로 Modern은 TLS 1.3만, Intermediate는 TLS 1.2와 1.3을 허용한다. Intermediate의 TLS 1.2 목록은 ECDHE AEAD 스위트만 남았다. 키 교환 그룹은 두 프로필 모두 X25519MLKEM768, X25519, prime256v1, secp384r1 순이고 X25519MLKEM768은 TLS 1.3에서만 협상된다. 5.8에서 Intermediate와 Old의 DHE 스위트가 빠지고 X25519MLKEM768이 그룹 맨 앞에 들어갔으며, 6.0에서 TLS 1.0과 3DES(DES-CBC3-SHA)까지 허용하던 Old 프로필이 빠졌다. 5.7의 Intermediate나 Old 설정을 그대로 쓰면 RFC 10015가 금지한 DHE 스위트가 남는다.
- 레거시 호환을 이유로 TLS 1.0을 켜 두는 판단의 실제 비용은 감사와 컴플라이언스 지적, 다운그레이드 표면 확대, 그리고 그 설정을 아무도 걷어내지 못하는 상태의 고착이다.
- 하한을 올릴 때 먼저 관측할 것은 두 가지다. 액세스 로그나 커넥션 로그의 **협상 TLS 버전 분포**로 실제 구버전 클라이언트 비중을 재고, 변경 후 **핸드셰이크 실패율과 5xx가 아닌 연결 종료**를 본다. 실패는 애플리케이션 로그에 안 남고 LB 레벨에서만 보이는 경우가 많다.

## Cipher suite 선택

TLS 1.3과 1.2는 관리 대상이 다르다. RFC 8446과 이를 대체한 RFC 9846은 TLS 1.3 스위트 다섯 개를 정의하지만, 일반 서버 설정에서는 AES-GCM 두 개와 ChaCha20-Poly1305 하나가 주로 쓰인다. 실제 호환성 조정은 TLS 1.2 목록에서 더 많이 일어난다.

| 항목 | TLS 1.2 | TLS 1.3 |
|---|---|---|
| 스위트 구성 | 키 교환, 인증, 암호, 해시 4요소 결합 | AEAD와 HKDF 해시 쌍만 지정 |
| 실무 후보 | ECDHE 기반 AEAD 스위트를 골라 나열 | 흔히 쓰는 후보는 TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256. RFC에는 AES-CCM 계열 두 개도 정의됨 |
| forward secrecy | ECDHE 스위트로 제한해야 얻음 (RFC 10015가 RSA 키 교환과 DHE를 포함한 유한체 DH 스위트를 금지) | 정적 RSA/DH 제거로 (EC)DHE 핸드셰이크는 forward secrecy 제공(RFC 8446, RFC 9846), PSK-only 재개(psk_ke)는 제외 |
| 설정 인터페이스 | OpenSSL cipher list (`ssl_ciphers`) | 별도 ciphersuites 설정 (`ssl_conf_command Ciphersuites`) |

- **ECDHE 고정**: TLS 1.2에서 forward secrecy를 얻으려면 키 교환을 ECDHE로 제한한다. 정적 RSA 키 교환은 서버 개인키가 유출되면 과거 트래픽까지 복호된다. TLS 1.3은 이 방식을 규격에서 제거했고, RFC 10015(2026-07)는 (D)TLS 1.2에서도 RSA 키 교환과 유한체 DH(정적 DH와 DHE) 스위트를 금지하고 정적 ECDH 스위트는 쓰지 않도록 권고한다.
- **AEAD 우선**: AES-GCM과 ChaCha20-Poly1305만 남기고 CBC 계열은 뺀다. RC4, 3DES, NULL, EXPORT, 익명(anon) 스위트는 배제 대상이다.
- **서버 우선순위**: Mozilla 6.0은 Modern과 Intermediate 모두 server preferred order를 끈다(5.7은 Old에서만 켰다). 남은 목록이 전부 AEAD면 클라이언트가 자기 하드웨어에 맞는 걸 고르게 두는 편이 낫기 때문이다.
- **ChaCha20 배치**: AES-NI가 있는 서버는 AES-GCM이 빠르고, AES-NI가 없는 모바일이나 저사양 클라이언트는 ChaCha20이 빠르다. 서버 우선순위를 강제하면 이 판단을 서버가 대신 하게 되므로 두 계열을 모두 남기고 순서를 강제하지 않는 쪽이 무난하다.

## 설정 예시

nginx는 문서 기준 기본값이 `ssl_protocols TLSv1.2 TLSv1.3`, `ssl_ciphers HIGH:!aNULL:!MD5`, `ssl_prefer_server_ciphers off`, `ssl_session_cache none`, `ssl_session_tickets on`, `ssl_stapling off`이다. 공유 세션 캐시는 기본으로 없지만 session ticket 재개는 별도로 켜져 있다. stapling은 기본이 꺼져 있으므로 필요한 신뢰 체인과 resolver까지 함께 명시한다. 다만 nginx는 `ssl_stapling_responder`나 `ssl_stapling_file`을 따로 지정하지 않으면 인증서 AIA의 OCSP 응답자 주소로 응답을 받아 오므로, 이 주소가 없는 인증서에는 경고를 남기고 stapling을 건너뛴다. 어느 경로든 CA가 그 인증서의 OCSP 응답을 만들어 줘야 한다. Let's Encrypt는 2025-05-07부터 인증서에 OCSP 주소를 넣지 않고 OCSP 응답자도 종료해 stapling할 응답이 없다([[ACME-Protocol|ACME 프로토콜]]).

```nginx
ssl_certificate     /etc/ssl/fullchain.pem;   # leaf + intermediate 체인 전체
ssl_certificate_key /etc/ssl/privkey.pem;
ssl_protocols       TLSv1.2 TLSv1.3;          # RFC 8996 하한 준수
ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
ssl_prefer_server_ciphers off;                # AEAD만 남았으면 클라이언트 선택 존중
ssl_session_cache   shared:SSL:10m;           # session ID 재개용 공유 캐시
ssl_trusted_certificate /etc/ssl/issuer-chain.pem;
resolver            10.0.0.2 valid=300s;      # 환경의 DNS resolver로 교체
ssl_stapling on; ssl_stapling_verify on;      # issuer chain과 resolver가 함께 필요
```

Node.js는 `tls.DEFAULT_MIN_VERSION`이 TLSv1.2, `DEFAULT_MAX_VERSION`이 TLSv1.3이다(Node v24.13.1에서 확인). 문서상 TLS 1.3 스위트는 전체 이름으로만 켜고 끌 수 있고 `EECDH` 같은 레거시 표기로는 제어되지 않는다.

```ts
// NestJS 기본 Express adapter: main.ts 에서 httpsOptions 로 전달
const httpsOptions = {
  key: readFileSync('privkey.pem'),
  cert: readFileSync('fullchain.pem'),
  minVersion: 'TLSv1.2' as const,  // 기본값이지만 명시해 회귀를 막는다
  ciphers: 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256',
  ALPNProtocols: ['http/1.1'],
};
```

기본 Express adapter의 HTTPS 경로는 Node `https.createServer()`로 HTTP/1.1 요청을 처리한다. ALPN에 `h2`를 넣는 것은 HTTP/2 서버를 만드는 설정이 아니므로 이 경로에서는 `http/1.1`만 광고한다. HTTP/2가 필요하면 `http2.createSecureServer()` 또는 이를 지원하는 Nest adapter를 명시적으로 선택하고, 그 서버의 지원 설정과 HTTP/2 요청 처리를 함께 검증한다.

AWS 관리형은 개별 스위트를 고르지 못하고 **보안 정책 이름으로만 선택**한다. ALB 문서는 사용자 정의 보안 정책을 지원하지 않는다고 명시한다.

```
ALB 리스너: ELBSecurityPolicy-TLS13-1-2-2021-06 (TLS 1.2 하한 + 1.3)
CloudFront: TLSv1.2_2021 또는 TLSv1.3_2025 (정책별 스위트 목록 고정)
```

주의할 함정은 기본값이 경로마다 다르다는 점이다. ALB HTTPS 리스너를 콘솔에서 만들면 기본 정책이 `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09`지만, CLI나 CloudFormation, CDK로 만들면 `ELBSecurityPolicy-2016-08`이 붙는다. IaC로 만든 리스너는 정책을 명시하지 않으면 오래된 기본값을 물려받는다.

## 인증서 배포 운영

- **fullchain과 leaf-only 혼동**: leaf 뒤에 필요한 중간 인증서를 붙인다. 일부 브라우저는 이전에 받은 중간 인증서 캐시로 누락을 보완하므로 한 브라우저의 성공만으로 체인이 완전하다고 판단하지 않는다. 보완 여부는 클라이언트와 설정에 달려 있어 브라우저와 서버 간 호출 모두에서 확인한다. 보통 클라이언트가 이미 신뢰하는 루트 인증서까지 서버가 보낼 필요는 없다.
- **개인키 권한**: nginx의 실제 마스터 프로세스가 읽을 수 있는 최소 파일 권한으로 제한한다. root로 실행하는 마스터라면 root 소유와 0600이 한 예이며, 비특권 실행 환경에 이를 그대로 적용해 읽기를 막지 않는다. 배포 아티팩트나 컨테이너 이미지에 키를 굽지 않는다.
- **무중단 교체 순서**: 새 인증서와 키를 먼저 배치하고, `nginx -t`로 문법과 파일 접근을 검증한 뒤 reload한다. reload 적용에 실패하면 nginx master는 변경을 되돌리고 기존 설정과 worker로 계속 서비스하지만, 파이프라인에서는 `nginx -t`로 실패를 더 일찍 차단한다.
- **키와 인증서는 쌍**이라 서로 맞지 않으면 로드에 실패한다. 새 쌍을 새 경로에 배치한 뒤 설정을 함께 바꾼다. 파일 두 개를 각각 덮어쓰는 중간 상태에서 검사나 reload가 실행되지 않게 한다.
- **만료 감시는 갱신 자동화와 별개**로 둔다. 자동 갱신이 도는지가 아니라 서버가 실제로 내놓는 인증서의 잔여일을 외부에서 재고, 임계치 두 단계(예: 21일, 7일)로 알림 경로를 나눈다. 갱신은 성공했는데 reload를 안 해서 옛 인증서를 계속 제시하는 사고가 여기서 잡힌다.

## 클라이언트와 업스트림 검증

- **체인 신뢰와 서비스 신원은 별도 검사**다. 신뢰 CA로 이어지는 유효한 인증서라도 접속하려는 서비스의 이름과 맞아야 한다(RFC 9525). SNI는 서버에 원하는 이름을 전달해 인증서를 선택하게 할 뿐, 클라이언트의 hostname 검증을 대신하지 않는다.
- **인증서 기반 Node TLS 클라이언트**는 `rejectUnauthorized` 기본값이 true이고 `checkServerIdentity`로 hostname을 검사한다. 사설 CA는 필요한 신뢰 CA를 명시해 해결하며, `rejectUnauthorized: false`나 항상 성공하는 `checkServerIdentity`로 검증을 우회하지 않는다. 이 클라이언트 옵션을 서버의 클라이언트 인증서 요구 설정과 혼동하지 않는다.
- **nginx에서 TLS를 종료하면 업스트림은 별도 연결**이다. `proxy_pass https://...`는 그 구간을 암호화하지만 `proxy_ssl_verify` 기본값은 off다. 업스트림 인증이 필요하면 on으로 설정하고 `proxy_ssl_trusted_certificate`와 필요한 검증 깊이를 맞춘다. `proxy_ssl_server_name`도 기본 off이며, SNI와 검증 대상 이름은 `proxy_ssl_name`으로 지정한다. 연결할 주소나 upstream 그룹명이 인증서 이름과 다르면 기대한 서비스 이름을 명시한다.

## 세션 재개와 0-RTT

- TLS 1.2는 session ID(서버 측 캐시)와 session ticket(RFC 5077, 클라이언트 보관)으로 재개했다. TLS 1.3은 둘을 **PSK 기반 재개 하나로 통합**했다(RFC 8446, RFC 9846). 두 RFC는 RFC 5077을 obsolete로 지정하며, 그 의미를 TLS 1.3에서 RFC 5077의 티켓 메커니즘을 PSK 방식으로 대체하는 것으로 설명한다.
- **session ticket key 회전**은 키 유출의 영향 기간을 제한한다. TLS 1.2 ticket과 TLS 1.3의 PSK-only, 0-RTT 경로는 재개 비밀의 보호에 특히 의존한다. TLS 1.3의 PSK-DHE 재개는 새 ephemeral DH로 이후 application data의 forward secrecy를 유지하므로 모든 재개가 같은 방식으로 무력화된다고 보지는 않는다. 다중 서버 구성에서 티켓 키를 공유하면 수명과 회전, 배포 경로를 함께 설계한다.
- **0-RTT(early data)**는 재개 시 첫 왕복을 아끼지만 RFC 8446과 RFC 9846이 두 가지 한계를 명시한다. 제공된 PSK로만 암호화되어 프로토콜이 forward secrecy를 보장하지 않고, 연결 간 재전송 방지가 보장되지 않는다. 같은 연결 안의 중복만 TLS가 막는다. HTTP method만으로 허용하지 말고 replay돼도 안전한 resource를 명시적 allowlist로 둔다. TLS 계층에서 early data를 거부하는 것과 HTTP 요청을 `425 Too Early`로 거부하는 것은 다르다. RFC 8470의 425 응답 뒤 재시도는 early data로 보내면 안 되며, 프록시가 앞단에서 받은 `Early-Data` 표시를 없애거나 뒤쪽 핸드셰이크 완료만으로 요청이 안전해졌다고 판단하지 않는다.
- **최초 TLS 종료 프록시도 표시를 만든다.** 사용자 에이전트는 `Early-Data` 헤더 없이 early data를 보낼 수 있다. 프록시가 클라이언트와의 핸드셰이크 완료 전에 요청을 전달하면 `Early-Data: 1`을 추가해야 한다. early data로 받은 요청은 해당 헤더와 425 처리를 지원한다고 확인한 오리진에만 전달한다(RFC 8470 제5.1절, 제6.1절).
- **OCSP stapling**은 클라이언트가 CA의 OCSP 응답자에 직접 묻는 왕복과 그 과정의 프라이버시 노출을 없앤다. 서버가 미리 받아 둔 서명된 응답을 핸드셰이크에 첨부한다.
- **ALPN**은 핸드셰이크 안에서 HTTP/2와 HTTP/1.1을 협상한다. h2를 목록에 넣지 않으면 TLS는 붙는데 HTTP/2로 못 올라간다.

## mTLS 설정

- nginx는 `ssl_verify_client on`으로 클라이언트 인증서를 요구하고 `ssl_client_certificate`로 신뢰할 CA 번들을 지정한다. 기본값은 off다. `optional`을 쓰면 제시된 경우에만 검증하고 결과를 변수로 넘겨 애플리케이션이 판단하게 할 수 있다.
- 클라이언트 인증서 검증과 mTLS 핸드셰이크 성공은 호출 주체를 인증하는 단계다. 그 주체가 어떤 서비스, tenant와 작업에 접근할 수 있는지는 [[Access-Control-Models|접근 제어]]에서 별도 검사한다. `optional`은 인증서가 없는 연결도 허용하므로 보호된 경로에서 검증 성공 여부를 확인해야 한다.
- 신뢰 CA 목록, 인증서 수명, CRL/OCSP 배포와 조회 실패 시 정책을 함께 정한다. 짧은 수명은 만료까지의 유출 영향 기간을 줄이지만 즉시 접근 차단을 대신하지 않는다. 키 유출 시의 사용 중단과 신뢰 제거는 [[Secret-Management|시크릿 관리]]와 연결해 설계한다.
- 사설 CA를 직접 운영하면 루트 키 보관, 중간 CA 교체, 신뢰 번들 배포가 전부 숙제가 된다. 서비스 간 mTLS를 애플리케이션마다 설정하는 대신 인프라 계층이 대신 걸어 주는 접근은 [[Istio-Ambient-Mode|Istio Ambient Mode]]를 참고한다.

## 검증

- **협상과 신원 확인**: `openssl s_client -connect example.com:443 -servername example.com -verify_hostname example.com -verify_return_error`에서 Protocol, Cipher와 검증 결과를 본다. `-servername`만으로 hostname을 검사하지 않는다. 필요한 신뢰 CA는 `-CAfile`로 지정하고 IP 신원을 검사할 때는 `-verify_ip`를 쓴다. `-tls1_2`와 `-tls1_3` 시험은 허용할 버전의 지원 여부를 확인한다. TLS 1.2 하한은 별도로 `-tls1`과 `-tls1_1` 연결이 서버에서 거부되는지 확인한다. 시험 클라이언트 자체의 프로토콜이나 보안 수준 제한으로 실패한 결과를 서버 차단의 증거로 삼지 않는다.
- **체인 확인**: `-showcerts`는 서버가 보낸 목록이며 검증된 체인이 아니다. leaf만 보이면 필요한 중간 인증서가 누락됐는지 확인하되, 루트가 직접 서명한 leaf나 클라이언트가 이미 중간 인증서를 가진 경우까지 무조건 실패로 판단하지 않는다. `s_client`는 기본적으로 검증 오류 뒤에도 연결을 계속하는 시험 도구이므로 성공한 연결과 인증 성공을 구분한다.
- **stapling과 ALPN**: `-status`로 OCSP 응답이 실제로 첨부되는지(기본 설정에서 OCSP 주소가 없는 인증서는 응답이 없는 것이 정상이다), `-alpn h2,http/1.1`로 h2가 협상되는지 본다.
- **배포 전 문법 검사**: `nginx -t`를 파이프라인에 넣는다. 설정 반영 전에 실패해야 안전하다.
- **외부 스캔**: testssl.sh나 SSL Labs로 지원 버전, 스위트, 체인, 취약점을 한 번에 훑는다. 등급 자체를 목표로 삼기보다 지적된 항목이 우리 클라이언트 분포에서 의미 있는지로 판단한다.

## 흔한 실수

- **중간 인증서 누락** — 브라우저만 확인하고 넘어가면 서버 간 호출에서 뒤늦게 터진다. `-showcerts`로 확인한다.
- **TLS 1.3만 켜고 배포** — TLS 1.3을 지원하지 않는 클라이언트는 연결할 수 없다. 클라이언트 분포를 먼저 재고 옮긴다.
- **ssl_ciphers 복붙으로 TLS 1.3까지 제어된다고 착각** — TLS 1.3 스위트는 별도 설정 대상이라 해당 목록에 넣어도 반영되지 않는다.
- **LB에서 TLS 종료 후 오리진 구간 평문 방치** — 종료 지점 뒤가 신뢰 경계인지 판단이 필요하다. 배치 원칙은 [[Network-Perimeter-Security|네트워크 경계 보안]]과 [[Reverse-Proxy|리버스 프록시]]를 본다.
- **만료 감시 없이 자동 갱신만 신뢰** — 갱신 성공과 서버가 새 인증서를 제시하는 것은 다른 사건이다.
- **IaC 리스너의 기본 보안 정책 방치** — 콘솔과 CLI/CDK의 기본값이 달라 코드로 만든 리스너가 오래된 정책을 물려받는다.

## 면접 체크포인트

- "TLS 최소 버전을 뭘로 잡나?" → TLS 1.2 하한, 1.3 우선. RFC 8996이 TLS 1.0과 1.1에 MUST NOT을 규정했고 SSL 2.0과 3.0은 그 전에 폐기됐다.
- "TLS 1.3에서 cipher suite를 어떻게 고르나?" → RFC에는 다섯 개가 정의돼 있고, 일반 서버에서는 AES-GCM 두 개와 ChaCha20-Poly1305가 주로 쓰인다. 설정 인터페이스는 TLS 1.2용 cipher list와 분리돼 있다.
- "forward secrecy를 어떻게 보장하나?" → TLS 1.2는 키 교환을 ECDHE로 제한한다(RFC 10015가 RSA 키 교환과 DHE를 금지). TLS 1.3 full handshake와 PSK-DHE 재개는 ephemeral DH를 쓰지만 PSK-only와 0-RTT는 예외다. ticket key는 유출 영향 기간을 줄이도록 회전한다.
- "브라우저는 되는데 서버 간 호출만 TLS 검증에 실패한다면?" → 중간 인증서 누락이 한 원인이다. 클라이언트별 신뢰 CA, 이름 검증과 체인 보완 차이도 확인하고 필요한 fullchain을 배포한다.
- "0-RTT를 켜도 되나?" → 연결 간 리플레이 방지가 보장되지 않으므로 replay-safe resource로 제한한다. HTTP 425 응답 뒤 재시도는 early data 없이 보내고 프록시에서도 Early-Data 표시를 보존한다.
- "AWS ALB에서 특정 스위트만 빼려면?" → 못 뺀다. 사용자 정의 정책이 없어 이름 붙은 정책 중에서 고르고, 요구가 정책 경계와 안 맞으면 종료 지점을 옮기는 설계 판단이 된다.

## 출처
- [IETF, RFC 8446 — The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446.html)
- [IETF, RFC 9846 — The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc9846.html)
- [IETF, RFC 8470 — Using Early Data in HTTP](https://www.rfc-editor.org/rfc/rfc8470.html)
- [IETF, RFC 8996 — Deprecating TLS 1.0 and TLS 1.1](https://datatracker.ietf.org/doc/html/rfc8996)
- [IETF, RFC 10015 — Deprecating Obsolete Key Exchange Methods in TLS 1.2 and DTLS 1.2](https://www.rfc-editor.org/rfc/rfc10015.html)
- [IETF, RFC 9525 — Service Identity in TLS](https://www.rfc-editor.org/rfc/rfc9525.html)
- [Mozilla, SSL Configuration Guidelines 6.0](https://ssl-config.mozilla.org/guidelines/6.0.json)
- [Mozilla, SSL Configuration Guidelines 5.7](https://ssl-config.mozilla.org/guidelines/5.7.json)
- [TLSRef, Server-Side TLS](https://docs.tlsref.org/server-side-tls.html)
- [nginx, Module ngx_http_ssl_module](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [nginx, Configuring HTTPS servers](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [nginx, Module ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_ssl_verify)
- [nginx, Controlling nginx](https://nginx.org/en/docs/control.html)
- [Node.js, TLS (SSL)](https://nodejs.org/api/tls.html)
- [Node.js, HTTP/2](https://nodejs.org/api/http2.html)
- [OpenSSL, openssl-s_client](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL, openssl-verification-options](https://docs.openssl.org/master/man1/openssl-verification-options/)
- [OWASP, Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [AWS, Security policies for your Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html)
- [AWS, Supported protocols and ciphers between viewers and CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/secure-connections-supported-viewer-protocols-ciphers.html)

## 관련 문서
- [[HTTPS-TLS|HTTPS와 TLS 핸드셰이크 (원리, cipher suite 해부)]]
- [[ACME-Protocol|ACME Protocol (인증서 자동 발급과 갱신)]]
- [[ACM|AWS Certificate Manager (관리형 인증서 수명주기)]]
- [[Public-Key-Cryptography|공개키 암호, PKI]]
- [[Security-Headers|보안 헤더 (HSTS, CSP)]]
- [[Network-Perimeter-Security|네트워크 경계 보안 (TLS 종료 위치)]]
- [[Reverse-Proxy|리버스 프록시]]
- [[Istio-Ambient-Mode|Istio Ambient Mode (메시 mTLS)]]
