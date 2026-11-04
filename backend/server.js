import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import express from "express";
import cors from "cors";

const app = express();

app.use(cors({ origin: true, methods: ["GET", "POST"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json());

const brukere = [];
const sesjoner = new Map();
const meldinger = [];

function hashPassord(passord, salt) {
  return scryptSync(passord, salt, 64).toString("hex");
}

function hentBruker(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const brukernavn = sesjoner.get(token);
  if (!brukernavn) return null;
  return brukere.find(b => b.brukernavn === brukernavn) ?? null;
}

function krevInnlogging(req, res, next) {
  const bruker = hentBruker(req);
  if (!bruker) return res.status(401).json({ beskjed: "Du må logge inn." });
  req.bruker = bruker;
  next();
}

app.post("/registrer", (req, res) => {
  const { brukernavn, passord } = req.body;
  if (!brukernavn?.trim() || !passord) {
    return res.status(400).json({ beskjed: "Brukernavn og passord må fylles ut." });
  }
  if (brukere.some(b => b.brukernavn.toLowerCase() === brukernavn.trim().toLowerCase())) {
    return res.status(409).json({ beskjed: "Brukernavnet er tatt." });
  }
  const salt = randomBytes(16).toString("hex");
  const bruker = {
    id: randomUUID(),
    brukernavn: brukernavn.trim(),
    salt,
    passordHash: hashPassord(passord, salt),
    farge: "#5865f2",
    beskrivelse: ""
  };
  brukere.push(bruker);
  res.status(201).json({ beskjed: "Bruker opprettet." });
});

app.post("/login", (req, res) => {
  const { brukernavn, passord } = req.body;
  const bruker = brukere.find(b => b.brukernavn.toLowerCase() === brukernavn?.trim().toLowerCase());
  if (!bruker) return res.status(401).json({ beskjed: "Feil brukernavn eller passord." });

  const sjekk = Buffer.from(hashPassord(passord ?? "", bruker.salt), "hex");
  const riktig = Buffer.from(bruker.passordHash, "hex");
  if (!timingSafeEqual(sjekk, riktig)) {
    return res.status(401).json({ beskjed: "Feil brukernavn eller passord." });
  }

  const token = randomUUID();
  sesjoner.set(token, bruker.brukernavn);
  res.json({ token, brukernavn: bruker.brukernavn });
});

app.get("/brukere", krevInnlogging, (req, res) => {
  res.json(brukere.map(b => ({
    id: b.id,
    brukernavn: b.brukernavn,
    farge: b.farge,
    beskrivelse: b.beskrivelse
  })));
});

app.get("/meldinger/generelt", krevInnlogging, (req, res) => {
  res.json(meldinger.filter(m => m.til === null));
});

app.get("/meldinger/privat/:med", krevInnlogging, (req, res) => {
  const meg = req.bruker.brukernavn;
  const med = req.params.med;
  res.json(meldinger.filter(m =>
    m.til !== null &&
    ((m.avsender === meg && m.til === med) || (m.avsender === med && m.til === meg))
  ));
});

app.post("/meldinger", krevInnlogging, (req, res) => {
  const { tekst, til } = req.body;
  if (!tekst?.trim()) {
    return res.status(400).json({ beskjed: "Meldingen kan ikke være tom." });
  }
  meldinger.push({
    id: randomUUID(),
    avsender: req.bruker.brukernavn,
    tekst: tekst.trim(),
    til: til ?? null,
    opprettet: new Date().toISOString()
  });
  res.status(201).json({ beskjed: "Meldingen er lagret." });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Backend kjører på port 3000");
});