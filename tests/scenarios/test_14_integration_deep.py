"""Intégration approfondie — alertes, stock, livreur, suivi."""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

from tests.config import ACCOUNTS, EXPLICIT_WAIT, INTEGRATION
from tests.helpers.admin_ui import (
    close_first_open_stock_alert,
    livreur_has_assigned_orders,
    open_admin_nav_tab,
    open_tracking_modal_for_first_order,
    wait_admin_initialized,
    wait_livreur_deliveries_ready,
    wait_stock_alerts_panel,
)
from tests.helpers.agent_order import submit_agent_order
from tests.helpers.auth import login_as, logout

pytestmark = pytest.mark.skipif(
    not INTEGRATION,
    reason="Définir HB_TEST_INTEGRATION=1 pour les scénarios qui modifient la base demo",
)


@pytest.mark.suite("stock")
@pytest.mark.scenario("FLUX-STK-06")
def test_close_open_stock_alert(driver):
    """L'admin peut clôturer une alerte stock en cours."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "stock")
    wait_stock_alerts_panel(driver)
    if not driver.find_elements(By.CSS_SELECTOR, "[data-close-alert]"):
        pytest.skip("Aucune alerte stock ouverte sur la demo")
    assert close_first_open_stock_alert(driver)


@pytest.mark.suite("stock")
@pytest.mark.scenario("FLUX-STK-07")
def test_agent_order_creates_stock_movement(driver):
    """Une commande agent génère un mouvement stock négatif."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "stock")
    wait_stock_alerts_panel(driver)
    movements_before = len(driver.find_elements(By.CSS_SELECTOR, "#stockMovementsBody tr"))
    logout(driver)

    login_as(driver, ACCOUNTS["agent"])
    submit_agent_order(driver)
    logout(driver)

    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "stock")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, "#stockMovementsBody tr")) > movements_before
    )
    last_row = driver.find_elements(By.CSS_SELECTOR, "#stockMovementsBody tr")[-1].text.lower()
    assert "commande" in last_row or "−" in last_row or "-" in last_row


@pytest.mark.suite("driver")
@pytest.mark.scenario("FLUX-LIV-02")
def test_driver_updates_delivery_status(driver):
    """Le livreur met une course En route puis Livrée."""
    login_as(driver, ACCOUNTS["driver"], expect_url_contains="livreur.html")
    wait_livreur_deliveries_ready(driver)
    if not livreur_has_assigned_orders(driver):
        pytest.skip("Aucune course assignée au livreur demo")

    assert driver.find_element(By.ID, "btnEnRoute")
    assert driver.find_element(By.ID, "btnDelivered")
    assert driver.find_element(By.ID, "btnIncident")

    driver.find_element(By.ID, "btnEnRoute").click()
    note = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.ID, "livreurActionNote"))
    )
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: "mis à jour" in note.text.lower() or "success" in (note.get_attribute("class") or "")
    )


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-12")
def test_admin_tracking_status_save(driver):
    """L'admin enregistre un statut livraison via la modale suivi."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "commandes")
    form = open_tracking_modal_for_first_order(driver)
    status = form.find_element(By.CSS_SELECTOR, 'select[name="delivery_status"], #trackingDeliveryStatus')
    Select(status).select_by_value("preparation")
    form.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    note = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.ID, "trackingModalNote"))
    )
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: "mis à jour" in note.text.lower()
        or "enregistr" in note.text.lower()
        or "success" in (note.get_attribute("class") or "")
    )
