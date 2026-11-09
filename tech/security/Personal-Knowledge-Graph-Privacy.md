---
tags: [security, privacy, macos, knowledge-graph, inference, data-lifecycle]
status: done
category: "보안(Security)"
aliases: ["Personal Knowledge Graph Privacy", "개인 지식 그래프 프라이버시", "추론된 개인정보", "Inferred Personal Data", "macOS 개인 지식 그래프", "IntelligencePlatform"]
---

# 기기 안 개인 지식 그래프와 추론 데이터의 프라이버시

기기나 서비스가 연락처, 사진, 일정과 통신 기록 같은 원본을 결합하면 원본 어디에도 적히지 않은 관계, 성향과 점수가 새로 생긴다. 이 추론 데이터는 원본과 따로 저장, 보존, 삭제와 정정을 관리해야 한다. 원본 하나하나보다 결합 결과가 더 민감할 수 있다(해석).

## 본문 없는 메타데이터로도 관계를 추정한다

메시지 본문을 읽지 않아도 누구와, 언제, 어느 앱으로, 어느 방향으로 연락했는지만으로 연락 요일과 시간대 같은 특징을 만들 수 있다. 같은 성, 같은 주소, 사진에 함께 찍힌 빈도처럼 다른 원본의 특징과 합치면 가족이나 친구 관계를 점수로 매길 수 있다. 본문을 수집하지 않는다는 설명을 관계 정보를 다루지 않는다는 뜻으로 읽지 않는다(해석).

## 사례: macOS의 개인 지식 그래프

보안 연구 그룹 The Eighth Rank가 2026-10-28 공개한 역공학 분석을 2026-11-09 대조했다. macOS 26.6.2 기준(도구는 26.7.1에서도 시험, 27.0.1은 일부만)이며 Apple이 확인한 내용이 아니다. 분석자 스스로 일부 클래스와 관계는 구현 여부를 확인하지 못했고, 구현 표시도 추론이라고 적는다.

- **구성:** `knowledgeconstructiond`가 `intelligenceplatformd`와 함께 그래프를 만든다. 분석자는 macOS 13부터 있었다고 보지만 확인되지 않은 주장으로 표시했다. 원천은 연락처, 사진의 얼굴, 일정, 가족 공유(구성원 나이 포함), 메시지와 메일, 위치, 스크린 타임, 의료 ID, Siri 제안, App Intents와 설치된 앱 등이다. 통신 기록에는 상대, 시각, 앱과 방향이 있고 본문은 없다.
- **저장:** `~/Library/IntelligencePlatform` 아래 평문 SQLite 51개가 있고 TCC의 전체 디스크 접근으로 보호된다. 핵심인 `graph.db`는 엔티티 클래스 181개와 관계 278개의 트리플 저장소이며 모든 행에 0~1 신뢰도가 붙는다.
- **관계 분류기:** `EntityTagging_Family`와 `EntityTagging_FamilyAndFriends` 두 CoreML 모델은 특징 144개를 읽는 이진 XGBoost 분류기다. 같은 성, 같은 집 주소, iCloud 가족 구성원 여부, 토요일 밤 사진에 함께 나온 빈도 같은 특징을 쓴다. 점수는 사람마다 가족부터 어머니, 직장 동료까지 17개 관계 열에 매일 다시 계산된다. 모델이 함께 배포된 열은 둘뿐이고 나머지를 채우는 방식은 추적하지 못했다.
- **삭제와 정정:** 지운 행은 신뢰도와 출처를 지닌 채 `expired_stable_graph`로 옮겨진다. 보존 기간은 분명하지 않고(분석자 추정 약 48시간) 훨씬 오래된 기록도 발견됐다. 그래프에서 빠진 두 사람의 점수가 남아 있어 결론이 근거보다 오래 사는 경우도 관찰됐다. 잘못된 추론을 고칠 일반적인 방법은 없다고 적는다.
- **공식 설명:** 분석자가 찾은 Apple의 설명은 데몬 man page의 한 줄(기기의 콘텐츠를 분석해 지식 그래프를 만든다)뿐이다.

## 보호 범위가 권한 하나에 묶인다

Apple 지원 문서는 전체 디스크 접근을 받은 앱이 다른 앱의 데이터(메일, 메시지, Safari, 홈 등), Time Machine 백업과 이 Mac 모든 사용자의 일부 관리 설정을 포함한 모든 파일에 접근할 수 있다고 설명한다. 위 분석이 맞다면 이 권한을 받은 앱은 추론된 관계 점수도 평문으로 읽을 수 있다(해석). 권한 하나가 원본 데이터와 추론 데이터의 접근을 함께 여닫는 구조다.

## 추론 기능을 만드는 쪽의 점검

아래는 위 사례에서 도출한 설계 점검 제안이다.

- 무엇을 어떤 특징으로 추론하는지 목록을 남기고, 추론 결과를 원본과 다른 데이터 분류로 관리한다.
- 원본 삭제가 파생 점수, 캐시와 만료 테이블까지 전파되는지 시험하고, 결론이 근거보다 오래 남지 않게 보존 기한을 둔다.
- 사용자가 추론 결과를 보고 고치거나 지울 경로를 둔다. 열람과 삭제 요청 처리는 [[Privacy-Operations-for-Small-Business#열람이나 삭제 요청을 받으면 어떻게 하는가|권리 요청 처리]], 보관과 파기는 [[Privacy-Operations-for-Small-Business#탈퇴하거나 계약이 끝나면 언제 지우는가|보관과 파기]], EU 대상 처리의 권리별 예외는 [[GDPR-Scope-and-Data-Subject-Rights|GDPR 적용 범위와 정보주체 권리]]를 따른다.
- 저장 데이터 보호를 운영체제의 접근 권한 하나에만 맡기지 않고, 암호화와 읽는 주체의 최소화를 함께 검토한다.

## 사용자와 관리자의 점검

- 시스템 설정의 개인정보 보호 및 보안에서 전체 디스크 접근을 받은 앱 목록을 주기적으로 검토하고 필요 없는 앱은 뺀다. 터미널 같은 개발 도구에 이 권한을 줬다면 그 안에서 실행하는 도구까지 영향 범위에 드는지 확인한다(운영 제안).
- 분석 그룹은 자기 Mac의 그래프를 읽기 전용으로 보여 주는 로컬 웹 앱 iKnow를 공개했다. README는 Python 표준 라이브러리 서버, 127.0.0.1 바인딩, 실행마다 바뀌는 토큰, 읽기 전용 데이터베이스 연결을 적는다. 제3자 도구이므로 코드를 읽은 뒤 실행한다(운영 제안). README는 서버를 띄우는 앱(터미널이나 편집기)에 전체 디스크 접근을 주라고 하고, 그 권한이 iKnow뿐 아니라 그 앱에서 실행하는 모든 것에 미치므로 다 쓰면 다시 끄라고 적는다. 직접 실행하지는 않았다.

## 출처

- [Anatomy of Apple's Personal Knowledge Graph — The Eighth Rank](https://8rank.ai/game/apple-intelligence-personal-knowledge-graph) — 2026-10-28 공개 역공학 분석, 2026-11-09 대조. macOS 26.6.2 기준, Apple 확인 없음
- [iKnow — GitHub, 8rank](https://github.com/8rank/iKnow) — 2026-11-09 README의 실행 방식과 읽기 전용 설계 확인
- [Apple Support, Change Privacy & Security settings on Mac](https://support.apple.com/guide/mac-help/change-privacy-security-settings-on-mac-mchl211c911f/mac) — 2026-11-09 전체 디스크 접근의 범위 확인

## 관련 문서

- [[Synthetic-Data-Privacy|합성 데이터와 개인정보 보호]]
- [[Privacy-Operations-for-Small-Business|대표의 개인정보 운영]]
- [[GDPR-Scope-and-Data-Subject-Rights|GDPR 적용 범위와 정보주체 권리]]
- [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프]] — 트리플과 행별 신뢰도를 쓰는 그래프 구조
