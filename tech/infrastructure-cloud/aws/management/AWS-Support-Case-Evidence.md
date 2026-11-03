---
tags: [aws, support, incident, troubleshooting]
status: done
verified_at: 2026-11-04
category: "Infrastructure - AWS"
aliases: ["AWS Support Case Evidence", "AWS 기술 지원 케이스 작성"]
---

# AWS 기술 지원 케이스의 범위와 증거

지원 케이스는 문제가 발생한 환경과 업무 영향을 다른 조사자가 따라갈 수 있게 전달하는 기록이다. 증상, 가설, 이미 수행한 조치를 구분하고 재현과 로그 조회에 필요한 단서를 제공한다.

## 케이스 종류와 심각도

2026-11-04 AWS Support User Guide 기준, 계정과 결제 문의, 서비스 한도 증가 요청, 기술 지원 케이스는 구분된다. Basic Support에서는 기술 지원 케이스를 만들 수 없다. 실제 기술 지원과 연락 수단의 이용 조건은 가입 플랜에서 확인한다.

심각도는 문의자의 불안이나 에러 문구보다 업무 영향과 우회 가능성을 기준으로 고른다. 개발 질문, 중요하지 않은 기능의 이상, 운영 중요 기능의 저하, 운영 중단을 구분한다. 가장 높은 심각도를 일반적인 질문에 일괄 적용하지 않는다.

응답 시간 표는 **최초 응답**의 기준이다. AWS는 표시한 시간 안에 응답하기 위해 합리적인 노력을 한다고 설명한다. 이를 문제 해결 완료 시각이나 복구 보장으로 바꾸지 않는다. 플랜별 수치와 조건은 요청 시점의 공식 표를 확인한다.

## 조사자가 필요한 정보

아래는 공식 작성 지침을 재구성한 점검표다. 실제 계정과 로그는 승인된 지원 채널에만 제공하고 공개 문서에는 넣지 않는다.

| 항목 | 남길 내용 |
|---|---|
| 영향 | 실패한 기능, 영향받는 사용자 범위, 운영/개발 환경, 가능한 우회 방법 |
| 시간 | 최초 발생과 지속 구간, 날짜, 시각과 시간대 |
| 위치 | 올바른 AWS 계정, 리전, 필요하면 AZ, 정확한 리소스 ID |
| 재현 | 실행 환경, 요청이나 명령, 기대 결과와 실제 결과 |
| 증거 | 관련 로그와 지표, 오류 메시지, 요청 식별자 등 조사 단서 |
| 시도한 조치 | 변경 내용, 수행 시각, 각 조치 뒤 관측한 결과 |

지원팀이 알아서 모든 내부 로그를 볼 것이라고 가정하지 않는다. 필요한 로그와 재현 결과를 준비하되, 확인한 증상과 추정 원인을 나누어 적는다.

## 사건 단위로 묶고 진행 상황을 남긴다

AWS의 Enterprise Support 모범 사례는 사건이나 이슈 하나당 케이스 하나를 제출하고 올바른 계정에서 요청하도록 한다. 관련 없는 문제를 한 케이스에 계속 덧붙이지 않는다. 여러 계정에 걸친 장애는 관련 계정과 연결 구간을 밝히고 실제 지원 권한과 범위를 확인한다.

Enterprise Support의 운영 중단 지침은 Chat 또는 Phone을 사용하고 조직에서 함께 대응할 사람이 있도록 한다. 실시간 대화 뒤에도 수행한 조치와 결과를 지원 케이스에 기록한다. Health Dashboard는 확인하되 게시 지연이 있을 수 있으므로, 표시가 없다는 이유만으로 장애를 배제하지 않는다.

## 첨부 자료와 완료 판단

AWS Support API 문서는 secret key, private key와 카드 정보가 지원에 필요하지 않다고 명시한다. 자동 가림 기능의 존재를 원본 전체를 보내도 된다는 허가로 해석하지 않는다. 제출 전에 비밀번호, 토큰, 서명 URL과 개인정보가 로그나 화면에 섞였는지 확인한다. 로그의 가림 방법은 [[PII-Masking|PII 마스킹]]을 따른다.

운영 적용 제안: 답변 수신, 조치 실행, 사용자 기능 복구를 따로 확인한다. 조치 뒤 같은 요청의 성공 여부와 영향 구간의 지표를 다시 보고, 남은 증상과 후속 작업을 기록한다. 이 문서는 공식 지침을 대조한 작성 기준이며 실제 지원 케이스를 제출하거나 응답 시간을 측정한 기록은 아니다.

## 출처

- [AWS Support, Case management](https://docs.aws.amazon.com/awssupport/latest/user/case-management.html) — 케이스 유형, 심각도와 최초 응답의 의미
- [AWS Support, Create a support case from a support interaction](https://docs.aws.amazon.com/awssupport/latest/user/create-support-case-from-interaction.html) — 증거 항목, 사건 단위 케이스와 Enterprise Support 운영 중단 대응
- [AWS CLI Command Reference, add-communication-to-case](https://docs.aws.amazon.com/cli/latest/reference/support/add-communication-to-case.html) — 지원에 필요하지 않은 비밀값과 자동 가림의 범위
- [AWS Support User Guide](https://docs.aws.amazon.com/pdfs/awssupport/latest/user/support-ug.pdf) — 케이스 작성 화면의 자격 증명, 카드, 서명 URL과 개인정보 공유 금지 안내

## 관련 문서

- [[Incident-Runbook|장애 대응 런북]]
- [[Audit-Log|감사 로그]]
- [[PII-Masking|PII 마스킹]]
- [[AWS서비스(AWSServices)|AWS 서비스 인덱스]]
