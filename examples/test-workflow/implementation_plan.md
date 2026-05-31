# Implementation Plan

## Goal
Create a well-structured Python project with three logical modules (config, core, tests) that demonstrate dataclass models, service-layer business logic, and unit testing.

## Architecture

### Layer 1: Configuration (`config/`)
- `settings.py` defines `DB_URL`, `API_KEY`, `LOG_LEVEL` as module-level constants.
- `__init__.py` re-exports all three for clean imports (`from config import DB_URL`).

### Layer 2: Core Business Logic (`core/`)

**Models (`models.py`)**
- `Product`: dataclass with `product_id`, `name`, `price`, `description`. Validates price ≥ 0.
- `User`: dataclass with `user_id`, `name`, `email`, `orders` list. Methods: `add_order()`, `total_spent()`.
- `Order`: dataclass linking `User` and `Product` with `quantity` and computed `total_price`. Validates quantity ≥ 1.

**Services (`services.py`)**
- `UserService`: CRUD operations on an in-memory user store. Duplicate ID detection.
- `OrderService`: Creates orders, auto-increments order IDs, links orders to users. Depends on `UserService` for user lookup.

### Layer 3: Tests (`tests/`)
- `test_models.py`: Tests Product creation, price validation, User defaults, Order total calculation, quantity validation, and object linking.
- `test_services.py`: Tests UserService CRUD, duplicate prevention, OrderService creation, user-order linkage, and cross-service total_spent calculation.

## Key Design Decisions
1. **Dataclasses** over plain dicts for type safety and clarity.
2. **Service layer** separates storage logic from data definitions.
3. **In-memory storage** (dicts) keeps the demo self-contained with no DB dependency.
4. **pytest** for tests — no setup required beyond `pip install pytest`.
5. **`__init__.py` re-exports** enable flat imports across module boundaries.
