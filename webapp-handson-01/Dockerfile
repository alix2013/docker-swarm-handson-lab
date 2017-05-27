FROM node:7-alpine
WORKDIR /app
COPY app/webapp.js /app
ENV WEBAPP_PORT=8000 \
    NODE_ENV=production
EXPOSE $WEBAPP_PORT
CMD node webapp.js

