"""Espace agent commercial."""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import ACCOUNTS, EXPLICIT_WAIT
from tests.helpers.auth import login_as


@pytest.mark.suite("agent")
@pytest.mark.scenario("FLUX-AGT-01")
def test_agent_orders_panel(driver):
    """L'agent voit Mes commandes avec création et suivi livreur."""
    login_as(driver, ACCOUNTS["agent"])
    driver.find_element(By.CSS_SELECTOR, '.admin-nav-item[data-tab="commandes"]').click()
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.visibility_of_element_located((By.ID, "panel-commandes"))
    )
    tabs = driver.find_elements(By.CSS_SELECTOR, '#panel-commandes .section-tab')
    labels = [t.text.lower() for t in tabs]
    assert any("commande" in label for label in labels)


@pytest.mark.suite("agent")
@pytest.mark.scenario("FLUX-AGT-02")
def test_agent_create_order_tab(driver):
    """L'agent accède au formulaire Créer une commande."""
    login_as(driver, ACCOUNTS["agent"])
    driver.find_element(By.CSS_SELECTOR, '.admin-nav-item[data-tab="commandes"]').click()
    create_tab = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, '#panel-commandes .section-tab[data-section="creer"]'))
    )
    create_tab.click()
    form = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.visibility_of_element_located((By.ID, "agentOrderForm"))
    )
    assert form.is_displayed()
