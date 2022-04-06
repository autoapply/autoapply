FROM node:14-alpine

RUN adduser -D -u 1001 -g autoapply autoapply && apk add --no-cache tini

COPY . /tmp/src/
RUN yarn global add "file:/tmp/src" \
    && rm -rf /tmp/src \
    && autoapply --version

USER 1001:1001
WORKDIR /home/autoapply
ENTRYPOINT [ "/sbin/tini", "--", "autoapply" ]
