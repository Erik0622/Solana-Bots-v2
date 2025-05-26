# 🚀 Bitquery API Setup Anleitung

## ✅ Deine Bitquery Credentials sind integriert!

### 1. Erstelle .env.local Datei

Erstelle eine Datei namens `.env.local` im Hauptverzeichnis mit folgendem Inhalt:

```bash
# Bitquery API - Solana Trading Bot Projekt
BITQUERY_API_KEY=ory_at_4t1KnHlwObAx_MVV5xuXlHRa86VmpiA7KhJjNLyC9MQ.-3tIZhQyT8xbIf5EQnt2e8GLnux0pFAwyl1uCVzZQZg
BITQUERY_PROJECT_ID=0aeb55a3-7c07-4eb2-8672-3e33cbe428a2
BITQUERY_SECRET=A3pO89GykmVdSiAqvJvQfsiILK

# Backup APIs (optional)
BIRDEYE_API_KEY=e8f73c42f4ab47f7a5b9d299672ed8c9

# Solana RPC
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### 2. Starte die Anwendung

```bash
npm run dev
```

### 3. Teste die Integration

Die Bitquery API ist bereits integriert und wird automatisch verwendet. Du siehst in der Konsole:

```
🔗 Bitquery API initialisiert für Projekt: 0aeb55a3-7c07-4eb2-8672-3e33cbe428a2
🧪 Teste Bitquery API Verbindung...
✅ Bitquery API Verbindung erfolgreich
🔍 Suche nach neuen Raydium Memecoins...
```

### 4. Bot-Simulation mit echten Daten

Die Bots verwenden jetzt **echte neue Memecoins** von Solana:

#### 🔊 Volume-Tracker Bot
- **Findet**: Token mit 3x Volume-Spikes in den letzten 24h
- **Filter**: > 50k Market Cap, > 25min nach Raydium Launch
- **Daten**: Echte 5-Minuten-OHLCV-Candlesticks

#### 🏄‍♂️ Trend-Surfer Bot  
- **Findet**: Token mit starken 1h-Trends (>6% Bewegung)
- **Filter**: Moderate Volatilität (20-80%), stabilere Token
- **Daten**: Stündliche Momentum-Indikatoren

#### 📉 Dip-Hunter Bot
- **Findet**: Token mit -15% Dips + hohem Volume
- **Filter**: Volatile Token <200k MCap
- **Daten**: 30-Minuten-Dip-Erkennung

### 5. Console-Output verstehen

```bash
🚀 Starting BITQUERY simulation for bot: volume-tracker
🔍 Searching for new Raydium memecoin migrations...
📊 23 Token von Bitquery erhalten, filtere nach Kriterien...
✅ Token qualifiziert: NEWMEME (MCap: $156,789, Age: 2.3h)
✅ Token qualifiziert: FASTCAT (MCap: $89,234, Age: 4.7h)
❌ Token nicht qualifiziert: OLDTOKEN (MCap: $23,456, Age: 0.1h)
📈 Lade 5-Min Historie für Token: 7xKj5nP8...
📊 47 5-Min Candles für 7xKj5nP8... geladen
🎯 Selected 10 tokens for volume-tracker strategy
📊 Simulation Results: +34.72% profit, 23 trades, 73.9% success rate
```

### 6. API-Limits & Monitoring

**Dein Bitquery Plan:**
- ✅ **Kostenlos**: 10k Punkte/Monat
- ✅ **Rate Limit**: 10 Requests/Minute  
- ✅ **Punkt-Kosten**: ~1-5 Punkte pro Query
- ✅ **Geschätzte Reichweite**: ~2000-10000 API-Calls/Monat

**Monitoring:**
- Dashboard: https://bitquery.io/dashboard
- API-Usage: https://bitquery.io/projects/0aeb55a3-7c07-4eb2-8672-3e33cbe428a2

### 7. Fallback-Verhalten

Falls Bitquery-Limits erreicht werden:
1. **Automatischer Fallback** zu Birdeye API
2. **Bei Fehlern**: Simulierte Memecoin-Daten
3. **Rate Limit**: Wartezeit + Retry-Logic

### 8. Troubleshooting

**Problem**: "Bitquery API Verbindung fehlgeschlagen"
```bash
# Prüfe .env.local
cat .env.local | grep BITQUERY

# Prüfe Rate-Limits (max 10/min)
# Check: https://bitquery.io/dashboard
```

**Problem**: "Keine neuen Memecoins gefunden"
```bash
# Normal in ruhigen Marktphasen
# Filter sind sehr streng (25min-24h, 50k MCap)
# Fallback zu simulierten Daten aktiviert
```

### 9. Nächste Schritte

1. **Starte die App**: `npm run dev`
2. **Öffne Browser**: http://localhost:3000
3. **Klicke auf Bot-Karten** und aktiviere "Real API Data"
4. **Vergleiche Ergebnisse** zwischen echten und simulierten Daten

## 🎯 Ergebnis

Du hast jetzt Zugang zu **echten Solana Memecoin-Daten** mit:
- ✅ 5-Minuten-Granularität
- ✅ Echte Volume-Spikes
- ✅ Raydium-Migration-Tracking
- ✅ Bot-spezifische Token-Auswahl
- ✅ Realistische Trading-Performance

**Viel Erfolg beim Testen der Trading-Bots! 🚀** 