autoapply
=========

Automatically apply changes from a remote URL to the Kubernetes cluster

Usage
-----

To start the service locally, run

::

    $ pip3 install --user autoapply
    $ autoapply server https://user:password@example.com/repository/my-service.yaml

For a docker version, use

::

    $ docker run -d -e URL=https://example.com/my-service.yaml pascalgn/autoapply

The following URLs are supported:

-  Direct access via HTTPS, for example ``https://example.com/my-config/config.yaml``
-  Access via SSH, ``git@example.com:path/to/repository.git:path/to/config.yaml`` or
   ``ssh://git@example.com:123/path/to/repository.git:path/to/config.yaml``

For Git URLs you can append ``#my-branch`` to specify the branch to be
used. If no branch is given, *master* will be used.

Providing SSH keys
~~~~~~~~~~~~~~~~~~

To use SSH keys, add the properties ``ID_RSA`` and ``ID_RSA_PUB``.
For Kubernetes, see `kubernetes-ssh.yaml <https://github.com/pascalgn/autoapply/blob/master/examples/kubernetes-ssh.yaml>`_.

Encrypted files
~~~~~~~~~~~~~~~

You can encrypt the values of Yaml files to protect Kubernetes secrets like SQL database or Docker registry credentials:

::

    $ autoapply crypt -f application-secrets.yaml
    Password: my-secret-passphrase

This will delete the original file and create a file ``application-secrets.yaml.crypt``, which can
later be decrypted by autoapply when providing the password for the server:

::

    $ mkdir ~/.autoapply
    $ echo -n my-secret-passphrase > ~/.autoapply/crypt.key
    $ autoapply server https://example.com/repository/application-secrets.yaml

For Kubernetes, see `kubernetes-crypt.yaml <https://github.com/pascalgn/autoapply/blob/master/examples/kubernetes-crypt.yaml>`_.

License
-------

Autoapply is licensed under the `ISC License <https://github.com/pascalgn/autoapply/blob/master/LICENSE>`_
