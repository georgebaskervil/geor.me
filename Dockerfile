# syntax=docker/dockerfile:1
# check=error=true

# Make sure RUBY_VERSION matches the Ruby version in .ruby-version
ARG RUBY_VERSION=3.4.1
FROM quay.io/evl.ms/fullstaq-ruby:${RUBY_VERSION}-jemalloc-slim AS base

ENV CFLAGS="-O3 -fno-fast-math -fstack-protector-strong -D_FORTIFY_SOURCE=2 -Wall -Wextra -fPIC -Wformat -Wformat-security"
ENV CXXFLAGS="-O3 -fno-fast-math -fstack-protector-strong -D_FORTIFY_SOURCE=2 -Wall -Wextra -fPIC -Wformat -Wformat-security"
ENV LDFLAGS="-Wl,-z,relro -Wl,-z,now"

# Rails app lives here
WORKDIR /rails

# Update gems and bundler
RUN gem update --system --no-document \
  && gem install -N bundler

# Install base packages
RUN --mount=type=cache,id=dev-apt-cache,sharing=locked,target=/var/cache/apt \
  --mount=type=cache,id=dev-apt-lib,sharing=locked,target=/var/lib/apt \
  apt-get update -qq \
  && apt-get install --no-install-recommends -y curl sqlite3

# Set production environment
ENV BUNDLE_DEPLOYMENT="1" \
  BUNDLE_PATH="/usr/local/bundle" \
  BUNDLE_WITHOUT="development:test" \
  RAILS_ENV="production" \
  VITE_RUBY_PACKAGE_MANAGER="bun"

# Throw-away build stages to reduce size of final image
FROM base AS prebuild

# Install packages needed to build gems
RUN --mount=type=cache,id=dev-apt-cache,sharing=locked,target=/var/cache/apt \
  --mount=type=cache,id=dev-apt-lib,sharing=locked,target=/var/lib/apt \
  apt-get update -qq \
  && apt-get install --no-install-recommends -y build-essential libyaml-dev pkg-config unzip libbrotli-dev libssl-dev ruby-dev

FROM prebuild AS bun

# Install Bun
ARG BUN_VERSION=1.2.2
ENV BUN_INSTALL=/usr/local/bun
ENV PATH=/usr/local/bun/bin:$PATH
RUN curl -fsSL https://bun.sh/install | bash -s -- "bun-v${BUN_VERSION}"

# Install node modules
COPY package.json bun.lock ./
RUN --mount=type=cache,id=bld-bun-cache,target=/root/.bun \
  bun install --frozen-lockfile

FROM prebuild AS build

# Install application gems
COPY Gemfile Gemfile.lock ./
RUN --mount=type=cache,id=bld-gem-cache,sharing=locked,target=/srv/vendor \
  bundle config set app_config .bundle \
  && bundle config set path /srv/vendor \
  && bundle install \
  && bundle exec bootsnap precompile --gemfile \
  && bundle clean \
  && mkdir -p vendor \
  && bundle config set path vendor \
  && cp -ar /srv/vendor .

# Copy bun modules
COPY --from=bun /rails/node_modules /rails/node_modules
COPY --from=bun /usr/local/bun /usr/local/bun
ENV PATH=/usr/local/bun/bin:$PATH

# Copy application code
COPY . .

# Precompile bootsnap code for faster boot times
RUN bundle exec bootsnap precompile app/ lib/

# Precompile assets with vite
RUN SECRET_KEY_BASE_DUMMY=1 ./bin/rails vite:build

# Final stage for app image
FROM base

# Copy built artifacts: gems, application
COPY --from=build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --from=build /rails /rails

# Run and own only the runtime files as a non-root user for security
RUN groupadd --system --gid 1000 rails \
  && useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash \
  && mkdir /data \
  && chown -R 1000:1000 db log storage tmp /data
USER 1000:1000

# Deployment options
ENV DATABASE_URL="sqlite3:///data/production.sqlite3" \
  RUBY_YJIT_ENABLE="1"

# Entrypoint prepares the database.
ENTRYPOINT ["/rails/bin/docker-entrypoint"]

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
VOLUME /data
CMD ["bundle", "exec", "iodine"]
