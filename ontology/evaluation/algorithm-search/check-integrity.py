"""Exercise experiment integrity guards using copies of real generated inputs."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--data', type=Path, required=True)
parser.add_argument('--model', type=Path, required=True)
parser.add_argument('--rankings', type=Path, required=True)
args = parser.parse_args()
here = Path(__file__).parent.resolve()
environment = {**os.environ, 'HF_HUB_OFFLINE': '1', 'PYTHONDONTWRITEBYTECODE': '1'}


def rejected(command, message):
    result = subprocess.run(command, env=environment, capture_output=True, text=True, timeout=60)
    assert result.returncode != 0 and message in result.stderr, result.stderr


with tempfile.TemporaryDirectory(prefix='ontology-integrity-') as temp:
    data = Path(temp) / 'data'
    data.mkdir()
    for name in ['inputs.json', 'queries.json', 'corpus.json', 'vectors.json', 'vectors.npy']:
        shutil.copy2(args.data / name, data / name)
    rankings = Path(temp) / 'rankings.json'
    shutil.copy2(args.rankings, rankings)
    evaluate = ['node', str(here / 'run.mjs'), 'evaluate', '--data', str(data),
                '--rankings', str(rankings), '--output', str(Path(temp) / 'report.json')]
    with (data / 'corpus.json').open('ab') as stream:
        stream.write(b' ')
    rejected(evaluate, 'Frozen experiment inputs changed')
    shutil.copy2(args.data / 'corpus.json', data / 'corpus.json')
    print('PASS changed corpus is rejected', flush=True)

    with (data / 'queries.json').open('ab') as stream:
        stream.write(b' ')
    changed_rankings = json.loads(rankings.read_bytes())
    changed_rankings['queries_sha256'] = hashlib.sha256((data / 'queries.json').read_bytes()).hexdigest()
    rankings.write_text(json.dumps(changed_rankings))
    rejected(evaluate, 'Frozen experiment inputs changed')
    shutil.copy2(args.data / 'queries.json', data / 'queries.json')
    print('PASS changed queries cannot relabel frozen judgments', flush=True)

    model = Path(temp) / 'model'
    for source in args.model.rglob('*'):
        if not source.is_file() or '.cache' in source.parts:
            continue
        target = model / source.relative_to(args.model)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.symlink_to(source.resolve())
    config = model / 'config.json'
    config.unlink()
    config.write_bytes((args.model / 'config.json').read_bytes() + b' ')
    rank = [sys.executable, str(here / 'rank.py'), '--data', str(data), '--model', str(model),
            '--output', str(Path(temp) / 'output.json')]
    rejected(rank, 'Model file checksum mismatch')
    config.unlink()
    config.symlink_to((args.model / 'config.json').resolve())
    print('PASS changed model bytes are rejected', flush=True)

    with (data / 'vectors.npy').open('r+b') as stream:
        stream.seek(-1, 2)
        byte = stream.read(1)
        stream.seek(-1, 2)
        stream.write(bytes([byte[0] ^ 1]))
    rejected(rank, 'Cached embedding checksum mismatch')
    print('PASS changed cached vectors are rejected', flush=True)
