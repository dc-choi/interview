"""Download a pinned public model. No corpus or query input is accepted."""
import argparse
import hashlib
import json
from pathlib import Path

from huggingface_hub import snapshot_download

parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
model = 'intfloat/multilingual-e5-small'
revision = '614241f622f53c4eeff9890bdc4f31cfecc418b3'
snapshot_download(model, revision=revision, token=False, local_dir=args.output,
                  allow_patterns=['*.json', '*.safetensors', 'tokenizer.model',
                                  'sentencepiece.bpe.model', '*.txt', '1_Pooling/*'],
                  ignore_patterns=['onnx/*', 'openvino/*'])
files = {str(file.relative_to(args.output)): hashlib.sha256(file.read_bytes()).hexdigest()
         for file in args.output.rglob('*') if file.is_file() and '.cache' not in file.parts
         and file.name != 'experiment-model.json'}
(args.output / 'experiment-model.json').write_text(json.dumps({
    'model_id': model, 'revision': revision, 'files': files, 'query_prefix': 'query: ',
    'passage_prefix': 'passage: ', 'normalized': True, 'max_seq_length': 512, 'dimension': 384,
}, indent=2))
