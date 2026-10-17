// scripts/build-financial-snapshots.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";

// src/sp500-data.js
var sp500Metadata = {
  "asOf": "2026-10-15",
  "checkedOn": "2026-10-16",
  "count": 503,
  "basis": "Equity-symbol coverage from the SPY daily holdings snapshot; not a licensed live index-membership feed.",
  "holdingsSource": "https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-spy.xlsx",
  "listingSource": "https://www.sec.gov/files/company_tickers_exchange.json",
  "holdingsSha256": "cf0319180a4b20bcbc6dd42ce535d23a71f121754d88734d55e910fb505159e5",
  "listingSha256": "d04923d674c6d0084dc56e67efd9cb5756f965366affe9d3e18d38b379ffd45f"
};
var sp500Securities = [
  {
    "ticker": "A",
    "name": "AGILENT TECHNOLOGIES, INC.",
    "symbol": "NYSE:A",
    "providerExchange": "NYSE",
    "secTicker": "A",
    "cik": "0001090872"
  },
  {
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "symbol": "NASDAQ:AAPL",
    "providerExchange": "NASDAQ",
    "secTicker": "AAPL",
    "cik": "0000320193"
  },
  {
    "ticker": "ABBV",
    "name": "AbbVie Inc.",
    "symbol": "NYSE:ABBV",
    "providerExchange": "NYSE",
    "secTicker": "ABBV",
    "cik": "0001551152"
  },
  {
    "ticker": "ABNB",
    "name": "Airbnb, Inc.",
    "symbol": "NASDAQ:ABNB",
    "providerExchange": "NASDAQ",
    "secTicker": "ABNB",
    "cik": "0001559720"
  },
  {
    "ticker": "ABT",
    "name": "ABBOTT LABORATORIES",
    "symbol": "NYSE:ABT",
    "providerExchange": "NYSE",
    "secTicker": "ABT",
    "cik": "0000001800"
  },
  {
    "ticker": "ACGL",
    "name": "ARCH CAPITAL GROUP LTD.",
    "symbol": "NASDAQ:ACGL",
    "providerExchange": "NASDAQ",
    "secTicker": "ACGL",
    "cik": "0000947484"
  },
  {
    "ticker": "ACN",
    "name": "Accenture plc",
    "symbol": "NYSE:ACN",
    "providerExchange": "NYSE",
    "secTicker": "ACN",
    "cik": "0001467373"
  },
  {
    "ticker": "ADBE",
    "name": "ADOBE INC.",
    "symbol": "NASDAQ:ADBE",
    "providerExchange": "NASDAQ",
    "secTicker": "ADBE",
    "cik": "0000796343"
  },
  {
    "ticker": "ADI",
    "name": "ANALOG DEVICES INC",
    "symbol": "NASDAQ:ADI",
    "providerExchange": "NASDAQ",
    "secTicker": "ADI",
    "cik": "0000006281"
  },
  {
    "ticker": "ADM",
    "name": "Archer-Daniels-Midland Co",
    "symbol": "NYSE:ADM",
    "providerExchange": "NYSE",
    "secTicker": "ADM",
    "cik": "0000007084"
  },
  {
    "ticker": "ADP",
    "name": "AUTOMATIC DATA PROCESSING INC",
    "symbol": "NASDAQ:ADP",
    "providerExchange": "NASDAQ",
    "secTicker": "ADP",
    "cik": "0000008670"
  },
  {
    "ticker": "ADSK",
    "name": "Autodesk, Inc.",
    "symbol": "NASDAQ:ADSK",
    "providerExchange": "NASDAQ",
    "secTicker": "ADSK",
    "cik": "0000769397"
  },
  {
    "ticker": "AEE",
    "name": "AMEREN CORP",
    "symbol": "NYSE:AEE",
    "providerExchange": "NYSE",
    "secTicker": "AEE",
    "cik": "0001002910"
  },
  {
    "ticker": "AEP",
    "name": "AMERICAN ELECTRIC POWER CO INC",
    "symbol": "NASDAQ:AEP",
    "providerExchange": "NASDAQ",
    "secTicker": "AEP",
    "cik": "0000004904"
  },
  {
    "ticker": "AES",
    "name": "AES CORP",
    "symbol": "NYSE:AES",
    "providerExchange": "NYSE",
    "secTicker": "AES",
    "cik": "0000874761"
  },
  {
    "ticker": "AFL",
    "name": "AFLAC INC",
    "symbol": "NYSE:AFL",
    "providerExchange": "NYSE",
    "secTicker": "AFL",
    "cik": "0000004977"
  },
  {
    "ticker": "AIG",
    "name": "AMERICAN INTERNATIONAL GROUP, INC.",
    "symbol": "NYSE:AIG",
    "providerExchange": "NYSE",
    "secTicker": "AIG",
    "cik": "0000005272"
  },
  {
    "ticker": "AIZ",
    "name": "ASSURANT, INC.",
    "symbol": "NYSE:AIZ",
    "providerExchange": "NYSE",
    "secTicker": "AIZ",
    "cik": "0001267238"
  },
  {
    "ticker": "AJG",
    "name": "Arthur J. Gallagher & Co.",
    "symbol": "NYSE:AJG",
    "providerExchange": "NYSE",
    "secTicker": "AJG",
    "cik": "0000354190"
  },
  {
    "ticker": "AKAM",
    "name": "AKAMAI TECHNOLOGIES INC",
    "symbol": "NASDAQ:AKAM",
    "providerExchange": "NASDAQ",
    "secTicker": "AKAM",
    "cik": "0001086222"
  },
  {
    "ticker": "ALB",
    "name": "ALBEMARLE CORP",
    "symbol": "NYSE:ALB",
    "providerExchange": "NYSE",
    "secTicker": "ALB",
    "cik": "0000915913"
  },
  {
    "ticker": "ALGN",
    "name": "ALIGN TECHNOLOGY INC",
    "symbol": "NASDAQ:ALGN",
    "providerExchange": "NASDAQ",
    "secTicker": "ALGN",
    "cik": "0001097149"
  },
  {
    "ticker": "ALL",
    "name": "ALLSTATE CORP",
    "symbol": "NYSE:ALL",
    "providerExchange": "NYSE",
    "secTicker": "ALL",
    "cik": "0000899051"
  },
  {
    "ticker": "ALLE",
    "name": "Allegion plc",
    "symbol": "NYSE:ALLE",
    "providerExchange": "NYSE",
    "secTicker": "ALLE",
    "cik": "0001579241"
  },
  {
    "ticker": "AMAT",
    "name": "APPLIED MATERIALS INC /DE",
    "symbol": "NASDAQ:AMAT",
    "providerExchange": "NASDAQ",
    "secTicker": "AMAT",
    "cik": "0000006951"
  },
  {
    "ticker": "AMCR",
    "name": "Amcor plc",
    "symbol": "NYSE:AMCR",
    "providerExchange": "NYSE",
    "secTicker": "AMCR",
    "cik": "0001748790"
  },
  {
    "ticker": "AMD",
    "name": "ADVANCED MICRO DEVICES INC",
    "symbol": "NASDAQ:AMD",
    "providerExchange": "NASDAQ",
    "secTicker": "AMD",
    "cik": "0000002488"
  },
  {
    "ticker": "AME",
    "name": "AMETEK INC/",
    "symbol": "NYSE:AME",
    "providerExchange": "NYSE",
    "secTicker": "AME",
    "cik": "0001037868"
  },
  {
    "ticker": "AMGN",
    "name": "AMGEN INC",
    "symbol": "NASDAQ:AMGN",
    "providerExchange": "NASDAQ",
    "secTicker": "AMGN",
    "cik": "0000318154"
  },
  {
    "ticker": "AMP",
    "name": "AMERIPRISE FINANCIAL INC",
    "symbol": "NYSE:AMP",
    "providerExchange": "NYSE",
    "secTicker": "AMP",
    "cik": "0000820027"
  },
  {
    "ticker": "AMT",
    "name": "AMERICAN TOWER CORP /MA/",
    "symbol": "NYSE:AMT",
    "providerExchange": "NYSE",
    "secTicker": "AMT",
    "cik": "0001053507"
  },
  {
    "ticker": "AMZN",
    "name": "AMAZON COM INC",
    "symbol": "NASDAQ:AMZN",
    "providerExchange": "NASDAQ",
    "secTicker": "AMZN",
    "cik": "0001018724"
  },
  {
    "ticker": "ANET",
    "name": "Arista Networks, Inc.",
    "symbol": "NYSE:ANET",
    "providerExchange": "NYSE",
    "secTicker": "ANET",
    "cik": "0001596532"
  },
  {
    "ticker": "AON",
    "name": "Aon plc",
    "symbol": "NYSE:AON",
    "providerExchange": "NYSE",
    "secTicker": "AON",
    "cik": "0000315293"
  },
  {
    "ticker": "AOS",
    "name": "SMITH A O CORP",
    "symbol": "NYSE:AOS",
    "providerExchange": "NYSE",
    "secTicker": "AOS",
    "cik": "0000091142"
  },
  {
    "ticker": "APA",
    "name": "APA Corp",
    "symbol": "NASDAQ:APA",
    "providerExchange": "NASDAQ",
    "secTicker": "APA",
    "cik": "0001841666"
  },
  {
    "ticker": "APD",
    "name": "Air Products & Chemicals, Inc.",
    "symbol": "NYSE:APD",
    "providerExchange": "NYSE",
    "secTicker": "APD",
    "cik": "0000002969"
  },
  {
    "ticker": "APH",
    "name": "AMPHENOL CORP /DE/",
    "symbol": "NYSE:APH",
    "providerExchange": "NYSE",
    "secTicker": "APH",
    "cik": "0000820313"
  },
  {
    "ticker": "APO",
    "name": "Apollo Global Management, Inc.",
    "symbol": "NYSE:APO",
    "providerExchange": "NYSE",
    "secTicker": "APO",
    "cik": "0001858681"
  },
  {
    "ticker": "APP",
    "name": "AppLovin Corp",
    "symbol": "NASDAQ:APP",
    "providerExchange": "NASDAQ",
    "secTicker": "APP",
    "cik": "0001751008"
  },
  {
    "ticker": "APTV",
    "name": "Aptiv PLC",
    "symbol": "NYSE:APTV",
    "providerExchange": "NYSE",
    "secTicker": "APTV",
    "cik": "0001521332"
  },
  {
    "ticker": "ARE",
    "name": "ALEXANDRIA REAL ESTATE EQUITIES, INC.",
    "symbol": "NYSE:ARE",
    "providerExchange": "NYSE",
    "secTicker": "ARE",
    "cik": "0001035443"
  },
  {
    "ticker": "ARES",
    "name": "Ares Management Corp",
    "symbol": "NYSE:ARES",
    "providerExchange": "NYSE",
    "secTicker": "ARES",
    "cik": "0001176948"
  },
  {
    "ticker": "ATO",
    "name": "ATMOS ENERGY CORP",
    "symbol": "NYSE:ATO",
    "providerExchange": "NYSE",
    "secTicker": "ATO",
    "cik": "0000731802"
  },
  {
    "ticker": "AVGO",
    "name": "Broadcom Inc.",
    "symbol": "NASDAQ:AVGO",
    "providerExchange": "NASDAQ",
    "secTicker": "AVGO",
    "cik": "0001730168"
  },
  {
    "ticker": "AVY",
    "name": "Avery Dennison Corp",
    "symbol": "NYSE:AVY",
    "providerExchange": "NYSE",
    "secTicker": "AVY",
    "cik": "0000008818"
  },
  {
    "ticker": "AWK",
    "name": "American Water Works Company, Inc.",
    "symbol": "NYSE:AWK",
    "providerExchange": "NYSE",
    "secTicker": "AWK",
    "cik": "0001410636"
  },
  {
    "ticker": "AXON",
    "name": "AXON ENTERPRISE, INC.",
    "symbol": "NASDAQ:AXON",
    "providerExchange": "NASDAQ",
    "secTicker": "AXON",
    "cik": "0001069183"
  },
  {
    "ticker": "AXP",
    "name": "AMERICAN EXPRESS CO",
    "symbol": "NYSE:AXP",
    "providerExchange": "NYSE",
    "secTicker": "AXP",
    "cik": "0000004962"
  },
  {
    "ticker": "AZO",
    "name": "AUTOZONE INC",
    "symbol": "NYSE:AZO",
    "providerExchange": "NYSE",
    "secTicker": "AZO",
    "cik": "0000866787"
  },
  {
    "ticker": "BA",
    "name": "BOEING CO",
    "symbol": "NYSE:BA",
    "providerExchange": "NYSE",
    "secTicker": "BA",
    "cik": "0000012927"
  },
  {
    "ticker": "BAC",
    "name": "BANK OF AMERICA CORP /DE/",
    "symbol": "NYSE:BAC",
    "providerExchange": "NYSE",
    "secTicker": "BAC",
    "cik": "0000070858"
  },
  {
    "ticker": "BALL",
    "name": "BALL Corp",
    "symbol": "NYSE:BALL",
    "providerExchange": "NYSE",
    "secTicker": "BALL",
    "cik": "0000009389"
  },
  {
    "ticker": "BAX",
    "name": "BAXTER INTERNATIONAL INC",
    "symbol": "NYSE:BAX",
    "providerExchange": "NYSE",
    "secTicker": "BAX",
    "cik": "0000010456"
  },
  {
    "ticker": "BBY",
    "name": "BEST BUY CO INC",
    "symbol": "NYSE:BBY",
    "providerExchange": "NYSE",
    "secTicker": "BBY",
    "cik": "0000764478"
  },
  {
    "ticker": "BDX",
    "name": "BECTON DICKINSON & CO",
    "symbol": "NYSE:BDX",
    "providerExchange": "NYSE",
    "secTicker": "BDX",
    "cik": "0000010795"
  },
  {
    "ticker": "BE",
    "name": "Bloom Energy Corp",
    "symbol": "NYSE:BE",
    "providerExchange": "NYSE",
    "secTicker": "BE",
    "cik": "0001664703"
  },
  {
    "ticker": "BEN",
    "name": "FRANKLIN TEMPLETON INC",
    "symbol": "NYSE:BEN",
    "providerExchange": "NYSE",
    "secTicker": "BEN",
    "cik": "0000038777"
  },
  {
    "ticker": "BF.B",
    "name": "BROWN FORMAN CORP",
    "symbol": "NYSE:BF.B",
    "providerExchange": "NYSE",
    "secTicker": "BF-B",
    "cik": "0000014693"
  },
  {
    "ticker": "BG",
    "name": "Bunge Global SA",
    "symbol": "NYSE:BG",
    "providerExchange": "NYSE",
    "secTicker": "BG",
    "cik": "0001996862"
  },
  {
    "ticker": "BIIB",
    "name": "BIOGEN INC.",
    "symbol": "NASDAQ:BIIB",
    "providerExchange": "NASDAQ",
    "secTicker": "BIIB",
    "cik": "0000875045"
  },
  {
    "ticker": "BKNG",
    "name": "Booking Holdings Inc.",
    "symbol": "NASDAQ:BKNG",
    "providerExchange": "NASDAQ",
    "secTicker": "BKNG",
    "cik": "0001075531"
  },
  {
    "ticker": "BKR",
    "name": "Baker Hughes Co",
    "symbol": "NASDAQ:BKR",
    "providerExchange": "NASDAQ",
    "secTicker": "BKR",
    "cik": "0001701605"
  },
  {
    "ticker": "BLK",
    "name": "BlackRock, Inc.",
    "symbol": "NYSE:BLK",
    "providerExchange": "NYSE",
    "secTicker": "BLK",
    "cik": "0002012383"
  },
  {
    "ticker": "BMY",
    "name": "BRISTOL MYERS SQUIBB CO",
    "symbol": "NYSE:BMY",
    "providerExchange": "NYSE",
    "secTicker": "BMY",
    "cik": "0000014272"
  },
  {
    "ticker": "BNY",
    "name": "Bank of New York Mellon Corp",
    "symbol": "NYSE:BNY",
    "providerExchange": "NYSE",
    "secTicker": "BNY",
    "cik": "0001390777"
  },
  {
    "ticker": "BR",
    "name": "BROADRIDGE FINANCIAL SOLUTIONS, INC.",
    "symbol": "NYSE:BR",
    "providerExchange": "NYSE",
    "secTicker": "BR",
    "cik": "0001383312"
  },
  {
    "ticker": "BRK.B",
    "name": "BERKSHIRE HATHAWAY INC",
    "symbol": "NYSE:BRK.B",
    "providerExchange": "NYSE",
    "secTicker": "BRK-B",
    "cik": "0001067983"
  },
  {
    "ticker": "BRO",
    "name": "BROWN & BROWN, INC.",
    "symbol": "NYSE:BRO",
    "providerExchange": "NYSE",
    "secTicker": "BRO",
    "cik": "0000079282"
  },
  {
    "ticker": "BSX",
    "name": "BOSTON SCIENTIFIC CORP",
    "symbol": "NYSE:BSX",
    "providerExchange": "NYSE",
    "secTicker": "BSX",
    "cik": "0000885725"
  },
  {
    "ticker": "BX",
    "name": "Blackstone Inc.",
    "symbol": "NYSE:BX",
    "providerExchange": "NYSE",
    "secTicker": "BX",
    "cik": "0001393818"
  },
  {
    "ticker": "BXP",
    "name": "BXP, Inc.",
    "symbol": "NYSE:BXP",
    "providerExchange": "NYSE",
    "secTicker": "BXP",
    "cik": "0001037540"
  },
  {
    "ticker": "C",
    "name": "CITIGROUP INC",
    "symbol": "NYSE:C",
    "providerExchange": "NYSE",
    "secTicker": "C",
    "cik": "0000831001"
  },
  {
    "ticker": "CAH",
    "name": "CARDINAL HEALTH INC",
    "symbol": "NYSE:CAH",
    "providerExchange": "NYSE",
    "secTicker": "CAH",
    "cik": "0000721371"
  },
  {
    "ticker": "CARR",
    "name": "CARRIER GLOBAL Corp",
    "symbol": "NYSE:CARR",
    "providerExchange": "NYSE",
    "secTicker": "CARR",
    "cik": "0001783180"
  },
  {
    "ticker": "CASY",
    "name": "CASEYS GENERAL STORES INC",
    "symbol": "NASDAQ:CASY",
    "providerExchange": "NASDAQ",
    "secTicker": "CASY",
    "cik": "0000726958"
  },
  {
    "ticker": "CAT",
    "name": "CATERPILLAR INC",
    "symbol": "NYSE:CAT",
    "providerExchange": "NYSE",
    "secTicker": "CAT",
    "cik": "0000018230"
  },
  {
    "ticker": "CB",
    "name": "Chubb Ltd",
    "symbol": "NYSE:CB",
    "providerExchange": "NYSE",
    "secTicker": "CB",
    "cik": "0000896159"
  },
  {
    "ticker": "CBOE",
    "name": "Cboe Global Markets, Inc.",
    "symbol": "CBOE:CBOE",
    "providerExchange": "CBOE",
    "secTicker": "CBOE",
    "cik": "0001374310"
  },
  {
    "ticker": "CBRE",
    "name": "CBRE GROUP, INC.",
    "symbol": "NYSE:CBRE",
    "providerExchange": "NYSE",
    "secTicker": "CBRE",
    "cik": "0001138118"
  },
  {
    "ticker": "CCI",
    "name": "CROWN CASTLE INC.",
    "symbol": "NYSE:CCI",
    "providerExchange": "NYSE",
    "secTicker": "CCI",
    "cik": "0001051470"
  },
  {
    "ticker": "CCL",
    "name": "Carnival Corp Ltd.",
    "symbol": "NYSE:CCL",
    "providerExchange": "NYSE",
    "secTicker": "CCL",
    "cik": "0000815097"
  },
  {
    "ticker": "CDNS",
    "name": "CADENCE DESIGN SYSTEMS INC",
    "symbol": "NASDAQ:CDNS",
    "providerExchange": "NASDAQ",
    "secTicker": "CDNS",
    "cik": "0000813672"
  },
  {
    "ticker": "CDW",
    "name": "CDW Corp",
    "symbol": "NASDAQ:CDW",
    "providerExchange": "NASDAQ",
    "secTicker": "CDW",
    "cik": "0001402057"
  },
  {
    "ticker": "CEG",
    "name": "Constellation Energy Corp",
    "symbol": "NASDAQ:CEG",
    "providerExchange": "NASDAQ",
    "secTicker": "CEG",
    "cik": "0001868275"
  },
  {
    "ticker": "CF",
    "name": "CF Industries Holdings, Inc.",
    "symbol": "NYSE:CF",
    "providerExchange": "NYSE",
    "secTicker": "CF",
    "cik": "0001324404"
  },
  {
    "ticker": "CFG",
    "name": "CITIZENS FINANCIAL GROUP INC/RI",
    "symbol": "NYSE:CFG",
    "providerExchange": "NYSE",
    "secTicker": "CFG",
    "cik": "0000759944"
  },
  {
    "ticker": "CHD",
    "name": "CHURCH & DWIGHT CO INC /DE/",
    "symbol": "NYSE:CHD",
    "providerExchange": "NYSE",
    "secTicker": "CHD",
    "cik": "0000313927"
  },
  {
    "ticker": "CHRW",
    "name": "C. H. ROBINSON WORLDWIDE, INC.",
    "symbol": "NASDAQ:CHRW",
    "providerExchange": "NASDAQ",
    "secTicker": "CHRW",
    "cik": "0001043277"
  },
  {
    "ticker": "CHTR",
    "name": "CHARTER COMMUNICATIONS, INC. /MO/",
    "symbol": "NASDAQ:CHTR",
    "providerExchange": "NASDAQ",
    "secTicker": "CHTR",
    "cik": "0001091667"
  },
  {
    "ticker": "CI",
    "name": "Cigna Group",
    "symbol": "NYSE:CI",
    "providerExchange": "NYSE",
    "secTicker": "CI",
    "cik": "0001739940"
  },
  {
    "ticker": "CIEN",
    "name": "CIENA CORP",
    "symbol": "NYSE:CIEN",
    "providerExchange": "NYSE",
    "secTicker": "CIEN",
    "cik": "0000936395"
  },
  {
    "ticker": "CINF",
    "name": "CINCINNATI FINANCIAL CORP",
    "symbol": "NASDAQ:CINF",
    "providerExchange": "NASDAQ",
    "secTicker": "CINF",
    "cik": "0000020286"
  },
  {
    "ticker": "CL",
    "name": "COLGATE PALMOLIVE CO",
    "symbol": "NYSE:CL",
    "providerExchange": "NYSE",
    "secTicker": "CL",
    "cik": "0000021665"
  },
  {
    "ticker": "CLX",
    "name": "CLOROX CO /DE/",
    "symbol": "NYSE:CLX",
    "providerExchange": "NYSE",
    "secTicker": "CLX",
    "cik": "0000021076"
  },
  {
    "ticker": "CMCSA",
    "name": "COMCAST CORP",
    "symbol": "NASDAQ:CMCSA",
    "providerExchange": "NASDAQ",
    "secTicker": "CMCSA",
    "cik": "0001166691"
  },
  {
    "ticker": "CME",
    "name": "CME GROUP INC.",
    "symbol": "NASDAQ:CME",
    "providerExchange": "NASDAQ",
    "secTicker": "CME",
    "cik": "0001156375"
  },
  {
    "ticker": "CMG",
    "name": "CHIPOTLE MEXICAN GRILL INC",
    "symbol": "NYSE:CMG",
    "providerExchange": "NYSE",
    "secTicker": "CMG",
    "cik": "0001058090"
  },
  {
    "ticker": "CMI",
    "name": "CUMMINS INC",
    "symbol": "NYSE:CMI",
    "providerExchange": "NYSE",
    "secTicker": "CMI",
    "cik": "0000026172"
  },
  {
    "ticker": "CMS",
    "name": "CMS ENERGY CORP",
    "symbol": "NYSE:CMS",
    "providerExchange": "NYSE",
    "secTicker": "CMS",
    "cik": "0000811156"
  },
  {
    "ticker": "CNC",
    "name": "CENTENE CORP",
    "symbol": "NYSE:CNC",
    "providerExchange": "NYSE",
    "secTicker": "CNC",
    "cik": "0001071739"
  },
  {
    "ticker": "CNP",
    "name": "CENTERPOINT ENERGY INC",
    "symbol": "NYSE:CNP",
    "providerExchange": "NYSE",
    "secTicker": "CNP",
    "cik": "0001130310"
  },
  {
    "ticker": "COF",
    "name": "CAPITAL ONE FINANCIAL CORP",
    "symbol": "NYSE:COF",
    "providerExchange": "NYSE",
    "secTicker": "COF",
    "cik": "0000927628"
  },
  {
    "ticker": "COHR",
    "name": "COHERENT CORP.",
    "symbol": "NYSE:COHR",
    "providerExchange": "NYSE",
    "secTicker": "COHR",
    "cik": "0000820318"
  },
  {
    "ticker": "COIN",
    "name": "Coinbase Global, Inc.",
    "symbol": "NASDAQ:COIN",
    "providerExchange": "NASDAQ",
    "secTicker": "COIN",
    "cik": "0001679788"
  },
  {
    "ticker": "COO",
    "name": "COOPER COMPANIES, INC.",
    "symbol": "NASDAQ:COO",
    "providerExchange": "NASDAQ",
    "secTicker": "COO",
    "cik": "0000711404"
  },
  {
    "ticker": "COP",
    "name": "CONOCOPHILLIPS",
    "symbol": "NYSE:COP",
    "providerExchange": "NYSE",
    "secTicker": "COP",
    "cik": "0001163165"
  },
  {
    "ticker": "COR",
    "name": "Cencora, Inc.",
    "symbol": "NYSE:COR",
    "providerExchange": "NYSE",
    "secTicker": "COR",
    "cik": "0001140859"
  },
  {
    "ticker": "COST",
    "name": "COSTCO WHOLESALE CORP /NEW",
    "symbol": "NASDAQ:COST",
    "providerExchange": "NASDAQ",
    "secTicker": "COST",
    "cik": "0000909832"
  },
  {
    "ticker": "CPAY",
    "name": "CORPAY, INC.",
    "symbol": "NYSE:CPAY",
    "providerExchange": "NYSE",
    "secTicker": "CPAY",
    "cik": "0001175454"
  },
  {
    "ticker": "CPRT",
    "name": "COPART INC",
    "symbol": "NASDAQ:CPRT",
    "providerExchange": "NASDAQ",
    "secTicker": "CPRT",
    "cik": "0000900075"
  },
  {
    "ticker": "CPT",
    "name": "CAMDEN PROPERTY TRUST",
    "symbol": "NYSE:CPT",
    "providerExchange": "NYSE",
    "secTicker": "CPT",
    "cik": "0000906345"
  },
  {
    "ticker": "CRH",
    "name": "CRH PUBLIC LTD CO",
    "symbol": "NYSE:CRH",
    "providerExchange": "NYSE",
    "secTicker": "CRH",
    "cik": "0000849395"
  },
  {
    "ticker": "CRL",
    "name": "CHARLES RIVER LABORATORIES INTERNATIONAL, INC.",
    "symbol": "NYSE:CRL",
    "providerExchange": "NYSE",
    "secTicker": "CRL",
    "cik": "0001100682"
  },
  {
    "ticker": "CRM",
    "name": "Salesforce, Inc.",
    "symbol": "NYSE:CRM",
    "providerExchange": "NYSE",
    "secTicker": "CRM",
    "cik": "0001108524"
  },
  {
    "ticker": "CRWD",
    "name": "CrowdStrike Holdings, Inc.",
    "symbol": "NASDAQ:CRWD",
    "providerExchange": "NASDAQ",
    "secTicker": "CRWD",
    "cik": "0001535527"
  },
  {
    "ticker": "CSCO",
    "name": "CISCO SYSTEMS, INC.",
    "symbol": "NASDAQ:CSCO",
    "providerExchange": "NASDAQ",
    "secTicker": "CSCO",
    "cik": "0000858877"
  },
  {
    "ticker": "CSGP",
    "name": "COSTAR GROUP, INC.",
    "symbol": "NASDAQ:CSGP",
    "providerExchange": "NASDAQ",
    "secTicker": "CSGP",
    "cik": "0001057352"
  },
  {
    "ticker": "CSX",
    "name": "CSX CORP",
    "symbol": "NASDAQ:CSX",
    "providerExchange": "NASDAQ",
    "secTicker": "CSX",
    "cik": "0000277948"
  },
  {
    "ticker": "CTAS",
    "name": "CINTAS CORP",
    "symbol": "NASDAQ:CTAS",
    "providerExchange": "NASDAQ",
    "secTicker": "CTAS",
    "cik": "0000723254"
  },
  {
    "ticker": "CTSH",
    "name": "COGNIZANT TECHNOLOGY SOLUTIONS CORP",
    "symbol": "NASDAQ:CTSH",
    "providerExchange": "NASDAQ",
    "secTicker": "CTSH",
    "cik": "0001058290"
  },
  {
    "ticker": "CVNA",
    "name": "CARVANA CO.",
    "symbol": "NYSE:CVNA",
    "providerExchange": "NYSE",
    "secTicker": "CVNA",
    "cik": "0001690820"
  },
  {
    "ticker": "CVS",
    "name": "CVS HEALTH Corp",
    "symbol": "NYSE:CVS",
    "providerExchange": "NYSE",
    "secTicker": "CVS",
    "cik": "0000064803"
  },
  {
    "ticker": "CVX",
    "name": "CHEVRON CORP",
    "symbol": "NYSE:CVX",
    "providerExchange": "NYSE",
    "secTicker": "CVX",
    "cik": "0000093410"
  },
  {
    "ticker": "D",
    "name": "DOMINION ENERGY, INC",
    "symbol": "NYSE:D",
    "providerExchange": "NYSE",
    "secTicker": "D",
    "cik": "0000715957"
  },
  {
    "ticker": "DAL",
    "name": "DELTA AIR LINES, INC.",
    "symbol": "NYSE:DAL",
    "providerExchange": "NYSE",
    "secTicker": "DAL",
    "cik": "0000027904"
  },
  {
    "ticker": "DASH",
    "name": "DoorDash, Inc.",
    "symbol": "NASDAQ:DASH",
    "providerExchange": "NASDAQ",
    "secTicker": "DASH",
    "cik": "0001792789"
  },
  {
    "ticker": "DD",
    "name": "DuPont de Nemours, Inc.",
    "symbol": "NYSE:DD",
    "providerExchange": "NYSE",
    "secTicker": "DD",
    "cik": "0001666700"
  },
  {
    "ticker": "DDOG",
    "name": "Datadog, Inc.",
    "symbol": "NASDAQ:DDOG",
    "providerExchange": "NASDAQ",
    "secTicker": "DDOG",
    "cik": "0001561550"
  },
  {
    "ticker": "DE",
    "name": "DEERE & CO",
    "symbol": "NYSE:DE",
    "providerExchange": "NYSE",
    "secTicker": "DE",
    "cik": "0000315189"
  },
  {
    "ticker": "DECK",
    "name": "DECKERS OUTDOOR CORP",
    "symbol": "NYSE:DECK",
    "providerExchange": "NYSE",
    "secTicker": "DECK",
    "cik": "0000910521"
  },
  {
    "ticker": "DELL",
    "name": "Dell Technologies Inc.",
    "symbol": "NYSE:DELL",
    "providerExchange": "NYSE",
    "secTicker": "DELL",
    "cik": "0001571996"
  },
  {
    "ticker": "DG",
    "name": "DOLLAR GENERAL CORP",
    "symbol": "NYSE:DG",
    "providerExchange": "NYSE",
    "secTicker": "DG",
    "cik": "0000029534"
  },
  {
    "ticker": "DGX",
    "name": "QUEST DIAGNOSTICS INC",
    "symbol": "NYSE:DGX",
    "providerExchange": "NYSE",
    "secTicker": "DGX",
    "cik": "0001022079"
  },
  {
    "ticker": "DHI",
    "name": "HORTON D R INC /DE/",
    "symbol": "NYSE:DHI",
    "providerExchange": "NYSE",
    "secTicker": "DHI",
    "cik": "0000882184"
  },
  {
    "ticker": "DHR",
    "name": "DANAHER CORP /DE/",
    "symbol": "NYSE:DHR",
    "providerExchange": "NYSE",
    "secTicker": "DHR",
    "cik": "0000313616"
  },
  {
    "ticker": "DIS",
    "name": "Walt Disney Co",
    "symbol": "NYSE:DIS",
    "providerExchange": "NYSE",
    "secTicker": "DIS",
    "cik": "0001744489"
  },
  {
    "ticker": "DLR",
    "name": "DIGITAL REALTY TRUST, INC.",
    "symbol": "NYSE:DLR",
    "providerExchange": "NYSE",
    "secTicker": "DLR",
    "cik": "0001297996"
  },
  {
    "ticker": "DLTR",
    "name": "DOLLAR TREE, INC.",
    "symbol": "NASDAQ:DLTR",
    "providerExchange": "NASDAQ",
    "secTicker": "DLTR",
    "cik": "0000935703"
  },
  {
    "ticker": "DOC",
    "name": "HEALTHPEAK PROPERTIES, INC.",
    "symbol": "NYSE:DOC",
    "providerExchange": "NYSE",
    "secTicker": "DOC",
    "cik": "0000765880"
  },
  {
    "ticker": "DOV",
    "name": "DOVER Corp",
    "symbol": "NYSE:DOV",
    "providerExchange": "NYSE",
    "secTicker": "DOV",
    "cik": "0000029905"
  },
  {
    "ticker": "DOW",
    "name": "DOW INC.",
    "symbol": "NYSE:DOW",
    "providerExchange": "NYSE",
    "secTicker": "DOW",
    "cik": "0001751788"
  },
  {
    "ticker": "DPZ",
    "name": "DOMINOS PIZZA INC",
    "symbol": "NASDAQ:DPZ",
    "providerExchange": "NASDAQ",
    "secTicker": "DPZ",
    "cik": "0001286681"
  },
  {
    "ticker": "DRI",
    "name": "DARDEN RESTAURANTS INC",
    "symbol": "NYSE:DRI",
    "providerExchange": "NYSE",
    "secTicker": "DRI",
    "cik": "0000940944"
  },
  {
    "ticker": "DTE",
    "name": "DTE ENERGY CO",
    "symbol": "NYSE:DTE",
    "providerExchange": "NYSE",
    "secTicker": "DTE",
    "cik": "0000936340"
  },
  {
    "ticker": "DUK",
    "name": "Duke Energy CORP",
    "symbol": "NYSE:DUK",
    "providerExchange": "NYSE",
    "secTicker": "DUK",
    "cik": "0001326160"
  },
  {
    "ticker": "DVA",
    "name": "DAVITA INC.",
    "symbol": "NYSE:DVA",
    "providerExchange": "NYSE",
    "secTicker": "DVA",
    "cik": "0000927066"
  },
  {
    "ticker": "DVN",
    "name": "DEVON ENERGY CORP/DE",
    "symbol": "NYSE:DVN",
    "providerExchange": "NYSE",
    "secTicker": "DVN",
    "cik": "0001090012"
  },
  {
    "ticker": "DXCM",
    "name": "DEXCOM INC",
    "symbol": "NASDAQ:DXCM",
    "providerExchange": "NASDAQ",
    "secTicker": "DXCM",
    "cik": "0001093557"
  },
  {
    "ticker": "EBAY",
    "name": "EBAY INC",
    "symbol": "NASDAQ:EBAY",
    "providerExchange": "NASDAQ",
    "secTicker": "EBAY",
    "cik": "0001065088"
  },
  {
    "ticker": "ECHO",
    "name": "EchoStar CORP",
    "symbol": "NASDAQ:ECHO",
    "providerExchange": "NASDAQ",
    "secTicker": "ECHO",
    "cik": "0001415404"
  },
  {
    "ticker": "ECL",
    "name": "ECOLAB INC.",
    "symbol": "NYSE:ECL",
    "providerExchange": "NYSE",
    "secTicker": "ECL",
    "cik": "0000031462"
  },
  {
    "ticker": "ED",
    "name": "CONSOLIDATED EDISON INC",
    "symbol": "NYSE:ED",
    "providerExchange": "NYSE",
    "secTicker": "ED",
    "cik": "0001047862"
  },
  {
    "ticker": "EFX",
    "name": "EQUIFAX INC",
    "symbol": "NYSE:EFX",
    "providerExchange": "NYSE",
    "secTicker": "EFX",
    "cik": "0000033185"
  },
  {
    "ticker": "EG",
    "name": "EVEREST GROUP, LTD.",
    "symbol": "NYSE:EG",
    "providerExchange": "NYSE",
    "secTicker": "EG",
    "cik": "0001095073"
  },
  {
    "ticker": "EIX",
    "name": "EDISON INTERNATIONAL",
    "symbol": "NYSE:EIX",
    "providerExchange": "NYSE",
    "secTicker": "EIX",
    "cik": "0000827052"
  },
  {
    "ticker": "EL",
    "name": "ESTEE LAUDER COMPANIES INC",
    "symbol": "NYSE:EL",
    "providerExchange": "NYSE",
    "secTicker": "EL",
    "cik": "0001001250"
  },
  {
    "ticker": "ELV",
    "name": "Elevance Health, Inc.",
    "symbol": "NYSE:ELV",
    "providerExchange": "NYSE",
    "secTicker": "ELV",
    "cik": "0001156039"
  },
  {
    "ticker": "EME",
    "name": "EMCOR Group, Inc.",
    "symbol": "NYSE:EME",
    "providerExchange": "NYSE",
    "secTicker": "EME",
    "cik": "0000105634"
  },
  {
    "ticker": "EMR",
    "name": "EMERSON ELECTRIC CO",
    "symbol": "NYSE:EMR",
    "providerExchange": "NYSE",
    "secTicker": "EMR",
    "cik": "0000032604"
  },
  {
    "ticker": "EOG",
    "name": "EOG RESOURCES INC",
    "symbol": "NYSE:EOG",
    "providerExchange": "NYSE",
    "secTicker": "EOG",
    "cik": "0000821189"
  },
  {
    "ticker": "EQIX",
    "name": "EQUINIX INC",
    "symbol": "NASDAQ:EQIX",
    "providerExchange": "NASDAQ",
    "secTicker": "EQIX",
    "cik": "0001101239"
  },
  {
    "ticker": "EQT",
    "name": "EQT Corp",
    "symbol": "NYSE:EQT",
    "providerExchange": "NYSE",
    "secTicker": "EQT",
    "cik": "0000033213"
  },
  {
    "ticker": "ERIE",
    "name": "ERIE INDEMNITY CO",
    "symbol": "NASDAQ:ERIE",
    "providerExchange": "NASDAQ",
    "secTicker": "ERIE",
    "cik": "0000922621"
  },
  {
    "ticker": "ES",
    "name": "EVERSOURCE ENERGY",
    "symbol": "NYSE:ES",
    "providerExchange": "NYSE",
    "secTicker": "ES",
    "cik": "0000072741"
  },
  {
    "ticker": "ESS",
    "name": "ESSEX PROPERTY TRUST, INC.",
    "symbol": "NYSE:ESS",
    "providerExchange": "NYSE",
    "secTicker": "ESS",
    "cik": "0000920522"
  },
  {
    "ticker": "ETN",
    "name": "Eaton Corp plc",
    "symbol": "NYSE:ETN",
    "providerExchange": "NYSE",
    "secTicker": "ETN",
    "cik": "0001551182"
  },
  {
    "ticker": "ETR",
    "name": "ENTERGY CORP /DE/",
    "symbol": "NYSE:ETR",
    "providerExchange": "NYSE",
    "secTicker": "ETR",
    "cik": "0000065984"
  },
  {
    "ticker": "EVRG",
    "name": "Evergy, Inc.",
    "symbol": "NASDAQ:EVRG",
    "providerExchange": "NASDAQ",
    "secTicker": "EVRG",
    "cik": "0001711269"
  },
  {
    "ticker": "EW",
    "name": "Edwards Lifesciences Corp",
    "symbol": "NYSE:EW",
    "providerExchange": "NYSE",
    "secTicker": "EW",
    "cik": "0001099800"
  },
  {
    "ticker": "EXC",
    "name": "EXELON CORP",
    "symbol": "NASDAQ:EXC",
    "providerExchange": "NASDAQ",
    "secTicker": "EXC",
    "cik": "0001109357"
  },
  {
    "ticker": "EXE",
    "name": "EXPAND ENERGY Corp",
    "symbol": "NASDAQ:EXE",
    "providerExchange": "NASDAQ",
    "secTicker": "EXE",
    "cik": "0000895126"
  },
  {
    "ticker": "EXPD",
    "name": "EXPEDITORS INTERNATIONAL OF WASHINGTON INC",
    "symbol": "NYSE:EXPD",
    "providerExchange": "NYSE",
    "secTicker": "EXPD",
    "cik": "0000746515"
  },
  {
    "ticker": "EXPE",
    "name": "Expedia Group, Inc.",
    "symbol": "NASDAQ:EXPE",
    "providerExchange": "NASDAQ",
    "secTicker": "EXPE",
    "cik": "0001324424"
  },
  {
    "ticker": "EXR",
    "name": "Extra Space Storage Inc.",
    "symbol": "NYSE:EXR",
    "providerExchange": "NYSE",
    "secTicker": "EXR",
    "cik": "0001289490"
  },
  {
    "ticker": "F",
    "name": "FORD MOTOR CO",
    "symbol": "NYSE:F",
    "providerExchange": "NYSE",
    "secTicker": "F",
    "cik": "0000037996"
  },
  {
    "ticker": "FANG",
    "name": "Diamondback Energy, Inc.",
    "symbol": "NASDAQ:FANG",
    "providerExchange": "NASDAQ",
    "secTicker": "FANG",
    "cik": "0001539838"
  },
  {
    "ticker": "FAST",
    "name": "FASTENAL CO",
    "symbol": "NASDAQ:FAST",
    "providerExchange": "NASDAQ",
    "secTicker": "FAST",
    "cik": "0000815556"
  },
  {
    "ticker": "FCX",
    "name": "FREEPORT-MCMORAN INC",
    "symbol": "NYSE:FCX",
    "providerExchange": "NYSE",
    "secTicker": "FCX",
    "cik": "0000831259"
  },
  {
    "ticker": "FDS",
    "name": "FACTSET RESEARCH SYSTEMS INC",
    "symbol": "NYSE:FDS",
    "providerExchange": "NYSE",
    "secTicker": "FDS",
    "cik": "0001013237"
  },
  {
    "ticker": "FDX",
    "name": "FEDEX CORP",
    "symbol": "NYSE:FDX",
    "providerExchange": "NYSE",
    "secTicker": "FDX",
    "cik": "0001048911"
  },
  {
    "ticker": "FDXF",
    "name": "FedEx Freight Holding Company, Inc.",
    "symbol": "NYSE:FDXF",
    "providerExchange": "NYSE",
    "secTicker": "FDXF",
    "cik": "0002082247"
  },
  {
    "ticker": "FE",
    "name": "FIRSTENERGY CORP",
    "symbol": "NYSE:FE",
    "providerExchange": "NYSE",
    "secTicker": "FE",
    "cik": "0001031296"
  },
  {
    "ticker": "FERG",
    "name": "Ferguson Enterprises Inc. /DE/",
    "symbol": "NYSE:FERG",
    "providerExchange": "NYSE",
    "secTicker": "FERG",
    "cik": "0002011641"
  },
  {
    "ticker": "FFIV",
    "name": "F5, INC.",
    "symbol": "NASDAQ:FFIV",
    "providerExchange": "NASDAQ",
    "secTicker": "FFIV",
    "cik": "0001048695"
  },
  {
    "ticker": "FICO",
    "name": "FAIR ISAAC CORP",
    "symbol": "NYSE:FICO",
    "providerExchange": "NYSE",
    "secTicker": "FICO",
    "cik": "0000814547"
  },
  {
    "ticker": "FIS",
    "name": "Fidelity National Information Services, Inc.",
    "symbol": "NYSE:FIS",
    "providerExchange": "NYSE",
    "secTicker": "FIS",
    "cik": "0001136893"
  },
  {
    "ticker": "FISV",
    "name": "FISERV INC",
    "symbol": "NASDAQ:FISV",
    "providerExchange": "NASDAQ",
    "secTicker": "FISV",
    "cik": "0000798354"
  },
  {
    "ticker": "FITB",
    "name": "FIFTH THIRD BANCORP",
    "symbol": "NYSE:FITB",
    "providerExchange": "NYSE",
    "secTicker": "FITB",
    "cik": "0000035527"
  },
  {
    "ticker": "FIX",
    "name": "COMFORT SYSTEMS USA INC",
    "symbol": "NYSE:FIX",
    "providerExchange": "NYSE",
    "secTicker": "FIX",
    "cik": "0001035983"
  },
  {
    "ticker": "FLEX",
    "name": "FLEX LTD.",
    "symbol": "NASDAQ:FLEX",
    "providerExchange": "NASDAQ",
    "secTicker": "FLEX",
    "cik": "0000866374"
  },
  {
    "ticker": "FOX",
    "name": "Fox Corp",
    "symbol": "NASDAQ:FOX",
    "providerExchange": "NASDAQ",
    "secTicker": "FOX",
    "cik": "0001754301"
  },
  {
    "ticker": "FOXA",
    "name": "Fox Corp",
    "symbol": "NASDAQ:FOXA",
    "providerExchange": "NASDAQ",
    "secTicker": "FOXA",
    "cik": "0001754301"
  },
  {
    "ticker": "FRT",
    "name": "FEDERAL REALTY INVESTMENT TRUST",
    "symbol": "NYSE:FRT",
    "providerExchange": "NYSE",
    "secTicker": "FRT",
    "cik": "0000034903"
  },
  {
    "ticker": "FSLR",
    "name": "FIRST SOLAR, INC.",
    "symbol": "NASDAQ:FSLR",
    "providerExchange": "NASDAQ",
    "secTicker": "FSLR",
    "cik": "0001274494"
  },
  {
    "ticker": "FTNT",
    "name": "Fortinet, Inc.",
    "symbol": "NASDAQ:FTNT",
    "providerExchange": "NASDAQ",
    "secTicker": "FTNT",
    "cik": "0001262039"
  },
  {
    "ticker": "FTV",
    "name": "Fortive Corp",
    "symbol": "NYSE:FTV",
    "providerExchange": "NYSE",
    "secTicker": "FTV",
    "cik": "0001659166"
  },
  {
    "ticker": "GD",
    "name": "GENERAL DYNAMICS CORP",
    "symbol": "NYSE:GD",
    "providerExchange": "NYSE",
    "secTicker": "GD",
    "cik": "0000040533"
  },
  {
    "ticker": "GDDY",
    "name": "GoDaddy Inc.",
    "symbol": "NYSE:GDDY",
    "providerExchange": "NYSE",
    "secTicker": "GDDY",
    "cik": "0001609711"
  },
  {
    "ticker": "GE",
    "name": "GENERAL ELECTRIC CO",
    "symbol": "NYSE:GE",
    "providerExchange": "NYSE",
    "secTicker": "GE",
    "cik": "0000040545"
  },
  {
    "ticker": "GEHC",
    "name": "GE HealthCare Technologies Inc.",
    "symbol": "NASDAQ:GEHC",
    "providerExchange": "NASDAQ",
    "secTicker": "GEHC",
    "cik": "0001932393"
  },
  {
    "ticker": "GEN",
    "name": "Gen Digital Inc.",
    "symbol": "NASDAQ:GEN",
    "providerExchange": "NASDAQ",
    "secTicker": "GEN",
    "cik": "0000849399"
  },
  {
    "ticker": "GEV",
    "name": "GE Vernova Inc.",
    "symbol": "NYSE:GEV",
    "providerExchange": "NYSE",
    "secTicker": "GEV",
    "cik": "0001996810"
  },
  {
    "ticker": "GILD",
    "name": "GILEAD SCIENCES, INC.",
    "symbol": "NASDAQ:GILD",
    "providerExchange": "NASDAQ",
    "secTicker": "GILD",
    "cik": "0000882095"
  },
  {
    "ticker": "GIS",
    "name": "GENERAL MILLS INC",
    "symbol": "NYSE:GIS",
    "providerExchange": "NYSE",
    "secTicker": "GIS",
    "cik": "0000040704"
  },
  {
    "ticker": "GL",
    "name": "GLOBE LIFE INC.",
    "symbol": "NYSE:GL",
    "providerExchange": "NYSE",
    "secTicker": "GL",
    "cik": "0000320335"
  },
  {
    "ticker": "GLW",
    "name": "CORNING INC /NY",
    "symbol": "NYSE:GLW",
    "providerExchange": "NYSE",
    "secTicker": "GLW",
    "cik": "0000024741"
  },
  {
    "ticker": "GM",
    "name": "General Motors Co",
    "symbol": "NYSE:GM",
    "providerExchange": "NYSE",
    "secTicker": "GM",
    "cik": "0001467858"
  },
  {
    "ticker": "GNRC",
    "name": "GENERAC HOLDINGS INC.",
    "symbol": "NYSE:GNRC",
    "providerExchange": "NYSE",
    "secTicker": "GNRC",
    "cik": "0001474735"
  },
  {
    "ticker": "GOOG",
    "name": "Alphabet Inc.",
    "symbol": "NASDAQ:GOOG",
    "providerExchange": "NASDAQ",
    "secTicker": "GOOG",
    "cik": "0001652044"
  },
  {
    "ticker": "GOOGL",
    "name": "Alphabet Inc.",
    "symbol": "NASDAQ:GOOGL",
    "providerExchange": "NASDAQ",
    "secTicker": "GOOGL",
    "cik": "0001652044"
  },
  {
    "ticker": "GPC",
    "name": "GENUINE PARTS CO",
    "symbol": "NYSE:GPC",
    "providerExchange": "NYSE",
    "secTicker": "GPC",
    "cik": "0000040987"
  },
  {
    "ticker": "GPN",
    "name": "GLOBAL PAYMENTS INC",
    "symbol": "NYSE:GPN",
    "providerExchange": "NYSE",
    "secTicker": "GPN",
    "cik": "0001123360"
  },
  {
    "ticker": "GRMN",
    "name": "GARMIN LTD",
    "symbol": "NYSE:GRMN",
    "providerExchange": "NYSE",
    "secTicker": "GRMN",
    "cik": "0001121788"
  },
  {
    "ticker": "GS",
    "name": "GOLDMAN SACHS GROUP INC",
    "symbol": "NYSE:GS",
    "providerExchange": "NYSE",
    "secTicker": "GS",
    "cik": "0000886982"
  },
  {
    "ticker": "GWW",
    "name": "W.W. GRAINGER, INC.",
    "symbol": "NYSE:GWW",
    "providerExchange": "NYSE",
    "secTicker": "GWW",
    "cik": "0000277135"
  },
  {
    "ticker": "HAL",
    "name": "HALLIBURTON CO",
    "symbol": "NYSE:HAL",
    "providerExchange": "NYSE",
    "secTicker": "HAL",
    "cik": "0000045012"
  },
  {
    "ticker": "HAS",
    "name": "HASBRO, INC.",
    "symbol": "NASDAQ:HAS",
    "providerExchange": "NASDAQ",
    "secTicker": "HAS",
    "cik": "0000046080"
  },
  {
    "ticker": "HBAN",
    "name": "HUNTINGTON BANCSHARES INC /MD/",
    "symbol": "NASDAQ:HBAN",
    "providerExchange": "NASDAQ",
    "secTicker": "HBAN",
    "cik": "0000049196"
  },
  {
    "ticker": "HCA",
    "name": "HCA Healthcare, Inc.",
    "symbol": "NYSE:HCA",
    "providerExchange": "NYSE",
    "secTicker": "HCA",
    "cik": "0000860730"
  },
  {
    "ticker": "HD",
    "name": "HOME DEPOT, INC.",
    "symbol": "NYSE:HD",
    "providerExchange": "NYSE",
    "secTicker": "HD",
    "cik": "0000354950"
  },
  {
    "ticker": "HIG",
    "name": "HARTFORD INSURANCE GROUP, INC.",
    "symbol": "NYSE:HIG",
    "providerExchange": "NYSE",
    "secTicker": "HIG",
    "cik": "0000874766"
  },
  {
    "ticker": "HII",
    "name": "HUNTINGTON INGALLS INDUSTRIES, INC.",
    "symbol": "NYSE:HII",
    "providerExchange": "NYSE",
    "secTicker": "HII",
    "cik": "0001501585"
  },
  {
    "ticker": "HLT",
    "name": "Hilton Worldwide Holdings Inc.",
    "symbol": "NYSE:HLT",
    "providerExchange": "NYSE",
    "secTicker": "HLT",
    "cik": "0001585689"
  },
  {
    "ticker": "HON",
    "name": "HONEYWELL INTERNATIONAL INC",
    "symbol": "NASDAQ:HON",
    "providerExchange": "NASDAQ",
    "secTicker": "HON",
    "cik": "0000773840"
  },
  {
    "ticker": "HONA",
    "name": "Honeywell Aerospace Inc.",
    "symbol": "NASDAQ:HONA",
    "providerExchange": "NASDAQ",
    "secTicker": "HONA",
    "cik": "0002089271"
  },
  {
    "ticker": "HOOD",
    "name": "Robinhood Markets, Inc.",
    "symbol": "NASDAQ:HOOD",
    "providerExchange": "NASDAQ",
    "secTicker": "HOOD",
    "cik": "0001783879"
  },
  {
    "ticker": "HPE",
    "name": "Hewlett Packard Enterprise Co",
    "symbol": "NYSE:HPE",
    "providerExchange": "NYSE",
    "secTicker": "HPE",
    "cik": "0001645590"
  },
  {
    "ticker": "HPQ",
    "name": "HP INC",
    "symbol": "NYSE:HPQ",
    "providerExchange": "NYSE",
    "secTicker": "HPQ",
    "cik": "0000047217"
  },
  {
    "ticker": "HRL",
    "name": "HORMEL FOODS CORP /DE/",
    "symbol": "NYSE:HRL",
    "providerExchange": "NYSE",
    "secTicker": "HRL",
    "cik": "0000048465"
  },
  {
    "ticker": "HSIC",
    "name": "HENRY SCHEIN INC",
    "symbol": "NASDAQ:HSIC",
    "providerExchange": "NASDAQ",
    "secTicker": "HSIC",
    "cik": "0001000228"
  },
  {
    "ticker": "HST",
    "name": "HOST HOTELS & RESORTS, INC.",
    "symbol": "NASDAQ:HST",
    "providerExchange": "NASDAQ",
    "secTicker": "HST",
    "cik": "0001070750"
  },
  {
    "ticker": "HSY",
    "name": "HERSHEY CO",
    "symbol": "NYSE:HSY",
    "providerExchange": "NYSE",
    "secTicker": "HSY",
    "cik": "0000047111"
  },
  {
    "ticker": "HUBB",
    "name": "HUBBELL INC",
    "symbol": "NYSE:HUBB",
    "providerExchange": "NYSE",
    "secTicker": "HUBB",
    "cik": "0000048898"
  },
  {
    "ticker": "HUM",
    "name": "HUMANA INC",
    "symbol": "NYSE:HUM",
    "providerExchange": "NYSE",
    "secTicker": "HUM",
    "cik": "0000049071"
  },
  {
    "ticker": "HWM",
    "name": "Howmet Aerospace Inc.",
    "symbol": "NYSE:HWM",
    "providerExchange": "NYSE",
    "secTicker": "HWM",
    "cik": "0000004281"
  },
  {
    "ticker": "IBKR",
    "name": "Interactive Brokers Group, Inc.",
    "symbol": "NASDAQ:IBKR",
    "providerExchange": "NASDAQ",
    "secTicker": "IBKR",
    "cik": "0001381197"
  },
  {
    "ticker": "IBM",
    "name": "INTERNATIONAL BUSINESS MACHINES CORP",
    "symbol": "NYSE:IBM",
    "providerExchange": "NYSE",
    "secTicker": "IBM",
    "cik": "0000051143"
  },
  {
    "ticker": "ICE",
    "name": "Intercontinental Exchange, Inc.",
    "symbol": "NYSE:ICE",
    "providerExchange": "NYSE",
    "secTicker": "ICE",
    "cik": "0001571949"
  },
  {
    "ticker": "IDXX",
    "name": "IDEXX LABORATORIES INC /DE",
    "symbol": "NASDAQ:IDXX",
    "providerExchange": "NASDAQ",
    "secTicker": "IDXX",
    "cik": "0000874716"
  },
  {
    "ticker": "IEX",
    "name": "IDEX CORP /DE/",
    "symbol": "NYSE:IEX",
    "providerExchange": "NYSE",
    "secTicker": "IEX",
    "cik": "0000832101"
  },
  {
    "ticker": "IFF",
    "name": "INTERNATIONAL FLAVORS & FRAGRANCES INC",
    "symbol": "NYSE:IFF",
    "providerExchange": "NYSE",
    "secTicker": "IFF",
    "cik": "0000051253"
  },
  {
    "ticker": "ILMN",
    "name": "ILLUMINA, INC.",
    "symbol": "NASDAQ:ILMN",
    "providerExchange": "NASDAQ",
    "secTicker": "ILMN",
    "cik": "0001110803"
  },
  {
    "ticker": "INCY",
    "name": "INCYTE CORP",
    "symbol": "NASDAQ:INCY",
    "providerExchange": "NASDAQ",
    "secTicker": "INCY",
    "cik": "0000879169"
  },
  {
    "ticker": "INTC",
    "name": "INTEL CORP",
    "symbol": "NASDAQ:INTC",
    "providerExchange": "NASDAQ",
    "secTicker": "INTC",
    "cik": "0000050863"
  },
  {
    "ticker": "INTU",
    "name": "INTUIT INC.",
    "symbol": "NASDAQ:INTU",
    "providerExchange": "NASDAQ",
    "secTicker": "INTU",
    "cik": "0000896878"
  },
  {
    "ticker": "INVH",
    "name": "Invitation Homes Inc.",
    "symbol": "NYSE:INVH",
    "providerExchange": "NYSE",
    "secTicker": "INVH",
    "cik": "0001687229"
  },
  {
    "ticker": "IP",
    "name": "INTERNATIONAL PAPER CO /NEW/",
    "symbol": "NYSE:IP",
    "providerExchange": "NYSE",
    "secTicker": "IP",
    "cik": "0000051434"
  },
  {
    "ticker": "IQV",
    "name": "IQVIA HOLDINGS INC.",
    "symbol": "NYSE:IQV",
    "providerExchange": "NYSE",
    "secTicker": "IQV",
    "cik": "0001478242"
  },
  {
    "ticker": "IR",
    "name": "Ingersoll Rand Inc.",
    "symbol": "NYSE:IR",
    "providerExchange": "NYSE",
    "secTicker": "IR",
    "cik": "0001699150"
  },
  {
    "ticker": "IRM",
    "name": "IRON MOUNTAIN INC",
    "symbol": "NYSE:IRM",
    "providerExchange": "NYSE",
    "secTicker": "IRM",
    "cik": "0001020569"
  },
  {
    "ticker": "ISRG",
    "name": "INTUITIVE SURGICAL INC",
    "symbol": "NASDAQ:ISRG",
    "providerExchange": "NASDAQ",
    "secTicker": "ISRG",
    "cik": "0001035267"
  },
  {
    "ticker": "IT",
    "name": "GARTNER INC",
    "symbol": "NYSE:IT",
    "providerExchange": "NYSE",
    "secTicker": "IT",
    "cik": "0000749251"
  },
  {
    "ticker": "ITW",
    "name": "ILLINOIS TOOL WORKS INC",
    "symbol": "NYSE:ITW",
    "providerExchange": "NYSE",
    "secTicker": "ITW",
    "cik": "0000049826"
  },
  {
    "ticker": "IVZ",
    "name": "Invesco Ltd.",
    "symbol": "NYSE:IVZ",
    "providerExchange": "NYSE",
    "secTicker": "IVZ",
    "cik": "0000914208"
  },
  {
    "ticker": "J",
    "name": "JACOBS SOLUTIONS INC.",
    "symbol": "NYSE:J",
    "providerExchange": "NYSE",
    "secTicker": "J",
    "cik": "0000052988"
  },
  {
    "ticker": "JBHT",
    "name": "HUNT J B TRANSPORT SERVICES INC",
    "symbol": "NASDAQ:JBHT",
    "providerExchange": "NASDAQ",
    "secTicker": "JBHT",
    "cik": "0000728535"
  },
  {
    "ticker": "JBL",
    "name": "JABIL INC",
    "symbol": "NYSE:JBL",
    "providerExchange": "NYSE",
    "secTicker": "JBL",
    "cik": "0000898293"
  },
  {
    "ticker": "JCI",
    "name": "Johnson Controls International plc",
    "symbol": "NYSE:JCI",
    "providerExchange": "NYSE",
    "secTicker": "JCI",
    "cik": "0000833444"
  },
  {
    "ticker": "JKHY",
    "name": "JACK HENRY & ASSOCIATES INC",
    "symbol": "NASDAQ:JKHY",
    "providerExchange": "NASDAQ",
    "secTicker": "JKHY",
    "cik": "0000779152"
  },
  {
    "ticker": "JNJ",
    "name": "JOHNSON & JOHNSON",
    "symbol": "NYSE:JNJ",
    "providerExchange": "NYSE",
    "secTicker": "JNJ",
    "cik": "0000200406"
  },
  {
    "ticker": "JPM",
    "name": "JPMORGAN CHASE & CO",
    "symbol": "NYSE:JPM",
    "providerExchange": "NYSE",
    "secTicker": "JPM",
    "cik": "0000019617"
  },
  {
    "ticker": "KDP",
    "name": "Keurig Dr Pepper Inc.",
    "symbol": "NASDAQ:KDP",
    "providerExchange": "NASDAQ",
    "secTicker": "KDP",
    "cik": "0001418135"
  },
  {
    "ticker": "KEY",
    "name": "KEYCORP /NEW/",
    "symbol": "NYSE:KEY",
    "providerExchange": "NYSE",
    "secTicker": "KEY",
    "cik": "0000091576"
  },
  {
    "ticker": "KEYS",
    "name": "Keysight Technologies, Inc.",
    "symbol": "NYSE:KEYS",
    "providerExchange": "NYSE",
    "secTicker": "KEYS",
    "cik": "0001601046"
  },
  {
    "ticker": "KHC",
    "name": "Kraft Heinz Co",
    "symbol": "NYSE:KHC",
    "providerExchange": "NYSE",
    "secTicker": "KHC",
    "cik": "0001637459"
  },
  {
    "ticker": "KIM",
    "name": "KIMCO REALTY CORP",
    "symbol": "NYSE:KIM",
    "providerExchange": "NYSE",
    "secTicker": "KIM",
    "cik": "0000879101"
  },
  {
    "ticker": "KKR",
    "name": "KKR & Co. Inc.",
    "symbol": "NYSE:KKR",
    "providerExchange": "NYSE",
    "secTicker": "KKR",
    "cik": "0001404912"
  },
  {
    "ticker": "KLAC",
    "name": "KLA CORP",
    "symbol": "NASDAQ:KLAC",
    "providerExchange": "NASDAQ",
    "secTicker": "KLAC",
    "cik": "0000319201"
  },
  {
    "ticker": "KMB",
    "name": "KIMBERLY CLARK CORP",
    "symbol": "NASDAQ:KMB",
    "providerExchange": "NASDAQ",
    "secTicker": "KMB",
    "cik": "0000055785"
  },
  {
    "ticker": "KMI",
    "name": "KINDER MORGAN, INC.",
    "symbol": "NYSE:KMI",
    "providerExchange": "NYSE",
    "secTicker": "KMI",
    "cik": "0001506307"
  },
  {
    "ticker": "KO",
    "name": "COCA COLA CO",
    "symbol": "NYSE:KO",
    "providerExchange": "NYSE",
    "secTicker": "KO",
    "cik": "0000021344"
  },
  {
    "ticker": "KR",
    "name": "KROGER CO",
    "symbol": "NYSE:KR",
    "providerExchange": "NYSE",
    "secTicker": "KR",
    "cik": "0000056873"
  },
  {
    "ticker": "KVUE",
    "name": "Kenvue Inc.",
    "symbol": "NYSE:KVUE",
    "providerExchange": "NYSE",
    "secTicker": "KVUE",
    "cik": "0001944048"
  },
  {
    "ticker": "L",
    "name": "LOEWS CORP",
    "symbol": "NYSE:L",
    "providerExchange": "NYSE",
    "secTicker": "L",
    "cik": "0000060086"
  },
  {
    "ticker": "LDOS",
    "name": "Leidos Holdings, Inc.",
    "symbol": "NYSE:LDOS",
    "providerExchange": "NYSE",
    "secTicker": "LDOS",
    "cik": "0001336920"
  },
  {
    "ticker": "LEN",
    "name": "LENNAR CORP /NEW/",
    "symbol": "NYSE:LEN",
    "providerExchange": "NYSE",
    "secTicker": "LEN",
    "cik": "0000920760"
  },
  {
    "ticker": "LH",
    "name": "LABCORP HOLDINGS INC.",
    "symbol": "NYSE:LH",
    "providerExchange": "NYSE",
    "secTicker": "LH",
    "cik": "0000920148"
  },
  {
    "ticker": "LHX",
    "name": "L3HARRIS TECHNOLOGIES, INC. /DE/",
    "symbol": "NYSE:LHX",
    "providerExchange": "NYSE",
    "secTicker": "LHX",
    "cik": "0000202058"
  },
  {
    "ticker": "LII",
    "name": "LENNOX INTERNATIONAL INC",
    "symbol": "NYSE:LII",
    "providerExchange": "NYSE",
    "secTicker": "LII",
    "cik": "0001069202"
  },
  {
    "ticker": "LIN",
    "name": "LINDE PLC",
    "symbol": "NASDAQ:LIN",
    "providerExchange": "NASDAQ",
    "secTicker": "LIN",
    "cik": "0001707925"
  },
  {
    "ticker": "LITE",
    "name": "Lumentum Holdings Inc.",
    "symbol": "NASDAQ:LITE",
    "providerExchange": "NASDAQ",
    "secTicker": "LITE",
    "cik": "0001633978"
  },
  {
    "ticker": "LLY",
    "name": "ELI LILLY & Co",
    "symbol": "NYSE:LLY",
    "providerExchange": "NYSE",
    "secTicker": "LLY",
    "cik": "0000059478"
  },
  {
    "ticker": "LMT",
    "name": "LOCKHEED MARTIN CORP",
    "symbol": "NYSE:LMT",
    "providerExchange": "NYSE",
    "secTicker": "LMT",
    "cik": "0000936468"
  },
  {
    "ticker": "LNT",
    "name": "ALLIANT ENERGY CORP",
    "symbol": "NASDAQ:LNT",
    "providerExchange": "NASDAQ",
    "secTicker": "LNT",
    "cik": "0000352541"
  },
  {
    "ticker": "LOW",
    "name": "LOWES COMPANIES INC",
    "symbol": "NYSE:LOW",
    "providerExchange": "NYSE",
    "secTicker": "LOW",
    "cik": "0000060667"
  },
  {
    "ticker": "LRCX",
    "name": "LAM RESEARCH CORP",
    "symbol": "NASDAQ:LRCX",
    "providerExchange": "NASDAQ",
    "secTicker": "LRCX",
    "cik": "0000707549"
  },
  {
    "ticker": "LULU",
    "name": "lululemon athletica inc.",
    "symbol": "NASDAQ:LULU",
    "providerExchange": "NASDAQ",
    "secTicker": "LULU",
    "cik": "0001397187"
  },
  {
    "ticker": "LUV",
    "name": "SOUTHWEST AIRLINES CO",
    "symbol": "NYSE:LUV",
    "providerExchange": "NYSE",
    "secTicker": "LUV",
    "cik": "0000092380"
  },
  {
    "ticker": "LVS",
    "name": "LAS VEGAS SANDS CORP",
    "symbol": "NYSE:LVS",
    "providerExchange": "NYSE",
    "secTicker": "LVS",
    "cik": "0001300514"
  },
  {
    "ticker": "LYB",
    "name": "LyondellBasell Industries N.V.",
    "symbol": "NYSE:LYB",
    "providerExchange": "NYSE",
    "secTicker": "LYB",
    "cik": "0001489393"
  },
  {
    "ticker": "LYV",
    "name": "Live Nation Entertainment, Inc.",
    "symbol": "NYSE:LYV",
    "providerExchange": "NYSE",
    "secTicker": "LYV",
    "cik": "0001335258"
  },
  {
    "ticker": "MA",
    "name": "Mastercard Inc",
    "symbol": "NYSE:MA",
    "providerExchange": "NYSE",
    "secTicker": "MA",
    "cik": "0001141391"
  },
  {
    "ticker": "MAA",
    "name": "MID AMERICA APARTMENT COMMUNITIES INC.",
    "symbol": "NYSE:MAA",
    "providerExchange": "NYSE",
    "secTicker": "MAA",
    "cik": "0000912595"
  },
  {
    "ticker": "MAR",
    "name": "MARRIOTT INTERNATIONAL INC /MD/",
    "symbol": "NASDAQ:MAR",
    "providerExchange": "NASDAQ",
    "secTicker": "MAR",
    "cik": "0001048286"
  },
  {
    "ticker": "MAS",
    "name": "MASCO CORP /DE/",
    "symbol": "NYSE:MAS",
    "providerExchange": "NYSE",
    "secTicker": "MAS",
    "cik": "0000062996"
  },
  {
    "ticker": "MCD",
    "name": "MCDONALDS CORP",
    "symbol": "NYSE:MCD",
    "providerExchange": "NYSE",
    "secTicker": "MCD",
    "cik": "0000063908"
  },
  {
    "ticker": "MCHP",
    "name": "MICROCHIP TECHNOLOGY INC",
    "symbol": "NASDAQ:MCHP",
    "providerExchange": "NASDAQ",
    "secTicker": "MCHP",
    "cik": "0000827054"
  },
  {
    "ticker": "MCK",
    "name": "MCKESSON CORP",
    "symbol": "NYSE:MCK",
    "providerExchange": "NYSE",
    "secTicker": "MCK",
    "cik": "0000927653"
  },
  {
    "ticker": "MCO",
    "name": "MOODYS CORP /DE/",
    "symbol": "NYSE:MCO",
    "providerExchange": "NYSE",
    "secTicker": "MCO",
    "cik": "0001059556"
  },
  {
    "ticker": "MDLZ",
    "name": "Mondelez International, Inc.",
    "symbol": "NASDAQ:MDLZ",
    "providerExchange": "NASDAQ",
    "secTicker": "MDLZ",
    "cik": "0001103982"
  },
  {
    "ticker": "MDT",
    "name": "Medtronic plc",
    "symbol": "NYSE:MDT",
    "providerExchange": "NYSE",
    "secTicker": "MDT",
    "cik": "0001613103"
  },
  {
    "ticker": "MET",
    "name": "METLIFE INC",
    "symbol": "NYSE:MET",
    "providerExchange": "NYSE",
    "secTicker": "MET",
    "cik": "0001099219"
  },
  {
    "ticker": "META",
    "name": "Meta Platforms, Inc.",
    "symbol": "NASDAQ:META",
    "providerExchange": "NASDAQ",
    "secTicker": "META",
    "cik": "0001326801"
  },
  {
    "ticker": "MGM",
    "name": "MGM Resorts International",
    "symbol": "NYSE:MGM",
    "providerExchange": "NYSE",
    "secTicker": "MGM",
    "cik": "0000789570"
  },
  {
    "ticker": "MKC",
    "name": "MCCORMICK & CO INC",
    "symbol": "NYSE:MKC",
    "providerExchange": "NYSE",
    "secTicker": "MKC",
    "cik": "0000063754"
  },
  {
    "ticker": "MLM",
    "name": "MARTIN MARIETTA MATERIALS INC",
    "symbol": "NYSE:MLM",
    "providerExchange": "NYSE",
    "secTicker": "MLM",
    "cik": "0000916076"
  },
  {
    "ticker": "MMM",
    "name": "3M CO",
    "symbol": "NYSE:MMM",
    "providerExchange": "NYSE",
    "secTicker": "MMM",
    "cik": "0000066740"
  },
  {
    "ticker": "MNST",
    "name": "Monster Beverage Corp",
    "symbol": "NASDAQ:MNST",
    "providerExchange": "NASDAQ",
    "secTicker": "MNST",
    "cik": "0000865752"
  },
  {
    "ticker": "MO",
    "name": "ALTRIA GROUP, INC.",
    "symbol": "NYSE:MO",
    "providerExchange": "NYSE",
    "secTicker": "MO",
    "cik": "0000764180"
  },
  {
    "ticker": "MOS",
    "name": "MOSAIC CO",
    "symbol": "NYSE:MOS",
    "providerExchange": "NYSE",
    "secTicker": "MOS",
    "cik": "0001285785"
  },
  {
    "ticker": "MPC",
    "name": "Marathon Petroleum Corp",
    "symbol": "NYSE:MPC",
    "providerExchange": "NYSE",
    "secTicker": "MPC",
    "cik": "0001510295"
  },
  {
    "ticker": "MPWR",
    "name": "MONOLITHIC POWER SYSTEMS, INC.",
    "symbol": "NASDAQ:MPWR",
    "providerExchange": "NASDAQ",
    "secTicker": "MPWR",
    "cik": "0001280452"
  },
  {
    "ticker": "MRK",
    "name": "Merck & Co., Inc.",
    "symbol": "NYSE:MRK",
    "providerExchange": "NYSE",
    "secTicker": "MRK",
    "cik": "0000310158"
  },
  {
    "ticker": "MRNA",
    "name": "Moderna, Inc.",
    "symbol": "NASDAQ:MRNA",
    "providerExchange": "NASDAQ",
    "secTicker": "MRNA",
    "cik": "0001682852"
  },
  {
    "ticker": "MRSH",
    "name": "MARSH & MCLENNAN COMPANIES, INC.",
    "symbol": "NYSE:MRSH",
    "providerExchange": "NYSE",
    "secTicker": "MRSH",
    "cik": "0000062709"
  },
  {
    "ticker": "MRVL",
    "name": "Marvell Technology, Inc.",
    "symbol": "NASDAQ:MRVL",
    "providerExchange": "NASDAQ",
    "secTicker": "MRVL",
    "cik": "0001835632"
  },
  {
    "ticker": "MS",
    "name": "MORGAN STANLEY",
    "symbol": "NYSE:MS",
    "providerExchange": "NYSE",
    "secTicker": "MS",
    "cik": "0000895421"
  },
  {
    "ticker": "MSCI",
    "name": "MSCI Inc.",
    "symbol": "NYSE:MSCI",
    "providerExchange": "NYSE",
    "secTicker": "MSCI",
    "cik": "0001408198"
  },
  {
    "ticker": "MSFT",
    "name": "MICROSOFT CORP",
    "symbol": "NASDAQ:MSFT",
    "providerExchange": "NASDAQ",
    "secTicker": "MSFT",
    "cik": "0000789019"
  },
  {
    "ticker": "MSI",
    "name": "Motorola Solutions, Inc.",
    "symbol": "NYSE:MSI",
    "providerExchange": "NYSE",
    "secTicker": "MSI",
    "cik": "0000068505"
  },
  {
    "ticker": "MTB",
    "name": "M&T BANK CORP",
    "symbol": "NYSE:MTB",
    "providerExchange": "NYSE",
    "secTicker": "MTB",
    "cik": "0000036270"
  },
  {
    "ticker": "MTD",
    "name": "METTLER TOLEDO INTERNATIONAL INC/",
    "symbol": "NYSE:MTD",
    "providerExchange": "NYSE",
    "secTicker": "MTD",
    "cik": "0001037646"
  },
  {
    "ticker": "MU",
    "name": "MICRON TECHNOLOGY INC",
    "symbol": "NASDAQ:MU",
    "providerExchange": "NASDAQ",
    "secTicker": "MU",
    "cik": "0000723125"
  },
  {
    "ticker": "NCLH",
    "name": "Norwegian Cruise Line Holdings Ltd.",
    "symbol": "NYSE:NCLH",
    "providerExchange": "NYSE",
    "secTicker": "NCLH",
    "cik": "0001513761"
  },
  {
    "ticker": "NDAQ",
    "name": "NASDAQ, INC.",
    "symbol": "NASDAQ:NDAQ",
    "providerExchange": "NASDAQ",
    "secTicker": "NDAQ",
    "cik": "0001120193"
  },
  {
    "ticker": "NDSN",
    "name": "NORDSON CORP",
    "symbol": "NASDAQ:NDSN",
    "providerExchange": "NASDAQ",
    "secTicker": "NDSN",
    "cik": "0000072331"
  },
  {
    "ticker": "NEE",
    "name": "NEXTERA ENERGY INC",
    "symbol": "NYSE:NEE",
    "providerExchange": "NYSE",
    "secTicker": "NEE",
    "cik": "0000753308"
  },
  {
    "ticker": "NEM",
    "name": "NEWMONT Corp /DE/",
    "symbol": "NYSE:NEM",
    "providerExchange": "NYSE",
    "secTicker": "NEM",
    "cik": "0001164727"
  },
  {
    "ticker": "NFLX",
    "name": "NETFLIX INC",
    "symbol": "NASDAQ:NFLX",
    "providerExchange": "NASDAQ",
    "secTicker": "NFLX",
    "cik": "0001065280"
  },
  {
    "ticker": "NI",
    "name": "NISOURCE INC.",
    "symbol": "NYSE:NI",
    "providerExchange": "NYSE",
    "secTicker": "NI",
    "cik": "0001111711"
  },
  {
    "ticker": "NKE",
    "name": "NIKE, Inc.",
    "symbol": "NYSE:NKE",
    "providerExchange": "NYSE",
    "secTicker": "NKE",
    "cik": "0000320187"
  },
  {
    "ticker": "NOC",
    "name": "NORTHROP GRUMMAN CORP /DE/",
    "symbol": "NYSE:NOC",
    "providerExchange": "NYSE",
    "secTicker": "NOC",
    "cik": "0001133421"
  },
  {
    "ticker": "NOW",
    "name": "ServiceNow, Inc.",
    "symbol": "NYSE:NOW",
    "providerExchange": "NYSE",
    "secTicker": "NOW",
    "cik": "0001373715"
  },
  {
    "ticker": "NRG",
    "name": "NRG ENERGY, INC.",
    "symbol": "NYSE:NRG",
    "providerExchange": "NYSE",
    "secTicker": "NRG",
    "cik": "0001013871"
  },
  {
    "ticker": "NSC",
    "name": "NORFOLK SOUTHERN CORP",
    "symbol": "NYSE:NSC",
    "providerExchange": "NYSE",
    "secTicker": "NSC",
    "cik": "0000702165"
  },
  {
    "ticker": "NTAP",
    "name": "NetApp, Inc.",
    "symbol": "NASDAQ:NTAP",
    "providerExchange": "NASDAQ",
    "secTicker": "NTAP",
    "cik": "0001002047"
  },
  {
    "ticker": "NTRS",
    "name": "NORTHERN TRUST CORP",
    "symbol": "NASDAQ:NTRS",
    "providerExchange": "NASDAQ",
    "secTicker": "NTRS",
    "cik": "0000073124"
  },
  {
    "ticker": "NUE",
    "name": "NUCOR CORP",
    "symbol": "NYSE:NUE",
    "providerExchange": "NYSE",
    "secTicker": "NUE",
    "cik": "0000073309"
  },
  {
    "ticker": "NVDA",
    "name": "NVIDIA CORP",
    "symbol": "NASDAQ:NVDA",
    "providerExchange": "NASDAQ",
    "secTicker": "NVDA",
    "cik": "0001045810"
  },
  {
    "ticker": "NVR",
    "name": "NVR INC",
    "symbol": "NYSE:NVR",
    "providerExchange": "NYSE",
    "secTicker": "NVR",
    "cik": "0000906163"
  },
  {
    "ticker": "NWS",
    "name": "NEWS CORP",
    "symbol": "NASDAQ:NWS",
    "providerExchange": "NASDAQ",
    "secTicker": "NWS",
    "cik": "0001564708"
  },
  {
    "ticker": "NWSA",
    "name": "NEWS CORP",
    "symbol": "NASDAQ:NWSA",
    "providerExchange": "NASDAQ",
    "secTicker": "NWSA",
    "cik": "0001564708"
  },
  {
    "ticker": "NXPI",
    "name": "NXP Semiconductors N.V.",
    "symbol": "NASDAQ:NXPI",
    "providerExchange": "NASDAQ",
    "secTicker": "NXPI",
    "cik": "0001413447"
  },
  {
    "ticker": "O",
    "name": "REALTY INCOME CORP",
    "symbol": "NYSE:O",
    "providerExchange": "NYSE",
    "secTicker": "O",
    "cik": "0000726728"
  },
  {
    "ticker": "ODFL",
    "name": "OLD DOMINION FREIGHT LINE, INC.",
    "symbol": "NASDAQ:ODFL",
    "providerExchange": "NASDAQ",
    "secTicker": "ODFL",
    "cik": "0000878927"
  },
  {
    "ticker": "OKE",
    "name": "ONEOK INC /NEW/",
    "symbol": "NYSE:OKE",
    "providerExchange": "NYSE",
    "secTicker": "OKE",
    "cik": "0001039684"
  },
  {
    "ticker": "OMC",
    "name": "OMNICOM GROUP INC.",
    "symbol": "NYSE:OMC",
    "providerExchange": "NYSE",
    "secTicker": "OMC",
    "cik": "0000029989"
  },
  {
    "ticker": "ON",
    "name": "ON SEMICONDUCTOR CORP",
    "symbol": "NASDAQ:ON",
    "providerExchange": "NASDAQ",
    "secTicker": "ON",
    "cik": "0001097864"
  },
  {
    "ticker": "ORCL",
    "name": "ORACLE CORP",
    "symbol": "NYSE:ORCL",
    "providerExchange": "NYSE",
    "secTicker": "ORCL",
    "cik": "0001341439"
  },
  {
    "ticker": "ORLY",
    "name": "O REILLY AUTOMOTIVE INC",
    "symbol": "NASDAQ:ORLY",
    "providerExchange": "NASDAQ",
    "secTicker": "ORLY",
    "cik": "0000898173"
  },
  {
    "ticker": "OTIS",
    "name": "Otis Worldwide Corp",
    "symbol": "NYSE:OTIS",
    "providerExchange": "NYSE",
    "secTicker": "OTIS",
    "cik": "0001781335"
  },
  {
    "ticker": "OXY",
    "name": "OCCIDENTAL PETROLEUM CORP /DE/",
    "symbol": "NYSE:OXY",
    "providerExchange": "NYSE",
    "secTicker": "OXY",
    "cik": "0000797468"
  },
  {
    "ticker": "P",
    "name": "Everpure, Inc.",
    "symbol": "NYSE:P",
    "providerExchange": "NYSE",
    "secTicker": "P",
    "cik": "0001474432"
  },
  {
    "ticker": "PANW",
    "name": "Palo Alto Networks Inc",
    "symbol": "NASDAQ:PANW",
    "providerExchange": "NASDAQ",
    "secTicker": "PANW",
    "cik": "0001327567"
  },
  {
    "ticker": "PAYX",
    "name": "PAYCHEX INC",
    "symbol": "NASDAQ:PAYX",
    "providerExchange": "NASDAQ",
    "secTicker": "PAYX",
    "cik": "0000723531"
  },
  {
    "ticker": "PCAR",
    "name": "PACCAR INC",
    "symbol": "NASDAQ:PCAR",
    "providerExchange": "NASDAQ",
    "secTicker": "PCAR",
    "cik": "0000075362"
  },
  {
    "ticker": "PCG",
    "name": "PG&E Corp",
    "symbol": "NYSE:PCG",
    "providerExchange": "NYSE",
    "secTicker": "PCG",
    "cik": "0001004980"
  },
  {
    "ticker": "PEG",
    "name": "PUBLIC SERVICE ENTERPRISE GROUP INC",
    "symbol": "NYSE:PEG",
    "providerExchange": "NYSE",
    "secTicker": "PEG",
    "cik": "0000788784"
  },
  {
    "ticker": "PEP",
    "name": "PEPSICO INC",
    "symbol": "NASDAQ:PEP",
    "providerExchange": "NASDAQ",
    "secTicker": "PEP",
    "cik": "0000077476"
  },
  {
    "ticker": "PFE",
    "name": "PFIZER INC",
    "symbol": "NYSE:PFE",
    "providerExchange": "NYSE",
    "secTicker": "PFE",
    "cik": "0000078003"
  },
  {
    "ticker": "PFG",
    "name": "PRINCIPAL FINANCIAL GROUP INC",
    "symbol": "NASDAQ:PFG",
    "providerExchange": "NASDAQ",
    "secTicker": "PFG",
    "cik": "0001126328"
  },
  {
    "ticker": "PG",
    "name": "PROCTER & GAMBLE Co",
    "symbol": "NYSE:PG",
    "providerExchange": "NYSE",
    "secTicker": "PG",
    "cik": "0000080424"
  },
  {
    "ticker": "PGR",
    "name": "PROGRESSIVE CORP/OH/",
    "symbol": "NYSE:PGR",
    "providerExchange": "NYSE",
    "secTicker": "PGR",
    "cik": "0000080661"
  },
  {
    "ticker": "PH",
    "name": "Parker-Hannifin Corp",
    "symbol": "NYSE:PH",
    "providerExchange": "NYSE",
    "secTicker": "PH",
    "cik": "0000076334"
  },
  {
    "ticker": "PHM",
    "name": "PULTEGROUP INC/MI/",
    "symbol": "NYSE:PHM",
    "providerExchange": "NYSE",
    "secTicker": "PHM",
    "cik": "0000822416"
  },
  {
    "ticker": "PKG",
    "name": "PACKAGING CORP OF AMERICA",
    "symbol": "NYSE:PKG",
    "providerExchange": "NYSE",
    "secTicker": "PKG",
    "cik": "0000075677"
  },
  {
    "ticker": "PLD",
    "name": "Prologis, Inc.",
    "symbol": "NYSE:PLD",
    "providerExchange": "NYSE",
    "secTicker": "PLD",
    "cik": "0001045609"
  },
  {
    "ticker": "PLTR",
    "name": "Palantir Technologies Inc.",
    "symbol": "NASDAQ:PLTR",
    "providerExchange": "NASDAQ",
    "secTicker": "PLTR",
    "cik": "0001321655"
  },
  {
    "ticker": "PM",
    "name": "Philip Morris International Inc.",
    "symbol": "NYSE:PM",
    "providerExchange": "NYSE",
    "secTicker": "PM",
    "cik": "0001413329"
  },
  {
    "ticker": "PNC",
    "name": "PNC FINANCIAL SERVICES GROUP, INC.",
    "symbol": "NYSE:PNC",
    "providerExchange": "NYSE",
    "secTicker": "PNC",
    "cik": "0000713676"
  },
  {
    "ticker": "PNR",
    "name": "PENTAIR plc",
    "symbol": "NYSE:PNR",
    "providerExchange": "NYSE",
    "secTicker": "PNR",
    "cik": "0000077360"
  },
  {
    "ticker": "PNW",
    "name": "PINNACLE WEST CAPITAL CORP",
    "symbol": "NYSE:PNW",
    "providerExchange": "NYSE",
    "secTicker": "PNW",
    "cik": "0000764622"
  },
  {
    "ticker": "PODD",
    "name": "INSULET CORP",
    "symbol": "NASDAQ:PODD",
    "providerExchange": "NASDAQ",
    "secTicker": "PODD",
    "cik": "0001145197"
  },
  {
    "ticker": "PPG",
    "name": "PPG INDUSTRIES INC",
    "symbol": "NYSE:PPG",
    "providerExchange": "NYSE",
    "secTicker": "PPG",
    "cik": "0000079879"
  },
  {
    "ticker": "PPL",
    "name": "PPL Corp",
    "symbol": "NYSE:PPL",
    "providerExchange": "NYSE",
    "secTicker": "PPL",
    "cik": "0000922224"
  },
  {
    "ticker": "PRU",
    "name": "PRUDENTIAL FINANCIAL INC",
    "symbol": "NYSE:PRU",
    "providerExchange": "NYSE",
    "secTicker": "PRU",
    "cik": "0001137774"
  },
  {
    "ticker": "PSA",
    "name": "Public Storage",
    "symbol": "NYSE:PSA",
    "providerExchange": "NYSE",
    "secTicker": "PSA",
    "cik": "0001393311"
  },
  {
    "ticker": "PSX",
    "name": "Phillips 66",
    "symbol": "NYSE:PSX",
    "providerExchange": "NYSE",
    "secTicker": "PSX",
    "cik": "0001534701"
  },
  {
    "ticker": "PTC",
    "name": "PTC INC.",
    "symbol": "NASDAQ:PTC",
    "providerExchange": "NASDAQ",
    "secTicker": "PTC",
    "cik": "0000857005"
  },
  {
    "ticker": "PWR",
    "name": "QUANTA SERVICES, INC.",
    "symbol": "NYSE:PWR",
    "providerExchange": "NYSE",
    "secTicker": "PWR",
    "cik": "0001050915"
  },
  {
    "ticker": "PYPL",
    "name": "PayPal Holdings, Inc.",
    "symbol": "NASDAQ:PYPL",
    "providerExchange": "NASDAQ",
    "secTicker": "PYPL",
    "cik": "0001633917"
  },
  {
    "ticker": "Q",
    "name": "Qnity Electronics, Inc.",
    "symbol": "NYSE:Q",
    "providerExchange": "NYSE",
    "secTicker": "Q",
    "cik": "0002058873"
  },
  {
    "ticker": "QCOM",
    "name": "QUALCOMM INC/DE",
    "symbol": "NASDAQ:QCOM",
    "providerExchange": "NASDAQ",
    "secTicker": "QCOM",
    "cik": "0000804328"
  },
  {
    "ticker": "RCL",
    "name": "ROYAL CARIBBEAN CRUISES LTD",
    "symbol": "NYSE:RCL",
    "providerExchange": "NYSE",
    "secTicker": "RCL",
    "cik": "0000884887"
  },
  {
    "ticker": "RDDT",
    "name": "Reddit, Inc.",
    "symbol": "NYSE:RDDT",
    "providerExchange": "NYSE",
    "secTicker": "RDDT",
    "cik": "0001713445"
  },
  {
    "ticker": "REG",
    "name": "REGENCY CENTERS CORP",
    "symbol": "NASDAQ:REG",
    "providerExchange": "NASDAQ",
    "secTicker": "REG",
    "cik": "0000910606"
  },
  {
    "ticker": "REGN",
    "name": "REGENERON PHARMACEUTICALS, INC.",
    "symbol": "NASDAQ:REGN",
    "providerExchange": "NASDAQ",
    "secTicker": "REGN",
    "cik": "0000872589"
  },
  {
    "ticker": "RF",
    "name": "REGIONS FINANCIAL CORP",
    "symbol": "NYSE:RF",
    "providerExchange": "NYSE",
    "secTicker": "RF",
    "cik": "0001281761"
  },
  {
    "ticker": "RJF",
    "name": "RAYMOND JAMES FINANCIAL INC",
    "symbol": "NYSE:RJF",
    "providerExchange": "NYSE",
    "secTicker": "RJF",
    "cik": "0000720005"
  },
  {
    "ticker": "RL",
    "name": "RALPH LAUREN CORP",
    "symbol": "NYSE:RL",
    "providerExchange": "NYSE",
    "secTicker": "RL",
    "cik": "0001037038"
  },
  {
    "ticker": "RMD",
    "name": "RESMED INC",
    "symbol": "NYSE:RMD",
    "providerExchange": "NYSE",
    "secTicker": "RMD",
    "cik": "0000943819"
  },
  {
    "ticker": "ROK",
    "name": "ROCKWELL AUTOMATION, INC",
    "symbol": "NYSE:ROK",
    "providerExchange": "NYSE",
    "secTicker": "ROK",
    "cik": "0001024478"
  },
  {
    "ticker": "ROL",
    "name": "ROLLINS INC",
    "symbol": "NYSE:ROL",
    "providerExchange": "NYSE",
    "secTicker": "ROL",
    "cik": "0000084839"
  },
  {
    "ticker": "ROP",
    "name": "ROPER TECHNOLOGIES INC",
    "symbol": "NASDAQ:ROP",
    "providerExchange": "NASDAQ",
    "secTicker": "ROP",
    "cik": "0000882835"
  },
  {
    "ticker": "ROST",
    "name": "ROSS STORES, INC.",
    "symbol": "NASDAQ:ROST",
    "providerExchange": "NASDAQ",
    "secTicker": "ROST",
    "cik": "0000745732"
  },
  {
    "ticker": "RSG",
    "name": "REPUBLIC SERVICES, INC.",
    "symbol": "NYSE:RSG",
    "providerExchange": "NYSE",
    "secTicker": "RSG",
    "cik": "0001060391"
  },
  {
    "ticker": "RTX",
    "name": "RTX Corp",
    "symbol": "NYSE:RTX",
    "providerExchange": "NYSE",
    "secTicker": "RTX",
    "cik": "0000101829"
  },
  {
    "ticker": "RVTY",
    "name": "REVVITY, INC.",
    "symbol": "NYSE:RVTY",
    "providerExchange": "NYSE",
    "secTicker": "RVTY",
    "cik": "0000031791"
  },
  {
    "ticker": "SBAC",
    "name": "SBA COMMUNICATIONS CORP",
    "symbol": "NASDAQ:SBAC",
    "providerExchange": "NASDAQ",
    "secTicker": "SBAC",
    "cik": "0001034054"
  },
  {
    "ticker": "SBUX",
    "name": "STARBUCKS CORP",
    "symbol": "NASDAQ:SBUX",
    "providerExchange": "NASDAQ",
    "secTicker": "SBUX",
    "cik": "0000829224"
  },
  {
    "ticker": "SCHW",
    "name": "SCHWAB CHARLES CORP",
    "symbol": "NYSE:SCHW",
    "providerExchange": "NYSE",
    "secTicker": "SCHW",
    "cik": "0000316709"
  },
  {
    "ticker": "SHW",
    "name": "SHERWIN WILLIAMS CO",
    "symbol": "NYSE:SHW",
    "providerExchange": "NYSE",
    "secTicker": "SHW",
    "cik": "0000089800"
  },
  {
    "ticker": "SJM",
    "name": "J M SMUCKER Co",
    "symbol": "NYSE:SJM",
    "providerExchange": "NYSE",
    "secTicker": "SJM",
    "cik": "0000091419"
  },
  {
    "ticker": "SKYD",
    "name": "Skydance Corp",
    "symbol": "NYSE:SKYD",
    "providerExchange": "NYSE",
    "secTicker": "SKYD",
    "cik": "0002041610"
  },
  {
    "ticker": "SLB",
    "name": "SLB LIMITED/NV",
    "symbol": "NYSE:SLB",
    "providerExchange": "NYSE",
    "secTicker": "SLB",
    "cik": "0000087347"
  },
  {
    "ticker": "SMCI",
    "name": "Super Micro Computer, Inc.",
    "symbol": "NASDAQ:SMCI",
    "providerExchange": "NASDAQ",
    "secTicker": "SMCI",
    "cik": "0001375365"
  },
  {
    "ticker": "SNA",
    "name": "Snap-on Inc",
    "symbol": "NYSE:SNA",
    "providerExchange": "NYSE",
    "secTicker": "SNA",
    "cik": "0000091440"
  },
  {
    "ticker": "SNDK",
    "name": "Sandisk Corp",
    "symbol": "NASDAQ:SNDK",
    "providerExchange": "NASDAQ",
    "secTicker": "SNDK",
    "cik": "0002023554"
  },
  {
    "ticker": "SNPS",
    "name": "SYNOPSYS INC",
    "symbol": "NASDAQ:SNPS",
    "providerExchange": "NASDAQ",
    "secTicker": "SNPS",
    "cik": "0000883241"
  },
  {
    "ticker": "SO",
    "name": "SOUTHERN CO",
    "symbol": "NYSE:SO",
    "providerExchange": "NYSE",
    "secTicker": "SO",
    "cik": "0000092122"
  },
  {
    "ticker": "SOLV",
    "name": "Solventum Corp",
    "symbol": "NYSE:SOLV",
    "providerExchange": "NYSE",
    "secTicker": "SOLV",
    "cik": "0001964738"
  },
  {
    "ticker": "SPG",
    "name": "SIMON PROPERTY GROUP INC.",
    "symbol": "NYSE:SPG",
    "providerExchange": "NYSE",
    "secTicker": "SPG",
    "cik": "0001063761"
  },
  {
    "ticker": "SPGI",
    "name": "S&P Global Inc.",
    "symbol": "NYSE:SPGI",
    "providerExchange": "NYSE",
    "secTicker": "SPGI",
    "cik": "0000064040"
  },
  {
    "ticker": "SRE",
    "name": "SEMPRA",
    "symbol": "NYSE:SRE",
    "providerExchange": "NYSE",
    "secTicker": "SRE",
    "cik": "0001032208"
  },
  {
    "ticker": "STE",
    "name": "STERIS plc",
    "symbol": "NYSE:STE",
    "providerExchange": "NYSE",
    "secTicker": "STE",
    "cik": "0001757898"
  },
  {
    "ticker": "STLD",
    "name": "STEEL DYNAMICS INC",
    "symbol": "NASDAQ:STLD",
    "providerExchange": "NASDAQ",
    "secTicker": "STLD",
    "cik": "0001022671"
  },
  {
    "ticker": "STT",
    "name": "STATE STREET CORP",
    "symbol": "NYSE:STT",
    "providerExchange": "NYSE",
    "secTicker": "STT",
    "cik": "0000093751"
  },
  {
    "ticker": "STX",
    "name": "Seagate Technology Holdings plc",
    "symbol": "NASDAQ:STX",
    "providerExchange": "NASDAQ",
    "secTicker": "STX",
    "cik": "0001137789"
  },
  {
    "ticker": "STZ",
    "name": "CONSTELLATION BRANDS, INC.",
    "symbol": "NYSE:STZ",
    "providerExchange": "NYSE",
    "secTicker": "STZ",
    "cik": "0000016918"
  },
  {
    "ticker": "SW",
    "name": "Smurfit Westrock plc",
    "symbol": "NYSE:SW",
    "providerExchange": "NYSE",
    "secTicker": "SW",
    "cik": "0002005951"
  },
  {
    "ticker": "SWK",
    "name": "STANLEY BLACK & DECKER, INC.",
    "symbol": "NYSE:SWK",
    "providerExchange": "NYSE",
    "secTicker": "SWK",
    "cik": "0000093556"
  },
  {
    "ticker": "SWKS",
    "name": "SKYWORKS SOLUTIONS, INC.",
    "symbol": "NASDAQ:SWKS",
    "providerExchange": "NASDAQ",
    "secTicker": "SWKS",
    "cik": "0000004127"
  },
  {
    "ticker": "SYF",
    "name": "Synchrony Financial",
    "symbol": "NYSE:SYF",
    "providerExchange": "NYSE",
    "secTicker": "SYF",
    "cik": "0001601712"
  },
  {
    "ticker": "SYK",
    "name": "STRYKER CORP",
    "symbol": "NYSE:SYK",
    "providerExchange": "NYSE",
    "secTicker": "SYK",
    "cik": "0000310764"
  },
  {
    "ticker": "SYY",
    "name": "SYSCO CORP",
    "symbol": "NYSE:SYY",
    "providerExchange": "NYSE",
    "secTicker": "SYY",
    "cik": "0000096021"
  },
  {
    "ticker": "T",
    "name": "AT&T INC.",
    "symbol": "NYSE:T",
    "providerExchange": "NYSE",
    "secTicker": "T",
    "cik": "0000732717"
  },
  {
    "ticker": "TDG",
    "name": "TransDigm Group INC",
    "symbol": "NYSE:TDG",
    "providerExchange": "NYSE",
    "secTicker": "TDG",
    "cik": "0001260221"
  },
  {
    "ticker": "TDY",
    "name": "TELEDYNE TECHNOLOGIES INC",
    "symbol": "NYSE:TDY",
    "providerExchange": "NYSE",
    "secTicker": "TDY",
    "cik": "0001094285"
  },
  {
    "ticker": "TECH",
    "name": "BIO-TECHNE Corp",
    "symbol": "NASDAQ:TECH",
    "providerExchange": "NASDAQ",
    "secTicker": "TECH",
    "cik": "0000842023"
  },
  {
    "ticker": "TEL",
    "name": "TE Connectivity plc",
    "symbol": "NYSE:TEL",
    "providerExchange": "NYSE",
    "secTicker": "TEL",
    "cik": "0001385157"
  },
  {
    "ticker": "TER",
    "name": "TERADYNE, INC",
    "symbol": "NASDAQ:TER",
    "providerExchange": "NASDAQ",
    "secTicker": "TER",
    "cik": "0000097210"
  },
  {
    "ticker": "TFC",
    "name": "TRUIST FINANCIAL CORP",
    "symbol": "NYSE:TFC",
    "providerExchange": "NYSE",
    "secTicker": "TFC",
    "cik": "0000092230"
  },
  {
    "ticker": "TGT",
    "name": "TARGET CORP",
    "symbol": "NYSE:TGT",
    "providerExchange": "NYSE",
    "secTicker": "TGT",
    "cik": "0000027419"
  },
  {
    "ticker": "TJX",
    "name": "TJX COMPANIES INC /DE/",
    "symbol": "NYSE:TJX",
    "providerExchange": "NYSE",
    "secTicker": "TJX",
    "cik": "0000109198"
  },
  {
    "ticker": "TKO",
    "name": "TKO Group Holdings, Inc.",
    "symbol": "NYSE:TKO",
    "providerExchange": "NYSE",
    "secTicker": "TKO",
    "cik": "0001973266"
  },
  {
    "ticker": "TMO",
    "name": "THERMO FISHER SCIENTIFIC INC.",
    "symbol": "NYSE:TMO",
    "providerExchange": "NYSE",
    "secTicker": "TMO",
    "cik": "0000097745"
  },
  {
    "ticker": "TMUS",
    "name": "T-Mobile US, Inc.",
    "symbol": "NASDAQ:TMUS",
    "providerExchange": "NASDAQ",
    "secTicker": "TMUS",
    "cik": "0001283699"
  },
  {
    "ticker": "TPL",
    "name": "Texas Pacific Land Corp",
    "symbol": "NYSE:TPL",
    "providerExchange": "NYSE",
    "secTicker": "TPL",
    "cik": "0001811074"
  },
  {
    "ticker": "TPR",
    "name": "TAPESTRY, INC.",
    "symbol": "NYSE:TPR",
    "providerExchange": "NYSE",
    "secTicker": "TPR",
    "cik": "0001116132"
  },
  {
    "ticker": "TRGP",
    "name": "Targa Resources Corp.",
    "symbol": "NYSE:TRGP",
    "providerExchange": "NYSE",
    "secTicker": "TRGP",
    "cik": "0001389170"
  },
  {
    "ticker": "TRMB",
    "name": "TRIMBLE INC.",
    "symbol": "NASDAQ:TRMB",
    "providerExchange": "NASDAQ",
    "secTicker": "TRMB",
    "cik": "0000864749"
  },
  {
    "ticker": "TROW",
    "name": "PRICE T ROWE GROUP INC",
    "symbol": "NASDAQ:TROW",
    "providerExchange": "NASDAQ",
    "secTicker": "TROW",
    "cik": "0001113169"
  },
  {
    "ticker": "TRV",
    "name": "TRAVELERS COMPANIES, INC.",
    "symbol": "NYSE:TRV",
    "providerExchange": "NYSE",
    "secTicker": "TRV",
    "cik": "0000086312"
  },
  {
    "ticker": "TSCO",
    "name": "TRACTOR SUPPLY CO /DE/",
    "symbol": "NASDAQ:TSCO",
    "providerExchange": "NASDAQ",
    "secTicker": "TSCO",
    "cik": "0000916365"
  },
  {
    "ticker": "TSLA",
    "name": "Tesla, Inc.",
    "symbol": "NASDAQ:TSLA",
    "providerExchange": "NASDAQ",
    "secTicker": "TSLA",
    "cik": "0001318605"
  },
  {
    "ticker": "TSN",
    "name": "TYSON FOODS, INC.",
    "symbol": "NYSE:TSN",
    "providerExchange": "NYSE",
    "secTicker": "TSN",
    "cik": "0000100493"
  },
  {
    "ticker": "TT",
    "name": "Trane Technologies plc",
    "symbol": "NYSE:TT",
    "providerExchange": "NYSE",
    "secTicker": "TT",
    "cik": "0001466258"
  },
  {
    "ticker": "TTWO",
    "name": "TAKE TWO INTERACTIVE SOFTWARE INC",
    "symbol": "NASDAQ:TTWO",
    "providerExchange": "NASDAQ",
    "secTicker": "TTWO",
    "cik": "0000946581"
  },
  {
    "ticker": "TWLO",
    "name": "TWILIO INC",
    "symbol": "NYSE:TWLO",
    "providerExchange": "NYSE",
    "secTicker": "TWLO",
    "cik": "0001447669"
  },
  {
    "ticker": "TXN",
    "name": "TEXAS INSTRUMENTS INC",
    "symbol": "NASDAQ:TXN",
    "providerExchange": "NASDAQ",
    "secTicker": "TXN",
    "cik": "0000097476"
  },
  {
    "ticker": "TXT",
    "name": "TEXTRON INC",
    "symbol": "NYSE:TXT",
    "providerExchange": "NYSE",
    "secTicker": "TXT",
    "cik": "0000217346"
  },
  {
    "ticker": "TYL",
    "name": "TYLER TECHNOLOGIES INC",
    "symbol": "NYSE:TYL",
    "providerExchange": "NYSE",
    "secTicker": "TYL",
    "cik": "0000860731"
  },
  {
    "ticker": "UAL",
    "name": "United Airlines Holdings, Inc.",
    "symbol": "NASDAQ:UAL",
    "providerExchange": "NASDAQ",
    "secTicker": "UAL",
    "cik": "0000100517"
  },
  {
    "ticker": "UBER",
    "name": "Uber Technologies, Inc",
    "symbol": "NYSE:UBER",
    "providerExchange": "NYSE",
    "secTicker": "UBER",
    "cik": "0001543151"
  },
  {
    "ticker": "UDR",
    "name": "UDR, Inc.",
    "symbol": "NYSE:UDR",
    "providerExchange": "NYSE",
    "secTicker": "UDR",
    "cik": "0000074208"
  },
  {
    "ticker": "UHS",
    "name": "UNIVERSAL HEALTH SERVICES INC",
    "symbol": "NYSE:UHS",
    "providerExchange": "NYSE",
    "secTicker": "UHS",
    "cik": "0000352915"
  },
  {
    "ticker": "ULTA",
    "name": "Ulta Beauty, Inc.",
    "symbol": "NASDAQ:ULTA",
    "providerExchange": "NASDAQ",
    "secTicker": "ULTA",
    "cik": "0001403568"
  },
  {
    "ticker": "UNH",
    "name": "UNITEDHEALTH GROUP INC",
    "symbol": "NYSE:UNH",
    "providerExchange": "NYSE",
    "secTicker": "UNH",
    "cik": "0000731766"
  },
  {
    "ticker": "UNP",
    "name": "UNION PACIFIC CORP",
    "symbol": "NYSE:UNP",
    "providerExchange": "NYSE",
    "secTicker": "UNP",
    "cik": "0000100885"
  },
  {
    "ticker": "UPS",
    "name": "UNITED PARCEL SERVICE INC",
    "symbol": "NYSE:UPS",
    "providerExchange": "NYSE",
    "secTicker": "UPS",
    "cik": "0001090727"
  },
  {
    "ticker": "URI",
    "name": "UNITED RENTALS, INC.",
    "symbol": "NYSE:URI",
    "providerExchange": "NYSE",
    "secTicker": "URI",
    "cik": "0001067701"
  },
  {
    "ticker": "USB",
    "name": "US BANCORP DE",
    "symbol": "NYSE:USB",
    "providerExchange": "NYSE",
    "secTicker": "USB",
    "cik": "0000036104"
  },
  {
    "ticker": "V",
    "name": "VISA INC.",
    "symbol": "NYSE:V",
    "providerExchange": "NYSE",
    "secTicker": "V",
    "cik": "0001403161"
  },
  {
    "ticker": "VEEV",
    "name": "VEEVA SYSTEMS INC",
    "symbol": "NYSE:VEEV",
    "providerExchange": "NYSE",
    "secTicker": "VEEV",
    "cik": "0001393052"
  },
  {
    "ticker": "VICI",
    "name": "VICI PROPERTIES INC.",
    "symbol": "NYSE:VICI",
    "providerExchange": "NYSE",
    "secTicker": "VICI",
    "cik": "0001705696"
  },
  {
    "ticker": "VLO",
    "name": "VALERO ENERGY CORP/TX",
    "symbol": "NYSE:VLO",
    "providerExchange": "NYSE",
    "secTicker": "VLO",
    "cik": "0001035002"
  },
  {
    "ticker": "VLTO",
    "name": "Veralto Corp",
    "symbol": "NYSE:VLTO",
    "providerExchange": "NYSE",
    "secTicker": "VLTO",
    "cik": "0001967680"
  },
  {
    "ticker": "VMC",
    "name": "Vulcan Materials CO",
    "symbol": "NYSE:VMC",
    "providerExchange": "NYSE",
    "secTicker": "VMC",
    "cik": "0001396009"
  },
  {
    "ticker": "VMRK",
    "name": "VIVMARK RESIDENTIAL",
    "symbol": "NYSE:VMRK",
    "providerExchange": "NYSE",
    "secTicker": "VMRK",
    "cik": "0000906107"
  },
  {
    "ticker": "VRSK",
    "name": "Verisk Analytics, Inc.",
    "symbol": "NASDAQ:VRSK",
    "providerExchange": "NASDAQ",
    "secTicker": "VRSK",
    "cik": "0001442145"
  },
  {
    "ticker": "VRSN",
    "name": "VERISIGN INC/CA",
    "symbol": "NASDAQ:VRSN",
    "providerExchange": "NASDAQ",
    "secTicker": "VRSN",
    "cik": "0001014473"
  },
  {
    "ticker": "VRT",
    "name": "Vertiv Holdings Co",
    "symbol": "NYSE:VRT",
    "providerExchange": "NYSE",
    "secTicker": "VRT",
    "cik": "0001674101"
  },
  {
    "ticker": "VRTX",
    "name": "VERTEX PHARMACEUTICALS INC / MA",
    "symbol": "NASDAQ:VRTX",
    "providerExchange": "NASDAQ",
    "secTicker": "VRTX",
    "cik": "0000875320"
  },
  {
    "ticker": "VST",
    "name": "Vistra Corp.",
    "symbol": "NYSE:VST",
    "providerExchange": "NYSE",
    "secTicker": "VST",
    "cik": "0001692819"
  },
  {
    "ticker": "VTR",
    "name": "Ventas, Inc.",
    "symbol": "NYSE:VTR",
    "providerExchange": "NYSE",
    "secTicker": "VTR",
    "cik": "0000740260"
  },
  {
    "ticker": "VTRS",
    "name": "Viatris Inc",
    "symbol": "NASDAQ:VTRS",
    "providerExchange": "NASDAQ",
    "secTicker": "VTRS",
    "cik": "0001792044"
  },
  {
    "ticker": "VYLR",
    "name": "Vylor Inc.",
    "symbol": "NYSE:VYLR",
    "providerExchange": "NYSE",
    "secTicker": "VYLR",
    "cik": "0002128626"
  },
  {
    "ticker": "VZ",
    "name": "VERIZON COMMUNICATIONS INC",
    "symbol": "NYSE:VZ",
    "providerExchange": "NYSE",
    "secTicker": "VZ",
    "cik": "0000732712"
  },
  {
    "ticker": "WAB",
    "name": "WESTINGHOUSE AIR BRAKE TECHNOLOGIES CORP",
    "symbol": "NYSE:WAB",
    "providerExchange": "NYSE",
    "secTicker": "WAB",
    "cik": "0000943452"
  },
  {
    "ticker": "WAT",
    "name": "WATERS CORP /DE/",
    "symbol": "NYSE:WAT",
    "providerExchange": "NYSE",
    "secTicker": "WAT",
    "cik": "0001000697"
  },
  {
    "ticker": "WDAY",
    "name": "Workday, Inc.",
    "symbol": "NASDAQ:WDAY",
    "providerExchange": "NASDAQ",
    "secTicker": "WDAY",
    "cik": "0001327811"
  },
  {
    "ticker": "WDC",
    "name": "WESTERN DIGITAL CORP",
    "symbol": "NASDAQ:WDC",
    "providerExchange": "NASDAQ",
    "secTicker": "WDC",
    "cik": "0000106040"
  },
  {
    "ticker": "WEC",
    "name": "WEC ENERGY GROUP, INC.",
    "symbol": "NYSE:WEC",
    "providerExchange": "NYSE",
    "secTicker": "WEC",
    "cik": "0000783325"
  },
  {
    "ticker": "WELL",
    "name": "WELLTOWER INC.",
    "symbol": "NYSE:WELL",
    "providerExchange": "NYSE",
    "secTicker": "WELL",
    "cik": "0000766704"
  },
  {
    "ticker": "WFC",
    "name": "WELLS FARGO & COMPANY/MN",
    "symbol": "NYSE:WFC",
    "providerExchange": "NYSE",
    "secTicker": "WFC",
    "cik": "0000072971"
  },
  {
    "ticker": "WM",
    "name": "WASTE MANAGEMENT INC",
    "symbol": "NYSE:WM",
    "providerExchange": "NYSE",
    "secTicker": "WM",
    "cik": "0000823768"
  },
  {
    "ticker": "WMB",
    "name": "WILLIAMS COMPANIES, INC.",
    "symbol": "NYSE:WMB",
    "providerExchange": "NYSE",
    "secTicker": "WMB",
    "cik": "0000107263"
  },
  {
    "ticker": "WMT",
    "name": "Walmart Inc.",
    "symbol": "NASDAQ:WMT",
    "providerExchange": "NASDAQ",
    "secTicker": "WMT",
    "cik": "0000104169"
  },
  {
    "ticker": "WRB",
    "name": "BERKLEY W R CORP",
    "symbol": "NYSE:WRB",
    "providerExchange": "NYSE",
    "secTicker": "WRB",
    "cik": "0000011544"
  },
  {
    "ticker": "WSM",
    "name": "WILLIAMS SONOMA INC",
    "symbol": "NYSE:WSM",
    "providerExchange": "NYSE",
    "secTicker": "WSM",
    "cik": "0000719955"
  },
  {
    "ticker": "WST",
    "name": "WEST PHARMACEUTICAL SERVICES INC",
    "symbol": "NYSE:WST",
    "providerExchange": "NYSE",
    "secTicker": "WST",
    "cik": "0000105770"
  },
  {
    "ticker": "WTW",
    "name": "WILLIS TOWERS WATSON PLC",
    "symbol": "NASDAQ:WTW",
    "providerExchange": "NASDAQ",
    "secTicker": "WTW",
    "cik": "0001140536"
  },
  {
    "ticker": "WY",
    "name": "WEYERHAEUSER CO",
    "symbol": "NYSE:WY",
    "providerExchange": "NYSE",
    "secTicker": "WY",
    "cik": "0000106535"
  },
  {
    "ticker": "WYNN",
    "name": "WYNN RESORTS LTD",
    "symbol": "NASDAQ:WYNN",
    "providerExchange": "NASDAQ",
    "secTicker": "WYNN",
    "cik": "0001174922"
  },
  {
    "ticker": "XEL",
    "name": "XCEL ENERGY INC",
    "symbol": "NASDAQ:XEL",
    "providerExchange": "NASDAQ",
    "secTicker": "XEL",
    "cik": "0000072903"
  },
  {
    "ticker": "XOM",
    "name": "ExxonMobil Holdings Corp",
    "symbol": "NYSE:XOM",
    "providerExchange": "NYSE",
    "secTicker": "XOM",
    "cik": "0002115436"
  },
  {
    "ticker": "XYL",
    "name": "Xylem Inc.",
    "symbol": "NYSE:XYL",
    "providerExchange": "NYSE",
    "secTicker": "XYL",
    "cik": "0001524472"
  },
  {
    "ticker": "XYZ",
    "name": "Block, Inc.",
    "symbol": "NYSE:XYZ",
    "providerExchange": "NYSE",
    "secTicker": "XYZ",
    "cik": "0001512673"
  },
  {
    "ticker": "YUM",
    "name": "YUM BRANDS INC",
    "symbol": "NYSE:YUM",
    "providerExchange": "NYSE",
    "secTicker": "YUM",
    "cik": "0001041061"
  },
  {
    "ticker": "ZBH",
    "name": "ZIMMER BIOMET HOLDINGS, INC.",
    "symbol": "NYSE:ZBH",
    "providerExchange": "NYSE",
    "secTicker": "ZBH",
    "cik": "0001136869"
  },
  {
    "ticker": "ZBRA",
    "name": "ZEBRA TECHNOLOGIES CORP",
    "symbol": "NASDAQ:ZBRA",
    "providerExchange": "NASDAQ",
    "secTicker": "ZBRA",
    "cik": "0000877212"
  },
  {
    "ticker": "ZTS",
    "name": "Zoetis Inc.",
    "symbol": "NYSE:ZTS",
    "providerExchange": "NYSE",
    "secTicker": "ZTS",
    "cik": "0001555280"
  }
];

// src/index-data.js
var additionalIndexes = {
  "tsx60": {
    "metadata": {
      "asOf": "2026-10-15",
      "checkedOn": "2026-10-17",
      "count": 60,
      "basis": "Security coverage from XIU holdings; a tracker snapshot, not a licensed live index-membership feed.",
      "holdingsSource": "https://www.blackrock.com/ca/investors/en/products/239832/ishares-sptsx-60-index-etf",
      "listingSource": "https://www.blackrock.com/ca/investors/en/products/239832/ishares-sptsx-60-index-etf"
    },
    "securities": [
      {
        "ticker": "ABX.TO",
        "name": "BARRICK MINING",
        "symbol": "TSX:ABX",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA06849F1080",
        "sector": "Materials"
      },
      {
        "ticker": "AEM.TO",
        "name": "AGNICO EAGLE MINES",
        "symbol": "TSX:AEM",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA0084741085",
        "sector": "Materials"
      },
      {
        "ticker": "ATD.TO",
        "name": "ALIMENTATION COUCHE TARD INC",
        "symbol": "TSX:ATD",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA01626P1484",
        "sector": "Consumer Staples"
      },
      {
        "ticker": "BAM.TO",
        "name": "BROOKFIELD ASSET MANAGEMENT VOTING",
        "symbol": "TSX:BAM",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA1130041058",
        "sector": "Financials"
      },
      {
        "ticker": "BCE.TO",
        "name": "BCE INC",
        "symbol": "TSX:BCE",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA05534B7604",
        "sector": "Communication"
      },
      {
        "ticker": "BIP.UN.TO",
        "name": "BROOKFIELD INFRASTRUCTURE PARTNERS",
        "symbol": "TSX:BIP.UN",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "BMG162521014",
        "sector": "Utilities"
      },
      {
        "ticker": "BMO.TO",
        "name": "BANK OF MONTREAL",
        "symbol": "TSX:BMO",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA0636711016",
        "sector": "Financials"
      },
      {
        "ticker": "BN.TO",
        "name": "BROOKFIELD CLASS A",
        "symbol": "TSX:BN",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA11271J1075",
        "sector": "Financials"
      },
      {
        "ticker": "BNS.TO",
        "name": "BANK OF NOVA SCOTIA",
        "symbol": "TSX:BNS",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA0641491075",
        "sector": "Financials"
      },
      {
        "ticker": "CAE.TO",
        "name": "CAE",
        "symbol": "TSX:CAE",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA1247651088",
        "sector": "Industrials"
      },
      {
        "ticker": "CCL.B.TO",
        "name": "CCL INDUSTRIES CLASS B",
        "symbol": "TSX:CCL.B",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA1249003098",
        "sector": "Materials"
      },
      {
        "ticker": "CCO.TO",
        "name": "CAMECO",
        "symbol": "TSX:CCO",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA13321L1085",
        "sector": "Energy"
      },
      {
        "ticker": "CLS.TO",
        "name": "CELESTICA",
        "symbol": "TSX:CLS",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA15101Q2071",
        "sector": "Information Technology"
      },
      {
        "ticker": "CM.TO",
        "name": "CANADIAN IMPERIAL BANK OF COMMERCE",
        "symbol": "TSX:CM",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA1360691010",
        "sector": "Financials"
      },
      {
        "ticker": "CNQ.TO",
        "name": "CANADIAN NATURAL RESOURCES LTD",
        "symbol": "TSX:CNQ",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA1363851017",
        "sector": "Energy"
      },
      {
        "ticker": "CNR.TO",
        "name": "CANADIAN NATIONAL RAILWAY",
        "symbol": "TSX:CNR",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA1363751027",
        "sector": "Industrials"
      },
      {
        "ticker": "CP.TO",
        "name": "CANADIAN PACIFIC KANSAS CITY",
        "symbol": "TSX:CP",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA13646K1084",
        "sector": "Industrials"
      },
      {
        "ticker": "CSU.TO",
        "name": "CONSTELLATION SOFTWARE",
        "symbol": "TSX:CSU",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA21037X1006",
        "sector": "Information Technology"
      },
      {
        "ticker": "CTC.A.TO",
        "name": "CANADIAN TIRE LTD CLASS A",
        "symbol": "TSX:CTC.A",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA1366812024",
        "sector": "Consumer Discretionary"
      },
      {
        "ticker": "CVE.TO",
        "name": "CENOVUS ENERGY",
        "symbol": "TSX:CVE",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA15135U1093",
        "sector": "Energy"
      },
      {
        "ticker": "DOL.TO",
        "name": "DOLLARAMA",
        "symbol": "TSX:DOL",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA25675T1075",
        "sector": "Consumer Discretionary"
      },
      {
        "ticker": "EMA.TO",
        "name": "EMERA INC",
        "symbol": "TSX:EMA",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA2908761018",
        "sector": "Utilities"
      },
      {
        "ticker": "ENB.TO",
        "name": "ENBRIDGE",
        "symbol": "TSX:ENB",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA29250N1050",
        "sector": "Energy"
      },
      {
        "ticker": "FFH.TO",
        "name": "FAIRFAX FINANCIAL HOLDINGS SUB VOT",
        "symbol": "TSX:FFH",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA3039011026",
        "sector": "Financials"
      },
      {
        "ticker": "FM.TO",
        "name": "FIRST QUANTUM MINERALS",
        "symbol": "TSX:FM",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA3359341052",
        "sector": "Materials"
      },
      {
        "ticker": "FNV.TO",
        "name": "FRANCO NEVADA",
        "symbol": "TSX:FNV",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA3518581051",
        "sector": "Materials"
      },
      {
        "ticker": "FSV.TO",
        "name": "FIRSTSERVICE SUBORDINATE VOTING",
        "symbol": "TSX:FSV",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA33767E2024",
        "sector": "Real Estate"
      },
      {
        "ticker": "FTS.TO",
        "name": "FORTIS",
        "symbol": "TSX:FTS",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA3495531079",
        "sector": "Utilities"
      },
      {
        "ticker": "GIB.A.TO",
        "name": "CGI INC CLASS A",
        "symbol": "TSX:GIB.A",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA12532H1047",
        "sector": "Information Technology"
      },
      {
        "ticker": "GIL.TO",
        "name": "GILDAN ACTIVEWEAR",
        "symbol": "TSX:GIL",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA3759161035",
        "sector": "Consumer Discretionary"
      },
      {
        "ticker": "H.TO",
        "name": "HYDRO ONE",
        "symbol": "TSX:H",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA4488112083",
        "sector": "Utilities"
      },
      {
        "ticker": "IFC.TO",
        "name": "INTACT FINANCIAL CORP",
        "symbol": "TSX:IFC",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA45823T1066",
        "sector": "Financials"
      },
      {
        "ticker": "IMO.TO",
        "name": "IMPERIAL OIL LTD",
        "symbol": "TSX:IMO",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA4530384086",
        "sector": "Energy"
      },
      {
        "ticker": "K.TO",
        "name": "KINROSS GOLD",
        "symbol": "TSX:K",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA4969024047",
        "sector": "Materials"
      },
      {
        "ticker": "L.TO",
        "name": "LOBLAW COMPANIES LTD",
        "symbol": "TSX:L",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA5394811015",
        "sector": "Consumer Staples"
      },
      {
        "ticker": "MFC.TO",
        "name": "MANULIFE FINANCIAL",
        "symbol": "TSX:MFC",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA56501R1064",
        "sector": "Financials"
      },
      {
        "ticker": "MG.TO",
        "name": "MAGNA INTERNATIONAL",
        "symbol": "TSX:MG",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA5592224011",
        "sector": "Consumer Discretionary"
      },
      {
        "ticker": "MRU.TO",
        "name": "METRO",
        "symbol": "TSX:MRU",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA59162N1096",
        "sector": "Consumer Staples"
      },
      {
        "ticker": "NA.TO",
        "name": "NATIONAL BANK OF CANADA",
        "symbol": "TSX:NA",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA6330671034",
        "sector": "Financials"
      },
      {
        "ticker": "NTR.TO",
        "name": "NUTRIEN LTD",
        "symbol": "TSX:NTR",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA67077M1086",
        "sector": "Materials"
      },
      {
        "ticker": "OTEX.TO",
        "name": "OPEN TEXT",
        "symbol": "TSX:OTEX",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA6837151068",
        "sector": "Information Technology"
      },
      {
        "ticker": "POW.TO",
        "name": "POWER CORPORATION OF CANADA",
        "symbol": "TSX:POW",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA7392391016",
        "sector": "Financials"
      },
      {
        "ticker": "PPL.TO",
        "name": "PEMBINA PIPELINE",
        "symbol": "TSX:PPL",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA7063271034",
        "sector": "Energy"
      },
      {
        "ticker": "QSR.TO",
        "name": "RESTAURANTS BRANDS INTERNATIONAL",
        "symbol": "TSX:QSR",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA76131D1033",
        "sector": "Consumer Discretionary"
      },
      {
        "ticker": "RCI.B.TO",
        "name": "ROGERS COMMUNICATIONS NON-VOTING I",
        "symbol": "TSX:RCI.B",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA7751092007",
        "sector": "Communication"
      },
      {
        "ticker": "RY.TO",
        "name": "ROYAL BANK OF CANADA",
        "symbol": "TSX:RY",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA7800871021",
        "sector": "Financials"
      },
      {
        "ticker": "SAP.TO",
        "name": "SAPUTO",
        "symbol": "TSX:SAP",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA8029121057",
        "sector": "Consumer Staples"
      },
      {
        "ticker": "SHOP.TO",
        "name": "SHOPIFY SUBORDINATE VOTING CLASS A",
        "symbol": "TSX:SHOP",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA82509L1076",
        "sector": "Information Technology"
      },
      {
        "ticker": "SLF.TO",
        "name": "SUN LIFE FINANCIAL INC",
        "symbol": "TSX:SLF",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA8667961053",
        "sector": "Financials"
      },
      {
        "ticker": "SU.TO",
        "name": "SUNCOR ENERGY INC",
        "symbol": "TSX:SU",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA8672241079",
        "sector": "Energy"
      },
      {
        "ticker": "T.TO",
        "name": "TELUS",
        "symbol": "TSX:T",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA87971M1032",
        "sector": "Communication"
      },
      {
        "ticker": "TD.TO",
        "name": "TORONTO DOMINION",
        "symbol": "TSX:TD",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA8911605092",
        "sector": "Financials"
      },
      {
        "ticker": "TECK.B.TO",
        "name": "TECK RESOURCES SUBORDINATE VOTING",
        "symbol": "TSX:TECK.B",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA8787422044",
        "sector": "Materials"
      },
      {
        "ticker": "TOU.TO",
        "name": "TOURMALINE OIL CORP",
        "symbol": "TSX:TOU",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA89156V1067",
        "sector": "Energy"
      },
      {
        "ticker": "TRI.TO",
        "name": "THOMSON REUTERS CORP",
        "symbol": "TSX:TRI",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA8849038812",
        "sector": "Industrials"
      },
      {
        "ticker": "TRP.TO",
        "name": "TC ENERGY",
        "symbol": "TSX:TRP",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA87807B1076",
        "sector": "Energy"
      },
      {
        "ticker": "WCN.TO",
        "name": "WASTE CONNECTIONS",
        "symbol": "TSX:WCN",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA94106B1013",
        "sector": "Industrials"
      },
      {
        "ticker": "WN.TO",
        "name": "GEORGE WESTON",
        "symbol": "TSX:WN",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA9611485090",
        "sector": "Consumer Staples"
      },
      {
        "ticker": "WPM.TO",
        "name": "WHEATON PRECIOUS METALS",
        "symbol": "TSX:WPM",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA9628791027",
        "sector": "Materials"
      },
      {
        "ticker": "WSP.TO",
        "name": "WSP GLOBAL INC",
        "symbol": "TSX:WSP",
        "providerExchange": "TSX",
        "currency": "CAD",
        "isin": "CA92938W2022",
        "sector": "Industrials"
      }
    ],
    "lastAttempt": "2026-10-17T06:24:37.852Z",
    "lastSuccess": "2026-10-17T06:24:37.852Z",
    "status": "ready"
  },
  "nasdaq100": {
    "metadata": {
      "asOf": "2026-10-15",
      "checkedOn": "2026-10-17",
      "count": 101,
      "basis": "Security coverage from QQQ holdings; a tracker snapshot, not a licensed live index-membership feed.",
      "holdingsSource": "https://www.invesco.com/qqq-etf/en/about.html",
      "listingSource": "https://www.sec.gov/files/company_tickers_exchange.json"
    },
    "securities": [
      {
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "currency": "USD",
        "secTicker": "AAPL",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:AAPL",
        "cik": "0000320193"
      },
      {
        "ticker": "ABNB",
        "name": "Airbnb, Inc.",
        "currency": "USD",
        "secTicker": "ABNB",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:ABNB",
        "cik": "0001559720"
      },
      {
        "ticker": "ADBE",
        "name": "ADOBE INC.",
        "currency": "USD",
        "secTicker": "ADBE",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:ADBE",
        "cik": "0000796343"
      },
      {
        "ticker": "ADI",
        "name": "ANALOG DEVICES INC",
        "currency": "USD",
        "secTicker": "ADI",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:ADI",
        "cik": "0000006281"
      },
      {
        "ticker": "ADP",
        "name": "AUTOMATIC DATA PROCESSING INC",
        "currency": "USD",
        "secTicker": "ADP",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:ADP",
        "cik": "0000008670"
      },
      {
        "ticker": "ADSK",
        "name": "Autodesk, Inc.",
        "currency": "USD",
        "secTicker": "ADSK",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:ADSK",
        "cik": "0000769397"
      },
      {
        "ticker": "AEP",
        "name": "AMERICAN ELECTRIC POWER CO INC",
        "currency": "USD",
        "secTicker": "AEP",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:AEP",
        "cik": "0000004904"
      },
      {
        "ticker": "ALAB",
        "name": "Astera Labs, Inc.",
        "currency": "USD",
        "secTicker": "ALAB",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:ALAB",
        "cik": "0001736297"
      },
      {
        "ticker": "ALNY",
        "name": "ALNYLAM PHARMACEUTICALS, INC.",
        "currency": "USD",
        "secTicker": "ALNY",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:ALNY",
        "cik": "0001178670"
      },
      {
        "ticker": "AMAT",
        "name": "APPLIED MATERIALS INC /DE",
        "currency": "USD",
        "secTicker": "AMAT",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:AMAT",
        "cik": "0000006951"
      },
      {
        "ticker": "AMD",
        "name": "ADVANCED MICRO DEVICES INC",
        "currency": "USD",
        "secTicker": "AMD",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:AMD",
        "cik": "0000002488"
      },
      {
        "ticker": "AMGN",
        "name": "AMGEN INC",
        "currency": "USD",
        "secTicker": "AMGN",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:AMGN",
        "cik": "0000318154"
      },
      {
        "ticker": "AMZN",
        "name": "AMAZON COM INC",
        "currency": "USD",
        "secTicker": "AMZN",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:AMZN",
        "cik": "0001018724"
      },
      {
        "ticker": "APP",
        "name": "AppLovin Corp",
        "currency": "USD",
        "secTicker": "APP",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:APP",
        "cik": "0001751008"
      },
      {
        "ticker": "ARM",
        "name": "ARM HOLDINGS PLC /UK",
        "currency": "USD",
        "depositaryReceipt": true,
        "secTicker": "ARM",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:ARM",
        "cik": "0001973239"
      },
      {
        "ticker": "ASML",
        "name": "ASML HOLDING NV",
        "currency": "USD",
        "depositaryReceipt": true,
        "secTicker": "ASML",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:ASML",
        "cik": "0000937966"
      },
      {
        "ticker": "AVGO",
        "name": "Broadcom Inc.",
        "currency": "USD",
        "secTicker": "AVGO",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:AVGO",
        "cik": "0001730168"
      },
      {
        "ticker": "AXON",
        "name": "AXON ENTERPRISE, INC.",
        "currency": "USD",
        "secTicker": "AXON",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:AXON",
        "cik": "0001069183"
      },
      {
        "ticker": "BKNG",
        "name": "Booking Holdings Inc.",
        "currency": "USD",
        "secTicker": "BKNG",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:BKNG",
        "cik": "0001075531"
      },
      {
        "ticker": "BKR",
        "name": "Baker Hughes Co",
        "currency": "USD",
        "secTicker": "BKR",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:BKR",
        "cik": "0001701605"
      },
      {
        "ticker": "CCEP",
        "name": "COCA-COLA EUROPACIFIC PARTNERS plc",
        "currency": "USD",
        "secTicker": "CCEP",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:CCEP",
        "cik": "0001650107"
      },
      {
        "ticker": "CDNS",
        "name": "CADENCE DESIGN SYSTEMS INC",
        "currency": "USD",
        "secTicker": "CDNS",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:CDNS",
        "cik": "0000813672"
      },
      {
        "ticker": "CEG",
        "name": "Constellation Energy Corp",
        "currency": "USD",
        "secTicker": "CEG",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:CEG",
        "cik": "0001868275"
      },
      {
        "ticker": "CMCSA",
        "name": "COMCAST CORP",
        "currency": "USD",
        "secTicker": "CMCSA",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:CMCSA",
        "cik": "0001166691"
      },
      {
        "ticker": "COST",
        "name": "COSTCO WHOLESALE CORP /NEW",
        "currency": "USD",
        "secTicker": "COST",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:COST",
        "cik": "0000909832"
      },
      {
        "ticker": "CPRT",
        "name": "COPART INC",
        "currency": "USD",
        "secTicker": "CPRT",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:CPRT",
        "cik": "0000900075"
      },
      {
        "ticker": "CRWD",
        "name": "CrowdStrike Holdings, Inc.",
        "currency": "USD",
        "secTicker": "CRWD",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:CRWD",
        "cik": "0001535527"
      },
      {
        "ticker": "CRWV",
        "name": "CoreWeave, Inc.",
        "currency": "USD",
        "secTicker": "CRWV",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:CRWV",
        "cik": "0001769628"
      },
      {
        "ticker": "CSCO",
        "name": "CISCO SYSTEMS, INC.",
        "currency": "USD",
        "secTicker": "CSCO",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:CSCO",
        "cik": "0000858877"
      },
      {
        "ticker": "CSX",
        "name": "CSX CORP",
        "currency": "USD",
        "secTicker": "CSX",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:CSX",
        "cik": "0000277948"
      },
      {
        "ticker": "CTAS",
        "name": "CINTAS CORP",
        "currency": "USD",
        "secTicker": "CTAS",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:CTAS",
        "cik": "0000723254"
      },
      {
        "ticker": "DASH",
        "name": "DoorDash, Inc.",
        "currency": "USD",
        "secTicker": "DASH",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:DASH",
        "cik": "0001792789"
      },
      {
        "ticker": "DDOG",
        "name": "Datadog, Inc.",
        "currency": "USD",
        "secTicker": "DDOG",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:DDOG",
        "cik": "0001561550"
      },
      {
        "ticker": "DXCM",
        "name": "DEXCOM INC",
        "currency": "USD",
        "secTicker": "DXCM",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:DXCM",
        "cik": "0001093557"
      },
      {
        "ticker": "EXC",
        "name": "EXELON CORP",
        "currency": "USD",
        "secTicker": "EXC",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:EXC",
        "cik": "0001109357"
      },
      {
        "ticker": "FANG",
        "name": "Diamondback Energy, Inc.",
        "currency": "USD",
        "secTicker": "FANG",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:FANG",
        "cik": "0001539838"
      },
      {
        "ticker": "FAST",
        "name": "FASTENAL CO",
        "currency": "USD",
        "secTicker": "FAST",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:FAST",
        "cik": "0000815556"
      },
      {
        "ticker": "FER",
        "name": "Ferrovial N.V.",
        "currency": "USD",
        "secTicker": "FER",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:FER",
        "cik": "0001468522"
      },
      {
        "ticker": "FTNT",
        "name": "Fortinet, Inc.",
        "currency": "USD",
        "secTicker": "FTNT",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:FTNT",
        "cik": "0001262039"
      },
      {
        "ticker": "GEHC",
        "name": "GE HealthCare Technologies Inc.",
        "currency": "USD",
        "secTicker": "GEHC",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:GEHC",
        "cik": "0001932393"
      },
      {
        "ticker": "GILD",
        "name": "GILEAD SCIENCES, INC.",
        "currency": "USD",
        "secTicker": "GILD",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:GILD",
        "cik": "0000882095"
      },
      {
        "ticker": "GOOG",
        "name": "Alphabet Inc.",
        "currency": "USD",
        "secTicker": "GOOG",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:GOOG",
        "cik": "0001652044"
      },
      {
        "ticker": "GOOGL",
        "name": "Alphabet Inc.",
        "currency": "USD",
        "secTicker": "GOOGL",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:GOOGL",
        "cik": "0001652044"
      },
      {
        "ticker": "HON",
        "name": "HONEYWELL INTERNATIONAL INC",
        "currency": "USD",
        "secTicker": "HON",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:HON",
        "cik": "0000773840"
      },
      {
        "ticker": "HONA",
        "name": "Honeywell Aerospace Inc.",
        "currency": "USD",
        "secTicker": "HONA",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:HONA",
        "cik": "0002089271"
      },
      {
        "ticker": "IDXX",
        "name": "IDEXX LABORATORIES INC /DE",
        "currency": "USD",
        "secTicker": "IDXX",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:IDXX",
        "cik": "0000874716"
      },
      {
        "ticker": "INTC",
        "name": "INTEL CORP",
        "currency": "USD",
        "secTicker": "INTC",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:INTC",
        "cik": "0000050863"
      },
      {
        "ticker": "INTU",
        "name": "INTUIT INC.",
        "currency": "USD",
        "secTicker": "INTU",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:INTU",
        "cik": "0000896878"
      },
      {
        "ticker": "ISRG",
        "name": "INTUITIVE SURGICAL INC",
        "currency": "USD",
        "secTicker": "ISRG",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:ISRG",
        "cik": "0001035267"
      },
      {
        "ticker": "KDP",
        "name": "Keurig Dr Pepper Inc.",
        "currency": "USD",
        "secTicker": "KDP",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:KDP",
        "cik": "0001418135"
      },
      {
        "ticker": "KLAC",
        "name": "KLA CORP",
        "currency": "USD",
        "secTicker": "KLAC",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:KLAC",
        "cik": "0000319201"
      },
      {
        "ticker": "LIN",
        "name": "LINDE PLC",
        "currency": "USD",
        "secTicker": "LIN",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:LIN",
        "cik": "0001707925"
      },
      {
        "ticker": "LITE",
        "name": "Lumentum Holdings Inc.",
        "currency": "USD",
        "secTicker": "LITE",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:LITE",
        "cik": "0001633978"
      },
      {
        "ticker": "LRCX",
        "name": "LAM RESEARCH CORP",
        "currency": "USD",
        "secTicker": "LRCX",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:LRCX",
        "cik": "0000707549"
      },
      {
        "ticker": "MAR",
        "name": "MARRIOTT INTERNATIONAL INC /MD/",
        "currency": "USD",
        "secTicker": "MAR",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:MAR",
        "cik": "0001048286"
      },
      {
        "ticker": "MCHP",
        "name": "MICROCHIP TECHNOLOGY INC",
        "currency": "USD",
        "secTicker": "MCHP",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:MCHP",
        "cik": "0000827054"
      },
      {
        "ticker": "MDLZ",
        "name": "Mondelez International, Inc.",
        "currency": "USD",
        "secTicker": "MDLZ",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:MDLZ",
        "cik": "0001103982"
      },
      {
        "ticker": "MELI",
        "name": "MERCADOLIBRE INC",
        "currency": "USD",
        "secTicker": "MELI",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:MELI",
        "cik": "0001099590"
      },
      {
        "ticker": "META",
        "name": "Meta Platforms, Inc.",
        "currency": "USD",
        "secTicker": "META",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:META",
        "cik": "0001326801"
      },
      {
        "ticker": "MNST",
        "name": "Monster Beverage Corp",
        "currency": "USD",
        "secTicker": "MNST",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:MNST",
        "cik": "0000865752"
      },
      {
        "ticker": "MPWR",
        "name": "MONOLITHIC POWER SYSTEMS, INC.",
        "currency": "USD",
        "secTicker": "MPWR",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:MPWR",
        "cik": "0001280452"
      },
      {
        "ticker": "MRNA",
        "name": "Moderna, Inc.",
        "currency": "USD",
        "secTicker": "MRNA",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:MRNA",
        "cik": "0001682852"
      },
      {
        "ticker": "MRVL",
        "name": "Marvell Technology, Inc.",
        "currency": "USD",
        "secTicker": "MRVL",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:MRVL",
        "cik": "0001835632"
      },
      {
        "ticker": "MSFT",
        "name": "MICROSOFT CORP",
        "currency": "USD",
        "secTicker": "MSFT",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:MSFT",
        "cik": "0000789019"
      },
      {
        "ticker": "MSTR",
        "name": "Strategy Inc",
        "currency": "USD",
        "secTicker": "MSTR",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:MSTR",
        "cik": "0001050446"
      },
      {
        "ticker": "MU",
        "name": "MICRON TECHNOLOGY INC",
        "currency": "USD",
        "secTicker": "MU",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:MU",
        "cik": "0000723125"
      },
      {
        "ticker": "NBIS",
        "name": "Nebius Group N.V.",
        "currency": "USD",
        "secTicker": "NBIS",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:NBIS",
        "cik": "0001513845"
      },
      {
        "ticker": "NFLX",
        "name": "NETFLIX INC",
        "currency": "USD",
        "secTicker": "NFLX",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:NFLX",
        "cik": "0001065280"
      },
      {
        "ticker": "NVDA",
        "name": "NVIDIA CORP",
        "currency": "USD",
        "secTicker": "NVDA",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:NVDA",
        "cik": "0001045810"
      },
      {
        "ticker": "NXPI",
        "name": "NXP Semiconductors N.V.",
        "currency": "USD",
        "secTicker": "NXPI",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:NXPI",
        "cik": "0001413447"
      },
      {
        "ticker": "ODFL",
        "name": "OLD DOMINION FREIGHT LINE, INC.",
        "currency": "USD",
        "secTicker": "ODFL",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:ODFL",
        "cik": "0000878927"
      },
      {
        "ticker": "ORLY",
        "name": "O REILLY AUTOMOTIVE INC",
        "currency": "USD",
        "secTicker": "ORLY",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:ORLY",
        "cik": "0000898173"
      },
      {
        "ticker": "PANW",
        "name": "Palo Alto Networks Inc",
        "currency": "USD",
        "secTicker": "PANW",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:PANW",
        "cik": "0001327567"
      },
      {
        "ticker": "PAYX",
        "name": "PAYCHEX INC",
        "currency": "USD",
        "secTicker": "PAYX",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:PAYX",
        "cik": "0000723531"
      },
      {
        "ticker": "PCAR",
        "name": "PACCAR INC",
        "currency": "USD",
        "secTicker": "PCAR",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:PCAR",
        "cik": "0000075362"
      },
      {
        "ticker": "PDD",
        "name": "PDD Holdings Inc.",
        "currency": "USD",
        "depositaryReceipt": true,
        "secTicker": "PDD",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:PDD",
        "cik": "0001737806"
      },
      {
        "ticker": "PEP",
        "name": "PEPSICO INC",
        "currency": "USD",
        "secTicker": "PEP",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:PEP",
        "cik": "0000077476"
      },
      {
        "ticker": "PLTR",
        "name": "Palantir Technologies Inc.",
        "currency": "USD",
        "secTicker": "PLTR",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:PLTR",
        "cik": "0001321655"
      },
      {
        "ticker": "PYPL",
        "name": "PayPal Holdings, Inc.",
        "currency": "USD",
        "secTicker": "PYPL",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:PYPL",
        "cik": "0001633917"
      },
      {
        "ticker": "QCOM",
        "name": "QUALCOMM INC/DE",
        "currency": "USD",
        "secTicker": "QCOM",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:QCOM",
        "cik": "0000804328"
      },
      {
        "ticker": "REGN",
        "name": "REGENERON PHARMACEUTICALS, INC.",
        "currency": "USD",
        "secTicker": "REGN",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:REGN",
        "cik": "0000872589"
      },
      {
        "ticker": "RKLB",
        "name": "Rocket Lab Corp",
        "currency": "USD",
        "secTicker": "RKLB",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:RKLB",
        "cik": "0001819994"
      },
      {
        "ticker": "ROP",
        "name": "ROPER TECHNOLOGIES INC",
        "currency": "USD",
        "secTicker": "ROP",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:ROP",
        "cik": "0000882835"
      },
      {
        "ticker": "ROST",
        "name": "ROSS STORES, INC.",
        "currency": "USD",
        "secTicker": "ROST",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:ROST",
        "cik": "0000745732"
      },
      {
        "ticker": "SBUX",
        "name": "STARBUCKS CORP",
        "currency": "USD",
        "secTicker": "SBUX",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:SBUX",
        "cik": "0000829224"
      },
      {
        "ticker": "SHOP",
        "name": "SHOPIFY INC.",
        "currency": "USD",
        "secTicker": "SHOP",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:SHOP",
        "cik": "0001594805"
      },
      {
        "ticker": "SNDK",
        "name": "Sandisk Corp",
        "currency": "USD",
        "secTicker": "SNDK",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:SNDK",
        "cik": "0002023554"
      },
      {
        "ticker": "SNPS",
        "name": "SYNOPSYS INC",
        "currency": "USD",
        "secTicker": "SNPS",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:SNPS",
        "cik": "0000883241"
      },
      {
        "ticker": "SPCX",
        "name": "SPACE EXPLORATION TECHNOLOGIES CORP",
        "currency": "USD",
        "secTicker": "SPCX",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:SPCX",
        "cik": "0001181412"
      },
      {
        "ticker": "STX",
        "name": "Seagate Technology Holdings plc",
        "currency": "USD",
        "secTicker": "STX",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:STX",
        "cik": "0001137789"
      },
      {
        "ticker": "TER",
        "name": "TERADYNE, INC",
        "currency": "USD",
        "secTicker": "TER",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:TER",
        "cik": "0000097210"
      },
      {
        "ticker": "TMUS",
        "name": "T-Mobile US, Inc.",
        "currency": "USD",
        "secTicker": "TMUS",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:TMUS",
        "cik": "0001283699"
      },
      {
        "ticker": "TRI",
        "name": "THOMSON REUTERS CORP /CAN/",
        "currency": "USD",
        "secTicker": "TRI",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:TRI",
        "cik": "0001075124"
      },
      {
        "ticker": "TSLA",
        "name": "Tesla, Inc.",
        "currency": "USD",
        "secTicker": "TSLA",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:TSLA",
        "cik": "0001318605"
      },
      {
        "ticker": "TTWO",
        "name": "TAKE TWO INTERACTIVE SOFTWARE INC",
        "currency": "USD",
        "secTicker": "TTWO",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:TTWO",
        "cik": "0000946581"
      },
      {
        "ticker": "TXN",
        "name": "TEXAS INSTRUMENTS INC",
        "currency": "USD",
        "secTicker": "TXN",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:TXN",
        "cik": "0000097476"
      },
      {
        "ticker": "VRTX",
        "name": "VERTEX PHARMACEUTICALS INC / MA",
        "currency": "USD",
        "secTicker": "VRTX",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:VRTX",
        "cik": "0000875320"
      },
      {
        "ticker": "WDAY",
        "name": "Workday, Inc.",
        "currency": "USD",
        "secTicker": "WDAY",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:WDAY",
        "cik": "0001327811"
      },
      {
        "ticker": "WDC",
        "name": "WESTERN DIGITAL CORP",
        "currency": "USD",
        "secTicker": "WDC",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:WDC",
        "cik": "0000106040"
      },
      {
        "ticker": "WMT",
        "name": "Walmart Inc.",
        "currency": "USD",
        "secTicker": "WMT",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:WMT",
        "cik": "0000104169"
      },
      {
        "ticker": "XEL",
        "name": "XCEL ENERGY INC",
        "currency": "USD",
        "secTicker": "XEL",
        "providerExchange": "NASDAQ",
        "symbol": "NASDAQ:XEL",
        "cik": "0000072903"
      }
    ],
    "lastAttempt": "2026-10-17T06:24:37.852Z",
    "lastSuccess": "2026-10-17T06:24:37.852Z",
    "status": "ready"
  }
};

// src/coverage-schema.js
var indexSpecs = {
  sp500: {
    label: "S&P 500",
    command: "SP500",
    tracker: "SPY",
    min: 500,
    max: 510,
    holdingsSource: "https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-spy.xlsx"
  },
  tsx60: {
    label: "S&P/TSX 60",
    command: "TSX60",
    tracker: "XIU",
    min: 60,
    max: 62,
    holdingsSource: "https://www.blackrock.com/ca/investors/en/products/239832/ishares-sptsx-60-index-etf",
    dataSource: "https://www.blackrock.com/ca/investors/en/products/239832/ishares-sptsx-60-index-etf/1464253357814.ajax?tab=all&fileType=json"
  },
  nasdaq100: {
    label: "Nasdaq 100",
    command: "NDX100",
    tracker: "QQQ",
    min: 100,
    max: 103,
    holdingsSource: "https://www.invesco.com/qqq-etf/en/about.html",
    dataSource: "https://dng-api.invesco.com/cache/v1/accounts/en_US/shareclasses/QQQ/holdings/fund?idType=ticker&interval=monthly&productType=ETF"
  }
};
var listingSource = "https://www.sec.gov/files/company_tickers_exchange.json";
function currentSnapshotDate(value, now2 = /* @__PURE__ */ new Date(), maxDays = 7) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) throw new Error("Missing snapshot date");
  const d = /* @__PURE__ */ new Date(value + "T00:00:00Z");
  const age = (+now2 - +d) / 864e5;
  if (!Number.isFinite(age) || d.toISOString().slice(0, 10) !== value || age < 0 || age >= maxDays + 1)
    throw new Error("Snapshot is stale or future-dated");
  return value;
}
function validateIndex(id, data) {
  const spec = indexSpecs[id];
  if (!spec || !data?.metadata || !Array.isArray(data.securities) || data.securities.length < spec.min || data.securities.length > spec.max || data.metadata.count !== data.securities.length)
    throw new Error("Incomplete index directory");
  const seen = /* @__PURE__ */ new Set();
  for (const r of data.securities) {
    const canadian2 = id === "tsx60";
    if (!r || typeof r.name !== "string" || !r.name.trim() || r.name.length > 180 || !/^[A-Z][A-Z0-9.\-]{0,20}$/.test(r.ticker || "") || seen.has(r.ticker) || !["TSX", "NASDAQ", "NYSE", "CBOE"].includes(r.providerExchange) || (canadian2 ? !r.ticker.endsWith(".TO") || r.providerExchange !== "TSX" || r.currency !== "CAD" : r.currency !== "USD" || r.providerExchange === "TSX") || r.symbol !== `${r.providerExchange}:${canadian2 ? r.ticker.slice(0, -3) : r.ticker}` || !canadian2 && !/^\d{10}$/.test(r.cik || "")) throw new Error("Invalid or duplicate listing reference");
    seen.add(r.ticker);
  }
  return data;
}

// src/data.js
function validDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = /* @__PURE__ */ new Date(s + "T00:00:00Z");
  return Number.isFinite(+d) && d.toISOString().slice(0, 10) === s;
}
var curatedCatalog = [
  ["SPY", "SPDR S&P 500 ETF Trust", "AMEX:SPY", "ETF"],
  ["QQQ", "Nasdaq 100 ETF", "NASDAQ:QQQ", "ETF"],
  ["DIA", "Dow Jones ETF", "AMEX:DIA", "ETF"],
  ["IWM", "Russell 2000 ETF", "AMEX:IWM", "ETF"],
  ["RSP", "S&P 500 Equal Weight", "AMEX:RSP", "ETF"],
  ["NVDA", "NVIDIA", "NASDAQ:NVDA", "US"],
  ["AAPL", "Apple", "NASDAQ:AAPL", "US"],
  ["MSFT", "Microsoft", "NASDAQ:MSFT", "US"],
  ["AMZN", "Amazon", "NASDAQ:AMZN", "US"],
  ["GOOGL", "Alphabet", "NASDAQ:GOOGL", "US"],
  ["GOOG", "Alphabet Class C", "NASDAQ:GOOG", "US"],
  ["META", "Meta Platforms", "NASDAQ:META", "US"],
  ["AVGO", "Broadcom", "NASDAQ:AVGO", "US"],
  ["TSLA", "Tesla", "NASDAQ:TSLA", "US"],
  ["TSM", "Taiwan Semiconductor ADR", "NYSE:TSM", "US"],
  ["MU", "Micron Technology", "NASDAQ:MU", "US"],
  ["AMD", "Advanced Micro Devices", "NASDAQ:AMD", "US"],
  ["JPM", "JPMorgan Chase", "NYSE:JPM", "US"],
  ["V", "Visa", "NYSE:V", "US"],
  ["MA", "Mastercard", "NYSE:MA", "US"],
  ["BRK.B", "Berkshire Hathaway", "NYSE:BRK.B", "US"],
  ["WMT", "Walmart", "NASDAQ:WMT", "US"],
  ["COST", "Costco", "NASDAQ:COST", "US"],
  ["LLY", "Eli Lilly", "NYSE:LLY", "US"],
  ["XOM", "Exxon Mobil", "NYSE:XOM", "US"],
  ["NFLX", "Netflix", "NASDAQ:NFLX", "US"],
  ["PLTR", "Palantir Technologies", "NASDAQ:PLTR", "US"],
  ["ORCL", "Oracle", "NYSE:ORCL", "US"],
  ["COIN", "Coinbase", "NASDAQ:COIN", "US"],
  ["INTC", "Intel", "NASDAQ:INTC", "US"],
  ["BAC", "Bank of America", "NYSE:BAC", "US"],
  ["XIC.TO", "iShares Canada Composite", "TSX:XIC", "Canada"],
  ["VFV.TO", "Vanguard S&P 500 CAD", "TSX:VFV", "Canada"],
  ["XEQT.TO", "iShares All-Equity", "TSX:XEQT", "Canada"],
  ["XEI.TO", "iShares Canadian Dividend", "TSX:XEI", "Canada"],
  ["XBB.TO", "iShares Canadian Universe Bond", "TSX:XBB", "Canada"],
  ["RY.TO", "Royal Bank of Canada", "TSX:RY", "Canada"],
  ["TD.TO", "Toronto-Dominion Bank", "TSX:TD", "Canada"],
  ["CM.TO", "CIBC", "TSX:CM", "Canada"],
  ["BMO.TO", "Bank of Montreal", "TSX:BMO", "Canada"],
  ["BNS.TO", "Bank of Nova Scotia", "TSX:BNS", "Canada"],
  ["ENB.TO", "Enbridge", "TSX:ENB", "Canada"],
  ["SHOP.TO", "Shopify", "TSX:SHOP", "Canada"],
  ["CNQ.TO", "Canadian Natural Resources", "TSX:CNQ", "Canada"],
  ["SU.TO", "Suncor Energy", "TSX:SU", "Canada"],
  ["VOO", "Vanguard S&P 500", "AMEX:VOO", "ETF"],
  ["VTI", "Vanguard Total Stock Market", "AMEX:VTI", "ETF"],
  ["VEA", "Developed Markets", "AMEX:VEA", "ETF"],
  ["VWO", "Emerging Markets", "AMEX:VWO", "ETF"],
  ["TLT", "20+ Year Treasury Bond", "NASDAQ:TLT", "ETF"],
  ["IEF", "7-10 Year Treasury Bond", "NASDAQ:IEF", "ETF"],
  ["HYG", "High Yield Corporate Bond", "AMEX:HYG", "ETF"],
  ["LQD", "Investment Grade Corporate Bond", "AMEX:LQD", "ETF"],
  ["GLD", "SPDR Gold Shares", "AMEX:GLD", "ETF"],
  ["SLV", "iShares Silver Trust", "AMEX:SLV", "ETF"],
  ["USO", "United States Oil Fund", "AMEX:USO", "ETF"],
  ["XLK", "Technology", "AMEX:XLK", "Sector"],
  ["XLF", "Financials", "AMEX:XLF", "Sector"],
  ["XLE", "Energy", "AMEX:XLE", "Sector"],
  ["XLV", "Health Care", "AMEX:XLV", "Sector"],
  ["XLI", "Industrials", "AMEX:XLI", "Sector"],
  ["XLY", "Consumer Discretionary", "AMEX:XLY", "Sector"],
  ["XLP", "Consumer Staples", "AMEX:XLP", "Sector"],
  ["XLU", "Utilities", "AMEX:XLU", "Sector"],
  ["XLB", "Materials", "AMEX:XLB", "Sector"],
  ["XLRE", "Real Estate", "AMEX:XLRE", "Sector"],
  ["XLC", "Communication Services", "AMEX:XLC", "Sector"],
  ["USD/CAD", "US Dollar / Canadian Dollar", "FX_IDC:USDCAD", "FX"],
  ["EUR/USD", "Euro / US Dollar", "FX_IDC:EURUSD", "FX"],
  ["USD/JPY", "US Dollar / Japanese Yen", "FX_IDC:USDJPY", "FX"],
  ["GBP/USD", "British Pound / US Dollar", "FX_IDC:GBPUSD", "FX"],
  ["AUD/USD", "Australian Dollar / US Dollar", "FX_IDC:AUDUSD", "FX"],
  ["USD/HKD", "US Dollar / Hong Kong Dollar", "FX_IDC:USDHKD", "FX"],
  ["BTC/USD", "Bitcoin / US Dollar", "COINBASE:BTCUSD", "Crypto"],
  ["ETH/USD", "Ethereum / US Dollar", "COINBASE:ETHUSD", "Crypto"],
  ["0700.HK", "Tencent Holdings", "HKEX:700", "HK"],
  ["9988.HK", "Alibaba Group", "HKEX:9988", "HK"],
  ["HSI", "Hang Seng Index", "HSI:HSI", "Index"],
  ["SPX", "S&P 500 cash CFD reference", "FOREXCOM:SPXUSD", "CFD"],
  ["WTI", "WTI Crude Oil reference", "TVC:USOIL", "CFD"],
  ["GOLD", "Gold reference", "TVC:GOLD", "CFD"]
].map(([ticker, name, symbol, group]) => {
  const providerExchange = symbol.split(":")[0];
  const canadianFunds = ["XIC.TO", "VFV.TO", "XEQT.TO", "XEI.TO", "XBB.TO"];
  const assetType = group === "ETF" || group === "Sector" || canadianFunds.includes(ticker) ? "ETF" : ["US", "Canada", "HK"].includes(group) ? "Equity" : group;
  const exchange = {
    AMEX: "AMEX",
    NASDAQ: "Nasdaq",
    NYSE: "NYSE",
    TSX: "TSX",
    HKEX: "Hong Kong",
    FX_IDC: "Indicative FX",
    COINBASE: "Coinbase",
    TVC: "Indicative reference",
    FOREXCOM: "FOREX.com CFD",
    HSI: "Hang Seng"
  }[providerExchange] || providerExchange;
  const currency = group === "Canada" ? "CAD" : group === "HK" || group === "Index" ? "HKD" : group === "FX" ? ticker.split("/")[1] : "USD";
  return {
    ticker,
    name,
    symbol,
    group,
    assetType,
    exchange,
    providerExchange,
    currency,
    supported: true
  };
});
var referenceItem = (reference, prior = {}, id = "sp500") => ({
  ...prior,
  ...reference,
  name: prior.name || reference.name,
  group: id === "tsx60" ? "Canada" : "US",
  assetType: "Equity",
  exchange: reference.providerExchange === "NASDAQ" ? "Nasdaq" : reference.providerExchange,
  currency: reference.currency || "USD",
  supported: true,
  [id]: true,
  aliases: reference.secTicker && reference.secTicker !== reference.ticker ? [reference.secTicker, `${reference.providerExchange}:${reference.secTicker}`] : []
});
var catalog = [];
var sp500Catalog = [];
var tsx60Catalog = [];
var nasdaq100Catalog = [];
var indexCatalogs = { sp500: sp500Catalog, tsx60: tsx60Catalog, nasdaq100: nasdaq100Catalog };
var coverageState = { schema: 1, indexes: {
  sp500: { metadata: sp500Metadata, securities: sp500Securities.map((r) => ({ ...r, currency: "USD" })) },
  ...additionalIndexes
} };
function applyCoverage(snapshot) {
  if (snapshot?.schema !== 1) throw new Error("Unknown directory schema");
  const next = {};
  for (const id of Object.keys(indexSpecs)) next[id] = validateIndex(id, snapshot.indexes?.[id]);
  const retained = [...curatedCatalog, ...catalog].map((item) => {
    const copy = { ...item };
    for (const id of Object.keys(indexSpecs)) delete copy[id];
    return copy;
  });
  const merged = new Map(retained.map((item) => [item.ticker, item]));
  for (const [id, directory2] of Object.entries(next))
    for (const ref of directory2.securities) merged.set(ref.ticker, referenceItem(ref, merged.get(ref.ticker), id));
  catalog.splice(0, catalog.length, ...merged.values());
  for (const id of Object.keys(indexSpecs)) indexCatalogs[id].splice(0, indexCatalogs[id].length, ...catalog.filter((r) => r[id]));
  coverageState.indexes = next;
  coverageState.checkedAt = snapshot.checkedAt;
  if ("sync" in snapshot) coverageState.sync = snapshot.sync;
  Object.assign(sp500Metadata, next.sp500.metadata);
  return coverageState;
}
applyCoverage(coverageState);
var esc = (s) => String(s ?? "").replace(
  /[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
);
var num = (n, d = 2) => Number.isFinite(n) ? n.toLocaleString("en-US", {
  minimumFractionDigits: d,
  maximumFractionDigits: d
}) : "\u2014";

// node_modules/fflate/esm/index.mjs
import { createRequire } from "module";
var require2 = createRequire("/");
var _a;
var Worker;
var isMarkedAsUntransferable;
try {
  _a = require2("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
} catch (e) {
}
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) {
    b[i2] = start += 1 << eb[i2 - 1];
  }
  var r = new i32(b[30]);
  for (var i2 = 1; i2 < 30; ++i2) {
    for (var j = b[i2]; j < b[i2 + 1]; ++j) {
      r[j] = j - b[i2] << 5 | i2;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (; i2 < s; ++i2) {
    if (cd[i2])
      ++l[cd[i2] - 1];
  }
  var le = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) {
    le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v = le[cd[i2] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i2 = 1; i2 < a.length; ++i2) {
    if (a[i2] > m)
      m = a[i2];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0; i2 < hcLen; ++i2) {
          clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0; i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i2++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i2++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var et = /* @__PURE__ */ new u8(0);
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i2 = 0; ; ) {
    var c = d[i2++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i2 + eb > d.length)
      return { s: r, r: slc(d, i2 - 1) };
    if (!eb)
      r += String.fromCharCode(c);
    else if (eb == 3) {
      c = ((c & 15) << 18 | (d[i2++] & 63) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c & 31) << 6 | d[i2++] & 63);
    else
      r += String.fromCharCode((c & 15) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63);
  }
};
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i2 = 0; i2 < dat.length; i2 += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i2, i2 + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
  var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
};
var z64hs = function(d, b, l, z, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
  var nf = nsc + nsu + noff;
  if (z && nf) {
    for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
      if (b2(d, b) == 1) {
        return [
          nsc ? b8(d, b + 4 + 8 * nsu) : sc,
          nsu ? b8(d, b + 4) : su,
          noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  ;
  var c = b2(data, e + 8);
  if (!c)
    return {};
  var o = b4(data, e + 16);
  var z = b4(data, e - 20) == 117853008;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i2 = 0; i2 < c; ++i2) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

// worker/coverage-data.js
var clean = (text) => text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
function spyHoldings(bytes) {
  const paths = ["xl/sharedStrings.xml", "xl/worksheets/sheet1.xml"];
  const zip = unzipSync(bytes, { filter: (f) => paths.includes(f.name) && f.originalSize < 4e6 });
  if (paths.some((p) => !zip[p])) throw new Error("Holdings workbook changed");
  const strings = [...strFromU8(zip[paths[0]]).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => clean(t[1])).join(""));
  const rows2 = [...strFromU8(zip[paths[1]]).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((m) => {
    const cells = {};
    for (const c of m[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const col = c[1].match(/\br="([A-Z]+)\d+"/)?.[1], value = c[2].match(/<v\b[^>]*>([^<]*)<\/v>/)?.[1];
      if (col && value !== void 0) cells[col] = /\bt="s"/.test(c[1]) ? strings[Number(value)] : value;
    }
    return cells;
  });
  const header = rows2.find((r) => r.A === "Name" && r.B === "Ticker");
  const text = rows2.find((r) => r.A === "Holdings:")?.B;
  const date = text?.match(/^As of (\d{2})-([A-Za-z]{3})-(\d{4})$/);
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(date?.[2]) + 1;
  if (header?.H !== "Local Currency" || !date || !month) throw new Error("Holdings schema changed");
  return {
    asOf: `${date[3]}-${String(month).padStart(2, "0")}-${date[1]}`,
    rows: rows2.filter((r) => r.H === "USD" && /^[A-Z][A-Z0-9.\-]{0,10}$/.test(r.B || "")).map((r) => ({ ticker: r.B, name: r.A, currency: "USD" }))
  };
}
function tsxHoldings(html, data) {
  const section = html.split('id="allHoldingsTab"')[1]?.split('id="allHoldingsTable"')[0];
  const selected = section?.match(/<option\b[^>]*value="(\d{4})(\d{2})(\d{2})"[^>]*selected/);
  if (!selected || !Array.isArray(data.aaData)) throw new Error("XIU source schema changed");
  return { asOf: `${selected[1]}-${selected[2]}-${selected[3]}`, rows: data.aaData.filter((r) => r[7] === "Toronto Stock Exchange" && r[8] === "CAD" && /^[A-Z][A-Z0-9.]{0,12}$/.test(r[0])).map((r) => ({ ticker: r[0] + ".TO", name: r[1], symbol: "TSX:" + r[0], providerExchange: "TSX", currency: "CAD", isin: r[5], sector: r[2] })) };
}
function nasdaqHoldings(data) {
  if (!Array.isArray(data.holdings) || data.cusip !== "QQQ" || data.holdings.length !== data.totalNumberOfHoldings)
    throw new Error("QQQ source schema changed");
  return { asOf: data.effectiveDate, rows: data.holdings.filter((r) => ["COM", "ADR", "DRNY"].includes(r.securityTypeCode) && r.currency === "USD").map((r) => ({ ticker: r.ticker, name: r.issuerName, currency: r.currency, ...r.securityTypeCode !== "COM" ? { depositaryReceipt: true } : {} })) };
}
function buildIndex(id, holdings, directory2, now2 = /* @__PURE__ */ new Date()) {
  const spec = indexSpecs[id];
  currentSnapshotDate(holdings.asOf, now2);
  if (JSON.stringify(directory2.fields) !== JSON.stringify(["cik", "name", "ticker", "exchange"])) throw new Error("SEC listing schema changed");
  const securities = holdings.rows.map((r) => {
    if (id === "tsx60") return r;
    const secTicker = r.ticker?.replaceAll(".", "-");
    const matches = directory2.data.filter((d) => d[2] === secTicker && ["NYSE", "Nasdaq", "CBOE"].includes(d[3]));
    if (matches.length !== 1) throw new Error("No unique listing reference for " + r.ticker);
    const [cik, name, , exchange] = matches[0];
    return { ...r, name, secTicker, providerExchange: exchange.toUpperCase(), symbol: exchange.toUpperCase() + ":" + r.ticker, cik: String(cik).padStart(10, "0") };
  }).sort((a, b) => a.ticker.localeCompare(b.ticker));
  return validateIndex(id, { metadata: {
    asOf: holdings.asOf,
    checkedOn: now2.toISOString().slice(0, 10),
    count: securities.length,
    basis: `Security coverage from ${spec.tracker} holdings; a tracker snapshot, not a licensed live index-membership feed.`,
    holdingsSource: spec.holdingsSource,
    listingSource: id === "tsx60" ? spec.holdingsSource : listingSource
  }, securities });
}
async function source(url, fetcher2, binary = false) {
  const r = await fetcher2(url, { headers: { "User-Agent": "TickerLantern/1.0 (+https://tickerlantern.com)", Accept: "application/json,text/html,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }, signal: AbortSignal.timeout(2e4), cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!r.ok) throw new Error("Public source unavailable");
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.length > 6e6) throw new Error("Public source exceeds size limit");
  return binary ? bytes : new TextDecoder().decode(bytes).replace(/^\uFEFF/, "");
}
async function refreshIndexes(previous = {}, fetcher2 = fetch, now2 = /* @__PURE__ */ new Date()) {
  let directory2;
  try {
    directory2 = JSON.parse(await source(listingSource, fetcher2));
  } catch {
  }
  const indexes = { ...previous };
  for (const [id, spec] of Object.entries(indexSpecs)) {
    try {
      let holdings;
      if (id === "sp500") holdings = spyHoldings(await source(spec.holdingsSource, fetcher2, true));
      else if (id === "tsx60") {
        const html = await source(spec.holdingsSource, fetcher2);
        holdings = tsxHoldings(html, JSON.parse(await source(spec.dataSource, fetcher2)));
      } else holdings = nasdaqHoldings(JSON.parse(await source(spec.dataSource, fetcher2)));
      const fresh = buildIndex(id, holdings, directory2 || { fields: ["cik", "name", "ticker", "exchange"], data: [] }, now2);
      if (previous[id]?.metadata?.asOf > fresh.metadata.asOf) throw new Error("Source snapshot regressed");
      const oldIds = new Map((previous[id]?.securities || []).map((r) => [r.ticker, r]));
      for (const r of fresh.securities) {
        const old = oldIds.get(r.ticker);
        if (old && (old.cik && old.cik !== r.cik || old.isin && old.isin !== r.isin))
          throw new Error("Existing ticker changed issuer or share identity; review before automatic replacement");
      }
      indexes[id] = { ...fresh, lastAttempt: now2.toISOString(), lastSuccess: now2.toISOString(), status: "ready" };
    } catch {
      indexes[id] = {
        ...previous[id],
        lastAttempt: now2.toISOString(),
        status: "refresh_failed",
        message: "Refresh failed validation. Keeping the last verified directory and its original dates."
      };
    }
  }
  return { schema: 1, checkedAt: now2.toISOString(), indexes };
}

// src/macro-data.js
function parseTreasuryXML(text) {
  if (!text.includes("DailyTreasuryYieldCurveRateData")) throw new Error("The Treasury source returned an unexpected format.");
  const rows2 = [];
  for (const match of text.matchAll(/<entry>[\s\S]*?<\/entry>/g)) {
    const body = match[0];
    const field = (name) => body.match(new RegExp(`<d:${name}[^>]*>([^<]+)</d:${name}>`))?.[1];
    const date = field("NEW_DATE")?.slice(0, 10);
    const two = Number(field("BC_2YEAR")), ten = Number(field("BC_10YEAR"));
    if (validDate(date) && Number.isFinite(two) && Number.isFinite(ten) && Math.abs(two) < 100 && Math.abs(ten) < 100) rows2.push({ date, two, ten, spread: Math.round((ten - two) * 1e6) / 1e4 });
  }
  if (!rows2.length) throw new Error("The Treasury source has no complete observations.");
  return rows2.sort((a, b) => a.date.localeCompare(b.date)).slice(-520);
}

// src/issuer-dividends.js
function parseRBCDividend(article, id, now2 = /* @__PURE__ */ new Date()) {
  const d = article?.data;
  if (String(d?.id) !== String(id) || !/Royal Bank of Canada/i.test(d.headline || ""))
    throw new Error("Issuer article mismatch");
  const text = String(d.body || "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ");
  if (!/\(TSX:\s*RY\)/i.test(text) || !/\(NYSE:\s*RY\)/i.test(text))
    throw new Error("Share class not verified");
  const match = text.match(
    /declared\s+a\s+quarterly\s+common\s+share\s+dividend\s+of\s+\$(\d+(?:\.\d+)?)\s+per\s+share/i
  );
  const quarterly = Number(match?.[1]), timestamp = Date.parse(d.releaseDate);
  const date = Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : "";
  if (!Number.isFinite(quarterly) || quarterly <= 0 || quarterly > 25 || !validDate(date) || timestamp > +now2 || (+now2 - timestamp) / 864e5 > 180)
    throw new Error("No recent regular common dividend");
  return {
    status: "ready",
    value: quarterly * 4,
    currency: "CAD",
    basis: "current",
    kind: "annualized-quarterly",
    quarterly,
    periodStart: date,
    asOf: date,
    filed: date,
    description: "Latest issuer-declared regular quarterly common dividend \xD7 4, CAD. Annualization is a starting assumption, not a forecast of four future declarations.",
    source: {
      name: "RBC Investor Relations \xB7 public dividend release",
      url: "https://www.rbc.com/newsroom/news/article.html?article=" + id,
      tag: "Regular quarterly common share dividend"
    },
    historicalGrowth: null,
    warnings: [
      "Future dividend declarations remain subject to board approval."
    ]
  };
}

// worker/issuer-dividends.js
async function issuerDividend(item, fetcher2 = fetch, now2 = /* @__PURE__ */ new Date()) {
  if (item.symbol !== "TSX:RY") return null;
  try {
    const r = await fetcher2(
      "https://www.rbc.com/investor-relations/share-information.html",
      {
        signal: AbortSignal.timeout(15e3),
        cf: { cacheTtl: 3600, cacheEverything: true }
      }
    );
    if (!r.ok) throw new Error();
    const html = await r.text();
    if (html.length > 15e5) throw new Error();
    const ids = [
      ...new Set(
        [
          ...html.replace(/<!--[\s\S]*?-->/g, "").matchAll(
            /href=["'][^"']*newsroom\/news\/article\.html\?article=(\d+)["'][^>]*>\s*Read the latest RBC Dividend Press Release/gi
          )
        ].map((m) => m[1])
      )
    ].sort((a, b) => Number(b) - Number(a)).slice(0, 3);
    const dividends = [];
    for (const id of ids) {
      const article = await fetcher2(
        "https://www.rbc.com/cgi-bin/newsroom-proxy/multi-proxy.cgi/api/search/article",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            format: "json",
            lang: "EN",
            id
          }).toString(),
          signal: AbortSignal.timeout(15e3)
        }
      );
      if (!article.ok) continue;
      const body = await article.text();
      if (body.length > 1e6) continue;
      try {
        dividends.push(parseRBCDividend(JSON.parse(body), id, now2));
      } catch {
      }
    }
    return dividends.sort((a, b) => b.asOf.localeCompare(a.asOf))[0] || null;
  } catch {
    return null;
  }
}

// src/ddm-data.js
var DAY = 864e5;
var duration = (row) => (Date.parse(row.end) - Date.parse(row.start)) / DAY + 1;
var accession = (value) => /^\d{10}-\d{2}-\d{6}$/.test(value || "");
function parseSECDividends(payload, cik, now2 = /* @__PURE__ */ new Date(), options = {}) {
  if (Number(payload?.cik) !== Number(cik))
    throw new Error("The filing entity does not match this listing.");
  const today = now2.toISOString().slice(0, 10);
  const currency = options.currency || "USD";
  const candidates = [];
  for (const [namespace2, tag2] of [
    ["us-gaap", "CommonStockDividendsPerShareDeclared"],
    ["us-gaap", "CommonStockDividendsPerShareCashPaid"],
    ["ifrs-full", "DividendsPaidOrdinarySharesPerShare"],
    ["ifrs-full", "DividendsRecognisedAsDistributionsToOwnersPerShare"]
  ]) {
    const rows2 = payload.facts?.[namespace2]?.[tag2]?.units?.[currency + "/shares"];
    if (!Array.isArray(rows2)) continue;
    const annual2 = rows2.filter(
      (row) => validDate(row.start) && validDate(row.end) && validDate(row.filed) && row.end <= today && row.filed <= today && [
        "10-K",
        "10-K/A",
        "40-F",
        "40-F/A",
        "20-F",
        "20-F/A",
        "6-K",
        "6-K/A"
      ].includes(row.form) && duration(row) >= 330 && duration(row) <= 385 && typeof row.val === "number" && Number.isFinite(row.val) && row.val >= 0 && accession(row.accn)
    );
    annual2.sort(
      (a, b) => b.end.localeCompare(a.end) || b.filed.localeCompare(a.filed)
    );
    if (annual2.length)
      candidates.push({ tag: tag2, namespace: namespace2, latest: annual2[0], annual: annual2 });
  }
  candidates.sort((a, b) => b.latest.end.localeCompare(a.latest.end));
  if (!candidates.length)
    return {
      status: "unavailable",
      reason: "No supported annual matching-currency ordinary/common-dividend-per-share disclosure was found. Missing data does not establish that the company pays no dividend."
    };
  const { tag, namespace, latest, annual } = candidates[0];
  if ((+now2 - Date.parse(latest.end)) / DAY > 550)
    return {
      status: "stale",
      reason: "The latest supported annual dividend disclosure is more than 550 days old. Automatic valuation is withheld.",
      asOf: latest.end
    };
  const url = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${latest.accn.replaceAll("-", "")}/${latest.accn}-index.html`;
  const sameFiling = [
    ...new Map(
      annual.filter((row) => row.accn === latest.accn).map((row) => [row.end, row])
    ).values()
  ].sort((a, b) => a.end.localeCompare(b.end));
  const first = sameFiling[0];
  const years = first ? Math.round(
    (Date.parse(latest.end) - Date.parse(first.end)) / DAY / 365.25
  ) : 0;
  const historicalGrowth = years >= 1.5 && first.val > 0 && latest.val > 0 ? (latest.val / first.val) ** (1 / years) - 1 : null;
  return {
    status: "ready",
    value: latest.val,
    currency,
    basis: "current",
    periodStart: latest.start,
    asOf: latest.end,
    filed: latest.filed,
    description: `Latest full fiscal-year dividends ${tag.endsWith("Declared") ? "declared" : "paid"} per share; not a current annualized dividend rate.`,
    source: {
      name: "SEC EDGAR \xB7 company filing",
      url,
      accession: latest.accn,
      tag,
      namespace
    },
    historicalGrowth: Number.isFinite(historicalGrowth) ? {
      value: historicalGrowth,
      start: first.end,
      end: latest.end,
      years,
      description: "Annual dividend CAGR from comparative years in the same filing; historical, not a forecast."
    } : null,
    warnings: [
      "Reported totals can include special dividends. Check the issuer\u2019s regular payout policy and share basis before relying on a perpetual forecast."
    ]
  };
}
function findSECListing(payload, item) {
  if (!Array.isArray(payload?.fields) || !Array.isArray(payload?.data))
    throw new Error("The SEC listing directory is unavailable.");
  const positions = Object.fromEntries(
    payload.fields.map((key, index) => [key, index])
  );
  if (!["cik", "ticker", "exchange"].every(
    (key) => Number.isInteger(positions[key])
  ))
    throw new Error("The SEC listing directory has changed.");
  const ticker = item.ticker.replaceAll(".", "-");
  const match = payload.data.find(
    (row) => row[positions.ticker] === ticker && String(row[positions.exchange]).toUpperCase() === item.providerExchange.toUpperCase()
  );
  const cik = match?.[positions.cik];
  if (!Number.isInteger(cik) || cik <= 0 || cik > 9999999999)
    throw new Error(
      "No matching SEC entity and exchange were found for this listing."
    );
  return String(cik).padStart(10, "0");
}

// src/fundamentals.js
var DAY2 = 864e5;
var forms = /* @__PURE__ */ new Set([
  "10-K",
  "10-K/A",
  "40-F",
  "40-F/A",
  "20-F",
  "20-F/A",
  "6-K",
  "6-K/A"
]);
var tags = {
  revenue: [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet",
    "Revenue"
  ],
  ebit: ["OperatingIncomeLoss", "ProfitLossFromOperatingActivities"],
  eps: ["EarningsPerShareDiluted", "DilutedEarningsLossPerShare"],
  netIncome: [
    "NetIncomeLossAvailableToCommonStockholdersBasic",
    "ProfitLossAttributableToOrdinaryEquityHoldersOfParentEntity",
    "NetIncomeLoss"
  ],
  da: [
    "DepreciationDepletionAndAmortization",
    "DepreciationAndAmortization",
    "DepreciationDepletionAndAmortizationPropertyPlantAndEquipment",
    "DepreciationAndAmortisationExpense"
  ],
  depreciation: ["Depreciation"],
  amortization: ["AmortizationOfIntangibleAssets"],
  nonoperating: ["NonoperatingIncomeExpense"],
  capex: [
    "PaymentsToAcquirePropertyPlantAndEquipment",
    "PaymentsToAcquireProductiveAssets",
    "PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"
  ],
  tax: ["IncomeTaxExpenseBenefit", "IncomeTaxExpenseContinuingOperations"],
  pretax: [
    "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
    "ProfitLossBeforeTax"
  ],
  shares: [
    "WeightedAverageNumberOfDilutedSharesOutstanding",
    "AdjustedWeightedAverageShares"
  ],
  cash: ["CashAndCashEquivalentsAtCarryingValue", "CashAndCashEquivalents"],
  ppe: ["PropertyPlantAndEquipmentNet", "PropertyPlantAndEquipment", "PropertyPlantAndEquipmentAndFinanceLeaseRightOfUseAssetAfterAccumulatedDepreciationAndAmortization"],
  receivables: [
    "AccountsReceivableNetCurrent",
    "TradeAndOtherCurrentReceivables"
  ],
  inventory: ["InventoryNet", "Inventories"],
  payables: ["AccountsPayableCurrent", "AccountsPayableTradeCurrent", "TradeAndOtherCurrentPayables"],
  debt: [
    "LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities",
    "LongTermDebtCurrentAndNoncurrent",
    "Borrowings"
  ],
  currentLongDebt: ["LongTermDebtCurrent", "CurrentBorrowings"],
  commercialPaper: ["CommercialPaper"],
  shortDebt: ["DebtCurrent", "ShortTermBorrowings"],
  longDebt: ["LongTermDebtNoncurrent", "NoncurrentBorrowings"],
  equity: ["StockholdersEquity", "EquityAttributableToOwnersOfParent"],
  commonEquity: ["CommonStockholdersEquity"],
  preferredEquity: ["PreferredStockValue", "PreferredStockCarryingValue", "PreferredStockIncludingAdditionalPaidInCapitalNetOfDiscount"],
  commonShares: ["CommonStockSharesOutstanding"]
};
var instant = /* @__PURE__ */ new Set([
  "cash",
  "ppe",
  "receivables",
  "inventory",
  "payables",
  "debt",
  "shortDebt",
  "currentLongDebt",
  "commercialPaper",
  "longDebt",
  "equity",
  "commonEquity",
  "preferredEquity",
  "commonShares"
]);
function parseFinancials(payload, cik, currency, now2 = /* @__PURE__ */ new Date()) {
  if (Number(payload?.cik) !== Number(cik)) throw new Error("Issuer mismatch");
  const today = now2.toISOString().slice(0, 10), series = {};
  for (const [metric2, names] of Object.entries(tags)) {
    const unit = metric2 === "eps" ? currency + "/shares" : ["shares", "commonShares"].includes(metric2) ? "shares" : currency;
    const all = [];
    for (const name of names)
      for (const namespace of ["us-gaap", "ifrs-full"])
        for (const row of payload.facts?.[namespace]?.[name]?.units?.[unit] || []) {
          if (!validDate(row.end) || !validDate(row.filed) || row.end > today || row.filed > today || !forms.has(row.form) || !/^\d{10}-\d{2}-\d{6}$/.test(row.accn || "") || !Number.isFinite(row.val))
            continue;
          const days = (Date.parse(row.end) - Date.parse(row.start)) / DAY2 + 1;
          if (instant.has(metric2) ? !!row.start : !validDate(row.start) || days < 330 || days > 385)
            continue;
          all.push({ ...row, tag: name, namespace, unit });
        }
    all.sort(
      (a, b) => b.end.localeCompare(a.end) || b.filed.localeCompare(a.filed) || names.indexOf(a.tag) - names.indexOf(b.tag)
    );
    series[metric2] = [
      ...new Map(
        all.slice().reverse().map((r) => [r.end, r])
      ).values()
    ].sort((a, b) => b.end.localeCompare(a.end));
  }
  const ends = [
    ...new Set([...series.revenue, ...series.eps].map((r) => r.end))
  ].sort().reverse().slice(0, 3);
  const annual = ends.filter((end) => (+now2 - Date.parse(end)) / DAY2 <= 1400).map((end) => {
    const metrics = {};
    for (const [metric2, rows2] of Object.entries(series)) {
      const r = rows2.find((r2) => r2.end === end);
      if (!r) continue;
      metrics[metric2] = {
        value: r.val,
        asOf: r.end,
        filed: r.filed,
        unit: r.unit,
        basis: metric2 === "capex" && r.tag === "PaymentsToAcquireProductiveAssets" ? "Reported investment in productive assets, including PP&E, software and other intangibles" : metric2 === "equity" ? "Total stockholders/owners equity; common-only basis not confirmed" : metric2 === "shares" ? "Reported annual weighted-average share count; not current diluted shares" : "Reported filing fact",
        source: {
          name: "SEC EDGAR",
          tag: r.namespace + ":" + r.tag,
          url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${r.accn.replaceAll("-", "")}/${r.accn}-index.html`
        }
      };
    }
    const derive = (key, components, fn, basis) => {
      if (metrics[key] || !components.every((k) => metrics[k])) return;
      const facts = components.map((k) => metrics[k]);
      if (!facts.every((f) => f.source.url === facts[0].source.url)) return;
      const value = fn(...facts.map((f) => f.value));
      if (!Number.isFinite(value)) return;
      metrics[key] = { ...facts[0], value, basis, source: {
        ...facts[0].source,
        tag: facts.map((f) => f.source.tag).join("; "),
        name: "SEC EDGAR \xB7 derived subtotal"
      } };
    };
    derive("da", ["depreciation", "amortization"], (d, a) => d + a, "Derived D&A = depreciation + intangible amortization, same fiscal year and filing");
    derive("ebit", ["pretax", "nonoperating"], (p, n) => p - n, "Derived operating income = pretax income \u2212 net nonoperating income, same fiscal year and filing");
    derive("commonEquity", ["equity", "preferredEquity"], (e, p) => e - p, "Derived common equity = stockholders equity excluding NCI \u2212 preferred carrying value, same date and filing");
    return { end, metrics };
  });
  return {
    status: !annual.length ? "unavailable" : (+now2 - Date.parse(annual[0].end)) / DAY2 > 550 ? "stale" : "ready",
    currency,
    annual,
    asOf: annual[0]?.end || null,
    warnings: [
      "Financial statements may use a different reporting currency from the listing. Values with unmatched currency are withheld.",
      "Stockholders/owners equity is not automatically treated as common equity. Preferred and AT1 capital require a verified adjustment."
    ]
  };
}

// src/model-fit.js
var groups = {
  bank: [
    "RY.TO",
    "TD.TO",
    "CM.TO",
    "BMO.TO",
    "BNS.TO",
    "NA.TO",
    "JPM",
    "BAC",
    "C",
    "WFC",
    "USB",
    "PNC",
    "TFC",
    "CFG",
    "FITB",
    "HBAN",
    "KEY",
    "MTB",
    "RF",
    "CMA",
    "ZION",
    "STT",
    "BK",
    "NTRS"
  ],
  insurer: [
    "MFC.TO",
    "SLF.TO",
    "FFH.TO",
    "IFC.TO",
    "AFL",
    "AIG",
    "ALL",
    "CB",
    "HIG",
    "MET",
    "PRU",
    "AIZ",
    "ACGL",
    "PGR",
    "TRV",
    "WRB"
  ],
  regulated: ["ENB.TO", "FTS.TO", "EMA.TO", "H.TO", "TRP.TO", "PPL.TO", "BIP.UN.TO"],
  cyclical: ["CNQ.TO", "SU.TO", "XOM", "MU", "INTC", "CVE.TO", "IMO.TO", "TOU.TO", "ABX.TO", "AEM.TO", "K.TO", "TECK.B.TO", "FM.TO", "CCO.TO", "NTR.TO", "MG.TO"],
  uncertain: ["TSLA", "COIN", "PLTR", "SHOP.TO", "SHOP", "CRWV", "RKLB"],
  holding: ["BRK.B", "BN.TO", "POW.TO"]
};
function modelFit(item) {
  if (!item?.supported || item.assetType !== "Equity")
    return {
      primary: null,
      title: "Company models do not apply",
      reason: "A verified company share is required. ETFs require holdings/NAV and fund-specific analysis.",
      checks: [],
      confidence: "Not applicable"
    };
  const group = Object.entries(groups).find(
    ([, tickers]) => tickers.includes(item.ticker)
  )?.[0] || "operating";
  const policies = {
    bank: {
      primary: "ri",
      title: "Residual income",
      reason: "For a bank, deposits and financing are part of operations. Start with common book value, sustainable ROE, cost of equity and regulatory capital; generic enterprise FCFF/WACC can be misleading.",
      checks: ["rv", "ddm"],
      metric: "pb",
      discount: 10,
      growth: 4,
      caution: "Common book value must exclude preferred/AT1 capital and noncontrolling interests. Review clean-surplus adjustments and distributable capital."
    },
    insurer: {
      primary: "ri",
      title: "Residual income / common equity",
      metric: "pb",
      discount: 10,
      growth: 4,
      reason: "For an insurer, policy liabilities, investment assets and regulatory capital are central to value. Start with common book value and sustainable returns on equity; cross-check normalized earnings and distributions.",
      checks: ["rv", "ddm"],
      caution: "Review reserves, catastrophe cycles, investment marks, preferred capital and clean-surplus adjustments. Latest earnings may not represent normalized underwriting results."
    },
    regulated: {
      primary: "dcf",
      title: "Cash-flow DCF",
      reason: "Capital spending and financing affect a pipeline\u2019s distributable cash. Value the operating cash flows and cross-check the dividend and comparable enterprise multiples.",
      checks: ["ddm", "rv"],
      metric: "evEbitda",
      discount: 9,
      growth: 3,
      caution: "Review maintenance versus growth capex, leverage and the sustainability of cash distributions."
    },
    cyclical: {
      primary: "dcf",
      title: "Cycle-normalized scenario DCF",
      reason: "Commodity or semiconductor cycle peaks can distort a single year\u2019s earnings. Use normalized cash flows across a cycle and compare enterprise multiples.",
      checks: ["rv", "eqrv"],
      metric: "evEbitda",
      discount: 11,
      growth: 3,
      caution: "A latest-year extrapolation is only a starting scenario, not a normalized mid-cycle forecast."
    },
    uncertain: {
      primary: "dcf",
      title: "Scenario DCF",
      reason: "Future scale, margins and reinvestment drive the outcome. Compare downside, base and upside cash-flow paths; use revenue or earnings multiples only where economically meaningful.",
      checks: ["rv", "eqrv"],
      metric: "evRevenue",
      discount: 12,
      growth: 5,
      caution: "Forecast uncertainty is high. A precise model output does not establish a precise fair value."
    },
    holding: {
      primary: "ri",
      title: "Component valuation / residual-income cross-check",
      reason: "A diversified holding company needs a sum-of-parts review. Residual income is a cross-check for its financial businesses, not a complete valuation of every subsidiary.",
      checks: ["rv", "dcf"],
      metric: "pb",
      discount: 10,
      growth: 3,
      caution: "No fully automated sum-of-parts model is available. Review subsidiaries, investments, insurance float and holding-company adjustments separately."
    },
    operating: {
      primary: "dcf",
      title: "Operating cash-flow DCF",
      reason: "Value forecast operating cash flows and reinvestment, then cross-check with comparable P/E or EV/EBITDA. A dividend-only model can miss cash returned through buybacks or retained for growth.",
      checks: ["rv", "eqrv"],
      metric: "pe",
      discount: 10,
      growth: 5,
      caution: "Review business mix, cash-flow quality, dilution, margins and reinvestment before relying on forecasts."
    }
  };
  return {
    group,
    confidence: group === "holding" ? "Manual review required" : "Starting framework",
    ...policies[group],
    statement: "No model is always most accurate. This is an explainable starting point, not a verified survey of current Wall Street analyst usage."
  };
}

// src/issuer-map.js
var canadian = {
  "RY.TO": [1000275, "RY", "NYSE"],
  // ROYAL BANK OF CANADA
  "TD.TO": [947263, "TD", "NYSE"],
  // TORONTO DOMINION BANK
  "CM.TO": [1045520, "CM", "NYSE"],
  // CANADIAN IMPERIAL BANK OF COMMERCE /CAN/
  "BMO.TO": [927971, "BMO", "NYSE"],
  // BANK OF MONTREAL /CAN/
  "BNS.TO": [9631, "BNS", "NYSE"],
  // BANK OF NOVA SCOTIA
  "ENB.TO": [895728, "ENB", "NYSE"],
  // ENBRIDGE INC
  "SHOP.TO": [1594805, "SHOP", "NASDAQ"],
  // SHOPIFY INC.
  "CNQ.TO": [1017413, "CNQ", "NYSE"],
  // CANADIAN NATURAL RESOURCES Ltd
  "SU.TO": [311337, "SU", "NYSE"],
  // SUNCOR ENERGY INC
  "AEM.TO": [2809, "AEM", "NYSE"],
  // AGNICO EAGLE MINES LTD
  "BN.TO": [1001085, "BN", "NYSE"],
  // BROOKFIELD Corp /ON/
  "CP.TO": [16875, "CP", "NYSE"],
  // CANADIAN PACIFIC KANSAS CITY LTD/CN
  "MFC.TO": [1086888, "MFC", "NYSE"],
  // MANULIFE FINANCIAL CORP
  "ABX.TO": [756894, "B", "NYSE"],
  // BARRICK MINING CORP
  "CNR.TO": [16868, "CNI", "NYSE"],
  // CANADIAN NATIONAL RAILWAY CO
  "TRP.TO": [1232384, "TRP", "NYSE"],
  // TC ENERGY CORP
  "WPM.TO": [1323404, "WPM", "NYSE"],
  // Wheaton Precious Metals Corp.
  "FNV.TO": [1456346, "FNV", "NYSE"],
  // FRANCO NEVADA Corp
  "SLF.TO": [1097362, "SLF", "NYSE"],
  // SUN LIFE FINANCIAL INC
  "CVE.TO": [1475260, "CVE", "NYSE"],
  // CENOVUS ENERGY INC.
  "WCN.TO": [1318220, "WCN", "NYSE"],
  // Waste Connections, Inc.
  "CLS.TO": [1030894, "CLS", "NYSE"],
  // CELESTICA INC
  "CCO.TO": [1009001, "CCJ", "NYSE"],
  // CAMECO CORP
  "NTR.TO": [1725964, "NTR", "NYSE"],
  // Nutrien Ltd.
  "TECK.B.TO": [886986, "TECK", "NYSE"],
  // TECK RESOURCES LTD
  "K.TO": [701818, "KGC", "NYSE"],
  // KINROSS GOLD CORP
  "PPL.TO": [1546066, "PBA", "NYSE"],
  // PEMBINA PIPELINE CORP
  "FTS.TO": [1666175, "FTS", "NYSE"],
  // Fortis Inc.
  "QSR.TO": [1618756, "QSR", "NYSE"],
  // Restaurant Brands International Inc.
  "IMO.TO": [49938, "IMO", "NYSE"],
  // IMPERIAL OIL LTD
  "BCE.TO": [718940, "BCE", "NYSE"],
  // BCE INC
  "BAM.TO": [1937926, "BAM", "NYSE"],
  // Brookfield Asset Management Ltd.
  "BIP.UN.TO": [1406234, "BIP", "NYSE"],
  // Brookfield Infrastructure Partners L.P.
  "MG.TO": [749098, "MGA", "NYSE"],
  // MAGNA INTERNATIONAL INC
  "GIB.A.TO": [1061574, "GIB", "NYSE"],
  // CGI INC
  "TRI.TO": [1075124, "TRI", "NASDAQ"],
  // THOMSON REUTERS CORP /CAN/
  "T.TO": [868675, "TU", "NYSE"],
  // TELUS CORP
  "RCI.B.TO": [733099, "RCI", "NYSE"],
  // ROGERS COMMUNICATIONS INC
  "GIL.TO": [1061894, "GIL", "NYSE"],
  // Gildan Activewear Inc.
  "CAE.TO": [1173382, "CAE", "NASDAQ"],
  // CAE INC
  "OTEX.TO": [1002638, "OTEX", "NASDAQ"],
  // OPEN TEXT CORP
  "FSV.TO": [1637810, "FSV", "NASDAQ"]
  // FirstService Corp
};
function secReference(item) {
  if (canadian[item.ticker]) {
    const [cik, ticker, providerExchange] = canadian[item.ticker];
    return {
      cik: String(cik).padStart(10, "0"),
      lookup: { ...item, ticker, providerExchange },
      currency: "CAD",
      crossListed: true
    };
  }
  if (item.currency === "USD" && ["NASDAQ", "NYSE", "CBOE"].includes(item.providerExchange) && !item.depositaryReceipt && !/\bADR\b/.test(item.name))
    return { lookup: item, cik: item.cik, currency: "USD", crossListed: false };
  return null;
}

// worker/sec-source.js
async function sourceJSON(url, fetcher2 = fetch, ttl = 3600, token) {
  const response = await fetcher2(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TickerLantern/1.0 (+https://tickerlantern.com)",
      ...token ? { Authorization: "Bearer " + token } : {}
    },
    signal: AbortSignal.timeout(18e3),
    cf: { cacheTtl: ttl, cacheEverything: true }
  });
  if (!response.ok) throw new Error("Source unavailable");
  const body = await response.text();
  if (body.length > 12e6) throw new Error("Source too large");
  return JSON.parse(body);
}
async function loadIssuerFacts(item, fetcher2 = fetch) {
  const reference = secReference(item);
  if (!reference) throw new Error("No verified issuer reference");
  const directory2 = await sourceJSON(
    "https://www.sec.gov/files/company_tickers_exchange.json",
    fetcher2,
    86400
  );
  const cik = findSECListing(directory2, reference.lookup);
  if (reference.cik && reference.cik !== cik)
    throw new Error("Issuer reference changed");
  const facts = await sourceJSON(
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
    fetcher2
  );
  if (Number(facts?.cik) !== Number(cik)) throw new Error("Issuer mismatch");
  return { cik, facts, reference };
}

// worker/market-provider.js
async function licensedSnapshot(item, env, fetcher2 = fetch, now2 = /* @__PURE__ */ new Date()) {
  if (!env?.VALUATION_DATA_URL || !env?.VALUATION_DATA_TOKEN || env?.VALUATION_PUBLIC_DISPLAY !== "enabled")
    return {
      status: "not_configured",
      reason: "A data feed with public website display rights has not been connected."
    };
  try {
    const url = new URL(env.VALUATION_DATA_URL);
    if (url.protocol !== "https:") throw new Error();
    url.searchParams.set("symbol", item.symbol);
    const r = await fetcher2(url.href, {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + env.VALUATION_DATA_TOKEN
      },
      signal: AbortSignal.timeout(15e3)
    });
    if (!r.ok) throw new Error();
    const raw = await r.text();
    if (raw.length > 15e5) throw new Error();
    const d = JSON.parse(raw);
    if (d.schema !== 1 || d.instrument?.symbol !== item.symbol || d.instrument.currency !== item.currency)
      throw new Error();
    const today = now2.toISOString().slice(0, 10), fields = {};
    for (const name of [
      "price",
      "marketCap",
      "commonBookValuePerShare",
      "dividend"
    ]) {
      const f = d[name];
      if (!f) continue;
      if (!Number.isFinite(f.value) || f.value < 0 || ["price", "marketCap"].includes(name) && f.value === 0 || !validDate(f.asOf) || f.asOf > today || f.currency !== item.currency || !f.basis?.trim() || !f.source?.name?.trim() || !/^https:\/\//.test(f.source.url || ""))
        continue;
      const age = (+now2 - Date.parse(f.asOf)) / 864e5;
      if (age > (name === "price" || name === "marketCap" ? 10 : 550)) continue;
      if (name === "commonBookValuePerShare" && f.commonOnly !== true) continue;
      fields[name] = { ...f, status: "ready" };
      if (name === "dividend")
        Object.assign(fields[name], {
          kind: "licensed",
          basis: "current",
          description: f.basis,
          filed: f.asOf,
          periodStart: validDate(f.periodStart) ? f.periodStart : f.asOf
        });
    }
    const estimates = Array.isArray(d.estimates) ? d.estimates.filter(
      (e) => validDate(e.fiscalEnd) && validDate(e.asOf) && e.asOf <= today && (+now2 - Date.parse(e.asOf)) / 864e5 <= 45 && e.currency === item.currency && e.basis?.trim() && e.frequency === "annual" && e.source?.name?.trim() && /^https:\/\//.test(e.source.url || "") && Number.isInteger(e.contributors) && e.contributors > 0 && ["eps", "revenue", "ebitda"].some((k) => Number.isFinite(e[k]))
    ) : [];
    let targets = null;
    const t = d.targets;
    if (t && validDate(t.asOf) && t.asOf <= today && (+now2 - Date.parse(t.asOf)) / 864e5 <= 45 && t.currency === item.currency && t.horizon?.trim() && Number.isInteger(t.contributors) && t.contributors > 0 && [t.mean, t.low, t.high].every(Number.isFinite) && t.low > 0 && t.low <= t.mean && t.mean <= t.high && t.source?.name && /^https:\/\//.test(t.source.url || ""))
      targets = t;
    return {
      status: "ready",
      ...fields,
      estimates: estimates.sort(
        (a, b) => a.fiscalEnd.localeCompare(b.fiscalEnd)
      ),
      relative: validateRelative(d.relative, item, now2),
      targets,
      provider: d.provider || "Connected licensed feed",
      checkedAt: now2.toISOString()
    };
  } catch {
    return {
      status: "unavailable",
      reason: "The connected feed is unavailable or its listing, currency or metadata could not be validated."
    };
  }
}
function validateRelative(r, item, now2) {
  if (!r || !["pe", "pb", "evEbitda", "evRevenue"].includes(r.metric) || r.currency !== item.currency || !validDate(r.asOf) || r.asOf > now2.toISOString().slice(0, 10) || (+now2 - Date.parse(r.asOf)) / 864e5 > 10 || !validDate(r.fiscalEnd) || !r.basis?.trim() || !r.source?.name?.trim() || !/^https:\/\//.test(r.source.url || "") || !Number.isFinite(r.fundamental) || r.fundamental <= 0)
    return null;
  if (["evEbitda", "evRevenue"].includes(r.metric) && (!r.bridge || !["cash", "debt", "otherAssets", "claims", "shares"].every(
    (k) => Number.isFinite(r.bridge[k]) && r.bridge[k] >= 0
  ) || r.bridge.shares <= 0))
    return null;
  const peers = Array.isArray(r.peers) ? r.peers.filter(
    (p) => p.name?.trim() && Number.isFinite(p.multiple) && p.multiple > 0
  ) : [];
  if (peers.length > 4 || new Set(peers.map((p) => p.name.trim().toLowerCase())).size !== peers.length)
    return null;
  const history = Array.isArray(r.history) ? r.history.filter(
    (h) => validDate(h.date) && h.date <= r.asOf && Number.isFinite(h.multiple) && h.multiple > 0
  ) : [];
  if (history.length > 120 || new Set(history.map((h) => h.date)).size !== history.length || !peers.length && !history.length)
    return null;
  return {
    ...r,
    peers,
    history: history.sort((a, b) => a.date.localeCompare(b.date))
  };
}

// worker/valuation-data.js
async function riskFree(item, fetcher2, now2) {
  try {
    const today = now2.toISOString().slice(0, 10);
    let observations, url;
    if (item.currency === "CAD") {
      url = "https://www.bankofcanada.ca/valet/observations/BD.CDN.10YR.DQ.YLD/json?recent=15";
      const d = await sourceJSON(url, fetcher2);
      observations = d.observations?.map((r) => ({
        asOf: r.d,
        value: Number(r["BD.CDN.10YR.DQ.YLD"]?.v)
      }));
    } else if (item.currency === "USD") {
      url = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=" + now2.getUTCFullYear();
      try {
        const r = await fetcher2(url, {
          signal: AbortSignal.timeout(15e3),
          cf: { cacheTtl: 3600, cacheEverything: true }
        });
        if (!r.ok) throw new Error();
        const raw = await r.text();
        if (raw.length > 25e5) throw new Error();
        observations = parseTreasuryXML(raw).map((r2) => ({
          asOf: r2.date,
          value: r2.ten
        }));
        if (!observations.length) throw new Error();
      } catch {
        const start = new Date(+now2 - 25 * 864e5).toISOString().slice(0, 10);
        url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10&cosd=" + start;
        const r = await fetcher2(url, {
          signal: AbortSignal.timeout(15e3),
          cf: { cacheTtl: 3600, cacheEverything: true }
        });
        if (!r.ok) throw new Error();
        observations = (await r.text()).trim().split(/\r?\n/).slice(1).map((line) => {
          const [asOf, v] = line.split(",");
          return { asOf, value: v?.trim() && v !== "." ? Number(v) : NaN };
        });
      }
    }
    const row = observations?.filter(
      (r) => /^\d{4}-\d{2}-\d{2}$/.test(r.asOf) && r.asOf <= today && Number.isFinite(r.value) && r.value > -5 && r.value < 30 && (+now2 - Date.parse(r.asOf)) / 864e5 <= 10
    ).sort((a, b) => a.asOf.localeCompare(b.asOf)).at(-1);
    if (!row) throw new Error();
    return {
      status: "ready",
      ...row,
      currency: item.currency,
      source: {
        name: item.currency === "CAD" ? "Bank of Canada" : url.includes("treasury.gov") ? "US Treasury" : "Federal Reserve / FRED",
        url
      }
    };
  } catch {
    return {
      status: "unavailable",
      reason: "A recent government ten-year yield was not available."
    };
  }
}
async function fetchValuationData(item, env = {}, fetcher2 = fetch, now2 = /* @__PURE__ */ new Date()) {
  const data = {
    schema: 1,
    instrument: {
      symbol: item.symbol,
      ticker: item.ticker,
      currency: item.currency
    },
    checkedAt: now2.toISOString(),
    fit: modelFit(item),
    financials: { status: "unavailable", annual: [] },
    dividend: { status: "unavailable" },
    price: { status: "not_configured" },
    coverage: {
      prices: "No native quote feed",
      analystTargets: "No verified analyst survey source connected",
      estimates: "Licensed consensus required",
      peers: "Matching peer data required"
    }
  };
  const [filing, rf, feed] = await Promise.allSettled([
    loadIssuerFacts(item, fetcher2),
    riskFree(item, fetcher2, now2),
    licensedSnapshot(item, env, fetcher2, now2)
  ]);
  if (filing.status === "fulfilled") {
    const { facts, cik } = filing.value;
    data.financials = parseFinancials(facts, cik, item.currency, now2);
    data.dividend = parseSECDividends(facts, cik, now2, {
      currency: item.currency
    });
    const latest = data.financials.status === "ready" && data.financials.annual[0];
    const common = latest?.metrics?.commonEquity, shares = latest?.metrics?.commonShares;
    if (common && shares?.value > 0 && common.value > 0 && common.source.url === shares.source.url)
      data.commonBookValuePerShare = {
        status: "ready",
        value: common.value / shares.value,
        currency: item.currency,
        asOf: latest.end,
        source: { name: "SEC EDGAR \xB7 common equity / period-end common shares", url: common.source.url },
        basis: "Reported or reconciled common equity divided by period-end common shares; review share-class economic rights"
      };
  } else data.financials.reason = secReference(item) ? "The public filing source was unavailable or lacked validated matching-currency facts. No values from another currency or issuer are substituted." : "This listing has no verified structured public filing mapping. ADR conversions and Canadian-only sources still require coverage.";
  if (data.dividend.status !== "ready")
    data.dividend = await issuerDividend(item, fetcher2, now2) || data.dividend;
  if (rf.status === "fulfilled") data.riskFree = rf.value;
  const market = feed.status === "fulfilled" ? feed.value : { status: "unavailable" };
  data.feed = market;
  for (const key of [
    "price",
    "marketCap",
    "commonBookValuePerShare",
    "dividend"
  ])
    if (market[key]?.status === "ready") data[key] = market[key];
  return data;
}

// src/valuation-autofill.js
function automaticInputs(view, snapshot, item, selectedMetric, selectedCapitalBasis) {
  const fit = modelFit(item), latest = snapshot.financials?.status === "ready" ? snapshot.financials.annual[0] : null, previous = snapshot.financials?.annual?.[1];
  const m = latest?.metrics || {}, prev = previous?.metrics || {};
  const value = (k) => m[k]?.value, patches = {}, origins = {}, gaps = [];
  const put = (key, v, origin) => {
    if (Number.isFinite(v) || typeof v === "string") {
      patches[key] = String(v);
      origins[key] = origin;
    }
  };
  const fact = (key, metric2, scale = 1) => {
    if (m[metric2])
      put(
        key,
        value(metric2) / scale,
        "Reported \xB7 " + latest.end + " \xB7 " + m[metric2].source.tag
      );
    else gaps.push(metric2);
  };
  const assumption = (key, v, why) => put(key, v, "Scenario assumption \xB7 " + why);
  const million = 1e6, dividend = snapshot.dividend?.status === "ready" ? snapshot.dividend.value : null;
  if (!latest && snapshot.financials?.reason) gaps.push(snapshot.financials.reason);
  const historicalGrowth = (key) => {
    const a = m[key]?.value, b = prev[key]?.value;
    return a > 0 && b > 0 ? a / b - 1 : null;
  };
  const historic = historicalGrowth("revenue");
  const growth = Number.isFinite(historic) && historic >= -0.1 && historic <= 0.15 ? historic : fit.growth / 100;
  let reportedDebt = value("debt");
  if (!Number.isFinite(reportedDebt) && Number.isFinite(value("shortDebt")) && Number.isFinite(value("longDebt")))
    reportedDebt = value("shortDebt") + value("longDebt");
  if (!Number.isFinite(reportedDebt) && ["currentLongDebt", "longDebt", "commercialPaper"].every(
    (k) => Number.isFinite(value(k))
  ))
    reportedDebt = value("currentLongDebt") + value("longDebt") + value("commercialPaper");
  if (view === "dcf" || view === "x3sm") {
    const required = [
      "revenue",
      "ebit",
      "da",
      "capex"
    ];
    const complete = required.every((k) => Number.isFinite(value(k))) && value("revenue") > 0;
    const debt = reportedDebt;
    if (Number.isFinite(debt) && debt >= 0)
      put(
        "debt",
        debt / million,
        "Reported book debt proxy; review leases and market value"
      );
    else gaps.push("consistent debt balance");
    if (view === "dcf") {
      fact("shares", "shares", million);
      assumption(
        "cash",
        0,
        "excess cash not verified; reported total cash is not assumed excess"
      );
      assumption("otherAssets", 0, "other non-operating assets require review");
      assumption("claims", 0, "preferred/NCI/other claims require review");
      assumption(
        "wacc",
        fit.discount,
        "discount-rate scenario, not a market-derived WACC"
      );
      assumption("terminalGrowth", 3, "long-run nominal growth");
      assumption(
        "exitMultiple",
        8,
        "illustrative exit multiple; compare sourced peers"
      );
    }
    if (complete && fit.group !== "bank" && fit.group !== "insurer" && fit.group !== "holding") {
      const revenue = value("revenue"), margin = value("ebit") / revenue, daRate = value("da") / revenue, capexRate = value("capex") / revenue;
      const tradeComplete = ["receivables", "inventory", "payables"].every((k) => Number.isFinite(value(k)));
      const nwc = tradeComplete ? value("receivables") + value("inventory") - value("payables") : 0, nwcRate = nwc / revenue;
      if (!tradeComplete) gaps.push("Trade working-capital data is incomplete. Forecasts assume zero change in working capital; linked statements assume opening operating NWC of zero. Review before relying on this scenario.");
      let r = revenue, working = nwc;
      for (let i2 = 0; i2 < 5; i2++) {
        r *= 1 + growth;
        const nextWorking = r * nwcRate;
        const fcff = r * margin * 0.75 + r * daRate - r * capexRate - (nextWorking - working);
        working = nextWorking;
        put(
          "fcff" + i2,
          fcff / million,
          "Forecast scenario \xB7 reported EBIT/D&A/capex, " + (tradeComplete ? "trade working-capital ratios" : "ASSUMED zero working-capital change; source balances incomplete") + ", 25% operating cash-tax assumption"
        );
      }
      put(
        "terminalEbitda",
        (r * margin + r * daRate) / million,
        "Forecast EBITDA, not analyst consensus"
      );
      if (view === "x3sm") {
        fact("revenue", "revenue", million);
        fact("cash", "cash", million);
        fact("ppe", "ppe", million);
        put(
          "nwc",
          nwc / million,
          tradeComplete ? "Derived trade working capital = receivables + inventory \u2212 payables; excludes other operating balances" : "Scenario assumption \xB7 opening operating NWC is zero because the source balances are incomplete; not a reported balance"
        );
        put(
          "growth",
          growth * 100,
          Number.isFinite(historic) && historic === growth ? "Historical revenue growth used as a forecast assumption" : "Scenario growth assumption"
        );
        put(
          "margin",
          margin * 100,
          "Reported operating margin used as a forecast assumption"
        );
        put(
          "daRate",
          daRate * 100,
          "Reported D&A/revenue used as a forecast assumption"
        );
        put(
          "capexRate",
          capexRate * 100,
          "Reported capex/revenue used as a forecast assumption"
        );
        put("nwcRate", nwcRate * 100, tradeComplete ? "Trade working-capital/revenue scenario" : "Scenario assumption \xB7 zero working-capital investment; review missing source balances");
        assumption("taxRate", 25, "operating cash-tax scenario");
        assumption("costDebt", 5, "borrowing-cost scenario");
        assumption("payout", 30, "payout scenario");
        if (Number.isFinite(value("equity")) && Number.isFinite(debt) && Number.isFinite(value("cash")) && Number.isFinite(value("ppe")))
          put(
            "otherNetAssets",
            (value("equity") + debt - value("cash") - value("ppe") - nwc) / million,
            "Opening reconciliation to reported owners equity; other net assets held constant"
          );
      }
    } else
      gaps.push(
        "a consistent revenue/EBIT/D&A/capex set; financial firms require a different framework"
      );
  }
  if (view === "ri") {
    assumption("costEquity", fit.discount, "required return");
    assumption(
      "persistence",
      0,
      "no continuation after year five until reviewed"
    );
    const bv = snapshot.commonBookValuePerShare;
    if (bv?.status === "ready")
      put("book", bv.value, "Common book value per share \xB7 " + (bv.asOf || "date unavailable") + " \xB7 " + (bv.basis || "verified common-only basis"));
    else gaps.push("common book value excluding preferred/AT1 and NCI");
    if (Number.isFinite(value("eps")))
      for (let i2 = 0; i2 < 5; i2++)
        put(
          "eps" + i2,
          value("eps") * (1 + fit.growth / 100) ** (i2 + 1),
          "Forecast scenario \xB7 reported annual diluted EPS and " + fit.growth + "% growth assumption"
        );
    else gaps.push("diluted EPS in listing currency");
    if (dividend != null)
      for (let i2 = 0; i2 < 5; i2++)
        put(
          "dividend" + i2,
          dividend * 1.03 ** (i2 + 1),
          "Forecast scenario \xB7 sourced dividend and 3% growth assumption"
        );
    else gaps.push("sourced ordinary/common dividends");
  }
  if (view === "wacc") {
    const observedCapital = snapshot.marketCap?.status === "ready";
    const capitalBasis = selectedCapitalBasis || (observedCapital ? "market" : "scenario");
    patches.capitalBasis = capitalBasis;
    if (snapshot.riskFree?.status === "ready")
      put(
        "riskFree",
        snapshot.riskFree.value,
        "Government ten-year yield \xB7 " + snapshot.riskFree.asOf
      );
    assumption("beta", 1, "beta not measured");
    assumption("equityRiskPremium", 5, "equity risk-premium scenario");
    assumption("costDebt", 5, "borrowing-cost scenario");
    assumption("taxRate", 25, "marginal-tax scenario");
    if (capitalBasis === "scenario") {
      assumption("equity", 75, "75% equity / 25% debt financing mix; normalized units, not observed market capitalization");
      assumption("debt", 25, "25% debt financing mix; normalized units, not the company\u2019s reported debt");
      gaps.push("actual market capitalization and market debt; WACC uses an explicit financing-mix scenario");
    } else if (observedCapital)
      put(
        "equity",
        snapshot.marketCap.value / million,
        "Market equity, millions \xB7 " + snapshot.marketCap.asOf
      );
    else gaps.push("market capitalization");
    if (capitalBasis === "market" && Number.isFinite(reportedDebt) && reportedDebt >= 0)
      put(
        "debt",
        reportedDebt / million,
        "Reported book debt proxy, millions; verify market debt"
      );
    else if (capitalBasis === "market") gaps.push("debt");
  }
  if (view === "rv" || view === "eqrv") {
    const metric2 = selectedMetric || fit.metric || "pe";
    patches.metric = metric2;
    if (metric2 === "pe") fact("fundamental", "eps");
    else if (metric2 === "evEbitda" && Number.isFinite(value("ebit")) && Number.isFinite(value("da")))
      put(
        "fundamental",
        (value("ebit") + value("da")) / million,
        "Derived annual EBITDA \xB7 " + latest.end
      );
    else if (metric2 === "evRevenue") fact("fundamental", "revenue", million);
    else if (snapshot.commonBookValuePerShare?.status === "ready")
      put(
        "fundamental",
        snapshot.commonBookValuePerShare.value,
        "Verified common book value"
      );
    patches.period = "Reported fiscal year " + (latest?.end || "not available") + "; peer ratios must use the same period and accounting basis";
    const relative = snapshot.feed?.relative;
    if (relative && relative.metric === metric2) {
      put(
        "fundamental",
        relative.fundamental,
        "Connected matching-basis target \xB7 " + relative.asOf
      );
      patches.period = relative.basis + "; fiscal end " + relative.fiscalEnd;
      patches.asOf = relative.asOf;
      patches.source = relative.source.name + " \xB7 " + relative.source.url;
      for (const [i2, p] of relative.peers.entries()) {
        put("peerName" + i2, p.name, "Connected peer \xB7 " + relative.asOf);
        put("peerMultiple" + i2, p.multiple, "Matching " + relative.basis);
      }
      put(
        "history",
        relative.history.map((h) => h.multiple).join(", "),
        "Dated equally weighted observations \xB7 " + relative.basis
      );
      if (relative.bridge)
        for (const [k, v] of Object.entries(relative.bridge))
          put(k, v, "Connected enterprise-to-equity bridge \xB7 " + relative.asOf);
      if (!relative.peers.length) gaps.push("matching peer multiples");
      if (!relative.history.length)
        gaps.push("historical multiple observations");
    } else
      gaps.push("matching peer multiples and historical multiple observations");
  }
  if (view === "anr" && !snapshot.feed?.targets)
    gaps.push(
      "licensed, dated analyst targets, ratings and target-currency metadata"
    );
  if (view === "ee") {
    const estimates = snapshot.feed?.estimates || [];
    if (estimates.length) {
      patches.estimateKind = "consensus";
      patches.period = estimates[0].basis;
      patches.asOf = estimates[0].asOf;
      patches.source = estimates.map((e) => e.source.name + " \xB7 " + e.source.url).join("; ");
      for (const [i2, e] of estimates.slice(0, 3).entries()) {
        patches["fiscal" + i2] = e.fiscalEnd;
        for (const k of ["eps", "revenue", "ebitda"])
          if (Number.isFinite(e[k]))
            put(
              k + i2,
              e[k] / (k === "eps" ? 1 : 1e6),
              "Connected consensus \xB7 " + e.asOf
            );
        put("count" + i2, e.contributors, "Provider contributor count");
      }
    } else if (latest) {
      patches.estimateKind = "user";
      patches.period = "Automatic scenario from reported " + latest.end + " figures; " + (growth * 100).toFixed(2) + "% annual growth; constant operating margin and D&A/revenue. Not company guidance or analyst consensus.";
      patches.asOf = latest.end;
      const [year, month, day] = latest.end.split("-").map(Number);
      for (let i2 = 0; i2 < 3; i2++) {
        const y = year + i2 + 1, last = new Date(Date.UTC(y, month, 0)).getUTCDate();
        patches["fiscal" + i2] = `${y}-${String(month).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
        origins["fiscal" + i2] = "Assumed fiscal year-end from latest annual filing; confirm issuer calendar";
        for (const k of ["revenue", "eps"])
          if (Number.isFinite(value(k))) put(k + i2, value(k) * (1 + growth) ** (i2 + 1) / (k === "eps" ? 1 : million), "Forecast scenario \xB7 reported " + latest.end + " " + k + "; not consensus");
        if (Number.isFinite(value("ebit")) && Number.isFinite(value("da")))
          put("ebitda" + i2, (value("ebit") + value("da")) * (1 + growth) ** (i2 + 1) / million, "Forecast scenario \xB7 constant reported EBIT and D&A margins; not consensus");
      }
      gaps.push("analyst consensus and contributor counts are unavailable; populated figures are explicit scenarios");
    } else gaps.push("matching-currency filing drivers and licensed consensus estimates are unavailable");
  }
  if (snapshot.price?.status === "ready") {
    put(
      "price",
      snapshot.price.value,
      "Daily closing price \xB7 " + snapshot.price.asOf
    );
    patches.priceDate = snapshot.price.asOf;
  }
  if (latest && view !== "ee") patches.asOf ||= latest.end;
  patches.source ||= latest ? "SEC filing facts with explicit forecast assumptions. " + Object.values(m)[0]?.source.url : "";
  return { patches, origins, gaps: [...new Set(gaps)], fit };
}

// src/ddm.js
function calculateDDM(input) {
  const {
    model,
    basis,
    dividend,
    requiredReturn: r,
    terminalGrowth: g
  } = input;
  if (!["gordon", "two-stage"].includes(model))
    throw new Error("Choose a supported DDM model.");
  if (!["current", "forward"].includes(basis))
    throw new Error("Choose D\u2080 or D\u2081 for the dividend basis.");
  if (!Number.isFinite(dividend) || dividend <= 0)
    throw new Error(
      "Enter a positive annual dividend per share. A zero dividend does not imply that the stock is worthless; this model needs a future dividend stream."
    );
  if (!Number.isFinite(r) || r <= 0)
    throw new Error("Enter a positive required return (cost of equity).");
  if (!Number.isFinite(g) || g <= -1)
    throw new Error("Enter perpetual dividend growth above \u2212100%.");
  if (r <= g)
    throw new Error(
      "Required return must exceed perpetual growth (r > g). No finite DDM value exists for these inputs."
    );
  const two = model === "two-stage";
  const h = two ? input.initialGrowth : g;
  const n = two ? input.years : 0;
  if (two && (!Number.isFinite(h) || h <= -1))
    throw new Error("Enter initial dividend growth above \u2212100%.");
  if (two && (!Number.isInteger(n) || n < 1 || n > 50))
    throw new Error("Initial stage must contain 1\u201350 whole years.");
  const price = input.price;
  if (price != null && (!Number.isFinite(price) || price <= 0))
    throw new Error("Enter a positive comparison price, or leave it blank.");
  const firstDividend = basis === "forward" ? dividend : dividend * (1 + h);
  const rows2 = [];
  let pvDividends = 0;
  for (let year = 1; year <= n; year++) {
    const payment = firstDividend * (1 + h) ** (year - 1);
    const discountFactor = (1 + r) ** -year;
    const pv = payment * discountFactor;
    pvDividends += pv;
    rows2.push({ year, dividend: payment, discountFactor, pv });
  }
  const terminalDividend = two ? rows2.at(-1).dividend * (1 + g) : firstDividend;
  const terminalValue = terminalDividend / (r - g);
  const pvTerminal = terminalValue / (1 + r) ** n;
  const value = pvDividends + pvTerminal;
  if (![firstDividend, terminalDividend, terminalValue, pvTerminal, value].every(
    Number.isFinite
  ) || value <= 0)
    throw new Error(
      "These assumptions exceed the calculator\u2019s numerical range. Use less extreme inputs."
    );
  const upside = price == null ? null : value / price - 1;
  const marginOfSafety = price == null ? null : 1 - price / value;
  const terminalWeight = two ? pvTerminal / value : null;
  const warnings2 = [];
  if (r - g < 0.01)
    warnings2.push(
      "Less than 1 percentage point separates required return and perpetual growth. Small changes can move value sharply."
    );
  if (g > 0.05)
    warnings2.push(
      "Perpetual growth above 5% is an aggressive assumption. Check its sustainability in the valuation currency."
    );
  if (terminalWeight >= 0.8)
    warnings2.push(
      "At least 80% of this estimate comes from terminal value. Long-run assumptions dominate the result."
    );
  return {
    value,
    firstDividend,
    terminalDividend,
    terminalValue,
    pvDividends,
    pvTerminal,
    terminalWeight,
    rows: rows2,
    upside,
    marginOfSafety,
    warnings: warnings2
  };
}

// src/valuation-answer.js
function valuationAnswer(item, snapshot, engine) {
  const fit = modelFit(item);
  const pending = { method: "review", title: "Review the company financials", reason: fit.reason, assumptions: fit.caution };
  if (!snapshot || snapshot.instrument?.symbol !== item.symbol || snapshot.instrument?.currency !== item.currency) return pending;
  const candidates = [fit.primary, ...fit.group === "operating" || ["regulated", "cyclical", "uncertain"].includes(fit.group) ? ["dcf"] : [], "ri"];
  if (engine) for (const view of [...new Set(candidates)].filter(Boolean)) {
    try {
      const fill = automaticInputs(view, snapshot, item);
      const draft = { ...engine.defaults(view), ...fill.patches };
      const r = engine.evaluate(view, draft, item.currency);
      if (!Number.isFinite(r.data.value)) continue;
      return { method: view, title: view === "dcf" ? "Cash-flow DCF scenario" : "Residual-income scenario", value: r.data.value, asOf: snapshot.financials.asOf || snapshot.financials.annual?.[0]?.end, source: Object.values(snapshot.financials.annual?.[0]?.metrics || {})[0]?.source, assumptions: "Reported inputs with editable growth, discount-rate and capital-adjustment assumptions. Open the model to inspect every input.", reason: fit.reason };
    } catch {
    }
  }
  const d = snapshot.dividend;
  if (d?.status === "ready" && d.currency === item.currency && d.value > 0) {
    const r = calculateDDM({ model: "two-stage", basis: "current", dividend: d.value, requiredReturn: fit.discount / 100, terminalGrowth: 0.03, initialGrowth: 0.05, years: 5 });
    return { method: "ddm", title: "Dividend-based scenario", value: r.value, asOf: d.asOf, source: d.source, assumptions: `Starting annual dividend ${d.value} ${item.currency}; assumed 5% growth for five years, then 3% perpetual growth; ${fit.discount}% required equity return. Dividends may not capture buybacks or retained earnings.`, reason: fit.reason };
  }
  const annual = snapshot.financials?.status === "ready" && snapshot.financials.annual?.[0], eps = annual?.metrics?.eps;
  if (eps?.value > 0 && eps.source?.url) {
    const r = fit.discount / 100;
    return {
      method: "earnings",
      title: "No-growth earnings-power scenario",
      value: eps.value / r,
      low: eps.value / (r + 0.02),
      high: eps.value / (r - 0.02),
      asOf: annual.end,
      source: eps.source,
      assumptions: `Reported annual diluted EPS of ${eps.value} ${item.currency} is assumed sustainable and 100% distributable, with zero growth and a ${fit.discount}% required equity return. Range varies required return by \xB12 percentage points. Earnings are not cash flow; reinvestment, cyclicality and one-off items require review.`,
      reason: fit.reason
    };
  }
  return { ...pending, reason: annual?.metrics?.eps?.value <= 0 ? "Current earnings do not support a positive no-growth earnings valuation. Review a path to sustainable cash flow and use scenario DCF." : fit.reason };
}

// src/widgets.js
var quoteGroups = {
  global: [
    {
      name: "North America",
      symbols: [
        { name: "AMEX:SPY", displayName: "SPY \xB7 S&P 500 ETF" },
        { name: "NASDAQ:QQQ", displayName: "QQQ \xB7 Nasdaq 100 ETF" },
        { name: "AMEX:DIA", displayName: "DIA \xB7 Dow ETF" },
        { name: "AMEX:IWM", displayName: "IWM \xB7 Russell 2000 ETF" },
        { name: "TSX:XIC", displayName: "XIC \xB7 Canada ETF" }
      ]
    },
    {
      name: "International",
      symbols: [
        { name: "AMEX:VEA", displayName: "VEA \xB7 Developed ex-US ETF" },
        { name: "AMEX:VWO", displayName: "VWO \xB7 Emerging markets ETF" },
        { name: "AMEX:EWJ", displayName: "EWJ \xB7 Japan ETF" },
        { name: "AMEX:EWG", displayName: "EWG \xB7 Germany ETF" },
        { name: "AMEX:EWU", displayName: "EWU \xB7 UK ETF" },
        { name: "AMEX:EWH", displayName: "EWH \xB7 Hong Kong ETF" }
      ]
    }
  ],
  sectors: [
    {
      name: "US sector ETFs",
      symbols: [
        ["XLK", "Technology"],
        ["XLF", "Financials"],
        ["XLE", "Energy"],
        ["XLV", "Health care"],
        ["XLI", "Industrials"],
        ["XLY", "Consumer discretionary"],
        ["XLP", "Consumer staples"],
        ["XLU", "Utilities"],
        ["XLB", "Materials"],
        ["XLRE", "Real estate"],
        ["XLC", "Communication services"]
      ].map(([s, n]) => ({ name: `AMEX:${s}`, displayName: `${s} \xB7 ${n}` }))
    }
  ],
  canada: [
    {
      name: "Canada \xB7 CAD listings",
      symbols: [
        ["XIC", "Canada composite ETF"],
        ["VFV", "S&P 500 ETF"],
        ["RY", "Royal Bank"],
        ["TD", "TD Bank"],
        ["CM", "CIBC"],
        ["BMO", "BMO"],
        ["BNS", "Scotiabank"],
        ["ENB", "Enbridge"],
        ["SHOP", "Shopify"],
        ["CNQ", "Canadian Natural"]
      ].map(([s, n]) => ({ name: `TSX:${s}`, displayName: `${s} \xB7 ${n}` }))
    }
  ],
  credit: [
    {
      name: "Bond & credit ETFs \xB7 price, not yield",
      symbols: [
        ["NASDAQ:SHY", "SHY \xB7 1\u20133Y Treasury"],
        ["NASDAQ:IEF", "IEF \xB7 7\u201310Y Treasury"],
        ["NASDAQ:TLT", "TLT \xB7 20+Y Treasury"],
        ["AMEX:LQD", "LQD \xB7 Investment grade"],
        ["AMEX:HYG", "HYG \xB7 High yield"],
        ["TSX:XBB", "XBB \xB7 Canada universe"]
      ].map(([name, displayName]) => ({ name, displayName }))
    }
  ],
  fx: [
    {
      name: "Indicative FX \xB7 price per base currency",
      symbols: [
        "EURUSD",
        "GBPUSD",
        "USDJPY",
        "USDCAD",
        "USDCHF",
        "AUDUSD",
        "USDHKD"
      ].map((s) => ({
        name: `FX_IDC:${s}`,
        displayName: s.slice(0, 3) + " / " + s.slice(3)
      }))
    },
    {
      name: "Commodity references",
      symbols: [
        { name: "TVC:GOLD", displayName: "Gold \xB7 indicative reference" },
        { name: "TVC:USOIL", displayName: "WTI \xB7 CFD reference" },
        { name: "AMEX:SLV", displayName: "SLV \xB7 Silver trust shares" },
        { name: "AMEX:CPER", displayName: "CPER \xB7 Copper futures fund" }
      ]
    }
  ]
};

// src/valuation.js
function finite(value, label) {
  if (!Number.isFinite(value)) throw new Error(`Enter ${label}.`);
  return value;
}
function positive(value, label) {
  if (finite(value, label) <= 0) throw new Error(`${label} must be positive.`);
  return value;
}
function nonnegative(value, label) {
  if (finite(value, label) < 0) throw new Error(`${label} cannot be negative.`);
  return value;
}
function fraction(value, label) {
  if (finite(value, label) < 0 || value > 1)
    throw new Error(`${label} must be between 0% and 100%.`);
  return value;
}
function bounded(result2) {
  const walk = (v) => {
    if (typeof v === "number" && !Number.isFinite(v))
      throw new Error(
        "Inputs exceed the numerical range. Use less extreme assumptions."
      );
    if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(result2);
  return result2;
}
function priceDifference(value, price) {
  if (price == null) return null;
  return value / positive(price, "Comparison price") - 1;
}
function equityBridge(input, enterpriseValue) {
  const { debt, cash, otherAssets, claims, shares } = input;
  nonnegative(debt, "Debt");
  nonnegative(cash, "Excess cash");
  nonnegative(otherAssets, "Other non-operating assets");
  nonnegative(
    claims,
    "Preferred equity, noncontrolling interests and other claims"
  );
  positive(shares, "Diluted shares");
  const equity = enterpriseValue - debt + cash + otherAssets - claims;
  return bounded({ enterpriseValue, equity, value: equity / shares });
}
function calculateDCF(input) {
  const { flows, wacc, terminalMethod } = input;
  positive(wacc, "WACC");
  if (!Array.isArray(flows) || flows.length < 1 || flows.length > 10)
    throw new Error("Enter 1\u201310 annual FCFF forecasts.");
  const rows2 = flows.map((fcff, index) => {
    finite(fcff, `year ${index + 1} FCFF`);
    const year = index + 1, factor = (1 + wacc) ** -year;
    return { year, fcff, factor, pv: fcff * factor };
  });
  let terminalValue;
  const warnings2 = [];
  if (terminalMethod === "growth") {
    const g = finite(input.terminalGrowth, "perpetual growth");
    if (g <= -1 || g >= wacc)
      throw new Error("Perpetual growth must exceed \u2212100% and be below WACC.");
    positive(flows.at(-1), "Final forecast FCFF for a growing perpetuity");
    terminalValue = flows.at(-1) * (1 + g) / (wacc - g);
    if (wacc - g < 0.01)
      warnings2.push(
        "WACC is less than 1 percentage point above perpetual growth; value is highly sensitive."
      );
    if (g > 0.05)
      warnings2.push(
        "Perpetual growth above 5% needs a strong long-run economic justification in this currency."
      );
  } else if (terminalMethod === "exit") {
    terminalValue = positive(input.terminalEbitda, "Final-year EBITDA") * positive(input.exitMultiple, "Exit EV/EBITDA multiple");
    warnings2.push(
      "Exit multiples import a market-pricing assumption into DCF; this is not a pure perpetual cash-flow valuation."
    );
  } else throw new Error("Choose a supported terminal-value method.");
  const pvFlows = rows2.reduce((sum, row) => sum + row.pv, 0);
  const pvTerminal = terminalValue * rows2.at(-1).factor;
  const bridge = equityBridge(input, pvFlows + pvTerminal);
  const terminalWeight = bridge.enterpriseValue > 0 ? pvTerminal / bridge.enterpriseValue : null;
  if (terminalWeight >= 0.8)
    warnings2.push(
      "At least 80% of enterprise value comes from terminal value; long-run assumptions dominate."
    );
  if (flows.some((v) => v < 0))
    warnings2.push(
      "Negative forecast FCFF is included without flooring; check the funding and path to sustainable cash flow."
    );
  if (bridge.equity <= 0)
    warnings2.push(
      "The model gives non-positive common equity. This signals a failed equity case, not a tradable negative stock price."
    );
  return bounded({
    ...bridge,
    rows: rows2,
    pvFlows,
    terminalValue,
    pvTerminal,
    terminalWeight,
    upside: priceDifference(bridge.value, input.price),
    warnings: warnings2
  });
}
function dcfSensitivity(input) {
  const rates = [-0.01, -5e-3, 0, 5e-3, 0.01].map((d) => input.wacc + d);
  const growth = input.terminalMethod === "growth";
  const assumptions = (growth ? [-0.01, -5e-3, 0, 5e-3, 0.01] : [-2, -1, 0, 1, 2]).map((d) => (growth ? input.terminalGrowth : input.exitMultiple) + d);
  const values = rates.map(
    (wacc) => assumptions.map((a) => {
      try {
        return calculateDCF({
          ...input,
          wacc,
          [growth ? "terminalGrowth" : "exitMultiple"]: a
        }).value;
      } catch {
        return null;
      }
    })
  );
  return { rates, assumptions, values };
}
function calculateWACC(input) {
  const { riskFree: riskFree2, beta, equityRiskPremium, costDebt, taxRate, equity, debt } = input;
  finite(riskFree2, "risk-free rate");
  finite(beta, "levered equity beta");
  nonnegative(equityRiskPremium, "Equity risk premium");
  fraction(taxRate, "Marginal tax rate");
  positive(equity, "Market value of common equity");
  nonnegative(debt, "Market value of debt");
  if (debt > 0) nonnegative(costDebt, "Pre-tax cost of debt");
  const costEquity = riskFree2 + beta * equityRiskPremium;
  positive(costEquity, "Calculated cost of equity");
  const equityWeight = equity / (equity + debt), debtWeight = 1 - equityWeight;
  const afterTaxDebt = debt > 0 ? costDebt * (1 - taxRate) : 0;
  const wacc = equityWeight * costEquity + debtWeight * afterTaxDebt;
  positive(wacc, "Calculated WACC");
  return bounded({
    costEquity,
    equityWeight,
    debtWeight,
    afterTaxDebt,
    wacc,
    warnings: [
      "Uses a common-equity/debt capital structure and an available tax shield. Preferred stock, leases and constrained interest deductions need consistent adjustments."
    ]
  });
}
function median(values) {
  if (!values.length)
    throw new Error("At least one usable observation is needed.");
  const sorted = values.slice().sort((a, b) => a - b), n = sorted.length;
  return sorted.length % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}
function isDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function calculateRelative(input) {
  if (!["pe", "pb", "evEbitda", "evRevenue"].includes(input.metric))
    throw new Error("Choose P/E, P/B, EV/EBITDA or EV/revenue.");
  positive(
    input.fundamental,
    "Target company's matching EPS, book value per share or EBITDA"
  );
  const peers = input.peers.filter(
    (p) => Number.isFinite(p.multiple) && p.multiple > 0 && p.name?.trim()
  );
  const names = peers.map((p) => p.name.trim().toLowerCase());
  if (new Set(names).size !== names.length)
    throw new Error(
      "Use each peer once; duplicate peer names would distort the median."
    );
  const peerMedian = peers.length ? median(peers.map((p) => p.multiple)) : null;
  const history = input.history.filter((v) => Number.isFinite(v) && v > 0);
  const historicalMedian = history.length ? median(history) : null;
  if (peerMedian == null && historicalMedian == null)
    throw new Error(
      "Enter a named positive peer multiple or a positive historical observation. Negative or zero denominators are not meaningful here."
    );
  const valueAt = (multiple2) => ["evEbitda", "evRevenue"].includes(input.metric) ? equityBridge(input, multiple2 * input.fundamental).value : multiple2 * input.fundamental;
  let currentMultiple = null;
  if (input.price != null) {
    positive(input.price, "Comparison price");
    if (["evEbitda", "evRevenue"].includes(input.metric)) {
      equityBridge(input, 0);
      currentMultiple = (input.price * input.shares + input.debt - input.cash - input.otherAssets + input.claims) / input.fundamental;
    } else currentMultiple = input.price / input.fundamental;
  }
  const historySorted = history.slice().sort((a, b) => a - b);
  const historicalPercentile = currentMultiple == null || !history.length ? null : (history.filter((v) => v < currentMultiple).length + history.filter((v) => v === currentMultiple).length * 0.5) / history.length;
  return bounded({
    historicalPercentile,
    historicalLow: historySorted[0] ?? null,
    historicalHigh: historySorted.at(-1) ?? null,
    peers,
    excluded: input.peers.filter((p) => p.name?.trim() || p.multiple != null).length - peers.length,
    peerMedian,
    historicalMedian,
    historicalCount: history.length,
    currentMultiple,
    peerValue: peerMedian == null ? null : valueAt(peerMedian),
    historicalValue: historicalMedian == null ? null : valueAt(historicalMedian),
    peerPremium: currentMultiple == null || peerMedian == null ? null : currentMultiple / peerMedian - 1,
    historicalPremium: currentMultiple == null || historicalMedian == null ? null : currentMultiple / historicalMedian - 1,
    warnings: [
      "Relative discounts can reflect weaker growth, returns, accounting quality or higher risk. They do not establish intrinsic value.",
      ...peers.length === 1 ? [
        "One peer is a weak comparison set; its multiple is the entire peer benchmark."
      ] : [],
      ...currentMultiple != null && currentMultiple <= 0 ? [
        "The current enterprise multiple is non-positive. A conventional multiple premium/discount is not economically meaningful."
      ] : [],
      ...[peerMedian, historicalMedian].filter((v) => v != null).some((v) => valueAt(v) <= 0) ? [
        "An implied equity value is non-positive; treat it as a failed equity case, not a negative tradable share price."
      ] : []
    ]
  });
}
function calculateTargets(input) {
  const rows2 = input.rows.filter(
    (row) => row.name?.trim() || row.target != null || row.date
  );
  if (!rows2.length)
    throw new Error("Enter at least one analyst, target and observation date.");
  const names = [];
  for (const row of rows2) {
    if (!row.name?.trim())
      throw new Error("Name the broker or analyst for every target.");
    positive(row.target, "Analyst price target");
    if (!isDate(row.date))
      throw new Error("Record a valid calendar date for every target.");
    names.push(row.name.trim().toLowerCase());
  }
  if (new Set(names).size !== names.length)
    throw new Error(
      "Keep one target per broker/analyst; remove duplicate entries."
    );
  const targets = rows2.map((r) => r.target), mean = targets.reduce((a, b) => a + b, 0) / rows2.length;
  return bounded({
    rows: rows2,
    count: rows2.length,
    mean,
    median: median(targets),
    low: Math.min(...targets),
    high: Math.max(...targets),
    upside: priceDifference(mean, input.price)
  });
}
function calculateRI(input) {
  let book = positive(input.book, "Opening common book value per share");
  const r = positive(input.costEquity, "Cost of equity");
  const persistence = fraction(
    input.persistence,
    "Residual-income persistence"
  );
  if (!Array.isArray(input.rows) || !input.rows.length)
    throw new Error("Enter annual EPS and dividend forecasts.");
  const rows2 = input.rows.map((row, index) => {
    const eps = finite(row.eps, `year ${index + 1} EPS`), dividend = nonnegative(row.dividend, `Year ${index + 1} dividend`);
    const openingBook = book, charge = r * openingBook, ri = eps - charge;
    book += eps - dividend;
    if (book <= 0)
      throw new Error(
        `Year ${index + 1} book value becomes non-positive; this simplified clean-surplus model is unsuitable.`
      );
    return {
      year: index + 1,
      openingBook,
      eps,
      dividend,
      charge,
      ri,
      closingBook: book,
      pv: ri / (1 + r) ** (index + 1)
    };
  });
  const terminalValue = rows2.at(-1).ri * persistence / (1 + r - persistence);
  const pvTerminal = terminalValue / (1 + r) ** rows2.length;
  const pvRI = rows2.reduce((sum, row) => sum + row.pv, 0), value = input.book + pvRI + pvTerminal;
  return bounded({
    rows: rows2,
    terminalValue,
    pvTerminal,
    pvRI,
    value,
    upside: priceDifference(value, input.price),
    warnings: [
      "Assumes clean-surplus accounting, constant shares and annual year-end payments. OCI, buybacks, issuance and accounting adjustments must be reflected consistently.",
      ...persistence === 1 ? [
        "100% persistence assumes the final year's residual income continues unchanged forever."
      ] : [],
      ...value <= 0 ? [
        "Non-positive model equity indicates an unsuitable or failed equity case, not a negative tradable stock price."
      ] : []
    ]
  });
}
function forecastStatements(input) {
  let revenue = positive(input.revenue, "Starting annual revenue");
  const growth = finite(input.growth, "annual revenue growth");
  if (growth <= -1) throw new Error("Revenue growth must exceed \u2212100%.");
  const margin = fraction(input.margin, "EBIT margin"), tax = fraction(input.taxRate, "Tax rate");
  const daRate = fraction(input.daRate, "D&A / revenue"), capexRate = fraction(input.capexRate, "Capex / revenue"), nwcRate = finite(input.nwcRate, "Operating working capital / revenue"), payout = fraction(input.payout, "Dividend payout");
  let cash = nonnegative(input.cash, "Opening cash"), ppe = nonnegative(input.ppe, "Opening net PP&E"), nwc = finite(input.nwc, "Opening operating working capital");
  const debt = nonnegative(input.debt, "Debt"), kd = nonnegative(input.costDebt, "Pre-tax borrowing rate");
  const otherNetAssets = input.otherNetAssets ?? 0;
  finite(otherNetAssets, "Other net assets");
  if (Math.abs(nwcRate) > 1)
    throw new Error(
      "Operating working capital/revenue must be between \u2212100% and 100%."
    );
  let equity = cash + ppe + nwc + otherNetAssets - debt;
  if (equity <= 0)
    throw new Error(
      "Opening net assets must exceed debt in this simplified model."
    );
  const openingEquity = equity, rows2 = [], warnings2 = [];
  for (let year = 1; year <= 5; year++) {
    revenue *= 1 + growth;
    const ebit = revenue * margin, da = revenue * daRate, capex = revenue * capexRate;
    const interest = debt * kd, pretax = ebit - interest, taxes = Math.max(0, pretax) * tax, netIncome = pretax - taxes;
    const nextNwc = revenue * nwcRate, deltaNwc = nextNwc - nwc, dividend = Math.max(0, netIncome) * payout;
    const cfo = netIncome + da - deltaNwc, cfi = -capex, cff = -dividend;
    const openingCash = cash;
    cash += cfo + cfi + cff;
    ppe += capex - da;
    nwc = nextNwc;
    equity += netIncome - dividend;
    if (ppe < 0)
      throw new Error(
        `Year ${year} net PP&E becomes negative. Revise depreciation, capex or opening assets.`
      );
    const fcff = ebit - Math.max(0, ebit) * tax + da - capex - deltaNwc;
    rows2.push({
      year,
      revenue,
      ebit,
      da,
      ebitda: ebit + da,
      interest,
      taxes,
      netIncome,
      dividend,
      capex,
      deltaNwc,
      cfo,
      cfi,
      cff,
      openingCash,
      cash,
      ppe,
      nwc,
      otherNetAssets,
      debt,
      equity,
      fcff,
      balance: cash + ppe + nwc + otherNetAssets - debt - equity
    });
  }
  if (rows2.some((r) => r.cash < 0))
    warnings2.push(
      "Cash becomes negative: the forecast requires financing. No automatic debt or equity plug hides that deficit."
    );
  warnings2.push(
    "Simplified linked statements: only cash, operating working capital, net PP&E, fixed debt and common equity are modeled. No new financing, acquisitions, OCI or loss-tax credits. This is not Bloomberg X3SM."
  );
  return bounded({ openingEquity, rows: rows2, warnings: warnings2 });
}

// src/valuation-view.js
var pct = (v) => v == null ? "\u2014" : `${num(v * 100, 2)}%`;
var money = (v, c) => v == null ? "\u2014" : `${esc(c)} ${num(v, 2)}`;
var multiple = (v) => v == null ? "\u2014" : `${num(v, 2)}\xD7`;
var note = (s) => `<p class="ddm-help">${s}</p>`;
var table = (caption, headers, rows2, cls = "") => `<div class="ddm-table-wrap" tabindex="0" role="region" aria-label="${esc(caption)}"><table class="ddm-table ${cls}"><caption>${caption}</caption><thead><tr>${headers.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows2.map((row) => `<tr>${row.map((c, i2) => i2 ? `<td>${c}</td>` : `<th scope="row">${c}</th>`).join("")}</tr>`).join("")}</tbody></table></div>`;
var panel = (title, body) => `<section class="panel"><div class="panel-head"><h2>${title}</h2></div>${body}</section>`;
var warnings = (items) => items?.length ? `<ul class="ddm-warnings">${items.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : "";
var metric = (label, value) => `<div><span>${label}</span><b>${value}</b></div>`;
var result = (label, value, body) => panel(
  label,
  `<div class="ddm-result-body"><strong id="val-value" class="val-value">${value}</strong>${body}</div>`
);
var cf = "https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/";
var valuationDefaults = (view) => ({
  method: "growth",
  metric: "pe",
  terminalMethod: "growth",
  estimateKind: "user",
  example: false,
  auto: true,
  ...view === "ri" ? { persistence: "0" } : {}
});
var sourceReferences = {
  dcf: ["FCFF valuation and WACC", cf + "free-cash-flow-valuation"],
  wacc: [
    "FCFF discount rate and capital weights",
    cf + "free-cash-flow-valuation"
  ],
  ri: ["Residual income valuation", cf + "residual-income-valuation"],
  rv: [
    "Equity valuation approaches",
    cf + "equity-valuation-concepts-basic-tools"
  ],
  eqrv: [
    "Bloomberg \xB7 relative valuation context",
    "https://data.bloomberglp.com/professional/sites/10/IR-Essentials-guide.pdf"
  ],
  anr: [
    "Bloomberg \xB7 analyst targets navigation",
    "https://data.bloomberglp.com/professional/sites/10/Getting-Started-Guide-for-Students-English.pdf"
  ],
  ee: [
    "Bloomberg \xB7 earnings and estimates",
    "https://assets.bbhub.io/professional/sites/10/RMB-Equity-Solutions.pdf"
  ],
  x3sm: [
    "Bloomberg \xB7 Excel template context",
    "https://data.bloomberglp.com/professional/sites/10/Education-Brochure.pdf"
  ]
};
function readInput(view, d) {
  const n = (k) => d[k] == null || String(d[k]).trim() === "" ? null : Number(d[k]);
  const rate = (k) => n(k) == null ? null : n(k) / 100;
  const bridge = Object.fromEntries(
    ["debt", "cash", "otherAssets", "claims", "shares", "price"].map((k) => [
      k,
      n(k)
    ])
  );
  if (view === "dcf")
    return {
      ...bridge,
      flows: Array.from({ length: 5 }, (_, i2) => n("fcff" + i2)),
      wacc: rate("wacc"),
      terminalGrowth: rate("terminalGrowth"),
      terminalMethod: d.terminalMethod,
      terminalEbitda: n("terminalEbitda"),
      exitMultiple: n("exitMultiple")
    };
  if (view === "wacc")
    return {
      riskFree: rate("riskFree"),
      beta: n("beta"),
      equityRiskPremium: rate("equityRiskPremium"),
      costDebt: rate("costDebt"),
      taxRate: rate("taxRate"),
      equity: n("equity"),
      debt: n("debt")
    };
  if (["rv", "eqrv"].includes(view)) {
    if (!d.period?.trim())
      throw new Error(
        "Record the matching fiscal period and accounting basis."
      );
    const history = (d.history || "").trim() ? d.history.split(/[,;\s]+/).filter(Boolean).map(Number) : [];
    if (history.some((v) => !Number.isFinite(v) || v <= 0))
      throw new Error(
        "Historical multiples must be positive numbers, separated by commas or spaces."
      );
    return {
      ...bridge,
      metric: d.metric,
      fundamental: n("fundamental"),
      peers: Array.from({ length: 4 }, (_, i2) => ({
        name: d["peerName" + i2],
        multiple: n("peerMultiple" + i2)
      })),
      history
    };
  }
  if (view === "anr") {
    if (!d.horizon?.trim())
      throw new Error("Record a common target horizon and share basis.");
    return {
      price: n("price"),
      rows: Array.from({ length: 4 }, (_, i2) => ({
        name: d["analyst" + i2],
        target: n("target" + i2),
        date: d["targetDate" + i2],
        rating: d["rating" + i2] || "Not recorded"
      }))
    };
  }
  if (view === "ri")
    return {
      book: n("book"),
      costEquity: rate("costEquity"),
      persistence: rate("persistence"),
      price: n("price"),
      rows: Array.from({ length: 5 }, (_, i2) => ({
        eps: n("eps" + i2),
        dividend: n("dividend" + i2)
      }))
    };
  if (view === "x3sm")
    return Object.fromEntries(
      [
        "revenue",
        "growth",
        "margin",
        "taxRate",
        "costDebt",
        "daRate",
        "capexRate",
        "nwcRate",
        "payout",
        "cash",
        "debt",
        "ppe",
        "nwc",
        "otherNetAssets"
      ].map((k) => [
        k,
        ["revenue", "cash", "debt", "ppe", "nwc", "otherNetAssets"].includes(k) ? n(k) : rate(k)
      ])
    );
  if (view === "ee") {
    if (!d.period?.trim())
      throw new Error(
        "Record the accounting and share basis of these estimates."
      );
    const rows2 = Array.from({ length: 3 }, (_, i2) => ({
      fiscal: d["fiscal" + i2],
      revenue: n("revenue" + i2),
      eps: n("eps" + i2),
      ebitda: n("ebitda" + i2),
      count: n("count" + i2)
    })).filter(
      (row) => row.fiscal || [row.revenue, row.eps, row.ebitda, row.count].some((v) => v != null)
    );
    if (!rows2.length)
      throw new Error(
        "Enter a fiscal year-end and at least one forecast metric."
      );
    rows2.forEach((row) => {
      if (!isDate(row.fiscal))
        throw new Error("Each forecast needs a valid fiscal year-end date.");
      if ([row.revenue, row.eps, row.ebitda].every((v) => v == null))
        throw new Error("Each fiscal period needs at least one metric.");
      if ([row.revenue, row.eps, row.ebitda].some(
        (v) => v != null && !Number.isFinite(v)
      ))
        throw new Error("Estimates must be finite numbers.");
      if (row.revenue != null && row.revenue < 0)
        throw new Error("Revenue cannot be negative.");
      if (row.count != null && (!Number.isInteger(row.count) || row.count < 1))
        throw new Error(
          "Contributor counts must be positive whole numbers or blank."
        );
    });
    if (new Set(rows2.map((r) => r.fiscal)).size !== rows2.length)
      throw new Error("Use each fiscal period once.");
    const price = n("price");
    if (price != null && (!Number.isFinite(price) || price <= 0))
      throw new Error("Comparison price must be positive or blank.");
    return {
      rows: rows2.sort((a, b) => a.fiscal.localeCompare(b.fiscal)),
      price
    };
  }
}
function evaluateValuationDraft(view, d, currency) {
  const input = readInput(view, d);
  return { input, ...renderResult(view, input, d, currency) };
}
function renderResult(view, input, d, currency) {
  if (view === "dcf") {
    const r = calculateDCF(input), s = dcfSensitivity(input), growth = input.terminalMethod === "growth";
    return {
      data: r,
      html: result(
        "DCF \xB7 conditional equity value / share",
        money(r.value, currency),
        note(
          "Annual year-end FCFF; constant nominal WACC. All totals below are in millions; per-share value is in the selected trading currency."
        ) + `<div class="ddm-metrics">${metric("vs. entered price", pct(r.upside))}${metric("Enterprise value \xB7 millions", num(r.enterpriseValue, 2))}${metric("PV terminal / enterprise value", pct(r.terminalWeight))}</div>` + warnings(r.warnings)
      ) + panel(
        "Cash-flow audit",
        table(
          "Five annual FCFF forecasts \xB7 millions",
          ["Period", "FCFF", "Discount factor", "PV"],
          r.rows.map((row) => [
            "Year " + row.year,
            num(row.fcff, 4),
            num(row.factor, 6),
            num(row.pv, 4)
          ]).concat([
            [
              "Terminal \xB7 end year 5",
              num(r.terminalValue, 4),
              num((1 + input.wacc) ** -5, 6),
              num(r.pvTerminal, 4)
            ]
          ])
        )
      ) + panel(
        "Enterprise-to-common-equity bridge",
        table(
          "All totals and diluted shares in millions",
          ["Component", "Value"],
          [
            ["PV explicit FCFF", num(r.pvFlows, 4)],
            ["+ PV terminal", num(r.pvTerminal, 4)],
            ["= Enterprise value", num(r.enterpriseValue, 4)],
            ["\u2212 Debt", num(input.debt, 4)],
            ["+ Excess cash", num(input.cash, 4)],
            ["+ Other non-operating assets", num(input.otherAssets, 4)],
            ["\u2212 Preferred / NCI / other claims", num(input.claims, 4)],
            ["= Common equity", num(r.equity, 4)],
            ["\xF7 Diluted shares", num(input.shares, 4)],
            ["= Value per share", num(r.value, 4)]
          ]
        )
      ) + panel(
        `Sensitivity \xB7 WACC \xD7 ${growth ? "perpetual growth" : "exit multiple"}`,
        `<div class="ddm-table-wrap"><table class="ddm-table"><caption>Value per share \xB7 ${esc(currency)} \xB7 other inputs fixed</caption><thead><tr><th scope="col">WACC \u2193 / ${growth ? "g" : "EV/EBITDA"} \u2192</th>${s.assumptions.map((a) => `<th scope="col">${growth ? pct(a) : multiple(a)}</th>`).join("")}</tr></thead><tbody>${s.rates.map((rate, i2) => `<tr><th scope="row">${pct(rate)}</th>${s.values[i2].map((v, j) => `<td ${i2 === 2 && j === 2 ? 'class="ddm-base"' : ""}>${v == null ? "\u2014" : num(v, 2)}</td>`).join("")}</tr>`).join("")}</tbody></table></div><p class="ddm-table-note">Amber is the base case. \u2014 is an invalid combination. Rates vary by \xB10.5 / \xB11 percentage point; exit multiples by \xB11\xD7 / \xB12\xD7.</p>`
      )
    };
  }
  if (view === "wacc") {
    const r = calculateWACC(input);
    return {
      data: r,
      html: result(
        d.capitalBasis === "scenario" ? "Scenario WACC \xB7 assumed financing mix" : "Weighted average cost of capital",
        pct(r.wacc),
        `<div class="ddm-metrics">${metric("CAPM cost of equity", pct(r.costEquity))}${metric("After-tax debt cost", pct(r.afterTaxDebt))}${metric("Equity / debt weights", `${pct(r.equityWeight)} / ${pct(r.debtWeight)}`)}</div>` + note(
          "k\u2091 = risk-free rate + levered beta \xD7 equity risk premium. WACC = E/(E+D) \xD7 k\u2091 + D/(E+D) \xD7 k\u1D48 \xD7 (1\u2212tax). Use k\u2091 for DDM and RI; WACC for unlevered FCFF."
        ) + warnings(r.warnings) + `<button id="val-transfer" class="primary" type="button">Use this WACC in DCF \u2192</button>`
      )
    };
  }
  if (["rv", "eqrv"].includes(view)) {
    const r = calculateRelative(input);
    const validValue = r.peerValue ?? r.historicalValue;
    return {
      data: r,
      html: result(
        view === "eqrv" ? "Relative historical context" : "Peer-implied value / share",
        view === "eqrv" ? r.historicalPercentile == null ? "History not supplied" : pct(r.historicalPercentile) + " historical percentile" : money(validValue, currency),
        note(
          `Benchmark: ${r.peerValue != null ? "entered peer median" : "entered historical median"}. ${esc(d.period)}. A multiple-based implied price is not an intrinsic-value estimate.`
        ) + `<div class="ddm-metrics">${view === "eqrv" ? metric("Historical range", multiple(r.historicalLow) + " \u2013 " + multiple(r.historicalHigh)) : ""}${metric("Current multiple", multiple(r.currentMultiple))}${metric("Peer median", multiple(r.peerMedian))}${metric("Historical median", multiple(r.historicalMedian))}</div>` + warnings(r.warnings)
      ) + panel(
        "Comparison audit",
        table(
          "Benchmarks are kept separate",
          [
            "Benchmark",
            "Observations",
            "Multiple",
            "Implied price",
            "Current multiple / benchmark \u2212 1"
          ],
          [
            [
              "Peers",
              String(r.peers.length),
              multiple(r.peerMedian),
              money(r.peerValue, currency),
              pct(r.peerPremium)
            ],
            [
              "History",
              String(r.historicalCount),
              multiple(r.historicalMedian),
              money(r.historicalValue, currency),
              pct(r.historicalPremium)
            ]
          ]
        ) + note(
          `Positive percentages mean a multiple premium; negative means a discount. ${r.excluded} incomplete or non-positive peer observations excluded. Historical observations use a median, not time-series regression. EV/EBITDA implied prices use the entered enterprise-to-equity bridge.`
        )
      ) + panel(
        "Included peers",
        table(
          esc(d.period),
          ["Peer", "Multiple"],
          r.peers.map((p) => [esc(p.name), multiple(p.multiple)])
        )
      )
    };
  }
  if (view === "anr") {
    const r = calculateTargets(input);
    return {
      data: r,
      html: result(
        "Mean of your entered analyst targets",
        money(r.mean, currency),
        note(`Entered sample only \xB7 ${esc(d.horizon)}.`) + `<div class="ddm-metrics">${metric("Median target", money(r.median, currency))}${metric("Low / high", `${num(r.low, 2)} / ${num(r.high, 2)}`)}${metric("Mean vs. entered price", pct(r.upside))}</div>` + note(
          `${r.count} observations. Targets are analyst opinions, not intrinsic values or assured returns. Check stale targets, sample selection and broker-specific rating definitions.`
        )
      ) + panel(
        "Target observations",
        table(
          `All targets in ${esc(currency)} / share`,
          ["Broker / analyst", "Date", "Target", "Original rating"],
          r.rows.map((row) => [
            esc(row.name),
            esc(row.date),
            num(row.target, 2),
            esc(row.rating)
          ])
        )
      )
    };
  }
  if (view === "ri") {
    const r = calculateRI(input);
    return {
      data: r,
      html: result(
        "Residual income \xB7 equity value / share",
        money(r.value, currency),
        `<div class="ddm-metrics">${metric("Opening book value", money(input.book, currency))}${metric("PV explicit residual income", money(r.pvRI, currency))}${metric("vs. entered price", pct(r.upside))}</div>` + note(
          `V\u2080 = B\u2080 + \u03A3[RI\u209C/(1+r)\u1D57] + TV\u2085/(1+r)\u2075. RI\u2085\u208A\u2096 = RI\u2085 \xD7 \u03C9\u1D4F; TV\u2085 = RI\u2085 \xD7 \u03C9 / (1+r\u2212\u03C9). \u03C9 = ${pct(input.persistence)}. No debt/cash adjustment is applied to per-share common equity.`
        ) + warnings(r.warnings)
      ) + panel(
        "Clean-surplus and residual-income audit",
        table(
          `${esc(currency)} / share \xB7 annual year-end`,
          [
            "Year",
            "Opening book",
            "EPS",
            "Dividend",
            "Equity charge",
            "RI",
            "Closing book",
            "PV RI"
          ],
          r.rows.map((row) => [
            String(row.year),
            num(row.openingBook, 4),
            num(row.eps, 4),
            num(row.dividend, 4),
            num(row.charge, 4),
            num(row.ri, 4),
            num(row.closingBook, 4),
            num(row.pv, 4)
          ])
        )
      ) + panel(
        "Valuation bridge",
        table(
          "Book value plus excess earnings",
          ["Component", "Per share"],
          [
            ["Opening common book", num(input.book, 4)],
            ["+ PV years 1\u20135 RI", num(r.pvRI, 4)],
            ["+ PV continuation", num(r.pvTerminal, 4)],
            ["= Model common equity", num(r.value, 4)]
          ]
        )
      )
    };
  }
  if (view === "x3sm") {
    const r = forecastStatements(input), headers = ["Line item", ...r.rows.map((row) => "Year " + row.year)];
    const line = (label, key) => [
      label,
      ...r.rows.map((row) => num(row[key], 4))
    ];
    return {
      data: r,
      html: result(
        "Five-year linked forecast",
        `${num(r.rows.at(-1).fcff, 2)} million`,
        note(
          `Year-5 unlevered FCFF \xB7 ${esc(currency)}. Opening simplified equity = ${num(r.openingEquity, 2)} million. No valuation is implied until you choose discount rates, terminal assumptions and an equity bridge.`
        ) + warnings(r.warnings) + `<button id="val-transfer" class="primary" type="button">Use projected FCFF in DCF \u2192</button>`
      ) + panel(
        "Income statement",
        table(`All totals in ${esc(currency)} millions`, headers, [
          line("Revenue", "revenue"),
          line("EBITDA", "ebitda"),
          line("\u2212 D&A", "da"),
          line("EBIT", "ebit"),
          line("\u2212 Interest", "interest"),
          line("\u2212 Cash income taxes", "taxes"),
          line("Net income", "netIncome")
        ])
      ) + panel(
        "Cash-flow statement",
        table("Annual cash movements \xB7 no financing plug", headers, [
          line("Net income", "netIncome"),
          line("+ D&A", "da"),
          line("\u2212 Increase in operating NWC", "deltaNwc"),
          line("CFO", "cfo"),
          line("Investing CF (\u2212capex)", "cfi"),
          line("Financing CF (\u2212dividends)", "cff"),
          line("Opening cash", "openingCash"),
          line("Closing cash / funding gap", "cash"),
          line("Unlevered FCFF", "fcff")
        ])
      ) + panel(
        "Balance sheet",
        table("Assets less liabilities equals common equity", headers, [
          line("Cash / funding gap", "cash"),
          line("Net PP&E", "ppe"),
          line("Operating NWC (net)", "nwc"),
          line("Debt", "debt"),
          line("Simplified equity", "equity"),
          line("Other net assets (held constant)", "otherNetAssets"),
          line("Balance check \xB7 should be 0", "balance")
        ])
      )
    };
  }
  if (view === "ee") {
    const rows2 = input.rows, classification = d.imported && d.estimateKind === "consensus" ? "Connected provider consensus; source metadata validated" : {
      user: "Your forecast assumptions",
      guidance: "Company guidance transcribed by you",
      consensus: "Third-party consensus transcribed by you"
    }[d.estimateKind];
    return {
      data: { rows: rows2, classification },
      html: result(
        "Estimate notebook",
        `${rows2.length} fiscal period${rows2.length === 1 ? "" : "s"}`,
        note(
          `${esc(classification)}. ${esc(d.period)}. Review the source, fiscal horizon and accounting basis; a manual consensus label alone is not verification.`
        )
      ) + panel(
        "Forecast snapshot",
        table(
          `Revenue / EBITDA in ${esc(currency)} millions; EPS in ${esc(currency)} / share`,
          [
            "Fiscal year-end",
            "Revenue",
            "EPS",
            "EBITDA",
            "Contributors",
            "Price / EPS"
          ],
          rows2.map((row) => [
            esc(row.fiscal),
            row.revenue == null ? "\u2014" : num(row.revenue, 2),
            row.eps == null ? "\u2014" : num(row.eps, 4),
            row.ebitda == null ? "\u2014" : num(row.ebitda, 2),
            row.count ?? "\u2014",
            row.eps > 0 && input.price != null ? multiple(input.price / row.eps) : "\u2014"
          ])
        )
      ) + note(
        "Price / EPS is calculated only for positive EPS and a positive entered price. No multiple is shown for a loss. No figures are automatically transferred into FCFF: EPS and EBITDA are not cash flow."
      )
    };
  }
}

// scripts/build-financial-snapshots.mjs
var output = process.env.PUBLIC_DATA_OUTPUT || "data";
var now = /* @__PURE__ */ new Date();
var shared = /* @__PURE__ */ new Map();
var gate = Promise.resolve();
var paced = () => {
  const turn = gate;
  gate = gate.then(() => new Promise((r) => setTimeout(r, 450)));
  return turn;
};
async function network(url, options) {
  await paced();
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, options);
    if (response.ok || ![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) return response;
    await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
  }
}
var fetcher = async (url, options) => {
  const reusable = !String(url).includes("/companyfacts/");
  if (!reusable) return network(url, options);
  if (!shared.has(url)) shared.set(url, network(url, options).then(async (r) => ({ body: await r.arrayBuffer(), status: r.status, headers: r.headers })));
  const saved = await shared.get(url);
  return new Response(saved.body.slice(0), { status: saved.status, headers: saved.headers });
};
await mkdir(output, { recursive: true });
var priorCoverage = coverageState;
try {
  priorCoverage = JSON.parse(await readFile(output + "/coverage.json", "utf8"));
  applyCoverage(priorCoverage);
} catch {
}
var directory = await refreshIndexes(priorCoverage.indexes, fetcher, now);
applyCoverage(directory);
await writeFile(output + "/coverage.json", JSON.stringify(directory));
var listings = catalog.filter((x2) => x2.assetType === "Equity");
var rows = [];
var cursor = 0;
async function refresh(item) {
  const file = output + "/" + item.symbol.replaceAll(":", "_") + ".json";
  let d = await fetchValuationData(item, {}, fetcher, now);
  const useful = d.financials.status === "ready" || d.dividend.status === "ready";
  d.sync = { state: useful ? "ready" : "unavailable", lastAttempt: now.toISOString(), lastSuccess: useful ? now.toISOString() : null, cadence: "Public company facts refreshed every six hours; source publication dates remain unchanged.", publisher: "TickerLantern public financial data" };
  if (!useful) try {
    const old = JSON.parse(await readFile(file, "utf8"));
    if (old.instrument?.symbol === item.symbol && old.instrument.currency === item.currency && now - Date.parse(old.checkedAt) < 3 * 864e5 && (old.financials?.status === "ready" || old.dividend?.status === "ready")) d = { ...old, sync: { ...old.sync, state: "last_known", lastAttempt: now.toISOString() } };
  } catch {
  }
  await writeFile(file, JSON.stringify(d));
  const answer = valuationAnswer(item, d, { evaluate: evaluateValuationDraft, defaults: valuationDefaults });
  rows.push({ symbol: item.symbol, currency: item.currency, financials: d.financials.status, financialPeriod: d.financials.asOf, dividend: d.dividend.status, answerMethod: answer.method, numericalAnswer: Number.isFinite(answer.value), lastSuccess: d.sync.lastSuccess });
  if (rows.length % 25 === 0) console.log(`Refreshed ${rows.length} / ${listings.length} company listings`);
}
await Promise.all(Array.from({ length: 3 }, async () => {
  while (cursor < listings.length) await refresh(listings[cursor++]);
}));
rows.sort((a, b) => a.symbol.localeCompare(b.symbol));
var manifest = { schema: 1, generatedAt: now.toISOString(), cadence: "Every six hours", totalListings: listings.length, financialsReady: rows.filter((r) => r.financials === "ready").length, numericalAnswers: rows.filter((r) => r.numericalAnswer).length, rows };
await writeFile(output + "/manifest.json", JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ total: manifest.totalListings, financials: manifest.financialsReady, numericalAnswers: manifest.numericalAnswers }));
if (manifest.financialsReady < 400) throw Error("Refresh coverage fell below the publication threshold; existing published snapshot will remain in place.");
