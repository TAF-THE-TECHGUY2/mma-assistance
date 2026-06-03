<?php

namespace App\Mail;

use App\Models\MedicalCase;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * A single, reusable email for workflow / case notifications. The subject and
 * body lines are supplied by the caller (NotificationService) so one template
 * covers every event (case created, sent to admin review, billing, closed...).
 *
 * Implements ShouldQueue so sends never block the HTTP request and so a
 * provider rate-limit (e.g. Mailtrap free plan "too many emails per second")
 * simply retries with backoff until the message is accepted.
 */
class WorkflowNotificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /** Retry a rate-limited / transient send several times. */
    public int $tries = 6;

    /** Escalating wait (seconds) between retries — clears per-second limits. */
    public function backoff(): array
    {
        return [10, 20, 40, 60, 120];
    }

    /**
     * @param  string         $subjectLine  Email subject.
     * @param  array<int,string> $lines     Body lines, rendered in order.
     * @param  MedicalCase|null $case        Optional related case (adds a details footer).
     */
    public function __construct(
        public string $subjectLine,
        public array $lines = [],
        public ?MedicalCase $case = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.workflow',
            with: [
                'subjectLine' => $this->subjectLine,
                'lines' => $this->lines,
                'case' => $this->case,
                'appName' => config('app.name', 'Meridian Medical Assistance'),
                'appUrl' => config('app.url'),
            ],
        );
    }
}
