"""Unit tests for business logic services."""

import pytest
from core.models import Product
from core.services import UserService, OrderService


class TestUserService:
    def test_create_user(self) -> None:
        svc = UserService()
        user = svc.create_user(1, "Alice", "alice@example.com")
        assert user.name == "Alice"
        assert user.email == "alice@example.com"

    def test_get_user(self) -> None:
        svc = UserService()
        svc.create_user(1, "Bob", "bob@example.com")
        user = svc.get_user(1)
        assert user is not None
        assert user.name == "Bob"

    def test_get_nonexistent_user_returns_none(self) -> None:
        svc = UserService()
        assert svc.get_user(999) is None

    def test_duplicate_user_raises_error(self) -> None:
        svc = UserService()
        svc.create_user(1, "Charlie", "charlie@example.com")
        with pytest.raises(ValueError, match="already exists"):
            svc.create_user(1, "Charlie2", "charlie2@example.com")

    def test_list_users(self) -> None:
        svc = UserService()
        svc.create_user(1, "A", "a@example.com")
        svc.create_user(2, "B", "b@example.com")
        users = svc.list_users()
        assert len(users) == 2


class TestOrderService:
    def _setup(self) -> tuple:
        user_svc = UserService()
        order_svc = OrderService(user_service=user_svc)
        user = user_svc.create_user(1, "TestUser", "test@example.com")
        product = Product(product_id=1, name="Widget", price=10.0)
        return user_svc, order_svc, product

    def test_create_order(self) -> None:
        _, order_svc, product = self._setup()
        order = order_svc.create_order(1, product, quantity=2)
        assert order.quantity == 2
        assert order.total_price == 20.0

    def test_order_added_to_user(self) -> None:
        user_svc, order_svc, product = self._setup()
        order_svc.create_order(1, product)
        user = user_svc.get_user(1)
        assert len(user.orders) == 1

    def test_get_order(self) -> None:
        _, order_svc, product = self._setup()
        created = order_svc.create_order(1, product)
        fetched = order_svc.get_order(created.order_id)
        assert fetched is created

    def test_order_for_nonexistent_user_raises_error(self) -> None:
        _, order_svc, product = self._setup()
        with pytest.raises(ValueError, match="not found"):
            order_svc.create_order(999, product)

    def test_list_orders(self) -> None:
        _, order_svc, product = self._setup()
        order_svc.create_order(1, product)
        order_svc.create_order(1, product)
        assert len(order_svc.list_orders()) == 2

    def test_user_total_spent(self) -> None:
        user_svc, order_svc, product = self._setup()
        p2 = Product(product_id=2, name="Gadget", price=25.0)
        order_svc.create_order(1, product, quantity=2)   # 20
        order_svc.create_order(1, p2, quantity=1)        # 25
        user = user_svc.get_user(1)
        assert user.total_spent() == 45.0
