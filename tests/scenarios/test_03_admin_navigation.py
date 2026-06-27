"""Navigation admin RH."""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import ACCOUNTS, EXPLICIT_WAIT
from tests.helpers.auth import login_as


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-01")
def test_admin_sidebar_fournisseurs(driver):
    """L'admin accède à l'onglet Fournisseurs."""
    login_as(driver, ACCOUNTS["admin"])
    btn = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, '.admin-nav-item[data-tab="fournisseurs"]'))
    )
    btn.click()
    panel = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.visibility_of_element_located((By.ID, "panel-fournisseurs"))
    )
    assert not panel.get_attribute("hidden")


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-02")
def test_admin_sidebar_equipe(driver):
    """L'admin accède à Équipe HB (agents et livreurs)."""
    login_as(driver, ACCOUNTS["admin"])
    driver.find_element(By.CSS_SELECTOR, '.admin-nav-item[data-tab="equipe"]').click()
    panel = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.visibility_of_element_located((By.ID, "panel-equipe"))
    )
    assert not panel.get_attribute("hidden")
    tabs = panel.find_elements(By.CSS_SELECTOR, ".section-tab")
    labels = [t.text.lower() for t in tabs]
    assert any("agent" in label for label in labels)
    assert any("livreur" in label for label in labels)


@pytest.mark.suite("admin")
@pytest.mark.scenario("FLUX-ADM-03")
def test_admin_construction_panel(driver):
    """L'onglet Construction affiche le suivi et le bloc tests QA."""
    login_as(driver, ACCOUNTS["admin"])
    driver.find_element(By.CSS_SELECTOR, '.admin-nav-item[data-tab="construction"]').click()
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.visibility_of_element_located((By.ID, "panel-construction"))
    )
    assert driver.find_element(By.ID, "roadmapProgressHost")
    assert driver.find_element(By.ID, "qaReportHost")
