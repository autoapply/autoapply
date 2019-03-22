# autoapply

[![Build Status](https://img.shields.io/travis/autoapply/autoapply.svg?style=flat-square)](https://travis-ci.org/autoapply/autoapply) [![Coverage status](https://img.shields.io/coveralls/github/autoapply/autoapply.svg?style=flat-square)](https://coveralls.io/github/autoapply/autoapply) [![Docker build status](https://img.shields.io/docker/build/autoapply/autoapply.svg?style=flat-square)](https://hub.docker.com/r/autoapply/autoapply/) [![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/autoapply/autoapply/blob/master/LICENSE)

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

First create an empty, publicly accessible repository.
For private repositories, you can use [deploy keys](docs/deploy-keys.md).
Add the desired Kubernetes resource files to the repository, for example [nginx.yaml](docs/examples/nginx.yaml),
and make sure all files have been pushed.

Now download [kubernetes-simple.yaml](docs/examples/kubernetes-simple.yaml) and change
`https://github.com/autoapply/hello-world` to the URL of the repository you just created.
Then create the autoapply deployment in your cluster:

```
$ kubectl apply -f kubernetes-simple.yaml
```

Now, autoapply will download the resource files from your repository and apply them to the cluster.
When you update the repository, autoapply will fetch the new files and update the cluster accordingly.

To automatically setup autoapply in a cluster, see the related [autosetup](https://github.com/autoapply/autosetup) project.

For more detailed instructions, see [Hello, World!](docs/hello-world.md)

## Configuration

A basic configuration file looks like this:

```yaml
loop:
  commands:
  - git clone --depth 1 https://github.com/autoapply/hello-world workspace/
  - kubectl apply -f workspace/
```

For more information, see the [documentation](docs/configuration.md).

## Docker images

* `autoapply/autoapply:latest` provides a minimal image with just *autoapply* installed ([Dockerfile](build/Dockerfile))
* `autoapply/autoapply:kubectl` also provides *git*, *kubectl*, *[sops](https://github.com/mozilla/sops)* and *[dockerize](https://github.com/jwilder/dockerize)* ([Dockerfile](build/kubectl/Dockerfile))
* `autoapply/autoapply:helm` also provides *git*, *[sops](https://github.com/mozilla/sops)* and *[helm](https://github.com/kubernetes/helm)* ([Dockerfile](build/helm/Dockerfile))
* `autoapply/autoapply:root` provides a minimal image with just *autoapply* installed, but it runs as root. This can be useful as a base for custom builds ([Dockerfile](build/root/Dockerfile))

## Related projects

- [kube-applier](https://github.com/box/kube-applier) is very similar, but less flexible.
  It doesn't support Helm or custom workflows like using sops.
- [Keel](https://github.com/keel-hq/keel) provides fully automated updates, but only changes
  the container image version, nothing else.
- [Helm](https://github.com/kubernetes/helm) does not provide automated updates, but still offers
  a consistent way to release new versions. However, you will still need a way to manage the values
  that will be used to create releases from charts.
- [Flux](https://github.com/weaveworks/flux) is also very similar, but goes a step further and
  uses an abstraction on top of the existing Kubernetes model.
  There is also a blog post by Weaveworks about
  [GitOps and Kubernetes](https://www.weave.works/blog/gitops-high-velocity-cicd-for-kubernetes),
  which gives a good overview of the topic.
- [kube-backup](https://github.com/pieterlange/kube-backup) is for the opposite way and regularly
  adds all Kubernetes objects into the configured git repository.

## License

Autoapply is licensed under the [MIT License](LICENSE)
