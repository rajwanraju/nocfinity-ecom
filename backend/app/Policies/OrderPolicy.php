<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

/**
 * FR-ORDER-13 / SEC-5: a customer may only see their own orders. The
 * controller turns a denied policy into 404 so foreign orders are
 * indistinguishable from missing ones.
 */
class OrderPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->isCustomer();
    }

    public function view(User $actor, Order $order): bool
    {
        return $actor->isCustomer() && $order->user_id === $actor->id;
    }

    /**
     * FR-ORDER-12: a customer may cancel their own order while the transition
     * table still allows it; refunds and stock restoration are the service's job.
     */
    public function cancel(User $actor, Order $order): bool
    {
        return $this->view($actor, $order) && $order->status->isCancellable();
    }
}
