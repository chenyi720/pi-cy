"""Unit tests for data models."""

import pytest
from core.models import User, Product, Order


class TestProduct:
    def test_create_product(self) -> None:
        p = Product(product_id=1, name="Widget", price=9.99, description="A widget")
        assert p.product_id == 1
        assert p.name == "Widget"
        assert p.price == 9.99
        assert p.description == "A widget"

    def test_product_default_description(self) -> None:
        p = Product(product_id=2, name="Gadget", price=19.99)
        assert p.description == ""

    def test_negative_price_raises_error(self) -> None:
        with pytest.raises(ValueError, match="Price cannot be negative"):
            Product(product_id=3, name="Bad", price=-5.0)


class TestUser:
    def test_create_user(self) -> None:
        u = User(user_id=1, name="Alice", email="alice@example.com")
        assert u.user_id == 1
        assert u.name == "Alice"
        assert u.email == "alice@example.com"
        assert u.orders == []

    def test_total_spent_empty(self) -> None:
        u = User(user_id=1, name="Bob", email="bob@example.com")
        assert u.total_spent() == 0.0


class TestOrder:
    def test_create_order_with_defaults(self) -> None:
        u = User(user_id=1, name="Charlie", email="charlie@example.com")
        p = Product(product_id=1, name="Item", price=10.0)
        o = Order(order_id=1, user=u, product=p)
        assert o.quantity == 1
        assert o.total_price == 10.0

    def test_order_total_price_calculation(self) -> None:
        u = User(user_id=1, name="Dana", email="dana@example.com")
        p = Product(product_id=2, name="Bulk", price=5.0)
        o = Order(order_id=2, user=u, product=p, quantity=3)
        assert o.total_price == 15.0

    def test_zero_quantity_raises_error(self) -> None:
        u = User(user_id=1, name="Eve", email="eve@example.com")
        p = Product(product_id=1, name="Thing", price=10.0)
        with pytest.raises(ValueError, match="Quantity must be at least 1"):
            Order(order_id=3, user=u, product=p, quantity=0)

    def test_order_linked_to_user_and_product(self) -> None:
        u = User(user_id=1, name="Frank", email="frank@example.com")
        p = Product(product_id=1, name="Linked", price=25.0)
        o = Order(order_id=1, user=u, product=p, quantity=2)
        assert o.user is u
        assert o.product is p
