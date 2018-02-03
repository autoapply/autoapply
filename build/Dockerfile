FROM node:alpine

RUN adduser -D -g autoapply autoapply

RUN yarn global add 'autoapply@0.6.6'

USER autoapply
WORKDIR /home/autoapply
ENTRYPOINT [ "autoapply" ]
