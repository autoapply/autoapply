docker:
	docker build . -f build/Dockerfile
	docker build . -f build/kubectl/Dockerfile
	docker build . -f build/root/Dockerfile
