"""Configuration des tests E2E HB Commerce."""

import os

BASE_URL = os.getenv("HB_TEST_BASE_URL", "http://localhost:8080/").rstrip("/") + "/"
PASSWORD = os.getenv("HB_TEST_PASSWORD", "Test1234!")
HEADLESS = os.getenv("HB_TEST_HEADLESS", "1") != "0"
IMPLICIT_WAIT = int(os.getenv("HB_TEST_IMPLICIT_WAIT", "5"))
EXPLICIT_WAIT = int(os.getenv("HB_TEST_EXPLICIT_WAIT", "35"))
INTEGRATION = os.getenv("HB_TEST_INTEGRATION", "0") == "1"

ACCOUNTS = {
    "super_root": os.getenv("HB_TEST_SUPER_EMAIL", "super@hbcommerce.demo"),
    "admin": os.getenv("HB_TEST_ADMIN_EMAIL", "admin@hbcommerce.demo"),
    "agent": os.getenv("HB_TEST_AGENT_EMAIL", "agent.martin@hbcommerce.demo"),
    "client": os.getenv("HB_TEST_CLIENT_EMAIL", "contact@restaurant-paris.demo"),
    "supplier": os.getenv("HB_TEST_SUPPLIER_EMAIL", "stock@fiafi-tunisie.demo"),
    "driver": os.getenv("HB_TEST_DRIVER_EMAIL", "livreur@hbcommerce.demo"),
}
