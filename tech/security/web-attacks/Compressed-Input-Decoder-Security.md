---
tags: [security, compression, brotli, dependency, input-validation]
status: done
verified_at: 2026-10-28
category: "Security - 웹 공격"
aliases: ["Compressed Input Decoder Security", "압축 입력 디코더 보안", "HTTP2Shell", "Node2Shell"]
---

# 압축 입력 디코더의 공격면

압축 입력은 업무 로직에 도착하기 전에 라이브러리나 프록시에서 풀릴 수 있다. 직접 사용한 패키지뿐 아니라 런타임에 포함된 네이티브 디코더와 자동 압축 해제 경로도 입력의 신뢰 경계에 넣는다.

## 압축 폭탄과 메모리 손상은 다른 문제다

압축 해제 후 크기나 처리 시간을 제한하는 것은 자원 고갈을 줄이는 통제다. 디코더 구현이 버퍼 밖에 쓰는 결함을 그 제한만으로 고쳤다고 판단하지 않는다. 손상은 전체 압축 해제가 끝나기 전에 발생할 수도 있다. 패치 적용과 자원 제한을 별도로 확인한다.

## 사례: Brotli 디코더의 경계 밖 쓰기

2026-10-21 Node.js 공지는 CVE-2026-111497을 내장 Brotli 디코더의 경계 밖 쓰기로 설명한다. 잘못된 입력을 영구적인 형식 오류로 끝내지 않고 추가 입력이 필요한 상태로 처리하면서 내부 버퍼에 계속 쓰는 문제다. 애플리케이션이 공격자가 제공한 Brotli 데이터를 `node:zlib`로 압축 해제하면 충돌, 프로세스 메모리 노출 또는 원격 코드 실행으로 이어질 수 있다.

HTTP2Shell과 Node2Shell이라는 별칭은 프로토콜의 영향 범위를 정의하지 않는다. Brotli 압축 해제 경로의 결함이므로 HTTP/2를 끄는 것만으로 해결됐다고 보지 않는다. 반대로 Node.js가 설치돼 있다는 사실만으로 외부 입력이 그 디코더에 도달한다고 단정하지 않는다.

2026-10-28 공식 릴리스 확인 범위는 다음과 같다.

| 배포 단위 | 확인한 근거 | 운영에서 더 확인할 것 |
|---|---|---|
| Node.js | 10-21 보안 공지가 26.x, 24.x, 22.x의 영향과 업데이트 제공을 명시 | 사용 브랜치의 수정 릴리스, 실제 실행 바이너리와 재시작/재배포 |
| Google Brotli | `v1.2.1` 릴리스가 CVE-2026-111497 수정을 명시 | 동적 라이브러리와 앱/런타임에 함께 빌드된 사본의 버전 |
| Python `brotlicffi` | `v1.2.1.0` 릴리스 태그 존재 확인 | 설치한 wheel의 내장 Brotli와 보안 수정 포함 여부를 별도 대조 |

Bun, Envoy와 Istio도 입력에서 영향 후보로 제시됐지만 이 문서에서는 제품별 수정 버전을 검증하지 않았다. 상류 라이브러리 수정만으로 하류 제품의 배포가 끝났다고 계산하지 않는다. 해당 제품을 사용한다면 벤더 보안 공지와 실제 이미지의 구성요소를 확인한다.

## 운영 점검 예시

1. HTTP 요청 본문뿐 아니라 외부 응답, 파일과 메시지의 자동 압축 해제 경로를 찾는다.
2. 앱, 프록시, 런타임과 컨테이너별 내장 사본을 식별하고 해당 배포자의 수정 버전을 확인한다.
3. 수정 산출물로 다시 배포하고 실제 실행 프로세스가 교체됐는지 확인한다. lockfile 변경만으로 완료하지 않는다.
4. 완화가 필요하면 취약 디코더에 도달하는 경로를 제한한다. HTTP 헤더 차단은 다른 입력 경로나 이미 압축 해제하는 중간 계층까지 보호하지 않을 수 있다.
5. 반복 충돌과 재시작은 조사 신호로 쓰되 침해 성공 증거와 구분한다. 취약 기간의 로그와 자격증명 노출 가능성도 함께 조사한다.

위 항목은 운영 설계 제안이다. 취약점 재현이나 특정 서비스에 대한 영향 검사를 수행한 기록은 아니다.

## 출처

- [Wednesday, October 21, 2026 Security Releases — Node.js](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) — 2026-10-28 CVE 설명과 지원 브랜치 대조
- [Release v1.2.1 — google/brotli](https://github.com/google/brotli/releases/tag/v1.2.1) — 해당 CVE 수정 확인
- [Release v1.2.1.0 — python-hyper/brotlicffi](https://github.com/python-hyper/brotlicffi/releases/tag/v1.2.1.0) — 태그 존재만 확인, wheel 구성 검증과 구분

## 관련 문서

- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]] — 도달 가능성과 수정 가용성
- [[File-Upload-Security|파일 업로드 보안]] — 디코더의 격리와 입력 형식
- [[Coordinated-Vulnerability-Disclosure|조율된 취약점 공개]] — 공개와 패치, 실제 악용 시점
