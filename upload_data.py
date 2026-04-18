import json
import requests
import sys

URL = "https://sfpcpxlxslnulzlmjcby.supabase.co/rest/v1/recommendations"
# The API requires Authorization and apikey.
API_KEY = "YOUR_SUPABASE_SERVICE_KEY"

def run():
    print("Loading recommendations...")
    with open('miaoda_recommendations.json', 'r') as f:
        data = json.load(f)
    print(f"Found {len(data)} recommendations.")
    
    headers = {
        "apikey": API_KEY,
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    # Optional: we can filter out id if we want new ones, 
    # but maintaining the old UUIDs is better so images or external links don't break.
    
    print("Uploading to Supabase...")
    resp = requests.post(URL, headers=headers, json=data)
    if resp.status_code in [200, 201]:
        print("Success!")
    else:
        print(f"Failed: {resp.status_code}")
        print(resp.text)

if __name__ == '__main__':
    run()
