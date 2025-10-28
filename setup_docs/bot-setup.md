# Bot Setup and Operation Guide

This guide provides detailed steps for setting up and running the Meme Bot Flip.

## Prerequisites Checklist

- [ ] Node.js v18 or later installed
- [ ] Docker installed (for production use)
- [ ] Solana wallet with test funds
- [ ] Helius API key
- [ ] Basic understanding of Solana and token trading

## Step 1: Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd meme-bot-flip
```

2. Install dependencies:
```bash
npm install
```

3. **SECURITY FIRST**: Configure your environment:
```bash
# Copy the template file
cp .env.example .env

# Edit with your actual values (NEVER commit this file!)
nano .env
```

**⚠️ CRITICAL SECURITY STEPS:**
- **NEVER** commit your `.env` file to version control
- Use a **dedicated trading wallet** with limited funds
- **Backup your private keys** securely offline
- **Rotate API keys** regularly
- **Monitor your wallet** for unauthorized transactions

Required environment variables (see `.env.example` for full list):
- `WALLET_PRIVATE_KEY`: Your Solana wallet private key (base58/base64)
- `HELIUS_API_KEY`: Your Helius API key
- `TELEGRAM_BOT_TOKEN`: Telegram bot token (optional)
- `TELEGRAM_CHAT_ID`: Telegram chat ID (optional)
- `TRADE_AMOUNT`: Amount of SOL per trade (start small!)
- `MAX_SLIPPAGE`: Maximum slippage tolerance (%)
- `MIN_LIQUIDITY`: Minimum liquidity requirement (SOL)

## Step 2: Initial Testing

1. Start the bot in test mode:
```bash
npm run test
```

2. Monitor logs:
```bash
# View trade log
cat src/data/trade_log.csv

# View system log
cat src/data/logs/app.log
```

3. Test with small amounts:
- Start with 0.1 SOL for testing
- Monitor performance for at least 1 hour (configurable in `.env`)
- Gradually increase amount if performance is satisfactory

## Step 3: Trading Configuration

1. Risk Parameters:
- Set `MAX_SLIPPAGE` based on market conditions
- Adjust `MIN_SAFETY_SCORE` based on risk tolerance
- Configure `MAX_HOLD_TIME_MS` based on your trading strategy

2. Liquidity Requirements:
- Set `MIN_LIQUIDITY` to avoid low liquidity tokens
- Consider market conditions when adjusting

3. Trading Strategy:
- Review and adjust strategy parameters in `src/features/strategy/`
- Test different parameter combinations
- Document successful configurations

## Step 4: Starting the Bot

1. Verify configuration:
```bash
# Check environment variables
cat .env

# Verify wallet balance
npm run check-balance
```

2. Start trading:
```bash
# Start in production mode
npm start
```

3. Monitor performance:
- Check logs every 30 minutes
- Monitor wallet balance
- Watch for unusual activity

## Step 5: Regular Maintenance

1. Daily Tasks:
- Review trade logs
- Check system logs for errors
- Monitor wallet balance
- Verify API key status

2. Weekly Tasks:
- Backup trade logs
- Review performance metrics
- Update dependencies
- Check for new releases

## Troubleshooting

1. Common Issues:
- API key expiration
- Network connectivity
- Wallet balance issues
- Transaction failures

2. Solutions:
- Rotate API keys regularly
- Check network connection
- Monitor wallet balance
- Review transaction logs

## Emergency Procedures

1. Stop the bot:
```bash
# In Docker
docker-compose down

# Local
pkill -f "node src/bot.js"
```

2. Backup data:
```bash
# Create backup directory
mkdir -p backups/$(date +%Y-%m-%d)

# Backup logs
cp src/data/trade_log.csv backups/$(date +%Y-%m-%d)/
cp -r src/data/logs backups/$(date +%Y-%m-%d)/
```

## Security Best Practices

### 🔒 Wallet Security
- **Use a dedicated trading wallet** with limited funds only
- **Never use your main wallet** for automated trading
- **Backup private keys** securely offline (encrypted USB, paper wallet)
- **Monitor wallet activity** regularly for unauthorized transactions
- **Consider hardware wallet** for large amounts

### 🔑 API Key Management
- **Rotate API keys** every 30-90 days
- **Use environment variables** for all sensitive data
- **Never hardcode** API keys in source code
- **Monitor API usage** for unusual activity
- **Revoke compromised keys** immediately

### 📁 File Security
- **Never commit** `.env` files to version control
- **Use `.env.example`** templates for sharing configuration
- **Secure file permissions** (600 for sensitive files)
- **Regular backups** of configuration and data
- **Clean up** temporary files containing sensitive data

### 🛡️ Operational Security
- **Run in isolated environment** (Docker recommended)
- **Monitor system resources** and logs
- **Set up alerts** for unusual activity
- **Regular security updates** for dependencies
- **Test changes** in development environment first

## Risk Management

1. **Start Small**: Begin with minimal amounts (0.01-0.1 SOL)
2. **Conservative Limits**: Set strict slippage and liquidity requirements
3. **Regular Review**: Monitor performance and adjust parameters
4. **Document Changes**: Keep track of all configuration modifications
5. **Emergency Procedures**: Know how to stop the bot quickly

## Maintenance

1. **Daily**: Review logs, check wallet balance, monitor API status
2. **Weekly**: Backup data, review performance, update dependencies
3. **Monthly**: Rotate API keys, security audit, performance analysis
4. **Quarterly**: Full system review, dependency updates, security assessment

## Support

For issues or questions:
1. Check documentation
2. Review logs
3. Contact support
4. Report bugs 