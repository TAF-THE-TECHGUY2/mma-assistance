# Deploying Meridian MMA to an AWS EC2 instance

This walks through hosting the system on a single Ubuntu EC2 instance:

```
        Internet ──▶ Nginx ──┬──▶  /api  ──▶ PHP-FPM (Laravel API)
                             └──▶  /     ──▶ React SPA (static build)
                                   Laravel ──▶ MySQL
                                   queue worker (systemd) ──▶ email
```

Everything lives on one box and one domain. Config files referenced here are in
the **`deploy/`** folder of this repo.

---

## 0. Before you start
You'll want:
- An AWS account.
- A domain name (recommended, for HTTPS). You can start with the raw public IP.
- The code in a Git repo the server can pull (GitHub/GitLab), **or** you'll copy
  it up with `scp`.

> **Data-protection note (POPIA):** this stores patient data. Launch the instance
> in **`af-south-1` (Cape Town)** for SA data residency, force HTTPS, lock SSH to
> your own IP, and set up backups (see the checklist at the end).

---

## 1. Launch the EC2 instance
1. EC2 → **Launch instance**.
2. AMI: **Ubuntu Server 24.04 LTS**. Type: **t3.small** (2 GB) to start;
   t3.medium if busy.
3. Create/choose a **key pair** (download the `.pem`).
4. **Security group** inbound rules:
   - SSH (22) — **My IP only**
   - HTTP (80) — Anywhere
   - HTTPS (443) — Anywhere
5. Storage: 20 GB gp3.
6. Launch, then allocate an **Elastic IP** and associate it (so the IP is stable).
7. If you have a domain, point an **A record** at the Elastic IP.

SSH in:
```bash
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
```

---

## 2. Install the stack
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y software-properties-common ca-certificates lsb-release apt-transport-https
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# PHP 8.4 + extensions Laravel/PhpSpreadsheet need, FPM, Nginx, MySQL, tools
sudo apt install -y nginx mysql-server git unzip \
  php8.4-fpm php8.4-cli php8.4-mysql php8.4-mbstring php8.4-xml \
  php8.4-curl php8.4-zip php8.4-gd php8.4-bcmath php8.4-intl

# Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Node 20 (only needed to BUILD the frontend)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```
Ubuntu 24.04's official repositories provide PHP 8.3, so PHP 8.4 comes from the `ppa:ondrej/php` repository.

---

## 3. Create the database
```bash
sudo mysql
```
```sql
CREATE DATABASE mma CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mma'@'127.0.0.1' IDENTIFIED BY 'CHOOSE_A_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON mma.* TO 'mma'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```
> Prefer **Amazon RDS for MySQL** for backups/failover? Create the RDS instance
> instead and use its endpoint as `DB_HOST` below — skip installing mysql-server.

---

## 4. Get the code onto the server
```bash
sudo mkdir -p /var/www/mma && sudo chown -R $USER:$USER /var/www/mma
cd /var/www/mma
git clone https://github.com/TAF-THE-TECHGUY2/mma-assistance.git .
```
(This creates `/var/www/mma/backend` and `/var/www/mma/frontend`.)
(No repo access? From your laptop: `scp -i key.pem -r "medical room"/* ubuntu@IP:/var/www/mma/`)

---

## 5. Configure & install the backend
```bash
cd /var/www/mma/backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
nano .env
```
Set these in `.env` for production:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.co.za

DB_CONNECTION=mysql
DB_HOST=127.0.0.1            # or your RDS endpoint
DB_PORT=3306
DB_DATABASE=mma
DB_USERNAME=mma
DB_PASSWORD=THE_PASSWORD_FROM_STEP_3

QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=database

# Email — your Mailtrap (or switch to a live provider / Amazon SES for real sending)
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=YOUR_USERNAME
MAIL_PASSWORD=YOUR_PASSWORD
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="no-reply@your-domain.co.za"
MAIL_FROM_NAME="Meridian Medical Assistance"
```
Then:
```bash
php artisan migrate --force
php artisan db:seed --force      # OPTIONAL: seeds demo users/cases. Skip for a clean start.
php artisan storage:link         # serves uploaded documents
php artisan config:cache
php artisan route:cache
```

---

## 6. Build the frontend and place it in the web root
The SPA talks to `/api` on the same domain, so **no build-time API URL is needed**.
```bash
cd /var/www/mma/frontend
npm ci
npm run build                    # outputs frontend/dist/
# Put the built app where Nginx serves it (next to Laravel's index.php):
cp -r dist/* /var/www/mma/backend/public/
```
Make sure the logo is present for print/export:
```bash
# the export reads frontend/public/mma-logo.png; keep it there
ls /var/www/mma/frontend/public/mma-logo.png
```

---

## 7. Permissions
```bash
sudo chown -R $USER:www-data /var/www/mma
sudo find /var/www/mma/backend/storage /var/www/mma/backend/bootstrap/cache -type d -exec chmod 2775 {} \;
sudo find /var/www/mma/backend/storage /var/www/mma/backend/bootstrap/cache -type f -exec chmod 664 {} \;
```
This keeps the codebase owned by your deploy user while allowing the Nginx/PHP worker user (`www-data`) to write Laravel's runtime files.

---

## 8. Nginx
```bash
sudo cp /var/www/mma/deploy/nginx-mma.conf /etc/nginx/sites-available/mma
# edit server_name in that file to your domain (or public IP)
sudo ln -s /etc/nginx/sites-available/mma /etc/nginx/sites-enabled/mma
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```
Visit `http://your-domain` — the login page should load.

---

## 9. Queue worker (sends the notification emails)
```bash
sudo cp /var/www/mma/deploy/mma-queue.service /etc/systemd/system/mma-queue.service
sudo systemctl daemon-reload
sudo systemctl enable --now mma-queue
sudo systemctl status mma-queue
```

---

## 10. HTTPS (do this if you have a domain)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.co.za
```
Certbot edits the Nginx config to add 443 + auto-redirect, and auto-renews.

---

## Deploying updates later
```bash
cd /var/www/mma && git pull
cd backend && composer install --no-dev --optimize-autoloader && php artisan optimize:clear && php artisan migrate --force
php artisan config:cache && php artisan route:cache
cd ../frontend && npm ci && npm run build && cp -r dist/* ../backend/public/
sudo systemctl restart mma-queue
sudo systemctl reload nginx
```

---

## Production checklist
- [ ] `APP_DEBUG=false` and a generated `APP_KEY`
- [ ] HTTPS enabled (certbot) — mandatory for patient data
- [ ] SSH (port 22) restricted to your IP in the security group
- [ ] Strong DB password; DB not publicly reachable
- [ ] Automated **backups**: RDS automated backups, or a nightly `mysqldump` to S3
- [ ] `af-south-1` (Cape Town) region for SA data residency (POPIA)
- [ ] Queue worker is `enabled` (survives reboot) and restarted on each deploy
- [ ] Real email provider for production sending (Mailtrap **live**/SES) with a
      verified sending domain — sandbox does not deliver to real inboxes
- [ ] Change/disable the seeded demo accounts before go-live

---

## Lower-effort alternatives
If running a server is more than you want to manage:
- **Laravel Forge / Ploi** — point them at your repo + EC2 and they configure
  Nginx, PHP, queue workers, SSL and deploys for you (~$12/mo).
- **Amazon RDS** for the database, **Amazon SES** for email, **S3** for document
  storage — managed, backed-up building blocks instead of running them on the box.
