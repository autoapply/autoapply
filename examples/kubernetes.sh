#!/bin/bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
kubectl create secret generic --from-file "$HOME/.kube/config" kubeconfig-secret
kubectl apply -f "$DIR/kubernetes.yaml"
