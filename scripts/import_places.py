# -*- coding: utf-8 -*-
import urllib.parse
import urllib.request
import json
import time
import random
import os

places = ["Nakara Cafe & Restaurant", "mr.pierre money exchange", "Chiang Mai OriginaLive - The First Indie Livehouse in Chiang Mai", "ร้านชากูซ่า ดอยปุย", "Thai Traditional and Complementary Medicine Center", "Vaanaa ​Cafe​ &​ Bistro", "MARS.cnx", "Baan Kang Wat", "Galae Restaurant", "700th Anniversary of Chiang Mai Stadium", "Chiang Mai P.A.O. Public Park", "Much Room Cafe", "Chiangmai Yunnan Market", "Bar Fine - บ่าฟาย", "Royal Project Shop 2", "Stay Wild & Cafe", "20°09'54.5\"N 99°37'54.2\"E", "The Ironwood", "Have-A-Hug Fusion Farm Chiangmai", "Cherng Doi Roast Chicken", "Nawarath Tennis Club", "สนามเทนนิสนวรัฐ", "TCDC", "The Giant Chiangmai", "L'Opéra", "ชาตรามือ สาขาตลาดวโรรส", "FFparking", "Joost Smoothies drink healthy", "1st For Coffee (CO1FFEE)", "Jok Somphet Restaurant", "สากลการค้า SK Exchange", "MITTE MITTE Chiangmai - Cafe & Brunch", "S&P Rimping Chiang Mai", "Mae Kampong Village", "Big Tree", "Super Money Exchange", "Asa Vegan Kitchen and Studio", "Thamel Coffee", "ครัวห่วงสมัย By เจ๊โบว์", "Soy milk store", "Dubai Chicken & Rice", "Wua Thong Beef Noodle", "The Swan Burmese Cuisine", "Coffee Telling", "Maerim Bee Garden", "Doi Saket Lakes", "Wachirathan Waterfall", "6ixcret show", "Brewginning Coffee", "MENSHO TOKYO", "Hummus Garden Chiang Mai", "Suriwong Book Center", "Samudlanna", "Wat Kanthaprueksa (Mae Kampong)", "ClayCraft Coffee Gallery Homestay เครคราฟทโฮมสเตย์", "Win Cosmetics Warorot Market", "เฟบริคช้าง", "VICTORIA HAIR DESIGN", "Baan Mae Café & Restaurant", "Yunnan flea Market", "Dao Chinese Restaurant", "Asama Coffee & Roastery", "Zenseiki Japanese Food and Sushi", "Sang Ga Dee Space", "Kati Breakfast and Brunch", "Win Cosmetics", "Living The Dream Cafe & Playground Chiang Mai", "Magokoro Teahouse by มีใจให้มัทฉะ", "Hear Tong Food Shop", "ดอยทิพย์ญาณ Doitipyan (สาขาวัดดอยโพธิญาณ)", "Jarus Print Shop", "Bushido Japanese Restaurant", "HomNoey Thai BBQ", "孟买市场", "SINC Cafe’", "Erang Korean Restaurant", "Kasem beef noodle shop", "Hair Duu beauty & salon", "Auf der Au Garden German buffet", "อาลีเป็ดย่าง ​Diannan", "土管温泉", "Chom Cafe and Restaurant", "SANAE • Sanae Thai Cuisine", "Ohkajhu Organic Farm Sansai", "We-La-Dee Cafe & Restaurant", "Patongo Ko Neng (Praisanee Road Branch)", "Raming Tea House Siam Celadon , ระมิงค์ทีเฮาส์ สยามศิลาดล", "Meet Lalada", "Maadae Slow Fish Kitchen", "โกโก้เจ้มจ้น - เชียงใหม่ - Cocoa6", "ข้าวเหนียวมะม่วงป้าหลอด : ตลาดวโรรส - กาดหลวงตอนกลางคืน", "รังนกไทย เจ้าเก่าตลาดอนุสาร สาขา1", "Samurai Kitchen", "Kanomwan Chang Moi", "Im Yakiniku & Sushi Buffet Kadtaweechok", "Bays Coffee Co.", "หมูทอดอาม่า - Moo Tod Ama", "Ekachan The Wisdom of Ethnic Thai Cuisine", "Hakata Yakitori Bariuma", "OL Beef Noodle", "Chiang Dao Hot Springs", "TASANA ทสฺสน", "Mueang Mai Market", "Chiang Mai Night Bazaar", "Waroros Market", "Central Chiangmai", "Kuaytiaw 3 Baht"]

env_file = "./.env"
supabase_url = ""
supabase_key = ""

with open(env_file, 'r') as f:
    for line in f:
        if line.startswith("VITE_SUPABASE_URL="):
            supabase_url = line.strip().split("=")[1].strip('"\'')
        elif line.startswith("VITE_SUPABASE_ANON_KEY="):
            supabase_key = line.strip().split("=")[1].strip('"\'')

# Create a random user to get auth token
email = f"zhangzihe_{random.randint(1000, 9999)}@cmimap.com"
pwd = "password123456"

print(f"Creating user {email}...")
signup_url = f"{supabase_url}/auth/v1/signup"
headers = {
    "apikey": supabase_key,
    "Content-Type": "application/json"
}
data = {"email": email, "password": pwd}
req = urllib.request.Request(signup_url, json.dumps(data).encode(), headers=headers)
try:
    resp = urllib.request.urlopen(req)
    res = json.loads(resp.read())
    access_token = res.get("access_token")
    user_id = res.get("user", {}).get("id")
    if not access_token:
        # User already exists or other error, let's login
        print("Signup returned no token, trying login...")
        login_url = f"{supabase_url}/auth/v1/token?grant_type=password"
        req = urllib.request.Request(login_url, json.dumps(data).encode(), headers=headers)
        resp = urllib.request.urlopen(req)
        res = json.loads(resp.read())
        access_token = res["access_token"]
        user_id = res["user"]["id"]
except Exception as e:
    print(f"Auth failed: {e}")
    exit(1)

print(f"Got access token for {user_id}")

def guess_category(name):
    name = name.lower()
    if any(x in name for x in ['cafe', 'coffee', 'กาแฟ', 'bistro']):
        return '咖啡'
    if any(x in name for x in ['restaurant', 'food', 'beef', 'noodle', 'chicken', 'cuisine', 'kitchen', 'pork', 'หมู', 'อาหาร', 'diannan', 'sushi', 'bbq']):
        return '吃饭'
    if any(x in name for x in ['market', 'flea', 'bazaar', 'ตลาด', 'shop', 'store']):
        return '市集'
    if any(x in name for x in ['park', 'garden', 'waterfall', 'lake', 'hot spring', 'ดอย', '温泉', 'camp']):
        return '户外'
    if any(x in name for x in ['stadium', 'tennis', 'sport']):
        return '运动'
    if any(x in name for x in ['massage', 'relax', 'spa']):
        return '放松'
    if any(x in name for x in ['livehouse', 'show', 'exchange', 'print', 'cosmetic', 'salon']):
        return '彩蛋'
    return '吃饭'

def geocode(place):
    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(place + ' Chiang Mai')}&format=json&limit=1"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 CMIMap/1.0'})
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read())
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        pass
    return None

def insert_to_supabase(record):
    url = f"{supabase_url}/rest/v1/recommendations"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    data = json.dumps(record).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        urllib.request.urlopen(req)
        return True
    except urllib.error.HTTPError as e:
        print(f"Failed to insert {record['place_name']}: {e.read().decode('utf-8')}")
        return False
    except Exception as e:
        print(f"Error {record['place_name']}: {e}")
        return False

# Base coordinates for Chiang Mai (Tha Phae Gate area roughly)
base_lat = 18.7883
base_lon = 98.9853

success_count = 0
for idx, p in enumerate(places):
    print(f"Processing {idx+1}/{len(places)}: {p}")
    if "°" in p and "N" in p and "E" in p:
        coords = (20.165138, 99.631722)
    else:
        coords = geocode(p)
        time.sleep(1) # rate limit

    if not coords:
        coords = (base_lat + random.uniform(-0.03, 0.03), base_lon + random.uniform(-0.03, 0.03))

    record = {
        "place_name": p,
        "category": guess_category(p),
        "reason": "来自社区创始人“张紫姀”的精选收藏",
        "user_name": "张紫姀",
        "user_id": user_id,
        "latitude": coords[0],
        "longitude": coords[1],
        "images": []
    }
    
    if insert_to_supabase(record):
        success_count += 1

print(f"\nDone! Successfully inserted {success_count} places into CMIMap.")
