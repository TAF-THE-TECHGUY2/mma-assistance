# MMA — EC2 Quickstart (single box · MySQL local · Mailtrap · access by IP)

A linear, copy-paste runbook for the simplest hosting setup: one Ubuntu EC2
instance running everything, reached at its public IP over HTTP. Follow top to
bottom. For background, RDS/SES/domain options, see **DEPLOY-EC2.md**.

> ⚠️ **HTTP + IP is fine for testing, not for real patient data.** Add a domain
> and HTTPS (last section) before going live with real patients (POPIA).

Replace `EC2_IP` below with your instance's Elastic IP throughout.

---

## 1. Launch the instance
- Region: **af-south-1 (Cape Town)**.
- AMI **Ubuntu Server 24.04 LTS**, type **t3.small**, 20 GB gp3.
- Key pair: create + download the `.pem`.
- Security group inbound: **SSH 22 = My IP**, **HTTP 80 = Anywhere**, **HTTPS 443 = Anywhere**.
- Allocate an **Elastic IP** and associate it with the instance.

```bash
ssh -i your-key.pem ubuntu@EC2_IP
```

## 2. Install everything
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx mysql-server git unzip \
  php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml \
  php8.3-curl php8.3-zip php8.3-gd php8.3-bcmath php8.3-intl
curl -sS https://getcomposer.org/installer | php && sudo mv composer.phar /usr/local/bin/composer
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
```

## 3. Create the database
```bash
sudo mysql -e "CREATE DATABASE mma CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mma'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_STRONG';
GRANT ALL PRIVILEGES ON mma.* TO 'mma'@'127.0.0.1'; FLUSH PRIVILEGES;"
```

## 4. Get the code
```bash
sudo mkdir -p /var/www/mma && sudo chown -R $USER:$USER /var/www/mma
cd /var/www/mma
git clone https://github.com/TAF-THE-TECHGUY2/mma-assistance.git .
```
Use the plain Git URL in the terminal, not a Markdown link.

## 5. Backend
```bash
cd /var/www/mma/backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
nano .env
```
Edit `.env`:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=http://EC2_IP

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=mma
DB_USERNAME=mma
DB_PASSWORD=

QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=database

MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=a37deaf2b46b1a
MAIL_PASSWORD=YOUR_MAILTRAP_PASSWORD
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="no-reply@meridian-medical.test"
MAIL_FROM_NAME="Meridian Medical Assistance"
```
Then:
```bash
php artisan migrate --force
php artisan db:seed --force        # OPTIONAL demo data; skip for a clean start
php artisan storage:link
php artisan optimize          # caches config + routes + views for production
```

## 6. Build the frontend into the web root
```bash
cd /var/www/mma/frontend
npm ci && npm run build
cp -r dist/* /var/www/mma/backend/public/
ls /var/www/mma/frontend/public/mma-logo.png   # confirm the logo is present
```

## 7. Permissions
```bash
sudo chown -R www-data:www-data /var/www/mma
sudo chmod -R 775 /var/www/mma/backend/storage /var/www/mma/backend/bootstrap/cache
```

## 8. Nginx
```bash
sudo cp /var/www/mma/deploy/nginx-mma.conf /etc/nginx/sites-available/mma
sudo ln -s /etc/nginx/sites-available/mma /etc/nginx/sites-enabled/mma
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 9. Queue worker (sends notification emails)
```bash
sudo cp /var/www/mma/deploy/mma-queue.service /etc/systemd/system/mma-queue.service
sudo systemctl daemon-reload
sudo systemctl enable --now mma-queue
sudo systemctl status mma-queue
```

## ✅ Open it
Browse to **http://EC2_IP** and log in (`owner@mma.test` / `password` if you seeded).

---

## Redeploy after changes
```bash
cd /var/www/mma && git pull
cd backend && composer install --no-dev --optimize-autoloader && php artisan migrate --force && php artisan optimize:clear && php artisan optimize
cd ../frontend && npm ci && npm run build && cp -r dist/* ../backend/public/
sudo systemctl restart mma-queue && sudo systemctl reload nginx
```

## When you get a domain (add HTTPS)
```bash
# point the domain's A record at EC2_IP, then:
sudo sed -i 's/server_name _;/server_name your-domain.co.za;/' /etc/nginx/sites-available/mma
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.co.za
# update APP_URL in backend/.env to https://your-domain.co.za, then:
cd /var/www/mma/backend && php artisan config:cache
```

## Don't forget
- Change/disable the seeded demo accounts before real use.
- Set up a nightly DB backup: `mysqldump mma > /backups/mma_$(date +%F).sql` via cron.
- Mailtrap **sandbox** only captures email — switch to live sending to reach real inboxes.
