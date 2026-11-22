#!/bin/sh
set -eu

# /data is the mounted Railway volume. Persist public and private uploads.
# Keep the container's code directory intact; only upload folders are symlinked.
mkdir -p /data/uploads /data/private_uploads
for directory in uploads private_uploads; do
  if [ -d "./$directory" ] && [ ! -L "./$directory" ]; then
    rmdir "./$directory" 2>/dev/null || {
      echo "Refusing to replace a non-empty upload directory: $directory" >&2
      exit 1
    }
  fi
  ln -sfn "/data/$directory" "./$directory"
done
chown -R nestjs:nodejs /data
exec su-exec nestjs:nodejs node dist/src/main.js
