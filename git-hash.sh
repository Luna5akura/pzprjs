#!/bin/sh

if [ -z "$GIT_HASH" ]; then
  GIT_HASH=$(git rev-parse --short HEAD)
  # Uncommitted changes do not change the commit hash, so browsers would keep
  # serving the previously cached bundle (scripts are loaded with ?<hash>).
  # Append a marker whenever the working tree or index is dirty so that
  # rebuilt bundles are always cache-busted.
  if ! git diff --quiet || ! git diff --cached --quiet; then
    GIT_HASH="${GIT_HASH}-dirty"
  fi
fi

cat > git.json <<END
{
  "hash": "$GIT_HASH"
}
END
