---
tags: [webgpu, wgsl, gpu, typescript]
status: done
verified_at: 2026-10-16
category: "웹&네트워크(Web&Network)"
aliases: ["Cross-runtime WebGPU", "vgpu", "런타임 간 GPU 코드 공유"]
---

# 런타임 간 WebGPU 코드 공유

GPU 라이브러리의 코드 공유는 셰이더, 자원 정의와 연산 흐름을 재사용하면서 초기화와 화면 출력처럼 환경에 묶인 부분을 분리하는 문제다. 같은 API가 모든 GPU와 드라이버에서 같은 성능을 보장하지는 않는다.

## vgpu의 구성

2026-10-16 공식 저장소 설명 기준. TypeScript 기반 vgpu는 브라우저, headless Node.js와 테스트에서 공개 API를 공유한다. 셰이더 효과, 3D 장면, 텐서와 시각화를 대상으로 한다.

- `.wgsl`을 모듈로 가져오고 함수, 구조체와 상수를 공유한다.
- 셰이더 정보로 바인딩과 메모리 배치를 맞춰 수동 선언의 중복을 줄인다.
- `init()`이 만든 `Gpu`를 API에 명시적으로 전달한다. 숨은 전역 컨텍스트보다 자원의 소유 관계를 드러내는 구조다.
- Node용 초기화와 브라우저 화면 연결은 환경별 진입점에서 처리한다.

## 적용 조건

CPU 계산을 GPU로 옮길 때는 입력 전송, 파이프라인 준비와 결과 읽기 비용을 포함해 측정한다. 작은 계산은 전송 비용이 더 클 수 있다. 테스트에서는 수치 오차 허용 범위, 지원 feature와 limit, device loss, 자원 해제를 확인한다. headless 성공을 브라우저 렌더링과 화면 호환성의 증거로 대신하지 않는다.

2026-10-10 제공 발췌의 기능 범위를 공식 README와 대조했다. 설치, 렌더링과 성능 재현은 하지 않았으며, 잘린 프레임/렌더 패스 설명을 추측해 API 계약으로 채우지 않았다.

## 출처

- [vgpu — Vercel Labs](https://github.com/vercel-labs/vgpu)

## 관련 문서

- [[Browser-Main-Thread-Offloading|브라우저 작업 분담]]
- [[GPU-Server-Infrastructure|GPU 메모리와 실행 구조]]
