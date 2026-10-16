
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


URL = "http://localhost:5173"
TEST_WALLET = "0x1234567890123456789012345678901234567890"


@pytest.fixture
def driver():
    browser = webdriver.Chrome()

    browser.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {
            "source": f"""
                Object.defineProperty(window, 'ethereum', {{
                    configurable: true,
                    value: {{
                        request: async (args) => {{
                            if (args.method === 'eth_requestAccounts') {{
                                return ['{TEST_WALLET}'];
                            }}
                            if (args.method === 'eth_accounts') {{
                                return ['{TEST_WALLET}'];
                            }}
                            return [];
                        }}
                    }}
                }});
            """
        },
    )

    browser.get(URL)

    WebDriverWait(browser, 20).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )

    yield browser
    browser.quit()


def connect_test_wallet(driver):
    buttons = driver.find_elements(
        By.XPATH, '//button[contains(., "Connect Wallet")]'
    )

    if buttons:
        buttons[0].click()

    WebDriverWait(driver, 5).until(
        EC.presence_of_element_located(
            (By.CLASS_NAME, "disconnect-btn")
        )
    )


def fill_pet_form(driver):
    fields = [
        ('input[placeholder="เช่น Mochi"]', "Mochi"),
        ('input[placeholder="เช่น Dog / Cat"]', "Dog"),
        ('input[placeholder="เช่น Shih Tzu"]', "Shih Tzu"),
        ('input[placeholder="หมายเลข Microchip"]', "TEST123456"),
    ]

    for selector, value in fields:
        driver.find_element(By.CSS_SELECTOR, selector).send_keys(value)


def click_register(driver):
    locator = (
        By.XPATH,
        "//button[contains(., 'Register Pet')]"
    )

    button = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located(locator)
    )

    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center'});",
        button
    )

    WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable(locator)
    )

    button = driver.find_element(*locator)

    driver.execute_script(
        "arguments[0].click();",
        button
    )


def check_alert(driver, expected_text):
    alert = WebDriverWait(driver, 5).until(
        EC.alert_is_present()
    )

    actual_text = alert.text
    alert.accept()

    assert expected_text in actual_text, (
        f"Expected alert: {expected_text}, "
        f"but got: {actual_text}"
    )


def test_tc01_connect_wallet_ui(driver):
    connect_test_wallet(driver)

    connected_button = driver.find_element(
        By.CSS_SELECTOR, ".wallet-btn.connected"
    )

    assert TEST_WALLET[:6] in connected_button.text
    assert TEST_WALLET[-4:] in connected_button.text


def test_tc03_missing_pet_information(driver):
    connect_test_wallet(driver)
    click_register(driver)
    check_alert(driver, "กรุณากรอกข้อมูลให้ครบ")


def test_tc04_register_without_image(driver):
    connect_test_wallet(driver)
    fill_pet_form(driver)
    click_register(driver)
    check_alert(driver, "กรุณาเลือกรูปสัตว์เลี้ยง")


def test_tc05_pet_id_search_field_exists(driver):
    field = driver.find_element(
        By.CSS_SELECTOR, 'input[placeholder="กรอกหมายเลข Pet ID"]'
    )

    button = driver.find_element(
        By.XPATH, '//button[contains(., "ตรวจสอบข้อมูล")]'
    )

    assert field.is_displayed()
    assert button.is_displayed()


def test_tc07_image_file_input_exists(driver):
    file_input = driver.find_element(
        By.CSS_SELECTOR, 'input[type="file"][accept="image/*"]'
    )

    assert file_input.is_displayed()


def test_tc10_pet_card_button_is_in_page_code(driver):
    pet_result = driver.find_elements(
        By.CSS_SELECTOR, ".pet-result"
    )

    if not pet_result:
        pytest.skip("ต้องค้นหาสัตว์เลี้ยงที่มีอยู่ก่อนทดสอบ Pet Card")

    pet_card_button = pet_result[0].find_elements(
        By.XPATH, './/button[contains(., "Pet Card")]'
    )

    assert pet_card_button
    assert pet_card_button[0].is_displayed()


def test_tc11_qr_code_is_rendered(driver):
    qr = driver.find_elements(
        By.CSS_SELECTOR, ".hero-qr-code svg"
    )

    assert qr
    assert qr[0].is_displayed()


def test_tc12_disconnect_wallet(driver):
    connect_test_wallet(driver)

    driver.find_element(
        By.CSS_SELECTOR, ".disconnect-btn"
    ).click()

    check_alert(driver, "ยกเลิกการเชื่อมต่อ Wallet แล้ว")

    WebDriverWait(driver, 5).until(
        EC.presence_of_element_located(
            (By.XPATH, '//button[contains(., "Connect Wallet")]')
        )
    )

    assert driver.find_elements(
        By.CLASS_NAME, "disconnect-btn"
    ) == []
