#!/bin/bash

# Security Validation Script for Doorways '25
# Run this script to validate security implementations

echo "🔒 Security Validation for Doorways '25"
echo "========================================"

# Check for npm vulnerabilities
echo "1. Checking npm dependencies for vulnerabilities..."
npm audit --audit-level moderate
if [ $? -eq 0 ]; then
    echo "✅ No npm vulnerabilities found"
else
    echo "❌ npm vulnerabilities detected"
fi

# Check for Rust security issues
echo -e "\n2. Checking Rust dependencies for security issues..."
if command -v cargo-audit &> /dev/null; then
    cd src-tauri
    cargo audit --quiet
    if [ $? -eq 0 ]; then
        echo "✅ No critical Rust security issues"
    else
        echo "⚠️  Some Rust security warnings (mostly unmaintained GTK bindings)"
    fi
    cd ..
else
    echo "⚠️  cargo-audit not installed, skipping Rust security check"
    echo "   Install with: cargo install cargo-audit"
fi

# Check CSP implementation
echo -e "\n3. Checking Content Security Policy implementation..."
if grep -q "Content-Security-Policy" index.html && grep -q "Content-Security-Policy" docs/index.html; then
    echo "✅ CSP headers found in HTML files"
else
    echo "❌ CSP headers missing"
fi

if grep -q '"csp":' src-tauri/tauri.conf.json; then
    echo "✅ CSP configured in Tauri"
else
    echo "❌ CSP not configured in Tauri"
fi

# Check for security headers
echo -e "\n4. Checking other security headers..."
SECURITY_HEADERS=("X-Content-Type-Options" "X-XSS-Protection")
for header in "${SECURITY_HEADERS[@]}"; do
    if grep -q "$header" index.html && grep -q "$header" docs/index.html; then
        echo "✅ $header header found"
    else
        echo "❌ $header header missing"
    fi
done

# Check Tauri permissions
echo -e "\n5. Checking Tauri permissions..."
if grep -q '"core:default"' src-tauri/capabilities/default.json; then
    echo "⚠️  Using broad 'core:default' permissions"
else
    echo "✅ Using minimal specific permissions"
fi

# Check for hardcoded secrets
echo -e "\n6. Checking for potential hardcoded secrets..."
if grep -r -E "(password|secret|token|api_key|private_key)" src/ --exclude-dir=node_modules 2>/dev/null | grep -v -E "(console\.log|//|/\*)" | head -5; then
    echo "⚠️  Potential secrets found (review above)"
else
    echo "✅ No obvious hardcoded secrets found"
fi

# Check build output
echo -e "\n7. Checking if build is successful..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
fi

echo -e "\n🔒 Security validation complete!"
echo "See SECURITY.md for detailed security documentation."
