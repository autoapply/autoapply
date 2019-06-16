FROM node:alpine

RUN apk add --no-cache curl git openssh-client tar openssl tini \
    && yarn global add yaml-crypt \
    && adduser -D -g autoapply autoapply

ENV HELM_URL "https://raw.githubusercontent.com/helm/helm/master/scripts/get"
RUN curl --fail "${HELM_URL}" | /bin/sh

ENV SOPS_URL "https://github.com/mozilla/sops/releases/download/3.3.1/sops-3.3.1.linux"
RUN curl --fail -L "${SOPS_URL}" > /usr/local/bin/sops \
    && chmod +x /usr/local/bin/sops

COPY . /tmp/src/
RUN yarn global add "file:/tmp/src" \
    && rm -rf /tmp/src \
    && autoapply --version

USER autoapply
WORKDIR /home/autoapply
ENTRYPOINT [ "/sbin/tini", "--", "autoapply" ]
