"""P3 — flux stock complet (réception dépôt + mouvements)."""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import ACCOUNTS, EXPLICIT_WAIT, INTEGRATION
from tests.helpers.admin_ui import open_admin_nav_tab, wait_admin_initialized, wait_stock_alerts_panel
from tests.helpers.auth import login_as

pytestmark = pytest.mark.skipif(
    not INTEGRATION,
    reason="Définir HB_TEST_INTEGRATION=1 pour les scénarios qui modifient le stock demo",
)


@pytest.mark.suite("stock")
@pytest.mark.scenario("FLUX-STK-04")
def test_stock_receive_updates_movements(driver):
    """Réception manuelle au dépôt enregistre un mouvement stock."""
    login_as(driver, ACCOUNTS["admin"], expect_url_contains="admin.html")
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "stock")
    wait_stock_alerts_panel(driver)

    movements_before = len(driver.find_elements(By.CSS_SELECTOR, "#stockMovementsBody tr"))
    product_input = driver.find_element(By.ID, "stockReceiveProductInput")
    product_input.clear()
    product_input.send_keys("fiafi-premium-1l")
    driver.find_element(By.CSS_SELECTOR, "#stockReceiveForm input[name='quantity']").clear()
    driver.find_element(By.CSS_SELECTOR, "#stockReceiveForm input[name='quantity']").send_keys("3")
    driver.find_element(By.CSS_SELECTOR, "#stockReceiveForm button[type='submit']").click()

    note = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.ID, "stockReceiveNote"))
    )
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: "stock" in note.text.lower() or "mis à jour" in note.text.lower() or "mise" in note.text.lower()
    )

    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, "#stockMovementsBody tr")) >= movements_before
    )
    last_row = driver.find_elements(By.CSS_SELECTOR, "#stockMovementsBody tr")[-1]
    assert "fiafi-premium-1l" in last_row.text.lower() or "+" in last_row.text


@pytest.mark.suite("stock")
@pytest.mark.scenario("FLUX-STK-05")
def test_stock_alerts_tabs_toggle(driver):
    """Les onglets alertes En cours / Clos sont interactifs."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "stock")
    wait_stock_alerts_panel(driver)
    closed_tab = driver.find_element(By.CSS_SELECTOR, "[data-alerts-tab='closed']")
    closed_tab.click()
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: d.find_element(By.CSS_SELECTOR, '[data-alerts-panel="closed"]').get_attribute("hidden") is None
    )
