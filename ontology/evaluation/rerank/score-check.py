"""Small offline checks for the scorer's untrusted input boundary."""
import json

from score import load_queries


def reject(payload):
    try:
        load_queries(json.dumps(payload).encode())
    except ValueError:
        return
    raise AssertionError('Expected invalid input to be rejected')


load_queries(b'{"queries":[{"id":"empty","query":"q","candidates":[]}]}')
reject({'queries': [{'id': 'same', 'query': 'q', 'candidates': []}, {'id': 'same', 'query': 'q', 'candidates': []}]})
reject({'queries': [{'id': 'q', 'query': 'q', 'candidates': [{'id': 'same', 'text': 'x'}, {'id': 'same', 'text': 'y'}]}]})
reject({'queries': [{'id': 'q', 'query': 'q', 'candidates': [{}]}]})
reject({'queries': [{'id': 'q', 'query': 'q', 'candidates': [{'id': str(i), 'text': 'x'} for i in range(51)]}]})
print('score-check: ok')
