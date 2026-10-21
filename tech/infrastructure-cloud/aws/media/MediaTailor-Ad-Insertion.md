---
tags: [aws, mediatailor, video, ssai, prefetch]
status: done
verified_at: 2026-10-22
category: "Infrastructure - AWS"
aliases: ["MediaTailor Ad Insertion", "MediaTailor 광고 삽입"]
---

# MediaTailor 광고 삽입

서버 측 광고 삽입(SSAI)은 개인화된 manifest에 광고를 연결해 플레이어가 콘텐츠와 광고를 재생하게 하는 방식이다. MediaTailor는 HLS와 DASH의 라이브 및 VOD 광고 삽입을 지원한다. MediaPackage를 origin으로 사용해 패키징한 콘텐츠와 광고 마커를 전달할 수 있다.

## 역할과 데이터 흐름

광고 결정 서버(ADS)는 광고 선택을 담당한다. MediaTailor는 origin manifest와 광고 응답을 바탕으로 시청 세션에 전달할 manifest를 구성한다. 라이브 광고 교체에서는 ADS의 VAST 응답에 들어 있는 광고 중 구간 길이에 맞는 소재를 선택한다.

SSAI는 광고가 이어진 manifest를 반환하고, SGAI(server-guided ad insertion)는 플레이어가 광고를 별도 playlist로 요청하도록 안내한다. 이 전달 방식과 광고를 기존 구간에 대체할지 새로 삽입할지는 서로 다른 구분이다.

2024년 스마트 TV 도입 사례는 클라이언트별 광고 재생 제약을 서버 측 구성으로 옮기는 계기를 보여준다. 이를 모든 TV에서 클라이언트 광고가 불가능하거나 서버 삽입만으로 재생 문제가 사라진다는 보장으로 확대하지 않는다.

## 라이브 광고 구간의 종료

2026-10-22 문서 기준 라이브는 기존 콘텐츠 구간을 광고로 교체한다. 각 `CUE-OUT`에는 duration 또는 대응하는 `CUE-IN`이 필요하다. duration이 있으면 그 길이에 맞는 광고를 선택하고, 종료 마커를 만나거나 지정 길이가 끝나면 원래 콘텐츠로 돌아간다. 종료 마커에 따라 재생 중인 광고가 짧아질 수 있다.

광고가 부족하면 설정된 slate를 재생하거나 원래 콘텐츠로 돌아간다. 예를 들어 30초 구간에 제공된 가장 짧은 광고가 40초라면 해당 광고를 재생하지 않는다. slate 설정과 실제 광고 길이를 함께 확인한다.

과거 사례에서 관찰한 조기 종료 후 지연 누적을 현재의 모든 광고 종료 동작으로 일반화하지 않는다. 검증 시에는 origin의 마커, manifest의 구간 길이와 플레이어의 실제 재생 위치를 함께 수집한다.

## Prefetch의 retrieval과 consumption

Prefetch는 광고 구간 전에 ADS에 질의하고 소재를 준비해 시작 시점의 부하와 지연을 줄이는 기능이다. 현재 문서에서는 라이브 SSAI용이며 SGAI에는 적용되지 않는다.

- **Retrieval**: 미리 광고를 가져오는 시간 구간이다. traffic shaping으로 ADS 요청을 분산할 수 있다.
- **Consumption**: 준비한 광고를 사용할 구간이다. single schedule에서 매칭 조건이 없으면 이 시간 안의 첫 광고 구간에 사용한다. 조건을 두면 retrieval의 동적 변수와 비교해 처음 일치하는 구간에 사용한다.
- **매칭 실패**: 준비한 광고를 아무 구간에 강제로 넣지 않고 일반 광고 삽입 동작으로 돌아간다.

시각이 정해진 광고에는 single schedule, 불규칙한 이벤트에는 recurring schedule을 검토한다. recurring은 매 광고 구간 뒤 다음 구간용 광고를 준비하지만 single보다 시각을 세밀하게 통제하기 어렵다.

## 운영 점검 제안

1. ADS 요청 성공, 소재 준비, manifest 반영과 실제 재생을 각각 측정한다.
2. 예상 길이보다 긴 소재, 광고 부족, 늦은 응답과 조기 종료 마커를 시험한다.
3. 서로 다른 시청 세션의 개인화 manifest가 섞이지 않는지 확인한다. segment 캐시는 [[CloudFront|CloudFront]]의 개인화 광고 캐시 기준과 함께 본다.
4. 광고가 잘 나오는지와 시청 추적이 제대로 기록되는지를 별도 확인한다. SSAI 도입만으로 추적 정확도나 모든 기기의 무중단 재생을 보장하지 않는다.

검증 범위는 2026-10-22 공식 문서 대조다. 실제 광고 서버, 플레이어와 라이브 스트림을 구성해 시험하지 않았다.

## 출처

- [AWS, What is AWS Elemental MediaTailor?](https://docs.aws.amazon.com/mediatailor/latest/ug/what-is.html)
- [AWS, Understanding AWS Elemental MediaTailor ad insertion behavior](https://docs.aws.amazon.com/mediatailor/latest/ug/ad-behavior.html)
- [AWS, Prefetching ads](https://docs.aws.amazon.com/mediatailor/latest/ug/prefetching-ads.html)
- [AWS, How prefetching works](https://docs.aws.amazon.com/mediatailor/latest/ug/understanding-prefetching.html)
- [클라우드로 진화하는 스마트 TV 광고 - 티빙의 AWS Elemental 서비스 활용기 — AWS Korea](https://www.youtube.com/watch?v=_CNC0l31Z_s) — AWS Industry Week 2024 발표, 2025-01-10 공개

## 관련 문서

- [[AWS-Media-Services|AWS 미디어 서비스]]
- [[CloudFront|CloudFront]]
- [[Elemental-Inference|Elemental Inference]]
- [[Media-Event-Traffic|미디어 공개와 중계 이벤트 트래픽]]
