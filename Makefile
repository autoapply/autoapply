IMAGE_NAME=pascalgn/autoapply:latest

build:
	docker build -t $(IMAGE_NAME) .

push: build
	docker push $(IMAGE_NAME)
