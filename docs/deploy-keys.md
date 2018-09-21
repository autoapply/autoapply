# Deploy keys

To access private repositories, _deploy keys_ can be used.

This document describes manual steps to setup autoapply.
For an automated way, see [autosetup](https://github.com/autoapply/autosetup).

## 1. Generate a new SSH key

First you will need to create a new SSH key.
Make sure to change the comment (`-C`) to something that helps you remember what the key is used for.

    $ mkdir deploy-keys
    $ cd deploy-keys
    $ ssh-keygen -b 4096 -N '' -C autoapply@example.com -f id_rsa
    Generating public/private rsa key pair.
    Your identification has been saved in id_rsa.
    Your public key has been saved in id_rsa.pub.

## 2. Setup access for the key

This key now has to be added as a deploy key, so that it can be used to check out the repository.

You can get the public part of the key pair by using `cat id_rsa.pub`.

For GitHub, see [managing-deploy-keys](https://developer.github.com/v3/guides/managing-deploy-keys/#deploy-keys).
As autoapply does not need to make any changes to the repository, make sure that you set the deploy key access to readonly.

GitLab (cloud and self-hosted) also supports [deploy keys](https://docs.gitlab.com/ce/ssh/README.html#deploy-keys).

## 3. Start autoapply

Download the file [kubernetes-ssh.yaml](examples/kubernetes-ssh.yaml) and make sure to configure the secret correctly:

    $ curl 'https://raw.githubusercontent.com/autoapply/autoapply/master/docs/examples/kubernetes-ssh.yaml' > kubernetes-ssh.yaml
    $ ssh-keyscan -t rsa github.com > known_hosts
    $ kubectl create secret generic autoapply-ssh-secret --dry-run --from-file=id_rsa,known_hosts -o yaml

Edit the downloaded copy of `kubernetes-ssh.yaml` and replace the values for `id_rsa` and `known_hosts`
with the values that have just been printed by the _kubectl_ command.
Then replace the text `https://github.com/autoapply/hello-world` in the file with the URL of your repository.

Now you can start autoapply:

    $ kubectl apply -f kubernetes-ssh.yaml
