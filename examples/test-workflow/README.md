# test-workflow

A modular Python project demonstrating clean separation of concerns across three folders.

## Project Structure

```
test-workflow/
├── config/          # Configuration constants
│   ├── __init__.py
│   └── settings.py
├── core/            # Business logic
│   ├── __init__.py
│   ├── models.py
│   └── services.py
├── tests/           # Unit tests
│   ├── __init__.py
│   ├── test_models.py
│   └── test_services.py
├── main.py
└── README.md
```

## Module Responsibilities

### `config/` — Configuration Module
Stores application-wide constants: database URL, API key, and log level. Imported by any module needing configuration values.

### `core/` — Business Logic Module
Contains data models (`User`, `Product`, `Order` as dataclasses) and service classes (`UserService`, `OrderService`) that orchestrate business operations. Services depend only on models, not on config.

### `tests/` — Unit Tests
Pytest-based tests covering model validation and service logic. No external dependencies required.

## How the Modules Relate

```
config  ──────────────────────────────►  main.py
                                        ▲
core/models.py  ──►  core/services.py  ─┘
     ▲                    ▲
     └── tests/           └── tests/
```

- **main.py** imports from both `config` and `core` to demonstrate the full stack.
- **core/services.py** depends on **core/models.py** for data structures.
- **tests/** imports from **core/** to validate behavior.
- **config/** is standalone and consumed by the entry point.

## Running

```bash
# Run demo
python main.py

# Run tests
pytest tests/ -v
```
