---
tags: [performance, cdn, image, lambda-edge, avif, webp, lcp, egress, s3, thumbnail]
status: done
category: "성능&확장성(Performance&Scalability)"
aliases: ["Image Delivery Optimization", "이미지 전송 최적화", "이미지 CDN 최적화", "Lambda@Edge 이미지 리사이저", "On-demand Image Resizing", "온디맨드 리사이징"]
verified_at: 2026-10-14
---

# 이미지 전송 최적화 (Edge 변환, 포맷, GIF→MP4)

이미지가 많은 페이지는 응답 바이트가 곧 **로딩 속도(LCP)와 CDN 전송 비용(egress)** 으로 직결된다. 같은 그림을 더 작은 바이트로 보내면 두 지표를 동시에 잡는다. 핵심 레버는 셋이다. (1) 요청 맥락에 맞는 크기로 **엣지에서 리사이즈**, (2) 더 효율적인 **이미지 포맷**(WebP, AVIF), (3) 애니메이션 GIF는 아예 **동영상(MP4)** 으로 치환. 크기별 변형을 언제 만들지와 이미 쌓인 객체를 어떻게 옮길지는 저장 비용 쪽의 레버다.

## 크기별 변형: 미리 만들기 vs 요청 시 만들기

업로드 때 정해 둔 크기의 썸네일을 모두 만들어 두면 요청 경로는 단순하지만, 객체 수가 원본 수 × (1 + 변형 수)로 늘고 변형 크기만큼 저장 바이트도 늘며, 한 번도 요청되지 않는 변형까지 저장 요금을 계속 낸다. 요청 시 리사이즈(온디맨드)는 원본만 저장하고 요청이 올 때 변형을 만들어 저장 비용을 계산 비용과 맞바꾼다.

- 미리 만들기 비용 ≈ 변형 수 × (생성 1회 + 쓰기 요청 1회 + 보관 기간 전체의 저장 요금)
- 요청 시 만들기 비용 ≈ 클라이언트 캐시와 CDN을 지나 실제로 도달한 요청 수 × (원본 읽기 + 변환 1회)

어느 쪽이 싼지는 접근 패턴이 정하므로 S3와 CDN 접근 로그로 먼저 측정한다.

- **이미지당 조회자 수(fan-out)**: 1:1 대화나 커플 앨범처럼 소수만 보는 이미지는 변형당 조회가 적어, 미리 만든 변형이 보관 기간에 비해 드물게 읽힌다.
- **변형별 사용률**: 기기 해상도에 따라 아예 요청되지 않는 크기가 생긴다.
- **같은 변형의 재요청률**: 일정 기간 안에 다시 요청되는 비율이 낮으면 요청 시 만들어도 반복 계산이 적다.
- **클라이언트 캐시**: 프로필처럼 자주 보이는 이미지는 앱의 파일 캐시가 먼저 흡수한다.

변형 종류가 적고 모두 자주 쓰이거나, 변환이 무거워 첫 요청 지연을 견딜 수 없으면 미리 만들기가 맞다. 요청 시 만들기를 고르면 지연을 원본 읽기와 변환으로 나눠 측정한다. 원본 읽기가 더 길면 변환을 더 최적화해도 얻을 것이 적고, 변환 비용은 라이브러리 선택에 크게 좌우된다(아래 사례에서 Skia는 ImageMagick보다 약 4배 빨랐다).

### 변환 결과를 저장소에 다시 캐시할지

요청 시 만든 변형을 S3에 다시 저장해 재사용하는 2차 캐시는 손해일 수 있다. 미스마다 쓰기 요청과 저장 요금이 붙는데, S3 Standard의 PUT, COPY, POST, LIST 요청 요금은 1,000건당 0.005 USD로 GET(1,000건당 0.0004 USD)의 12.5배다(us-east-1, 2026-10-14 확인). 저장 캐시는 대략 `보관 기간 안의 재요청 수 × 변환 1회 비용 > PUT 1회 + 보관 기간의 저장 요금 + 조회 요청 비용`일 때만 이득이므로, 재사용은 먼저 CDN 캐시에 맡기고 저장 캐시는 실측 재요청률로 이 조건을 확인한 뒤 둔다. 임시 변형은 S3 수명 주기 만료 규칙으로 일정 기간 뒤 지우게 할 수 있으며, 최소 보관 기간이 없는 스토리지 클래스에서는 만료 자체에 비용이 들지 않는다.

### 사례 — 비트윈의 온디맨드 리사이징 (2016 기준)

- 2016년 3월 원본 약 11억 장과 여러 크기로 미리 만든 썸네일을 합쳐 약 66억 장, 738TB를 저장하고 있었다. S3 접근 로그 분석에서 같은 해상도 썸네일이 다시 요청되는 비율은 하루 안 10% 미만, 한 달 안 약 33%였다.
- 원본을 WebP로 바꿔 저장하고, 요청한 크기로 리사이즈해 JPEG로 내려주는 리사이저(요청당 100ms 미만)로 바꿨다. 발표 측정에서는 S3에서 원본을 받는 시간(59ms)이 변환(37ms)보다 길어 변환 최적화를 더 하지 않았다.
- 만든 썸네일을 S3에 한 달 보관하는 2차 캐시는 한 달 재요청률이 30%대인 조건에서 매번 리사이즈하는 쪽보다 비싸게 계산돼 제거했다.
- 결과: 객체 66.5억 개 → 11.7억 개, 저장 738TB → 184TB, 사진 저장과 리사이즈 비용 68% 감소.

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

공식 수치로는 손실 WebP가 같은 SSIM에서 비슷한 JPEG보다 25~34% 작고, 무손실 WebP는 PNG보다 26% 작다. 원본 저장 형식과 전송 형식은 분리할 수 있다. 원본을 WebP로 저장해 저장량을 줄이고, WebP를 받지 못하는 클라이언트에는 요청 시 JPEG로 바꿔 내려주는 식이다.

트레이드오프: **AVIF는 인코딩이 무겁다**(WebP 대비 ~1.5배 시간). 하지만 엣지 변환을 캐싱하면 최초 1회만 들고, 이후엔 캐시에서 나가므로 사용자 체감엔 영향이 없다.

### 브라우저 호환성 — 협상

AVIF를 모든 브라우저가 지원하진 않으므로 폴백이 필요하다. 두 방식.

- **`<picture>` + `<source type>`**: 브라우저가 지원하는 첫 포맷을 고르고, 안 되면 `<img>` 폴백.
- **`Accept` 헤더 협상**: 요청의 `Accept`에 `image/avif`, `image/webp`가 있는지 보고 엣지에서 포맷을 결정한다. CloudFront에서는 cache policy의 캐시 키에 `Accept`를 포함해 포맷별 객체를 분리하고 오리진으로 전달해야 한다. `Vary: Accept`는 브라우저와 중간 캐시를 위한 HTTP 응답 신호이며 CloudFront의 캐시 키 설정을 대신하지 않는다.

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

## 기존 객체 일괄 전환

새 업로드 경로만 바꾸면 이미 쌓인 객체는 옛 형식과 미리 만든 변형으로 남는다. 수십억 객체를 옮기는 작업은 큐와 워커로 나누고 다음을 지킨다.

- **작업 단위**: 사용자나 앨범처럼 데이터 소유 단위로 작업을 나눠 SQS에 넣고, Auto Scaling 그룹의 워커가 꺼내 처리한다. 한 단위가 지나치게 크면(사진 수만 장) 처리가 길어지므로 상한을 두고 나눈다. 처리 중 가시성 제한 시간을 연장할 수 있지만 최초 수신 뒤 12시간을 넘길 수 없다([[SQS-Worker-Reliability|SQS 워커 신뢰성]]).
- **멱등한 단계**: 변환 → 업로드 확인 → DB 기록 → 기존 변형 삭제 → 삭제 기록처럼 나눠, 어느 단계에서 다시 시작해도 사진이 사라지지 않게 한다. SQS 표준 큐는 같은 메시지를 두 번 이상 전달할 수 있고, Spot 인스턴스는 중단 통지(중지나 종료면 2분 전) 뒤 회수될 수 있다.
- **하류 기준 스케일링**: 변환은 워커를 늘리는 만큼 병렬로 늘지만 진행 상태를 서비스 DB에 기록하면 DB가 상한이 된다. CloudWatch 경보는 DB CPU처럼 다른 리소스의 지표로도 Auto Scaling 단계 조정 정책을 실행할 수 있으므로, DB CPU가 높으면 워커를 줄이고 낮으면 늘린다.
- **서비스 한도**: DeleteObjects는 요청당 최대 1,000개 키를 지운다. S3는 분할된 접두사당 초당 최소 3,500건의 PUT, COPY, POST, DELETE 또는 5,500건의 GET, HEAD를 처리하며, 요청률을 높이는 동안 503 Slow Down이 날 수 있다([[S3-Storage-Performance|S3 요청률과 접두사]]). SQS 표준 큐는 in-flight 메시지가 약 120,000개에 이르면 일부를 지우기 전까지 더 받지 못한다.
- **관리형 대안**: 객체 목록(S3 Inventory 보고서나 CSV)마다 같은 작업을 돌리는 일은 S3 Batch Operations가 Lambda 호출, 진행 추적, 완료 보고서까지 맡는다. DB 기록처럼 객체 밖 부수 효과의 처리량 상한은 이때도 따로 지킨다.

사례(위 비트윈): 11억 장 변환에 Spot 인스턴스를 최대 140대, 약 4일(6,767 인스턴스 시간) 썼고 DB 부하가 적은 새벽에 집중했다. 총비용 약 7,657 USD(S3 요청 약 25억 건 5,608 USD, EC2 1,959 USD, SQS 약 90 USD) 중 S3 요청 요금이 EC2보다 컸고, 작업 중 S3 삭제 요청 쓰로틀링과 SQS in-flight 한도(12만 개)에 걸렸다.

## 효과와 측정

전송 바이트 감소는 응답 크기와 LCP 지표로 검증한다(예: 이미지 응답 크기 P90 감소, LCP 단축). RUM(Real User Monitoring)으로 실제 사용자 리소스 성능을 추적하고, CDN 로그를 분석 계층(Athena, Grafana 등)으로 시각화해 병목과 트래픽 변화를 관찰한다.

## 트레이드오프, 주의

- **비용 절감 vs 사용자 경험**의 균형 — 변환 품질(quality)을 너무 낮추면 바이트는 줄지만 화질이 깨진다.
- **변환 부하의 위치 선택** — 가벼운 변형은 엣지(캐시 미스 1회), 무거운 트랜스코딩은 업로드 시점. 엣지에 무거운 작업을 올리면 제약과 비용에 막힌다.
- **캐시 분리** — CloudFront cache policy에서 포맷, 크기별 캐시 키를 정확히 나누고, `Accept` 협상을 쓰면 오리진 전달과 `Vary: Accept` 응답도 함께 설정해야 한다.
- **원본 재인코딩은 되돌릴 수 없다** — 손실 포맷으로 다시 인코딩한 원본은 처음 화질로 돌아가지 않는다. 재편집, 인쇄나 이후 더 나은 코덱으로의 재인코딩처럼 원본 화질이 필요한 기능이 있는지 먼저 정한다.
- **첫 요청 지연** — 요청 시 만들기는 캐시 미스마다 원본 읽기와 변환 시간이 응답에 더해진다.

## 면접 체크포인트

- 엣지 이미지 변환을 Origin Response에 붙여 캐시 미스 1회로 비용을 한정하는 설계
- WebP/AVIF의 바이트 절감과 AVIF 인코딩 비용을 캐싱으로 상쇄하는 논리
- AVIF 폴백 — `<picture>`와 `Accept` 헤더 협상, CloudFront 캐시 키 및 `Vary`의 역할 구분
- GIF→MP4를 엣지가 아니라 업로드 시점에 변환하는 이유(Lambda@Edge 패키지 50MB, 응답 1MB, 30초 제약)
- 이미지 최적화가 egress 비용과 LCP를 동시에 움직이는 이유
- 썸네일을 미리 만들지 요청 시 만들지 판단하는 접근 패턴 지표(fan-out, 미사용 변형, 재요청률, 클라이언트 캐시)
- 요청 시 만든 변형을 S3에 다시 저장하는 캐시가 손해가 되는 조건(쓰기 요청 단가와 재요청률)
- 수십억 객체 일괄 변환의 작업 단위, 멱등한 단계와 하류 DB 기준 워커 스케일링

## 출처
- [CloudFront — 요청 헤더를 기준으로 콘텐츠 캐싱](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/header-caching.html)
- [Amazon CloudFront — Lambda@Edge quotas](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html)
- [Google for Developers — An image format for the Web (WebP)](https://developers.google.com/speed/webp)
- [Amazon S3 — 요금](https://aws.amazon.com/s3/pricing/)
- [Amazon S3 — Managing the lifecycle of objects](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [Amazon S3 — DeleteObjects](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html)
- [Amazon S3 — Best practices design patterns: optimizing Amazon S3 performance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html)
- [Amazon S3 — Performing object operations in bulk with Batch Operations](https://docs.aws.amazon.com/AmazonS3/latest/userguide/batch-ops.html)
- [Amazon SQS — Amazon SQS visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
- [Amazon EC2 — Spot Instance interruption notices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html)
- [Amazon EC2 Auto Scaling — Step and simple scaling policies](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-simple-step.html)
- [Amazon CloudWatch — Using Amazon CloudWatch alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html)
- [S3와 이미지 CDN 비용 최적화 — 인프랩 기술블로그](https://tech.inflab.com/20251029-optimize-s3/)
- [서버 비용을 70%나 줄인 온디맨드 리사이징 이야기 — VCNC Engineering Blog](https://web.archive.org/web/20160710233929/http://engineering.vcnc.co.kr/2016/05/ondemand-image-resizing/)
- [Amazon S3 이미지 온디맨드 리사이징을 통한 70% 서버 비용 줄이기 — Amazon Web Services Korea](https://www.youtube.com/watch?v=c8tI-yLFXtM)

## 관련 문서
- [[CDN|CDN / CloudFront (Lambda@Edge, 캐시 키)]]
- [[Latency-Optimization|레이턴시 최적화]]
- [[Egress-Cost|Egress (데이터 전송) 비용]]
- [[Storage-Tiering|스토리지 티어링 (S3 비용)]]
- [[S3-Storage-Performance|S3 요청률과 접두사]]
- [[SQS-Worker-Reliability|SQS 워커 신뢰성 (가시성 연장, in-flight 한도)]]
- [[Idempotent-Consumer|멱등 컨슈머]]
