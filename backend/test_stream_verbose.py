import requests
import time
import json

url = 'http://localhost:5001/stream/detect'
source = r'D:/Programfiles_Company/Agrofrontback2/test_video.mp4'

print('POSTing to', url)
try:
    with requests.post(url, json={'source': source, 'max_frames': 30, 'conf_thresh': 0.25}, stream=True, timeout=60) as r:
        print('status', r.status_code)
        if r.status_code != 200:
            print('Error response:', r.text[:500])
        else:
            line_count = 0
            for line in r.iter_lines(decode_unicode=True):
                if line:
                    line_count += 1
                    try:
                        data = json.loads(line)
                        print(f"Frame {data.get('frame_num', '?')}: {data.get('detections', {}).get('detections_count', 0)} detections")
                    except:
                        print('Raw line:', line[:100])
            print(f'Total lines received: {line_count}')
except Exception as e:
    print('Exception:', type(e).__name__, str(e)[:200])
