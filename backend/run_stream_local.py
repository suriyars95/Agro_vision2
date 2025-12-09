import json
from stream_handler import StreamDetector

source = r'D:/Programfiles_Company/Agrofrontback2/test_video.mp4'

sd = StreamDetector(use_yolo=False)
for r in sd.process_stream(source, max_frames=10, conf_thresh=0.25):
    print(json.dumps(r))
