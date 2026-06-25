


> docker run -p 3456:3456 -v ./files:/app/vikunja/files -v ./db:/db vikunja/vikunja


> docker run -d -p 3456:3456 -e VIKUNJA_SERVICE_PUBLICURL=http://localhost:3456/ -v ./files:/app/vikunja/files -v ./db:/db vikunja/vikunja