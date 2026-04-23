# Server Package

## Usage

### Prepare

step 1: clone repo

```bash
git clone https://github.com/hyooeewee/ecoctrl.git
```

step 2: change directory

```bash
cd packages/server
```

step 3: env setup(modify as needed)

```bash
cp .env.example .env.local
```

### Docker(Recommended)

step 1: build docker image

```bash
docker build -t ecoctrl-server .
```

step 2: run docker

```bash
docker run -d \
    --name ecoctrl-server \
    -p 3000:3000 \
    --env-file .env.local \
    ecoctrl-server
```

### PM2

step 1: install dependencies

```bash
pnpm i -g pm2 && pnpm i
```

step 2: start server

```bash
pnpm start
```
