# glibc runtime: Alpine/musl is not supported by the vendor bundles.
# Install the local npm package and download its pinned binaries during build.
FROM node:24-bookworm-slim AS install

WORKDIR "/opt/test project"
COPY vendor.tgz /tmp/vendor.tgz
RUN npm install --foreground-scripts --ignore-scripts=false --no-audit --no-fund /tmp/vendor.tgz

FROM node:24-bookworm-slim AS tests

WORKDIR /tests
COPY --from=install ["/opt/test project/node_modules", "/opt/test project/node_modules"]
COPY test/ .

ENV VENDOR_BIN_DIR="/opt/test project/node_modules/@leandredev/leandre-vendors-bin/bin"

CMD ["sh", "-c", "exec node --test */*.spec.ts"]
