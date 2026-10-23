---
tags: [security, saas, oauth, supply-chain, incident-response]
status: done
verified_at: 2026-10-24
category: "보안(Security)"
aliases: ["SaaS Application Trust Compromise", "SaaS 앱 신뢰와 자격증명 침해"]
---

# SaaS 앱 신뢰와 자격증명 침해

외부 앱의 자격증명을 탈취하면 기존 권한으로 고객 환경에 접근할 수 있다. 대화형 로그인 없는 접근도 조사한다.

## 인증 성공과 데이터 유출을 나눈다

Microsoft의 2026-10-21 ConnectWise 조사에서는 탈취한 앱 자격증명으로 접근한 뒤 Graph 정찰, 자격증명과 권한 변경을 시도했다. 앱 존재나 인증 성공만으로 데이터 유출을 확정하지 않는다.

AI의 자동화 기여와 침해 원인은 구분한다. Microsoft 자체 제품의 취약점으로 발생한 사건은 아니다.

## 서로 다른 공격 집계는 합치지 않는다

- 2,250곳 이상은 앱 자격증명 관련 후속 로그인 시도의 대상 테넌트 수다.
- 분당 약 2,900건은 별도 password spraying의 로그인 실패 정점이다. 해당 관측에서는 인증 성공이 없었다.

대상 수, 실패 빈도와 실제 침해를 혼합하지 않는다.

## 차단과 증거 보존을 함께 한다

해당 사건의 공식 지침이다. 다른 사고에는 공급자의 안내와 영향 범위를 다시 확인한다.

1. 영향받는 연결은 공식 복구 안내까지 비활성화한다. enterprise application부터 삭제하지 않는다.
2. 앱 표시명보다 application ID로 현재와 과거 설치 테넌트를 조사한다.
3. 서비스 주체의 로그인, Graph 활동, 권한과 자격증명 변경을 연결해 확인한다.
4. 앱 차단 뒤에도 추가된 자격증명과 권한이 남았는지 조사한다.
5. 로그와 설정을 보존하되 긴급 차단을 미루지 않는다.

## 출처

- [AI-driven, large-scale nation-state campaign using ARTEX enables supply chain compromise — Microsoft Security](https://www.microsoft.com/en-us/security/blog/2026/10/21/storm-0940-uses-artex-agentic-ai-connectwise-supply-chain-compromise/) — 2026-10-21 조사와 대응 안내, 2026-10-24 대조

## 관련 문서

- [[Supply-Chain-Security|공급망 보안]] — 패키지와 빌드 경로의 침해
- [[API-Key-Exposure|API 연동 키 노출]] — 키와 권한 범위
- [[Security-Incident-Response|보안 사고 대응]] — 증거 보존과 복구
