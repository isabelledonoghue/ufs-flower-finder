import requests
from bs4 import BeautifulSoup
from database import insert_data

flower_names = ["STOCK", "SNAPDRAGON", "SALAL", "DELPHINIUM", "ROSES", "CARNATIONS", "LISIANTHUS", "SCABIOSA", "MUMS", "RANUNCULUS", "ANEMONE", "EUCALYPTUS", "RUSCUS"]
# hardcode this for now - needs to be selected on frontend
delivery_date = "2024-07-08"
# stores all data
mayesh_flowers = {}

# CHANGE rendertron for renders js content
rendertron_url = "https://render-tron.appspot.com/render"

# GENERAL LOGIN
def mayesh_login():
    # define url and login credentials
    url = "https://www.mayesh.com"
    username = "shop@uniflowershop.com"
    password = "MSHmorehappydayz5!"

    # session setup for maintaining login state
    session = requests.Session()

    # login to mayesh
    login_data = {
        "username": username,
        "password": password,
        "login": "Login"
    }
    login_response = session.post(f"{url}/login", data=login_data)
    print("Login successful")

    # check login success
    if "Login" in login_response.text:
        print("Login failed. Check credentials.")
        return None
    
    # return session information
    return session


# MAIN PAGE
# live & local, miami direct, farm direct boxlots
def scrape_main(session):
    # check session
    if not session:
        print("Login authentication failed.")
        return

    # RENDERTRON rendering
    # fetch rendered html
    render_params = {
        "url": f"https://www.mayesh.com/shop?perPage=100&sortBy=Name-ASC&pageNumb=1&date={delivery_date}&is_sales_rep=0&is_e_sales=0&criteria=%7B%7D&criteriaInt=%7B%7D&search=&s_search="
    }
    # hardcode date
    # https://www.mayesh.com/shop?perPage=100&sortBy=Name-ASC&pageNumb=1&date=2024-07-18&is_sales_rep=0&is_e_sales=0&criteria=%7B%7D&criteriaInt=%7B%7D&search=&s_search=
    render_response = requests.get(rendertron_url, params=render_params)
    if render_response.status_code != 200:
        print(f"Failed to retrieve Mayesh Shop page. Status code: {render_response.status_code}")
        return
    
    rendered_html = render_response.text
    soup = BeautifulSoup(rendered_html, 'html.parser')

    # navigate to main shop page
    # mayesh_response = session.get(f"https://www.mayesh.com/shop?perPage=100&sortBy=Name-ASC&pageNumb=1&date={delivery_date}&is_sales_rep=0&is_e_sales=0&criteria=%7B%7D&criteriaInt=%7B%7D&search=&s_search=")

    # if mayesh_response.status_code != 200:
    #     print(f"Failed to retrieve Mayesh Shop page. Status code: {mayesh_response.status_code}")
    #     return
    # print("Navigated successfully to Mayesh Shop page.")
    # print(f"Response Text: {mayesh_response.content}")
    
    # soup = BeautifulSoup(mayesh_response.content, 'html.parser')
    
    # scrape data
    while True:
        container = soup.find("div", class_="card product-card border-0")
        print(f"Got container: {container}")
        if container:
            items = container.find_all("div", class_="card-body position-relative")
            print(f"Got items: {items}")
            for item in items:
                print(f"Got item: {item}")
                flower_name = item.select_one("div.col.product-name.pl-0 a").text.strip()
                print(f"Flower name: {flower_name}")
                if any(name.lower() in flower_name.lower() for name in flower_names):
                    flower_data = get_main_data(item)
                    mayesh_flowers[flower_name] = flower_data

        # navigate to the next page of items
        next_page = soup.select_one("a.page-link")
        if not next_page: 
            break

        next_url = next_page['href']
        render_params["url"] = next_url
        render_response = requests.get(rendertron_url, params=render_params)

        if render_response.status_code != 200:
            print(f"Failed to render next page with Rendertron. Status code: {render_response.status_code}")
            break

        rendered_html = render_response.text
        soup = BeautifulSoup(rendered_html, 'html.parser')
        # response = session.get(next_url)
        # if response.status_code != 200:
        #     print(f"Failed to retrieve the next page. Status code: {response.status_code}")
        #     break
        # soup = BeautifulSoup(response.content, 'html.parser')


def get_main_data(item):
    print("Scraping Main Data")
    flower_name = item.select_one("CSS_SELECTOR_FOR_FLOWER_NAME").text.strip()
    flower_image = item.select_one("img")['src'].strip()
    price = item.select_one("CSS_SELECTOR_FOR_PRICE").text.strip()
    color = item.select_one("CSS_SELECTOR_FOR_COLOR").text.strip()
    height = item.select_one("CSS_SELECTOR_FOR_HEIGHT").text.strip()
    # FILL HERE
    seller = "Mayesh - "
    farm = item.select_one("CSS_SELECTOR_FOR_FARM").text.strip()
    availability_bunches = item.select_one("CSS_SELECTOR_FOR_AVAILABILITY_BUNCHES").text.strip()
    availability_stems = item.select_one("CSS_SELECTOR_FOR_AVAILABILITY_STEMS").text.strip()
    delivery_date = item.select_one("CSS_SELECTOR_FOR_DELIVERY_DATE").text.strip()
    date_available = item.select_one("CSS_SELECTOR_FOR_DATE_AVAILABLE").text.strip()

    print(f"individual flower info: {flower_name, flower_image, price, color, height, seller, farm, availability_bunches, availability_stems, delivery_date, date_available}")
    return (
        flower_name, flower_image, price, color, height, seller, farm, availability_bunches, availability_stems, delivery_date, date_available
    )


# DUTCH DIRECT
def scrape_dutch_direct(session):
    # check session
    if not session:
        print("Login authentication failed.")
        return

    # RENDERTRON
    render_params = {
        "url": "https://www.mayesh.com/dutch-direct-boxlots"
    }
    render_response = requests.get(rendertron_url, params=render_params)
    if render_response.status_code != 200:
        print(f"Failed to retrieve Mayesh Shop page. Status code: {render_response.status_code}")
        return
    
    rendered_html = render_response.text
    soup = BeautifulSoup(rendered_html, 'html.parser')

    # navigate to dutch direct page
    # dutch_direct_response = session.get("https://www.mayesh.com/dutch-direct-boxlots")
    # if dutch_direct_response.status_code != 200:
    #     print(f"Failed to retrieve Dutch Direct page. Status code: {dutch_direct_response.status_code}")
    #     return
    # print("Navigated successfully to Dutch Direct page.")
    
    # soup = BeautifulSoup(dutch_direct_response.content, 'html.parser')
    
    # scrape data
    while True:
        for item in soup.select(".card-body position-relative"):
            flower_name = item.select_one("div.product-name").text.strip()
            if any(name.lower() in flower_name.lower() for name in flower_names):
                flower_data = get_dutch_direct_data(item)
                mayesh_flowers[flower_name] = flower_data

        # navigate to the next page of items
        next_page = soup.select_one("a.page-link")
        if not next_page: 
            break

        next_url = next_page['href']
        render_params["url"] = next_url
        render_response = requests.get(rendertron_url, params=render_params)

        if render_response.status_code != 200:
            print(f"Failed to render next page with Rendertron. Status code: {render_response.status_code}")
            break

        rendered_html = render_response.text
        soup = BeautifulSoup(rendered_html, 'html.parser')
        # print(f"next url: {next_url}")
        # response = session.get(next_url)
        # if response.status_code != 200:
        #     print(f"Failed to retrieve the next page. Status code: {response.status_code}")
        #     break
        # soup = BeautifulSoup(response.content, 'html.parser')
    

def get_dutch_direct_data(item):
    print("Scraping Dutch Direct")
    flower_name = item.select_one("CSS_SELECTOR_FOR_FLOWER_NAME").text.strip()
    flower_image = item.select_one("img")['src'].strip()
    price = item.select_one("CSS_SELECTOR_FOR_PRICE").text.strip()
    color = item.select_one("CSS_SELECTOR_FOR_COLOR").text.strip()
    height = item.select_one("CSS_SELECTOR_FOR_HEIGHT").text.strip()
    seller = "Mayesh - Dutch Direct"
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
    session = mayesh_login()
    scrape_main(session)
    #scrape_dutch_direct(session)
    print(f"Complete scraped flower data: {mayesh_flowers}")
    # update database
    insert_data(mayesh_flowers)
