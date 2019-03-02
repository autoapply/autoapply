FROM node:alpine

RUN apk add --no-cache tini

COPY . /tmp/src/
RUN yarn global add "file:/tmp/src" \
    && rm -rf /tmp/src

ENTRYPOINT [ "/sbin/tini", "--", "autoapply" ]
