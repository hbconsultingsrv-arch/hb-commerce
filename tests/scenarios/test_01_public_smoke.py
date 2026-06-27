"""Smoke tests — pages publiques."""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import BASE_URL, EXPLICIT_WAIT


@pytest.mark.suite("public")
@pytest.mark.scenario("FLUX-PUB-01")
def test_homepage_loads(driver):
    """La page d'accueil se charge avec le titre HB Commerce."""
    driver.get(BASE_URL)
    assert "HB Commerce" in driver.title
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".site-nav, .nav"))
    )


@pytest.mark.suite("public")
@pytest.mark.scenario("FLUX-PUB-02")
def test_nav_plus_menu_present(driver):
    """Le menu déroulant Plus regroupe Contact, FAQ et Brochure."""
    driver.get(BASE_URL)
    trigger = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".nav-more-trigger"))
    )
    trigger.click()
    menu = driver.find_element(By.CSS_SELECTOR, ".nav-more-menu")
    assert menu.is_displayed()
    links = [a.get_attribute("href") or "" for a in menu.find_elements(By.TAG_NAME, "a")]
    assert any("contact" in href or "#contact" in href for href in links)
    assert any("faq" in href for href in links)


@pytest.mark.suite("public")
@pytest.mark.scenario("FLUX-PUB-03")
def test_catalog_page_loads(driver):
    """Le catalogue produits est accessible."""
    driver.get(f"{BASE_URL}produits.html")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "body"))
    )
    assert "produit" in driver.title.lower() or "catalogue" in driver.page_source.lower()


@pytest.mark.suite("public")
@pytest.mark.scenario("FLUX-PUB-04")
def test_login_page_form(driver):
    """La page de connexion affiche le formulaire e-mail / mot de passe."""
    driver.get(f"{BASE_URL}login.html")
    form = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.ID, "loginForm"))
    )
    assert form.find_element(By.CSS_SELECTOR, 'input[name="email"]')
    assert form.find_element(By.CSS_SELECTOR, 'input[name="password"]')
