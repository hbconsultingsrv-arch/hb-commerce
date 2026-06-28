"""Helpers espace client compte.html."""

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import EXPLICIT_WAIT


def open_compte_tab(driver, tab_id, timeout=EXPLICIT_WAIT):
    tab = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, f"#compteTabs .admin-tab[data-tab='{tab_id}']"))
    )
    tab.click()
    panel = WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.ID, f"panel-{tab_id}"))
    )
    if tab_id != "commandes":
        WebDriverWait(driver, timeout).until(lambda d: panel.get_attribute("hidden") is None)
    return panel


def wait_client_orders_loaded(driver, timeout=EXPLICIT_WAIT):
    WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.ID, "ordersBody"))
    )
    WebDriverWait(driver, timeout).until(
        lambda d: (
            d.find_element(By.ID, "ordersTable").get_attribute("hidden") is None
            or d.find_element(By.ID, "ordersEmpty").get_attribute("hidden") is None
        )
    )
