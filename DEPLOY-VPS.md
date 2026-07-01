# 🚀 ProImplant — VPS + Coolify ilə deploy (sıfırdan domenə qədər)

Bu təlimat saytı **öz serverində**, peşəkar və həmişə-online şəkildə işə salmaq üçündür.
Nəticədə: `https://proimplant.az` (SSL ilə), avtomatik deploy, backup və bir serverdə
istədiyin qədər klinika saytı.

**Ümumi vaxt:** ~40–60 dəqiqə · **Aylıq xərc:** ~€5 (VPS) + domen (~illik 15–40 AZN)

---

## Addım 0 — Nə lazımdır
- Bank kartı (VPS və domen üçün)
- Bu repo GitHub-da (var: `github.com/RavanM01/proimplant`)
- Kompüterində terminal (Windows: PowerShell və ya Git Bash)

---

## Addım 1 — VPS al (Hetzner Cloud)

1. **https://www.hetzner.com/cloud** → qeydiyyatdan keç
2. **+ New Project** → adını yaz (məs. `Clinics`)
3. **Add Server**:
   - **Location:** Nuremberg / Helsinki (Avropa — Azərbaycana yaxın gecikmə)
   - **Image:** **Ubuntu 24.04**
   - **Type:** **CX22** (2 vCPU, 4 GB RAM, ~€4.5/ay) — tövsiyə
     - _Daha ucuz: CAX11 (ARM, ~€3.8/ay) — o da işləyir_
   - **SSH Key:** varsa əlavə et; yoxdursa Hetzner root parolu email-lə göndərəcək
   - **Create & Buy now**
4. Server yaranandan sonra **IP ünvanını** qeyd et (məs. `95.217.xx.xx`)

---

## Addım 2 — Serverə qoşul və hazırla

Terminalda (öz kompüterində):

```bash
ssh root@SERVER_IP        # SERVER_IP = Hetzner-dən aldığın IP
# ilk dəfə "yes" yaz, sonra parolu daxil et (email-dəki)
```

Serverə girdikdən sonra sistemi yenilə:

```bash
apt update && apt upgrade -y
```

### Firewall (təhlükəsizlik)
```bash
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 8000/tcp    # Coolify paneli
ufw --force enable
```

---

## Addım 3 — Coolify quraşdır (bir əmr)

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Bu, Docker-i və Coolify-ı avtomatik qurur (~3–5 dəqiqə). Bitəndə brauzerdə aç:

```
http://SERVER_IP:8000
```

- İlk ekranda **admin hesabı** yarat (email + güclü parol) — bu sənin panel girişindir
- **Server** olaraq "localhost" avtomatik əlavə olunur

---

## Addım 4 — Domeni al və DNS-i yönləndir

1. Domeni al:
   - **.az** (yerli imic): `hosting.az`, `appa.az`, `nic.az`
   - **.com** (ucuz): Cloudflare, Namecheap
2. Domenin **DNS** ayarlarında bu qeydləri əlavə et (VPS IP-yə):

   | Type | Name | Value |
   |------|------|-------|
   | A | `@` | `SERVER_IP` |
   | A | `www` | `SERVER_IP` |

3. (İstəyə bağlı — başqa klinikalar üçün) hər yeni domeni də eyni IP-yə yönləndir.

> DNS-in yayılması 5 dəqiqə–2 saat çəkə bilər. Yoxlamaq: `ping proimplant.az` → IP-ni göstərməlidir.

---

## Addım 5 — Layihəni Coolify-da deploy et

Coolify panelində:

1. **Projects → + Add** → ad ver (məs. `ProImplant`)
2. **+ New Resource** → **Public Repository** (repo public-dir)
   - Repo URL: `https://github.com/RavanM01/proimplant`
   - Branch: `main`
3. **Build Pack:** **Dockerfile** seç (repo-da hazır `Dockerfile` var)
4. **Port:** `3000`
5. **Deploy** düyməsinə basma — əvvəlcə aşağıdakıları qur ⬇️

### 5a — Environment variables (mühüm!)
Resource → **Environment Variables** → bunları əlavə et:

```
JWT_SECRET=<uzun-təsadüfi-mətn>
ADMIN_EMAIL=admin@proimplant.az
ADMIN_PASSWORD=<güclü-parol>
DATA_DIR=/data
```

Email/SMS istəyirsənsə (istəyə bağlı):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=klinika@gmail.com
SMTP_PASS=<gmail-app-password>
SMTP_FROM=ProImplant <klinika@gmail.com>
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+994...
```

> `JWT_SECRET` üçün təsadüfi mətn: serverdə `openssl rand -hex 32` yazıb kopyala.

### 5b — Persistent storage (MƏLUMAT QALICI OLSUN)
Resource → **Storages / Persistent Storage** → **+ Add**:
- **Name:** `proimplant-data`
- **Mount Path:** `/data`

Bu, `db.json`-un (rezervasiyalar, həkimlər, ayarlar) restart/redeploy-da **itməməsini** təmin edir. `DATA_DIR=/data` env dəyəri buraya işarə edir.

### 5c — Domen + SSL
Resource → **Domains** → yaz: `https://proimplant.az`
- Coolify **Let's Encrypt SSL** sertifikatını **avtomatik** alır (DNS düzgün yönləndiribsə)

### 5d — Deploy!
İndi **Deploy** düyməsinə bas. ~2–4 dəqiqəyə sayt qalxır:
- 🌐 `https://proimplant.az`
- 🔑 `https://proimplant.az/admin`

---

## Addım 6 — Avtomatik deploy (git push → canlı)

Coolify → Resource → **Webhooks / Automatic Deployment** aktiv et.
Bundan sonra sən kodu GitHub-a `git push` edəndə sayt **avtomatik yenilənir**.

---

## Addım 7 — Avtomatik backup (real müştəri üçün vacib)

Serverdə gündəlik `db.json` backup-ı üçün cron qur:

```bash
mkdir -p /root/backups
crontab -e
```
Açılan faylın sonuna əlavə et (hər gecə 03:00-da 30 günlük backup saxlayır):
```
0 3 * * * cp /var/lib/docker/volumes/*proimplant-data*/_data/db.json /root/backups/db-$(date +\%F).json 2>/dev/null; find /root/backups -mtime +30 -delete
```

> Daha yaxşısı: backup-ları offsite saxla (Hetzner Storage Box, Backblaze B2 və ya Google Drive `rclone` ilə).

---

## 🔁 Yeni klinika əlavə etmək (reselling)

Hər yeni müştəri üçün:
1. Repo-nu kopyala (fork/template) və ya eyni repo-dan yeni resource yarat
2. Coolify-da **+ New Resource** → həmin repo → **fərqli domen** (`basqaklinika.az`)
3. Ayrı **persistent storage** + ayrı **ADMIN_PASSWORD**
4. Deploy

Beləcə **bir VPS-də (€5/ay) onlarla klinika** işləyir. Hər müştəridən aylıq (20–50 AZN) alsan — xalis mənfəət.

---

## 🆘 Tez-tez rast gəlinən problemlər

| Problem | Həll |
|---|---|
| SSL alınmır | DNS hələ yayılmayıb — 30 dəq gözlə, `ping domen` yoxla |
| Sayt açılmır | Coolify → Logs bax; port 3000 və Dockerfile düzgün? |
| Məlumat itir | Persistent storage `/data`-ya mount olunmayıb / `DATA_DIR=/data` yoxdur |
| Panelə (8000) girə bilmirəm | `ufw allow 8000/tcp` edildimi? |
| Admin parol invalid | `ADMIN_PASSWORD` env-i düzgün? Dəyişdikdən sonra redeploy et |

---

## 💰 Xülasə xərc
- **VPS (Hetzner CX22):** ~€4.5/ay — bütün klinikalar bir yerdə
- **Domen:** hər klinika üçün ~15–40 AZN/il
- **SSL:** pulsuz (Let's Encrypt)
- **Coolify:** pulsuz (açıq mənbə)

Uğurlar! 🦷 Sual olsa, Coolify → **Logs** bölməsindəki xətanı göndər.
