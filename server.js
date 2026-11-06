const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const UPLOADS = path.join(PUBLIC, 'uploads');
const DATA = path.join(ROOT, 'data');
const GALLERY_FILE = path.join(DATA, 'gallery.json');

fs.mkdirSync(UPLOADS, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });

if (!process.env.SESSION_SECRET || !process.env.ADMIN_PASSWORD_HASH) {
  console.error('Faltan SESSION_SECRET y ADMIN_PASSWORD_HASH en .env');
  process.exit(1);
}

if (!fs.existsSync(GALLERY_FILE)) {
  fs.writeFileSync(GALLERY_FILE, '[]');
}

app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));

app.use(express.json({ limit: '100kb' }));

app.use(session({
  name: 'jardines.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 4
  }
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP.'));
    }
    cb(null, true);
  }
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) return next();
  return res.status(401).json({ error: 'Tenés que iniciar sesión.' });
}

function readGallery() {
  try {
    const parsed = JSON.parse(fs.readFileSync(GALLERY_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGallery(items) {
  fs.writeFileSync(GALLERY_FILE, JSON.stringify(items, null, 2));
}

app.get('/api/session', (req, res) => {
  res.json({ authenticated: req.session?.isAdmin === true });
});

app.post('/api/login', loginLimiter, async (req, res, next) => {
  try {
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length > 200) {
      return res.status(400).json({ error: 'Ingresá una contraseña válida.' });
    }

    const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta.' });

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.isAdmin = true;
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        res.json({ ok: true });
      });
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('jardines.sid', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });
    res.json({ ok: true });
  });
});

app.get('/api/gallery', (_req, res) => {
  res.json(readGallery());
});

app.post('/api/gallery', requireAdmin, (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      const status = err instanceof multer.MulterError ? 400 : 400;
      return res.status(status).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Seleccioná una imagen.' });
    }

    const items = readGallery();
    const item = {
      id: crypto.randomUUID(),
      url: `/uploads/${req.file.filename}`,
      title: String(req.body.title || 'Trabajo realizado').slice(0, 100),
      createdAt: new Date().toISOString()
    };

    items.unshift(item);
    saveGallery(items);
    res.status(201).json(item);
  });
});

app.delete('/api/gallery/:id', requireAdmin, (req, res) => {
  const items = readGallery();
  const item = items.find((entry) => entry.id === req.params.id);

  if (!item) return res.status(404).json({ error: 'Foto no encontrada.' });

  const filename = path.basename(item.url);
  const filepath = path.join(UPLOADS, filename);

  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  saveGallery(items.filter((entry) => entry.id !== item.id));

  res.json({ ok: true });
});

app.use(express.static(PUBLIC));

app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Ocurrió un error en el servidor.' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`JardinesAlpunto disponible en http://127.0.0.1:${PORT}`);
});
