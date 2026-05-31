# Task Checklist

## Directory Structure
- [x] Create `config/` directory
- [x] Create `core/` directory
- [x] Create `tests/` directory

## Configuration Module
- [x] Create `config/settings.py` with DB_URL, API_KEY, LOG_LEVEL
- [x] Create `config/__init__.py` exporting all settings

## Core Module — Models
- [x] Create `core/models.py` with Product dataclass
- [x] Create User dataclass with orders list and total_spent()
- [x] Create Order dataclass linking User and Product with computed total_price
- [x] Add validation (negative price, zero quantity)

## Core Module — Services
- [x] Create `core/services.py` with UserService (create, get, list)
- [x] Create OrderService (create, get, list, user lookup)
- [x] Create `core/__init__.py` exporting all models and services

## Tests
- [x] Create `tests/__init__.py`
- [x] Create `tests/test_models.py` with tests for Product, User, Order
- [x] Create `tests/test_services.py` with tests for UserService, OrderService
- [x] Run tests and verify all pass

## Documentation & Entry Point
- [x] Create `main.py` demonstrating config, models, and services
- [x] Create `README.md` explaining structure and module relationships
- [x] Create `implementation_plan.md` with architecture details
- [x] Create `task.md` (this file)
- [x] Create `walkthrough.md` explaining the completed project
