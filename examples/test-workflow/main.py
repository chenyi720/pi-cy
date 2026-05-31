"""Entry point demonstrating all modules."""

from config import DB_URL, API_KEY, LOG_LEVEL
from core import User, Product, Order, UserService, OrderService


def main() -> None:
    # --- Configuration ---
    print("=== Configuration ===")
    print(f"DB_URL   : {DB_URL}")
    print(f"API_KEY  : {API_KEY}")
    print(f"LOG_LEVEL: {LOG_LEVEL}")
    print()

    # --- Models ---
    print("=== Models ===")
    user = User(user_id=1, name="Alice", email="alice@example.com")
    product = Product(product_id=1, name="Widget", price=9.99, description="A fine widget")
    order = Order(order_id=1, user=user, product=product, quantity=3)
    user.add_order(order)

    print(f"User    : {user}")
    print(f"Product : {product}")
    print(f"Order   : {order}")
    print(f"User spent: ${user.total_spent():.2f}")
    print()

    # --- Services ---
    print("=== Services ===")
    user_svc = UserService()
    order_svc = OrderService(user_service=user_svc)

    alice = user_svc.create_user(1, "Alice", "alice@example.com")
    bob = user_svc.create_user(2, "Bob", "bob@example.com")

    laptop = Product(product_id=1, name="Laptop", price=999.99)
    mouse = Product(product_id=2, name="Mouse", price=29.99)

    order_svc.create_order(alice.user_id, laptop, quantity=1)
    order_svc.create_order(alice.user_id, mouse, quantity=2)
    order_svc.create_order(bob.user_id, mouse, quantity=1)

    print(f"Alice's orders : {len(alice.orders)}")
    print(f"Alice spent    : ${alice.total_spent():.2f}")
    print(f"Bob's orders   : {len(bob.orders)}")
    print(f"Bob spent      : ${bob.total_spent():.2f}")
    print(f"Total orders   : {len(order_svc.list_orders())}")
    print(f"Total users    : {len(user_svc.list_users())}")
    print()


if __name__ == "__main__":
    main()
