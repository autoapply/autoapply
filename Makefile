IMAGE_NAME=pascalgn/autoapply:latest

build: clean tests
	python3 setup.py sdist
	python3 setup.py bdist_wheel

clean:
	rm -rf build/ dist/ *.egg-info

tests:
	python3 -m unittest

upload-test: build
	twine upload --repository-url https://test.pypi.org/legacy/ dist/*

upload: build
	twine upload dist/*

docker:
	docker build -t $(IMAGE_NAME) .

docker-push: docker
	docker push $(IMAGE_NAME)
