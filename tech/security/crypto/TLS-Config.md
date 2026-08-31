---
tags: [security, crypto, tls, certificate, nginx]
status: done
category: "Security - 암호"
aliases: ["TLS Config", "TLS 설정", "cipher suite 설정", "ssl_protocols"]
verified_at: 2026-08-31
---

# TLS Config — TLS 설정 실무

서버와 프록시에서 운영자가 실제로 만지는 TLS 설정값을 다룬다. 버전 하한, cipher suite 선택, 인증서 배포, 세션 재개, mTLS, 배포 전 검증까지가 범위다.

핸드셰이크 절차와 cipher suite 문자열의 구성요소 해부는 [[HTTPS-TLS|HTTPS와 TLS 핸드셰이크]]에, 대칭과 비대칭 하이브리드 구조와 PKI 기초는 [[Public-Key-Cryptography|공개키 암호, PKI]]에 있다. 인증서를 어떻게 조달하고 자동 갱신하는지는 [[ACME-Protocol|ACME Protocol]]과 [[ACM|AWS Certificate Manager]]가 정본이라 여기서는 발급된 인증서를 서버에 어떻게 얹고 지키는지만 본다. HTTPS 강제는 TLS 설정이 아니라 헤더 계층이라 HSTS는 [[Security-Headers|보안 헤더]]로 넘긴다.

## 버전 정책

- **하한은 TLS 1.2, 우선은 TLS 1.3**이 현재 기본선이다. RFC 8996은 TLS 1.0과 TLS 1.1에 대해 MUST NOT을 규정하고, 어떤 버전에서든 이 둘로의 협상을 허용하지 말라고 못박았다. SSL 2.0은 RFC 6176, SSL 3.0은 RFC 7568에서 이미 폐기됐다.
- 근거는 SHA-1 의존, AEAD 스위트 부재, 다운그레이드 공격 내성 부족이다. 취향 문제가 아니라 규격이 금지한 범위다.
- Mozilla SSL Configuration 가이드라인 5.7 기준으로 Modern은 TLS 1.3만, Intermediate는 TLS 1.2와 1.3, Old는 TLS 1.0까지 내려간다. Old를 고르는 순간 3DES(DES-CBC3-SHA)까지 딸려 들어온다.
- 레거시 호환을 이유로 TLS 1.0을 켜 두는 판단의 실제 비용은 감사와 컴플라이언스 지적, 다운그레이드 표면 확대, 그리고 그 설정을 아무도 걷어내지 못하는 상태의 고착이다.
- 하한을 올릴 때 먼저 관측할 것은 두 가지다. 액세스 로그나 커넥션 로그의 **협상 TLS 버전 분포**로 실제 구버전 클라이언트 비중을 재고, 변경 후 **핸드셰이크 실패율과 5xx가 아닌 연결 종료**를 본다. 실패는 애플리케이션 로그에 안 남고 LB 레벨에서만 보이는 경우가 많다.

## Cipher suite 선택

TLS 1.3과 1.2는 관리 대상이 다르다. RFC 8446은 TLS 1.3 스위트 다섯 개를 정의하지만, 일반 서버 설정에서는 AES-GCM 두 개와 ChaCha20-Poly1305 하나가 주로 쓰인다. 실제 호환성 조정은 TLS 1.2 목록에서 더 많이 일어난다.

| 항목 | TLS 1.2 | TLS 1.3 |
|---|---|---|
| 스위트 구성 | 키 교환, 인증, 암호, 해시 4요소 결합 | AEAD와 HKDF 해시 쌍만 지정 |
| 실무 후보 | ECDHE 기반 AEAD 스위트를 골라 나열 | 흔히 쓰는 후보는 TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256. RFC에는 AES-CCM 계열 두 개도 정의됨 |
| forward secrecy | 스위트 선택에 달림 (정적 RSA 배제 필요) | 정적 RSA/DH 제거로 (EC)DHE 핸드셰이크는 forward secrecy 제공(RFC 8446), PSK-only 재개(psk_ke)는 제외 |
| 설정 인터페이스 | OpenSSL cipher list (`ssl_ciphers`) | 별도 ciphersuites 설정 (`ssl_conf_command Ciphersuites`) |

- **(EC)DHE 고정**: TLS 1.2에서 forward secrecy를 얻으려면 키 교환을 ECDHE 또는 DHE로 제한한다. 정적 RSA 키 교환은 서버 개인키가 유출되면 과거 트래픽까지 복호된다. TLS 1.3은 이 방식을 규격에서 제거했다.
- **AEAD 우선**: AES-GCM과 ChaCha20-Poly1305만 남기고 CBC 계열은 뺀다. RC4, 3DES, NULL, EXPORT, 익명(anon) 스위트는 배제 대상이다.
- **서버 우선순위**: Mozilla 5.7은 Modern과 Intermediate에서 server preferred order를 끄고 Old에서만 켠다. 남은 목록이 전부 AEAD면 클라이언트가 자기 하드웨어에 맞는 걸 고르게 두는 편이 낫기 때문이다.
- **ChaCha20 배치**: AES-NI가 있는 서버는 AES-GCM이 빠르고, AES-NI가 없는 모바일이나 저사양 클라이언트는 ChaCha20이 빠르다. 서버 우선순위를 강제하면 이 판단을 서버가 대신 하게 되므로 두 계열을 모두 남기고 순서를 강제하지 않는 쪽이 무난하다.

## 설정 예시

nginx는 문서 기준 기본값이 `ssl_protocols TLSv1.2 TLSv1.3`, `ssl_ciphers HIGH:!aNULL:!MD5`, `ssl_prefer_server_ciphers off`, `ssl_session_cache none`, `ssl_session_tickets on`, `ssl_stapling off`이다. 공유 세션 캐시는 기본으로 없지만 session ticket 재개는 별도로 켜져 있다. stapling은 기본이 꺼져 있으므로 필요한 신뢰 체인과 resolver까지 함께 명시한다.

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
// NestJS: main.ts 에서 httpsOptions 로 전달
const httpsOptions = {
  key: readFileSync('privkey.pem'),
  cert: readFileSync('fullchain.pem'),
  minVersion: 'TLSv1.2' as const,  // 기본값이지만 명시해 회귀를 막는다
  ciphers: 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256',
  ALPNProtocols: ['h2', 'http/1.1'],
};
```

AWS 관리형은 개별 스위트를 고르지 못하고 **보안 정책 이름으로만 선택**한다. ALB 문서는 사용자 정의 보안 정책을 지원하지 않는다고 명시한다.

```
ALB 리스너: ELBSecurityPolicy-TLS13-1-2-2021-06 (TLS 1.2 하한 + 1.3)
CloudFront: TLSv1.2_2021 또는 TLSv1.3_2025 (정책별 스위트 목록 고정)
```

주의할 함정은 기본값이 경로마다 다르다는 점이다. ALB HTTPS 리스너를 콘솔에서 만들면 기본 정책이 `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09`지만, CLI나 CloudFormation, CDK로 만들면 `ELBSecurityPolicy-2016-08`이 붙는다. IaC로 만든 리스너는 정책을 명시하지 않으면 오래된 기본값을 물려받는다.

## 인증서 배포 운영

- **fullchain과 leaf-only 혼동**이 가장 흔한 배포 사고다. `ssl_certificate`에 leaf만 넣으면 브라우저는 대개 통과한다. 중간 인증서를 캐시하거나 AIA로 내려받기 때문이다. 반면 서버 간 호출(curl, Java HttpClient, Node.js fetch)은 보완 로직이 없어 검증에 실패한다. 브라우저는 멀쩡한데 내부 API 호출만 깨지는 비대칭이 이 증상의 특징이다.
- **개인키 권한**: 키 파일은 소유자를 root, 권한을 0600으로 두고 워커 프로세스가 아니라 마스터 프로세스만 읽게 한다. 배포 아티팩트나 컨테이너 이미지에 키를 굽지 않는다.
- **무중단 교체 순서**: 새 인증서와 키를 먼저 배치하고, `nginx -t`로 문법과 파일 접근을 검증한 뒤 reload한다. reload 적용에 실패하면 nginx master는 변경을 되돌리고 기존 설정과 worker로 계속 서비스하지만, 파이프라인에서는 `nginx -t`로 실패를 더 일찍 차단한다.
- **키와 인증서는 쌍**이라 순서가 어긋나면 즉시 실패한다. 두 파일을 원자적으로 갈아끼우거나(심볼릭 링크 교체) 새 경로에 배치한 뒤 설정을 함께 바꾼다.
- **만료 감시는 갱신 자동화와 별개**로 둔다. 자동 갱신이 도는지가 아니라 서버가 실제로 내놓는 인증서의 잔여일을 외부에서 재고, 임계치 두 단계(예: 21일, 7일)로 알림 경로를 나눈다. 갱신은 성공했는데 reload를 안 해서 옛 인증서를 계속 제시하는 사고가 여기서 잡힌다.

## 세션 재개와 0-RTT

- TLS 1.2는 session ID(서버 측 캐시)와 session ticket(RFC 5077, 클라이언트 보관)으로 재개했다. TLS 1.3은 둘을 **PSK 기반 재개 하나로 통합**했다(RFC 8446).
- **session ticket key 회전**은 키 유출의 영향 기간을 제한한다. TLS 1.2 ticket과 TLS 1.3의 PSK-only, 0-RTT 경로는 재개 비밀의 보호에 특히 의존한다. TLS 1.3의 PSK-DHE 재개는 새 ephemeral DH로 이후 application data의 forward secrecy를 유지하므로 모든 재개가 같은 방식으로 무력화된다고 보지는 않는다. 다중 서버 구성에서 티켓 키를 공유하면 수명과 회전, 배포 경로를 함께 설계한다.
- **0-RTT(early data)**는 재개 시 첫 왕복을 아끼지만 RFC 8446이 두 가지 한계를 명시한다. 제공된 PSK로만 암호화되어 forward secrecy가 없고, 연결 간 재전송 방지가 보장되지 않는다. 같은 연결 안의 중복만 서버가 막아 준다. HTTP method만으로 허용하지 말고 replay돼도 부수효과가 없는 resource를 명시적 allowlist로 둔다. 서버가 early data를 받지 않기로 했다면 `425 Too Early`로 다시 보내게 한다.
- **OCSP stapling**은 클라이언트가 CA의 OCSP 응답자에 직접 묻는 왕복과 그 과정의 프라이버시 노출을 없앤다. 서버가 미리 받아 둔 서명된 응답을 핸드셰이크에 첨부한다.
- **ALPN**은 핸드셰이크 안에서 HTTP/2와 HTTP/1.1을 협상한다. h2를 목록에 넣지 않으면 TLS는 붙는데 HTTP/2로 못 올라간다.

## mTLS 설정

- nginx는 `ssl_verify_client on`으로 클라이언트 인증서를 요구하고 `ssl_client_certificate`로 신뢰할 CA 번들을 지정한다. 기본값은 off다. `optional`을 쓰면 제시된 경우에만 검증하고 결과를 변수로 넘겨 애플리케이션이 판단하게 할 수 있다.
- 현실적 부담은 설정이 아니라 그 뒤다. 신뢰 CA 목록을 누가 관리하는지, 발급한 클라이언트 인증서를 어떻게 폐기하는지가 남는다. CRL과 OCSP는 배포 지연과 조회 실패 시 동작(fail-open 대 fail-closed)이 애매해서, 실무에서는 인증서 수명을 짧게 가져가 폐기 대신 만료로 처리하는 쪽을 택하는 경우가 많다.
- 사설 CA를 직접 운영하면 루트 키 보관, 중간 CA 교체, 신뢰 번들 배포가 전부 숙제가 된다. 서비스 간 mTLS를 애플리케이션마다 설정하는 대신 인프라 계층이 대신 걸어 주는 접근은 [[Istio-Ambient-Mode|Istio Ambient Mode]]를 참고한다.

## 검증

- **협상 결과 확인**: `openssl s_client -connect example.com:443 -servername example.com` 출력에서 Protocol과 Cipher 줄을 본다. `-tls1_2`나 `-tls1_3`으로 특정 버전만 강제해 하한이 실제로 막혔는지 확인한다.
- **체인 확인**: `-showcerts`로 서버가 보내는 인증서 목록을 그대로 보고, leaf만 나오면 체인 누락이다. `-CAfile`과 `-verify_return_error`를 함께 주면 검증 실패 시 핸드셰이크를 중단시켜 결과가 분명해진다.
- **stapling과 ALPN**: `-status`로 OCSP 응답이 실제로 첨부되는지, `-alpn h2,http/1.1`로 h2가 협상되는지 본다.
- **배포 전 문법 검사**: `nginx -t`를 파이프라인에 넣는다. 설정 반영 전에 실패해야 안전하다.
- **외부 스캔**: testssl.sh나 SSL Labs로 지원 버전, 스위트, 체인, 취약점을 한 번에 훑는다. 등급 자체를 목표로 삼기보다 지적된 항목이 우리 클라이언트 분포에서 의미 있는지로 판단한다.

## 흔한 실수

- **중간 인증서 누락** — 브라우저만 확인하고 넘어가면 서버 간 호출에서 뒤늦게 터진다. `-showcerts`로 확인한다.
- **TLS 1.3만 켜고 배포** — Modern 프로파일은 안전하지만 구버전 클라이언트가 전부 끊긴다. 클라이언트 분포를 먼저 재고 옮긴다.
- **ssl_ciphers 복붙으로 TLS 1.3까지 제어된다고 착각** — TLS 1.3 스위트는 별도 설정 대상이라 해당 목록에 넣어도 반영되지 않는다.
- **LB에서 TLS 종료 후 오리진 구간 평문 방치** — 종료 지점 뒤가 신뢰 경계인지 판단이 필요하다. 배치 원칙은 [[Network-Perimeter-Security|네트워크 경계 보안]]과 [[Reverse-Proxy|리버스 프록시]]를 본다.
- **만료 감시 없이 자동 갱신만 신뢰** — 갱신 성공과 서버가 새 인증서를 제시하는 것은 다른 사건이다.
- **IaC 리스너의 기본 보안 정책 방치** — 콘솔과 CLI/CDK의 기본값이 달라 코드로 만든 리스너가 오래된 정책을 물려받는다.

## 면접 체크포인트

- "TLS 최소 버전을 뭘로 잡나?" → TLS 1.2 하한, 1.3 우선. RFC 8996이 TLS 1.0과 1.1에 MUST NOT을 규정했고 SSL 2.0과 3.0은 그 전에 폐기됐다.
- "TLS 1.3에서 cipher suite를 어떻게 고르나?" → RFC에는 다섯 개가 정의돼 있고, 일반 서버에서는 AES-GCM 두 개와 ChaCha20-Poly1305가 주로 쓰인다. 설정 인터페이스는 TLS 1.2용 cipher list와 분리돼 있다.
- "forward secrecy를 어떻게 보장하나?" → TLS 1.2는 키 교환을 (EC)DHE로 제한한다. TLS 1.3 full handshake와 PSK-DHE 재개는 ephemeral DH를 쓰지만 PSK-only와 0-RTT는 예외다. ticket key는 유출 영향 기간을 줄이도록 회전한다.
- "브라우저는 되는데 서버 간 호출만 TLS 검증에 실패한다면?" → 중간 인증서 누락. 브라우저는 캐시나 AIA로 보완하지만 서버 클라이언트는 안 한다. fullchain을 배포한다.
- "0-RTT를 켜도 되나?" → 리플레이 방지가 연결 간에는 보장되지 않으므로 method 이름만 믿지 않고 replay-safe resource allowlist로 제한하며, 거부할 때는 425로 재시도시킨다.
- "AWS ALB에서 특정 스위트만 빼려면?" → 못 뺀다. 사용자 정의 정책이 없어 이름 붙은 정책 중에서 고르고, 요구가 정책 경계와 안 맞으면 종료 지점을 옮기는 설계 판단이 된다.

## 출처
- [IETF, RFC 8446 — The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446.html)
- [IETF, RFC 8470 — Using Early Data in HTTP](https://www.rfc-editor.org/rfc/rfc8470.html)
- [IETF, RFC 8996 — Deprecating TLS 1.0 and TLS 1.1](https://datatracker.ietf.org/doc/html/rfc8996)
- [Mozilla, SSL Configuration Guidelines 5.7](https://ssl-config.mozilla.org/guidelines/5.7.json)
- [nginx, Module ngx_http_ssl_module](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [nginx, Controlling nginx](https://nginx.org/en/docs/control.html)
- [Node.js, TLS (SSL)](https://nodejs.org/api/tls.html)
- [OpenSSL, openssl-s_client](https://docs.openssl.org/master/man1/openssl-s_client/)
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
