#!/bin/bash
docker rm -f hx-ocr-paddle >/dev/null 2>&1
docker run -d --name hx-ocr-paddle -v /root/hx/ocr:/w -v /root/hx/ocr/.paddlex:/root/.paddlex --entrypoint bash rocm:latest -c \
 'python3 -m venv /tmp/pv && . /tmp/pv/bin/activate && pip install -q paddlepaddle==3.2.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/ && pip install -q "paddleocr>=3.2,<3.4" && python -c "import paddle;print(paddle.__version__)" && python /w/droplet/run_paddle.py /w/evalset /w/runs/paddleocr'
