#!/bin/sh

repository="autoapply/autoapply"

build_docker() {
  dockerfile="$1"
  version="$2"
  if [ -n "$version" ]; then
    tag="$repository:$version"
    echo "Building $dockerfile -> $tag..."
    docker buildx build --platform=linux/amd64,linux/arm64 . -f "$dockerfile" -t "$tag" || exit 1
    docker push "$tag" || exit 1
  else
    echo "Building $dockerfile..."
    docker buildx build --platform=linux/amd64,linux/arm64 . -f "$dockerfile" || exit 1
    echo "Skipping docker push for branch '$CIRCLE_BRANCH'"
  fi
}

echo "${DOCKER_PASSWORD}" |
  docker login -u "${DOCKER_USERNAME}" --password-stdin || exit 1

if [ -n "$CIRCLE_TAG" ]; then
  build_docker "build/Dockerfile" "$CIRCLE_TAG"
  build_docker "build/kubectl/Dockerfile" "${CIRCLE_TAG}-kubectl"
  build_docker "build/root/Dockerfile" "${CIRCLE_TAG}-root"
elif [ "$CIRCLE_BRANCH" = "main" ]; then
  build_docker "build/Dockerfile" "latest"
  build_docker "build/kubectl/Dockerfile" "kubectl"
  build_docker "build/root/Dockerfile" "root"
else
  build_docker "build/Dockerfile"
  build_docker "build/kubectl/Dockerfile"
  build_docker "build/root/Dockerfile"
fi
