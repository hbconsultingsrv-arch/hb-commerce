"""P2 — panier, checkout, inscription, prix masqués."""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import ACCOUNTS, BASE_URL, EXPLICIT_WAIT
from tests.helpers.auth import login_as


@pytest.mark.suite("public")
@pytest.mark.scenario("FLUX-PUB-05")
def test_prices_hidden_before_login(driver):
    """Les prix catalogue sont masqués (xx) avant connexion."""
    driver.get(f"{BASE_URL}produits.html")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".product-card"))
    )
    cards = driver.find_elements(By.CSS_SELECTOR, ".product-card")
    assert cards
    page = driver.find_element(By.CSS_SELECTOR, "main, body").text
    assert "xx" in page.lower() or any("xx" in c.text.lower() for c in cards)


@pytest.mark.suite("public")
@pytest.mark.scenario("FLUX-PUB-06")
def test_prices_visible_after_client_login(driver):
    """Les prix sont visibles après connexion client."""
    login_as(driver, ACCOUNTS["client"])
    driver.get(f"{BASE_URL}produits.html")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".product-card"))
    )
    page = driver.find_element(By.CSS_SELECTOR, "main, body").text
    assert "€" in page


@pytest.mark.suite("commerce")
@pytest.mark.scenario("FLUX-COM-01")
def test_register_form_steps(driver):
    """La page inscription affiche le formulaire multi-étapes."""
    driver.get(f"{BASE_URL}register.html")
    form = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.ID, "registerForm"))
    )
    assert form.find_element(By.ID, "registerNext")
    assert len(driver.find_elements(By.CSS_SELECTOR, ".register-progress-step")) >= 3


@pytest.mark.suite("commerce")
@pytest.mark.scenario("FLUX-COM-02")
def test_cart_and_checkout_flow(driver):
    """Le client avec panier accède au checkout."""
    login_as(driver, ACCOUNTS["client"])
    driver.get(f"{BASE_URL}produits.html")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, ".product-card"))
    )
    driver.execute_script(
        """
        localStorage.setItem('hb_commerce_cart', JSON.stringify([{
          id: 'qa-test-product',
          name: 'QA Test Produit',
          slug: 'fiafi-premium-1l',
          price: 5.5,
          unit: 'litre',
          image_url: 'images/prenium.PNG',
          quantity: 2
        }]));
        """
    )
    driver.get(f"{BASE_URL}panier.html")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        lambda d: d.find_element(By.ID, "cartTable").get_attribute("hidden") is None
    )
    driver.get(f"{BASE_URL}checkout.html")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.ID, "checkoutForm"))
    )
    assert driver.find_element(By.CSS_SELECTOR, '#checkoutForm textarea[name="shipping_address"]')
