docker:
	docker build . -f build/Dockerfile
	docker build . -f build/helm/Dockerfile
	docker build . -f build/kubectl/Dockerfile
