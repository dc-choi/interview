---
tags: [security, compression, brotli, dependency, input-validation]
status: done
verified_at: 2026-11-08
category: "Security - 웹 공격"
aliases: ["Compressed Input Decoder Security", "압축 입력 디코더 보안", "HTTP2Shell", "Node2Shell", "Broccoli2shell", "Zip Bomb", "압축 폭탄"]
---

# 압축 입력 디코더의 공격면

압축 입력은 업무 로직에 도착하기 전에 라이브러리나 프록시에서 풀릴 수 있다. 직접 사용한 패키지뿐 아니라 런타임에 포함된 네이티브 디코더와 자동 압축 해제 경로도 입력의 신뢰 경계에 넣는다.

## 압축 폭탄과 메모리 손상은 다른 문제다

압축 해제 후 크기나 처리 시간을 제한하는 것은 자원 고갈을 줄이는 통제다. 디코더 구현이 버퍼 밖에 쓰는 결함을 그 제한만으로 고쳤다고 판단하지 않는다. 손상은 전체 압축 해제가 끝나기 전에 발생할 수도 있다. 패치 적용과 자원 제한을 별도로 확인한다.

## 압축 폭탄의 원리와 통제

압축 폭탄(zip bomb)은 디코더의 결함을 쓰지 않는다. 압축이 정상적으로 동작한 결과로 작은 입력이 해제 단계에서 저장 공간, 메모리와 처리 시간을 소진시킨다.

- **단일 DEFLATE의 상한**: zip이 주로 쓰는 DEFLATE는 반복을 앞선 데이터의 복사 지시로 바꿔 줄이지만 한 스트림의 압축률이 1032배를 넘지 못한다. 0만 이어진 데이터도 이 상한에 걸린다.
- **재귀형 폭탄**: 그래서 고전적인 폭탄은 zip 안에 zip을 넣어 층마다 배수를 곱한다. 대표 사례인 42.zip은 6층을 모두 재귀적으로 풀면 4.5 PB가 되지만 맨 위층만 풀면 0.6 MB다. 재귀적으로 푸는 구현에만 통하며 대부분의 압축 해제 구현은 재귀하지 않는다. 반면 백신은 중첩 압축 파일을 재귀적으로 풀어 검사하므로(아래 ClamAV 설정 참고) 표적이 될 수 있다. 업로드 처리기도 중첩 압축을 자동으로 풀도록 구현했다면 같은 위험을 진다(적용 판단).
- **비재귀형 폭탄**: 여러 파일 항목이 같은 압축 데이터를 겹쳐 가리키게 만들면 한 번의 해제만으로 상한을 넘는다. 2019년 공개된 구성은 10 MB를 281 TB로 풀었고, 입력이 커질수록 출력이 입력 크기의 제곱에 비례해 늘었다. 재귀 깊이 제한만으로는 막지 못한다.

통제는 해제를 시작하기 전의 추정이 아니라 해제 중의 실측에 건다.

- **재귀 깊이와 개수, 총량**: 예를 들어 ClamAV는 중첩 압축의 검사 깊이(`MaxRecursion`, 기본 17), 한 컨테이너 안의 검사 파일 수(`MaxFiles`, 기본 10000), 입력 하나에서 검사할 데이터 총량(`MaxScanSize`, 기본 400M)과 개별 파일 크기(`MaxFileSize`, 기본 100M)를 제한하고, `MaxScanTime`(기본 120000 ms, 현재 ZIP 검사 시간에만 적용)으로 시간도 제한한다(2026-11-08 main 브랜치의 설정 예시 파일 기준). 한도를 넘은 파일에 `Heuristics.Limits.Exceeded`로 시작하는 탐지명을 붙이는 `AlertExceedsMax`는 기본값이 no이므로, 한도 초과를 탐지 결과로 받으려면 따로 켠다.
- **메타데이터를 믿지 않는다**: zip 메타데이터에 적힌 크기는 실제 해제 크기와 다를 수 있어, 선언된 크기를 합산하는 사전 검사로는 일반적인 방어가 되지 않는다. 겹친 파일 항목 탐지는 비재귀형 폭탄의 한 종류만 막고, 파서 앞단의 필터가 아니라 파서 안에서 구현해야 한다. 같은 zip을 두 파서가 다르게 해석할 수 있기 때문이다.
- **격리**: 신뢰하지 않는 압축 입력은 시간, 메모리와 디스크 사용량을 제한한 샌드박스 안에서 해제한다. 이미지처럼 형식이 복잡해 파서 결함이 잦은 입력을 다루는 방식과 같다. 업로드 경로의 적용은 [[File-Upload-Security|파일 업로드 보안]]을 따른다.

## 사례: Brotli 디코더의 경계 밖 쓰기

2026-10-21 Node.js 공지는 CVE-2026-111497을 내장 Brotli 디코더의 경계 밖 쓰기로 설명한다. 잘못된 block switch를 영구적인 형식 오류로 끝내지 않고 추가 입력이 필요한 상태로 처리하면서 8바이트 내부 버퍼에 계속 쓰는 문제다. 애플리케이션이 공격자가 제공한 Brotli 데이터를 `node:zlib`로 압축 해제하면 충돌, 프로세스 메모리 노출 또는 원격 코드 실행으로 이어질 수 있다.

HTTP2Shell과 Node2Shell이라는 별칭은 프로토콜이나 런타임의 영향 범위를 정의하지 않는다. Brotli 압축 해제 경로의 결함이므로 HTTP/2를 끄는 것만으로 해결됐다고 보지 않는다. 반대로 Node.js가 설치돼 있다는 사실만으로 외부 입력이 그 디코더에 도달한다고 단정하지 않는다. Wiz는 이 취약점을 Broccoli2shell이라고 부른다.

CISA는 2026-10-27에 이 CVE를 알려진 악용 취약점(KEV) 목록에 추가했고, 미국 연방기관의 조치 기한을 2026-11-10로 정했다. 실제 악용이 보고된 취약점이므로 다음 정기 패치까지 미루지 않는다.

2026-10-28과 2026-11-01에 공식 공지와 릴리스로 확인한 범위는 다음과 같다.

| 배포 단위 | 확인한 근거 | 운영에서 더 확인할 것 |
|---|---|---|
| Node.js | 10-21 보안 공지와 릴리스 기준 22.23.4, 24.22.1, 26.12.1에서 수정. 같은 공지의 CVE는 이 건을 포함해 10건이고 브랜치마다 포함 건수가 다르다. 공지는 EOL 버전이 항상 영향을 받는다고 적으며, EOL인 v20에는 수정 릴리스가 없다 | 사용 브랜치의 수정 릴리스, 실제 실행 바이너리와 재시작/재배포 |
| Bun | 10-23 보안 권고 기준 1.0.21 이상 1.4.4 미만이 영향 범위다. 1.4.4가 내장 Brotli를 1.2.1로 올려 고쳤다. 영향 경로는 `br` 응답을 자동으로 푸는 `fetch`, `node:zlib`의 Brotli 함수와 Brotli `DecompressionStream`이다 | `bun build --compile`로 만든 실행 파일은 다시 빌드해야 한다. 권고는 프로세스 전체에 걸리는 우회책이 없다고 적는다. `fetch`의 `decompress: false`는 그 요청에만 적용되고, 권고가 `node:zlib`와 `DecompressionStream` 경로에 제시한 완화는 비신뢰 Brotli 데이터를 넘기지 않는 것뿐이다 |
| Envoy | 10-23 보안 권고 기준 Brotli decompressor를 구성한 배포가 영향 범위다. v1.36.12, v1.37.8, v1.38.6, v1.39.3, v1.40.0에서 수정 | decompressor 필터 구성 여부와 실행 중인 proxy의 버전 |
| Istio | ISTIO-SECURITY-2026-007이 `EnvoyFilter` 등으로 Brotli 압축 해제를 켠 사용자에게 업그레이드를 권고. 1.31.2 이상, 1.30.6 이상과 1.29의 마지막 릴리스인 1.29.9에서 수정 | sidecar와 gateway의 proxy 이미지 교체 여부 |
| Google Brotli | `v1.2.1` 릴리스가 CVE-2026-111497 수정을 명시 | 동적 라이브러리와 앱/런타임에 함께 빌드된 사본의 버전 |
| Python `brotli`, `brotlicffi` | GitHub가 검토한 권고 GHSA-9v8h-qqgm-4m35가 PyPI `brotli` 1.2.1과 `brotlicffi` 1.2.1.0을 수정 버전으로 표시 | 설치한 wheel이 실제로 수정된 Brotli를 포함하는지 |

Node.js 공지는 영향 API로 `node:zlib`만 적고, 내장 `fetch`의 자동 압축 해제가 이 디코더를 거치는지는 밝히지 않는다. Bun 공지가 `fetch`를 영향 경로로 적었다는 이유로 Node.js의 `fetch`를 영향 범위로 단정하지 않으며, 거꾸로 안전하다고도 보지 않는다. 수정 릴리스로 올리는 것이 두 판단을 모두 덮는다. 같은 보안 릴리스에는 TLS hostname 검증 우회 같은 다른 high 등급 CVE도 들어 있다. 브랜치마다 포함된 CVE가 다르므로 사용 브랜치의 릴리스 노트로 확인하고, Brotli 경로가 없다는 이유만으로 업그레이드를 건너뛰지 않는다.

Wiz는 자사 데이터 기준으로 클라우드 환경의 91%가 이 CVE에 취약한 자원을 가지고 있다고 밝혔다. 이 수치는 취약한 자원을 가진 환경의 비율이며, 실제로 악용할 수 있는 환경의 비율을 밝힌 것은 아니다. 상류 라이브러리 수정만으로 하류 제품의 배포가 끝났다고 간주하지 않는다. Brotli를 내장한 프록시, 런타임과 이미지를 쓴다면 벤더 보안 공지와 실제 이미지의 구성요소를 확인한다.

## 운영 점검 예시

1. HTTP 요청 본문뿐 아니라 외부 응답, 파일과 메시지의 자동 압축 해제 경로를 찾는다.
2. 앱, 프록시, 런타임과 컨테이너별 내장 사본을 식별하고 해당 배포자의 수정 버전을 확인한다.
3. 수정 산출물로 다시 배포하고 실제 실행 프로세스가 교체됐는지 확인한다. lockfile 변경만으로 완료하지 않는다.
4. 완화가 필요하면 취약 디코더에 도달하는 경로를 제한한다. HTTP 헤더 차단은 다른 입력 경로나 이미 압축 해제하는 중간 계층까지 보호하지 않을 수 있다.
5. 반복 충돌과 재시작은 조사 신호로 쓰되 침해 성공 증거와 구분한다. 취약 기간의 로그와 자격증명 노출 가능성도 함께 조사한다.

위 항목은 운영 설계 제안이다. 취약점 재현이나 특정 서비스에 대한 영향 검사를 수행한 기록은 아니다.

## 출처

- [Wednesday, October 21, 2026 Security Releases — Node.js](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) — 2026-10-28 CVE 설명과 지원 브랜치 대조, 2026-11-01 함께 수정된 CVE 10건과 영향 API 확인
- [Node.js 22.23.4 (LTS) — Node.js](https://nodejs.org/en/blog/release/v22.23.4), [Node.js 24.22.1 (LTS) — Node.js](https://nodejs.org/en/blog/release/v24.22.1), [Node.js 26.12.1 (Current) — Node.js](https://nodejs.org/en/blog/release/v26.12.1) — 2026-11-01 브랜치별 수정 버전 확인
- [Bundled brotli decoder has an out-of-bounds write (CVE-2026-111497) — oven-sh/bun](https://github.com/oven-sh/bun/security/advisories/GHSA-663w-cv8g-jj2p) — 2026-11-01 영향 범위, 영향 API와 임시 완화 확인
- [Out-of-Bounds Write in Brotli Decompressor — envoyproxy/envoy](https://github.com/envoyproxy/envoy/security/advisories/GHSA-3wvj-j6qm-62mr) — 2026-11-01 구성 조건과 수정 버전 확인
- [ISTIO-SECURITY-2026-007 — Istio](https://istio.io/latest/news/security/istio-security-2026-007/) — 2026-11-01 영향 조건과 수정 버전 확인
- [Release v1.2.1 — google/brotli](https://github.com/google/brotli/releases/tag/v1.2.1) — 해당 CVE 수정 확인
- [Release v1.2.1.0 — python-hyper/brotlicffi](https://github.com/python-hyper/brotlicffi/releases/tag/v1.2.1.0) — 태그 존재만 확인, wheel 구성 검증과 구분
- [GHSA-9v8h-qqgm-4m35 — GitHub Advisory Database](https://github.com/advisories/GHSA-9v8h-qqgm-4m35) — 2026-11-01 PyPI 패키지의 수정 버전 확인
- [Known Exploited Vulnerabilities Catalog — CISA](https://www.cisa.gov/known-exploited-vulnerabilities-catalog?field_cve=CVE-2026-111497) — 2026-11-01 등재일과 조치 기한 확인
- [Broccoli2shell: Everything You Need To Know About The Critical Brotli Decoder Vulnerability — Wiz](https://www.wiz.io/blog/cve-2026-111497-brotli-rce-node-js) — 2026-10-25 게시, 2026-11-01 자사 데이터 기준 취약 자원 보유 비율 확인
- [A better zip bomb — USENIX WOOT '19, David Fifield](https://www.usenix.org/conference/woot19/presentation/fifield) — 2026-11-08 논문 본문으로 DEFLATE 상한 1032, 42.zip의 층과 크기, 비재귀형 구성의 결과와 탐지, 격리 논의 대조
- [clamd.conf.sample — Cisco-Talos/clamav](https://github.com/Cisco-Talos/clamav/blob/main/etc/clamd.conf.sample) — 2026-11-08 main 브랜치의 압축 검사 한도와 기본값 대조. 설치한 버전의 기본값은 해당 버전의 설정 문서로 다시 확인
- [압축파일 하나로 컴퓨터를 끝장내는 방법 — YouTube, 조코딩 JoCoding](https://www.youtube.com/watch?v=1ZI4kPtfZE4) — 2026-10-28 공개 영상. 압축 폭탄 절의 계기이며 사실은 위 1차 출처로 대조하고 확인하지 못한 수치는 쓰지 않음

## 관련 문서

- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]] — 도달 가능성과 수정 가용성
- [[File-Upload-Security|파일 업로드 보안]] — 디코더의 격리와 입력 형식
- [[Coordinated-Vulnerability-Disclosure|조율된 취약점 공개]] — 공개와 패치, 실제 악용 시점
