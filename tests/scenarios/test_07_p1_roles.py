"""P1 — fournisseur, livreur, super root."""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

from tests.config import ACCOUNTS, EXPLICIT_WAIT
from tests.helpers.auth import login_as


@pytest.mark.suite("auth")
@pytest.mark.scenario("FLUX-AUTH-05")
def test_supplier_redirects_to_supplier_space(driver):
    """Le fournisseur arrive sur supplier.html."""
    url = login_as(driver, ACCOUNTS["supplier"], expect_url_contains="supplier.html")
    assert "supplier.html" in url


@pytest.mark.suite("auth")
@pytest.mark.scenario("FLUX-AUTH-06")
def test_driver_redirects_to_livreur(driver):
    """Le livreur arrive sur livreur.html."""
    url = login_as(driver, ACCOUNTS["driver"], expect_url_contains="livreur.html")
    assert "livreur.html" in url


@pytest.mark.suite("supplier")
@pytest.mark.scenario("FLUX-SUP-01")
def test_supplier_stock_and_orders_tabs(driver):
    """Le fournisseur consulte stock et commandes HB."""
    login_as(driver, ACCOUNTS["supplier"])
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.ID, "supplierPanel"))
    )
    tabs = driver.find_elements(By.CSS_SELECTOR, "#supplierPanel .section-tab")
    labels = [t.text.lower() for t in tabs]
    assert any("stock" in label for label in labels)
    assert any("commande" in label for label in labels)
    driver.find_element(By.CSS_SELECTOR, '#supplierPanel .section-tab[data-section="commandes"]').click()
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, '#supplierPanel [data-section-panel="commandes"]'))
    )


@pytest.mark.suite("driver")
@pytest.mark.scenario("FLUX-LIV-01")
def test_driver_deliveries_dashboard(driver):
    """Le livreur voit le tableau de bord courses (liste ou état vide)."""
    login_as(driver, ACCOUNTS["driver"], expect_url_contains="livreur.html")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.invisibility_of_element_located((By.CSS_SELECTOR, "#livreurLoading:not([hidden])"))
    )
    assert driver.find_element(By.ID, "livreurKpi")
    layout_visible = driver.find_element(By.ID, "livreurLayout").get_attribute("hidden") is None
    empty_visible = driver.find_element(By.ID, "livreurEmpty").get_attribute("hidden") is None
    assert layout_visible or empty_visible


@pytest.mark.suite("super")
@pytest.mark.scenario("FLUX-SUP-02")
def test_super_root_team_list(driver):
    """Le super root voit la liste de l'équipe interne."""
    login_as(driver, ACCOUNTS["super_root"], expect_url_contains="admin.html")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "#panel-equipe #agentsBody tr, #panel-equipe #driversBody tr"))
    )
    roles = " ".join(
        d.text.lower()
        for d in driver.find_elements(By.CSS_SELECTOR, "#agentsBody tr, #driversBody tr")
    )
    assert "admin" in roles or "agent" in roles or "livreur" in roles


@pytest.mark.suite("driver")
@pytest.mark.scenario("FLUX-LIV-03")
def test_driver_delivery_filters(driver):
    """Le livreur filtre les courses (À livrer / En route / Livrées)."""
    login_as(driver, ACCOUNTS["driver"], expect_url_contains="livreur.html")
    from tests.helpers.admin_ui import wait_livreur_deliveries_ready

    wait_livreur_deliveries_ready(driver)
    for filt in ("pending", "transit", "done"):
        btn = driver.find_element(By.CSS_SELECTOR, f'[data-livreur-filter="{filt}"]')
        btn.click()
        WebDriverWait(driver, EXPLICIT_WAIT).until(
            lambda d, b=btn: "active" in (b.get_attribute("class") or "")
        )


@pytest.mark.suite("super")
@pytest.mark.scenario("FLUX-SUP-04")
def test_super_root_create_admin_form(driver):
    """Le super root ouvre le formulaire de création admin."""
    login_as(driver, ACCOUNTS["super_root"])
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, '#superRootTabs .admin-tab[data-section="nouveau"]'))
    ).click()
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: d.find_element(By.CSS_SELECTOR, '[data-section-panel="nouveau"]').get_attribute("hidden") is None
    )
    Select(driver.find_element(By.ID, "internalRoleSelect")).select_by_value("admin")
    assert driver.find_element(By.ID, "internalUserForm")


@pytest.mark.suite("super")
@pytest.mark.scenario("FLUX-SUP-03")
def test_super_root_create_livreur_form(driver):
    """Le super root peut ouvrir le formulaire de création livreur."""
    login_as(driver, ACCOUNTS["super_root"])
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, '#superRootTabs .admin-tab[data-section="nouveau"]'))
    ).click()
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: d.find_element(By.CSS_SELECTOR, '[data-section-panel="nouveau"]').get_attribute("hidden") is None
    )
    Select(driver.find_element(By.ID, "internalRoleSelect")).select_by_value("livreur")
    vehicle_wrap = driver.find_element(By.ID, "internalVehicleWrap")
    assert vehicle_wrap.get_attribute("hidden") is None
    assert driver.find_element(By.ID, "internalUserForm")
