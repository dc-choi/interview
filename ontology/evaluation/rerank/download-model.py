"""Download the pinned public reranker. It accepts no corpus or query input."""
import argparse
import hashlib
import json
from pathlib import Path

from huggingface_hub import snapshot_download


MODEL_ID = 'BAAI/bge-reranker-v2-m3'
REVISION = '953dc6f6f85a1b2dbfca4c34a2796e7dde08d41e'
REQUIRED_FILES = [
    'config.json', 'model.safetensors', 'sentencepiece.bpe.model',
    'special_tokens_map.json', 'tokenizer.json', 'tokenizer_config.json',
]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()

snapshot_download(
    MODEL_ID,
    revision=REVISION,
    token=False,
    local_dir=args.output,
    allow_patterns=REQUIRED_FILES,
)
files = {name: sha256(args.output / name) for name in REQUIRED_FILES}
(args.output / 'experiment-model.json').write_text(json.dumps({
    'model_id': MODEL_ID,
    'revision': REVISION,
    'files': files,
    'architecture': 'AutoModelForSequenceClassification',
    'score': 'raw_logit',
    'max_model_tokens': 512,
}, ensure_ascii=False, indent=2) + '\n')
