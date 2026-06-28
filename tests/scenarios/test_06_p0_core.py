"""P0 — client, agent commande, admin chat, alertes stock."""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import ACCOUNTS, EXPLICIT_WAIT
from tests.helpers.admin_ui import (
    find_chat_moderation_button,
    open_admin_nav_tab,
    wait_admin_chat_ready,
    wait_admin_initialized,
    wait_stock_alerts_panel,
)
from tests.helpers.agent_order import submit_agent_order
from tests.helpers.auth import login_as, logout
from tests.helpers.compte_ui import open_compte_tab, wait_client_orders_loaded


@pytest.mark.suite("client")
@pytest.mark.scenario("FLUX-CLI-02")
def test_client_sees_orders_table(driver):
    """Le client voit ses commandes dans compte.html."""
    login_as(driver, ACCOUNTS["client"], expect_url_contains="compte.html")
    wait_client_orders_loaded(driver)
    assert driver.find_element(By.ID, "ordersTable").get_attribute("hidden") is None
    assert len(driver.find_elements(By.CSS_SELECTOR, "#ordersBody tr")) > 0


@pytest.mark.suite("agent")
@pytest.mark.scenario("FLUX-AGT-03")
def test_agent_submits_order_visible_for_client(driver):
    """L'agent crée une commande visible côté client."""
    login_as(driver, ACCOUNTS["agent"], expect_url_contains="agent.html")
    submit_agent_order(driver)
    logout(driver)
    login_as(driver, ACCOUNTS["client"], expect_url_contains="compte.html")
    wait_client_orders_loaded(driver)
    assert len(driver.find_elements(By.CSS_SELECTOR, "#ordersBody tr")) > 0


@pytest.mark.suite("chat")
@pytest.mark.scenario("FLUX-CHT-01")
def test_admin_chat_moderation_panel(driver):
    """L'admin accède au chat et voit la modération (Valider / Refuser)."""
    login_as(driver, ACCOUNTS["admin"], expect_url_contains="admin.html")
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "chat")
    wait_admin_chat_ready(driver)
    assert find_chat_moderation_button(driver)
    reply = driver.find_element(By.ID, "adminChatReplyForm")
    assert reply.find_element(By.CSS_SELECTOR, "textarea[name='message']")


@pytest.mark.suite("stock")
@pytest.mark.scenario("FLUX-STK-03")
def test_admin_stock_alerts_panel(driver):
    """L'admin ouvre Stock & achats et voit le panneau alertes."""
    login_as(driver, ACCOUNTS["admin"], expect_url_contains="admin.html")
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "stock")
    wait_stock_alerts_panel(driver)
    assert driver.find_element(By.ID, "stockReceiveForm")
    assert driver.find_element(By.ID, "stockMovementsBody")
