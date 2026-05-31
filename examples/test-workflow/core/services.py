"""Business logic services."""

from typing import Dict, List, Optional
from .models import User, Product, Order


class UserService:
    """Service for managing users."""

    def __init__(self) -> None:
        self._users: Dict[int, User] = {}

    def create_user(self, user_id: int, name: str, email: str) -> User:
        """Create and store a new user."""
        if user_id in self._users:
            raise ValueError(f"User {user_id} already exists")
        user = User(user_id=user_id, name=name, email=email)
        self._users[user_id] = user
        return user

    def get_user(self, user_id: int) -> Optional[User]:
        """Retrieve a user by ID."""
        return self._users.get(user_id)

    def list_users(self) -> List[User]:
        """Return all users."""
        return list(self._users.values())


class OrderService:
    """Service for managing orders."""

    def __init__(self, user_service: UserService) -> None:
        self._user_service = user_service
        self._orders: Dict[int, Order] = {}
        self._next_order_id: int = 1

    def create_order(self, user_id: int, product: Product, quantity: int = 1) -> Order:
        """Create an order for a user."""
        user = self._user_service.get_user(user_id)
        if user is None:
            raise ValueError(f"User {user_id} not found")

        order = Order(
            order_id=self._next_order_id,
            user=user,
            product=product,
            quantity=quantity,
        )
        self._next_order_id += 1

        user.add_order(order)
        self._orders[order.order_id] = order
        return order

    def get_order(self, order_id: int) -> Optional[Order]:
        """Retrieve an order by ID."""
        return self._orders.get(order_id)

    def list_orders(self) -> List[Order]:
        """Return all orders."""
        return list(self._orders.values())
