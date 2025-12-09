import requests
r = requests.get('http://localhost:5000/')
print('status', r.status_code)
print(r.text)
