# files copy && nginx deployment
FROM nginx:alpine
WORKDIR /app
COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]