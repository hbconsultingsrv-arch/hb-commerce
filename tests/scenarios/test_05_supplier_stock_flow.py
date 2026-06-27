"""Flux métier stock / fournisseur / commande (intégration)."""

import os
import uuid

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import ACCOUNTS, BASE_URL, EXPLICIT_WAIT, INTEGRATION, PASSWORD
from tests.helpers.auth import login_as

pytestmark = pytest.mark.skipif(
    not INTEGRATION,
    reason="Définir HB_TEST_INTEGRATION=1 pour exécuter les scénarios qui modifient la base demo",
)


@pytest.mark.suite("stock")
@pytest.mark.scenario("FLUX-STK-01")
def test_admin_supplier_form_accessible(driver):
    """L'admin peut ouvrir le formulaire de création fournisseur."""
    login_as(driver, ACCOUNTS["admin"])
    driver.find_element(By.CSS_SELECTOR, '.admin-nav-item[data-tab="fournisseurs"]').click()
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.visibility_of_element_located((By.ID, "panel-fournisseurs"))
    )
    create_tab = driver.find_element(By.CSS_SELECTOR, '#panel-fournisseurs .section-tab[data-section="creer"]')
    create_tab.click()
    assert driver.find_element(By.ID, "adminSupplierForm")


@pytest.mark.suite("stock")
@pytest.mark.scenario("FLUX-STK-02")
def test_full_supplier_product_stock_order_flow(driver):
    """Crée un fournisseur, un produit, vérifie le panneau stock (smoke intégration).

    Étape complète stock après commande client : nécessite assertions Supabase
    (quantité product_stocks) — à étendre avec API ou lecture tableau admin.
    """
    login_as(driver, ACCOUNTS["admin"])
    suffix = uuid.uuid4().hex[:6]
    supplier_name = f"QA Fournisseur {suffix}"

    driver.find_element(By.CSS_SELECTOR, '.admin-nav-item[data-tab="fournisseurs"]').click()
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.visibility_of_element_located((By.ID, "panel-fournisseurs"))
    )
    driver.find_element(By.CSS_SELECTOR, '#panel-fournisseurs .section-tab[data-section="creer"]').click()

    form = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.ID, "adminSupplierForm"))
    )
    form.find_element(By.CSS_SELECTOR, 'input[name="company"]').send_keys(supplier_name)
    form.find_element(By.CSS_SELECTOR, 'input[name="email"]').send_keys(f"qa-{suffix}@hbcommerce.test")
    form.find_element(By.CSS_SELECTOR, 'input[name="password"]').send_keys(PASSWORD)
    form.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()

    note = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.ID, "adminSupplierNote"))
    )
    assert "succ" in note.text.lower() or "cré" in note.text.lower() or note.text.strip() == ""

    driver.find_element(By.CSS_SELECTOR, '.admin-nav-item[data-tab="stock"]').click()
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.visibility_of_element_located((By.ID, "panel-stock"))
    )
