FROM node:alpine

RUN adduser -D -g autoapply autoapply

RUN yarn global add 'autoapply@0.7.0'

USER autoapply
WORKDIR /home/autoapply
ENTRYPOINT [ "autoapply" ]
