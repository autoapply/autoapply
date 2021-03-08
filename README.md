# autoapply

[![Build Status](https://img.shields.io/travis/autoapply/autoapply.svg?style=flat-square)](https://travis-ci.org/autoapply/autoapply) [![Coverage status](https://img.shields.io/coveralls/github/autoapply/autoapply.svg?style=flat-square)](https://coveralls.io/github/autoapply/autoapply) [![Docker build status](https://img.shields.io/docker/automated/autoapply/autoapply.svg?style=flat-square)](https://hub.docker.com/r/autoapply/autoapply/) [![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/autoapply/autoapply/blob/master/LICENSE)

Automatically apply changes to a Kubernetes cluster.

![Technical overview](https://autoapply.github.io/autoapply/overview.svg)

- All resource files are stored in Git, which means there is a single source of truth
  for the state of your application.
- When editing resource files, the changes can be documented and merged using your standard Git workflow.
- You can use [yaml-crypt](https://github.com/autoapply/yaml-crypt) or [sops](https://github.com/mozilla/sops) to store Kubernetes secrets directly in the repository.

---

1. [Usage](#usage)
2. [Configuration](#configuration)
3. [Docker tags](#docker-tags)
4. [Related projects](#related-projects)
5. [License](#license)

## Usage

To quickly setup autoapply in a Kubernetes cluster, see the [autosetup](https://github.com/autoapply/autosetup) project.

## Configuration

A basic configuration file looks like this:

```yaml
loop:
  commands:
    - git clone --depth 1 https://github.com/autoapply/template-kubectl .
    - kubectl apply -f common/
    - kubectl apply -f dev/
```

For example repositories, see [template-kubectl](https://github.com/autoapply/template-kubectl) and [template-kustomize](https://github.com/autoapply/template-kustomize). For more configuration files, see [examples](https://github.com/autoapply/autoapply/tree/master/docs/examples).

For a full description of the configuration format, see the [documentation](docs/configuration.md).

## Docker tags

* `autoapply/autoapply:latest` provides a minimal image with just *autoapply* installed ([Dockerfile](build/Dockerfile))
* `autoapply/autoapply:kubectl` also provides *git*, *kubectl*, *[sops](https://github.com/mozilla/sops)* and *[dockerize](https://github.com/jwilder/dockerize)* ([Dockerfile](build/kubectl/Dockerfile))
* `autoapply/autoapply:helm` also provides *git*, *[sops](https://github.com/mozilla/sops)* and *[helm](https://github.com/kubernetes/helm)* ([Dockerfile](build/helm/Dockerfile))
* `autoapply/autoapply:root` provides a minimal image with just *autoapply* installed, but running as root. This can be useful as a base for custom builds ([Dockerfile](build/root/Dockerfile))

## Related projects

- [Argo CD](https://github.com/argoproj/argo-cd) is very similar, but has a more complex architecture.
  It doesn't support yaml-crypt or sops out of the box, but it also supports custom workflows.
- [kube-applier](https://github.com/box/kube-applier) is also very similar, but less flexible.
  It doesn't support Helm or custom workflows like using sops.
- [Keel](https://github.com/keel-hq/keel) provides fully automated updates, but only changes
  the container image version, nothing else.
- [Helm](https://github.com/kubernetes/helm) does not provide automated updates, but still offers
  a consistent way to release new versions. However, you will still need a way to manage the values
  that will be used to create releases from charts.
- [Flux](https://github.com/fluxcd/flux) is also very similar, but goes a step further and
  uses an abstraction on top of the existing Kubernetes model.
  There is also a blog post by Weaveworks about
  [GitOps and Kubernetes](https://www.weave.works/blog/gitops-high-velocity-cicd-for-kubernetes),
  which gives a good overview of the topic.
- [kube-backup](https://github.com/pieterlange/kube-backup) is for the opposite way and regularly
  adds all Kubernetes objects into the configured git repository.

## License

[MIT](LICENSE)
