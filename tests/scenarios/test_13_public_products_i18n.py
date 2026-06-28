"""Public — fiche technique, dispo stock, i18n."""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import BASE_URL, EXPLICIT_WAIT
from tests.helpers.admin_ui import switch_site_language


@pytest.mark.suite("public")
@pytest.mark.scenario("FLUX-PUB-07")
def test_product_card_shows_availability(driver):
    """Les cartes produits affichent la disponibilité stock."""
    driver.get(f"{BASE_URL}produits.html")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".product-card"))
    )
    card = driver.find_element(By.CSS_SELECTOR, ".product-card")
    meta = card.text.lower()
    assert "dispo" in meta or "stock" in meta or "commande" in meta


@pytest.mark.suite("public")
@pytest.mark.scenario("FLUX-PUB-08")
def test_product_technical_sheet_modal(driver):
    """La fiche technique s'ouvre depuis le catalogue."""
    driver.get(f"{BASE_URL}produits.html")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".btn-tech-sheet"))
    )
    btn = driver.find_element(By.CSS_SELECTOR, ".btn-tech-sheet")
    driver.execute_script("arguments[0].click();", btn)
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: d.find_element(By.ID, "productTechModal").get_attribute("hidden") is None
    )
    assert driver.find_element(By.ID, "productTechModalBody").text.strip()


@pytest.mark.suite("public")
@pytest.mark.scenario("FLUX-PUB-09")
def test_i18n_german_switch(driver):
    """Le sélecteur de langue bascule en allemand."""
    switch_site_language(driver, "de")
    assert driver.execute_script("return getLang();") == "de"


@pytest.mark.suite("public")
@pytest.mark.scenario("FLUX-PUB-11")
def test_i18n_french_default(driver):
    """Le français reste la langue par défaut."""
    switch_site_language(driver, "fr")
    assert driver.execute_script("return getLang();") == "fr"


@pytest.mark.suite("public")
@pytest.mark.scenario("FLUX-PUB-10")
def test_i18n_english_switch(driver):
    """Le sélecteur de langue bascule en anglais."""
    switch_site_language(driver, "en")
    assert driver.execute_script("return getLang();") == "en"
