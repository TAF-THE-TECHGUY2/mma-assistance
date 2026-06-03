<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subjectLine }}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#334155;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                    <tr>
                        <td style="background:#0d9488;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:600;">
                            {{ $appName }}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px;">
                            <h1 style="margin:0 0 16px;font-size:18px;color:#0f172a;">{{ $subjectLine }}</h1>

                            @foreach ($lines as $line)
                                <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#475569;">{{ $line }}</p>
                            @endforeach

                            @if ($case)
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:16px;">
                                    <tr>
                                        <td style="font-size:13px;color:#64748b;padding:4px 0;">Case Number</td>
                                        <td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;">{{ $case->case_number }}</td>
                                    </tr>
                                    <tr>
                                        <td style="font-size:13px;color:#64748b;padding:4px 0;">Status</td>
                                        <td style="font-size:13px;color:#0f172a;text-align:right;text-transform:capitalize;">{{ str_replace('_', ' ', $case->case_status) }}</td>
                                    </tr>
                                    <tr>
                                        <td style="font-size:13px;color:#64748b;padding:4px 0;">Workflow Stage</td>
                                        <td style="font-size:13px;color:#0f172a;text-align:right;text-transform:capitalize;">{{ str_replace('_', ' ', $case->workflow_stage) }}</td>
                                    </tr>
                                </table>

                                @if ($appUrl)
                                    <div style="margin-top:24px;">
                                        <a href="{{ rtrim($appUrl, '/') }}/cases/{{ $case->id }}"
                                           style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">
                                            View Case
                                        </a>
                                    </div>
                                @endif
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
                            This is an automated notification from {{ $appName }}. Manage recipients under Settings &rarr; Email Notifications.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
