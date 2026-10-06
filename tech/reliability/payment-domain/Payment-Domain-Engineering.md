---
tags: [payment, pos, reliability]
status: index
category: "Reliability"
aliases: ["결제 도메인 엔지니어링"]
---

# 결제 도메인 엔지니어링

승인 응답, 주문 상태, 환불 결과와 지급 내역을 서로 다른 사실로 관리한다. 특정 공급자의 API 예시는 해당 계약과 기기 조건 안에서 읽는다.

- [[Payment-Entry-Protocols|카드, NFC와 QR의 입력 계약]]
- [[Payment-Tokenisation-and-PCI-Scope|토큰화와 PCI 범위]]
- [[Payment-Unknown-Outcome-and-Reversal|결과 미확인, 재시도와 망취소]]
- [[Machine-Payments-Protocol|MPP 에이전트 결제와 HTTP 재시도 계약]]
- [[POS-Order-and-Discount|POS 주문과 할인 계산]]
- [[POS-Split-Payment-and-Refund|분할 결제와 부분 환불]]
- [[POS-Offline-and-Integration|오프라인 결제와 외부 주문 연동]]

## 관련 문서

- [[Payment-System-Principles]]
- [[Payment-Reconciliation-Worker]]
- [[Payment-Domain|결제의 사업과 계약]]
