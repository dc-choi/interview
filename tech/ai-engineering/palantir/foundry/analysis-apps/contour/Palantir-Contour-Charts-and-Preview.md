---
tags: [palantir, foundry, contour]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 차트의 계산 범위와 미리보기 한계

Table board는 기본 첫 1,000행을 미리 보여준다. 컬럼 표시/순서 변경은 원본 schema 변경과 다르다. Histogram/summary와 전후 행 수를 함께 확인하되 preview만으로 전체 정확성을 증명하지 않는다.

Histogram은 기본 10개, 한 번에 최대 50개를 표시하고 큰 집합의 정렬은 상위 1,000 aggregate에 한정될 수 있다. Time series는 전체를 집계하되 표시 결과를 제한한다. Chart는 기본 1,000점 제한에 맞춰 numeric/date/time bucket을 더 크게 조정한다. 표시 해상도 변경과 원천 행 제외는 다르다.

Pivot preview는 일부 행/열만 포함할 수 있으며 preview 정렬은 전체 정렬이 아니다. `Switch to pivoted data`를 사용하면 downstream이 전체 집계 결과를 읽는다. Grand total은 원천 전체에 aggregate를 다시 적용한 값이며 평균의 합이나 distinct count의 합이 아니다. Pivot 전환 결과에는 grand total 행/열이 포함되지 않는다. Case-insensitive로 같은 값이나 comma가 있는 column aggregate는 생성 schema 문제를 낼 수 있다.

Chart overlay는 시각화 전용이며 다른 dataset을 얹어도 join하지 않는다. Overlay의 선택은 downstream을 필터하지 않는다. Main layer 선택과 실제 join을 구분한다. 표시 단위/색/정렬은 계산된 값 자체를 바꾸지 않는다. Line의 연결 순서가 시간이어야 하면 별도 series sort를 지정한다.

Sort board는 분석 전체를 정렬하지만 saved dataset의 순서를 보장하지 않으며 후속 join/dedup/aggregate에서 순서가 바뀔 수 있다. Approximate median은 percentile_approx 기반이다.

## 변환과 정보 보호

Obfuscate의 SHA-1 치환을 안전한 익명화나 compliance 보장으로 쓰지 않는다. 원문의 decrypt 표현은 부정확하며 hash는 암호화가 아니다. K-anonymize에서 기준 미달 행을 Keep하면 결과가 k-anonymized됐다고 볼 수 없다. Drop은 행 손실, Redact는 값 손실을 만들므로 전후 수를 검증한다. Mask/버킷화/치환의 순서도 결과에 영향을 준다.

## 출처

- [Palantir, analysis-switch-aggregated](https://www.palantir.com/docs/foundry/contour/analysis-switch-aggregated)
- [Palantir, boards-descriptions](https://www.palantir.com/docs/foundry/contour/boards-descriptions)
- [Palantir, boards-verify-results](https://www.palantir.com/docs/foundry/contour/boards-verify-results)
- [Palantir, getting-started](https://www.palantir.com/docs/foundry/contour/getting-started)

## 관련 문서

- [[Palantir-Contour]]
- [[Palantir-Pipeline-Builder]]
