---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update bandwidth와 MAU 추정"]
---

# EAS Update bandwidth와 MAU 추정

과금 MAU 하나는 billing cycle 중 update를 한 번 이상 받은 고유 installation 하나다. 매일 download해도 같은 installation은1, download가 없으면0, reinstall 후 각각 받으면2다. 같은 device의 서로 다른 앱도 별도 installation이다. 사람 수나 login 사용자 수와 다르다.

## 전송량 모델

전송량은 device에 없는 JS/assets와 실제 압축 크기, patch 제공 여부, 받은 installation 수에 따라 달라진다. 각 plan의 기본 bandwidth와 초과 MAU당 추가 allocation을 사용하며 원문 현재 예시는 초과 MAU당40MiB다. plan 가격/포함량은 변경될 수 있어 계산 전에 현재 계약을 확인한다.

```text
가용량 = 기본 allocation + 초과 MAU × 추가 MiB/MAU
예상 download 횟수 = 가용량 / 평균 실제 download MiB
```

원문 예시는1TiB+10,000×40MiB=1,448,576MiB이며 평균3.85MiB면 약376,254회다. 이는60,000명이 모두 매번 받는 보장이 아니다. 원문의50,0000 MAU는 문맥상50,000 오기이고 MB/MiB 혼용과2.6배 압축률은 일반 고정값으로 사용하지 않는다.

## 실제 full bundle와 patch 크기

expo export 후 dist/_expo/static/js/{android,ios}의 .hbc 크기를 각각 본다. Brotli/gzip 파일로 실제 압축을 추정한다.

```sh
brotli -5 -k bundle.hbc
gzip -9 -k bundle.hbc
bsdiff old.hbc new.hbc patch.bin
```

bsdiff의 old/new는 사용자가 실행한 정확한 base와 새 bundle이다. patch 자체는 이미 압축되어 있으므로 다시 같은 compression ratio를 나누지 않는다. 다양한 변경에서 크기를 비교하고 generation 지연, 다른 base, fresh install/embedded opt-in 때문에 full bundle을 받는 비중도 포함한다.

## 운영에서의 오차

사용자는 앱을 다시 열 때 중간 update를 건너뛸 수 있고 신규 fonts/images도 전송량에 더해진다. 실제 usage를 먼저 관찰하고 bundle/image 최적화, 자주 새 binary 배포, 검증한 asset selection을 순서에 맞게 적용한다. 이 문서화에서 export/압축/실제 과금 측정을 수행한 것은 아니다.

## 출처

- [Expo Documentation, Estimate bandwidth usage](https://docs.expo.dev/eas-update/estimate-bandwidth)

## 관련 문서

- [[Expo-EAS-Update-Assets]]
- [[Expo-EAS-Update-Bundle-Diffs]]
