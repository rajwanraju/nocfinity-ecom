<?php

namespace App\Notifications;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * FR-ORDER-5/11: every status change queues an email (D9).
 */
class OrderStatusChanged extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Order $order,
        public readonly OrderStatus $from,
        public readonly OrderStatus $to,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = rtrim((string) config('app.frontend_url'), '/')
            .'/account/orders/'.$this->order->id;

        return (new MailMessage)
            ->subject("Order {$this->order->order_number} is now {$this->to->label()}")
            ->greeting('Hello '.$notifiable->name.',')
            ->line("Your order {$this->order->order_number} changed from {$this->from->label()} to {$this->to->label()}.")
            ->line('Order total: $'.number_format($this->order->grand_total / 100, 2).' USD')
            ->action('View order', $url)
            ->line('Thank you for shopping with Nocfinity.');
    }
}
