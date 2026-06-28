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
    btn.click()
    panel = WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.ID, f"panel-{tab_id}"))
    )
    WebDriverWait(driver, timeout).until(lambda d: panel.get_attribute("hidden") is None)
    return panel


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
