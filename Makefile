IMAGE_NAME=pascalgn/autoapply:latest

all: tests

tests:
	yarn test
	yarn lint

upload: tests
	npm publish

docker: tests
	docker build -t $(IMAGE_NAME) build/

docker-push: docker
	docker push $(IMAGE_NAME)
