"""Data models for the application."""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Product:
    """Represents a product in the catalog."""
    product_id: int
    name: str
    price: float
    description: str = ""

    def __post_init__(self) -> None:
        if self.price < 0:
            raise ValueError("Price cannot be negative")


@dataclass
class User:
    """Represents a user with their orders."""
    user_id: int
    name: str
    email: str
    orders: List["Order"] = field(default_factory=list)

    def add_order(self, order: "Order") -> None:
        """Add an order to the user's order history."""
        self.orders.append(order)

    def total_spent(self) -> float:
        """Calculate total amount spent across all orders."""
        return sum(order.total_price for order in self.orders)


@dataclass
class Order:
    """Represents an order linking a user and product."""
    order_id: int
    user: User
    product: Product
    quantity: int = 1
    total_price: float = field(init=False)

    def __post_init__(self) -> None:
        if self.quantity < 1:
            raise ValueError("Quantity must be at least 1")
        self.total_price = self.product.price * self.quantity
