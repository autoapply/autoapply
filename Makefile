IMAGE_NAME=pascalgn/autoapply:latest

build: clean
	python3 setup.py sdist
	python3 setup.py bdist_wheel

clean:
	rm -rf dist/

docker:
	docker build -t $(IMAGE_NAME) .

push: docker
	docker push $(IMAGE_NAME)
