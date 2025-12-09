import cv2
import numpy as np

out = cv2.VideoWriter('test_video.mp4', cv2.VideoWriter_fourcc(*'mp4v'), 10, (320,240))
for i in range(60):
    frame = np.zeros((240,320,3), dtype=np.uint8)
    x = int((i*5) % 320)
    cv2.rectangle(frame, (x,50), (x+40,90), (0,255,0), -1)
    cv2.putText(frame, f'Frame {i}', (10,230), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)
    out.write(frame)
out.release()
print('test_video.mp4 created')
