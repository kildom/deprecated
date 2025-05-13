#!/bin/bash
set -e

if [ $# -eq 0 ]; then
    docker ps -a
    exit 1
fi

echo Restart SSHD if needed: service ssh restart

docker start $1
docker exec $1 service ssh restart
docker exec -it $1 bash --login
docker stop $1

docker ps -a
echo Remove if not needed any more: docker rm 

