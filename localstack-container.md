## local container command

1- Run the LocalStack container:

> docker run --rm -it -p 4566:4566 localstack/localstack


> docker run -d \
  -p 4566:4566 \
  -e EXTRA_CORS_ALLOWED_ORIGINS=http://localhost:3000 \
  -e EXTRA_CORS_ALLOWED_HEADERS=* \
  localstack/localstack

### run test command

```bash
```
aws --endpoint-url=http://localhost:4566 s3 ls
```
```


#### create lcaol s3 bucket

1- export LOCALSTACK_ENDPOINT=http://localhost:4566

2- aws --endpoint-url=$LOCALSTACK_ENDPOINT s3 mb s3://my-local-bucket

3- Upload file to local se

> echo "Hello LocalStack!" > testfile.txt

> aws --endpoint-url=$LOCALSTACK_ENDPOINT s3 cp testfile.txt s3://my-local-bucket

> aws --endpoint-url=$LOCALSTACK_ENDPOINT s3 ls s3://my-local-bucket



