# 🤖 Solana Trading-Bot Simulation mit echten Marktdaten

Eine realistische Trading-Bot-Simulation für Solana Memecoins mit **echten Marktdaten**, **5-Minuten-Charts** und **authentischen Trading-Strategien**.

## 🚀 Neue Features: Bitquery Integration

### ✨ Was ist neu?
- **🔥 Echte neue Memecoins** - Token die in den letzten 24h nach Raydium migriert sind
- **📊 5-Minuten-OHLCV-Daten** - Echte Volatilität und Volume-Spikes  
- **⏰ Präzise Zeitfilter** - Min. 25min nach Launch, max. 24h alt
- **💰 Market Cap Filter** - Mindestens 50k Market Cap
- **🎯 Bot-spezifische Token-Auswahl** - Jeder Bot bekommt die für ihn optimalen Token

### 🔄 Migration von Pump.fun → Raydium
```typescript
// Echte Filter für neue Memecoins:
✅ Nach Raydium migriert (nicht mehr auf Bonding Curve)
✅ Nicht älter als 24 Stunden  
✅ Mindestens 50k Market Cap
✅ Mindestens 25 Minuten nach Raydium-Launch (Filter für frühe Chaos-Phase)
✅ 5-Minuten-Candlestick-Daten verfügbar
```

## 🎯 Bot-Strategien mit echten Daten

### 1. **Volume-Tracker Bot** 🔊
- **Strategie**: Kauft bei 3x Volume-Spikes, verkauft bei Normalisierung
- **Filter**: Bevorzugt Token mit hohem 24h-Volume (>20k$)
- **Exits**: -10% Stop-Loss, +20% Take-Profit, 8h Timeout
- **5min-Logik**: Prüft alle 5 Minuten auf Volume-Anomalien

### 2. **Trend-Surfer Bot** 🏄‍♂️  
- **Strategie**: Folgt 1h-Trends, verkauft bei Trendwechsel
- **Filter**: Bevorzugt moderate Volatilität (20-80%), stabilere MCaps
- **Exits**: -8% Stop-Loss, +15% Take-Profit, 12h Timeout
- **5min-Logik**: Berechnet stündliche Momentum-Indikatoren

### 3. **Dip-Hunter Bot** 📉
- **Strategie**: Kauft bei -15% Dips mit hohem Volume
- **Filter**: Bevorzugt volatile Token <200k MCap, sucht aktive Dips
- **Exits**: -6% Stop-Loss, +8% Take-Profit, 16h Timeout  
- **5min-Logik**: Erkennt 30min-Dips mit Volume-Bestätigung

## 🔧 Setup & Installation

### 1. API-Keys einrichten

```bash
# .env.local erstellen
cp env.example .env.local
```

**Bitquery API (EMPFOHLEN):**
```bash
# Registrierung: https://bitquery.io/
# Kostenlos: 10k Punkte/Monat, 10 req/min
BITQUERY_API_KEY=your_bitquery_api_key_here
```

**Alternative APIs:**
```bash
# Birdeye API (Backup)
BIRDEYE_API_KEY=your_birdeye_api_key_here

# Helius API (Optional)  
HELIUS_API_KEY=your_helius_api_key_here
```

### 2. Starten

```bash
npm install
npm run dev
```

### 3. Verwenden

1. **Bot-Karte öffnen** in der UI
2. **"Real API Data"** aktivieren  
3. **Bitquery-Modus** ist standardmäßig aktiviert
4. **Ergebnisse vergleichen** - echte vs. simulierte Daten

## 📊 Datenqualität & Realismus

### Bitquery API (NEU - Empfohlen):
- ✅ **Echte 5-Minuten-OHLCV** von Solana DEXs
- ✅ **Raydium Migration-Tracking**  
- ✅ **Präzise Zeitfilter** (25min bis 24h)
- ✅ **Volume-Spikes** und Liquiditäts-Events
- ✅ **Bot-spezifische Token-Selektion**
- ✅ **Pump.fun → Raydium Timeline**

### Legacy APIs (Birdeye/DexScreener):
- ⚠️ Teilweise tägliche Daten
- ⚠️ Begrenzte Memecoin-Coverage
- ⚠️ Weniger granulare Volume-Daten

### Simulierte Daten:
- ⚠️ Mathematische Modelle
- ⚠️ Künstliche Volatilitätsmuster
- ⚠️ Hypothetische Szenarien

## 🔍 Echte Trading-Simulation

### Beispiel: Volume-Tracker Bot

```typescript
// Echter 5-Minuten-Candlestick aus Bitquery
const candle = {
  timestamp: 1703123400000, // 21.12.2023 10:30
  open: 0.000024,
  high: 0.000031,           // +29% Spike!
  low: 0.000023,
  close: 0.000028,
  volume: 89543             // 3.2x Volume-Increase
}

// Bot-Logik: Volume-Spike erkannt
if (candle.volume > previousCandle.volume * 3) {
  // 🟢 KAUFE bei Volume-Spike
  position = { entry: 0.000028, time: timestamp }
}

// Nächste Candles: Exit-Prüfung
const currentPrice = 0.000025; // -10.7%
if (priceChange <= -0.10) {
  // 🔴 VERKAUFE bei Stop-Loss
  trade = { profit: -10.7%, duration: '35min' }
}
```

### Performance-Berechnung:

```typescript
// Echte Token-Performance über 7 Tage
const tokens = [
  { symbol: 'NEWMEME', profit: +23.4% },  // Erfolgreicher Trend
  { symbol: 'RUGTOKEN', profit: -8.1% },  // Stop-Loss getriggert  
  { symbol: 'MOONSHOT', profit: +67.8% }, // Volume-Spike gehandelt
];

// Bot-Performance: 
// Durchschnitt: +27.7%
// Win-Rate: 66.7% (2/3)
// Trades: 47 über 7 Tage
```

## 🚨 API-Limits & Kosten

### Bitquery (Empfohlen):
- **Kostenlos**: 10k Punkte/Monat  
- **Rate Limit**: 10 Requests/Minute
- **Punkt-Kosten**: ~1-5 Punkte pro Query
- **Reichweite**: ~2000-10000 API-Calls/Monat

### Fallback-Strategie:
```typescript
// 1. Bitquery API (beste Daten)
// 2. Birdeye API (gute Daten)  
// 3. DexScreener API (basic Daten)
// 4. Lokale Simulation (künstlich)
```

## 🎮 UI & UX

### Bot-Karten zeigen:
- **📈 Performance-Chart** - 7-Tage-Verlauf mit echten Marktdaten
- **🎯 Trading-Metriken** - Win-Rate, Anzahl Trades, Durchschnittsprofit
- **🪙 Token-Liste** - Verwendete Memecoins mit Symbolen und Volume
- **🔴 Live-Indikator** - "Bitquery API", "Legacy API", oder "Simulated"
- **🔄 Refresh-Button** - Lädt neue Token-Auswahl

### Vergleichsmodus:
```
┌─ Volume-Tracker Bot ────────────┐
│ 🔴 Bitquery API                │
│ +34.7% │ 23 Trades │ 73% Win   │
│ NEWMEME, FASTCAT, SOLRISE...   │
└────────────────────────────────┘

┌─ Volume-Tracker Bot ────────────┐  
│ 🚀 Simulated Data              │
│ +28.3% │ 19 Trades │ 68% Win   │
│ MOCKTOKEN1, TESTCOIN, DEMO...  │
└────────────────────────────────┘
```

## 🔬 Entwicklung & Testing

### Lokale Entwicklung:
```bash
# Mit Bitquery API
BITQUERY_API_KEY=your_key npm run dev

# Ohne API (Fallback-Modus)  
npm run dev
```

### Testing:
```bash
# API-Verbindung testen
curl -X POST http://localhost:3000/api/simulation \
  -H "Content-Type: application/json" \
  -d '{"botType":"volume-tracker","useBitquery":true}'
```

### Debug-Logs:
```typescript
// Console-Output bei Bitquery-Simulation:
🚀 Starting BITQUERY simulation for bot: volume-tracker
🔍 Searching for new Raydium memecoin migrations...
✅ Found 23 qualifying memecoins for simulation  
🎯 Selected 10 tokens for volume-tracker strategy
📊 Simulation Results: +34.72% profit, 23 trades, 73.9% success rate
```

## 📈 Roadmap

### Phase 1: ✅ Grundlegende Integration
- [x] Bitquery API-Integration
- [x] 5-Minuten-Candlestick-Daten
- [x] Raydium-Migration-Filter  
- [x] Bot-spezifische Token-Selektion

### Phase 2: 🚧 Erweiterte Features
- [ ] Real-Time WebSocket-Updates
- [ ] Multi-DEX-Support (Jupiter, Orca)
- [ ] Portfolio-Tracking über mehrere Tage
- [ ] Rug-Pull-Detection mit ML

### Phase 3: 🔮 Advanced Analytics  
- [ ] Backtest-Engine für historische Daten
- [ ] Risk-Management mit Position-Sizing
- [ ] Social-Sentiment-Integration (Twitter, Telegram)
- [ ] Copy-Trading und Bot-Abonnements

## ⚡ Performance-Optimierungen

### Caching-Strategien:
```typescript
// Token-Discovery: 5min Cache
// Price-History: 1min Cache  
// Bot-Simulation: 30sec Cache
// API-Fallbacks: Automatisch
```

### Rate-Limit-Management:
```typescript
// Intelligente Request-Verteilung:
// 10 req/min = 1 req alle 6 Sekunden
// Burst-Protection mit exponential backoff
// Fallback-APIs bei Überschreitung
```

## 🐛 Troubleshooting

### Häufige Probleme:

**"Bitquery API Verbindung fehlgeschlagen":**
```bash
# 1. API-Key prüfen
echo $BITQUERY_API_KEY

# 2. Rate-Limit prüfen (max 10/min)
# 3. Fallback zu Legacy-APIs aktiviert
```

**"Keine neuen Memecoins gefunden":**
```bash
# Normal in ruhigen Marktphasen
# Fallback zu simulierten Daten
# Filter sind sehr streng (25min-24h, 50k MCap)
```

**"Simulation dauert zu lange":**
```bash
# Reduziere tokenCount von 10 auf 5
# Prüfe Internet-Verbindung
# Bitquery API kann 2-5 Sekunden dauern
```

## 📝 Fazit

Die **Bitquery-Integration** macht die Trading-Bot-Simulation **deutlich realistischer**:

- ✅ **Echte neue Memecoins** statt vordefinierter Token-Listen
- ✅ **5-Minuten-Granularität** für präzise Entry/Exit-Punkte  
- ✅ **Dynamische Token-Discovery** basierend auf echten Raydium-Migrationen
- ✅ **Bot-spezifische Optimierung** für Volume, Trends und Dips

**Für Demo-Zwecke**: Simulierte Daten  
**Für ernsthafte Analyse**: Bitquery API mit echten Memecoin-Daten

---

🚀 **Ready to trade with real data?** Hol dir deinen [Bitquery API-Key](https://bitquery.io/) und erlebe echte Memecoin-Volatilität! 