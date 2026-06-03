<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 | php artisan mma:test-mail [email]
 |
 | Sends a test email through whatever mailer is configured in .env (Mailtrap
 | SMTP in this setup). Uses the same Laravel Mail pipeline the app uses for
 | workflow notifications, so a success here means real notifications will send.
 */
Artisan::command('mma:test-mail {email=tafara@modus10.co.za}', function (string $email) {
    $this->info('Sending via mailer: ' . config('mail.default') . ' (' . config('mail.mailers.smtp.host') . ')');

    Mail::raw(
        "This is a test email from Meridian Medical Assistance.\n\n"
        . "If you can read this in Mailtrap, your notification emails are wired up correctly.",
        function ($message) use ($email) {
            $message->to($email)->subject('Meridian MMA — Mailtrap test email');
        }
    );

    $this->info("Test email dispatched to {$email}.");
})->purpose('Send a test notification email via the configured mailer');
