"""Espace agent commercial."""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import ACCOUNTS, EXPLICIT_WAIT
from tests.helpers.admin_ui import open_admin_nav_tab, open_section_tab
from tests.helpers.auth import login_as


@pytest.mark.suite("agent")
@pytest.mark.scenario("FLUX-AGT-01")
def test_agent_orders_panel(driver):
    """L'agent voit Mes commandes avec création et suivi livreur."""
    login_as(driver, ACCOUNTS["agent"])
    open_admin_nav_tab(driver, "commandes")
    tabs = driver.find_elements(By.CSS_SELECTOR, "#panel-commandes .section-tab")
    labels = [t.text.lower() for t in tabs]
    assert any("commande" in label for label in labels)


@pytest.mark.suite("agent")
@pytest.mark.scenario("FLUX-AGT-02")
def test_agent_create_order_tab(driver):
    """L'agent accède au formulaire Créer une commande."""
    login_as(driver, ACCOUNTS["agent"])
    open_admin_nav_tab(driver, "commandes")
    open_section_tab(driver, "panel-commandes", "creer")
    form = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.ID, "agentOrderForm"))
    )
    assert form.find_element(By.ID, "agentOrderClientSelect")
