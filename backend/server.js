import cors from "cors"
import dotenv from "dotenv"
import express from "express"
import jwt from "jsonwebtoken"
import OpenAI from "openai"
import bcrypt from "bcryptjs"
import mysql from "mysql2/promise"

dotenv.config()

const app = express()

// 🔥 CORS tamamen açık
const rawCorsOrigins = `${process.env.CORS_ORIGIN ?? "*"}`.trim()
const allowedOrigins =
  rawCorsOrigins === "*" ? "*" : rawCorsOrigins.split(",").map((x) => x.trim()).filter(Boolean)
const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
}

app.use(cors(corsOptions))
app.options("*", cors(corsOptions))

// Base64 images for coffee verification can be large.
app.use(express.json({ limit: "15mb" }))

const dbHost = `${process.env.DB_HOST ?? ""}`.trim()
const dbPort = Number(process.env.DB_PORT || 3306)
const dbUser = `${process.env.DB_USER ?? ""}`.trim()
const dbPassword = `${process.env.DB_PASSWORD ?? ""}`.trim()
const dbName = `${process.env.DB_NAME ?? ""}`.trim()
const jwtSecret = `${process.env.JWT_SECRET ?? ""}`.trim()
const authTokenTtl = `${process.env.AUTH_TOKEN_TTL ?? "30d"}`.trim() || "30d"
const pool =
  dbHost && dbUser && dbName
    ? mysql.createPool({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      })
    : null

const isAuthEnabled = () => Boolean(pool && jwtSecret)

const dbQuery = async (text, params = []) => {
  if (!pool) throw new Error("database is not configured")
  const [rows] = await pool.execute(text, params)
  return rows
}

const normalizeEmail = (email) => `${email ?? ""}`.trim().toLowerCase()

const buildAuthUser = (row, roleIds = []) => ({
  id: row.id,
  username: row.username,
  email: row.email,
  birthDate: row.birth_date
    ? new Date(row.birth_date).toISOString().slice(0, 10)
    : "",
  roleIds,
  isAdmin: roleIds.includes("admin") || roleIds.includes("super_admin"),
})

const createAccessToken = (user) => {
  if (!jwtSecret) throw new Error("JWT_SECRET is missing")
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
      roleIds: user.roleIds || [],
    },
    jwtSecret,
    { expiresIn: authTokenTtl }
  )
}

const requireAuth = (req, res, next) => {
  if (!jwtSecret) {
    return res.status(503).json({ error: "auth is not configured" })
  }
  const authHeader = `${req.headers.authorization ?? ""}`.trim()
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""
  if (!token) return res.status(401).json({ error: "missing token" })
  try {
    const payload = jwt.verify(token, jwtSecret)
    req.auth = payload
    return next()
  } catch {
    return res.status(401).json({ error: "invalid token" })
  }
}

app.post("/auth/register", async (req, res) => {
  if (!isAuthEnabled()) {
    return res.status(503).json({ error: "auth service is not configured" })
  }

  try {
    const username = `${req.body?.username ?? ""}`.trim()
    const email = normalizeEmail(req.body?.email)
    const password = `${req.body?.password ?? ""}`
    const birthDate = `${req.body?.birthDate ?? ""}`.trim()

    if (!username || !email || !password) {
      return res.status(400).json({ error: "username, email and password are required" })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "password must be at least 6 characters" })
    }

    const existing = await dbQuery("select id from app_users where email = ? limit 1", [email])
    if (existing.length > 0) {
      return res.status(409).json({ error: "email already in use" })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const insertResult = await dbQuery(
      `insert into app_users (email, username, birth_date, password_hash)
       values (?, ?, nullif(?, ''), ?)`,
      [email, username, birthDate || null, passwordHash]
    )
    const userId = `${insertResult.insertId}`
    const userRows = await dbQuery(
      "select id, email, username, birth_date from app_users where id = ? limit 1",
      [userId]
    )
    const userRow = userRows[0]

    const memberRole = await dbQuery("select id from roles where code = 'member' limit 1")
    if (memberRole.length > 0) {
      await dbQuery("insert ignore into user_roles (user_id, role_id) values (?, ?)", [userId, memberRole[0].id])
    }

    const roleIds = ["member"]
    const user = buildAuthUser(userRow, roleIds)
    const token = createAccessToken(user)

    return res.status(201).json({ token, user })
  } catch (error) {
    console.error("Auth register error:", error?.message ?? error)
    return res.status(500).json({ error: "register failed" })
  }
})

app.post("/auth/login", async (req, res) => {
  if (!isAuthEnabled()) {
    return res.status(503).json({ error: "auth service is not configured" })
  }

  try {
    const email = normalizeEmail(req.body?.email)
    const password = `${req.body?.password ?? ""}`
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" })
    }

    const result = await dbQuery(
      `select u.id, u.email, u.username, u.birth_date, u.password_hash, u.blocked_until,
              group_concat(distinct r.code separator ',') as role_ids_csv
       from app_users u
       left join user_roles ur on ur.user_id = u.id
       left join roles r on r.id = ur.role_id
       where u.email = ?
       group by u.id, u.email, u.username, u.birth_date, u.password_hash, u.blocked_until`,
      [email]
    )

    if (result.length < 1) {
      return res.status(401).json({ error: "invalid credentials" })
    }

    const row = result[0]
    const isPasswordOk = row.password_hash ? await bcrypt.compare(password, row.password_hash) : false
    if (!isPasswordOk) {
      return res.status(401).json({ error: "invalid credentials" })
    }

    if (row.blocked_until && new Date(row.blocked_until).getTime() > Date.now()) {
      return res.status(423).json({ error: "account is blocked temporarily" })
    }

    const roleIds = `${row.role_ids_csv ?? ""}`.split(",").map((x) => x.trim()).filter(Boolean)
    const safeRoles = roleIds.length ? roleIds : ["member"]
    const user = buildAuthUser(row, safeRoles)
    const token = createAccessToken(user)
    return res.json({ token, user })
  } catch (error) {
    console.error("Auth login error:", error?.message ?? error)
    return res.status(500).json({ error: "login failed" })
  }
})

app.get("/auth/me", requireAuth, async (req, res) => {
  if (!isAuthEnabled()) {
    return res.status(503).json({ error: "auth service is not configured" })
  }
  try {
    const userId = `${req.auth?.sub ?? ""}`.trim()
    if (!userId) return res.status(401).json({ error: "invalid token payload" })

    const result = await dbQuery(
      `select u.id, u.email, u.username, u.birth_date,
              group_concat(distinct r.code separator ',') as role_ids_csv
       from app_users u
       left join user_roles ur on ur.user_id = u.id
       left join roles r on r.id = ur.role_id
       where u.id = ?
       group by u.id, u.email, u.username, u.birth_date`,
      [userId]
    )
    if (result.length < 1) return res.status(404).json({ error: "user not found" })

    const row = result[0]
    const roleIds = `${row.role_ids_csv ?? ""}`.split(",").map((x) => x.trim()).filter(Boolean)
    const safeRoles = roleIds.length ? roleIds : ["member"]
    return res.json({ user: buildAuthUser(row, safeRoles) })
  } catch (error) {
    console.error("Auth me error:", error?.message ?? error)
    return res.status(500).json({ error: "me failed" })
  }
})

app.get("/admin/members", requireAuth, async (req, res) => {
  if (!isAuthEnabled()) {
    return res.status(503).json({ error: "auth service is not configured" })
  }

  try {
    const result = await dbQuery(
      `select u.id,
              u.email,
              u.username,
              u.birth_date,
              u.status,
              u.blocked_until,
              u.created_at,
              group_concat(distinct r.code separator ',') as role_ids_csv
       from app_users u
       left join user_roles ur on ur.user_id = u.id
       left join roles r on r.id = ur.role_id
       group by u.id, u.email, u.username, u.birth_date, u.status, u.blocked_until, u.created_at
       order by u.created_at desc`
    )

    const users = result.map((row) => {
      const roleIds = `${row.role_ids_csv ?? ""}`.split(",").map((x) => x.trim()).filter(Boolean)
      const blockedUntilIso = row.blocked_until ? new Date(row.blocked_until).toISOString() : undefined
      const blockedByStatus = `${row.status ?? ""}`.toLowerCase() === "blocked"
      const blockedByTime = row.blocked_until ? new Date(row.blocked_until).getTime() > Date.now() : false
      return {
        id: `${row.id}`,
        username: `${row.username ?? ""}`,
        email: `${row.email ?? ""}`,
        birthDate: row.birth_date ? new Date(row.birth_date).toISOString().slice(0, 10) : "",
        roleIds,
        isAdmin: roleIds.includes("admin") || roleIds.includes("super_admin"),
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        blocked: blockedByStatus || blockedByTime,
        blockedUntil: blockedUntilIso,
      }
    })

    return res.json({ users })
  } catch (error) {
    console.error("Admin members error:", error?.message ?? error)
    return res.status(500).json({ error: "admin members failed" })
  }
})

const SHOPPING_FALLBACK = [
  {
    id: "fallback-1",
    name: "Philips Avent Biberon Seti",
    prices: [
      { store: "WOMIO Market", price: 749, oldPrice: 899, delivery: "1-2 gun", url: "https://womio.net" },
      { store: "Partner Store A", price: 779, delivery: "Yarin kargo", url: "https://example.com" },
      { store: "Partner Store B", price: 789, delivery: "2 gun", url: "https://example.org" },
    ],
  },
  {
    id: "fallback-2",
    name: "Xiaomi Akilli Baskul",
    prices: [
      { store: "WOMIO Market", price: 999, oldPrice: 1199, delivery: "1 gun", url: "https://womio.net" },
      { store: "Partner Store A", price: 1049, delivery: "Yarin kargo", url: "https://example.com" },
      { store: "Partner Store B", price: 1089, delivery: "2 gun", url: "https://example.org" },
    ],
  },
  {
    id: "fallback-3",
    name: "Apple iPhone 17 Pro 256GB",
    prices: [
      { store: "WOMIO Market", price: 94999, oldPrice: 99999, delivery: "1-2 gun", url: "https://womio.net" },
      { store: "Partner Store A", price: 95999, delivery: "Yarin kargo", url: "https://example.com" },
      { store: "Partner Store B", price: 96999, delivery: "2 gun", url: "https://example.org" },
    ],
  },
  {
    id: "fallback-4",
    name: "Apple iPhone 16 Pro 256GB",
    prices: [
      { store: "WOMIO Market", price: 85999, oldPrice: 89999, delivery: "1-2 gun", url: "https://womio.net" },
      { store: "Partner Store A", price: 86999, delivery: "Yarin kargo", url: "https://example.com" },
      { store: "Partner Store B", price: 87999, delivery: "2 gun", url: "https://example.org" },
    ],
  },
]

const safeNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const parsePriceValue = (value) => {
  if (typeof value === "number") return safeNumber(value)
  const raw = `${value ?? ""}`.trim()
  if (!raw) return 0
  const cleaned = raw.replace(/[^\d,.\-]/g, "")
  const hasComma = cleaned.includes(",")
  const hasDot = cleaned.includes(".")
  let normalized = cleaned
  if (hasComma && hasDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".")
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".")
  }
  return safeNumber(normalized)
}

const normalizeText = (text) =>
  `${text ?? ""}`
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const tokenize = (text) => normalizeText(text).split(" ").filter(Boolean)

const levenshtein = (a, b) => {
  const s = `${a ?? ""}`
  const t = `${b ?? ""}`
  if (!s.length) return t.length
  if (!t.length) return s.length

  const matrix = Array.from({ length: s.length + 1 }, () => Array(t.length + 1).fill(0))
  for (let i = 0; i <= s.length; i++) matrix[i][0] = i
  for (let j = 0; j <= t.length; j++) matrix[0][j] = j

  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  return matrix[s.length][t.length]
}

const similarity = (a, b) => {
  const s = normalizeText(a)
  const t = normalizeText(b)
  if (!s || !t) return 0
  if (s === t) return 1
  const dist = levenshtein(s, t)
  const maxLen = Math.max(s.length, t.length)
  return maxLen ? 1 - dist / maxLen : 0
}

const scoreProductMatch = (query, productName) => {
  const q = normalizeText(query)
  const p = normalizeText(productName)
  if (!q || !p) return 0
  if (p.includes(q)) return 1

  const qTokens = tokenize(q)
  const pTokens = tokenize(p)
  if (!qTokens.length || !pTokens.length) return 0

  let hitCount = 0
  let fuzzyTotal = 0
  for (const qt of qTokens) {
    if (p.includes(qt)) {
      hitCount += 1
      fuzzyTotal += 1
      continue
    }
    let best = 0
    for (const pt of pTokens) {
      const s = similarity(qt, pt)
      if (s > best) best = s
    }
    if (best >= 0.82) hitCount += 1
    fuzzyTotal += best
  }

  const coverage = hitCount / qTokens.length
  const fuzzyAvg = fuzzyTotal / qTokens.length
  const startsBonus = pTokens.some((pt) => qTokens.some((qt) => pt.startsWith(qt.slice(0, 3)))) ? 0.08 : 0
  return Math.min(1, coverage * 0.65 + fuzzyAvg * 0.35 + startsBonus)
}

const normalizeProducts = (items = []) =>
  items
    .map((item, index) => ({
      id: `${item.id ?? `item-${index}`}`,
      name: `${item.name ?? item.title ?? ""}`.trim(),
      image: item.image ? `${item.image}`.trim() : undefined,
      rating: safeNumber(item.rating),
      reviewCount: safeNumber(item.reviewCount),
      prices: Array.isArray(item.prices)
        ? item.prices
            .map((priceRow, rowIndex) => ({
              store: `${priceRow.store ?? `Store ${rowIndex + 1}`}`.trim(),
              price: parsePriceValue(priceRow.price),
              oldPrice:
                priceRow.oldPrice === undefined ? undefined : parsePriceValue(priceRow.oldPrice),
              delivery: `${priceRow.delivery ?? "2 gun"}`.trim(),
              url: priceRow.url ? `${priceRow.url}`.trim() : undefined,
            }))
            .filter((row) => row.price > 0)
        : [],
    }))
    .filter((item) => item.name.length > 0 && item.prices.length > 0)

const rankProductsByQuery = (items, query) => {
  const q = normalizeText(query)
  if (!q) return []
  const minScore = q.length >= 5 ? 0.42 : 0.5
  const ranked = [...items]
    .map((item) => ({ item, score: scoreProductMatch(q, item.name) }))
    .sort((a, b) => b.score - a.score)

  const strong = ranked.filter((entry) => entry.score >= minScore)
  if (strong.length > 0) {
    return strong.map((entry) => entry.item)
  }

  // If strict threshold yields nothing, return closest suggestions instead of empty list.
  const soft = ranked.filter((entry) => entry.score >= 0.2).slice(0, 5).map((entry) => entry.item)
  if (soft.length > 0) return soft
  return ranked.slice(0, 5).map((entry) => entry.item)
}

const filterFallbackByQuery = (query) => rankProductsByQuery(SHOPPING_FALLBACK, query)

const buildFoodFallbackImageUrl = (query = "Yemek") => {
  const text = encodeURIComponent(`${query}`.slice(0, 90))
  return `https://dummyimage.com/1200x800/f4e8dd/4a342a.png&text=${text}`
}

const pickBestImageFromSerp = (data) => {
  const items = Array.isArray(data?.images_results) ? data.images_results : []
  for (const item of items) {
    const url = `${item?.original || item?.thumbnail || ""}`.trim()
    if (url.startsWith("http://") || url.startsWith("https://")) return url
  }
  return ""
}

const fetchWikimediaImage = async (query) => {
  const q = `${query ?? ""}`.trim()
  if (!q) return ""

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: q,
    gsrnamespace: "6", // File namespace on Commons
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "1200",
    origin: "*",
  })

  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`)
  if (!response.ok) throw new Error(`Wikimedia failed: ${response.status}`)
  const data = await response.json()
  const pages = data?.query?.pages ? Object.values(data.query.pages) : []
  for (const page of pages) {
    const info = Array.isArray(page?.imageinfo) ? page.imageinfo[0] : null
    const url = `${info?.thumburl || info?.url || ""}`.trim()
    if (url.startsWith("http://") || url.startsWith("https://")) return url
  }
  return ""
}

const fetchSerpApiImage = async ({ query, source = "google" }) => {
  const apiKey = `${process.env.SERPAPI_API_KEY ?? ""}`.trim()
  if (!apiKey || !query) return ""

  const engine = source === "yandex" ? "yandex_images" : "google_images"
  const params = new URLSearchParams({
    engine,
    q: query,
    hl: process.env.SERPAPI_HL || "tr",
    gl: process.env.SERPAPI_GL || "tr",
    api_key: apiKey,
  })

  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`SerpApi image failed: ${response.status}`)
  }
  const data = await response.json()
  return pickBestImageFromSerp(data)
}

const fetchProxyProducts = async ({ endpoint, apiKey, query }) => {
  if (!endpoint) return []

  const headers = {}
  if (apiKey) {
    headers["x-api-key"] = apiKey
  }

  const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, { headers })
  if (!response.ok) {
    throw new Error(`Provider failed: ${response.status}`)
  }

  const data = await response.json()
  const candidate = Array.isArray(data) ? data : data.products
  return rankProductsByQuery(normalizeProducts(candidate), query)
}

app.get("/food/image-search", async (req, res) => {
  try {
    const query = `${req.query?.q ?? ""}`.trim()
    const sourceRaw = `${req.query?.source ?? "google"}`.trim().toLowerCase()
    const source = sourceRaw === "yandex" ? "yandex" : "google"
    const fallback = `${req.query?.fallback ?? ""}`.trim()
    const fallbackUrl = fallback || buildFoodFallbackImageUrl(query || "Yemek")

    if (!query) {
      return res.redirect(fallbackUrl)
    }

    const imageUrl = await fetchSerpApiImage({ query, source })
    if (imageUrl) {
      return res.redirect(imageUrl)
    }

    return res.redirect(fallbackUrl)
  } catch (error) {
    console.error("Food image search error:", error?.message ?? error)
    const query = `${req.query?.q ?? "Yemek"}`
    const fallback = `${req.query?.fallback ?? ""}`.trim()
    return res.redirect(fallback || buildFoodFallbackImageUrl(query))
  }
})

app.get("/food/wiki-image", async (req, res) => {
  try {
    const query = `${req.query?.q ?? ""}`.trim()
    const fallback = `${req.query?.fallback ?? ""}`.trim()
    const fallbackUrl = fallback || buildFoodFallbackImageUrl(query || "Yemek")
    if (!query) return res.redirect(fallbackUrl)

    const imageUrl = await fetchWikimediaImage(query)
    return res.redirect(imageUrl || fallbackUrl)
  } catch (error) {
    console.error("Food wiki-image error:", error?.message ?? error)
    const query = `${req.query?.q ?? "Yemek"}`
    const fallback = `${req.query?.fallback ?? ""}`.trim()
    return res.redirect(fallback || buildFoodFallbackImageUrl(query))
  }
})

const extractSerpShoppingResults = (data) => {
  const byPrimary = Array.isArray(data?.shopping_results) ? data.shopping_results : []
  if (byPrimary.length > 0) return byPrimary

  const byInline = Array.isArray(data?.inline_shopping_results) ? data.inline_shopping_results : []
  if (byInline.length > 0) return byInline

  const byOrganic = Array.isArray(data?.organic_results)
    ? data.organic_results.filter((item) => {
        const hasPrice =
          item?.price ||
          item?.extracted_price ||
          item?.price_from ||
          item?.price_to ||
          item?.extensions?.some?.((x) => /\d/.test(`${x ?? ""}`))
        const hasOfferLink = item?.offer_link || item?.merchant_link || item?.product_link
        return Boolean(hasPrice || hasOfferLink)
      })
    : []
  if (byOrganic.length > 0) return byOrganic

  return []
}

const fetchSerpApiProducts = async ({ query }) => {
  const apiKey = `${process.env.SERPAPI_API_KEY ?? ""}`.trim()
  if (!apiKey) return []

  const runSerpRequest = async (extraParams = {}) => {
    const params = new URLSearchParams({
      q: query,
      gl: process.env.SERPAPI_GL || "tr",
      hl: process.env.SERPAPI_HL || "tr",
      num: process.env.SERPAPI_NUM || "25",
      api_key: apiKey,
      ...extraParams,
    })

    const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`)
    if (!response.ok) {
      const body = await response.text().catch(() => "")
      throw new Error(`SerpApi failed: ${response.status}${body ? ` ${body.slice(0, 140)}` : ""}`)
    }
    return response.json()
  }

  let data = null
  try {
    data = await runSerpRequest({ engine: "google_shopping" })
  } catch (error) {
    console.warn("SerpApi google_shopping failed:", error?.message ?? error)
  }
  let results = extractSerpShoppingResults(data)

  // Some regions/accounts return empty shopping_results for google_shopping.
  // Try classic google engine + tbm=shop as fallback.
  if (results.length === 0) {
    try {
      data = await runSerpRequest({ engine: "google", tbm: "shop" })
      results = extractSerpShoppingResults(data)
    } catch (error) {
      console.warn("SerpApi google tbm=shop failed:", error?.message ?? error)
    }
  }

  const toStoreSearchUrl = (storeName, productName) => {
    const s = normalizeText(storeName)
    const q = encodeURIComponent(`${productName ?? ""}`.trim())
    if (!s || !q) return ""

    if (s.includes("hepsiburada")) return `https://www.hepsiburada.com/ara?q=${q}`
    if (s.includes("trendyol")) return `https://www.trendyol.com/sr?q=${q}`
    if (s.includes("amazon")) return `https://www.amazon.com.tr/s?k=${q}`
    if (s.includes("n11")) return `https://www.n11.com/arama?q=${q}`
    if (s.includes("teknosa")) return `https://www.teknosa.com/arama?q=${q}`
    if (s.includes("mediamarkt")) return `https://www.mediamarkt.com.tr/tr/search.html?query=${q}`
    if (s.includes("pttavm")) return `https://www.pttavm.com/arama?q=${q}`
    if (s.includes("ciceksepeti")) return `https://www.ciceksepeti.com/arama?query=${q}`
    if (s.includes("boyner")) return `https://www.boyner.com.tr/arama?q=${q}`
    if (s.includes("lc waikiki") || s.includes("lcw")) return `https://www.lcw.com/arama?q=${q}`
    if (s.includes("defacto")) return `https://www.defacto.com.tr/arama?q=${q}`
    if (s.includes("migros")) return `https://www.migros.com.tr/arama?q=${q}`
    if (s.includes("carrefour")) return `https://www.carrefoursa.com/arama?q=${q}`
    if (s.includes("vatan")) return `https://www.vatanbilgisayar.com/arama/${q}/`
    if (s.includes("idefix")) return `https://www.idefix.com/ara?q=${q}`
    if (s.includes("kitapyurdu")) return `https://www.kitapyurdu.com/index.php?route=product/search&filter_name=${q}`
    if (s.includes("d-r") || s.includes("dr ")) return `https://www.dr.com.tr/search?q=${q}`
    if (s.includes("mavi")) return `https://www.mavi.com/arama?q=${q}`
    if (s.includes("flo")) return `https://www.flo.com.tr/arama?q=${q}`
    if (s.includes("in street") || s.includes("instreet")) return `https://www.instreet.com.tr/arama?q=${q}`
    if (s.includes("watsons")) return `https://www.watsons.com.tr/search?text=${q}`
    if (s.includes("gratis")) return `https://www.gratis.com/arama?q=${q}`
    if (s.includes("rossmann")) return `https://www.rossmann.com.tr/arama?q=${q}`
    if (s.includes("koctas")) return `https://www.koctas.com.tr/arama?q=${q}`
    if (s.includes("ikea")) return `https://www.ikea.com/tr/tr/search/?q=${q}`
    if (s.includes("ebebek")) return `https://www.e-bebek.com/arama?q=${q}`
    if (s.includes("civil")) return `https://www.civilim.com/arama?q=${q}`
    if (s.includes("avansas")) return `https://www.avansas.com/arama/${q}`
    if (s.includes("hepsijet")) return ""
    if (s.includes("akakce")) return `https://www.akakce.com/arama/?q=${q}`
    if (s.includes("cimri")) return `https://www.cimri.com/arama?q=${q}`
    if (s.includes("epey")) return `https://www.epey.com/ara/${q}/`
    return ""
  }

  const mapped = results.map((item, index) => {
    const title = `${item?.title ?? ""}`.trim()
    const store =
      `${item?.source ?? item?.seller ?? item?.merchant ?? item?.extensions?.[0] ?? "Store"}`.trim()
    const price = parsePriceValue(item?.extracted_price ?? item?.price)
    const oldPrice = parsePriceValue(item?.extracted_old_price ?? item?.old_price)
    const delivery = Array.isArray(item?.delivery_options)
      ? `${item.delivery_options[0] ?? "2 gun"}`
      : `${item?.delivery ?? item?.shipping ?? "2 gun"}`
    const storeDirectUrl = toStoreSearchUrl(store, title)
    const rawUrl =
      storeDirectUrl ||
      `${item?.link ?? item?.offer_link ?? item?.merchant_link ?? item?.product_link ?? ""}`.trim()

    return {
      id: `${item?.product_id ?? item?.position ?? `serp-${index}`}`,
      name: title,
      image: item?.thumbnail ? `${item.thumbnail}` : undefined,
      rating: safeNumber(item?.rating),
      reviewCount: safeNumber(item?.reviews),
      prices: price > 0
        ? [
            {
              store,
              price,
              oldPrice: oldPrice > price ? oldPrice : undefined,
              delivery,
              url: rawUrl || undefined,
            },
          ]
        : [],
    }
  })

  return rankProductsByQuery(normalizeProducts(mapped), query)
}

const buildAffiliateRedirectUrl = ({ req, targetUrl, source = "shopping", product = "", store = "" }) => {
  try {
    const parsed = new URL(targetUrl)
    if (!["http:", "https:"].includes(parsed.protocol)) return null

    parsed.searchParams.set("utm_source", "womio")
    parsed.searchParams.set("utm_medium", "affiliate")
    parsed.searchParams.set("utm_campaign", "shopping_compare")
    if (source) parsed.searchParams.set("utm_content", `${source}`)
    if (product) parsed.searchParams.set("womio_product", `${product}`.slice(0, 80))
    if (store) parsed.searchParams.set("womio_store", `${store}`.slice(0, 50))

    const host = `${req.protocol}://${req.get("host")}`
    return `${host}/shopping/out?url=${encodeURIComponent(parsed.toString())}`
  } catch {
    return null
  }
}

const attachAffiliateLinks = (products, req, source) =>
  products.map((product) => ({
    ...product,
    prices: product.prices.map((price) => ({
      ...price,
      url: price.url
        ? buildAffiliateRedirectUrl({
            req,
            targetUrl: price.url,
            source,
            product: product.name,
            store: price.store,
          }) || price.url
        : undefined,
    })),
  }))

// 🔥 OpenAI bağlantısı
const buildTarotFallbackAnswer = ({ question, context }) => {
  const qRaw = `${question ?? ""}`.trim()
  const q = qRaw.toLocaleLowerCase("tr-TR")

  const isGreeting = ["selam", "merhaba", "hey", "slm", "gunaydin", "günaydın", "iyi aksamlar", "iyi akşamlar"].some((w) => q === w || q.startsWith(`${w} `))
  const isThanks = ["tesekkur", "teşekkür", "sag ol", "sağ ol", "eyvallah", "thanks"].some((w) => q.includes(w))
  const isOk = ["tamam", "ok", "oke", "anladim", "anladım", "peki"].some((w) => q === w)

  if (isGreeting) {
    return "Selam. İstersen kartına göre aşk, kariyer ya da günün enerjisi hakkında net bir soru sor; kısa ve net yorumlayayım."
  }
  if (isThanks) {
    return "Rica ederim. İstersen biraz daha detay ver: konu aşk mı kariyer mi, bugün mü bu hafta mı?"
  }
  if (isOk) {
    return "Tamam. İstersen bir cümleyle neyi netleştirmek istediğini yaz; kartlarına göre yorumlayayım."
  }

  const tarotType = `${context?.tarotType ?? "daily"}`.trim()
  const drawMode = `${context?.drawMode ?? "single"}`.trim()
  const intention = `${context?.intention ?? ""}`.trim()
  const cardSummary = `${context?.cardSummary ?? ""}`.trim()
  const focus = `${context?.focus ?? ""}`.trim()
  const caution = `${context?.caution ?? ""}`.trim()

  const intro = drawMode === "spread" ? "3 kart açılımının verdiği ana mesaj şu:" : "Kartının verdiği ana mesaj şu:"
  const intentLine = intention ? `Niyetine göre (${intention}) yorumlarsam:` : "Genel yorum:"
  const cardLine = cardSummary ? `Kart: ${cardSummary}.` : ""
  const focusLine = focus ? `Bugün odak: ${focus}` : "Bugün odak: tek bir öncelik belirleyip onu bitirmek."
  const cautionLine = caution ? `Dikkat: ${caution}` : "Dikkat: acele karar ve gereksiz erteleme."

  const followUp =
    tarotType === "love"
      ? "İstersen partnerinle ilgili tek bir somut örnek ver, ona göre daha net konuşayım."
      : tarotType === "career"
        ? "İstersen hedefini (ör. görüşme, teklif, zam) yaz; bir sonraki adımı netleştireyim."
        : "İstersen bugünle ilgili tek bir konu seç (ilişki/iş/para/ruh hali) ve onu yaz."

  return `${intro} ${intentLine} ${cardLine} ${focusLine} ${cautionLine} ${followUp}`
}

const preferredProvider = `${process.env.AI_PROVIDER ?? "openai"}`.trim().toLowerCase()
const explicitModel = `${process.env.AI_MODEL ?? ""}`.trim()

const openrouterClient = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://womio.net",
        "X-Title": "WOMIO",
      },
    })
  : null

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

const resolveAiClient = () => {
  const candidates =
    preferredProvider === "openai"
      ? [
          { provider: "openai", client: openaiClient },
          { provider: "openrouter", client: openrouterClient },
        ]
      : [
          { provider: "openrouter", client: openrouterClient },
          { provider: "openai", client: openaiClient },
        ]

  for (const item of candidates) {
    if (item.client) return item
  }

  return { provider: "none", client: null }
}

const getDefaultModel = (provider) => {
  if (explicitModel) return explicitModel
  if (provider === "openrouter") return "meta-llama/llama-3.3-70b-instruct:free"
  return "gpt-4o-mini"
}

const createAiChatCompletion = async ({ messages, temperature = 0.7 }) => {
  const { provider, client } = resolveAiClient()
  if (!client) {
    throw new Error("AI client is not configured. Add OPENROUTER_API_KEY or OPENAI_API_KEY.")
  }

  return client.chat.completions.create({
    model: getDefaultModel(provider),
    temperature,
    messages,
  })
}

const safeParseJson = (text) => {
  const raw = `${text ?? ""}`.trim()
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    // Try to salvage JSON object from surrounding text.
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

const clampPercent = (value, fallback = 0) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(100, Math.round(n)))
}

const isLikelyImagePayload = (value) => {
  const v = `${value ?? ""}`.trim()
  if (!v) return false
  if (v.startsWith("data:image/")) return true
  if (v.startsWith("http://") || v.startsWith("https://")) return true
  return false
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const pickOutputImage = (value) => {
  if (typeof value === "string") {
    const v = value.trim()
    return isLikelyImagePayload(v) ? v : ""
  }
  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      const candidate = pickOutputImage(value[i])
      if (candidate) return candidate
    }
  }
  if (value && typeof value === "object") {
    const direct = `${value.url ?? value.image ?? value.output ?? ""}`.trim()
    if (isLikelyImagePayload(direct)) return direct
  }
  return ""
}

const beautifyPrompt = ({ makeup = 40, young = 30, smooth = 45 }) => `
Edit this face photo in a natural style.
- Makeup strength: ${makeup}/100
- Younger look: ${young}/100
- Skin smoothing: ${smooth}/100
Rules:
- Keep the same person identity.
- Keep realistic skin texture, avoid plastic look.
- Keep background composition similar.
- No text, no watermark, no logo.
Output:
- Return a single edited image only.
`.trim()

app.post("/photo-lab/beautify", async (req, res) => {
  try {
    const inputImage = `${req.body?.image ?? ""}`.trim()
    if (!isLikelyImagePayload(inputImage)) {
      return res.status(400).json({ ok: false, error: "image is required (data:image/* or http(s) URL)" })
    }

    const options = req.body?.options ?? {}
    const makeup = clampPercent(options?.makeup, 40)
    const young = clampPercent(options?.young, 30)
    const smooth = clampPercent(options?.smooth, 45)

    const modelVersion = `${process.env.FACE_EDIT_PROVIDER_MODEL_VERSION ?? ""}`.trim()
    const providerUrl = `${process.env.FACE_EDIT_PROVIDER_URL ?? ""}`.trim()
    const providerKey = `${process.env.FACE_EDIT_PROVIDER_KEY ?? ""}`.trim()

    // Replicate direct integration (async prediction + polling).
    const isReplicatePredictions = providerUrl.includes("replicate.com") && providerUrl.includes("/v1/predictions")
    if (isReplicatePredictions && modelVersion) {
      if (!providerKey) {
        return res.status(500).json({ ok: false, error: "provider_key_missing" })
      }

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${providerKey}`,
      }
      const createResponse = await fetch(providerUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          version: modelVersion,
          input: {
            image: inputImage,
            prompt: beautifyPrompt({ makeup, young, smooth }),
            makeup_strength: Number((makeup / 100).toFixed(2)),
            young_strength: Number((young / 100).toFixed(2)),
            smooth_strength: Number((smooth / 100).toFixed(2)),
          },
        }),
      })

      if (!createResponse.ok) {
        const errText = await createResponse.text().catch(() => "")
        return res.status(502).json({
          ok: false,
          error: "replicate_create_failed",
          details: `${createResponse.status} ${errText}`.slice(0, 320),
        })
      }

      let prediction = await createResponse.json()
      const pollMax = Math.max(1, Number(process.env.FACE_EDIT_POLL_MAX || 25))
      const pollDelayMs = Math.max(500, Number(process.env.FACE_EDIT_POLL_DELAY_MS || 1500))

      let status = `${prediction?.status ?? ""}`.trim()
      for (let i = 0; i < pollMax && !["succeeded", "failed", "canceled"].includes(status); i++) {
        const pollUrl = `${prediction?.urls?.get ?? ""}`.trim() || (prediction?.id ? `${providerUrl}/${prediction.id}` : "")
        if (!pollUrl) break
        await sleep(pollDelayMs)
        const pollResponse = await fetch(pollUrl, { headers })
        if (!pollResponse.ok) {
          const errText = await pollResponse.text().catch(() => "")
          return res.status(502).json({
            ok: false,
            error: "replicate_poll_failed",
            details: `${pollResponse.status} ${errText}`.slice(0, 320),
          })
        }
        prediction = await pollResponse.json()
        status = `${prediction?.status ?? ""}`.trim()
      }

      if (`${prediction?.status ?? ""}`.trim() !== "succeeded") {
        return res.status(502).json({
          ok: false,
          error: "replicate_not_succeeded",
          status: `${prediction?.status ?? "unknown"}`,
        })
      }

      const outputImage = pickOutputImage(prediction?.output)
      if (!isLikelyImagePayload(outputImage)) {
        return res.status(502).json({ ok: false, error: "replicate_invalid_output" })
      }
      return res.json({
        ok: true,
        source: "replicate",
        outputImage,
      })
    }

    // Generic provider bridge: connect any other face-edit service without changing mobile app.
    if (providerUrl) {
      const headers = { "Content-Type": "application/json" }
      if (providerKey) headers.Authorization = `Bearer ${providerKey}`
      const response = await fetch(providerUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          image: inputImage,
          options: { makeup, young, smooth },
          prompt: beautifyPrompt({ makeup, young, smooth }),
        }),
      })
      if (!response.ok) {
        const errText = await response.text().catch(() => "")
        return res.status(502).json({
          ok: false,
          error: "provider_request_failed",
          details: `${response.status} ${errText}`.slice(0, 320),
        })
      }

      const data = await response.json()
      const outputImage = `${data?.outputImage ?? data?.image ?? data?.result ?? ""}`.trim()
      if (!isLikelyImagePayload(outputImage)) {
        return res.status(502).json({ ok: false, error: "provider_invalid_output" })
      }
      return res.json({
        ok: true,
        source: "face-provider",
        outputImage,
      })
    }

    return res.status(501).json({
      ok: false,
      error: "face_provider_not_configured",
      hint: "Set FACE_EDIT_PROVIDER_URL, FACE_EDIT_PROVIDER_MODEL_VERSION and FACE_EDIT_PROVIDER_KEY.",
    })
  } catch (error) {
    console.error("Photo lab beautify error:", error?.message ?? error)
    return res.status(500).json({ ok: false, error: "photo_lab_failed" })
  }
})

app.post("/astrology/coffee-verify", async (req, res) => {
  try {
    const images = Array.isArray(req.body?.images) ? req.body.images.slice(0, 3) : []
    if (images.length < 1) {
      return res.status(400).json({ ok: false, error: "images is required" })
    }

    const { provider, client } = resolveAiClient()
    if (!client) {
      return res.json({
        ok: true,
        source: "no-ai",
        overall: { isCup: null, confidence: 0 },
        results: images.map(() => ({ isCup: null, confidence: 0, label: "unknown" })),
      })
    }

    // Prefer a vision-capable model if configured; otherwise use a reasonable default.
    const visionModel =
      process.env.COFFEE_VISION_MODEL ||
      (provider === "openrouter" ? "openai/gpt-4o-mini" : "gpt-4o-mini")

    const instruction = `
You are an image classifier for a Turkish coffee fortune-telling app.
Task:
- For each image, decide whether it shows a coffee cup / mug (preferably the inside with grounds) suitable for "kahve fal\u0131".
- Return strict JSON only.
Output schema:
{
  "overall": { "isCup": true|false, "confidence": 0-1 },
  "results": [
    { "index": 0, "isCup": true|false, "confidence": 0-1, "label": "cup|not_cup", "reason": "short" }
  ]
}
Rules:
- Be conservative: random landscapes/selfies/screenshots => not_cup.
- If uncertain, set isCup=false and confidence around 0.55-0.7.
`

    const content = [{ type: "text", text: instruction }]
    for (const img of images) {
      content.push({ type: "image_url", image_url: { url: `${img}` } })
    }

    const response = await client.chat.completions.create({
      model: visionModel,
      temperature: 0.2,
      messages: [{ role: "user", content }],
    })

    const out = `${response.choices?.[0]?.message?.content ?? ""}`.trim()
    const parsed = safeParseJson(out)
    if (!parsed || !Array.isArray(parsed.results) || !parsed.overall) {
      return res.json({
        ok: true,
        source: "ai-unparsed",
        overall: { isCup: null, confidence: 0 },
        results: images.map(() => ({ isCup: null, confidence: 0, label: "unknown" })),
      })
    }

    const results = parsed.results
      .map((r) => ({
        index: Number.isFinite(Number(r.index)) ? Number(r.index) : 0,
        isCup: Boolean(r.isCup),
        confidence: Number(r.confidence) || 0,
        label: `${r.label ?? ""}`.trim() || (r.isCup ? "cup" : "not_cup"),
        reason: `${r.reason ?? ""}`.trim(),
      }))
      .slice(0, images.length)

    const overall = {
      isCup: Boolean(parsed.overall?.isCup),
      confidence: Number(parsed.overall?.confidence) || 0,
    }

    return res.json({ ok: true, source: "ai", overall, results })
  } catch (error) {
    console.error("Coffee verify error:", error)
    return res.json({
      ok: true,
      source: "fallback",
      overall: { isCup: null, confidence: 0 },
      results: Array.isArray(req.body?.images)
        ? req.body.images.slice(0, 3).map((_, index) => ({ index, isCup: null, confidence: 0, label: "unknown", reason: "error" }))
        : [],
    })
  }
})

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length]
const hashSeed = (s) => {
  const str = `${s ?? ""}`
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h | 0
}

const buildCoffeeFallbackReading = ({ intention = "", imagesCount = 1 }) => {
  const dayKey = new Date().toISOString().slice(0, 10)
  const seed = hashSeed(`${dayKey}|${intention}|${imagesCount}`)

  const energy = [
    "Fincanin enerjisi genel olarak yumusak ama kararli: zihnin toparlaniyor, odagin netlesiyor.",
    "Genel enerji canlaniyor. Bir suredir erteledigini toparlama istegi yukseliyor.",
    "Enerji dalgali ama olumlu: once kucuk bir duzen, sonra hizli bir acilma gorunuyor.",
  ]
  const near = [
    "Onumuzdeki 7-14 gun icinde iki ayri konu ayni anda hareketleniyor: biri ev/duzen, digeri plan/para tarafinda.",
    "Yakinda bir haber ya da mesaj akisi var. Netlestirdikce rahatlayacaksin.",
    "Kisa vadede once bir bekleme, sonra hizli bir karar gorunuyor.",
  ]
  const love = [
    "Ask tarafinda kalp kisimlari temiz. Iletisim acik olursa hizli bir yumusama var.",
    "Iliskilerde sinirlarini nazikce korumak sana iyi gelecek. Netlik, tartismayi buyutmez; azaltir.",
    "Gecmisten gelen bir konu tekrar gundeme gelebilir; bu kez daha olgun bir dille kapanis var.",
  ]
  const money = [
    "Para tarafinda kucuk ama etkili bir tasarruf gorunuyor. Harcama kalemlerini ayirirsan rahat edersin.",
    "Ani bir harcama ihtimali var; oncesinde karsilastirma yapmak avantaj saglar.",
    "Gelir-gider dengesi toparlaniyor. Parca parca birikim daha iyi calisir.",
  ]
  const career = [
    "Is/kariyer tarafinda yeni bir sorumluluk ya da gorev paylasimi gorunuyor; net planla guclenir.",
    "Bir gorusme ya da yazisma ciddilesebilir. Kisa, net ve zamanli cevaplar seni one cikarir.",
    "Uretkenlik artiyor. 'Once kolay isleri bitir' stratejisi bugunlerde cok iyi calisir.",
  ]
  const symbols = [
    ["Yol", "Kisa bir gidis-gelis ya da yon degisikligi"],
    ["Kus", "Haber, mesaj, davet"],
    ["Kalp", "Duygusal netlik ve yakinlasma"],
    ["Anahtar", "Cozum, acilan bir kapi"],
    ["Yildiz", "Sansin acildigi bir an"],
    ["Dag", "Sabir isteyen ama asilan bir engel"],
  ]

  const chosenSymbols = [pick(symbols, seed), pick(symbols, seed + 7), pick(symbols, seed + 17)]

  const advice = [
    "Bugun tek bir oncelik belirle ve onu bitir: zihinsel yuku hizla azaltir.",
    "Karar verirken iki secenek yap: gerekli / erteleyebilirim. Geri kalanini listele.",
    "Kucuk bir duzenleme (dolap/masa/telefon) enerjiyi aninda temizler.",
  ]

  const title = intention
    ? `Niyetine gore yorum: \"${`${intention}`.slice(0, 120)}\"`
    : "Genel enerjiye gore yorum"

  return [
    title,
    "",
    "Genel enerji",
    pick(energy, seed),
    "",
    "Yakin gelecek (7-14 gun)",
    pick(near, seed + 1),
    "",
    "Ask",
    pick(love, seed + 2),
    "",
    "Para",
    pick(money, seed + 3),
    "",
    "Is/Kariyer",
    pick(career, seed + 4),
    "",
    "Semboller ve anlamlari",
    ...chosenSymbols.map(([a, b]) => `- ${a}: ${b}`),
    "",
    "Net tavsiye",
    `- ${pick(advice, seed + 5)}`,
    `- ${pick(advice, seed + 11)}`,
  ].join("\n")
}

app.post("/astrology/coffee-reading", async (req, res) => {
  try {
    const images = Array.isArray(req.body?.images) ? req.body.images.slice(0, 3) : []
    const intention = `${req.body?.intention ?? ""}`.slice(0, 280)

    if (images.length < 1) {
      return res.status(400).json({ ok: false, error: "images is required" })
    }

    const { provider, client } = resolveAiClient()
    if (!client) {
      return res.json({
        ok: true,
        source: "fallback",
        reading: buildCoffeeFallbackReading({ intention, imagesCount: images.length }),
      })
    }

    const visionModel =
      process.env.COFFEE_READING_MODEL ||
      process.env.COFFEE_VISION_MODEL ||
      (provider === "openrouter" ? "openai/gpt-4o-mini" : "gpt-4o-mini")

    const rules = `
You are WOMIO's Turkish coffee fortune reader.
Write in Turkish only.
Tone: warm, premium, conversational, detailed (but not too long).
This is for entertainment and self-reflection, not factual advice.

Input:
- 1 to 3 photos of a coffee cup (preferably inside with grounds).
- Optional intention text (user's question).

Output requirements:
- Use clear section headings.
- Be specific and varied; avoid generic repeated sentences.
- Include:
  1) Genel enerji
  2) Yakın gelecek (7-14 gün)
  3) Aşk
  4) Para
  5) İş/Kariyer
  6) Semboller ve anlamları (3-6 bullet points)
  7) Net tavsiye (2-3 actionable bullets)
- Do NOT mention model names or that you are an AI.
`

    const userIntro = intention
      ? `Niyet / soru: "${intention}". Bu niyete gore yorumla.`
      : "Niyet verilmedi. Genel enerjiye gore yorumla."

    const content = [{ type: "text", text: rules + "\n\n" + userIntro }]
    for (const img of images) {
      content.push({ type: "image_url", image_url: { url: `${img}` } })
    }

    const response = await client.chat.completions.create({
      model: visionModel,
      temperature: 0.85,
      messages: [{ role: "user", content }],
    })

    const reading = `${response.choices?.[0]?.message?.content ?? ""}`.trim()
    if (!reading) {
      return res.status(500).json({ ok: false, error: "empty model response" })
    }

    return res.json({ ok: true, source: "ai", reading })
  } catch (error) {
    console.error("Coffee reading error:", error)
    return res.json({
      ok: true,
      source: "fallback",
      reading: buildCoffeeFallbackReading({
        intention: `${req.body?.intention ?? ""}`.slice(0, 280),
        imagesCount: Array.isArray(req.body?.images) ? req.body.images.slice(0, 3).length : 1,
      }),
    })
  }
})

// 🔥 Health check (tarayıcı testi için)
app.get("/", (req, res) => {
  res.send("WOMIO AI backend running 🚀")
})

// 🔥 Mood AI endpoint
app.post("/mood-ai", async (req, res) => {
  console.log("Mood AI endpoint hit")

  try {
    const { history } = req.body

    if (!history || history.length === 0) {
      return res.status(400).json({ error: "No history data provided" })
    }

    const prompt = `
Kullanıcının son ruh hali verileri:
${JSON.stringify(history)}

Bu verilere göre:
- Kısa
- Sıcak
- Destekleyici
- Motive edici
bir öneri üret.
`

    const response = await createAiChatCompletion({
      temperature: 0.75,
      messages: [
        {
          role: "system",
          content:
            "Sen kadınlara destek olan pozitif ve empatik bir yaşam koçusun.",
        },
        { role: "user", content: prompt },
      ],
    })

    const aiText = response.choices[0].message.content

    res.json({ result: aiText })
  } catch (error) {
    console.error("AI ERROR:", error)
    res.status(500).json({ error: "AI processing failed" })
  }
})

app.post("/astrology/tarot-chat", async (req, res) => {
  try {
    const { question, context, history } = req.body ?? {}
    const safeQuestion = `${question ?? ""}`.trim()

    if (!safeQuestion) {
      return res.status(400).json({ error: "question is required" })
    }

    const safeContext = {
      tarotType: `${context?.tarotType ?? "daily"}`.trim(),
      drawMode: `${context?.drawMode ?? "single"}`.trim(),
      intention: `${context?.intention ?? ""}`.trim(),
      cardSummary: `${context?.cardSummary ?? ""}`.trim(),
      focus: `${context?.focus ?? ""}`.trim(),
      caution: `${context?.caution ?? ""}`.trim(),
    }

    const safeHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .map((item) => ({
            role: item?.role === "assistant" ? "assistant" : "user",
            content: `${item?.text ?? ""}`.slice(0, 600),
          }))
          .filter((item) => item.content.trim().length > 0)
      : []

    const systemPrompt = `
Sen WOMIO Tarot Asistanisin.
- Sadece Turkce cevap ver.
- Cevaplar sohbet diliyle dogal olsun; robotik/sablon olmasin.
- Kullanici selamlasirsa selamlas; tesekkur ederse kisa ve sicak yanit ver.
- Tarot baglamini kullan: kategori, kartlar, ters/duz, niyet, odak ve dikkat.
- Net ve uygulanabilir 2-5 cumlelik cevap ver.
- Tibbi/hukuki/finansal kesin tavsiye verme; falin eglenme/farkindalik oldugunu dogalca hissettir.
`

    const contextText = `
Tarot baglami:
- Kategori: ${safeContext.tarotType || "daily"}
- Acilim: ${safeContext.drawMode || "single"}
- Niyet: ${safeContext.intention || "-"}
- Kart ozeti: ${safeContext.cardSummary || "-"}
- Odak: ${safeContext.focus || "-"}
- Dikkat: ${safeContext.caution || "-"}
`

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "system", content: contextText },
      ...safeHistory,
      { role: "user", content: safeQuestion },
    ]

    const response = await createAiChatCompletion({
      temperature: 0.9,
      messages,
    })

    const answer = `${response.choices?.[0]?.message?.content ?? ""}`.trim()
    if (!answer) {
      return res.status(500).json({ error: "empty model response" })
    }

    return res.json({ answer, source: "ai" })
  } catch (error) {
    console.error("Tarot chat AI error:", error)
    const { question, context } = req.body ?? {}
    return res.json({ answer: buildTarotFallbackAnswer({ question, context }), source: "fallback" })
  }
})

app.get("/shopping/yandex", async (req, res) => {
  const q = `${req.query.q ?? ""}`.trim()
  if (!q) {
    return res.status(400).json({ error: "q is required" })
  }

  try {
    const products = await fetchProxyProducts({
      endpoint: process.env.YANDEX_PROVIDER_URL,
      apiKey: process.env.YANDEX_PROVIDER_KEY,
      query: q,
    })

    if (products.length > 0) {
      return res.json({ source: "yandex", products: attachAffiliateLinks(products, req, "yandex") })
    }

    return res.json({
      source: "fallback",
      products: attachAffiliateLinks(filterFallbackByQuery(q), req, "fallback"),
    })
  } catch (error) {
    console.error("Yandex proxy error:", error?.message ?? error)
    return res.json({
      source: "fallback",
      products: attachAffiliateLinks(filterFallbackByQuery(q), req, "fallback"),
    })
  }
})

app.get("/shopping/affiliate", async (req, res) => {
  const q = `${req.query.q ?? ""}`.trim()
  if (!q) {
    return res.status(400).json({ error: "q is required" })
  }

  try {
    const products = await fetchProxyProducts({
      endpoint: process.env.AFFILIATE_PROVIDER_URL,
      apiKey: process.env.AFFILIATE_PROVIDER_KEY,
      query: q,
    })

    if (products.length > 0) {
      return res.json({ source: "affiliate", products: attachAffiliateLinks(products, req, "affiliate") })
    }

    return res.json({
      source: "fallback",
      products: attachAffiliateLinks(filterFallbackByQuery(q), req, "fallback"),
    })
  } catch (error) {
    console.error("Affiliate proxy error:", error?.message ?? error)
    return res.json({
      source: "fallback",
      products: attachAffiliateLinks(filterFallbackByQuery(q), req, "fallback"),
    })
  }
})

app.get("/shopping/search", async (req, res) => {
  const q = `${req.query.q ?? ""}`.trim()
  if (!q) {
    return res.status(400).json({ error: "q is required" })
  }

  try {
    const serpProducts = await fetchSerpApiProducts({ query: q })
    if (serpProducts.length > 0) {
      return res.json({ source: "google_shopping", products: attachAffiliateLinks(serpProducts, req, "google_shopping") })
    }

    const yandexProducts = await fetchProxyProducts({
      endpoint: process.env.YANDEX_PROVIDER_URL,
      apiKey: process.env.YANDEX_PROVIDER_KEY,
      query: q,
    })
    if (yandexProducts.length > 0) {
      return res.json({ source: "yandex", products: attachAffiliateLinks(yandexProducts, req, "yandex") })
    }

    const affiliateProducts = await fetchProxyProducts({
      endpoint: process.env.AFFILIATE_PROVIDER_URL,
      apiKey: process.env.AFFILIATE_PROVIDER_KEY,
      query: q,
    })
    if (affiliateProducts.length > 0) {
      return res.json({ source: "affiliate", products: attachAffiliateLinks(affiliateProducts, req, "affiliate") })
    }

    return res.json({
      source: "fallback",
      products: attachAffiliateLinks(filterFallbackByQuery(q), req, "fallback"),
    })
  } catch (error) {
    console.error("Shopping search error:", error?.message ?? error)
    return res.json({
      source: "fallback",
      products: attachAffiliateLinks(filterFallbackByQuery(q), req, "fallback"),
    })
  }
})

app.get("/shopping/out", (req, res) => {
  const target = `${req.query.url ?? ""}`.trim()
  if (!target) {
    return res.status(400).send("url is required")
  }
  try {
    const parsed = new URL(target)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return res.status(400).send("invalid protocol")
    }
    console.log(`[affiliate-click] ${new Date().toISOString()} ${req.ip} -> ${parsed.hostname}${parsed.pathname}`)
    return res.redirect(parsed.toString())
  } catch {
    return res.status(400).send("invalid url")
  }
})

// 🔥 Server başlatma (çok önemli)
app.get("/health", (_req, res) => {
  return res.json({
    ok: true,
    service: "womio-backend",
    timestamp: new Date().toISOString(),
  })
})

const port = Number(process.env.PORT) || 5000
app.listen(port, "0.0.0.0", () => {
  const { provider } = resolveAiClient()
  console.log("AI provider: " + provider + " | model: " + getDefaultModel(provider))
  console.log("Server running on port " + port)
})
