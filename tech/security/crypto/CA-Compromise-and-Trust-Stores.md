---
tags: [security, crypto, pki, tls, certificate, trust-store, revocation]
status: done
verified_at: 2026-11-02
category: "Security - 암호"
aliases: ["CA Compromise and Trust Stores", "CA 침해와 신뢰 저장소", "Trust Store", "신뢰 저장소", "CA Distrust"]
---

# CA 침해와 신뢰 저장소

공개 신뢰 CA의 키가 침해되거나 루트 프로그램이 CA를 불신하기로 하면, 위조 인증서가 막히는 시점은 클라이언트마다 다르다. 클라이언트가 어느 신뢰 저장소를 읽고 어떤 경로로 차단 정보를 받는지가 그 시점을 정한다. 브라우저가 막았다는 사실만으로 같은 기기의 명령행 도구, 언어 런타임과 컨테이너도 막혔다고 판단하지 않는다.

PKI와 인증서 체인의 기초는 [[Public-Key-Cryptography|공개키 암호와 PKI]], 서버 인증서의 교체 운영은 [[Certificate-Lifecycle-Management|인증서 수명주기 관리]], Node.js CA 옵션의 사용법은 [[Nodejs-Enterprise-Networking|Node.js 프록시와 인증서 설정]]에 있다.

2026-11-02에 Chrome, Mozilla, Apple, Microsoft, Node.js, Go, Python, certifi, curl, OpenSSL과 Debian의 공식 문서, Cloudflare의 사건 공지, 그리고 2026-10 eMudhra 사건과 2025 CRL 서명 오류의 Mozilla Bugzilla 기록을 대조했다. 각 도구의 동작을 직접 실행해 확인하지는 않았다.

## 정의

- **신뢰 저장소(trust store)**: 클라이언트가 체인 검증의 끝점으로 받아들이는 신뢰 앵커, 주로 루트 CA 인증서의 집합이다. 한 기기 안에도 여러 저장소가 공존한다. OpenSSL은 기본 신뢰 앵커를 제공하지 않으며, 많은 Linux 배포판이 시스템 기본 저장소를 두고 OpenSSL이 그것을 가리키게 구성한다.
- **루트 프로그램(root program)**: 브라우저나 OS 벤더가 자기 신뢰 저장소에 넣고 뺄 CA를 정하는 정책과 운영이다. Chrome Root Program, Mozilla CA 프로그램, Apple과 Microsoft가 각자 결정하고 각자의 경로로 배포한다.
- **폐기(revocation)**: 발급 CA가 CRL이나 OCSP로 인증서가 무효라고 선언하는 것이다. 클라이언트가 그 정보를 조회하거나 미리 내려받아야 효과가 있다.
- **불신(distrust)**: 클라이언트 쪽에서 루트 프로그램의 결정에 따라 특정 인증서, 공개키나 루트를 거부하는 것이다. Mozilla의 OneCRL은 CA가 폐기하지 않은 인증서도 예외적으로 차단할 수 있다. 루트를 저장소에서 빼면 그 루트 아래 체인이 신뢰를 잃지만, 다른 루트의 교차 서명(cross-sign) 경로가 있으면 그 경로도 따로 막아야 한다.

## 신뢰 저장소의 종류와 갱신 경로

| 클라이언트 | 신뢰 목록 | 불신이 반영되는 경로 |
|---|---|---|
| Chrome | Chrome Root Store | CRLSet 긴급 차단(2026-10 사례는 브라우저 업데이트나 재시작 없이 적용), 루트 제거는 Root Store 배포 |
| Firefox | Mozilla 루트 저장소(NSS) | OneCRL로 CA 인증서 차단 정보를 푸시, 루트 제거는 NSS 갱신으로 반영(폐기 확인 장치인 CRLite는 아래 절) |
| macOS의 Apple 프레임워크 사용 앱 | Apple 신뢰 저장소 | 자동 구성 데이터 업데이트, 소프트웨어 업데이트 불필요 |
| macOS 기본 명령행 도구 | `/etc/ssl/cert.pem` | 파일을 바꾸는 macOS 업데이트 또는 수동 편집 |
| Windows | Microsoft 루트 프로그램의 CTL | Windows Update에 연결되면 신뢰 CTL과 불신 CTL을 매일 받을 수 있음, 단절망은 배포 경로를 따로 구성 |
| Debian 계열 Linux | `ca-certificates` 패키지 | 패키지 갱신과 `update-ca-certificates`(`/etc/ssl/certs`와 `ca-certificates.crt` 재생성) |
| Node.js | 릴리스 시점에 고정된 Mozilla 저장소 스냅샷 | Node.js 버전 업그레이드 |
| Go `crypto/x509` | `VerifyOptions.Roots`가 nil이면 시스템 루트(macOS와 Windows는 플랫폼 검증기, 아래 `SSL_CERT_FILE` 예외 참고) | OS 쪽 갱신, go1.27.3과 go1.26.10부터는 표준 라이브러리의 SPKI 차단 목록도 적용(프로그램을 다시 빌드해야 반영, 이 문서의 해석) |
| Python requests | `certifi` 패키지 | certifi 업그레이드 |

같은 기기 안에서도 경로가 갈린다.

- **macOS**: Safari, Mail과 Apple 네트워킹, 보안 프레임워크를 쓰는 앱은 Apple 차단을 따르며 `/etc/ssl/cert.pem`을 쓰지 않는다. macOS와 Xcode Command Line Tools에 든 curl, git, python3, ruby, perl, openssl은 이 파일로 검증하고, 파일에 있는 루트로 이어지는 인증서에 대해 Apple 차단과 폐기 여부를 확인하지 않는다. 자체 루트 목록을 번들한 앱은 두 경로 어느 쪽도 따르지 않는다.
- **Node.js**: 번들 저장소는 릴리스 시점의 Mozilla 저장소 스냅샷이고 플랫폼과 관계없이 같다. `--use-system-ca`는 시스템 저장소를 번들과 `NODE_EXTRA_CA_CERTS`에 더하는 옵션이고, `NODE_EXTRA_CA_CERTS`도 번들을 확장할 뿐 빼지 못한다. Node.js 문서는 현재 시스템 설정의 불신이나 폐기를 다른 출처의 인증서에 적용하지 않는다고 밝힌다(2026-11-02 기준). 따라서 OS가 막은 루트가 번들에 남아 있으면 시스템 저장소 옵션만으로는 막히지 않는다. TLS 옵션 `ca`를 지정하면 기본 목록이 통째로 대체된다.
- **Go**: `Certificate.Verify`는 `Roots`가 nil이면 시스템 루트를 쓰고, macOS와 Windows에서는 플랫폼 검증기를 쓸 수 있다(Go 1.27의 `SSL_CERT_FILE` 예외는 운영 체크포인트). go1.27.3과 go1.26.10의 차단 목록은 Go가 직접 체인을 만드는 경로와 macOS, Windows의 플랫폼 검증 경로 양쪽에서 결과 체인을 검사하므로, `Roots`를 직접 지정한 호출에도 적용된다.
- **Python**: requests는 certifi의 인증서를 쓰고 certifi를 자주 업그레이드하라고 권한다. certifi는 Mozilla가 선별한 루트 모음이며 내용의 추가, 제거나 수정을 지원하지 않는다. 표준 라이브러리 `ssl.create_default_context()`는 OpenSSL 빌드 때 정한 기본 경로에서 CA를 읽고, Windows에서는 시스템 저장소도 읽는다. 그래서 한 프로세스 안에서도 requests와 `ssl`이 서로 다른 묶음을 볼 수 있다.

## 폐기와 불신 반영의 차이

- **Chrome**: OCSP와 CRL 온라인 조회를 일반적으로 하지 않는다(엔터프라이즈 정책으로 OCSP 조회를 켤 수 있다). CRLSet이 긴급 차단의 주된 수단이며, CRL에 폐기로 올라온 인증서 중 일부만 담는다.
- **Firefox**: OneCRL은 CA 인증서 폐기 정보를 중앙에서 모아 클라이언트에 밀어 넣는다. CRLite는 CT 로그에 나타난 폐기 인증서 집합을 압축해 내려받고 로컬에서 확인한다(Firefox 137부터 데스크톱에서 켜졌고 12시간마다 갱신).
- **OpenSSL과 Python**: Python `ssl` 문서는 OpenSSL이 기본적으로 CRL을 요구하지도 검증하지도 않는다고 적는다. OpenSSL 명령행에서는 `-crl_check`(말단 인증서)나 `-crl_check_all`(체인 전체)로 CRL 확인을 지정한다.
- **curl**: CRL 파일 지정(`--crlfile`)과 OCSP stapling 확인(`--cert-status`, OpenSSL과 GnuTLS 백엔드만)을 별도 옵션으로 둔다. Windows의 Schannel 백엔드는 피어 검증을 끄지 않는 한 CRL을 확인한다.

CA가 CRL에 올린 폐기는 CRL을 조회하지도 않고 CRLSet, OneCRL이나 불신 CTL 같은 차단 정보를 받지도 않는 클라이언트를 보호하지 못한다. 그런 클라이언트에서는 루트를 신뢰 저장소에서 빼거나 코드에 차단 목록을 넣어야 막힌다. 신뢰 저장소에는 보통 루트만 들어 있어 중간 인증서는 저장소에서 뺄 대상이 아니므로, 중간 CA만 막으려면 불신 장치가 필요하다(이 문서의 해석). Node.js가 2026-10에 SPKI SHA-256 해시 차단 목록을 바이너리에 넣은 변경(PR #66871)도, Node.js가 Mozilla 루트 저장소를 내장하지만 브라우저의 CRLSet이나 OneCRL에 해당하는 장치가 없다는 점을 이유로 들었다. Go도 2026-10 표준 라이브러리 `crypto/x509`에 SPKI SHA-256 해시 차단 목록을 넣었다. Go의 필터는 체인 안 모든 인증서의 공개키를 검사하므로, 같은 키를 다른 루트가 교차 서명한 경로도 함께 걸린다(이 문서의 해석).

CT 강제는 또 다른 방어선이다. Chrome은 공개 신뢰 인증서에 기본으로 CT를 강제한다. CT를 강제하지 않는 클라이언트는 로그에 없는 위조 인증서를 이 방법으로 걸러 내지 못한다(이 문서의 해석).

## 사례: eMudhra 중간 CA 키 침해 (2026-10)

- **발견**: 2026-10-17 한 연구자가 CCADB에 공개된 인증서로 만든 시험 묶음을 검사해 eMudhra 중간 CA 8개(P-384, TLS 6개와 코드 서명 2개)의 개인키를 복구했다. 18:05 UTC에 Apple, Chrome, Microsoft, Mozilla와 eMudhra에 키 보유 증명을 보냈다. Sectigo의 교차 서명 인증서도 영향을 받았고 Sectigo는 2026-10-19 그 폐기를 마쳤다고 보고했다.
- **원인**: Mozilla 분석에서 8개 키는 전부 256 미만의 정수라 마지막 바이트를 빼면 0이었다. 키는 2025-04-30 키 생성 의식에서 만들어졌다. eMudhra의 예비 설명은 wrap/unwrap 시험을 위해 승인한 절차 변경의 코드 결함으로 약한 두 번째 키 쌍이 HSM 안에 생겼고, 키 이름이 비슷해 이 키로 CSR을 만들었다는 것이다.
- **브라우저와 OS**: Chrome은 같은 날 19:45 UTC에 CRLSet으로 해당 중간 CA의 공개키(SPKI)를 차단했고, Mozilla는 22:59 UTC에 OneCRL 차단을 마쳤다(RemoteSettings로 배포). eMudhra는 같은 날 보고를 인정하고 2026-10-18 CRL에 8개를 caCompromise로 폐기했다. Android에는 2026-10-19 Google Play 서비스로 같은 차단이 배포돼 Google 발표 시점에 대부분의 기기가 받았고, Apple도 같은 날부터 자동 구성 데이터로 해당 인증서 12개를 막았다.
- **루트 제거**: Mozilla는 emSign ECC Root CA - G3의 긴급 신뢰 제거를 발표했고, 해당 변경(Bug 2084101)을 담은 NSS 3.131.1이 2026-10-20 나왔다. Apple은 2026-10-23부터 이 루트도 막았고, Chrome Root Store의 제거는 2026-10-27 배포 예정으로 발표됐으며 실제 배포 여부는 확인하지 않았다. eMudhra는 이전이 필요한 인증서를 초기 추정 약 30,000개(약 97%가 ACME 발급)로 밝히고 G1(RSA 루트)로 이어지는 중간 CA로 옮기겠다고 했다. 이후 eMudhra 상태 페이지는 독립 운영되는 다른 공개 신뢰 CA 계층에서 교체 인증서를 발급한다고 밝혀, 2026-11-02 확인한 버그 기록 범위에서 최종 이전 경로는 정해지지 않았다. 같은 기록에는 eMudhra가 글로벌 TLS 인증서 사업에서 철수한다는 보도자료와, InCommon 전환에 한해 G1 RSA 루트 경로를 임시로 쓴다는 상태 페이지 갱신이 인용됐다. Chrome Root Program은 2026-10-21 CT 데이터에서 emSign ECC Root CA - G3로 이어지는 만료 전 사전 인증서를 약 30,800개로 집계했다. 침해된 중간 CA는 CT에 기록된 TLS 인증서를 발급한 적이 없으므로 이 수는 같은 루트 아래 다른 하위 CA의 발급분이다(이 문서의 해석).
- **비브라우저 경로**: Apple은 2026-10-29 공지에서 macOS 기본 명령행 도구가 파일이 갱신되기 전까지 이 인증서를 받아들일 수 있다고 밝혔다. Node.js는 2026-10-21 보안 릴리스(26.12.1, 24.22.1, 22.23.4)에서 번들 루트를 NSS 3.131.1 기준으로 갱신하고 차단 공개키 목록을 넣었다. Google은 차단 전 이 중간 CA로 이어지는 TLS 인증서가 CT에 기록된 적이 없어 CT를 강제하는 클라이언트에는 쓰일 수 없었다고 설명했다.
- **Go와 certifi**: Go는 2026-10-19 go1.27.3과 go1.26.10을 내고 SPKI SHA-256 해시 8개를 차단 목록에 넣어 `Certificate.Verify`가 그 공개키를 담은 체인을 돌려주지 않게 했다(GO-2026-6809, CVE 별칭 CVE-2026-111943). Go 공지와 이슈는 CA 이름을 밝히지 않고 특정 CA의 소수 중간 인증서라고만 적었으며, 공개 시점과 개수가 이 중간 CA 8개와 맞는다(이 문서의 해석). certifi는 2026.10.18에서 emSign 루트들을 뺐고, 2026-10-20 PyPI에 올린 2026.10.19에서 영향받지 않은 emSign 루트를 되돌렸다.
- **서비스 사업자**: Cloudflare는 2026-10-20 Cloudflare One Client(WARP)와 1.1.1.1 앱, cloudflared 2026.10.2의 보안 업데이트를 내고, 컨테이너로 배포한 cloudflared는 수정된 이미지로 다시 배포하라고 안내했다. 자사 서비스에서는 실제 악용을 확인하지 못했다고 밝혔다.
- **탐지 공백**: Chrome은 이 중간 CA들이 CT에 기록된 말단 인증서를 발급한 적이 없어 CT 기반 감시에 들어오지 않았고, 쓰던 표준 린트 도구에 작은 스칼라 검사가 없었다고 밝혔다. CCADB 공개 전에 약한 키 자동 검사를 넣는 작업도 제안했다. 앞서 2025-06에는 Sectigo가 이 가운데 TLS 중간 CA 6개의 CRL에 잘못된 ECDSA 서명이 달려 있다고 보고했다(Bug 1970728). eMudhra는 2026-10 버그에서 그 CRL이 원래 개인키로 서명돼 검증에 실패했고 이후 결함 있는 키로 다시 서명했다고 설명했으며, 2025년 사고 보고서는 원인을 수동 CRL 생성 절차의 키 구성 오류로 적고 두 번째 키 쌍은 언급하지 않았다. CA가 낸 서명이 인증서 공개키로 검증되지 않으면 서명을 다시 만들기 전에 HSM의 키와 인증서 공개키가 같은 키인지부터 확인한다(운영 제안).

## 운영 체크포인트

- **도구가 실제로 읽는 묶음을 확인한다.**
  - curl: `curl -v` 출력에서 CA 저장소 경로를 본다. 기본값은 빌드 때 정해지고 `--cacert`, `CURL_CA_BUNDLE`(TLS 백엔드가 Schannel이 아닐 때만 인식), `SSL_CERT_FILE`, `SSL_CERT_DIR`로 바뀐다. `--ca-native`(8.2.0)는 OS 저장소를 쓰게 하지만 백엔드별 지원 버전이 다르고 Schannel에서는 효과가 없다.
  - Python: `python3 -c "import ssl; print(ssl.get_default_verify_paths())"`로 OpenSSL 기본 경로를, `python3 -m certifi`로 certifi 묶음 경로를 본다. requests에서는 `REQUESTS_CA_BUNDLE`(없으면 `CURL_CA_BUNDLE`)이 기본 묶음을 덮는다.
  - Node.js: `tls.getCACertificates('default')`(v23.10.0, v22.15.0부터)가 실제 기본 목록이고 `tls.rootCertificates`는 번들 스냅샷이다.
  - Go: `SSL_CERT_FILE`, `SSL_CERT_DIR`이 시스템 기본 위치를 바꾼다. Go 1.27 이상으로 빌드하고 메인 모듈 go.mod(워크스페이스면 go.work)의 go 버전도 1.27 이상이면(GODEBUG `x509sslcertoverrideplatform` 기본값 1, Go 1.31에서 이 설정을 없앨 계획) macOS와 Windows에서도 이 변수를 지정할 때 시스템 검증 API를 쓰지 않는다. 이때는 OS 쪽 차단 대신 지정한 파일과, go1.27.3 이상이면 Go 차단 목록만 적용된다(이 문서의 해석). go 1.26 이하를 선언한 모듈이나 `x509sslcertoverrideplatform=0`이면 macOS와 Windows에서는 이 변수를 무시하고 플랫폼 검증기를 쓴다.
  - Windows: `certutil -verifyctl Disallowed | findstr /i "lastsynctime"`로 불신 CTL의 마지막 동기화 시각을 본다.
- **브라우저 결과로 서버 쪽 클라이언트를 판정하지 않는다.** 실제 호출에 쓰는 클라이언트와 런타임으로 확인한다(운영 제안).
- **CI 러너와 컨테이너 이미지를 따로 본다.** 이미지에 든 `ca-certificates` 패키지, 고정한 Node.js 버전, 바이너리를 빌드한 Go 버전과 lockfile의 certifi 버전처럼 빌드 때 고정된 구성 요소가 그 환경의 신뢰 목록을 좌우하므로, 다른 런타임의 저장소와 환경 변수 재지정까지 함께 확인한다(운영 제안). 침해 공지 뒤에는 기반 이미지를 다시 빌드하고 런타임과 certifi를 올린다(운영 제안). Debian 계열에서 패키지 갱신 전에 막아야 하면 `/etc/ca-certificates.conf`의 해당 줄 앞에 `!`를 붙여 선택을 해제하고 `update-ca-certificates`를 실행한다.
- **직접 지정한 묶음은 직접 갱신한다.** Node.js의 `ca` 옵션이나 requests의 `verify` 경로처럼 파일을 고정하면 루트 프로그램의 불신 결정이 그 파일에 저절로 반영되지 않는다(운영 제안).
- **코드에 들어간 차단 목록은 런타임 버전으로 들어온다.** Node.js의 SPKI 차단 목록은 바이너리에 컴파일되므로 CA 파일 교체가 아니라 Node.js 업그레이드로 반영된다. Go의 차단 목록은 표준 라이브러리 소스에 있어 각 프로그램과 함께 빌드되므로, 툴체인만 올려서는 이미 배포한 바이너리와 컨테이너 이미지에 반영되지 않고 1.27 계열은 go1.27.3 이상, 1.26 계열은 go1.26.10 이상으로 다시 빌드해야 한다(이 문서의 해석). 지원이 끝난 릴리스 라인은 이런 갱신을 받지 못할 수 있다(운영 제안).
- **macOS 수동 조치는 임시로 쓴다.** Apple은 관리자가 `/etc/ssl/cert.pem`에서 emSign ECC Root CA - G3를 지울 수 있고, 그것만 지우면 Sectigo가 교차 서명한 인증서 6개가 AAA Certificate Services를 거쳐 계속 검증되므로 AAA Certificate Services도 선택적으로 지울 수 있다고 안내한다. 동시에 이 루트들로 이어지는 일부 사이트를 검증하지 못할 수 있고 macOS 업데이트가 파일을 Apple 버전으로 되돌릴 수 있다고 경고한다.
- **루트만 뺀 묶음은 교차 서명 경로를 따로 본다.** Sectigo가 폐기한 교차 서명 인증서도 CRL을 확인하지 않는 클라이언트에서는 묶음에 AAA Certificate Services가 남아 있으면 검증될 수 있다(이 문서의 해석). certifi 2026.10.19가 이 경로까지 막는지는 확인하지 않았고 이후 나온 2026.10.23의 변경도 확인하지 않았으므로, 최신 certifi로 올린 뒤 `python3 -m certifi`가 가리키는 파일에 그 루트가 남았는지 직접 본다. 남아 있으면 certifi 파일을 고치지 말고 직접 관리하는 묶음을 `REQUESTS_CA_BUNDLE`이나 `verify`로 지정해 갱신한다(운영 제안).
- **내려받은 코드의 검증을 TLS에만 맡기지 않는다.** 신뢰 경로가 뚫린 클라이언트로 받은 설치 스크립트나 패키지는 변조됐을 수 있으므로 서명이나 해시 검증을 따로 둔다(운영 제안, [[Supply-Chain-Security|공급망 보안]]).
- **클라이언트 신뢰 저장소도 인벤토리에 넣는다.** 어떤 서비스가 어떤 묶음과 런타임을 쓰는지 알면 CA 사고 때 영향 범위를 빨리 좁힐 수 있다(운영 제안). 서버 쪽 교체 역량은 [[Certificate-Lifecycle-Management#긴급 교체와 감사 기록|긴급 교체와 감사 기록]]에 있다.

## 확인 질문

- 브라우저는 경고를 띄우는 주소에서 CI 러너의 curl이 정상 응답을 받는다면, 어떤 저장소와 차단 경로부터 확인할 것인가?
- Node.js 서비스에 `--use-system-ca`를 켰고 OS도 침해된 루트를 막았는데 연결이 성공한다면 이유는 무엇인가?
- CA가 중간 인증서를 CRL에 폐기로 올린 뒤에도 위험이 남는 클라이언트는 어떤 조건을 가졌는가?
- Go 툴체인을 go1.27.3으로 올렸는데 운영 중인 서비스가 여전히 침해된 중간 CA로 이어지는 체인을 받아들인다면 무엇부터 확인할 것인가?

## 출처

- [Protecting Chrome and Android Users from Compromised eMudhra Intermediate CA Certificates — Google, Chrome and Android Security Teams](https://blog.google/security/protecting-chrome-and-android-users-from-compromised-emudhra-intermediate-ca-certificates/) — 2026-10-20. CRLSet 차단 시각, Android 반영, CT 기록 여부, Chrome Root Store 루트 제거 예정일
- [8 eMudhra certificates are compromised. Here's what you need to know — Cloudflare Blog, Bas Westerbaan](https://blog.cloudflare.com/emudhra-certificate-compromise/) — 2026-10-20. 클라이언트와 cloudflared 업데이트 시각, 컨테이너 재배포 안내, 악용 확인 여부
- [Bug 2083449: eMudhra: Private key compromise of Intermediate Certificates — Mozilla Bugzilla](https://bugzilla.mozilla.org/show_bug.cgi?id=2083449) — 보고자 타임라인, 키 값 범위, 키 생성 의식 날짜, eMudhra 예비 원인, OneCRL 배포, Sectigo 폐기, Chrome의 탐지 공백 설명, 이전 대상 인증서 수, 2025 CRL 재서명 설명
- [Bug 1970728: eMudhra: Invalid CRL signatures — Mozilla Bugzilla](https://bugzilla.mozilla.org/show_bug.cgi?id=1970728) — 2025-06 Sectigo 보고, eMudhra 사고 보고서의 원인 설명
- [NSS 3.131.1 release notes — Mozilla](https://firefox-source-docs.mozilla.org/security/nss/releases/nss_3_131_1.html)
- [Node.js v26.12.1 release notes — Node.js](https://nodejs.org/en/blog/release/v26.12.1)
- [Node.js v24.22.1 release notes — Node.js](https://nodejs.org/en/blog/release/v24.22.1)
- [Node.js v22.23.4 release notes — Node.js](https://nodejs.org/en/blog/release/v22.23.4)
- [tls: reject chains containing blocked public keys (#66871) — GitHub, nodejs/node](https://github.com/nodejs/node/pull/66871)
- [Release History — Go](https://go.dev/doc/devel/release) — go1.27.3과 go1.26.10 출시일
- [crypto/x509: mitigation for security concerns with a specific Certificate Authority (#82345) — GitHub, golang/go](https://github.com/golang/go/issues/82345)
- [crypto/x509: distrust a handful of intermediates (7f86f95) — GitHub, golang/go](https://github.com/golang/go/commit/7f86f95) — master 커밋. SPKI 해시 방식, macOS와 Windows 플랫폼 검증 경로의 변경
- [release-branch.go1.27 crypto/x509: distrust a handful of intermediates (90617fb) — GitHub, golang/go](https://github.com/golang/go/commit/90617fb) — 1.27 백포트, 같은 세 파일 변경(1.26 백포트는 go1.26.10 태그 소스로 대조)
- [src/crypto/x509/verify.go — GitHub, golang/go](https://github.com/golang/go/blob/master/src/crypto/x509/verify.go) — SPKI SHA-256 차단 목록과 체인 검사
- [Go, Go, Backwards Compatibility, and GODEBUG](https://go.dev/doc/godebug) — `x509sslcertoverrideplatform` 설정과 go.mod의 go 버전에 따른 기본값
- [Comparing 2026.07.22...2026.10.19 — GitHub, certifi/python-certifi](https://github.com/certifi/python-certifi/compare/2026.07.22...2026.10.19) — emSign 루트 제거와 복원 커밋
- [CRLite: Fast, private, and comprehensive certificate revocation checking in Firefox — Mozilla Hacks, John Schanck](https://hacks.mozilla.org/2025/08/crlite-fast-private-and-comprehensive-certificate-revocation-checking-in-firefox/)
- [This Is Bad — YouTube, The PrimeTime](https://www.youtube.com/watch?v=O905JwSgoi4) — 계기 자료. 브라우저와 명령행 도구, 런타임의 반영 시차라는 관점만 사용했고 사실은 이 목록의 1차 출처로 대조
- [The Internet Trusted a Private Key of 4 (for 17 months!) — YouTube, Better Stack](https://www.youtube.com/watch?v=yW1RnJ5oaMk) — 계기 자료. Go, certifi, Cloudflare 대응과 2025 CRL 서명 오류라는 단서만 사용했고 사실은 이 목록의 1차 출처로 대조
- [Apple, About the compromised eMudhra intermediate CAs](https://support.apple.com/en-us/149555) — 2026-10-29 게시. 차단 날짜, `/etc/ssl/cert.pem`과 명령행 도구, 수동 조치의 한계
- [Chromium, CRLSets](https://www.chromium.org/Home/chromium-security/crlsets/)
- [Mozilla Wiki, CA/Revocation Checking in Firefox](https://wiki.mozilla.org/CA/Revocation_Checking_in_Firefox)
- [Microsoft Learn, Configure trusted roots and disallowed certificates in Windows](https://learn.microsoft.com/en-us/windows-server/identity/ad-cs/configure-trusted-roots-disallowed-certificates)
- [Node.js, Command-line API](https://nodejs.org/api/cli.html)
- [Node.js, TLS](https://nodejs.org/api/tls.html)
- [Go, crypto/x509](https://pkg.go.dev/crypto/x509) — go1.27.3 문서 기준. `SystemCertPool`, `Certificate.Verify`, `VerifyOptions.Roots`
- [Go Vulnerability Database, GO-2026-6809](https://pkg.go.dev/vuln/GO-2026-6809) — 영향 버전과 수정 버전
- [Python, ssl: TLS/SSL wrapper for socket objects](https://docs.python.org/3/library/ssl.html)
- [Requests, Advanced Usage: CA Certificates](https://requests.readthedocs.io/en/latest/user/advanced/#ca-certificates)
- [PyPI, certifi](https://pypi.org/project/certifi/)
- [curl, SSL CA Certificates](https://curl.se/docs/sslcerts.html)
- [curl, curl man page](https://curl.se/docs/manpage.html)
- [OpenSSL, openssl-verification-options](https://docs.openssl.org/master/man1/openssl-verification-options/)
- [Debian Manpages, update-ca-certificates(8)](https://manpages.debian.org/trixie/ca-certificates/update-ca-certificates.8.en.html)

## 관련 문서

- [[Public-Key-Cryptography|공개키 암호와 PKI]]
- [[Certificate-Lifecycle-Management|인증서 수명주기 관리]]
- [[TLS-Config|TLS 설정과 검증]]
- [[HTTPS-TLS|HTTPS와 TLS 핸드셰이크]]
- [[Nodejs-Enterprise-Networking|Node.js 프록시와 인증서 설정]]
- [[Supply-Chain-Security|공급망 보안]]
- [[Container-Image-Build|컨테이너 이미지 빌드]]
- [[Elliptic-Curve-Parameter-Provenance|타원곡선 파라미터의 출처 (공개 파라미터와 개인키 구분)]]
