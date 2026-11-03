---
tags: [hardware, display, oled, repair]
status: done
verified_at: 2026-11-02
category: "CS - 기초"
aliases: ["디스플레이 사양과 수리 근거 읽기"]
---

# 디스플레이 사양과 수리 근거 읽기

디스플레이 구매와 수리 판단에는 성능 수치의 측정 조건, 입력 기능의 지원 범위, 결함에 대한 서비스 조건을 나누어 확인해야 한다.

## 사양표의 서로 다른 축

| 항목 | 확인할 조건 |
|---|---|
| 밝기 | peak와 지속 밝기, 전체 화면과 일부 영역, HDR와 SDR |
| 색역 | 지원 색 공간과 실제 색 정확도, 보정 상태 |
| 주사율 | 최저와 최고 주사율, 콘텐츠에 따른 가변 동작 |
| 터치 | 패널 센서 지원과 앱의 제스처 처리, 클릭 변환의 한계 |
| 폴더블 구조 | 경첩과 패널의 기계적 내구성, 사용 환경과 수리 조건 |

2026-10-28 Apple 발표의 PROLED XDR MacBook Pro는 탠덤 OLED, 최대 2000니트 HDR/SDR peak, 10,000,000:1 명암비, 10~120Hz 가변 주사율과 P3/Adobe RGB 지원을 제시한다. 14/16인치, M5 Pro/Max, 최대 128GB 통합 메모리와 16TB 저장장치는 선택 가능한 구성의 상한이다. 이 숫자들을 모든 구성의 기본 사양이나 독립 실측 결과로 읽지 않는다. 터치 지원도 앱별 입력 경험 검증을 대신하지 않는다.

## 결함 보고와 교체 조건

결함 보고의 수, 제조사의 문제 인지, 유상 보증 가입 여부, 실제 교체 대상은 다른 정보다. 증상과 구입 지역, 제품 식별, 점검 결과를 공식 지원 창구에서 대조해야 한다. 일부 사례를 전체 제품의 결함률로 계산하거나 상담 안내를 무조건적인 교체 보증으로 확대하지 않는다.

제공된 2026-10-28 GeekNews 발췌는 iPhone Duo 내부 화면의 경첩 중앙 균열과 AppleCare+ 없이 AppleCare에 교체 문의할 수 있다는 안내를 담고 있다. 이 발췌의 개별 서비스 자격과 지역별 조건은 공식 서비스 정책으로 확인하지 못했다. 통신사 구매라도 AppleCare에 연락한다는 안내, 실제 사례와 AI 생성 허위 보고가 섞였다는 내용도 해당 발췌의 주장으로 보존한다. 후속 확인은 Apple의 증상별 서비스 공지와 실제 접수 조건이다.

## 출처

- [Apple, MacBook Pro with PROLED XDR Display 발표](https://www.apple.com/newsroom/2026/10/apple-unveils-groundbreaking-macbook-pro-with-proled-xdr-display/) — 2026-11-02 발표 사양 대조
- GeekNews 제공 발췌, 2026-10-28 iPhone Duo 내부 화면 교체 안내, 2026-10-29 PROLED XDR MacBook Pro — 수리 자격은 미확인

## 관련 문서

- [[CS-Computer-Architecture|컴퓨터 구조]]
- [[Foldable-Web-Layout|폴더블 화면과 웹 레이아웃]]
