#!/bin/sh

set -e

repository="autoapply/autoapply"
platforms="linux/amd64,linux/arm64"

build_docker() {
  dockerfile="$1"
  version="$2"
  if [ -n "$version" ]; then
    tag="$repository:$version"
    echo "Building $dockerfile -> $tag..."
    docker buildx build --push --platform="$platform" . -f "$dockerfile" -t "$tag"
  else
    echo "Building $dockerfile..."
    docker buildx build --platform="$platform" . -f "$dockerfile"
    echo "Skipping docker push for ref '$REF_NAME'"
  fi
}

echo "${DOCKER_PASSWORD}" |
  docker login -u "${DOCKER_USERNAME}" --password-stdin

if [ "$REF_NAME" = "main" ]; then
  build_docker "build/Dockerfile" "latest"
  build_docker "build/kubectl/Dockerfile" "kubectl"
  build_docker "build/root/Dockerfile" "root"
elif echo "$REF_NAME" | grep -Eq '[0-9]+\.[0-9]+\.[0-9]+'; then
  build_docker "build/Dockerfile" "$REF_NAME"
  build_docker "build/kubectl/Dockerfile" "${REF_NAME}-kubectl"
  build_docker "build/root/Dockerfile" "${REF_NAME}-root"
else
  build_docker "build/Dockerfile"
  build_docker "build/kubectl/Dockerfile"
  build_docker "build/root/Dockerfile"
fi
