---
tags: [web, network, wifi, wireless, sensing, csi, privacy, security]
status: done
verified_at: 2026-10-12
category: "웹&네트워크(Web&Network)"
aliases: ["WiFi Sensing", "Wi-Fi 센싱", "WLAN Sensing", "와이파이 센싱", "CSI", "Channel State Information", "채널 상태 정보", "IEEE 802.11bf", "DensePose From WiFi"]
---

# Wi-Fi 센싱: CSI로 사람의 존재와 동작을 추정하는 원리와 한계

Wi-Fi 센싱은 무선 신호가 사람의 몸에 반사되고 가려지며 달라지는 채널 변화를 수신기가 측정해 사람의 존재, 움직임과 자세를 추정하는 기술이다. 패킷에 담긴 통신 내용을 읽는 [[Packet-Capture-and-Wireshark|패킷 캡처]]와 달리, 신호가 공간을 지나며 겪은 변화를 읽는다. 아래 내용은 2026-10-12에 Espressif 문서, IEEE SA 표준 페이지, 원 논문과 공개 저장소를 대조한 기준이다.

한 줄 요약: **CSI는 사람이 움직이면 변하는 채널 측정값이고, 그 변화를 동작으로 바꾸는 모델은 학습한 공간과 사람을 벗어나면 크게 약해진다. 카메라가 없다는 사실이 감시할 수 없다는 뜻은 아니다.**

## 동작 원리: 채널 상태 정보(CSI)

무선 신호는 벽, 가구와 사람에 반사돼 여러 경로로 수신기에 도착한다. 사람이 움직이면 이 경로가 바뀌고 수신기가 측정하는 채널도 달라진다.

- **정의**: CSI(Channel State Information)는 Wi-Fi 연결의 채널 정보다. ESP32-S3 기준으로 서브캐리어별 채널 주파수 응답으로 이뤄지고, 수신기가 송신기의 패킷을 받을 때 추정한다. 추정에는 프레임의 학습 필드(LLTF, HT-LTF, STBC-HT-LTF)를 쓴다.
- **값의 형태**: ESP32-S3는 서브캐리어마다 허수부와 실수부를 부호 있는 바이트 두 개로 기록한다. 진폭과 위상은 이 복소값에서 계산한다. 예를 들어 DensePose From WiFi 논문은 실수부를 a, 허수부를 b라 할 때 진폭을 √(a²+b²), 위상을 arctan(b/a)로 구한다.
- **크기**: ESP32-S3에서 20MHz non-HT LLTF는 64개 서브캐리어 × 2바이트로 128바이트이고, 가장 큰 HT40 STBC는 612바이트다. 하드웨어 제약으로 앞 4바이트가 무효일 수 있다(`first_word_invalid`).
- **얻는 방법**: ESP-IDF에서는 `CONFIG_ESP_WIFI_CSI_ENABLED`를 켜고 `esp_wifi_set_csi_rx_cb`로 콜백을 등록한 다음, `esp_wifi_set_csi_config`로 설정하고 `esp_wifi_set_csi`로 활성화하면 수신 CSI가 콜백으로 전달된다. 연구용 NIC의 Linux 802.11n CSI Tool(Intel 5300)은 송수신 안테나 쌍마다 30개 서브캐리어 그룹의 이득과 위상을 낸다.

## 카메라를 교사로 쓰는 학습

CSI 값은 사람의 자세와 직접 대응되지 않는다. 그래서 같은 시각의 카메라 영상에서 얻은 자세를 정답으로 삼아 CSI만 보는 모델을 학습하고, 학습이 끝나면 카메라 없이 추론한다.

- **DensePose From WiFi(CMU, 2022-12 arXiv)**: 이미지 기반 DensePose-RCNN을 교사 네트워크로 먼저 학습하고, 타임스탬프로 CSI와 영상 프레임을 맞춘 뒤 Wi-Fi 신호의 진폭과 위상을 사람 몸 24개 영역의 UV 좌표로 매핑했다. 수동 주석은 없다. 송신 안테나 3개와 수신 안테나 3개에서 2.4GHz 대역 30개 서브캐리어를 100Hz로 샘플링한 선행 연구의 데이터를 재사용했고, 안테나 3개짜리 공유기라면 두 대로 구성할 수 있다는 예로 TP-Link AC1750을 든다.
- **브라우저 교사**: MediaPipe Pose Landmarker는 웹과 JavaScript 앱에서 쓸 수 있고 자세당 33개 랜드마크를 낸다. 공개 키트 wifi-sensing-kit은 브라우저의 MediaPipe 결과를 손으로 쓴 규칙으로 동작 이름으로 바꿔 라벨로 쓰는데, 녹화 한 세션에서 이 규칙이 맞힌 비율은 77%였다. 교사 라벨이 틀리면 그 오류가 학생 모델이 배우는 정답에도 그대로 들어간다.

## 정확도 주장을 읽는 법

같은 공간과 같은 사람에서 뽑은 평가 수치는 새 공간에 설치했을 때의 성능이 아니다.

- **배치가 바뀌면 성능이 떨어진다**: 16개 공간 배치와 8명의 데이터에서 같은 배치를 무작위 80:20으로 나눴을 때 DensePose From WiFi의 AP는 43.5였고, 학습하지 않은 배치에서는 27.3으로 떨어졌다. 논문은 학습하지 않은 배치, 학습 데이터에 드문 자세, 동시에 3명 이상인 경우를 어려운 문제로 든다.
- **평가 설정을 구분한다**: MM-Fi(NeurIPS 2023 Datasets and Benchmarks)는 40명, 4개 환경(환경당 10명), 27개 동작에 RGB, 깊이, LiDAR, mmWave, Wi-Fi CSI를 함께 기록했다. 평가는 무작위 분할(S1), 교차 피험자(S2, 32명 학습과 8명 평가), 교차 환경(S3, 3개 환경 학습과 1개 평가)으로 나뉜다. Wi-Fi만 쓴 자세 추정 오차(MPJPE)는 일상 동작 14개 프로토콜(P1) 기준 S1 186.9mm, S2 222.3mm, S3 367.8mm였고, 27개 동작 전체(P3)에서도 197.1mm, 231.1mm, 369.5mm로 교차 환경에서 가장 컸다. 공식 로더의 무작위 분할은 (피험자, 동작) 시퀀스 단위라 같은 피험자와 환경이 학습과 평가에 함께 나타난다.
- **지표를 맞춘다**: 공개 프로젝트 RuView(MIT)는 MM-Fi에서 torso-PCK@20 82.69%를 내세운다. 분류 정확도가 아니라 관절 위치 지표이고 MM-Fi random_split 기준이다. 저장소의 벤치마크 문서는 이 수치가 시간과 피험자 인접성으로 부풀려진 도메인 내부 값이며 일부 누수가 있다고 밝히고, 교차 환경 zero-shot을 약 10%로 적는다. 배치할 방에서 피험자당 라벨 50개로 보정하면 약 70%라고 적어, 설치 공간마다 보정이 필요하다는 점도 드러난다.
- **데모와 추론을 구분한다**: RuView의 이중 모달 데모에서는 웹캠이 정답 자세를 주고, 데모 모드에서는 감지한 움직임에 맞춘 합성 CSI를 만든다. 관리자는 이슈에서 UI에 보이는 3D 스켈레톤이 모델이 없을 때는 신호 휴리스틱으로 움직이며 실제 자세 복원이 아니라고 밝혔다.
- **소규모 실험의 범위**: ESP32-S3 보드 3대와 브라우저 교사, k-NN(k=7)으로 8개 동작을 구분한 wifi-sensing-kit은 한 사람, 한 방, 한나절 실험에서 79.5%(무작위 추측 12.5%)를 보고한다. 평가도 카메라 판정을 기준으로 하므로 이 값은 카메라 라벨과의 일치율이다. 보드나 공유기, 큰 가구를 옮기거나 사람이 늘면 다시 학습해야 한다고 밝힌다.

정확도 주장을 볼 때는 지표(분류 정확도, PCK, MPJPE), 분할 방식(무작위, 교차 피험자, 교차 환경), 정답 라벨의 출처, 실제 장비 측정인지 시뮬레이션인지를 먼저 확인한다.

## 표준화: IEEE 802.11bf

- IEEE 802.11bf-2025(Amendment 4: Enhancements for Wireless LAN Sensing)는 2025-05-28 승인, 2025-09-26 발행된 현행 표준이다. MAC, HE와 EHT PHY 서비스 인터페이스, DMG와 EDMG PHY를 고쳐 1GHz~7.125GHz와 45GHz 이상의 비면허 대역에서 WLAN 센싱 동작을 강화하는 범위다.
- 표준이 발행됐다는 사실만으로 특정 공유기나 칩이 센싱을 지원한다고 보지 않는다. 제품 지원은 제조사 문서로 따로 확인한다.
- IEEE SA의 802.11bf 항목과 TGbf 진행 현황 페이지에는 프라이버시와 보안 언급이 없고, 표준 본문은 확인하지 못했다. TGbf 참여자들이 쓴 2022년 개요 논문은 보안과 프라이버시를 후보 기능으로 다루며 센싱 보고와 센싱 신호의 엿듣기를 위협으로 들었지만, 당시에는 요구사항을 논의하는 중이었다.

## 프라이버시와 보안

- **벽 너머 감지**: MIT의 Wi-Vi(SIGCOMM 2013)는 MIMO 간섭 제거(interference nulling)로 Wi-Fi 신호를 이용해 벽과 닫힌 문 뒤의 움직임을 감지했다. 6인치 중공벽으로 막힌 닫힌 방에서 피험자 8명으로 80회 시험해 움직이는 0~3명을 판별한 정확도는 각각 100%, 100%, 85%, 90%였고, 8인치보다 두꺼운 콘크리트 벽 뒤는 감지할 수 없다고 밝혔다. 논문은 이 기술이 사용자 프라이버시와 Wi-Fi 신호 사용 규제 문제를 제기한다고 적었다.
- **프라이버시 보호라는 소개의 범위**: DensePose From WiFi는 비공개 공간에 두면 우려를 낳는 카메라, 레이더와 LiDAR에 견줘 Wi-Fi를 프라이버시 보호형 센싱으로 소개한다. 영상이 남지 않는다는 장점과 사람의 존재와 움직임을 관찰할 수 있다는 위험은 함께 성립한다.
- **운영 점검(제안)**: 존재 감지 결과만으로도 재실, 외출과 취침 같은 생활 패턴이 드러날 수 있다. 센싱 데이터를 다루는 서비스라면 처리 근거, 보관 기간과 공간 이용자에 대한 고지를 정하고, 카메라 교사를 쓰는 학습 단계에서는 영상이 기기 밖으로 나가는지 확인한다.

## 트레이드오프

| 장점 | 한계 |
|---|---|
| 카메라 없이 존재와 큰 동작을 감지할 수 있다 | 공간 배치, 장치 위치, 사람이 바뀌면 성능이 크게 떨어지고 재학습이나 보정이 필요하다 |
| 기존 Wi-Fi 신호와 저가 보드로 실험할 수 있다 | 드문 자세, 여러 사람의 동시 감지와 새 공간과 새 사람으로 일반화하는 동작 인식은 연구에서도 어려운 문제다 |
| WLAN 센싱 표준(802.11bf)이 발행됐다 | 표준 본문의 프라이버시 처리와 제품 지원은 따로 확인해야 한다 |

## 면접 체크포인트

- CSI가 무엇이고, 패킷 내용을 관찰하는 캡처와 무엇이 다른가
- 카메라를 교사로 쓰는 학습에서 시간 동기화와 교사 라벨의 오류가 결과에 주는 영향
- 무작위 분할, 교차 피험자, 교차 환경 수치를 구분해 정확도 주장을 읽을 수 있는가
- PCK, MPJPE, 분류 정확도처럼 서로 다른 지표를 같은 정확도로 비교하지 않는 이유
- 802.11bf의 범위와 아직 확인하지 못한 프라이버시 처리, 벽 너머 감지가 만드는 위험

## 출처

- [Espressif ESP-IDF, Wi-Fi Vendor Features (ESP32-S3)](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-guides/wifi-driver/wifi-vendor-features.html) — CSI 정의, 학습 필드, 바이트 구성과 API
- [Linux 802.11n CSI Tool — dhalperi.github.io](https://dhalperi.github.io/linux-80211n-csitool/)
- [DensePose From WiFi — arXiv, Jiaqi Geng, Dong Huang, Fernando De la Torre](https://arxiv.org/abs/2301.00250)
- [MM-Fi: Multi-Modal Non-Intrusive 4D Human Dataset for Versatile Wireless Sensing — arXiv, Jianfei Yang 외](https://arxiv.org/abs/2305.10345) — NeurIPS 2023 Datasets and Benchmarks, Table 3의 프로토콜별 MPJPE
- [ybhbingo/MMFi_dataset — GitHub](https://github.com/ybhbingo/MMFi_dataset) — 공식 로더의 random_split
- [IEEE SA, IEEE 802.11bf-2025](https://standards.ieee.org/ieee/802.11bf/11574/)
- [IEEE 802.11, Status of Project IEEE 802.11bf](https://www.ieee802.org/11/Reports/tgbf_update.htm)
- [An Overview on IEEE 802.11bf: WLAN Sensing — arXiv, Rui Du 외](https://arxiv.org/abs/2207.04859) — 2022-07, 보안과 프라이버시 논의 단계
- [See Through Walls with Wi-Fi! — SIGCOMM 2013, Fadel Adib, Dina Katabi](https://people.csail.mit.edu/fadel/papers/wivi-paper.pdf)
- [Google AI Edge, Pose landmark detection guide for Web](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js)
- [ruvnet/ruview — GitHub](https://github.com/ruvnet/ruview) — 라이선스, 지원 하드웨어, 이중 모달 데모 구성
- [MM-Fi WiFi sensing study — GitHub, ruvnet/ruview](https://github.com/ruvnet/ruview/blob/main/docs/benchmarks/mmfi-wifi-sensing-study.md) — torso-PCK@20, random_split 한계, 교차 환경과 보정 수치
- [csi-simulator.js — GitHub, ruvnet/ruview](https://github.com/ruvnet/ruview/blob/main/ui/pose-fusion/js/csi-simulator.js) — 데모 모드의 합성 CSI
- [Known Issues & Setup Troubleshooting Guide (Issue #301) — GitHub, ruvnet/ruview](https://github.com/ruvnet/ruview/issues/301)
- [Issue #509 — GitHub, ruvnet/ruview](https://github.com/ruvnet/ruview/issues/509) — UI 시뮬레이션 대체 표시에 관한 관리자 답변
- [andrisgauracs/wifi-sensing-kit — GitHub](https://github.com/andrisgauracs/wifi-sensing-kit) — 구성, 결과와 평가 기준
- [How it works — GitHub, andrisgauracs/wifi-sensing-kit](https://github.com/andrisgauracs/wifi-sensing-kit/blob/main/docs/how-it-works.md) — 규칙 기반 교사 라벨 77%, k-NN(k=7), 재학습 조건
- [I Turned My Wi-Fi Into a Surveillance System — Better Stack](https://www.youtube.com/watch?v=9Tihk9_jUyo) — 2026-10-11 업로드, 주제의 출발점. 실험 수치는 키트 저장소 문서로 대조함

## 관련 문서

- [[Physical-DataLink-Layer|물리 계층과 데이터링크 계층]] — 무선 매체와 L1
- [[Packet-Capture-and-Wireshark|패킷 캡처와 Wireshark]] — 통신 내용 관찰과 법적 범위
- [[네트워크(Network)|네트워크 인덱스]]
