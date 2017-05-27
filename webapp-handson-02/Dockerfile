FROM node:7-alpine
WORKDIR /app
COPY app/package.json /app
RUN npm install 
COPY app/ /app
ENV WEBAPP_PORT=8000 \
    NODE_ENV=production \
    DBNAME=redisdb
EXPOSE $WEBAPP_PORT
CMD ["node", "webapp.js"]


