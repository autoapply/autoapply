# Hello, World!

This is a step-by-step introduction to autoapply.
For a quick overview, see the [project homepage](https://github.com/pascalgn/autoapply#usage).

## 1. Prerequisites

First you will need access to a Kubernetes cluster.

The tool _Minikube_ allows you to set up a cluster directly on your local machine:

- [Install Minikube](https://kubernetes.io/docs/tasks/tools/install-minikube/)

If you want to try it out directly in the cloud, the big vendors each provide a free tier:

- [Amazon AWS](https://aws.amazon.com/free/)
- [Google Cloud](https://cloud.google.com/free/)
- [Microsoft Azure](https://azure.microsoft.com/free/)

Whatever setup you choose, at the end you should have a running Kubernetes cluster
and have setup the tool [`kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/) to access this cluster.

## 2. Create a repository

Create a new empty Git repository. The repository should be publicly available,
for example on [GitHub](https://github.com) or [GitLab](https://gitlab.com).
If you want to use a private repository, check out [deploy keys](deploy-keys.md).

For this guide, we will use `https://github.com/pascalgn/hello-world`
as the repository URL, so make sure to adapt the examples accordingly!

## 3. Start autoapply

Save the following file on your local machine as `autoapply.yaml`.

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: autoapply
spec:
  template:
    metadata:
      labels:
        app: autoapply
    spec:
      containers:
      - name: autoapply
          image: pascalgn/autoapply:kubectl
          args: ['env:AUTOAPPLY_CONFIG']
          env:
          - name: AUTOAPPLY_CONFIG
            value: |
              loop:
                commands:
                # Make sure to use the URL of the repository you just created instead!
                - git clone --depth 1 https://github.com/pascalgn/hello-world workspace/
                - kubectl apply -f workspace/
```

This file is only needed once, do not add it to the repository!
You can delete the file after autoapply has been started.

Start autoapply:

```
$ kubectl apply -f autoapply.yaml
```

After Kubernetes has created the pod, you should see the following output:

```
$ kubectl get all
NAME                            READY     STATUS    RESTARTS   AGE
po/autoapply-7218c935d-rh9t2    1/1       Running   0          1m
...
```

As the repository is currently empty, autoapply will output an error:

```
# (make sure to use the pod name from the previous command)
$ kubectl logs po/autoapply-7218c935d-rh9t2
info Running loop commands...
info Loop: Executing command: "git clone --depth 1 https://github.com/pascalgn/hello-world workspace/"
Cloning into 'workspace'...
warning: You appear to have cloned an empty repository.
done.
info Loop: Executing command: "kubectl apply -f workspace/"
error: You must provide one or more resources by argument or filename.
Example resource specifications include:
   '-f rsrc.yaml'
   '--filename=rsrc.json'
   '<resource> <name>'
   '<resource>'
error `kubectl apply -f workspace/` failed with code 1
info Loop: Sleeping for 60s...
```

## 4. Add configurations to the repository

Now, add the file [`nginx.yaml`](examples/nginx.yaml) to the repository
and push the changes.

After a while, autoapply will fetch the changes from your repository and apply them to the cluster:

```
$ watch kubectl get all
```

## 5. Change the file

Go to your repository and change the text of the `index.html` configuration.
Also replace both occurrences of `hello-world-config-1` with `hello-world-config-2` and push the changes.

> When you change the configurations of the pods, Kubernetes will automatically
> recreate the pods, for example when you change the image version, exposed ports or volumes.
>
> However, when you change config maps or secrets that the pod uses, Kubernetes
> will _not_ recreate the pods. This is an [open issue](https://github.com/kubernetes/kubernetes/issues/22368),
> but for now you need to make sure to also change the name of the config map
> or manually delete the pods, so that any changes will be picked up.

Again, autoapply will fetch the changes and update the cluster.
When you open the URL in your browser, you should see the updated `index.html` file.
