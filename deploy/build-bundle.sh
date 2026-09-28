#!/usr/bin/env bash
# Builds the Spring Boot jar (React included) and zips it with the Procfile and
# .ebextensions into target/expense-tracker-eb.zip, ready for Elastic Beanstalk.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Building jar (Maven also builds the React app)"
mvn -q -B package -DskipTests

JAR=target/expense-tracker-1.0.0.jar
BUNDLE=target/expense-tracker-eb.zip

echo "==> Creating $BUNDLE"
rm -f "$BUNDLE"
STAGE=$(mktemp -d)
cp "$JAR" Procfile "$STAGE"/
cp -R .ebextensions "$STAGE"/
(cd "$STAGE" && zip -qr "$OLDPWD/$BUNDLE" .)
rm -rf "$STAGE"

ls -la "$BUNDLE"
