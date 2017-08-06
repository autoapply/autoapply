IMAGE_NAME=pascalgn/autoapply

build:
	docker build -t $(IMAGE_NAME) .

push: build
	docker push $(IMAGE_NAME)
