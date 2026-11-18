<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * D9: password reset mail is queued and delivered to Mailpit locally.
 * The link points at the Next.js reset page, not at a Blade route.
 */
class ResetPasswordNotification extends BaseResetPassword implements ShouldQueue
{
    use Queueable;

    public function toMail($notifiable): MailMessage
    {
        $url = rtrim((string) config('app.frontend_password_reset_url'), '/')
            .'?'.http_build_query([
                'token' => $this->token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);

        return (new MailMessage)
            ->subject('Reset your Nocfinity password')
            ->greeting('Hello '.$notifiable->name.',')
            ->line('We received a request to reset the password for your Nocfinity account.')
            ->action('Reset password', $url)
            ->line('This link expires in 60 minutes and can only be used once.')
            ->line('If you did not request a reset, you can safely ignore this email.');
    }
}
