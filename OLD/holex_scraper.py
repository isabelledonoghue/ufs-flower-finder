import requests
from bs4 import BeautifulSoup
from database import insert_data

flower_names = ["STOCK", "SNAPDRAGON", "SALAL", "DELPHINIUM", "ROSES", "CARNATIONS", "LISIANTHUS", "SCABIOSA", "MUMS", "RANUNCULUS", "ANEMONE", "EUCALYPTUS", "RUSCUS"]
# hardcode this for now - needs to be selected on frontend
delivery_date = "2024-07-08"
# stores all data
holex_flowers = {}


def holex_login():
    # define url and login credentials
    url = "https://holex.com/"
    username = "shop@uniflowershop.com"
    password = "HEXhappydayz5!"

    # session setup for maintaining login state
    session = requests.Session()

    # login to mayesh
    login_data = {
        "username": username,
        "password": password,
        "login": "Login"
    }
    login_response = session.post(f"{url}/login", data=login_data)

    # check login success
    if "Login" in login_response.text:
        print("Login failed. Check credentials.")
        return None
    
    print("Login successful")
    # return session information
    return session

def render_page_with_rendertron(url):
    rendertron_url = f"http://localhost:3000/render/{url}"
    response = requests.get(rendertron_url)
    if response.status_code == 200:
        return response.content
    else:
        print(f"Rendertron failed to render the page. Status code: {response.status_code}")
        return None

def scrape_holex():
    session = holex_login()
    if not session:
        return

    # navigate to product page
    product_page_url = "https://holex.com/en_US/All-products/Flowers/c/Flowers"
    rendered_content = render_page_with_rendertron(product_page_url)
    if not rendered_content:
        return
    
    soup = BeautifulSoup(rendered_content, 'html.parser')

    # scrape data
    flowers = []

    while True:
        # slect the product wrapper
        product_wrapper = soup.select_one('.product__listing product__grid favorite_list_plp')
        
        if product_wrapper:
            # find all product items within the wrapper
            product_items = product_wrapper.select('.product-item') 
            
            for item in product_items:
                flower_name = item.select_one(".flower-name-selector").text.strip()
                if any(name.lower() in flower_name.lower() for name in flower_names):
                    flowers.append(get_holex_data(item))

            # check for next page link
            next_page = soup.select_one("a.page-link")
            if not next_page: 
                break
            
            next_url = next_page['href']
            print(f"Next URL: {next_url}")
            rendered_content = render_page_with_rendertron(next_url)
            if not rendered_content:
                break
            soup = BeautifulSoup(rendered_content, 'html.parser')
        else:
            print("Product wrapper 'view-list' not found.")
            break
    
    print(f"Complete flower list: {flowers}")
    insert_data(flowers)


def get_holex_data(item):
    flower_name = item.select_one("CSS_SELECTOR_FOR_FLOWER_NAME").text.strip()
    flower_image = item.select_one('thumb')['href'].strip()
    price = item.select_one("CSS_SELECTOR_FOR_PRICE").text.strip()
    color = item.select_one("CSS_SELECTOR_FOR_COLOR").text.strip()
    height = item.select_one("CSS_SELECTOR_FOR_HEIGHT").text.strip()
    seller = "Holex"
    farm = item.select_one("CSS_SELECTOR_FOR_FARM").text.strip()
    availability_bunches = item.select_one("CSS_SELECTOR_FOR_AVAILABILITY_BUNCHES").text.strip()
    availability_stems = item.select_one("CSS_SELECTOR_FOR_AVAILABILITY_STEMS").text.strip()
    delivery_date = item.select_one("CSS_SELECTOR_FOR_DELIVERY_DATE").text.strip()
    date_available = item.select_one("CSS_SELECTOR_FOR_DATE_AVAILABLE").text.strip()

    print(f"individual flower info: {flower_name, flower_image, price, color, height, seller, farm, availability_bunches, availability_stems, delivery_date, date_available}")
    return (
        flower_name, flower_image, price, color, height, seller, farm, availability_bunches, availability_stems, delivery_date, date_available
    )

if __name__ == "__main__":
    scrape_holex()