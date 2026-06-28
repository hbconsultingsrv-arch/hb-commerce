"""Helpers connexion HB Commerce."""

import time

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from tests.config import BASE_URL, EXPLICIT_WAIT, PASSWORD


def open_login(driver):
    driver.get(f"{BASE_URL}login.html")


def submit_login(driver, email, password=None):
    password = password or PASSWORD
    wait = WebDriverWait(driver, EXPLICIT_WAIT)
    wait.until(EC.presence_of_element_located((By.ID, "loginForm")))
    driver.find_element(By.CSS_SELECTOR, '#loginForm input[name="email"]').clear()
    driver.find_element(By.CSS_SELECTOR, '#loginForm input[name="email"]').send_keys(email)
    driver.find_element(By.CSS_SELECTOR, '#loginForm input[name="password"]').clear()
    driver.find_element(By.CSS_SELECTOR, '#loginForm input[name="password"]').send_keys(password)
    driver.find_element(By.CSS_SELECTOR, '#loginForm button[type="submit"]').click()


def _login_error_message(driver):
    try:
        note = driver.find_element(By.ID, "loginNote")
        text = (note.text or "").strip()
        if not text:
            return ""
        classes = note.get_attribute("class") or ""
        if "error" not in classes and "infinite recursion" not in text.lower():
            return ""
        if "infinite recursion" in text.lower():
            return (
                f"{text} — Exécutez supabase/migration-fix-profiles-rls-recursion.sql "
                "dans Supabase SQL Editor."
            )
        return text
    except Exception:
        pass
    return ""


def wait_after_login(driver, forbidden_fragment="login.html", timeout=EXPLICIT_WAIT):
    """Attend la redirection post-auth ou remonte l'erreur affichée."""
    end = time.time() + timeout
    while time.time() < end:
        url = driver.current_url
        if forbidden_fragment not in url:
            return url
        err = _login_error_message(driver)
        if err:
            raise AssertionError(f"Connexion refusée : {err}")
        time.sleep(0.5)
    err = _login_error_message(driver)
    if err:
        raise AssertionError(f"Connexion refusée : {err}")
    raise TimeoutError(
        f"Timeout connexion ({timeout}s) — URL : {driver.current_url}. "
        "Vérifiez Supabase (projet actif, seed demo, config.js)."
    )


def login_as(driver, email, password=None, expect_url_contains=None):
    open_login(driver)
    submit_login(driver, email, password)
    url = wait_after_login(driver)
    if expect_url_contains and expect_url_contains not in url:
        raise AssertionError(f"Attendu '{expect_url_contains}' dans {url}")
    return url
