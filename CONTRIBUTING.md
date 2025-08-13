# Contributing

Thanks for your interest in improving this scheduling framework!

## Development Setup

1. Create & activate virtual environment
2. Install dependencies: `pip install -r requirements.txt -r requirements-dev.txt`
3. Run a sample generation: `python -m scheduling.main --year 2026 --out md`

## Tests

Run `pytest` (after installing dev requirements). Add tests for any new logic (rules parsing, rotation fairness, etc.).

## Pull Requests

- Keep PRs focused
- Update README or docstrings when behavior changes
- Run lint & tests before pushing

## Coding Guidelines

- Use dataclasses for new models
- Keep functions small and pure where practical
- Provide type hints
- Add comments at extension points

## Release Process

1. Bump version in `pyproject.toml`
2. Tag & publish (GitHub action or manual)

## Code of Conduct

Be respectful and constructive. See `CODE_OF_CONDUCT.md`.
