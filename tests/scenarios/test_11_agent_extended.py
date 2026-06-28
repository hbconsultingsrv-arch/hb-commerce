"""Agent — clients, prix, stock, chat, suivi livreur."""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import ACCOUNTS, EXPLICIT_WAIT
from tests.helpers.admin_ui import (
    open_admin_nav_tab,
    open_section_tab,
    open_tracking_modal_for_first_order,
    wait_admin_chat_ready,
    wait_admin_initialized,
    wait_agent_stock_alerts_ready,
    wait_agent_stock_ready,
)
from tests.helpers.agent_order import wait_agent_initialized
from tests.helpers.auth import login_as


@pytest.mark.suite("agent")
@pytest.mark.scenario("FLUX-AGT-04")
def test_agent_clients_list_and_create_form(driver):
    """L'agent voit ses clients et le formulaire Créer un client."""
    login_as(driver, ACCOUNTS["agent"], expect_url_contains="agent.html")
    wait_agent_initialized(driver)
    open_admin_nav_tab(driver, "clients")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, "#clientsBody tr")) > 0
    )
    open_section_tab(driver, "panel-clients", "creer")
    assert driver.find_element(By.ID, "adminClientForm")


@pytest.mark.suite("agent")
@pytest.mark.scenario("FLUX-AGT-05")
def test_agent_customer_prices_form(driver):
    """L'agent accède aux prix clients négociés."""
    login_as(driver, ACCOUNTS["agent"])
    wait_agent_initialized(driver)
    open_admin_nav_tab(driver, "prix")
    assert driver.find_element(By.ID, "adminCustomerPriceForm")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, "#adminPriceClientSelect option[value]")) > 0
    )


@pytest.mark.suite("agent")
@pytest.mark.scenario("FLUX-AGT-06")
def test_agent_stock_readonly_panel(driver):
    """L'agent consulte le stock en lecture seule."""
    login_as(driver, ACCOUNTS["agent"])
    wait_agent_initialized(driver)
    open_admin_nav_tab(driver, "stock")
    wait_agent_stock_ready(driver)
    assert len(driver.find_elements(By.CSS_SELECTOR, "#commercialStockBody tr")) > 0


@pytest.mark.suite("agent")
@pytest.mark.scenario("FLUX-AGT-09")
def test_agent_stock_alerts_readonly(driver):
    """L'agent voit les alertes stock en lecture seule."""
    login_as(driver, ACCOUNTS["agent"])
    wait_agent_initialized(driver)
    open_admin_nav_tab(driver, "stock")
    wait_agent_stock_alerts_ready(driver)
    assert not driver.find_elements(By.CSS_SELECTOR, "#commercialStockAlertsHost [data-close-alert]")

@pytest.mark.suite("agent")
@pytest.mark.scenario("FLUX-AGT-07")
def test_agent_chat_panel(driver):
    """L'agent accède au chat des sociétés assignées."""
    login_as(driver, ACCOUNTS["agent"])
    wait_agent_initialized(driver)
    open_admin_nav_tab(driver, "chat")
    wait_admin_chat_ready(driver)
    assert driver.find_element(By.ID, "adminChatReplyForm")


@pytest.mark.suite("agent")
@pytest.mark.scenario("FLUX-AGT-08")
def test_agent_tracking_modal(driver):
    """L'agent ouvre Suivi / livreur sur une commande client."""
    login_as(driver, ACCOUNTS["agent"])
    wait_agent_initialized(driver)
    open_admin_nav_tab(driver, "commandes")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "#ordersAdminBody [data-open-tracking]"))
    )
    open_tracking_modal_for_first_order(driver)
    assert driver.find_element(By.ID, "trackingModalForm")
