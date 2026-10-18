---
tags: [palantir, foundry, governance, privacy]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["민감정보 탐지와 자동 조치 계약"]
---

# 민감정보 탐지와 자동 조치 계약

Sensitive Data Scanner(SDS)는 regex, 기존 column과의 exact-value overlap, LLM 분류를 조건으로 issue 생성, marking 적용과 Cipher obfuscation을 연결한다. 기능 enablement와 권한이 필요하고 내장 조건도 조직별 형식에 맞는지 확인해야 한다.

## 탐지 범위와 비용

Dataset, virtual table과 audio/document/image media set을 선택할 수 있다. Folder include/exclude가 겹치면 더 구체적인 resource 지정이 우선한다. Source-only는 유입 경계의 비용을 줄이고 all-datasets는 derived copy도 검사한다. Virtual table은 스캔 당시 source system이 reachable해야 한다.

Column-name/content 조건은 각각 단독, AND, OR로 조합한다. Content regex threshold는 column cell 중 일치율이며 0 초과 100 이하, 미지정이면 최소 한 cell 일치다. Overlap은 지정 column의 값과 다른 resource cell의 exact match를 찾는다. Regex AIP 생성과 LLM prompt는 올바른 결과의 보증이 아니며 예시와 반례를 검토한다.

Random subset의 row 수는 근사치이며 작은 dataset은 전부 검사한다. 전체 row를 읽어도 선택한 조건의 오류와 모델 오분류는 남을 수 있다. 원문의 전체 스캔 정확성 보장 문구를 모든 민감정보의 탐지 보장으로 확대하지 않는다. LLM 사용량은 각 scanned resource에 귀속한다.

Regex는 column 조건상 일치 가능성이 없으면 content build를 생략해 비용을 줄일 수 있다. 이미 보호된 marking이나 알려진 folder를 제외하면 재검사 범위도 줄지만 이 제외를 coverage로 착각하지 않는다.

## 일정과 결과의 시간 범위

One-time은 현재 선택된 resource를 검사하며 나중에 추가/변경된 데이터는 검사하지 않는다. Recurring 일정은 daily 00:00 UTC, weekly Tuesday 00:00 UTC, monthly 1일 00:00 UTC 또는 continuous이다. Initial scan을 선택하지 않으면 이후 변경 없는 기존 dataset이 검사되지 않을 수 있다.

비활성 scan 생성 후 7일 이내에는 기존 결과에 추가 action을 적용하거나 issue/marking action을 reverse할 수 있다. 추가 action은 그 시점까지 발견한 결과에만 적용되고 재활성화 후 미래 결과에 자동 승계되지 않는다. 반대로 reverse는 과거 결과만 되돌리므로 초기 설정에 남은 action은 다음 실행에서 다시 적용된다.

## Action과 권한

처음에는 No Match Actions로 조건을 검증하면 false positive가 즉시 접근 차단이나 새 output으로 이어지는 일을 줄일 수 있다. Marking은 role과 무관하게 eligibility를 요구하므로 잘못 적용하면 업무를 막는다. 수동 제거된 marking을 다시 적용할지는 별도 옵션이다. Issue도 archived/closed 이전 issue를 다시 만들지 않는 옵션이 있다.

Obfuscation은 scanned resource마다 별도 output dataset을 만든다. 원본을 지우거나 제자리에서 바꾼다는 뜻이 아니다. Cipher Admin License와 source와 같은 Project의 license가 필요하다. 지원 channel은 AES GCM SIV, AES SIV, SHA512와 SHA256이며 visual obfuscation은 지원하지 않는다.

Obfuscation 기본 단위는 entire column이며 entire row, matched cell, matched segment도 선택할 수 있다. SDS에서 되돌릴 수 없고 생성 dataset은 따로 삭제해야 한다.

Space Owner 또는 Data Governance Officer와 Space Viewer 조합이 configure/manage/run/cancel을 할 수 있다. Space Editor/Viewer는 status와 조건/action을 볼 수 있고 Editor의 요청 가능 범위는 Owner 설정에 따른다. SDS가 사용자 권한을 넘어 모든 데이터를 볼 권한을 자동 부여한다고 해석하지 않는다.

## Media 추출과 증분 결과

Media는 OCR/transcription으로 추출한 text를 검사하지만 vision 지원 LLM은 image content를 직접 분류할 수 있다. OCR은 단어 분리, 대소문자와 잘못된 text 추출로 regex 결과를 바꿀 수 있다. Media에는 content-only regex 또는 content 기반 LLM 조건을 쓴다.

같은 media set에서 한 조건에 여러 item이 일치해도 issue는 하나로 집계한다. 화면의 첫 10개 preview가 전체 match 수는 아니다. Recurring은 마지막 성공 이후 추가/변경 item만 증분 검사하며 history의 aggregated condition이 현재 전체 데이터 상태와 같다고 가정하지 않는다. PII 삭제 뒤에는 full re-scan으로 잔존 match를 확인한다. 실제 탐지 정확도나 runtime 권한은 이 문서에서 시험하지 않았다.

## 출처

- [Palantir sensitive-data-scanner, sensitive-data-scanner](https://www.palantir.com/docs/foundry/sensitive-data-scanner)
- [Palantir sensitive-data-scanner, best-practices](https://www.palantir.com/docs/foundry/sensitive-data-scanner/best-practices)
- [Palantir sensitive-data-scanner, core-concepts](https://www.palantir.com/docs/foundry/sensitive-data-scanner/core-concepts)
- [Palantir sensitive-data-scanner, create-a-sensitive-data-scan](https://www.palantir.com/docs/foundry/sensitive-data-scanner/create-a-sensitive-data-scan)
- [Palantir sensitive-data-scanner, create-match-actions](https://www.palantir.com/docs/foundry/sensitive-data-scanner/create-match-actions)
- [Palantir sensitive-data-scanner, create-match-conditions](https://www.palantir.com/docs/foundry/sensitive-data-scanner/create-match-conditions)
- [Palantir sensitive-data-scanner, media-set-scanning](https://www.palantir.com/docs/foundry/sensitive-data-scanner/media-set-scanning)
- [Palantir sensitive-data-scanner, overview](https://www.palantir.com/docs/foundry/sensitive-data-scanner/overview)

## 관련 문서

- [[Palantir-Data-Governance]]
- [[Palantir-Security-Governance]]
