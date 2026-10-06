#!/bin/sh

if [ -z "$GIT_HASH" ]; then
  GIT_HASH=$(git rev-parse --short HEAD)
  # Uncommitted changes do not change the commit hash, so browsers would keep
  # serving the previously cached bundle (scripts are loaded with ?<hash>).
  # Append a marker whenever the working tree or index is dirty so that
  # rebuilt bundles are always cache-busted.
  if ! git diff --quiet || ! git diff --cached --quiet; then
    # さらに、-dirty だけでは連続した再ビルドでバージョン文字列が変わらず
    # ブラウザが古いバンドルを使い続けるため、ソースの最新更新時刻も付ける。
    DIRTY_MTIME=$(find src src-ui test -type f 2>/dev/null | xargs -r stat -c %Y 2>/dev/null | sort -n | tail -1)
    GIT_HASH="${GIT_HASH}-dirty${DIRTY_MTIME}"
  fi
fi

cat > git.json <<END
{
  "hash": "$GIT_HASH"
}
END
