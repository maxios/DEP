#!/bin/sh
set -e

REPO="maxios/DEP"
INSTALL_DIR="$HOME/.dep/bin"
BINARY_NAME="dep"

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Darwin) os="darwin" ;;
  Linux)  os="linux" ;;
  *)
    echo "Error: Unsupported operating system: $OS"
    exit 1
    ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
  arm64 | aarch64) arch="arm64" ;;
  x86_64 | amd64)  arch="x64" ;;
  *)
    echo "Error: Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

BINARY="dep-${os}-${arch}"

# Determine download URL
if [ -n "$DEP_VERSION" ]; then
  URL="https://github.com/${REPO}/releases/download/${DEP_VERSION}/${BINARY}"
else
  URL="https://github.com/${REPO}/releases/latest/download/${BINARY}"
fi

echo "Installing DEP CLI..."
echo "  Platform: ${os}-${arch}"
echo "  URL: ${URL}"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download binary
if command -v curl >/dev/null 2>&1; then
  curl -fSL --progress-bar "$URL" -o "${INSTALL_DIR}/${BINARY_NAME}"
elif command -v wget >/dev/null 2>&1; then
  wget -q --show-progress "$URL" -O "${INSTALL_DIR}/${BINARY_NAME}"
else
  echo "Error: curl or wget is required"
  exit 1
fi

# Make executable
chmod +x "${INSTALL_DIR}/${BINARY_NAME}"

echo ""
echo "DEP CLI installed to ${INSTALL_DIR}/${BINARY_NAME}"

# Check if in PATH
case ":$PATH:" in
  *":${INSTALL_DIR}:"*) ;;
  *)
    echo ""
    echo "Add to your PATH by running:"
    echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
    echo ""
    echo "Or add this line to your shell profile (~/.zshrc, ~/.bashrc, etc.)"
    ;;
esac
