import os
import requests
import sys

def ping_server():
    url = os.environ.get('BACKEND_URL')
    if not url:
        print("No BACKEND_URL environment variable set.")
        sys.exit(1)
    
    # Hit the docs endpoint which is always available in FastAPI
    target = f"{url.rstrip('/')}/docs"
    
    try:
        response = requests.get(target, timeout=10)
        print(f"Pinged {target}: Status {response.status_code}")
    except Exception as e:
        print(f"Failed to ping {target}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    ping_server()