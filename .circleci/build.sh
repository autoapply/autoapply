#!/bin/sh

build_docker() {
  dockerfile="$1"
  tag="$2"

  echo "Building $dockerfile -> $tag..."
  docker build . -f "$dockerfile"
}

if [ -n "$CIRCLE_TAG" ]; then
  build_docker "build/Dockerfile" "$CIRCLE_TAG"
  build_docker "build/kubectl/Dockerfile" "${CIRCLE_TAG}-kubectl"
  build_docker "build/root/Dockerfile" "${CIRCLE_TAG}-root"
else
  build_docker "build/Dockerfile" "latest"
  build_docker "build/kubectl/Dockerfile" "kubectl"
  build_docker "build/root/Dockerfile" "root"
fi
