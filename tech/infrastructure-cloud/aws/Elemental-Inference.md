---
tags: [aws, elemental, video, inference, metadata]
status: done
verified_at: 2026-10-07
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["AWS Elemental Inference", "영상 인코딩과 AI 메타데이터"]
---

# AWS Elemental Inference

영상 인코딩과 함께 AI 분석을 수행해 크롭, 하이라이트, 자막과 문맥 메타데이터를 만드는 관리형 서비스다. 기존 방송을 다른 화면 비율과 배포 채널에 맞게 재사용하는 데 쓰인다. 생성형 모델로 새로운 장면을 만드는 [[Generative-Video-Editing|영상 편집]]과는 역할이 다르다.

## 인코딩과 분석 결과의 역할

MediaLive, MediaConvert와 통합해 같은 원본을 처리하면서 분석 기능을 적용한다. Elemental Inference의 feed에는 기능별 output을 구성한다. 메타데이터가 생성됐다는 사실과 최종 영상, 자막, 광고 경로에 올바르게 적용됐다는 사실은 따로 확인한다.

| 기능 | 제공하는 정보 | 적용 경계 |
| --- | --- | --- |
| Smart crop | 피사체를 따라 화면을 재구성할 크롭 정보 | 최종 화면에서 피사체와 필요한 그래픽이 보존되는지 확인 |
| Event clipping | 주요 구간을 식별하는 이벤트 메타데이터 | 실제 종목과 콘텐츠에 대한 검출 범위를 확인 |
| Smart subtitles | 음성을 인식한 TTML 자막 | 지원 언어의 전사이며 언어 간 번역 보장과 구분 |
| Contextual metadata | 장면과 샷의 IAB 분류, GARM 등급 | 광고 선택 시스템에 전달할 입력이며 광고 집행 자체가 아님 |

문맥 메타데이터의 서술형 요약은 `summaryGeneration`을 켜야 포함된다. 기본값은 `DISABLED`다. MediaTailor 연동에는 feed 리소스 정책과 MediaTailor Function 구성이 추가로 필요하다.

## 지원 범위와 검수

2026-10-07 공식 기능 설정 문서의 Smart subtitles 언어 목록은 영어, 독일어, 프랑스어, 이탈리아어, 포르투갈어, 스페인어다. 영어 지역 변형도 따로 제공한다. 이 목록으로 한국어 전사나 다국어 번역이 가능하다고 판단하지 않는다.

다음은 운영 적용 시의 평가 기준이다.

- 빠른 장면 전환, 다수 피사체, 점수판과 화면 자막이 있는 대표 영상으로 크롭을 검수한다.
- 하이라이트의 누락과 과검출, 자막의 용어 오류와 타이밍을 각각 확인한다.
- 분석 기능의 지연과 최종 재생 지연을 구분한다. 제품 소개의 지연 수치를 서비스 전체의 보장값으로 쓰지 않는다.
- 기존 작업과 같은 품질 조건으로 인코딩, AI 분석, 저장과 배포를 합친 비용을 비교한다. 인코딩을 공유한다는 사실만으로 총비용 절감률이 정해지지는 않는다.

기능별 설정과 지원 범위를 확인한 문서이며 실제 영상 품질, 지연과 비용은 측정하지 않았다.

## 출처

- [AWS Elemental Inference — AWS](https://aws.amazon.com/elemental-inference/)
- [AWS, Elemental Inference: Configuring each feature](https://docs.aws.amazon.com/elemental-inference/latest/userguide/create-feed-outputs.html)

## 관련 문서

- [[Generative-Video-Editing|생성형 영상 편집]]
- [[CloudFront|영상 배포와 CDN]]
- [[EventBridge|이벤트 기반 후속 처리]]
