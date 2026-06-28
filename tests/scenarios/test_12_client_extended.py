"""Client — profil, chat, facture."""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import ACCOUNTS, EXPLICIT_WAIT
from tests.helpers.auth import login_as
from tests.helpers.compte_ui import open_compte_tab, wait_client_orders_loaded


@pytest.mark.suite("client")
@pytest.mark.scenario("FLUX-CLI-03")
def test_client_profile_form(driver):
    """Le client accède à son profil société."""
    login_as(driver, ACCOUNTS["client"], expect_url_contains="compte.html")
    open_compte_tab(driver, "profil")
    form = WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.ID, "profileForm"))
    )
    assert form.find_element(By.CSS_SELECTOR, 'input[name="company"]')
    assert form.find_element(By.CSS_SELECTOR, 'input[name="siren"]')


@pytest.mark.suite("client")
@pytest.mark.scenario("FLUX-CLI-04")
def test_client_chat_panel(driver):
    """Le client accède au chat société."""
    login_as(driver, ACCOUNTS["client"])
    open_compte_tab(driver, "chat")
    assert driver.find_element(By.ID, "companyChatForm")
    WebDriverWait(driver, EXPLICIT_WAIT).until(
        EC.presence_of_element_located((By.ID, "companyChatHistory"))
    )


@pytest.mark.suite("client")
@pytest.mark.scenario("FLUX-CLI-05")
def test_client_invoice_button(driver):
    """Le client voit le bouton télécharger facture sur une commande."""
    login_as(driver, ACCOUNTS["client"])
    wait_client_orders_loaded(driver)
    buttons = driver.find_elements(By.CSS_SELECTOR, "#ordersBody [data-invoice]")
    assert buttons, "Aucune commande avec bouton facture"
