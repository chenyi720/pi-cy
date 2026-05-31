# Project Walkthrough

## What Was Built

A clean, modular Python project split into three folders with clear responsibilities:

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `config/` | App-wide constants | `settings.py` |
| `core/` | Data models + business logic | `models.py`, `services.py` |
| `tests/` | Unit tests | `test_models.py`, `test_services.py` |

## File-by-File Breakdown

### `config/settings.py`
Three string constants — `DB_URL`, `API_KEY`, `LOG_LEVEL` — representing environment-independent configuration. The `__init__.py` re-exports them so consumers write `from config import DB_URL` instead of `from config.settings import DB_URL`.

### `core/models.py`
Three `@dataclass` classes forming the domain model:

- **Product** holds catalog info and rejects negative prices in `__post_init__`.
- **User** holds identity and an `orders` list. Provides `add_order()` to append and `total_spent()` to sum all order totals.
- **Order** takes a `User`, `Product`, and `quantity`. It computes `total_price` automatically (price × quantity) and rejects quantities below 1.

The circular reference (User ↔ Order) is handled via a forward reference `"Order"` in the type hint.

### `core/services.py`
Two service classes wrapping the models with in-memory storage:

- **UserService** — `create_user()`, `get_user()`, `list_users()`. Prevents duplicate user IDs.
- **OrderService** — Injected with a `UserService` instance. `create_order()` looks up the user, creates the order, auto-increments the order ID, and attaches the order to the user's history.

### `main.py`
A demonstration script that:
1. Prints config constants.
2. Creates sample models and shows `total_spent()`.
3. Uses both services to create users, products, and orders, then prints summaries.

### Tests
- **test_models.py** — 10 tests covering creation, defaults, validation errors, computed fields, and object linking.
- **test_services.py** — 11 tests covering CRUD operations, error cases, cross-service interactions, and the `total_spent` integration path.

## How to Explore

```bash
cd test-workflow

# See it in action
python main.py

# Run all tests
pytest tests/ -v

# Run just model tests
pytest tests/test_models.py -v

# Run just service tests
pytest tests/test_services.py -v
```

## Design Highlights

1. **No external dependencies** for core logic — only `pytest` for testing.
2. **Services depend on models, not vice versa** — clean dependency direction.
3. **In-memory storage** keeps the demo portable and DB-free.
4. **Validation in `__post_init__`** catches bad data at construction time.
5. **Auto-incrementing order IDs** in `OrderService` simulate a real persistence layer.
