# 🛸 YANA: The Native Android Intelligence Enclave (V3.2)

YANA (Yet Another News Aggregator) is a high-performance, **Android-first** intelligence terminal designed for deep immersion, cryptographic privacy, and AI-accelerated synthesis. It transforms fragmented news dispatches into a cohesive, secure stream with native device feel.

## 📱 **The Android-First Experience**
YANA has been re-engineered from the ground up for the mobile hand:
- **Bottom Navigation Hub**: High-frequency actions (News, Streams, Vault, and Settings) are always within thumb-reach.
- **Edge-to-Edge Immersion**: Full support for **Safe Area Insets** (Notches and Gesture Bars) ensures a truly native app feel.
- **Magnetic Doomscrolling**: Hardware-accelerated kinetic scroll snapping for an authentic "TikTok-for-News" focus.
- **Haptic UI Feedback**: Sub-10ms UI scaling transitions and high-precision touch targets for tactile interaction.
- **Capacitor 8 Integration**: A full native Android shell providing deep device access and platform stability.

## 🧠 **AI-Synthesis Engine**
YANA leverages the **Groq Llama-3.3 70B** interface for lightning-fast intelligence extraction:
- **Tone-Aware Refinement**: Summarize technical dispatches in professional, casual, or "urgent" tones.
- **X-Ray Entity Extraction**: Automatic identification of key organizations, figures, and technologies from news snippets.
- **Real-Time Context**: Aggregates live web search data via serverless proxies to provide a 360-degree view of any unfolding event.

## ⚡ **2026 Technical Architecture**
Built on the industry's most modern standards:
- **Framework**: React 19 + Vite 7 (High-performance ESM module loading).
- **Runtime**: **Node.js 24** (Optimized for the latest GitHub Actions v5 runners).
- **Persistence**: **IndexedDB Enclave** with asynchronous `DatabaseBroker` to prevent UI thread blocking.
- **Connectivity**: Tiered RSS Proxy (Local -> Vercel Serverless -> CORS.sh) for 100% feed resilience.

## 🔐 **The Secure Intelligence Vault**
The **Vault** implements industrial-grade **AES-GCM encryption** with **PBKDF2 key derivation**.

> [!CAUTION]
> **DEAD DROP ARMED**: This is a strictly local-first enclave. Master passwords are never transmitted. Three consecutive failed decryption attempts trigger a **Global Wipe** of all local databases, custom feeds, and API keys for total data sterilization.

---

## 🚀 **Deployment & Optimization**

### **CI/CD Pipeline**
Optimized via GitHub Actions v5 with native Node 24 support.
1.  **Build Web**: Compiles a zero-warning, minified production React bundle.
2.  **Build Android**: Syncs Capacitor assets and compiles the native `app-debug.apk` automatically.

### **Local Environment**
1. **Clone the Enclave**:
   ```bash
   git clone https://github.com/venkatram-s/YANA.git
   cd YANA
   ```
2. **Install with Parity**:
   ```bash
   npm install --legacy-peer-deps
   ```
3. **Initialize Core**:
   ```bash
   npm run dev
   # or
   npx cap open android
   ```

### **Attribution**
Built with a zero-bloat philosophy. Leveraging native Web Crypto, Speech Synthesis, and DOM APIs for maximum privacy and minimum footprint.
