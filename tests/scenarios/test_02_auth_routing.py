"""Tests routing auth par rôle."""

import pytest

from tests.config import ACCOUNTS
from tests.helpers.auth import login_as


@pytest.mark.suite("auth")
@pytest.mark.scenario("FLUX-AUTH-01")
def test_admin_redirects_to_admin(driver):
    """Un admin arrive sur admin.html après connexion."""
    url = login_as(driver, ACCOUNTS["admin"], expect_url_contains="admin.html")
    assert "admin.html" in url


@pytest.mark.suite("auth")
@pytest.mark.scenario("FLUX-AUTH-02")
def test_agent_redirects_to_agent_space(driver):
    """Un agent commercial arrive sur agent.html."""
    url = login_as(driver, ACCOUNTS["agent"], expect_url_contains="agent.html")
    assert "agent.html" in url


@pytest.mark.suite("auth")
@pytest.mark.scenario("FLUX-AUTH-03")
def test_client_redirects_to_compte(driver):
    """Un client arrive sur compte.html."""
    url = login_as(driver, ACCOUNTS["client"], expect_url_contains="compte.html")
    assert "compte.html" in url


@pytest.mark.suite("auth")
@pytest.mark.scenario("FLUX-AUTH-04")
def test_super_root_redirects(driver):
    """Le super root arrive sur super-root.html."""
    url = login_as(driver, ACCOUNTS["super_root"], expect_url_contains="super-root.html")
    assert "super-root.html" in url
