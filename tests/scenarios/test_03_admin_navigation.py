"""Navigation admin RH."""

import pytest
from selenium.webdriver.common.by import By

from tests.config import ACCOUNTS
from tests.helpers.admin_ui import open_admin_nav_tab, wait_admin_initialized
from tests.helpers.auth import login_as


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-01")
def test_admin_sidebar_fournisseurs(driver):
    """L'admin accède à l'onglet Fournisseurs."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "fournisseurs")
    panel = driver.find_element(By.ID, "panel-fournisseurs")
    assert panel.get_attribute("hidden") is None


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-02")
def test_admin_sidebar_equipe(driver):
    """L'admin accède à Équipe HB (agents et livreurs)."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    panel = open_admin_nav_tab(driver, "equipe")
    tabs = panel.find_elements(By.CSS_SELECTOR, ".section-tab")
    labels = [t.text.lower() for t in tabs]
    assert any("agent" in label for label in labels)
    assert any("livreur" in label for label in labels)


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-03")
def test_admin_construction_panel(driver):
    """L'onglet Construction affiche le suivi et le bloc tests QA."""
    login_as(driver, ACCOUNTS["admin"])
    wait_admin_initialized(driver)
    open_admin_nav_tab(driver, "construction")
    assert driver.find_element(By.ID, "roadmapProgressHost")
    assert driver.find_element(By.ID, "qaReportHost")
