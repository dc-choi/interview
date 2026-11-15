---
tags: [pytorch, distributed-training, nccl, fsdp, checkpoint, upgrade, rollback]
status: done
verified_at: 2026-11-15
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["PyTorch Version Upgrade and Rollback", "PyTorch 업그레이드와 롤백", "PyTorch 2.15 호환성"]
---

# PyTorch 버전 업그레이드와 롤백

학습 환경의 PyTorch를 올렸다가 문제가 생기면 패키지는 이전 버전으로 되돌릴 수 있다. 그러나 새 버전이 이미 쓴 산출물(체크포인트 같은 파일 형식)은 패키지를 되돌려도 원래대로 돌아오지 않을 수 있다. 새 기본값으로 바뀐 학습 동작(통신 backend, 혼합 정밀도의 축적 dtype)은 패키지를 따라 돌아가지만, 새 기본값으로 학습한 구간의 결과는 남는다. 업그레이드 계획은 되돌릴 수 있는 것과 없는 것을 먼저 나누는 데서 시작한다.

## 무엇이 되돌아가고 무엇이 남는가

| 구분 | 패키지 롤백으로 복구되는가 | 확인할 것 |
|---|---|---|
| 설치 조건(Python, CUDA, 드라이버) | 이전 휠을 다시 설치하면 복구된다 | 새 버전이 요구한 드라이버나 Python으로 환경을 바꿨다면 그 변경도 함께 기록한다 |
| 새 버전이 저장한 파일 | 복구되지 않는다 | 이전 버전이 그 형식을 읽을 수 있는지, 이전 형식으로 저장하는 옵션이 있는지 |
| 기본값이 바뀐 동작 | 롤백하면 이전 기본값으로 돌아가지만, 새 버전으로 학습한 구간의 결과는 남는다 | 같은 설정 파일이 버전마다 다른 동작을 만드는지 |

## PyTorch 2.15의 사례

PyTorch 2.15.0은 2026-10-28에 나왔다. 아래는 공식 릴리스 노트의 하위 호환을 깨는 변경 중 분산 학습의 업그레이드와 롤백에 직접 걸리는 항목이다.

### 설치 조건

- PyPI 바이너리의 최소 Python 버전이 3.11이 됐다. Python 3.10용 휠은 만들지 않는다.
- PyPI 휠의 기본 CUDA가 13.0에서 13.2로 바뀌었고 CUDA 12.6과 13.0 휠은 더 이상 게시하지 않는다. 휠은 `cu132`와 `cu134`이고, CUDA 13 휠은 NVIDIA 드라이버 580 이상과 Turing(`sm_75`) 이상의 GPU가 필요하다. 릴리스 노트는 Maxwell, Pascal, Volta GPU와 CUDA 12.x 드라이버 호스트는 2.14에 머물라고 권한다.
- MPS는 macOS 15 이상이 필요하다.

### 분산 체크포인트는 이전 버전에서 읽히지 않는다

분산 체크포인트(DCP) metadata가 tensor stride를 기록하도록 바뀌어 `.metadata` 파일의 `TensorProperties`에 선택적 `strides` 필드가 생겼다. 그래서 2.15가 저장한 체크포인트는 2.14 이하에서 읽을 수 없고, 이전 버전의 `dcp.load`는 `too many values to unpack (expected 5)`를 담은 `CheckpointException`을 낸다. 이전 형식으로 저장하는 플래그는 없다. 2.15는 2.14와 2.15 체크포인트를 모두 읽는다.

롤백 경로를 남기려면 업그레이드 직전 2.14로 저장한 체크포인트를 따로 보존하고, 2.15에서 이어 학습한 체크포인트는 2.14로 되돌린 환경에서 쓸 수 없다고 기록한다(운영 제안).

### NCCL backend가 새 구현으로 바뀌었다

`backend="nccl"`(CUDA에서 `init_process_group()`의 기본 backend)이 다시 작성한 새 NCCL 구현을 만든다. 2.14에서는 이 구현이 opt-in인 `nccl2` backend로 미리 공개됐다.

- 이전 구현은 이번 릴리스에서만 `backend="nccl-legacy"`로 쓸 수 있다. 프로세스 그룹을 만들기 전에 모든 rank에서 `TORCH_DIST_USE_NCCL2=0`을 설정해도 된다. 둘 다 다음 릴리스에서 제거되므로 `nccl`이나 `nccl-lazy`로 옮겨야 한다.
- 새 구현은 프로세스 그룹을 장치 하나에 묶는다. `device_id`를 주면 그 장치, 없으면 `LOCAL_RANK % torch.cuda.device_count()`(없으면 global rank 기준)를 쓰고 `torch.cuda.set_device()`는 쓰지 않는다. 다른 GPU의 tensor를 넘기면 `Expected tensor on cuda:X but found tensor on cuda:Y` 같은 오류로 실패한다. 프로세스 하나가 여러 GPU를 쓰려면 `nccl-legacy`가 필요한데 그 경로가 다음 릴리스에서 없어지므로, 이런 구조는 다음 업그레이드 전에 프로세스당 GPU 하나로 바꿀 계획이 필요하다(운영 제안).
- communicator를 즉시 만들므로 쓰지 않는 그룹도 GPU 메모리를 차지한다. `isinstance(..., ProcessGroupNCCL)`은 `False`가 되고 `comm_split_count()`는 없어졌다.
- `nccl-lazy`는 send와 recv의 상대 쌍마다 communicator를 지연 생성해 서로 다른 상대와의 point-to-point 전송이 겹칠 수 있게 한다.

```python
dist.init_process_group("nccl", device_id=torch.device("cuda", local_rank))
```

### FSDP2의 gradient reduce dtype 기본값이 바뀌었다

`MixedPrecisionPolicy(reduce_dtype=None)`이면 `fully_shard`가 gradient를 `param_dtype` 대신 parameter의 `grad_dtype`(기본은 원래 dtype)으로 축적하고 reduce한다.

- 흔한 구성인 fp32 parameter와 `param_dtype=bf16`에서는 이전에 bf16으로 하던 축적과 reduce가 fp32로 바뀌어 reduce-scatter 바이트가 두 배가 된다. 이는 통신량 기준이며 학습 시간이 두 배가 된다는 뜻은 아니다.
- 드문 구성인 bf16 parameter와 `param_dtype=fp32`에서는 반대로 fp32에서 bf16으로 바뀐다.
- 이전 동작이 필요하면 `reduce_dtype`을 명시한다.

```python
MixedPrecisionPolicy(param_dtype=torch.bfloat16, reduce_dtype=torch.bfloat16)
```

같은 변경으로 gradient 축적 중 unshard된 parameter의 `.grad`는 항상 누적 합을 담는다.

## 업그레이드 검증 순서

아래는 위 변경을 근거로 정리한 운영 제안이다.

1. **설치:** 새 휠의 Python, CUDA, 드라이버 요구를 학습 노드와 컨테이너 이미지에서 확인한다.
2. **통신:** 기본 backend가 바뀌었으면 소규모 다중 노드 작업으로 그룹 생성, 장치 배정, collective 결과와 GPU 메모리 사용을 비교한다. `nccl-legacy`는 다음 버전에서 없어지므로 영구 해결책으로 두지 않는다.
3. **체크포인트:** 이전 버전으로 저장한 체크포인트를 새 버전에서 읽고, 새 버전으로 저장한 체크포인트를 이전 버전에서 읽을 수 있는지 시험한다. 읽을 수 없으면 롤백 지점의 체크포인트를 보존한다.
4. **정밀도:** 혼합 정밀도 설정에서 기본값에 의존하는 항목(`reduce_dtype` 같은)을 명시하고, 통신량과 손실 곡선을 이전 버전과 비교한다.

## 체크포인트

- 롤백 계획에 패키지 버전뿐 아니라 그 버전으로 되돌렸을 때 읽을 수 있는 마지막 체크포인트를 적었는가.
- 설정 파일에 기본값으로 둔 항목 중 버전마다 의미가 바뀐 것이 있는가.
- 면접에서는 프레임워크 업그레이드 뒤 문제가 생기면 롤백하면 되지 않느냐고 물을 수 있다. 패키지는 되돌릴 수 있지만 새 버전이 쓴 파일 형식과 그 사이 학습 결과는 남으므로, 업그레이드 전에 역호환 범위를 확인하고 롤백 지점의 산출물을 보존한다고 답한다.

## 출처

- [PyTorch 2.15.0 Release — GitHub, pytorch/pytorch](https://github.com/pytorch/pytorch/releases/tag/v2.15.0) — 2026-10-28 게시, 2026-11-15 하위 호환을 깨는 변경 절의 DCP, NCCL, FSDP2, 설치 조건 대조
- [PyTorch 2.15 Release Blog — PyTorch](https://pytorch.org/blog/pytorch-2-15-release-blog/) — 2026-10-28, 기본 CUDA toolkit과 Python 3.10 지원 종료, `nccl2` 사전 공개 대조
- [PyTorch 2.15 업그레이드, 2.14로 되돌리면 체크포인트는? — YouTube, 길리랩](https://www.youtube.com/watch?v=pDEs5WIFXOM) — 2026-11-05 공개 영상, 계기 자료. 사실은 위 릴리스 노트로 대조했다

## 관련 문서

- [[GPU-Server-Infrastructure|GPU 서버 인프라 (NCCL과 torchrun 장애 재시작)]]
- [[PyTorch-on-TPU|PyTorch on TPU]]
- [[Deep-Learning-Foundations-and-Practice|딥러닝 기초와 실습]]
- [[Rollback|롤백 전략]]
