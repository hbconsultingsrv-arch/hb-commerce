"""Helpers navigation admin / agent."""

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import EXPLICIT_WAIT


def wait_section_tabs_bound(driver, timeout=EXPLICIT_WAIT):
    """Attend que bindSectionTabs() ait attaché les clics (évite race initAdmin async)."""
    WebDriverWait(driver, timeout).until(
        lambda d: d.execute_script(
            'return document.querySelector("[data-section-tabs][data-bound=\\"1\\"]") !== null;'
        )
    )


def open_admin_nav_tab(driver, tab_id, timeout=EXPLICIT_WAIT):
    btn = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, f'.admin-nav-item[data-tab="{tab_id}"]'))
    )
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
    try:
        btn.click()
    except Exception:
        driver.execute_script("arguments[0].click();", btn)
    WebDriverWait(driver, timeout).until(
        lambda d: d.execute_script(
            f"return document.getElementById('panel-{tab_id}')?.hidden === false;"
        )
    )
    return driver.find_element(By.ID, f"panel-{tab_id}")


def open_section_tab(driver, panel_id, section, timeout=EXPLICIT_WAIT):
    wait_section_tabs_bound(driver, timeout)
    tab = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable(
            (By.CSS_SELECTOR, f"#{panel_id} .section-tab[data-section='{section}']")
        )
    )
    tab.click()
    panel = WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, f"#{panel_id} [data-section-panel='{section}']")
        )
    )
    WebDriverWait(driver, timeout).until(lambda d: panel.get_attribute("hidden") is None)
    return panel


def wait_admin_initialized(driver, timeout=EXPLICIT_WAIT):
    """Attend que initAdmin ait chargé les données (commandes admin)."""
    WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.ID, "ordersAdminBody"))
    )
    WebDriverWait(driver, timeout).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, "#ordersAdminBody tr")) > 0
    )


def wait_stock_alerts_panel(driver, timeout=EXPLICIT_WAIT):
    WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "#stockAlertsPanel .stock-alerts-panel h2"))
    )
    assert "Alertes stock" in driver.find_element(
        By.CSS_SELECTOR, "#stockAlertsPanel .stock-alerts-panel h2"
    ).text
    assert driver.find_elements(By.CSS_SELECTOR, "[data-alerts-tab='open']")


def wait_admin_chat_ready(driver, timeout=EXPLICIT_WAIT):
    WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "#adminChatList .chat-thread-item"))
    )
    WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "#adminChatHistory .chat-message"))
    )


def find_chat_moderation_button(driver, timeout=EXPLICIT_WAIT):
    approve = driver.find_elements(By.CSS_SELECTOR, "[data-chat-approve]")
    if approve:
        return approve[0]
    for thread in driver.find_elements(By.CSS_SELECTOR, "#adminChatList .chat-thread-item"):
        thread.click()
        WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#adminChatHistory"))
        )
        approve = driver.find_elements(By.CSS_SELECTOR, "[data-chat-approve]")
        if approve:
            return approve[0]
    WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "[data-chat-approve]"))
    )
    return driver.find_element(By.CSS_SELECTOR, "[data-chat-approve]")
