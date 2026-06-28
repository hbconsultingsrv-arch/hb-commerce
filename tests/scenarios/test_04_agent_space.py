"""Espace agent commercial."""

import pytest
from selenium.webdriver.common.by import By

from tests.config import ACCOUNTS
from tests.helpers.admin_ui import open_admin_nav_tab
from tests.helpers.agent_order import wait_agent_initialized, wait_agent_order_form_ready
from tests.helpers.auth import login_as


@pytest.mark.suite("agent")
@pytest.mark.scenario("FLUX-AGT-01")
def test_agent_orders_panel(driver):
    """L'agent voit Mes commandes avec création et suivi livreur."""
    login_as(driver, ACCOUNTS["agent"])
    wait_agent_initialized(driver)
    open_admin_nav_tab(driver, "commandes")
    tabs = driver.find_elements(By.CSS_SELECTOR, "#panel-commandes .section-tab")
    labels = [t.text.lower() for t in tabs]
    assert any("commande" in label for label in labels)


@pytest.mark.suite("agent")
@pytest.mark.scenario("FLUX-AGT-02")
def test_agent_create_order_tab(driver):
    """L'agent accède au formulaire Créer une commande."""
    login_as(driver, ACCOUNTS["agent"])
    wait_agent_order_form_ready(driver)
    form = driver.find_element(By.ID, "agentOrderForm")
    assert form.find_element(By.ID, "agentOrderClientSelect")
