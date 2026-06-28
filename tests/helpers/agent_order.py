"""Helpers création commande agent."""

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

from tests.config import EXPLICIT_WAIT
from tests.helpers.admin_ui import open_admin_nav_tab, open_section_tab, wait_section_tabs_bound


def wait_agent_initialized(driver, timeout=EXPLICIT_WAIT):
    wait_section_tabs_bound(driver, timeout)
    WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, '.admin-nav-item[data-tab="commandes"]'))
    )


def wait_agent_order_form_ready(driver, timeout=EXPLICIT_WAIT):
    wait_agent_initialized(driver, timeout)
    open_admin_nav_tab(driver, "commandes", timeout)
    open_section_tab(driver, "panel-commandes", "creer", timeout)
    WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located((By.ID, "agentOrderForm"))
    )
    WebDriverWait(driver, timeout).until(
        lambda d: any(
            o.get_attribute("value")
            for o in d.find_elements(By.CSS_SELECTOR, "#agentOrderClientSelect option")
        )
    )
    WebDriverWait(driver, timeout).until(
        lambda d: len(
            d.find_elements(
                By.CSS_SELECTOR,
                "#agentOrderLines .agent-order-product option[value]:not([value=''])",
            )
        )
        > 0
    )


def submit_agent_order(driver, timeout=EXPLICIT_WAIT):
    wait_agent_order_form_ready(driver, timeout)
    product_select = driver.find_element(By.CSS_SELECTOR, "#agentOrderLines .agent-order-product")
    options = [
        o
        for o in product_select.find_elements(By.TAG_NAME, "option")
        if o.get_attribute("value")
    ]
    assert options, "Aucun produit disponible pour la commande agent"
    Select(product_select).select_by_value(options[0].get_attribute("value"))
    driver.execute_script(
        "arguments[0].dispatchEvent(new Event('change', { bubbles: true }));",
        product_select,
    )
    WebDriverWait(driver, timeout).until(
        lambda d: float(
            d.find_element(By.CSS_SELECTOR, "#agentOrderLines .agent-order-price").get_attribute("value")
            or 0
        )
        > 0
    )
    address = driver.find_element(By.ID, "agentOrderAddressInput")
    if not (address.get_attribute("value") or "").strip():
        address.send_keys("10 rue Test QA, Paris")
    form = driver.find_element(By.ID, "agentOrderForm")
    submit_btn = form.find_element(By.CSS_SELECTOR, "button[type='submit']")
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", submit_btn)
    try:
        submit_btn.click()
    except Exception:
        driver.execute_script("arguments[0].requestSubmit();", form)

    def _order_created_or_error(d):
        liste_tab = d.find_element(By.CSS_SELECTOR, '#panel-commandes .section-tab[data-section="liste"]')
        if "active" in (liste_tab.get_attribute("class") or ""):
            return True
        note_el = d.find_element(By.ID, "agentOrderNote")
        text = (note_el.text or "").strip().lower()
        classes = note_el.get_attribute("class") or ""
        if "error" in classes and text:
            raise AssertionError(f"Création commande refusée : {note_el.text}")
        return (
            "créée" in text
            or "creee" in text
            or ("commande" in text and "visible" in text)
            or ("success" in classes and text)
        )

    WebDriverWait(driver, timeout).until(_order_created_or_error)
