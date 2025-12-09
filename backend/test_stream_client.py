import requests
import time

url = 'http://localhost:5000/stream/detect'
source = r'D:/Programfiles_Company/Agrofrontback2/test_video.mp4'

with requests.post(url, json={'source': source, 'max_frames': 10, 'conf_thresh': 0.25}, stream=True) as r:
    print('status', r.status_code)
    if r.status_code != 200:
        print(r.text)
    else:
        for line in r.iter_lines(decode_unicode=True):
            if line:
                print('LINE:', line)
            else:
                print('blank line')
            # small delay to avoid flooding
            time.sleep(0.05)
