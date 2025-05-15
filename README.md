# SolBotQuants - Automatisierte Trading-Bots für Solana

SolBotQuants ist eine Plattform für automatisierte Trading-Bots auf der Solana-Blockchain. Die Anwendung ermöglicht es Benutzern, verschiedene Trading-Strategien zu nutzen, um in den volatilen Märkten von Kryptowährungen und insbesondere neuen Token zu handeln.

## Hauptfunktionen

- **Verschiedene Bot-Strategien**: Wählen Sie aus mehreren spezialisierten Trading-Strategien
- **Wallet-Integration**: Verbinden Sie Ihre Solana-Wallet für echtes Trading
- **Risikomanagement**: Konfigurieren Sie Risikoprofile und Stop-Loss-Grenzen
- **Performance-Tracking**: Verfolgen Sie Ihre Handelsleistung im Dashboard
- **Echtzeit-Daten**: Integration mit Jupiter für präzise Preise und Liquidität

## Bot-Strategien

### NewTokenHunter
Spezialisiert auf neue Token (unter 24 Stunden alt) auf der Solana-Blockchain:
- Automatische Suche nach neuen Token-Listings
- Prüfung auf gelockte Liquidität und keine Honeypot-Strukturen
- Mindestmarktkapitalisierung von 100.000 
- Handel ausschließlich mit SOL als Basiswährung
- Anpassbare Risikoparameter und Exit-Strategien

### VolumeTracker
Identifiziert plötzliche Volumenanstiege in etablierten Märkten:
- Erkennt Volumenabnormalitäten in kurzen Zeiträumen
- Handelt auf Basis von Volumenprofilen und Markttiefen
- Optimiert für schnelle Marktbewegungen

### TrendSurfer
Folgt mittelfristigen Markttrends:
- Nutzt Momentum-Indikatoren und Moving Averages
- Identifiziert Trendbestätigungen und -umkehrungen
- Optimiert für Märkte mit klaren Trendbewegungen

### DipHunter
Spezialisiert auf das Kaufen von temporären Preisrückgängen:
- Identifiziert übermäßige Preisrückgänge
- Prüft fundamentale Daten für Kaufgelegenheiten
- Optimiert für mittelfristige Positionen

## Technische Details

- Frontend: Next.js mit React und Tailwind CSS
- Backend: Next.js API-Routen mit Prisma ORM
- Datenbank: PostgreSQL (Supabase)
- Blockchain-Integration: Solana Web3.js und Jupiter SDK
- Sicherheitsüberprüfung: Integration mit RugCheck API und anderen Sicherheitsdiensten

## Konfiguration und Umgebungsvariablen

Die Anwendung benötigt folgende Umgebungsvariablen:

```
SOLANA_RPC_URL=https://your-rpc-url
SUPABASE_URL=https://your-supabase-url
SUPABASE_KEY=your-supabase-key
BIRDEYE_API_KEY=your-birdeye-api-key
RUGCHECK_API_KEY=your-rugcheck-api-key
```

## Installation

1. Repository klonen
```bash
git clone https://github.com/yourusername/solbotquants.git
cd solbotquants
```

2. Abhängigkeiten installieren
```bash
npm install
```

3. Umgebungsvariablen konfigurieren
Erstellen Sie eine `.env`-Datei basierend auf `.env.example`

4. Entwicklungsserver starten
```bash
npm run dev
```

## Produktion

Für die Produktionsbereitstellung:

```bash
npm run build
npm run start
```

## Sicherheitshinweise

- Verbinden Sie nur Wallets mit ausreichender Sicherheit
- Setzen Sie das Handelsvolumen auf einen angemessenen Prozentsatz Ihres Kapitals
- Verwenden Sie die Risikomanagement-Funktionen für jede Bot-Strategie
- Beachten Sie, dass neue Token auf Solana ein hohes Risiko darstellen können 