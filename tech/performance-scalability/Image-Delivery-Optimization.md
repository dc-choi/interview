---
tags: [performance, cdn, image, lambda-edge, avif, webp, lcp, egress]
status: done
category: "성능&확장성(Performance&Scalability)"
aliases: ["Image Delivery Optimization", "이미지 전송 최적화", "이미지 CDN 최적화", "Lambda@Edge 이미지 리사이저"]
---

# 이미지 전송 최적화 (Edge 변환, 포맷, GIF→MP4)

이미지가 많은 페이지는 응답 바이트가 곧 **로딩 속도(LCP)와 CDN 전송 비용(egress)** 으로 직결된다. 같은 그림을 더 작은 바이트로 보내면 두 지표를 동시에 잡는다. 핵심 레버는 셋이다. (1) 요청 맥락에 맞는 크기로 **엣지에서 리사이즈**, (2) 더 효율적인 **이미지 포맷**(WebP, AVIF), (3) 애니메이션 GIF는 아예 **동영상(MP4)** 으로 치환.

## Edge 이미지 리사이저 (Lambda@Edge)

[[CDN|CloudFront]] 엣지에서 함수를 실행해 원본 이미지를 요청한 크기, 포맷으로 변환한다. 변환 비용을 캐시 미스 1회로 한정하는 게 설계의 핵심.

- **Origin Response 트리거**에 붙인다 — 캐시 **미스일 때만** Lambda가 실행되고, 변환 결과를 CloudFront가 캐싱한다. 이후 같은 변형은 캐시 히트라 Lambda 비용 0.
- 캐시 히트율이 높을수록 변환 비용은 미미해진다(히트율 90%면 변환 실행은 10%만).
- 쿼리스트링(`?w=400&f=avif`)을 Cache Key에 넣어 변형별로 캐싱한다.

`sharp` 같은 라이브러리로 리사이즈 + 포맷 변환을 한 번에 처리한다(`resize({width}).toFormat(format, { quality: 80 })`).

## 이미지 포맷 — WebP, AVIF

같은 화질에서 더 적은 바이트를 쓰는 포맷으로 바꾸면 전송량이 크게 준다. JPG 기준 대략:

| 포맷 | 상대 크기 | 절감 |
|---|---|---|
| JPG(원본) | 100% | — |
| WebP | ~68% | ~32% |
| AVIF | ~55% | ~45% |

트레이드오프: **AVIF는 인코딩이 무겁다**(WebP 대비 ~1.5배 시간). 하지만 엣지 변환을 캐싱하면 최초 1회만 들고, 이후엔 캐시에서 나가므로 사용자 체감엔 영향이 없다.

### 브라우저 호환성 — 협상

AVIF를 모든 브라우저가 지원하진 않으므로 폴백이 필요하다. 두 방식.

- **`<picture>` + `<source type>`**: 브라우저가 지원하는 첫 포맷을 고르고, 안 되면 `<img>` 폴백.
- **`Accept` 헤더 협상**: 요청의 `Accept`에 `image/avif`, `image/webp`가 있는지 보고 엣지에서 포맷 결정. 이때 `Vary: Accept`로 포맷별 캐시를 분리해야 한다.

```html
<picture>
  <source srcset="image.jpg?f=avif" type="image/avif" />
  <source srcset="image.jpg?f=webp" type="image/webp" />
  <img src="image.jpg" alt="..." />
</picture>
```

## 애니메이션 GIF → MP4/AVIF

애니메이션 GIF는 코덱이 낡아 용량이 크다. 동영상 코덱으로 바꾸면 대폭 줄어든다(원본 GIF 대비 대략 AVIF ~72%, H.264 MP4 ~68% 절감). 프론트는 `<video muted loop autoplay playsinline>`로 GIF처럼 보이게 재생한다.

### 왜 엣지가 아니라 업로드 시점에 변환하나

GIF→MP4는 FFmpeg가 필요한데 Lambda@Edge의 제약에 걸린다.

| 제약 | 값 | GIF→MP4 충돌 |
|---|---|---|
| 배포 패키지 크기 | 50MB | FFmpeg 바이너리 60~80MB 초과 |
| 응답 크기 | 1MB | 큰 GIF 변환 결과가 초과 |
| 실행 시간(Origin) | 30초 | 큰 GIF 인코딩이 초과 가능 |

그래서 GIF는 **업로드 시점 변환**으로 처리한다: GIF 업로드 → S3 이벤트 트리거 → (제약이 느슨한 일반) Lambda가 FFmpeg로 MP4 변환 → S3 저장. 엣지 변환(리사이즈, 포맷)과 업로드 변환(무거운 트랜스코딩)을 **부하 특성에 따라 분리**하는 게 요점.

## 효과와 측정

전송 바이트 감소는 응답 크기와 LCP 지표로 검증한다(예: 이미지 응답 크기 P90 감소, LCP 단축). RUM(Real User Monitoring)으로 실제 사용자 리소스 성능을 추적하고, CDN 로그를 분석 계층(Athena, Grafana 등)으로 시각화해 병목과 트래픽 변화를 관찰한다.

## 트레이드오프, 주의

- **비용 절감 vs 사용자 경험**의 균형 — 변환 품질(quality)을 너무 낮추면 바이트는 줄지만 화질이 깨진다.
- **변환 부하의 위치 선택** — 가벼운 변형은 엣지(캐시 미스 1회), 무거운 트랜스코딩은 업로드 시점. 엣지에 무거운 작업을 올리면 제약과 비용에 막힌다.
- **캐시 분리** — 포맷, 크기별로 Cache Key/`Vary`를 정확히 나눠야 엉뚱한 변형이 섞이지 않는다.

## 면접 체크포인트

- 엣지 이미지 변환을 Origin Response에 붙여 캐시 미스 1회로 비용을 한정하는 설계
- WebP/AVIF의 바이트 절감과 AVIF 인코딩 비용을 캐싱으로 상쇄하는 논리
- AVIF 폴백 — `<picture>` vs `Accept` 헤더 협상과 `Vary` 캐시 분리
- GIF→MP4를 엣지가 아니라 업로드 시점에 변환하는 이유(Lambda@Edge 패키지 50MB, 응답 1MB, 30초 제약)
- 이미지 최적화가 egress 비용과 LCP를 동시에 움직이는 이유

## 출처
- [S3와 이미지 CDN 비용 최적화 — 인프랩 기술블로그](https://tech.inflab.com/20251029-optimize-s3/)

## 관련 문서
- [[CDN|CDN / CloudFront (Lambda@Edge, 캐시 키)]]
- [[Latency-Optimization|레이턴시 최적화]]
- [[Egress-Cost|Egress (데이터 전송) 비용]]
- [[Storage-Tiering|스토리지 티어링 (S3 비용)]]
