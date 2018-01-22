FROM pascalgn/autoapply:latest

RUN apk add --no-cache curl git openssh-client tar \
    && rm -rf /root/.cache \
    && echo 'StrictHostKeyChecking no' >> /etc/ssh/ssh_config

ENV KUBECTL_VERSION v1.9.0
ENV KUBECTL_URL "https://storage.googleapis.com/kubernetes-release/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"

RUN curl --fail "${KUBECTL_URL}" > /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl

RUN yarn global add forever yaml-crypt slack-cli gatsby-cli hexo-cli
