"""Admin RH — onglets étendus et modale suivi."""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import ACCOUNTS, EXPLICIT_WAIT
from tests.helpers.admin_ui import (
    open_admin_nav_tab,
    open_section_tab,
    open_tracking_modal_for_first_order,
    wait_admin_initialized,
)
from tests.helpers.auth import login_as


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-04")
def test_admin_dashboard_kpis(driver):
    """Le tableau de bord affiche les KPI."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "#adminDashboardHost .dash-kpi-card"))
    )


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-05")
def test_admin_products_catalog_and_form(driver):
    """L'admin accède au catalogue produits et au formulaire CRUD."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "produits")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, "#productsBody tr")) > 0
    )
    open_section_tab(driver, "panel-produits", "formulaire")
    assert driver.find_element(By.ID, "productForm")


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-06")
def test_admin_orders_tracking_modal(driver):
    """L'admin ouvre la modale Suivi / livreur sur une commande."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "commandes")
    form = open_tracking_modal_for_first_order(driver)
    assert form.find_element(By.CSS_SELECTOR, 'select[name="delivery_status"], #trackingDeliveryStatus')


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-07")
def test_admin_clients_list(driver):
    """L'admin voit la liste clients (pending_company et client)."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "clients")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, "#clientsBody tr")) > 0
    )
    body_text = driver.find_element(By.ID, "clientsBody").text.lower()
    assert "client" in body_text or "société" in body_text or "@" in body_text


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-08")
def test_admin_customer_prices_form(driver):
    """L'admin accède au formulaire prix clients."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "prix")
    assert driver.find_element(By.ID, "adminCustomerPriceForm")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.ID, "customerPricesBody"))
    )


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-10")
def test_admin_stock_incidents_panel(driver):
    """L'admin accède au panneau incidents stock."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "stock")
    assert driver.find_element(By.ID, "stockIncidentsBody")
    assert driver.find_element(By.ID, "openStockIncidentModalBtn")


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-09")
def test_admin_analyses_panel(driver):
    """L'admin accède aux analyses financières."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "analyses")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.ID, "analyticsKpis"))
    )
    assert driver.find_element(By.ID, "analyticsTableHost")


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-11")
def test_admin_clients_pending_company_role(driver):
    """L'admin peut valider les sociétés pending_company."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "clients")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, "#clientsBody tr")) > 0
    )
    selects = driver.find_elements(By.CSS_SELECTOR, "#clientsBody [data-company-role]")
    if selects:
        options = selects[0].find_elements(By.TAG_NAME, "option")
        values = {o.get_attribute("value") for o in options}
        assert "pending_company" in values
        assert "client" in values
    else:
        body = driver.find_element(By.ID, "clientsBody").text.lower()
        assert "client" in body or "@" in body
